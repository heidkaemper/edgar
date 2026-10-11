import { BELLO_BARK_FRAMES, BELLO_FAR, BELLO_FRAMES, BELLO_NEAR, BELLO_SIDE, PLAYER_Z, Z_NEAR } from '../config'

type Mode = 'away' | 'chasing' | 'dropping' | 'catching' | 'sitting'

const APPROACH_EASE = 0.035
const DROP_SPEED = 0.6
const POUNCE_FRAMES = 34

/**
 * The farm dog. He appears behind Edgar after a stumble, closes in while he
 * chases, then falls back and is gone. A second stumble while he can be seen
 * means he catches up. How close he is shows the danger; no HUD needed.
 */
export class Bello {
    mode: Mode = 'away'
    /** How far behind Edgar he runs, in depth. */
    gap = BELLO_FAR
    x = 0
    /** Height of the pounce at the end. */
    y = 0
    timer = 0
    bark = 0
    stride = 0

    get visible(): boolean {
        return this.mode !== 'away'
    }

    /** How far in front of the camera he is; at his closest he is cut off by the bottom of the picture. */
    get z(): number {
        return Math.max(Z_NEAR * 0.75, PLAYER_Z - this.gap)
    }

    /** In sight, so a second stumble ends the run. */
    get threatening(): boolean {
        return this.mode === 'chasing' || this.mode === 'dropping'
    }

    reset(): void {
        this.mode = 'away'
        this.gap = BELLO_FAR
        this.timer = 0
        this.bark = 0
        this.y = 0
    }

    chase(edgarX: number): void {
        if (this.mode === 'away') {
            this.gap = BELLO_FAR
            this.x = edgarX + this.side(edgarX) * BELLO_SIDE
        }
        this.mode = 'chasing'
        this.timer = BELLO_FRAMES
        this.bark = BELLO_BARK_FRAMES
    }

    catchUp(): void {
        this.mode = 'catching'
        this.timer = POUNCE_FRAMES
        this.bark = BELLO_BARK_FRAMES
    }

    update(edgarX: number, speed: number): void {
        this.stride += speed
        if (this.bark > 0) {
            this.bark--
        }
        if (this.mode === 'away') {
            return
        }

        const sideX = edgarX + this.side(edgarX) * BELLO_SIDE
        this.x += (sideX - this.x) * 0.08

        if (this.mode === 'chasing') {
            this.gap += (BELLO_NEAR - this.gap) * APPROACH_EASE
            this.timer--
            if (this.timer <= 0) {
                this.mode = 'dropping'
            }
            return
        }

        if (this.mode === 'dropping') {
            this.gap += DROP_SPEED
            if (this.gap > BELLO_FAR) {
                this.mode = 'away'
            }
            return
        }

        if (this.mode === 'catching') {
            this.timer--
            const t = 1 - this.timer / POUNCE_FRAMES
            this.gap = BELLO_NEAR * (1 - t)
            this.y = Math.sin(t * Math.PI) * 26
            if (this.timer <= 0) {
                this.mode = 'sitting'
                this.y = 0
                this.gap = 0
            }
        }
    }

    /** Towards the middle of the road, so he never hides Edgar. */
    private side(edgarX: number): number {
        return edgarX < -1 ? 1 : -1
    }
}
