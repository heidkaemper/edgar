import type { Action, Controls } from './Controls'
import { CONTROLS } from './Controls'

/** View pixels a finger has to travel before a press becomes a swipe. */
const SWIPE_DISTANCE = 18
const SWIPE_MS = 320
const TAP_MS = 260
const STICK_THRESHOLD = 0.55

interface Press {
    x: number
    y: number
    time: number
    swiped: boolean
}

/**
 * Turns keys, swipes, taps and gamepad buttons into actions. A platform
 * binding feeds it raw events; it knows nothing about where they came from.
 */
export class Input {
    controls: Controls = CONTROLS
    /**
     * Whether the last thing used was a finger. Only then is there an on-screen
     * pause button; keys and pads have their own.
     */
    touchMode = false
    /** Set by the platform; called once with the very first input. */
    onFirstInput: (() => void) | null = null

    private queue: Action[] = []
    private held = new Set<string>()
    private presses = new Map<number, Press>()
    private padHeld = new Set<string>()
    private tapZones: ((x: number, y: number) => Action | null) | null = null
    private started = false

    /** Taps are read through this; the game decides what a tap in a spot means. */
    setTapZones(zones: (x: number, y: number) => Action | null): void {
        this.tapZones = zones
    }

    take(): Action[] {
        const actions = this.queue
        this.queue = []
        return actions
    }

    /** Jump is held: with the cape, that is a glide. */
    jumpHeld(): boolean {
        for (const code of this.held) {
            if (this.controls.keys[code] === 'jump') {
                return true
            }
        }
        if (this.presses.size > 0) {
            return true
        }
        return [...this.padHeld].some((key) => key === 'jump' || key === 'up')
    }

    keyDown(code: string): void {
        this.first()
        this.touchMode = false
        this.held.add(code)
        const action = this.controls.keys[code]
        if (action) {
            this.queue.push(action)
        }
    }

    keyUp(code: string): void {
        this.held.delete(code)
    }

    clearKeys(): void {
        this.held.clear()
        this.presses.clear()
    }

    pressDown(id: number, x: number, y: number): void {
        this.first()
        this.touchMode = true
        this.presses.set(id, { x, y, time: performance.now(), swiped: false })
    }

    pressMove(id: number, x: number, y: number): void {
        const press = this.presses.get(id)
        if (!press || press.swiped) {
            return
        }
        const dx = x - press.x
        const dy = y - press.y
        if (Math.abs(dx) < SWIPE_DISTANCE && Math.abs(dy) < SWIPE_DISTANCE) {
            return
        }
        if (performance.now() - press.time > SWIPE_MS) {
            // Too slow to be a swipe: start measuring again from here.
            press.x = x
            press.y = y
            press.time = performance.now()
            return
        }
        press.swiped = true
        if (Math.abs(dx) > Math.abs(dy)) {
            this.queue.push(dx > 0 ? 'right' : 'left')
            return
        }
        this.queue.push(dy < 0 ? 'jump' : 'duck')
    }

    pressUp(id: number, x: number, y: number): void {
        const press = this.presses.get(id)
        this.presses.delete(id)
        if (!press || press.swiped || performance.now() - press.time > TAP_MS) {
            return
        }
        // Without zones a tap confirms; with them, a zone may also mean nothing.
        const action = this.tapZones ? this.tapZones(x, y) : 'confirm'
        if (action) {
            this.queue.push(action)
        }
    }

    releaseAllPresses(): void {
        this.presses.clear()
    }

    /** Called once per update; the Gamepad API has no events worth trusting. */
    poll(): void {
        const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []
        const now = new Set<string>()

        for (const pad of pads) {
            if (!pad) {
                continue
            }
            for (const action of Object.keys(this.controls.pad) as Action[]) {
                if (this.controls.pad[action].some((index) => pad.buttons[index]?.pressed)) {
                    now.add(action)
                }
            }
            const [stickX = 0, stickY = 0] = pad.axes
            if (stickX < -STICK_THRESHOLD) {
                now.add('left')
            }
            if (stickX > STICK_THRESHOLD) {
                now.add('right')
            }
            if (stickY < -STICK_THRESHOLD) {
                now.add('up')
            }
            if (stickY > STICK_THRESHOLD) {
                now.add('down')
            }
        }

        const aliases: Record<string, Action> = { up: 'jump', down: 'duck' }
        for (const key of now) {
            if (this.padHeld.has(key)) {
                continue
            }
            this.first()
            this.touchMode = false
            this.queue.push(aliases[key] ?? (key as Action))
        }
        this.padHeld = now
    }

    private first(): void {
        if (this.started) {
            return
        }
        this.started = true
        this.onFirstInput?.()
    }
}
