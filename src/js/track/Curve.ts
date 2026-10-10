import {
    CURVE_LEAN,
    CURVE_LENGTH_MAX,
    CURVE_LENGTH_MIN,
    CURVE_MAX,
    CURVE_PARALLAX,
    CURVE_STRAIGHT_MAX,
    CURVE_STRAIGHT_MIN,
    PLAYER_Z,
    Z_MAX,
} from '../config'
import type { Rng } from '../core/Rng'

interface Segment {
    start: number
    length: number
    peak: number
}

const SAMPLE_COUNT = 48

/** Geometric spacing: dense near the camera, where a pixel covers little depth. */
function samples(from: number, to: number): number[] {
    const result: number[] = []
    for (let i = 0; i <= SAMPLE_COUNT; i++) {
        result.push(from * Math.pow(to / from, i / SAMPLE_COUNT))
    }
    return result
}

const NEAR_SAMPLES = samples(PLAYER_Z, 30).slice(1).reverse()
const FAR_SAMPLES = samples(PLAYER_Z, Z_MAX * 1.4)
const Z_SAMPLES = [...NEAR_SAMPLES, ...FAR_SAMPLES]
const PLAYER_SAMPLE = NEAR_SAMPLES.length

/**
 * The road's bend as a function of distance, summed twice over depth every
 * frame. Each ground row and each object is moved sideways by the result;
 * nothing else in the game knows the road is curved.
 */
export class Curve {
    /** Sideways drift of the backdrop, in screen pixels. */
    drift = 0

    private segments: Segment[] = []
    private readonly offsets = new Float64Array(Z_SAMPLES.length)
    private travel = 0

    constructor(private rng: Rng) {}

    reset(rng: Rng, straight: number): void {
        this.rng = rng
        this.segments = [{ start: -PLAYER_Z, length: straight + PLAYER_Z, peak: 0 }]
        this.travel = 0
        this.offsets.fill(0)
    }

    /** Curvature at a distance along the road; eases in and out of each bend. */
    bendAt(distance: number): number {
        this.extendTo(distance)
        // A plain loop: this runs a hundred times a frame, and `find` would
        // allocate a callback for every one of them.
        let segment = this.segments[this.segments.length - 1]
        for (const candidate of this.segments) {
            if (distance < candidate.start + candidate.length) {
                segment = candidate
                break
            }
        }
        const t = (distance - segment.start) / segment.length
        const ease = Math.sin(Math.PI * Math.max(0, Math.min(1, t)))
        return segment.peak * ease * ease
    }

    /** How far Edgar leans into the current bend, in the units of `lean`. */
    lean(): number {
        return this.bendAt(this.travel + PLAYER_Z) * CURVE_LEAN
    }

    update(travel: number, speed: number): void {
        this.travel = travel
        this.drift -= this.bendAt(travel + PLAYER_Z * 4) * speed * CURVE_PARALLAX

        let slope = 0
        this.offsets[PLAYER_SAMPLE] = 0
        for (let i = PLAYER_SAMPLE + 1; i < Z_SAMPLES.length; i++) {
            const dz = Z_SAMPLES[i] - Z_SAMPLES[i - 1]
            slope += this.bendAt(travel + Z_SAMPLES[i]) * dz
            this.offsets[i] = this.offsets[i - 1] + slope * dz
        }

        slope = 0
        for (let i = PLAYER_SAMPLE - 1; i >= 0; i--) {
            const dz = Z_SAMPLES[i + 1] - Z_SAMPLES[i]
            slope += this.bendAt(travel + Z_SAMPLES[i]) * dz
            this.offsets[i] = this.offsets[i + 1] + slope * dz
        }

        while (this.segments.length > 2 && this.segments[0].start + this.segments[0].length < travel - PLAYER_Z) {
            this.segments.shift()
        }
    }

    /** Sideways shift of the road centre at depth `z`, in world units. */
    offsetAt(z: number): number {
        if (z <= Z_SAMPLES[0]) {
            return this.offsets[0]
        }
        let low = 0
        let high = Z_SAMPLES.length - 1
        if (z >= Z_SAMPLES[high]) {
            return this.offsets[high]
        }
        while (high - low > 1) {
            const middle = (low + high) >> 1
            if (Z_SAMPLES[middle] <= z) {
                low = middle
                continue
            }
            high = middle
        }
        const t = (z - Z_SAMPLES[low]) / (Z_SAMPLES[high] - Z_SAMPLES[low])
        return this.offsets[low] + (this.offsets[high] - this.offsets[low]) * t
    }

    private extendTo(distance: number): void {
        let last = this.segments[this.segments.length - 1]
        while (last.start + last.length <= distance + Z_MAX) {
            const straight = last.peak !== 0
            const length = straight
                ? this.rng.float(CURVE_STRAIGHT_MIN, CURVE_STRAIGHT_MAX)
                : this.rng.float(CURVE_LENGTH_MIN, CURVE_LENGTH_MAX)
            const peak = straight ? 0 : this.rng.float(0.45, 1) * CURVE_MAX * (this.rng.chance(0.5) ? 1 : -1)
            last = { start: last.start + last.length, length, peak }
            this.segments.push(last)
        }
    }
}
