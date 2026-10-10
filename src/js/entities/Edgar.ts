import {
    CAPE_GRAVITY,
    CAPE_JUMP_SPEED,
    DRIFT_EASE,
    DUCK_FRAMES,
    FAST_FALL,
    GLIDE_SPEED,
    GRAVITY,
    HOP_SPEED,
    JUMP_SPEED,
    LEAN_EASE,
    STUMBLE_FRAMES,
    WADE_DEPTH,
    WADE_EASE,
} from '../config'
import { laneX } from '../track/Spawner'

/**
 * Edgar's body: lane, drift, jump arc, ducking. The skates slide into a lane
 * rather than snapping to it, which is the whole feel of the game.
 */
export class Edgar {
    lane = 1
    x = 0
    y = 0
    vy = 0
    onGround = true
    duck = 0
    lean = 0
    stumble = 0
    /** Distance skated, which drives the skating animation. */
    stride = 0
    /** Height of whatever is under him: the road, a rail or a wagon. */
    floor = 0
    /** The floor is a rail, which grinds; a wagon does not. */
    rail = false
    /** In a stream off its bridge; set by the game every frame. */
    wading = false
    /** How deep he stands in the water, eased in and out. */
    sink = 0

    reset(): void {
        this.lane = 1
        this.x = 0
        this.y = 0
        this.vy = 0
        this.onGround = true
        this.duck = 0
        this.lean = 0
        this.stumble = 0
        this.stride = 0
        this.floor = 0
        this.rail = false
        this.wading = false
        this.sink = 0
    }

    get grinding(): boolean {
        return this.onGround && this.rail
    }

    move(delta: number): boolean {
        const lane = Math.max(0, Math.min(2, this.lane + delta))
        const moved = lane !== this.lane
        this.lane = lane
        return moved
    }

    jump(cape: boolean): boolean {
        if (!this.onGround) {
            return false
        }
        this.vy = cape ? CAPE_JUMP_SPEED : JUMP_SPEED
        this.onGround = false
        this.duck = 0
        return true
    }

    /**
     * In the air, ducking pulls him down fast and he lands already crouched:
     * a jump over a hurdle can still end under the gate behind it.
     */
    crouch(): void {
        this.duck = DUCK_FRAMES
        if (!this.onGround) {
            this.vy = Math.min(this.vy, FAST_FALL)
        }
    }

    /** A small hop, high enough to land on a rail. */
    hop(): void {
        this.vy = HOP_SPEED
        this.onGround = false
        this.duck = 0
    }

    trip(): void {
        this.stumble = STUMBLE_FRAMES
        this.duck = 0
    }

    update(speed: number, cape: boolean, gliding: boolean, bend: number): void {
        const target = laneX(this.lane)
        this.x += (target - this.x) * DRIFT_EASE
        const wanted = (target - this.x) / 14 + bend
        this.lean += (wanted - this.lean) * LEAN_EASE
        this.lean = Math.max(-1, Math.min(1, this.lean))
        this.stride += speed
        // Out of the water he pops up at once; in, he settles.
        this.sink += ((this.wading ? WADE_DEPTH : 0) - this.sink) * (this.wading ? WADE_EASE : 0.6)

        // Ducked in the air: the crouch waits for the landing.
        if (this.duck > 0 && (this.onGround || this.y < 8)) {
            this.duck--
        }
        if (this.stumble > 0) {
            this.stumble--
        }

        if (this.onGround && this.y > this.floor) {
            // Rolled off the end or the side of a rail.
            this.onGround = false
            this.vy = 0
        }
        if (this.onGround) {
            this.y = this.floor
            return
        }

        this.vy -= cape ? CAPE_GRAVITY : GRAVITY
        if (cape && gliding && this.vy < GLIDE_SPEED) {
            this.vy = GLIDE_SPEED
        }
        this.y += this.vy
        if (this.y <= this.floor && this.vy <= 0) {
            this.y = this.floor
            this.vy = 0
            this.onGround = true
        }
    }
}
