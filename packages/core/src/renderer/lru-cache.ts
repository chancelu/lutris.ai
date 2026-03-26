/**
 * Simple LRU cache with configurable max size.
 * Calls `dispose` on evicted values so WASM/CanvasKit objects are freed.
 */
export class LRUCache<K, V> {
  private readonly map = new Map<K, V>()
  private readonly dispose: (value: V) => void
  readonly maxSize: number

  constructor(maxSize: number, dispose: (value: V) => void) {
    this.maxSize = maxSize
    this.dispose = dispose
  }

  get(key: K): V | undefined {
    const value = this.map.get(key)
    if (value === undefined) return undefined
    // Move to end (most recently used)
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    const existing = this.map.get(key)
    if (existing !== undefined) {
      this.dispose(existing)
      this.map.delete(key)
    }
    this.map.set(key, value)
    this.evict()
  }

  has(key: K): boolean {
    return this.map.has(key)
  }

  delete(key: K): boolean {
    const value = this.map.get(key)
    if (value === undefined) return false
    this.dispose(value)
    return this.map.delete(key)
  }

  clear(): void {
    for (const value of this.map.values()) {
      this.dispose(value)
    }
    this.map.clear()
  }

  get size(): number {
    return this.map.size
  }

  values(): IterableIterator<V> {
    return this.map.values()
  }

  keys(): IterableIterator<K> {
    return this.map.keys()
  }

  private evict(): void {
    while (this.map.size > this.maxSize) {
      const { value: oldest } = this.map.keys().next()
      if (oldest === undefined) break
      this.delete(oldest)
    }
  }
}
