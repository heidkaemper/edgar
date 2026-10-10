import {
    ANIMAL_CLEAR,
    BLINK_FRAMES,
    CAMERA_EASE,
    CAMERA_FOLLOW,
    CAPE_FRAMES,
    CAUGHT_FRAMES,
    CHICKEN_SPEED,
    GATE_CLEAR,
    GRACE_FRAMES,
    HURDLE_CLEAR,
    JAR_SIZE,
    MAGNET_FRAMES,
    MAGNET_RANGE,
    CRUISE_SPEED,
    FULL_CLEAR,
    METRE,
    MUSIC_BPM,
    MUSIC_BPM_CALM,
    MUSIC_BPM_MAX,
    MUSIC_CURVE,
    MUD_CLEAR,
    MUD_FRAMES,
    PLAYER_Z,
    RAIL_TOP,
    RAMP_LENGTH,
    BRIDGE_MARGIN,
    ROAD_HALF,
    RECOVER_EASE,
    SLOW_FRAMES,
    SLOW_SHARE,
    STAGE_BASE,
    STAGE_MAX,
    STAGE_METRES,
    STAGE_STEP,
    STORAGE_KEY,
    TITLE_SPEED,
    TURBO_FRAMES,
    TURBO_SPEED,
    WADE_SPEED,
    WAGON_HALF,
    WAGON_TOP,
    WAGON_STEP,
    LANE_W,
    Z_NEAR,
} from '../config'
import type { Sound } from '../audio/Sound'
import { Bello } from '../entities/Bello'
import { Edgar } from '../entities/Edgar'
import { Particles } from '../entities/Particles'
import type { Thing } from '../entities/Thing'
import { ANIMALS, HALF_WIDTH, makeThing } from '../entities/Thing'
import type { Ability } from '../render/Art'
import { ART, prewarm } from '../render/Art'
import { Hud } from '../render/Hud'
import { Light } from '../render/Light'
import { PAL } from '../render/Palette'
import { TrackRenderer } from '../render/TrackRenderer'
import { WorldRenderer } from '../render/WorldRenderer'
import { Curve } from '../track/Curve'
import { Projection } from '../track/Projection'
import { laneX, Spawner } from '../track/Spawner'
import { view } from '../track/View'
import { Screens } from '../ui/Screens'
import type { Input } from './Input'
import { randomSeed, Rng } from './Rng'

export type State = 'title' | 'run' | 'paused' | 'caught' | 'over'

/** Edgar's half width for collisions; generous, because the players are children. */
const EDGAR_HALF = 8
/** How close sideways a rail has to come before the skates hop onto it. */
const RAIL_HOP_REACH = 16
/** How far off a wagon's middle Edgar can be and still ride on top of it. */
const WAGON_RIDE = 16
/** How far off a bridge's middle Edgar can be and still keep his feet dry. */
const BRIDGE_REACH = 15
const TOUCH_HINT = 'WISCHEN: LINKS RECHTS HOCH RUNTER'
/** Depth at which an animal makes itself heard. */
const ANNOUNCE_Z = 900
const DEBRIS: Partial<Record<Thing['kind'], string[]>> = {
    hurdle: [PAL.hazard, PAL.hazardDark, PAL.post],
    gate: [PAL.barrier, PAL.white, PAL.post],
    hay: [PAL.hay, PAL.hayLight, PAL.twine],
    chicken: [PAL.feather, PAL.comb],
    duck: [PAL.duck, PAL.beak],
    duckling: [PAL.duckling],
    cow: [PAL.cow, PAL.cowPatch, PAL.muzzle],
}
const ABILITIES: Ability[] = ['helmet', 'cape', 'magnet', 'turbo']

export interface Splash {
    x: number
    y: number
    r: number
    life: number
    seed: number
}

/**
 * Orchestration: the states of a run, the collisions, the abilities and the
 * jar. Entities keep their own physics; the renderers only read.
 */
export class Game {
    state: State = 'title'
    frame = 0
    stateFrame = 0
    travel = 0
    /** Frames left of the short slow spell at the start and after a stumble. */
    slowFrames = 0
    stage = 0
    speed = TITLE_SPEED
    baseSpeed = TITLE_SPEED
    things: Thing[] = []
    acorns = 0
    jar = 0
    next: Ability = 'cape'
    helmet = false
    power: Ability | null = null
    powerTimer = 0
    grace = 0
    shake = 0
    muddy = 0
    splashes: Splash[] = []
    toast = ''
    toastTimer = 0
    best = 0
    newBest = false
    gliding = false
    /** Frames left of the speed lines after a step up. */
    stageFlash = 0
    /** Development only: nothing collides, so screenshots can reach far into a run. */
    ghost = false

    readonly edgar = new Edgar()
    readonly bello = new Bello()
    readonly particles = new Particles()
    readonly curve: Curve
    readonly projection: Projection
    readonly light = new Light()

    private rng = new Rng(randomSeed())
    private readonly spawner: Spawner
    private readonly track: TrackRenderer
    private readonly world: WorldRenderer
    private readonly hud: Hud
    private readonly screens: Screens

    constructor(
        private readonly ctx: CanvasRenderingContext2D,
        private readonly input: Input,
        private readonly sound: Sound,
    ) {
        this.curve = new Curve(this.rng)
        this.projection = new Projection(this.curve)
        this.spawner = new Spawner(this.rng)
        this.track = new TrackRenderer(this.curve, this.projection)
        this.world = new WorldRenderer(this.projection)
        this.hud = new Hud()
        this.screens = new Screens()
        this.best = loadBest()
        this.input.setTapZones((x, y) => this.tapAction(x, y))
        this.reset(false)
    }

    get metres(): number {
        return Math.floor(this.travel / METRE)
    }

    get turbo(): boolean {
        return this.power === 'turbo'
    }

    get cape(): boolean {
        return this.power === 'cape'
    }

    /** True in the last seconds of an ability, so it can blink. */
    get powerEnding(): boolean {
        return this.powerTimer < BLINK_FRAMES && Math.floor(this.frame / 6) % 2 === 0
    }

    start(): void {
        this.reset(true)
        this.state = 'run'
        this.stateFrame = 0
        this.sound.start()
    }

    reset(run: boolean, seed = randomSeed()): void {
        this.rng = new Rng(seed)
        this.curve.reset(this.rng, run ? 2400 : 600)
        this.spawner.reset(this.rng, run)
        this.edgar.reset()
        this.bello.reset()
        this.particles.clear()
        this.things = []
        this.travel = 0
        this.stage = 0
        this.slowFrames = run ? SLOW_FRAMES : 0
        this.baseSpeed = run ? CRUISE_SPEED * STAGE_BASE * SLOW_SHARE : TITLE_SPEED
        this.speed = this.baseSpeed
        this.acorns = 0
        this.jar = 0
        this.next = this.rng.pick(ABILITIES.filter((ability) => ability !== 'helmet'))
        this.helmet = false
        this.power = null
        this.powerTimer = 0
        this.grace = 0
        this.shake = 0
        this.muddy = 0
        this.splashes = []
        this.toastTimer = 0
        this.newBest = false
        this.spawner.prefill(this.things, this.speed)
    }

    update(): void {
        this.frame++
        this.stateFrame++
        this.input.poll()
        const actions = this.input.take()
        this.updateMusic()
        // Plenty of time on the title screen; a trickle once a run is on.
        prewarm(this.state === 'run' ? 2 : 24)

        if (this.state === 'paused') {
            if (actions.length > 0) {
                this.state = 'run'
                this.sound.pause()
            }
            return
        }

        if (this.state === 'title' || this.state === 'over') {
            const ready = this.state === 'title' || this.stateFrame > 45
            if (ready && actions.some((action) => action !== 'left' && action !== 'right')) {
                this.start()
                return
            }
        }

        if (this.state === 'run') {
            for (const action of actions) {
                this.act(action)
            }
        }

        this.advance()
    }

    render(): void {
        const ctx = this.ctx
        const shakeX = this.shake > 0 ? (this.frame % 2 ? 2 : -2) : 0
        ctx.setTransform(1, 0, 0, 1, shakeX, 0)

        this.light.update(this.metres)
        this.track.draw(ctx, this.travel, shakeX, this.things, this.light)
        this.world.draw(ctx, this, () => this.track.drawHaze(ctx))
        this.world.drawEffects(ctx, this)

        ctx.setTransform(1, 0, 0, 1, 0, 0)
        this.light.grade(ctx)
        if (this.state === 'run' || this.state === 'paused') {
            this.hud.draw(ctx, this, this.input.touchMode)
        }
        this.screens.draw(ctx, this, this.input.touchMode ? TOUCH_HINT : this.input.controls.hint)
    }

    /** Development only: shortcuts that make every state reachable at once. */
    debug(): Record<string, (...args: never[]) => unknown> {
        return {
            give: (ability: Ability) => this.activate(ability),
            stumble: () => this.stumble(),
            warp: (frames: number) => {
                for (let i = 0; i < frames; i++) {
                    this.advance()
                    this.frame++
                    this.stateFrame++
                }
            },
            start: (seed?: number) => {
                this.reset(true, seed)
                this.state = 'run'
            },
            splash: () => this.splash(),
            rails: () => {
                this.things.push(
                    makeThing('rail', laneX(0), PLAYER_Z + 40, { length: 1600 }),
                    makeThing('rail', laneX(2), PLAYER_Z + 400, { length: 1600 }),
                )
            },
            fly: (height: number) => {
                this.edgar.y = height
                this.edgar.vy = 0
                this.edgar.onGround = false
            },
            metres: (metres: number) => {
                this.travel = metres * METRE
                this.stage = Math.floor(metres / STAGE_METRES)
            },
            ghost: () => {
                this.ghost = true
            },
            chunk: (rows: string) => this.spawner.queue(rows.split(',')),
            state: () => this,
        }
    }

    private act(action: string): void {
        switch (action) {
            case 'left':
            case 'right':
                if (this.railingAcross(action === 'left' ? -1 : 1)) {
                    this.bump()
                    break
                }
                if (this.edgar.move(action === 'left' ? -1 : 1)) {
                    this.sound.swish()
                }
                break
            case 'jump':
                if (this.edgar.jump(this.cape)) {
                    this.sound.jump(this.cape)
                }
                break
            case 'duck':
                this.edgar.crouch()
                this.sound.duck()
                break
            case 'pause':
            case 'confirm':
                this.state = 'paused'
                this.sound.pause()
                break
        }
    }

    /**
     * In a run only the pause button answers a tap; steering is by swiping, so
     * a short, slow swipe can never turn into an accidental lane change.
     */
    private tapAction(x: number, y: number): 'pause' | 'confirm' | null {
        if (this.state !== 'run') {
            return 'confirm'
        }
        return this.hud.hitsPause(x, y) ? 'pause' : null
    }

    private advance(): void {
        const running = this.state === 'run'
        if (running) {
            this.updateStage()
        }

        this.updateSpeed()
        this.travel += this.speed
        this.curve.update(this.travel, this.speed)
        this.projection.cameraX += (this.edgar.x * CAMERA_FOLLOW - this.projection.cameraX) * CAMERA_EASE

        this.gliding = this.cape && !this.edgar.onGround && this.input.jumpHeld()
        this.updateFloor()
        if (this.state !== 'caught' && this.state !== 'over') {
            const airborne = !this.edgar.onGround
            this.edgar.update(this.speed, this.cape, this.gliding, this.curve.lean())
            if (airborne && this.edgar.onGround && running) {
                this.landed()
            }
        }
        this.bello.update(this.edgar.x, this.speed)

        this.spawner.update(this.speed, this.metres, this.things, running)
        this.moveThings()
        if (running) {
            this.updateWater()
        }
        this.particles.update()
        this.updateEffects()

        if (running) {
            this.updateAbilities()
        }
        if (this.bello.mode === 'sitting' && this.frame % 14 === 0) {
            const point = this.edgarScreen()
            this.particles.add({
                x: point.x - 30 + Math.random() * 40,
                y: point.y - 70,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -1.2,
                gravity: 0,
                life: 50,
                sprite: ART.heart,
            })
        }
        if (this.state === 'caught' && this.stateFrame > CAUGHT_FRAMES) {
            this.finish()
        }
    }

    /** The speed of the stretch of road Edgar is on, as a multiple of `CRUISE_SPEED`. */
    stageSpeed(): number {
        return Math.min(STAGE_MAX, STAGE_BASE + this.stage * STAGE_STEP)
    }

    /** Every few hundred metres one step faster, announced by a whoosh and speed lines. */
    private updateStage(): void {
        if (this.slowFrames > 0) {
            this.slowFrames--
        }
        const stage = Math.floor(this.metres / STAGE_METRES)
        if (stage === this.stage) {
            return
        }
        this.stage = stage
        if (STAGE_BASE + stage * STAGE_STEP <= STAGE_MAX + STAGE_STEP / 2) {
            this.stageFlash = 50
            this.sound.faster()
        }
    }

    /** Calm on the title and the end, driven by Edgar's speed while he runs. */
    private updateMusic(): void {
        if (this.state === 'run') {
            const ratio = this.speed / (CRUISE_SPEED * STAGE_BASE)
            const bpm = Math.min(MUSIC_BPM_MAX, MUSIC_BPM * Math.pow(Math.max(0.5, ratio), MUSIC_CURVE))
            this.sound.setMusic('run', bpm, Math.min(1, this.stage / 10))
        }
        if (this.state === 'title' || (this.state === 'over' && this.stateFrame > 90)) {
            this.sound.setMusic('calm', MUSIC_BPM_CALM, 0)
        }
        if (this.state === 'paused' || this.state === 'caught' || (this.state === 'over' && this.stateFrame <= 90)) {
            this.sound.setMusic('off', MUSIC_BPM_CALM, 0)
        }
        this.sound.tick()
    }

    private landed(): void {
        this.sound.land()
        const point = this.edgarScreen()
        for (const side of [-1, 1]) {
            this.particles.add({ x: point.x + side * 14, y: point.y - 2, vx: side * 1.4, vy: -0.6, gravity: 0.05, life: 14, color: PAL.shade, size: 3 })
        }
    }

    private updateSpeed(): void {
        if (this.state === 'caught' || this.state === 'over') {
            this.speed *= 0.93
            return
        }
        const slow = this.slowFrames > 0 ? SLOW_SHARE : 1
        const target = this.state === 'title' ? TITLE_SPEED : CRUISE_SPEED * this.stageSpeed() * slow
        const ease = this.baseSpeed < target ? RECOVER_EASE : 1
        this.baseSpeed += (target - this.baseSpeed) * ease
        const wanted = this.baseSpeed * (this.turbo ? TURBO_SPEED : this.edgar.wading ? WADE_SPEED : 1)
        this.speed += (wanted - this.speed) * 0.08
    }

    /** What Edgar stands on: the road, a rail or a wagon. */
    private updateFloor(): void {
        const edgar = this.edgar
        edgar.floor = 0
        edgar.rail = false
        for (const thing of this.things) {
            if (thing.z > PLAYER_Z || thing.z + thing.length < PLAYER_Z) {
                continue
            }
            if (thing.kind === 'rail') {
                this.onRail(thing)
            }
            if (thing.kind === 'wagon') {
                this.onWagon(thing)
            }
        }
    }

    /**
     * A rail is a floor for someone on top of it. Drifting into one from the
     * side is no stumble: the skates hop up onto it, which is what a skater
     * would do. Only its front end is an obstacle.
     */
    private onRail(rail: Thing): void {
        const edgar = this.edgar
        const across = Math.abs(rail.x - edgar.x)
        if (across <= 12 && edgar.y >= RAIL_TOP - 3) {
            edgar.floor = RAIL_TOP
            edgar.rail = true
            return
        }
        if (across <= RAIL_HOP_REACH && edgar.onGround && edgar.y < RAIL_TOP - 3 && this.state === 'run') {
            edgar.hop()
            this.sound.railHop()
        }
    }

    /**
     * The ramp carries Edgar up, the top is a floor, and the end drops him
     * back onto the road. Its side is a wall: a lane change into it bounces
     * him back to where he came from, without a stumble.
     */
    private onWagon(wagon: Thing): void {
        const edgar = this.edgar
        const along = PLAYER_Z - wagon.z
        const height = along < RAMP_LENGTH ? (WAGON_TOP * along) / RAMP_LENGTH : WAGON_TOP
        const across = Math.abs(wagon.x - edgar.x)
        // On it, or lifted onto it by a ramp that rises faster than a jump falls.
        if (across <= WAGON_RIDE) {
            edgar.floor = Math.max(edgar.floor, height)
            return
        }
        if (edgar.y >= height - WAGON_STEP) {
            return
        }
        const lane = laneOf(wagon)
        if (across < WAGON_HALF + EDGAR_HALF && edgar.lane === lane && this.state === 'run') {
            edgar.lane = lane + (edgar.x > wagon.x ? 1 : -1)
            this.bump()
        }
    }

    private bump(): void {
        this.shake = 4
        this.sound.bump()
    }

    /**
     * On a bridge, or beside one, the railing is in the way: on the road a
     * lane change across it bounces off. A jump clears it, into the water.
     */
    private railingAcross(delta: number): boolean {
        const edgar = this.edgar
        if (!edgar.onGround || edgar.floor > 0) {
            return false
        }
        for (const stream of this.things) {
            if (stream.kind !== 'stream' || stream.z - BRIDGE_MARGIN > PLAYER_Z || stream.z + stream.length + BRIDGE_MARGIN < PLAYER_Z) {
                continue
            }
            const bridge = laneOf(stream)
            if (edgar.lane === bridge || edgar.lane + delta === bridge) {
                return true
            }
        }
        return false
    }

    /** Over a stream and off its bridge, on the road: into the water, once per stream. */
    private updateWater(): void {
        const edgar = this.edgar
        edgar.wading = false
        for (const stream of this.things) {
            if (stream.kind !== 'stream' || stream.z > PLAYER_Z || stream.z + stream.length < PLAYER_Z) {
                continue
            }
            if (Math.abs(edgar.x - stream.x) <= BRIDGE_REACH || edgar.y > 2) {
                continue
            }
            // The turbo skims over the top; anything slower goes in.
            edgar.wading = !this.turbo
            if (this.frame % 3 === 0) {
                const point = this.edgarScreen()
                this.particles.burst(point.x, point.y - 4, 3, this.frame % 2 ? PAL.waterLight : PAL.water, 4, 3)
            }
            if (stream.soaked || this.turbo || this.ghost) {
                continue
            }
            stream.soaked = true
            const point = this.edgarScreen()
            this.particles.burst(point.x, point.y - 10, 16, PAL.waterLight, 6, 4)
            this.sound.splash()
            this.hit()
        }
    }

    private moveThings(): void {
        const edgar = this.edgar
        const magnet = this.power === 'magnet'

        for (const thing of this.things) {
            thing.prevZ = thing.z
            thing.z -= this.speed
            thing.timer++

            if (ANIMALS.has(thing.kind)) {
                this.moveAnimal(thing)
                if (!thing.heard && thing.z < PLAYER_Z + ANNOUNCE_Z && this.state === 'run') {
                    thing.heard = true
                    this.announce(thing)
                }
            }
            if (magnet && thing.kind === 'acorn' && thing.z < PLAYER_Z + MAGNET_RANGE && thing.z > PLAYER_Z - 10) {
                thing.pulled = true
            }
            if (thing.pulled) {
                thing.x += (edgar.x - thing.x) * 0.16
                thing.lift += (edgar.y + 18 - thing.lift) * 0.16
                thing.z -= (thing.z - PLAYER_Z) * 0.08
            }
            if (this.state === 'run' && !this.ghost && thing.prevZ > PLAYER_Z && thing.z <= PLAYER_Z) {
                this.resolve(thing)
            }
        }
        this.things = this.things.filter((thing) => !thing.gone && thing.z + thing.length > Z_NEAR * 0.6)
    }

    /** A chicken clucks and a mother duck quacks, once, as they come into reach. */
    private announce(thing: Thing): void {
        if (thing.kind === 'chicken') {
            this.sound.cluck()
        }
        if (thing.kind === 'duck') {
            this.sound.quack()
        }
        if (thing.kind === 'cow') {
            this.sound.moo()
        }
    }

    private moveAnimal(thing: Thing): void {
        thing.x += thing.kind === 'cow' ? thing.vx * this.speed : thing.vx
        if (thing.flap > 0) {
            thing.flap--
        }
        if (thing.kind !== 'chicken') {
            return
        }
        const leaving = Math.abs(thing.x) > ROAD_HALF - 6 && Math.sign(thing.x) === Math.sign(thing.vx)
        const changesMind = thing.timer % 70 === 0 && this.rng.chance(0.6)
        if (!leaving && !changesMind) {
            return
        }
        thing.vx = -Math.sign(thing.vx) * CHICKEN_SPEED
        thing.flap = 24
    }

    private resolve(thing: Thing): void {
        const edgar = this.edgar
        const half = (HALF_WIDTH[thing.kind] ?? 0) + EDGAR_HALF
        if (!HALF_WIDTH[thing.kind] || Math.abs(thing.x - edgar.x) > half) {
            return
        }

        if (thing.kind === 'acorn') {
            this.collect(thing)
            return
        }

        if (this.cleared(thing)) {
            return
        }

        if (thing.kind === 'mud') {
            if (!this.turbo) {
                this.splash()
                this.sound.splash()
            }
            return
        }

        if (this.turbo) {
            this.smash(thing)
            return
        }

        if (thing.kind === 'rail') {
            // Rolled into the end of a rail: up onto it, but not for free.
            edgar.vy = 3.2
            edgar.onGround = false
        }
        if (ANIMALS.has(thing.kind)) {
            this.scare(thing)
        }
        this.hit()
    }

    private cleared(thing: Thing): boolean {
        const edgar = this.edgar
        switch (thing.kind) {
            case 'hurdle':
                return edgar.y >= HURDLE_CLEAR
            case 'gate':
                return (edgar.duck > 0 && edgar.y < 4) || edgar.y >= GATE_CLEAR
            case 'hay':
            case 'cow':
                return edgar.y >= FULL_CLEAR
            case 'mud':
                return edgar.y >= MUD_CLEAR
            case 'rail':
                return edgar.y >= RAIL_TOP - 3
            case 'chicken':
            case 'duck':
            case 'duckling':
                return edgar.y >= ANIMAL_CLEAR
        }
        return true
    }

    private collect(thing: Thing): void {
        thing.gone = true
        this.acorns++
        this.jar++
        this.sound.acorn()
        const point = this.edgarScreen()
        this.particles.burst(point.x, point.y - 40, 5, PAL.acornLight, 3, 2)
        if (this.jar < JAR_SIZE) {
            return
        }
        this.jar = 0
        this.activate(this.next)
        const options = ABILITIES.filter((ability) => ability !== this.next && !(ability === 'helmet' && this.helmet))
        this.next = this.rng.pick(options)
    }

    private activate(ability: Ability): void {
        const names: Record<Ability, string> = { helmet: 'HELM!', cape: 'CAPE!', magnet: 'MAGNET!', turbo: 'TURBO!' }
        this.toast = names[ability]
        this.toastTimer = 80
        this.sound.ability(ability)
        const point = this.edgarScreen()
        this.particles.burst(point.x, point.y - 36, 16, PAL.spark, 5, 3)

        if (ability === 'helmet') {
            this.helmet = true
            return
        }
        const frames: Record<Ability, number> = { helmet: 0, cape: CAPE_FRAMES, magnet: MAGNET_FRAMES, turbo: TURBO_FRAMES }
        this.power = ability
        this.powerTimer = frames[ability]
    }

    private updateAbilities(): void {
        if (this.grace > 0) {
            this.grace--
        }
        if (this.toastTimer > 0) {
            this.toastTimer--
        }
        if (this.power) {
            this.powerTimer--
            if (this.powerTimer <= 0) {
                this.power = null
                // A moment of mercy when the turbo ends in front of an obstacle.
                this.grace = GRACE_FRAMES
            }
        }

        const point = this.edgarScreen()
        if (this.edgar.grinding && this.frame % 6 === 0) {
            this.sound.grind()
        }
        if (this.edgar.grinding && this.frame % 2 === 0) {
            this.particles.add({
                x: point.x + (Math.random() - 0.5) * 30,
                y: point.y - RAIL_TOP * 2,
                vx: (Math.random() - 0.5) * 3,
                vy: -Math.random() * 3,
                life: 12,
                color: Math.random() < 0.5 ? PAL.spark : PAL.helmet,
                size: 2,
            })
        }
        if (this.bello.threatening && this.frame % 24 === 0) {
            this.particles.add({ x: point.x + 22, y: point.y - 66, vx: 1.2, vy: -1.5, gravity: 0.2, life: 22, color: PAL.sky2, size: 3 })
        }
        if (this.turbo && this.frame % 3 === 0) {
            this.particles.add({
                x: point.x + (Math.random() - 0.5) * 40,
                y: point.y - Math.random() * 60,
                vy: 2,
                gravity: 0,
                life: 10,
                color: [PAL.rainbow1, PAL.rainbow2, PAL.rainbow3, PAL.rainbow4][this.frame % 4],
                size: 3,
            })
        }
    }

    private updateEffects(): void {
        if (this.shake > 0) {
            this.shake--
        }
        if (this.stageFlash > 0) {
            this.stageFlash--
        }
        if (this.muddy > 0) {
            this.muddy--
        }
        for (const splash of this.splashes) {
            splash.life--
            // Mud slides down the lens.
            splash.y += 0.12
        }
        this.splashes = this.splashes.filter((splash) => splash.life > 0)
    }

    private hit(): void {
        if (this.grace > 0 || this.edgar.stumble > 0) {
            return
        }
        if (this.helmet) {
            this.helmet = false
            this.grace = GRACE_FRAMES
            const point = this.edgarScreen()
            this.particles.add({
                x: point.x,
                y: point.y - 70,
                vx: 3,
                vy: -6,
                gravity: 0.3,
                life: 60,
                sprite: ART.helmetFlying[0],
                spin: ART.helmetFlying[1],
            })
            this.particles.burst(point.x, point.y - 66, 10, PAL.spark, 4, 2)
            this.shake = 6
            this.sound.bonk()
            return
        }
        this.stumble()
    }

    private stumble(): void {
        const point = this.edgarScreen()
        this.shake = 12
        this.edgar.trip()
        this.particles.burst(point.x, point.y - 60, 8, PAL.helmetLight, 4, 3)

        this.sound.stumble()
        this.sound.bark()
        if (this.bello.threatening) {
            this.state = 'caught'
            this.stateFrame = 0
            this.bello.catchUp()
            this.sound.caught()
            return
        }
        this.slowFrames = SLOW_FRAMES
        this.baseSpeed = CRUISE_SPEED * this.stageSpeed() * SLOW_SHARE
        this.speed = this.baseSpeed
        this.grace = GRACE_FRAMES
        this.bello.chase(this.edgar.x)
    }

    private scare(thing: Thing): void {
        thing.gone = true
        const point = this.projection.project(thing.x, PLAYER_Z)
        this.particles.burst(point.x, point.groundY - 20, 12, DEBRIS[thing.kind]?.[0] ?? PAL.white, 4, 3)
    }

    private smash(thing: Thing): void {
        if (thing.kind === 'rail') {
            return
        }
        thing.gone = true
        this.sound.smash()
        const point = this.projection.project(thing.x, PLAYER_Z)
        for (const color of DEBRIS[thing.kind] ?? [PAL.white]) {
            this.particles.burst(point.x, point.groundY - 30, 8, color, 7, 4)
        }
        this.shake = 4
    }

    /** Mud on the lens: part of the picture is hidden for a moment. Not a stumble. */
    private splash(): void {
        this.muddy = MUD_FRAMES
        const point = this.edgarScreen()
        this.particles.burst(point.x, point.y - 4, 14, PAL.mud, 5, 3)
        // Five big splats in a jittered quincunx over the road ahead: spread
        // out, never all in one corner, so the way ahead really is hidden.
        const top = view.horizon + 10
        const bottom = view.feetY - 50
        const half = Math.min(view.w * 0.45, 190)
        // A tall portrait screen has more road to hide: the splats grow with it.
        const size = Math.max(46, (bottom - top) * 0.22)
        const spots = [
            [-0.5, 0.12],
            [0.5, 0.12],
            [0, 0.5],
            [-0.5, 0.88],
            [0.5, 0.88],
        ]
        for (const [across, down] of spots) {
            this.splashes.push({
                x: view.w / 2 + (across + (Math.random() - 0.5) * 0.25) * half,
                y: top + (down + (Math.random() - 0.5) * 0.15) * (bottom - top),
                r: size + Math.random() * 14,
                life: MUD_FRAMES - Math.floor(Math.random() * 25),
                seed: Math.random() * Math.PI * 2,
            })
        }
    }

    private finish(): void {
        this.state = 'over'
        this.stateFrame = 0
        if (this.metres > this.best) {
            this.best = this.metres
            this.newBest = true
            saveBest(this.best)
            this.sound.record()
        }
    }

    /** Where Edgar's feet are on screen. */
    edgarScreen(): { x: number; y: number } {
        const point = this.projection.project(this.edgar.x, PLAYER_Z)
        return { x: point.x, y: point.groundY - this.edgar.y * point.scale }
    }
}

function laneOf(thing: Thing): number {
    return Math.round(thing.x / LANE_W) + 1
}

function loadBest(): number {
    try {
        return Number(localStorage.getItem(STORAGE_KEY) ?? 0) || 0
    } catch {
        return 0
    }
}

function saveBest(value: number): void {
    try {
        localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
        // Private mode or blocked storage: the record lasts for this session only.
    }
}
