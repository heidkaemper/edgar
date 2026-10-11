import type { Action, Controls } from './Controls'
import { CONTROLS } from './Controls'

/** View pixels a finger has to travel before a press becomes a swipe. */
const SWIPE_DISTANCE = 18
const SWIPE_MS = 320
const TAP_MS = 260
const STICK_THRESHOLD = 0.55

/**
 * An action and the device it came from: a half of the keyboard or a pad, by
 * the name the screen gives it. `null` for a finger or a key that is no one's.
 */
export interface Command {
    action: Action
    device: string | null
}

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

    private queue: Command[] = []
    private held = new Set<string>()
    private presses = new Map<number, Press>()
    private padHeld = new Set<string>()
    private tapZones: ((x: number, y: number) => Action | null) | null = null
    private started = false

    /** Taps are read through this; the game decides what a tap in a spot means. */
    setTapZones(zones: (x: number, y: number) => Action | null): void {
        this.tapZones = zones
    }

    take(): Command[] {
        const actions = this.queue
        this.queue = []
        return actions
    }

    /** Jump is held on that device, or on any for `null`: with the cape, that is a glide. */
    jumpHeld(device: string | null): boolean {
        for (const code of this.held) {
            if (this.controls.keys[code] === 'jump' && this.owns(device, this.groupOf(code))) {
                return true
            }
        }
        if (this.presses.size > 0 && device === null) {
            return true
        }
        for (const held of this.padHeld) {
            const [pad, key] = held.split(':')
            if ((key === 'jump' || key === 'up') && this.owns(device, pad)) {
                return true
            }
        }
        return false
    }

    keyDown(code: string): void {
        this.first()
        this.touchMode = false
        this.held.add(code)
        const action = this.controls.keys[code]
        if (action) {
            this.queue.push({ action, device: this.groupOf(code) })
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
            this.queue.push({ action: dx > 0 ? 'right' : 'left', device: null })
            return
        }
        this.queue.push({ action: dy < 0 ? 'jump' : 'duck', device: null })
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
            this.queue.push({ action, device: null })
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
            // Two players may hold the same button, so held buttons are kept apart by pad.
            const name = `${this.controls.padName} ${pad.index + 1}`
            const hold = (key: string): void => {
                now.add(`${name}:${key}`)
            }
            for (const action of Object.keys(this.controls.pad) as Action[]) {
                if (this.controls.pad[action].some((index) => pad.buttons[index]?.pressed)) {
                    hold(action)
                }
            }
            const [stickX = 0, stickY = 0] = pad.axes
            if (stickX < -STICK_THRESHOLD) {
                hold('left')
            }
            if (stickX > STICK_THRESHOLD) {
                hold('right')
            }
            if (stickY < -STICK_THRESHOLD) {
                hold('up')
            }
            if (stickY > STICK_THRESHOLD) {
                hold('down')
            }
        }

        const aliases: Record<string, Action> = { up: 'jump', down: 'duck' }
        for (const held of now) {
            if (this.padHeld.has(held)) {
                continue
            }
            this.first()
            this.touchMode = false
            const [pad, key] = held.split(':')
            this.queue.push({ action: aliases[key] ?? (key as Action), device: pad })
        }
        this.padHeld = now
    }

    private groupOf(code: string): string | null {
        return this.controls.groups[code] ?? null
    }

    /** Asking for `null` means any device; a key that is no one's steers no one of two. */
    private owns(asked: string | null, device: string | null): boolean {
        return asked === null || asked === device
    }

    private first(): void {
        if (this.started) {
            return
        }
        this.started = true
        this.onFirstInput?.()
    }
}
