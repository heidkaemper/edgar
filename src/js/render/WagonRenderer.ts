import { FOCAL, RAMP_LENGTH, WAGON_HALF, WAGON_TOP, Z_MAX, Z_NEAR } from '../config'
import type { Thing } from '../entities/Thing'
import type { Projection } from '../track/Projection'
import { view } from '../track/View'
import { PAL, pixel, toRgb } from './Palette'

const DECK_TOP = 26
const UNDER_TOP = 10
const RAMP_HALF = 10
const WHEEL_RADIUS = 10
const WHEEL_INSET = 54

const INK = pixel(toRgb(PAL.ink))
const HAY_TOP = pixel(toRgb(PAL.hayLight))
const HAY_SIDE = pixel(toRgb(PAL.hay))
const DECK_RIM = pixel(toRgb(PAL.wagonLight))
const DECK = pixel(toRgb(PAL.wagon))
const DECK_DARK = pixel(toRgb(PAL.wagonDark))
const UNDERSIDE = pixel(toRgb(PAL.underside))
const WHEEL = pixel(toRgb(PAL.wagonWheel))
const RAMP_TOP = pixel(toRgb(PAL.ramp))
const RAMP_SIDE = pixel(toRgb(PAL.rampDark))

const NONE = 0x7fffffff

/**
 * The hay wagon, written into the ground buffer like the rails: a box seen
 * from above, cut into one slice per screen row of its top and painted from
 * the near end to the far one. Each column only takes the rows above what is
 * already painted in it, so a slice costs the pixels that show and no more.
 * A row that a nearer slice of the load already covers below is the top; one
 * that nothing nearer reaches is a side, or the front.
 */
export class WagonRenderer {
    private tops = new Int32Array(0)
    private bottoms = new Int32Array(0)
    private loaded = new Uint8Array(0)
    /** Where the bands of the side change, in rows of the current slice; worked out once per slice. */
    private readonly bands = new Int32Array(6)

    constructor(private readonly projection: Projection) {}

    draw(pixels: Uint32Array, rows: number, wagon: Thing): void {
        const width = view.w
        if (this.tops.length !== width) {
            this.tops = new Int32Array(width)
            this.bottoms = new Int32Array(width)
            this.loaded = new Uint8Array(width)
        }
        this.tops.fill(NONE)
        this.bottoms.fill(-1)
        this.loaded.fill(0)

        const near = Math.max(wagon.z, Z_NEAR * 0.7)
        const far = Math.min(wagon.z + wagon.length, Z_MAX)
        const lift = view.camY - WAGON_TOP
        const first = view.horizon + 1
        let left = width
        let right = -1

        for (let z = near; z <= far; ) {
            const step = Math.max(0.5, (z * z * 0.8) / (FOCAL * lift))
            const along = z - wagon.z
            const scale = FOCAL / z
            const centre = this.projection.centreX(z, scale) + wagon.x * scale
            const ramp = along < RAMP_LENGTH
            const half = (ramp ? RAMP_HALF : WAGON_HALF) * scale
            const height = ramp ? (WAGON_TOP * along) / RAMP_LENGTH : WAGON_TOP
            const top = Math.max(0, Math.round(view.horizon + (view.camY - height) * scale) - first)
            const ground = Math.min(rows, Math.round(view.horizon + view.camY * scale) - first)
            const from = Math.max(0, Math.round(centre - half))
            const to = Math.min(width - 1, Math.round(centre + half))
            const topColour = ramp ? RAMP_TOP : HAY_TOP
            if (!ramp) {
                this.measure(along, wagon.length, scale)
            }

            for (let x = from; x <= to; x++) {
                const bottom = Math.min(this.tops[x], ground)
                if (top >= bottom) {
                    continue
                }
                const isTop = ramp ? this.tops[x] !== NONE : this.loaded[x] === 1
                for (let row = top; row < bottom; row++) {
                    pixels[row * width + x] = isTop ? topColour : ramp ? RAMP_SIDE : this.sideColour(row)
                }
                this.bottoms[x] = Math.max(this.bottoms[x], bottom)
                this.tops[x] = top
                if (!ramp) {
                    this.loaded[x] = 1
                }
                left = Math.min(left, x)
                right = Math.max(right, x)
            }
            z += step
        }
        this.outline(pixels, left, right)
    }

    /** The rows of this slice where hay, rim, boards and underside meet, and the wheel if one is here. */
    private measure(along: number, length: number, scale: number): void {
        const bands = this.bands
        const first = view.horizon + 1
        bands[0] = Math.round(view.horizon + (view.camY - DECK_TOP) * scale) - first
        bands[1] = Math.round(view.horizon + (view.camY - DECK_TOP + 2) * scale) - first
        bands[2] = Math.round(view.horizon + (view.camY - UNDER_TOP - 5) * scale) - first
        bands[3] = Math.round(view.horizon + (view.camY - UNDER_TOP) * scale) - first

        const dz = Math.min(Math.abs(along - RAMP_LENGTH - WHEEL_INSET), Math.abs(along - length + WHEEL_INSET))
        bands[4] = NONE
        bands[5] = -1
        if (dz < WHEEL_RADIUS) {
            const reach = Math.sqrt(WHEEL_RADIUS * WHEEL_RADIUS - dz * dz)
            bands[4] = Math.round(view.horizon + (view.camY - WHEEL_RADIUS - reach) * scale) - first
            bands[5] = Math.round(view.horizon + (view.camY - WHEEL_RADIUS + reach) * scale) - first
        }
    }

    /** The side and the front: hay over red boards with a light rim, wheels below. */
    private sideColour(row: number): number {
        const bands = this.bands
        if (row >= bands[4] && row <= bands[5]) {
            return WHEEL
        }
        if (row < bands[0]) {
            return HAY_SIDE
        }
        if (row < bands[1]) {
            return DECK_RIM
        }
        if (row < bands[2]) {
            return DECK
        }
        if (row < bands[3]) {
            return DECK_DARK
        }
        return UNDERSIDE
    }

    /**
     * Ink round the silhouette: above each column, and beside it wherever the
     * neighbouring column does not reach as far up or down.
     */
    private outline(pixels: Uint32Array, left: number, right: number): void {
        const width = view.w
        for (let x = left; x <= right; x++) {
            const top = this.tops[x]
            if (top === NONE) {
                continue
            }
            if (top > 0) {
                pixels[(top - 1) * width + x] = INK
            }
            if (x > 0) {
                this.inkBeside(pixels, x, x - 1)
            }
            if (x < width - 1) {
                this.inkBeside(pixels, x, x + 1)
            }
        }
    }

    private inkBeside(pixels: Uint32Array, x: number, side: number): void {
        const width = view.w
        const top = this.tops[x]
        const bottom = this.bottoms[x]
        const bare = this.tops[side] === NONE
        const above = bare ? bottom : Math.min(this.tops[side], bottom)
        const below = bare ? bottom : Math.max(this.bottoms[side], top)
        for (let row = top; row < above; row++) {
            pixels[row * width + side] = INK
        }
        for (let row = below; row < bottom; row++) {
            pixels[row * width + side] = INK
        }
    }
}
