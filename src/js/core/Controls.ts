/**
 * Which button does what, and what it is called on screen. Nothing else in the
 * game names a key: a platform binding hands `Input` a set of these, and a
 * host that disagrees brings its own set along.
 */
export type Action = 'left' | 'right' | 'jump' | 'duck' | 'pause' | 'confirm'

export interface Controls {
    keys: Record<string, Action>
    /** Which half of a shared keyboard a key is, by the name the screen gives it; a key left out is no one's. */
    groups: Record<string, string>
    /** Indices in the standard gamepad mapping, one list per action. */
    pad: Record<Action, number[]>
    /** One line on the title screen, in the host's own words. */
    hint: string
    /** A pad is called this, followed by its number. */
    padName: string
}

/** Keyboard first, an Xbox pad on the same roles: A jumps, B ducks. */
export const CONTROLS: Controls = {
    keys: {
        ArrowLeft: 'left',
        KeyA: 'left',
        ArrowRight: 'right',
        KeyD: 'right',
        ArrowUp: 'jump',
        KeyW: 'jump',
        Space: 'jump',
        ArrowDown: 'duck',
        KeyS: 'duck',
        Escape: 'pause',
        KeyP: 'pause',
        Enter: 'confirm',
    },
    groups: {
        KeyA: 'WASD',
        KeyD: 'WASD',
        KeyW: 'WASD',
        KeyS: 'WASD',
        ArrowLeft: 'PFEILTASTEN',
        ArrowRight: 'PFEILTASTEN',
        ArrowUp: 'PFEILTASTEN',
        ArrowDown: 'PFEILTASTEN',
    },
    pad: {
        left: [14],
        right: [15],
        jump: [0, 3, 12],
        duck: [1, 2, 13],
        pause: [8, 9],
        confirm: [],
    },
    hint: 'PFEILTASTEN ODER WISCHEN',
    padName: 'CONTROLLER',
}
