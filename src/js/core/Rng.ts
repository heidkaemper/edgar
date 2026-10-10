/**
 * Mulberry32. Seeded runs make a broken layout reproducible, which is worth a
 * lot while debugging generation.
 */
export class Rng {
    private state: number

    constructor(public readonly seed: number) {
        this.state = seed >>> 0
    }

    /** [0, 1) */
    next(): number {
        this.state = (this.state + 0x6d2b79f5) >>> 0
        let t = this.state
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }

    /** Integer in [min, max], both inclusive. */
    int(min: number, max: number): number {
        return min + Math.floor(this.next() * (max - min + 1))
    }

    float(min: number, max: number): number {
        return min + this.next() * (max - min)
    }

    chance(probability: number): boolean {
        return this.next() < probability
    }

    pick<T>(items: readonly T[]): T {
        return items[this.int(0, items.length - 1)]
    }

    shuffle<T>(items: T[]): T[] {
        for (let i = items.length - 1; i > 0; i--) {
            const j = this.int(0, i)
            ;[items[i], items[j]] = [items[j], items[i]]
        }
        return items
    }
}

/**
 * A seed that really is different every time. `Math.random()` was not: nx.js
 * starts V8 from scratch on every launch and its sequence begins in the same
 * place, so every run on the Switch built the very same world.
 */
export function randomSeed(): number {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    return values[0]
}
