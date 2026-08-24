/**
 * Vitest setup for the engine suite (Slice E / E1).
 *
 * 1. Installs a minimal `Bun` global so engine tests that read files through
 *    `Bun.file(path)` run unchanged under Node. Only the small surface the
 *    tests actually use is implemented: .text(), .arrayBuffer(), .exists(),
 *    .size. Anything process-spawning (Bun.spawn) is intentionally absent —
 *    those files are excluded in vitest.config.ts.
 *
 * 2. Extends expect with the handful of bun:test matchers vitest lacks:
 *    toBeString, toBeArray, toBeFunction, toStartWith.
 */
import { expect } from 'vitest'
import { readFile, stat } from 'node:fs/promises'
import { statSync } from 'node:fs'

class BunFileShim {
  constructor(private path: string) {}
  async text(): Promise<string> {
    return readFile(this.path, 'utf8')
  }
  async arrayBuffer(): Promise<ArrayBuffer> {
    const buf = await readFile(this.path)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  }
  async bytes(): Promise<Uint8Array> {
    return readFile(this.path)
  }
  async exists(): Promise<boolean> {
    try {
      await stat(this.path)
      return true
    } catch {
      return false
    }
  }
  get size(): number {
    return statSync(this.path).size
  }
}

const BunGlobal = {
  file: (path: string | URL) => new BunFileShim(path instanceof URL ? path.pathname : path),
}

Object.defineProperty(globalThis, 'Bun', {
  value: BunGlobal,
  writable: true,
  configurable: true,
})

// Bun (and ES2025) ship Uint8Array base64 helpers that this Node runtime
// lacks; packages/core clipboard/image code and engine tests rely on them.
if (!('toBase64' in Uint8Array.prototype)) {
  Object.defineProperty(Uint8Array.prototype, 'toBase64', {
    value(this: Uint8Array): string {
      return Buffer.from(this.buffer, this.byteOffset, this.byteLength).toString('base64')
    },
    writable: true,
    configurable: true,
  })
}
if (!('fromBase64' in Uint8Array)) {
  Object.defineProperty(Uint8Array, 'fromBase64', {
    value(b64: string): Uint8Array {
      return new Uint8Array(Buffer.from(b64, 'base64'))
    },
    writable: true,
    configurable: true,
  })
}

expect.extend({
  toBeString(received: unknown) {
    return {
      pass: typeof received === 'string',
      message: () => `expected ${this.utils.printReceived(received)} to be a string`,
    }
  },
  toBeArray(received: unknown) {
    return {
      pass: Array.isArray(received),
      message: () => `expected ${this.utils.printReceived(received)} to be an array`,
    }
  },
  toBeFunction(received: unknown) {
    return {
      pass: typeof received === 'function',
      message: () => `expected ${this.utils.printReceived(received)} to be a function`,
    }
  },
  toStartWith(received: unknown, prefix: string) {
    const pass = typeof received === 'string' && received.startsWith(prefix)
    return {
      pass,
      message: () =>
        `expected ${this.utils.printReceived(received)} to start with ${this.utils.printExpected(prefix)}`,
    }
  },
})
