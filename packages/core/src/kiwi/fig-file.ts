import { Unzip, UnzipInflate, inflateSync } from 'fflate'
import { decompress as zstdDecompress } from 'fzstd'

import { importNodeChanges } from './fig-import'
import { decodeBinarySchema, compileSchema, ByteBuffer } from './kiwi-schema'
import { isZstdCompressed } from './protocol'

import type { SceneGraph } from '../scene-graph'
import type { FigmaMessage } from './codec'
import type { FigParseResult } from './fig-parse-worker'

interface FigKiwiPayload {
  schemaDeflated: Uint8Array
  dataRaw: Uint8Array
}

function parseFigKiwiContainer(data: Uint8Array): FigKiwiPayload | null {
  const header = new TextDecoder().decode(data.slice(0, 8))
  if (header !== 'fig-kiwi') return null

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  let offset = 12

  const chunks: Uint8Array[] = []
  while (offset < data.length) {
    const len = view.getUint32(offset, true)
    offset += 4
    chunks.push(data.slice(offset, offset + len))
    offset += len
  }
  if (chunks.length < 2) return null

  const compressed = chunks[1]
  let dataRaw: Uint8Array
  if (isZstdCompressed(compressed)) {
    dataRaw = zstdDecompress(compressed)
  } else {
    try {
      dataRaw = inflateSync(compressed)
    } catch {
      dataRaw = compressed
    }
  }

  return { schemaDeflated: chunks[0], dataRaw }
}

/** Concatenate Uint8Array chunks. */
function concatChunks(chunks: Uint8Array[]): Uint8Array {
  if (chunks.length === 1) return chunks[0]
  let total = 0
  for (const c of chunks) total += c.length
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

function isCanvasEntry(name: string): boolean {
  return name === 'canvas.fig' || name === 'canvas'
}

function isImageEntry(name: string): boolean {
  return name.startsWith('images/') && name !== 'images/'
}

/**
 * Streaming parse using fflate.Unzip — decompresses entries one at a time
 * instead of all at once, reducing peak memory for large files.
 */
function streamingParseFigFile(data: Uint8Array): Promise<SceneGraph> {
  return new Promise<SceneGraph>((resolve, reject) => {
    const fileChunks = new Map<string, Uint8Array[]>()
    let pending = 0
    let pushDone = false

    const uz = new Unzip((file) => {
      if (!isCanvasEntry(file.name) && !isImageEntry(file.name)) return
      pending++
      const chunks: Uint8Array[] = []
      fileChunks.set(file.name, chunks)
      file.ondata = (err, chunk, final) => {
        if (err) { reject(err); return }
        chunks.push(chunk)
        if (final) { pending--; maybeFinish() }
      }
      file.start()
    })
    uz.register(UnzipInflate)

    function maybeFinish() {
      if (!pushDone || pending > 0) return
      try { resolve(finalize()) } catch (err) { reject(err) }
    }

    function finalize(): SceneGraph {
      let canvasData: Uint8Array | null = null
      for (const [name, chunks] of fileChunks) {
        if (isCanvasEntry(name)) { canvasData = concatChunks(chunks); break }
      }
      if (!canvasData) {
        let maxSize = 0
        for (const [name, chunks] of fileChunks) {
          if (isImageEntry(name)) continue
          const size = chunks.reduce((s, c) => s + c.length, 0)
          if (size > maxSize) { maxSize = size; canvasData = concatChunks(chunks) }
        }
      }
      if (!canvasData) {
        throw new Error(`No canvas data found. Entries: ${[...fileChunks.keys()].join(', ')}`)
      }

      const payload = parseFigKiwiContainer(canvasData)
      if (!payload) throw new Error('Invalid fig-kiwi container')

      const schemaBytes = inflateSync(payload.schemaDeflated)
      const schema = decodeBinarySchema(new ByteBuffer(schemaBytes))
      const compiled = compileSchema(schema) as { decodeMessage(data: Uint8Array): unknown }
      const message = compiled.decodeMessage(payload.dataRaw) as FigmaMessage

      if (!message.nodeChanges?.length) throw new Error('No nodes found in .fig file')

      const blobs: Uint8Array[] = (message.blobs ?? []).map((b) =>
        b.bytes instanceof Uint8Array ? b.bytes : new Uint8Array(Object.values(b.bytes))
      )

      const images = new Map<string, Uint8Array>()
      for (const [name, chunks] of fileChunks) {
        if (isImageEntry(name)) {
          images.set(name.replace('images/', ''), concatChunks(chunks))
        }
      }

      return importNodeChanges(message.nodeChanges, blobs, images)
    }

    uz.push(data, true)
    pushDone = true
    maybeFinish()
  })
}

function parseViaWorker(buffer: ArrayBuffer): Promise<SceneGraph> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./fig-parse-worker.ts', import.meta.url), { type: 'module' })

    worker.onmessage = (e: MessageEvent<FigParseResult & { error?: string }>) => {
      worker.terminate()
      if (e.data.error) { reject(new Error(e.data.error)); return }
      const { nodeChanges, blobs, images: imageEntries } = e.data
      const images = new Map<string, Uint8Array>(imageEntries)
      resolve(importNodeChanges(nodeChanges, blobs, images))
    }

    worker.onerror = (err) => {
      worker.terminate()
      reject(new Error(err.message))
    }

    worker.postMessage(buffer, [buffer])
  })
}

/**
 * Stream a File to the worker in chunks, avoiding loading the entire file
 * into memory at once. Falls back to full-buffer for small files.
 */
function streamFileToWorker(file: File): Promise<SceneGraph> {
  const CHUNK_SIZE = 4 * 1024 * 1024 // 4MB chunks

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./fig-parse-worker.ts', import.meta.url), { type: 'module' })

    worker.onmessage = (e: MessageEvent<FigParseResult & { error?: string }>) => {
      worker.terminate()
      if (e.data.error) { reject(new Error(e.data.error)); return }
      const { nodeChanges, blobs, images: imageEntries } = e.data
      const images = new Map<string, Uint8Array>(imageEntries)
      resolve(importNodeChanges(nodeChanges, blobs, images))
    }

    worker.onerror = (err) => {
      worker.terminate()
      reject(new Error(err.message))
    }

    // Stream file in chunks
    const reader = file.stream().getReader()
    let buffer: Uint8Array[] = []
    let bufferSize = 0

    function flush(final: boolean) {
      if (bufferSize === 0 && !final) return
      const chunk = buffer.length === 1 ? buffer[0] : concatChunks(buffer)
      const transfer = chunk.buffer as ArrayBuffer
      worker.postMessage(
        { type: 'stream-chunk', chunk, final },
        [transfer]
      )
      buffer = []
      bufferSize = 0
    }

    function pump(): void {
      reader.read().then(({ done, value }) => {
        if (done) {
          flush(true)
          return
        }
        buffer.push(value)
        bufferSize += value.length
        if (bufferSize >= CHUNK_SIZE) flush(false)
        pump()
      }).catch(reject)
    }

    pump()
  })
}

/** Small file threshold for using streaming (50MB) */
const STREAM_THRESHOLD = 50 * 1024 * 1024

export async function parseFigFile(buffer: ArrayBuffer): Promise<SceneGraph> {
  if (typeof Worker !== 'undefined' && typeof window !== 'undefined') {
    return parseViaWorker(buffer)
  }
  // Non-worker fallback: use streaming parse to reduce peak memory
  return streamingParseFigFile(new Uint8Array(buffer))
}

export async function readFigFile(file: File): Promise<SceneGraph> {
  if (typeof Worker !== 'undefined' && typeof window !== 'undefined') {
    // Large files: stream to worker in chunks to avoid full-buffer in main thread
    if (file.size > STREAM_THRESHOLD) {
      return streamFileToWorker(file)
    }
    // Small files: full buffer is fine
    const buffer = await file.arrayBuffer()
    return parseViaWorker(buffer)
  }
  // Non-worker fallback
  const buffer = await file.arrayBuffer()
  return streamingParseFigFile(new Uint8Array(buffer))
}
