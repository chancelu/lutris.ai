import { toRaw } from 'vue'

/**
 * Deeply unwrap Vue reactive proxies and return a plain, clone-safe copy.
 *
 * `structuredClone(toRaw(x))` only unwraps the OUTERMOST level — nested
 * reactive proxies (e.g. array items read back out of a deep `ref`) still
 * throw `DataCloneError: Failed to execute 'structuredClone' on 'Window':
 * #<Object> could not be cloned`.
 *
 * This helper recursively unwraps proxies in plain objects and arrays.
 * Non-plain objects (class instances, typed arrays, Maps, Dates, ...) are
 * returned raw as-is — they are already structuredClone-safe.
 */
export function deepRawClone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => deepRawClone(item)) as T
  }
  if (value !== null && typeof value === 'object') {
    const raw = toRaw(value)
    const proto: unknown = Object.getPrototypeOf(raw)
    if (proto !== Object.prototype && proto !== null) return raw
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(raw)) {
      out[key] = deepRawClone((raw as Record<string, unknown>)[key])
    }
    return out as T
  }
  return value
}
