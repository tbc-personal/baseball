/**
 * Storage abstraction (GAME_DESIGN.md 6, PLAN.md 2/3).
 *
 * Everything in src/store/ must run in a browser AND under vitest in
 * Node, where `localStorage` does not exist. Rather than assume the
 * global, code here depends on this narrow interface and callers pick an
 * implementation: `getBrowserStorage()` (feature-detected, returns null
 * off-browser) for the app, `createMemoryStorage()` for tests.
 */

/** The subset of the Web Storage API this module needs. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** A plain in-memory implementation, for tests (and as a last-resort fallback). */
export function createMemoryStorage(): StorageLike {
  const data = new Map<string, string>()
  return {
    getItem(key) {
      return data.has(key) ? (data.get(key) as string) : null
    },
    setItem(key, value) {
      data.set(key, value)
    },
    removeItem(key) {
      data.delete(key)
    }
  }
}

/**
 * The browser's `localStorage`, if this code is running in a browser that
 * has it. Feature-detected (not assumed as a global) so this file loads
 * fine under Node/vitest; returns null there.
 */
export function getBrowserStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    // Some browsers throw accessing localStorage under strict privacy
    // settings (e.g. cookies fully blocked) rather than leaving it
    // undefined -- treat that the same as "not available".
    return null
  }
}
