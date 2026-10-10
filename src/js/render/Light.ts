import {
    DAWN_METRES,
    DAY_CYCLE_METRES,
    DAY_METRES,
    DUSK_METRES,
    LIGHT_STEP_METRES,
    NIGHT_END_METRES,
    NIGHT_METRES,
} from '../config'
import { view } from '../track/View'
import type { MoodName } from './Palette'
import { css, mix, MOODS, toRgb } from './Palette'

type Rgb = [number, number, number]

/** Sun and moon as [share of the screen width, height above the horizon]; below 0 they are set. */
interface Key {
    at: number
    mood: MoodName
    sun: [number, number]
    moon: [number, number]
}

/**
 * The sun crosses from right to left over the afternoon and sets on the left;
 * the moon rises on the right and sets on the left; the sun comes back up on
 * the right. The last key repeats the first, so the cycle closes.
 */
const KEYS: Key[] = [
    { at: 0, mood: 'day', sun: [0.3, 1], moon: [0.75, -1] },
    { at: DUSK_METRES - 250, mood: 'day', sun: [0.25, 1], moon: [0.75, -1] },
    { at: DUSK_METRES, mood: 'dusk', sun: [0.21, 0.72], moon: [0.75, -1] },
    { at: DUSK_METRES + 150, mood: 'dusk', sun: [0.2, 0.1], moon: [0.75, -1] },
    { at: NIGHT_METRES, mood: 'night', sun: [0.19, -0.8], moon: [0.74, -0.4] },
    { at: NIGHT_METRES + 250, mood: 'night', sun: [0.5, -1], moon: [0.66, 0.9] },
    { at: NIGHT_END_METRES - 200, mood: 'night', sun: [0.8, -1], moon: [0.42, 0.9] },
    { at: NIGHT_END_METRES, mood: 'night', sun: [0.82, -0.6], moon: [0.34, -0.4] },
    { at: DAWN_METRES, mood: 'dawn', sun: [0.8, 0.65], moon: [0.3, -1] },
    { at: DAY_METRES, mood: 'day', sun: [0.74, 0.95], moon: [0.75, -1] },
    { at: DAY_CYCLE_METRES, mood: 'day', sun: [0.3, 1], moon: [0.75, -1] },
]

const WHITE = '#ffffff'

function smooth(t: number): number {
    return t * t * (3 - 2 * t)
}

/** The key `at` lies after: it and the next one are the pair it fades between. */
function keyBefore(at: number): number {
    for (let i = 1; i < KEYS.length; i++) {
        if (at <= KEYS[i].at) {
            return i - 1
        }
    }
    return 0
}

function share(index: number, at: number): number {
    return (at - KEYS[index].at) / (KEYS[index + 1].at - KEYS[index].at)
}

/**
 * The time of day at a point of the run. Colours change in steps of a few
 * metres, and `version` tells the caches when; the sun and moon move every
 * frame, so they glide rather than jump.
 */
export class Light {
    version = 0
    sky: Rgb[] = []
    sun = ''
    cloud = ''
    cloudDark = ''
    hill = ''
    hillDark = ''
    tint = WHITE
    stars = 0
    /** Screen positions; a body below the horizon is hidden by the hills and the ground. */
    sunX = 0
    sunY = 0
    moonX = 0
    moonY = 0

    private step = -1
    private signature = ''

    update(metres: number): void {
        const at = metres % DAY_CYCLE_METRES
        const index = keyBefore(at)
        const from = KEYS[index]
        const to = KEYS[index + 1]
        const t = share(index, at)
        const rise = Math.min(70, (view.horizon + 1) * 0.5)
        this.sunX = Math.round(view.w * (from.sun[0] + (to.sun[0] - from.sun[0]) * t))
        this.sunY = Math.round(view.horizon - rise * (from.sun[1] + (to.sun[1] - from.sun[1]) * t))
        this.moonX = Math.round(view.w * (from.moon[0] + (to.moon[0] - from.moon[0]) * t))
        this.moonY = Math.round(view.horizon - rise * (from.moon[1] + (to.moon[1] - from.moon[1]) * t))

        const step = Math.floor(at / LIGHT_STEP_METRES)
        if (step === this.step) {
            return
        }
        this.step = step
        const stepped = step * LIGHT_STEP_METRES
        const key = keyBefore(stepped)
        this.blend(KEYS[key], KEYS[key + 1], share(key, stepped))
    }

    /** Over everything in the world and under the HUD. */
    grade(ctx: CanvasRenderingContext2D): void {
        if (this.tint === WHITE) {
            return
        }
        ctx.globalCompositeOperation = 'multiply'
        ctx.fillStyle = this.tint
        ctx.fillRect(0, 0, view.w, view.h)
        ctx.globalCompositeOperation = 'source-over'
    }

    private blend(from: Key, to: Key, t: number): void {
        const a = MOODS[from.mood]
        const b = MOODS[to.mood]
        const eased = smooth(t)
        const colour = (x: string, y: string): Rgb => mix(toRgb(x), toRgb(y), eased)

        this.sky = [0, 1, 2].map((i) => colour(a.sky[i], b.sky[i]))
        this.sun = css(colour(a.sun, b.sun))
        this.cloud = css(colour(a.cloud, b.cloud))
        this.cloudDark = css(colour(a.cloudDark, b.cloudDark))
        this.hill = css(colour(a.hill, b.hill))
        this.hillDark = css(colour(a.hillDark, b.hillDark))
        this.tint = hex(colour(a.tint, b.tint))
        this.stars = a.stars + (b.stars - a.stars) * eased

        const signature = [this.sky.join(), this.sun, this.cloud, this.hill, this.tint, this.stars.toFixed(2)].join('|')
        if (signature !== this.signature) {
            this.signature = signature
            this.version++
        }
    }
}

/** Hex rather than `rgb()`, so pure white compares equal to `WHITE`. */
function hex(rgb: Rgb): string {
    return '#' + rgb.map((value) => value.toString(16).padStart(2, '0')).join('')
}
