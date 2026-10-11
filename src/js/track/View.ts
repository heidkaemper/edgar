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
 * The shape of one player's picture. The short side is always 360, so
 * everything that decides the game fits a 360 square; the rest of the long
 * side is extra. Two players get one each, side by side.
 */
export interface View {
    w: number
    h: number
    /** How many pictures stand side by side: the playfield is `w * panes` wide. */
    panes: number
    /** Width over height of the whole space the host offers. */
    aspect: number
    portrait: boolean
    horizon: number
    feetY: number
    /** Camera height above the road, in world units. */
    camY: number
    /**
     * Rows at the top and bottom edge that the host keeps clear for its own
     * bars: the picture runs under them, the HUD and the hints do not.
     */
    padTop: number
    padBottom: number
    /** Bumped on every change, so caches know when to rebuild. */
    version: number
}

export const view: View = {
    w: 640,
    h: 360,
    panes: 1,
    aspect: 16 / 9,
    portrait: false,
    horizon: LANDSCAPE_HORIZON,
    feetY: LANDSCAPE_FEET,
    camY: (LANDSCAPE_FEET - LANDSCAPE_HORIZON) / PLAYER_SCALE,
    padTop: 0,
    padBottom: 0,
    version: 0,
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

/** `aspect` is width over height of the space the game may use, shared out among `panes` pictures. */
export function layoutView(aspect: number, panes = view.panes): void {
    const share = aspect / panes
    const portrait = share < 1
    const long = Math.round(clamp(VIEW_SHORT * (portrait ? 1 / share : share), VIEW_LONG_MIN, VIEW_LONG_MAX))
    const w = portrait ? VIEW_SHORT : long
    const h = portrait ? long : VIEW_SHORT

    view.aspect = aspect
    if (w === view.w && h === view.h && panes === view.panes && view.version > 0) {
        return
    }

    const landscapeSpan = LANDSCAPE_FEET - LANDSCAPE_HORIZON
    const span = portrait
        ? Math.round(Math.min(PORTRAIT_SPAN_MAX, landscapeSpan + (h - VIEW_SHORT) * PORTRAIT_SPAN_GROWTH))
        : landscapeSpan
    const feetY = portrait ? h - Math.max(VIEW_SHORT - LANDSCAPE_FEET, Math.round(h * PORTRAIT_BOTTOM_SHARE)) : LANDSCAPE_FEET

    view.w = w
    view.h = h
    view.panes = panes
    view.portrait = portrait
    view.feetY = feetY
    view.horizon = feetY - span
    view.camY = span / PLAYER_SCALE
    view.version++
}
