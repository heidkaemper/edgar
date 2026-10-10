import { STEP_SCALES, STEPS, stepIndex } from '../track/Projection'
import type { PalKey } from './Palette'
import { PAL } from './Palette'
import type { Surface } from './Surface'
import { createSurface } from './Surface'

/**
 * Pixel art as source code: rows of characters plus a map from character to
 * palette colour, baked once into offscreen canvases.
 *
 * One rule governs every drawing: large shapes, few accents far apart, no
 * fine repetition. A repeating pattern loses different stripes each time it
 * is scaled down, which makes an approaching obstacle change its appearance.
 */
export type ColorMap = Record<string, PalKey>

export interface Art {
    rows: string[]
    map: ColorMap
}

const TRANSPARENT = '.'

export function bake(art: Art): Surface {
    const w = art.rows.reduce((max, row) => Math.max(max, row.length), 0)
    const { canvas, ctx } = createSurface(Math.max(1, w), Math.max(1, art.rows.length))

    for (let y = 0; y < art.rows.length; y++) {
        const row = art.rows[y]
        for (let x = 0; x < row.length; x++) {
            const key = art.map[row[x]]
            if (row[x] === TRANSPARENT || !key) {
                continue
            }
            ctx.fillStyle = PAL[key]
            ctx.fillRect(x, y, 1, 1)
        }
    }
    return canvas
}

/** Nearest-neighbour resize; the size is rounded to whole pixels. */
export function resample(source: Surface, w: number, h: number): Surface {
    const { canvas, ctx } = createSurface(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)))
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    return canvas
}

export function scaled(source: Surface, factor: number): Surface {
    return resample(source, source.width * factor, source.height * factor)
}

/** Left halves, mirrored into whole rows. Halves the work on symmetric art. */
export function symmetric(halves: string[]): string[] {
    return halves.map((half) => half + [...half].reverse().join(''))
}

export function mirrorRows(rows: string[]): string[] {
    const width = rows.reduce((max, row) => Math.max(max, row.length), 0)
    return rows.map((row) => [...row.padEnd(width, '.')].reverse().join(''))
}

/** `top` drawn over `base` at an offset; its dots leave `base` showing. */
export function overlay(base: string[], top: string[], dx: number, dy: number): string[] {
    const width = Math.max(
        base.reduce((max, row) => Math.max(max, row.length), 0),
        top.reduce((max, row) => Math.max(max, row.length + dx), 0),
    )
    const height = Math.max(base.length, top.length + dy)
    const result: string[] = []

    for (let y = 0; y < height; y++) {
        const row = [...(base[y] ?? '').padEnd(width, '.')]
        const line = top[y - dy]
        if (line) {
            for (let x = 0; x < line.length; x++) {
                if (line[x] !== TRANSPARENT) {
                    row[x + dx] = line[x]
                }
            }
        }
        result.push(row.join(''))
    }
    return result
}

/**
 * One drawing, baked at every depth step on first use. A step is a 1:1 blit,
 * so the pixels stay square and sharp at any distance.
 */
export class DepthSprite {
    readonly master: Surface
    private readonly steps: (Surface | undefined)[] = new Array(STEPS)

    constructor(art: Art) {
        this.master = bake(art)
    }

    get w(): number {
        return this.master.width
    }

    get h(): number {
        return this.master.height
    }

    at(z: number): Surface {
        return this.step(stepIndex(z))
    }

    /** Bakes one step that is still missing; false once all are there. */
    bakeNext(): boolean {
        const index = this.steps.findIndex((step) => !step)
        if (index < 0) {
            return false
        }
        this.step(index)
        return true
    }

    step(index: number): Surface {
        const cached = this.steps[index]
        if (cached) {
            return cached
        }
        const scale = STEP_SCALES[index]
        const surface = resample(this.master, this.master.width * scale, this.master.height * scale)
        this.steps[index] = surface
        return surface
    }
}
