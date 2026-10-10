import {
    BREATHER_CURVE,
    CHICKEN_SPEED,
    COW_DRIFT,
    DUCK_SPACING,
    DUCK_SPEED,
    LANE_W,
    PLAYER_Z,
    RAIL_TOP,
    ROAD_HALF,
    WAGON_TOP,
    ROW_FRAMES_CURVE,
    SQUEEZE_CURVE,
    Z_MAX,
} from '../config'
import { curveAt } from '../core/Difficulty'
import type { Rng } from '../core/Rng'
import type { Thing } from '../entities/Thing'
import { makeThing, SCENERY } from '../entities/Thing'
import { BREATHER, CHUNKS, isEmpty, maskOf, OPENING } from './Chunks'

export const ACORN_LIFT = 11
const SCENERY_FRAMES_MIN = 14
const SCENERY_FRAMES_MAX = 34

export function laneX(lane: number): number {
    return (lane - 1) * LANE_W
}

/**
 * Emits one obstacle row per beat at the far end of the track, and scenery
 * on both sides. Rows come at a fixed beat, so their spacing grows with speed
 * and the time to react between two of them stays the same.
 */
export class Spawner {
    private pending: string[] = []
    private prevExit = 0b111
    private sinceBreather = 0
    private rowTimer = 0
    private sceneryTimer = 0
    private rowFrames = ROW_FRAMES_CURVE[0][1]
    /** Rows of the stream being laid that are still to come. */
    private streamRows = 0
    /** Frames left in which no scenery is planted, so no tree stands in the water. */
    private dry = 0

    constructor(private rng: Rng) {}

    reset(rng: Rng, opening: boolean): void {
        this.rng = rng
        this.pending = opening ? [...OPENING] : []
        this.prevExit = 0b111
        this.sinceBreather = 0
        this.rowTimer = 0
        this.sceneryTimer = 0
        this.streamRows = 0
        this.dry = 0
    }

    /** Development only: these rows come next, whatever the generator had in mind. */
    queue(rows: string[]): void {
        this.pending = rows
    }

    /** `metres` is how far the run has come; it sets the difficulty. */
    update(speed: number, metres: number, things: Thing[], obstacles: boolean): void {
        this.rowFrames = curveAt(ROW_FRAMES_CURVE, metres)
        this.rowTimer--
        if (this.rowTimer <= 0 && obstacles) {
            this.rowTimer += this.rowFrames
            this.emitRow(speed, metres, things)
        }
        if (!obstacles) {
            this.rowTimer = Math.max(this.rowTimer, 1)
        }

        this.sceneryTimer--
        if (this.dry > 0) {
            this.dry--
            this.sceneryTimer = Math.max(this.sceneryTimer, 1)
        }
        if (this.sceneryTimer <= 0) {
            this.sceneryTimer = this.rng.int(SCENERY_FRAMES_MIN, SCENERY_FRAMES_MAX)
            this.emitScenery(things)
        }
    }

    /** Scenery from the far end down to the camera, so a fresh run is not bare. */
    prefill(things: Thing[], speed: number): void {
        let z = Z_MAX
        while (z > PLAYER_Z * 0.7) {
            this.emitScenery(things, z)
            z -= speed * this.rng.int(SCENERY_FRAMES_MIN, SCENERY_FRAMES_MAX)
        }
    }

    private nextChunk(metres: number): string[] {
        this.sinceBreather++
        if (this.sinceBreather > curveAt(BREATHER_CURVE, metres)) {
            this.sinceBreather = 0
            this.prevExit = 0b111
            return [...BREATHER]
        }
        const options = CHUNKS.filter((chunk) => chunk.from <= metres && (chunk.entry & this.prevExit) !== 0)
        const rows = [...this.rng.pick(options).rows]

        // Late in a run the empty tail goes, and the next chunk follows hard on;
        // never behind a wagon, whose lane has to stay clear for the drop.
        if (!rows.some((row) => row.includes('W')) && this.rng.chance(curveAt(SQUEEZE_CURVE, metres))) {
            while (rows.length > 1 && isEmpty(rows[rows.length - 1])) {
                rows.pop()
            }
        }
        this.prevExit = maskOf(rows[rows.length - 1])
        return rows
    }

    private emitRow(speed: number, metres: number, things: Thing[]): void {
        if (this.pending.length === 0) {
            this.pending = this.nextChunk(metres)
        }
        const row = this.pending.shift()!
        const z = Z_MAX
        if (row.includes('~')) {
            this.emitStream(row, z, speed, things)
        }

        for (let lane = 0; lane < 3; lane++) {
            const x = laneX(lane)
            switch (row[lane]) {
                case 'a':
                    things.push(makeThing('acorn', x, z, { lift: ACORN_LIFT, timer: this.rng.float(0, 6) }))
                    break
                case 'H':
                    things.push(makeThing('hurdle', x, z))
                    break
                case 'S':
                    things.push(makeThing('gate', x, z))
                    break
                case 'K':
                    things.push(makeThing('hay', x, z))
                    break
                case 'M':
                    things.push(makeThing('mud', x, z))
                    break
                case 'R':
                    things.push(makeThing('rail', x, z, { length: (this.runLength(lane, '|') + 0.5) * speed * this.rowFrames }))
                    break
                case '|':
                    things.push(makeThing('acorn', x, z, { lift: RAIL_TOP + ACORN_LIFT, timer: this.rng.float(0, 6) }))
                    break
                case 'W':
                    things.push(makeThing('wagon', x, z, { length: (this.runLength(lane, '=') + 0.5) * speed * this.rowFrames }))
                    break
                case '=':
                    things.push(makeThing('acorn', x, z, { lift: WAGON_TOP + ACORN_LIFT, timer: this.rng.float(0, 6) }))
                    break
                case 'C':
                    things.push(
                        makeThing('chicken', x, z, {
                            vx: CHICKEN_SPEED * (this.rng.chance(0.5) ? 1 : -1),
                            timer: this.rng.int(30, 90),
                        }),
                    )
                    break
                case 'E':
                    this.emitDucks(lane, z, speed, things)
                    break
                case 'U':
                    this.emitCow(lane, z, things)
                    break
                case 'B':
                    things.push(makeThing('acorn', x, z, { lift: ACORN_LIFT, timer: this.rng.float(0, 6) }))
                    break
            }
        }
    }

    /** How many rows below its start a rail or a wagon goes on for. */
    private runLength(lane: number, cell: string): number {
        let count = 0
        while (this.pending[count]?.[lane] === cell) {
            count++
        }
        return count
    }

    /**
     * The mother is placed so that she reaches the lane exactly as she reaches
     * Edgar: predictable, which is what sets ducks apart from the chicken.
     */
    private emitDucks(lane: number, z: number, speed: number, things: Thing[]): void {
        const direction = this.rng.chance(0.5) ? 1 : -1
        const frames = (z - PLAYER_Z) / speed
        const x = laneX(lane) - direction * DUCK_SPEED * frames
        things.push(makeThing('duck', x, z, { vx: direction * DUCK_SPEED }))
        for (let i = 1; i <= 3; i++) {
            things.push(makeThing('duckling', x - direction * (DUCK_SPACING * i + 2), z, { vx: direction * DUCK_SPEED }))
        }
    }

    /**
     * One stream for a run of rows with water in them, laid with the first:
     * as long as those rows take to pass, so it can never be jumped.
     */
    private emitStream(row: string, z: number, speed: number, things: Thing[]): void {
        if (this.streamRows === 0) {
            let rows = 1
            while (this.pending[rows - 1]?.includes('~')) {
                rows++
            }
            const length = rows * speed * this.rowFrames
            things.push(makeThing('stream', laneX(row.indexOf('B')), z, { length }))
            this.streamRows = rows
            this.dry = rows * this.rowFrames
            // Trees planted a moment ago, with their scatter, can reach into the water.
            for (const thing of things) {
                if (SCENERY.has(thing.kind) && thing.z > z - 30) {
                    thing.gone = true
                }
            }
        }
        this.streamRows--
    }

    /** Placed by depth, not time: wherever the speed goes, it stands in its lane as it reaches Edgar. */
    private emitCow(lane: number, z: number, things: Thing[]): void {
        const direction = this.rng.chance(0.5) ? 1 : -1
        const x = laneX(lane) - direction * COW_DRIFT * (z - PLAYER_Z)
        things.push(makeThing('cow', x, z, { vx: direction * COW_DRIFT }))
    }

    private emitScenery(things: Thing[], z = Z_MAX): void {
        const side = this.rng.chance(0.5) ? -1 : 1
        const roll = this.rng.next()
        const kind = roll < 0.5 ? 'tree' : roll < 0.8 ? 'bush' : 'fence'
        const near = kind === 'fence' ? 22 : 26
        things.push(makeThing(kind, side * (ROAD_HALF + near + this.rng.float(0, 70)), z))

        // The far side of a landscape screen wants filling too.
        if (this.rng.chance(0.6)) {
            things.push(makeThing('tree', -side * (ROAD_HALF + 60 + this.rng.float(0, 160)), z + this.rng.float(0, 60)))
        }
    }
}
