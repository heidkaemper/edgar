import type { Controls } from '@game/core/Controls'
import { CONTROLS } from '@game/core/Controls'
import type { Input, Pad } from '@game/core/Input'

/**
 * The slice of nx.js the game touches. Its globals collide with the DOM types
 * the rest of the code is written against, so the few that are needed are
 * named here rather than swapped in wholesale.
 */
interface NxScreen {
    readonly width: number
    readonly height: number
    getContext(id: '2d'): CanvasRenderingContext2D
    addEventListener(type: 'touchstart' | 'touchmove' | 'touchend', listener: (event: TouchEvent) => void): void
}

/** nx.js draws onto the screen canvas; there is no document to look one up in. */
export const nxScreen = screen as unknown as NxScreen

/**
 * A Nintendo pad puts A on the right, where an Xbox pad has B. The standard
 * mapping counts by position, so index 1 is A here: A jumps, B ducks.
 */
const SWITCH_CONTROLS: Controls = {
    keys: CONTROLS.keys,
    groups: CONTROLS.groups,
    pad: {
        left: [14],
        right: [15],
        jump: [1, 3, 12],
        duck: [0, 2, 13],
        pause: [8, 9],
        confirm: [],
    },
    hint: 'A SPRINGEN  B DUCKEN',
    padName: CONTROLS.padName,
}

interface NxGamepad extends Pad {
    readonly styleSet: number
}

const JOY_CON_LEFT = 0x8
const JOY_CON_RIGHT = 0x10
const DIRECTIONS = [12, 13, 14, 15]

/**
 * Where B, A, Y and X are once a lone Joy-Con lies on its side, by the raw
 * index that sits there: the left one turned anticlockwise, the right one clockwise.
 */
const SIDEWAYS_FACE: Record<number, number[]> = {
    [JOY_CON_LEFT]: [14, 13, 12, 15],
    [JOY_CON_RIGHT]: [1, 3, 0, 2],
}

/**
 * The console reports a lone Joy-Con as if held upright, whatever the HOME
 * menu was told, and nx.js cannot ask otherwise. Alone, it is held sideways,
 * so its stick and buttons are turned here.
 */
function sideways(pad: NxGamepad): Pad {
    const face = SIDEWAYS_FACE[pad.styleSet]
    if (!face) {
        return pad
    }
    const buttons = pad.buttons.map((button, index) => ({ pressed: !DIRECTIONS.includes(index) && button.pressed }))
    face.forEach((raw, index) => {
        buttons[index] = { pressed: pad.buttons[raw]?.pressed ?? false }
    })

    const [leftX = 0, leftY = 0, rightX = 0, rightY = 0] = pad.axes
    const axes = pad.styleSet === JOY_CON_LEFT ? [leftY, -leftX] : [-rightY, rightX]
    return { index: pad.index, buttons, axes }
}

function readSwitchPads(): (Pad | null)[] {
    return (navigator.getGamepads() as unknown as (NxGamepad | null)[]).map((pad) => (pad ? sideways(pad) : null))
}

/**
 * Touches reach the game in handheld mode only, keys from a USB keyboard if
 * one is plugged in, and the pad through the Gamepad API, which `Input` polls.
 */
export function bindSwitchInput(input: Input, scale: number): void {
    input.controls = SWITCH_CONTROLS
    input.readPads = readSwitchPads

    // nx.js quits the app on `+` unless the event is cancelled, which looks
    // exactly like a crash. Here it is the pause button; home is how you leave.
    addEventListener('beforeunload', (event) => event.preventDefault())

    addEventListener('keydown', (event) => {
        if (event.repeat) {
            return
        }
        input.keyDown(event.code)
    })
    addEventListener('keyup', (event) => input.keyUp(event.code))

    const each = (event: TouchEvent, handle: (id: number, x: number, y: number) => void): void => {
        for (let index = 0; index < event.changedTouches.length; index++) {
            const touch = event.changedTouches[index]
            handle(touch.identifier, touch.clientX / scale, touch.clientY / scale)
        }
    }

    nxScreen.addEventListener('touchstart', (event) => each(event, (id, x, y) => input.pressDown(id, x, y)))
    nxScreen.addEventListener('touchmove', (event) => each(event, (id, x, y) => input.pressMove(id, x, y)))
    nxScreen.addEventListener('touchend', (event) => {
        each(event, (id, x, y) => input.pressUp(id, x, y))
        if (event.touches.length === 0) {
            input.releaseAllPresses()
        }
    })
}
