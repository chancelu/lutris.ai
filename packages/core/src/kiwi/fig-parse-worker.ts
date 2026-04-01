import { Unzip, UnzipInflate, inflateSync } from 'fflate'
import { decompress as zstdDecompress } from 'fzstd'

import { decodeBinarySchema, compileSchema, ByteBuffer } from './kiwi-schema'
import { isZstdCompressed } from './protocol'

import type { FigmaMessage, NodeChange } from './codec'

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

export interface FigParseResult {
  nodeChanges: NodeChange[]
  blobs: Uint8Array[]
  images: Array<[string, Uint8Array]>
}

function decodeCanvasPayload(canvasData: Uint8Array): { nodeChanges: NodeChange[]; blobs: Uint8Array[] } {
  const payload = parseFigKiwiContainer(canvasData)
  if (!payload) throw new Error('Invalid fig-kiwi container')

  const schemaBytes = inflateSync(payload.schemaDeflated)
  const schema = decodeBinarySchema(new ByteBuffer(schemaBytes))
  const compiled = compileSchema(schema) as { decodeMessage(data: Uint8Array): unknown }
  const message = compiled.decodeMessage(payload.dataRaw) as FigmaMessage

  const nodeChanges = message.nodeChanges
  if (!nodeChanges || nodeChanges.length === 0) {
    throw new Error('No nodes found in .fig file')
  }

  const blobs: Uint8Array[] = (message.blobs ?? []).map((b) =>
    b.bytes instanceof Uint8Array ? b.bytes : new Uint8Array(Object.values(b.bytes))
  )

  return { nodeChanges, blobs }
}

/** Concatenate an array of Uint8Array chunks into one. */
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
 * Streaming parse: uses fflate.Unzip to decompress entries one at a time.
 * Only canvas + image entries are decompressed; images are collected individually
 * so we never hold all decompressed images in memory simultaneously with the ZIP.
 */
function parseStreaming(data: Uint8Array): Promise<FigParseResult> {
  return new Promise<FigParseResult>((resolve, reject) => {
    const fileChunks = new Map<string, Uint8Array[]>()
    let pending = 0
    let pushDone = false

    const uz = new Unzip((file) => {
      const name = file.name
      if (!isCanvasEntry(name) && !isImageEntry(name)) return

      pending++
      const chunks: Uint8Array[] = []
      fileChunks.set(name, chunks)

      file.ondata = (err, chunk, final) => {
        if (err) { reject(err); return }
        chunks.push(chunk)
        if (final) {
          pending--
          maybeFinish()
        }
      }
      file.start()
    })

    uz.register(UnzipInflate)

    function maybeFinish() {
      if (!pushDone || pending > 0) return
      try {
        finalize()
      } catch (err) {
        reject(err)
      }
    }

    function finalize() {
      // Find canvas data
      let canvasData: Uint8Array | null = null
      for (const [name, chunks] of fileChunks) {
        if (isCanvasEntry(name)) {
          canvasData = concatChunks(chunks)
          break
        }
      }
      if (!canvasData) {
        // Fallback: largest non-image entry
        let maxSize = 0
        for (const [name, chunks] of fileChunks) {
          if (isImageEntry(name)) continue
          const size = chunks.reduce((s, c) => s + c.length, 0)
          if (size > maxSize) {
            maxSize = size
            canvasData = concatChunks(chunks)
          }
        }
      }
      if (!canvasData) {
        throw new Error(`No canvas data found in .fig file. Entries: ${[...fileChunks.keys()].join(', ')}`)
      }

      const { nodeChanges, blobs } = decodeCanvasPayload(canvasData)

      // Collect images — concat chunks for each image entry
      const images: Array<[string, Uint8Array]> = []
      for (const [name, chunks] of fileChunks) {
        if (isImageEntry(name)) {
          images.push([name.replace('images/', ''), concatChunks(chunks)])
        }
      }

      resolve({ nodeChanges, blobs, images })
    }

    // Feed the entire buffer in one push — Unzip still processes entries
    // one at a time internally, avoiding the all-at-once decompression of unzipSync
    uz.push(data, true)
    pushDone = true
    maybeFinish()
  })
}

type WorkerMessage =
  | ArrayBuffer                                          // legacy: full buffer
  | { type: 'stream-chunk'; chunk: Uint8Array; final: boolean } // streaming chunks

// Accumulate streaming chunks
let streamChunks: Uint8Array[] = []

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  try {
    let result: FigParseResult

    if (e.data instanceof ArrayBuffer) {
      // Legacy full-buffer path — use streaming Unzip for lower peak memory
      result = await parseStreaming(new Uint8Array(e.data))
    } else {
      // Streaming path: accumulate chunks, parse when final
      streamChunks.push(e.data.chunk)
      if (!e.data.final) return // wait for more chunks
      const fullData = concatChunks(streamChunks)
      streamChunks = []
      result = await parseStreaming(fullData)
    }

    const seen = new Set<ArrayBuffer>()
    for (const b of result.blobs) seen.add(b.buffer as ArrayBuffer)
    for (const [, img] of result.images) seen.add(img.buffer as ArrayBuffer)
    const transferables: Transferable[] = [...seen]

    self.postMessage(result, { transfer: transferables } as StructuredSerializeOptions)
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) })
  }
}
