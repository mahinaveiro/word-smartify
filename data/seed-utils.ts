/**
 * Deterministic helpers for generating the local dataset.
 * Same input => same output, so the app is reproducible across reloads.
 */

/** Mulberry32 seeded PRNG. */
export function makeRng(seed: number) {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic UUID-shaped id from a namespace + numeric index. */
export function makeId(namespace: string, index: number): string {
  // Not a real UUID, but stable and unique — fine for the local layer.
  const hex = (n: number) => n.toString(16).padStart(8, '0')
  const h = hashStr(`${namespace}:${index}`)
  return `${namespace.slice(0, 4)}${hex(index).slice(0, 4)}-${hex(h).slice(0, 4)}-4${hex(h >>> 4).slice(0, 3)}-8${hex(index >>> 2).slice(0, 3)}-${hex(h ^ index).slice(0, 8)}${hex(index).slice(0, 4)}`
}

export function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export const NOW = '2026-08-01T09:00:00.000Z'
