import { FOCAL, STEP_SIZE_CHANGE, Z_MAX, Z_NEAR } from '../config'
import type { Curve } from './Curve'
import { view } from './View'

/**
 * The one projection in the game. Ground, lane lines, obstacles, scenery and
 * Edgar all go through it, so they cannot disagree about where things are.
 */
export interface Point {
    x: number
    /** Where the thing touches the ground. */
    groundY: number
    scale: number
}

export class Projection {
    /** Sideways camera position in world units; it follows Edgar part of the way. */
    cameraX = 0

    constructor(private readonly curve: Curve) {}

    project(x: number, z: number): Point {
        const scale = FOCAL / z
        return {
            x: view.w / 2 + (x - this.cameraX + this.curve.offsetAt(z)) * scale,
            groundY: view.horizon + view.camY * scale,
            scale,
        }
    }

    /** Screen x of the road centre for a ground row at depth `z`. */
    centreX(z: number, scale: number): number {
        return view.w / 2 + (this.curve.offsetAt(z) - this.cameraX) * scale
    }
}

// Depth steps for the sprite scaler. Only the size snaps to them; the position
// stays continuous, or the motion would judder.
const STEP_SPAN = Math.log(Z_MAX / Z_NEAR)
export const STEPS = Math.max(16, Math.min(48, Math.round(STEP_SPAN / Math.log(STEP_SIZE_CHANGE)) + 1))
const STEP_RATIO_LOG = STEP_SPAN / (STEPS - 1)

export const STEP_SCALES: number[] = []
for (let i = 0; i < STEPS; i++) {
    STEP_SCALES.push(FOCAL / (Z_NEAR * Math.exp(STEP_RATIO_LOG * i)))
}

export function stepIndex(z: number): number {
    const index = Math.round(Math.log(z / Z_NEAR) / STEP_RATIO_LOG)
    return index < 0 ? 0 : index > STEPS - 1 ? STEPS - 1 : index
}
