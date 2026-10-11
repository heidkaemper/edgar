import { CRUISE_SPEED, MUSIC_BPM, MUSIC_BPM_CALM, MUSIC_BPM_MAX, MUSIC_CURVE, STAGE_BASE, STORAGE_KEY } from '../config'
import type { Sound } from '../audio/Sound'
import { prewarm } from '../render/Art'
import { Hud } from '../render/Hud'
import { PAL } from '../render/Palette'
import type { Surface } from '../render/Surface'
import { createSurface } from '../render/Surface'
import { layoutView, view } from '../track/View'
import { Screens } from '../ui/Screens'
import type { Command, Input } from './Input'
import { randomSeed } from './Rng'
import { Runner } from './Runner'

export type State = 'title' | 'lobby' | 'run' | 'paused' | 'over'

const TOUCH_HINT = 'WISCHEN: LINKS RECHTS HOCH RUNTER'
/** How long each half names its controls at the start of a race. */
const SEAT_HINT_FRAMES = 180
/** How long both players see their Edgar side by side before the race sets off. */
const READY_FRAMES = 50

/**
 * The menu, pause and the end around one runner, or two side by side. Each
 * player's commands go to his own runner; the road and its speed are theirs
 * alike, so the one who lasts longer wins.
 */
export class Game {
    state: State = 'title'
    frame = 0
    stateFrame = 0
    /** One or two players, as picked on the title. */
    players = 1
    /** The entry the title's cursor is on: one player or two. */
    choice = 0
    /** The entry the pause menu's cursor is on: go on, or back to the title. */
    pauseChoice = 0
    best = 0
    newBest = false
    /** How far a race got before Bello caught someone: the same road for both. */
    raceMetres = 0
    /** What each player steers with, left first: claimed in the lobby, in the order they press. */
    devices: string[] = []

    readonly runners: Runner[]
    private readonly hud = new Hud()
    private readonly screens = new Screens()
    /** The second half's road is drawn here and copied across. */
    private aside: { canvas: Surface; ctx: CanvasRenderingContext2D } | null = null

    /** A host whose playfield cannot grow hands over a new one when a race changes its size. */
    ctx: CanvasRenderingContext2D

    constructor(
        ctx: CanvasRenderingContext2D,
        private readonly input: Input,
        private readonly sound: Sound,
    ) {
        this.ctx = ctx
        this.runners = [new Runner(sound), new Runner(sound)]
        this.best = loadBest()
        this.input.setTapZones((x, y) => this.tapAction(x, y))
    }

    /** The runners in play: the first alone, or both. */
    get active(): Runner[] {
        return this.runners.slice(0, this.players)
    }

    /** Whose road the shared sky follows: a player still running, or the one who got furthest. */
    get lead(): Runner {
        const running = this.active.find((runner) => runner.state === 'run')
        return running ?? this.active.reduce((best, runner) => (runner.travel > best.travel ? runner : best))
    }

    /** Whether a finger was the last thing used: then there is no cursor, only things to tap. */
    get touch(): boolean {
        return this.input.touchMode
    }

    /** A race for two needs a key or a pad for each; a touch screen has neither. */
    get canRace(): boolean {
        return !this.touch
    }

    /** Both halves roll on empty until a key or a pad claims each, the first one the left. */
    lobby(seed = randomSeed()): void {
        this.players = 2
        this.devices = []
        layoutView(view.aspect, 2)
        for (const runner of this.runners) {
            runner.idle(seed)
            runner.present = false
        }
        this.state = 'lobby'
        this.stateFrame = 0
    }

    start(players: number, seed = randomSeed()): void {
        this.players = players
        layoutView(view.aspect, players)
        this.active.forEach((runner, seat) => runner.start(seed, players > 1, seat))
        this.state = 'run'
        this.stateFrame = 0
        this.newBest = false
        this.raceMetres = 0
        this.sound.start()
    }

    update(): void {
        this.frame++
        this.stateFrame++
        this.input.poll()
        const commands = this.input.take()
        this.updateMusic()
        // Plenty of time on the title screen; a trickle once a run is on.
        prewarm(this.state === 'run' ? 2 : 24)

        if (this.state === 'paused') {
            this.pauseMenu(commands)
            return
        }

        // The key that starts a run must not also steer or pause it.
        const state = this.state
        if (state === 'title') {
            this.choose(commands)
        }
        if (state === 'lobby') {
            this.join(commands)
        }
        if (state === 'over') {
            this.again(commands)
        }
        if (state === 'run') {
            this.steer(commands)
        }

        this.advance()
    }

    /**
     * One sky over everything, then each player's road in its own half, the
     * light of the hour over all of it, and the HUDs on top.
     */
    render(): void {
        const ctx = this.ctx
        const race = this.players > 1
        this.lead.renderSky(ctx, !race)

        this.active.forEach((runner, pane) => {
            if (pane === 0) {
                // Drawn in place, so nothing standing at its edge may reach into the next half's sky.
                ctx.save()
                ctx.beginPath()
                ctx.rect(0, 0, view.w, view.h)
                ctx.clip()
                runner.renderRoad(ctx)
                ctx.restore()
                return
            }
            // The ground is put, not drawn, and ignores any offset: this half is drawn aside and copied over.
            const aside = this.asideFor()
            aside.ctx.clearRect(0, 0, view.w, view.h)
            runner.renderRoad(aside.ctx)
            ctx.drawImage(aside.canvas, pane * view.w, 0)
        })
        this.lead.light.grade(ctx)

        if (race) {
            ctx.fillStyle = PAL.ink
            ctx.fillRect(view.w - 1, 0, 2, view.h)
        }
        const touch = this.input.touchMode && !race
        this.active.forEach((runner, pane) => {
            ctx.setTransform(1, 0, 0, 1, pane * view.w, 0)
            if (this.state === 'run' || this.state === 'paused') {
                this.hud.draw(ctx, runner, touch)
            }
            if (this.state === 'lobby') {
                this.screens.join(ctx, this, pane)
            }
            if (race && this.state === 'run' && this.stateFrame < SEAT_HINT_FRAMES) {
                this.screens.seat(ctx, this.devices[pane])
            }
        })
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        this.screens.draw(ctx, this, this.input.touchMode ? TOUCH_HINT : this.input.controls.hint)
    }

    /** Development only: shortcuts that make every state reachable at once. */
    debug(): Record<string, (...args: never[]) => unknown> {
        return {
            ...this.runners[0].debug(),
            warp: (frames: number) => this.active.forEach((runner) => runner.debug().warp(frames as never)),
            metres: (metres: number) => this.active.forEach((runner) => runner.debug().metres(metres as never)),
            ghost: () => this.active.forEach((runner) => runner.debug().ghost()),
            start: (seed?: number, players = 1) => {
                this.devices = [...new Set(Object.values(this.input.controls.groups))]
                this.start(players, seed)
            },
            state: () => this,
        }
    }

    /** Left and right move the cursor; anything else sets off with what it is on. */
    private choose(commands: Command[]): void {
        for (const { action } of commands) {
            if ((action === 'left' || action === 'right') && this.canRace) {
                this.choice = action === 'left' ? 0 : 1
                this.sound.swish()
                continue
            }
            if (action !== 'left' && action !== 'right') {
                if (this.canRace && this.choice === 1) {
                    this.lobby()
                    return
                }
                this.start(1)
                return
            }
        }
    }

    /** A device that has not joined yet takes the next free half; pause goes back to the menu. */
    private join(commands: Command[]): void {
        for (const { action, device } of commands) {
            if (action === 'pause') {
                this.toTitle()
                return
            }
            if (device === null || this.devices.includes(device) || this.devices.length === this.players) {
                continue
            }
            this.runners[this.devices.length].present = true
            this.devices.push(device)
            this.stateFrame = 0
            this.sound.swish()
        }
        if (this.devices.length === this.players && this.stateFrame > READY_FRAMES) {
            this.start(this.players)
        }
    }

    /** Left and right move the cursor, pause goes on at once; anything else picks what the cursor is on. */
    private pauseMenu(commands: Command[]): void {
        for (const { action } of commands) {
            if (action === 'left' || action === 'right') {
                this.pauseChoice = action === 'left' ? 0 : 1
                this.sound.swish()
                continue
            }
            this.sound.pause()
            if (action === 'pause' || this.pauseChoice === 0) {
                this.state = 'run'
                return
            }
            this.toTitle()
            return
        }
    }

    /** The same race once more, or back to the title with the pause button. */
    private again(commands: Command[]): void {
        if (this.stateFrame <= 45) {
            return
        }
        if (commands.some(({ action }) => action === 'pause')) {
            this.toTitle()
            return
        }
        if (commands.some(({ action }) => action !== 'left' && action !== 'right')) {
            this.start(this.players)
        }
    }

    /** Alone, every key steers Edgar; in a race each device steers the Edgar it claimed. */
    private steer(commands: Command[]): void {
        for (const { action, device } of commands) {
            if (action === 'pause' || action === 'confirm') {
                if (this.active.some((runner) => runner.state === 'run')) {
                    this.state = 'paused'
                    this.pauseChoice = 0
                    this.sound.pause()
                }
                return
            }
            const runner = this.players === 1 ? this.runners[0] : device === null ? undefined : this.active[this.devices.indexOf(device)]
            if (runner?.state === 'run') {
                runner.act(action)
            }
        }
    }

    private advance(): void {
        const voice = this.active.find((runner) => runner.state === 'run') ?? this.runners[0]
        this.active.forEach((runner, seat) => {
            runner.announces = runner === voice
            runner.update(this.input.jumpHeld(this.players === 1 ? null : this.devices[seat]))
        })
        // In a race both roads step up together; one whoosh is enough.
        if (this.active.some((runner) => runner.steppedUp)) {
            this.sound.faster()
        }
        this.endRace()
        if (this.state === 'run' && this.active.every((runner) => runner.state === 'over' || runner.state === 'done')) {
            this.finish()
        }
    }

    /** The first one Bello catches loses, and the race stops for everyone at once. */
    private endRace(): void {
        const caught = this.active.find((runner) => runner.state === 'caught')
        // Zero until the first catch; both caught at once is a draw, and its distance counts too.
        if (this.players === 1 || !caught || this.raceMetres > 0) {
            return
        }
        this.raceMetres = caught.metres
        for (const runner of this.active) {
            if (runner.state === 'run') {
                runner.halt()
            }
        }
    }

    /** The one still on his skates when the race ended, or none for a draw. */
    get winner(): number {
        return this.active.findIndex((runner) => runner.state === 'done')
    }

    private finish(): void {
        this.state = 'over'
        this.stateFrame = 0
        const metres = this.runners[0].metres
        // A race goes at its own pace and sets no record for running alone.
        if (this.players > 1 || metres <= this.best) {
            return
        }
        this.best = metres
        this.newBest = true
        saveBest(this.best)
        this.sound.record()
    }

    private toTitle(): void {
        this.players = 1
        this.devices = []
        layoutView(view.aspect, 1)
        this.runners[0].idle()
        this.state = 'title'
        this.stateFrame = 0
    }

    /** Calm on the title and the end, driven by the speed of the road while anyone runs. */
    private updateMusic(): void {
        const running = this.active.filter((runner) => runner.state === 'run')
        if (this.state === 'run' && running.length > 0) {
            const speed = Math.max(...running.map((runner) => runner.speed))
            const stage = Math.max(...running.map((runner) => runner.stage))
            const ratio = speed / (CRUISE_SPEED * STAGE_BASE)
            const bpm = Math.min(MUSIC_BPM_MAX, MUSIC_BPM * Math.pow(Math.max(0.5, ratio), MUSIC_CURVE))
            this.sound.setMusic('run', bpm, Math.min(1, stage / 10))
        }
        if (this.state === 'title' || this.state === 'lobby' || (this.state === 'over' && this.stateFrame > 90)) {
            this.sound.setMusic('calm', MUSIC_BPM_CALM, 0)
        }
        const caught = this.state === 'run' && running.length === 0
        if (this.state === 'paused' || caught || (this.state === 'over' && this.stateFrame <= 90)) {
            this.sound.setMusic('off', MUSIC_BPM_CALM, 0)
        }
        this.sound.tick()
    }

    /**
     * In a run only the pause button answers a tap, in the pause only its entries; steering is by swiping, so
     * a short, slow swipe can never turn into an accidental lane change.
     */
    private tapAction(x: number, y: number): 'pause' | 'confirm' | null {
        if (this.state === 'paused') {
            // A tap on an entry points the cursor at it and picks it; one beside them means nothing.
            const entry = this.screens.entryAt(x, y)
            if (entry < 0) {
                return null
            }
            this.pauseChoice = entry
            return 'confirm'
        }
        if (this.state !== 'run') {
            return 'confirm'
        }
        return this.hud.hitsPause(x, y) ? 'pause' : null
    }

    private asideFor(): { canvas: Surface; ctx: CanvasRenderingContext2D } {
        if (!this.aside || this.aside.canvas.width !== view.w || this.aside.canvas.height !== view.h) {
            this.aside = createSurface(view.w, view.h)
            this.aside.ctx.imageSmoothingEnabled = false
        }
        return this.aside
    }
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
