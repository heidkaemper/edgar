/**
 * Kept small on purpose: a limited palette is what makes pixel art hold
 * together. The afternoon world; the other times of day are in `MOODS`.
 */
export const PAL = {
    // Sky and backdrop
    sky1: '#3f9ee0',
    sky2: '#6fc0ef',
    sky3: '#a8dcf4',
    sun: '#fff2ad',
    cloud: '#f4fbff',
    cloudDark: '#cfe8f7',
    hill: '#5f9e6a',
    hillDark: '#3f7a58',
    moon: '#f6f1d2',
    moonDark: '#cfc7a2',
    star: '#eef2ff',

    // Ground
    grass: '#7cc46b',
    grassAlt: '#69b25c',
    rumble: '#eceaf2',
    rumbleAlt: '#d34a4c',
    road: '#7e8093',
    roadAlt: '#74768a',
    line: '#f2f2f7',

    // Outline, never pure black
    ink: '#231a2e',
    white: '#f6f2ee',
    shade: '#cfc8d6',

    // Edgar
    pig: '#ef8ea6',
    pigLight: '#ffb6c7',
    pigDark: '#c66780',
    pigDeep: '#9e4a64',
    skate: '#e0574a',
    skateLight: '#ff8b74',
    wheel: '#f2a93b',
    wheelLight: '#ffe08a',
    eye: '#231a2e',

    // Abilities
    cape: '#cf4152',
    capeLight: '#f2707c',
    capeDark: '#8f2438',
    helmet: '#ffcf3a',
    helmetLight: '#fff0a0',
    helmetDark: '#d6912a',
    magnet: '#e04048',
    magnetDark: '#9c2630',
    steel: '#dfe3ee',
    steelDark: '#9aa0b4',
    spark: '#fff6c2',
    glass: '#d8f1f8',
    glassDark: '#8fc3d6',

    // Rainbow for the turbo, cycled over Edgar like a star
    rainbow1: '#ff6b6b',
    rainbow2: '#ffd23f',
    rainbow3: '#6bdc7a',
    rainbow4: '#5cb8ff',
    rainbow5: '#c58cff',

    // Bello
    dog: '#c98a4b',
    dogLight: '#e8b57a',
    dogDark: '#8a5530',
    dogEar: '#6a3d22',
    collar: '#d8343f',
    tongue: '#ff7f9a',
    tag: '#ffd23f',

    // Obstacles
    hazard: '#f6c53f',
    hazardDark: '#3a2c1c',
    post: '#b7bac7',
    postDark: '#80849a',
    barrier: '#df4b4b',
    hay: '#e9c35a',
    hayLight: '#f8e08f',
    hayDark: '#b48a2c',
    twine: '#a2532c',
    mud: '#7a5232',
    mudDark: '#563821',
    mudLight: '#a87a4c',
    rail: '#c9ccd8',
    railDark: '#7d8094',
    wagon: '#c2453a',
    wagonLight: '#e0675a',
    wagonDark: '#8a2b28',
    ramp: '#dca865',
    rampDark: '#a8743a',
    underside: '#3a2f3f',
    wagonWheel: '#6b4630',
    water: '#4fa3d9',
    waterLight: '#86cbef',
    waterDark: '#3a7fb4',
    bank: '#8a6a44',
    plank: '#c08a55',
    plankDark: '#8d5f36',

    // Animals
    feather: '#fbf7ee',
    featherDark: '#d9d0c4',
    comb: '#e2453c',
    beak: '#f5a531',
    duck: '#f4f1e8',
    duckDark: '#c9c2b5',
    duckling: '#ffd84a',
    ducklingDark: '#e0a92a',
    cow: '#f7f3ea',
    cowShade: '#d8d0c4',
    cowPatch: '#3d3542',
    muzzle: '#f4a9b6',
    horn: '#efe2c0',
    bell: '#ffcf3a',

    // Pickups and scenery
    acorn: '#cb8c4c',
    acornLight: '#e8b170',
    acornCap: '#77492a',
    leaf: '#59a75f',
    leafLight: '#7cc46b',
    leafDark: '#3c7c46',
    trunk: '#7a5236',
    lamp: '#ffe9a8',
    heart: '#ff5f7e',

    // HUD
    hud: '#fdfbf6',
    hudDim: '#2a2135',
} as const

export type PalKey = keyof typeof PAL

/** What the light changes over a run: the sky and the backdrop, and a tint over the rest. */
export interface Mood {
    /** Top, middle and horizon. */
    sky: [string, string, string]
    sun: string
    cloud: string
    cloudDark: string
    hill: string
    hillDark: string
    /** Multiplied over the whole world: warm by day, cool by night, never much darker. */
    tint: string
    /** 0 to 1: how many stars are out. */
    stars: number
}

export type MoodName = 'day' | 'dusk' | 'night' | 'dawn'

export const MOODS: Record<MoodName, Mood> = {
    day: {
        sky: [PAL.sky1, PAL.sky2, PAL.sky3],
        sun: PAL.sun,
        cloud: PAL.cloud,
        cloudDark: PAL.cloudDark,
        hill: PAL.hill,
        hillDark: PAL.hillDark,
        tint: '#fff7ec',
        stars: 0,
    },
    dusk: {
        sky: ['#4f4f9e', '#de7f95', '#ffb26a'],
        sun: '#ff7b3d',
        cloud: '#ffb89a',
        cloudDark: '#c56a86',
        hill: '#7a6380',
        hillDark: '#56456e',
        tint: '#ffe0c6',
        stars: 0.2,
    },
    night: {
        sky: ['#151c45', '#25326e', '#3f5294'],
        sun: '#ff7b3d',
        cloud: '#4d5a8c',
        cloudDark: '#39436f',
        hill: '#2f5262',
        hillDark: '#233d52',
        tint: '#d4deff',
        stars: 1,
    },
    dawn: {
        sky: ['#6f86cc', '#f2a9a8', '#ffdc9c'],
        sun: '#ffc46c',
        cloud: '#ffe4d8',
        cloudDark: '#e6a8b6',
        hill: '#5f8c7a',
        hillDark: '#466a62',
        tint: '#fff0e6',
        stars: 0.1,
    },
}

export function toRgb(hex: string): [number, number, number] {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

/** Both ends are `[r, g, b]`, so a mixed colour stays mixable. */
export function mix(from: readonly number[], to: readonly number[], t: number): [number, number, number] {
    return [
        Math.round(from[0] + (to[0] - from[0]) * t),
        Math.round(from[1] + (to[1] - from[1]) * t),
        Math.round(from[2] + (to[2] - from[2]) * t),
    ]
}

/**
 * An opaque pixel as `ImageData` stores it on a little-endian machine: ABGR.
 * Kept as a signed 32-bit number: unsigned, every one is above 2^31, and V8
 * then boxes it on the heap at each use, hundreds of times a frame.
 */
export function pixel(rgb: readonly number[]): number {
    return (255 << 24) | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]
}

export function css(rgb: readonly number[]): string {
    return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
}
