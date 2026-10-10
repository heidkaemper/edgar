import {
    LANDSCAPE_FEET,
    LANDSCAPE_HORIZON,
    PLAYER_SCALE,
    PORTRAIT_BOTTOM_SHARE,
    PORTRAIT_SPAN_GROWTH,
    PORTRAIT_SPAN_MAX,
    VIEW_LONG_MAX,
    VIEW_LONG_MIN,
    VIEW_SHORT,
} from '../config'

/**
 * The shape of the picture. The short side is always 360, so everything that
 * decides the game fits a 360 square; the rest of the long side is extra.
 */
export interface View {
    w: number
    h: number
    portrait: boolean
    horizon: number
    feetY: number
    /** Camera height above the road, in world units. */
    camY: number
    /** Bumped on every change, so caches know when to rebuild. */
    version: number
}

export const view: View = {
    w: 640,
    h: 360,
    portrait: false,
    horizon: LANDSCAPE_HORIZON,
    feetY: LANDSCAPE_FEET,
    camY: (LANDSCAPE_FEET - LANDSCAPE_HORIZON) / PLAYER_SCALE,
    version: 0,
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

/** `aspect` is width over height of the space the game may use. */
export function layoutView(aspect: number): void {
    const portrait = aspect < 1
    const long = Math.round(clamp(VIEW_SHORT * (portrait ? 1 / aspect : aspect), VIEW_LONG_MIN, VIEW_LONG_MAX))
    const w = portrait ? VIEW_SHORT : long
    const h = portrait ? long : VIEW_SHORT

    if (w === view.w && h === view.h && view.version > 0) {
        return
    }

    const landscapeSpan = LANDSCAPE_FEET - LANDSCAPE_HORIZON
    const span = portrait
        ? Math.round(Math.min(PORTRAIT_SPAN_MAX, landscapeSpan + (h - VIEW_SHORT) * PORTRAIT_SPAN_GROWTH))
        : landscapeSpan
    const feetY = portrait ? h - Math.max(VIEW_SHORT - LANDSCAPE_FEET, Math.round(h * PORTRAIT_BOTTOM_SHARE)) : LANDSCAPE_FEET

    view.w = w
    view.h = h
    view.portrait = portrait
    view.feetY = feetY
    view.horizon = feetY - span
    view.camY = span / PLAYER_SCALE
    view.version++
}
