import type { ColorMap } from '../Sprites'
import { overlay } from '../Sprites'
import { outlined } from './Outline'

/**
 * The animals that cross the road, drawn from the side and facing right; the
 * left-walking ones are mirrored when baked.
 */
export const CHICKEN_MAP: ColorMap = {
    o: 'ink',
    f: 'feather',
    F: 'featherDark',
    r: 'comb',
    b: 'beak',
    e: 'eye',
}

const CHICKEN_BODY = [
    '..........rr....',
    '.........rrr....',
    '.........ffff...',
    '........ffeffbb.',
    '........ffffbb..',
    '.........ffr....',
    'ff.......fff....',
    'fff....fffff....',
    'ffff.ffffffff...',
    '.fffffffffffff..',
    '.ffffffffffffff.',
    '..fffffffffff...',
    '...fffffffff....',
    '.....fffffff....',
]

const WING_DOWN = ['FFFF.', 'FFFFF', '.FFF.']
const WING_UP = ['F....', 'FF...', 'FFF..', 'FFFF.', '.FFFF']

const CHICKEN_LEGS_A = ['......b...b.....', '......b...b.....', '.....bb..bb.....']
const CHICKEN_LEGS_B = ['.......b.b......', '.......b.b......', '......bbbb......']

function chicken(wing: string[], wingY: number, legs: string[]): string[] {
    return outlined([...overlay(CHICKEN_BODY, wing, 5, wingY), ...legs])
}

/** Walk, walk, then a flustered flap when it changes its mind. */
export const CHICKEN_WALK = [
    chicken(WING_DOWN, 9, CHICKEN_LEGS_A),
    chicken(WING_DOWN, 9, CHICKEN_LEGS_B),
]
export const CHICKEN_FLAP = [
    chicken(WING_UP, 5, CHICKEN_LEGS_A),
    chicken(WING_DOWN, 9, CHICKEN_LEGS_B),
]

export const DUCK_MAP: ColorMap = {
    o: 'ink',
    d: 'duck',
    D: 'duckDark',
    b: 'beak',
    e: 'eye',
    y: 'duckling',
    Y: 'ducklingDark',
}

const DUCK_BODY = [
    '...........ddd....',
    '..........ddddd...',
    '..........ddedbb..',
    '..........ddddbbb.',
    '...........dddd...',
    '...........ddd....',
    'd..........ddd....',
    'dd.......ddddd....',
    'ddddddddddddddd...',
    '.ddddDDDDdddddd...',
    '.dddddDDDDddddd...',
    '..dddddddddddd....',
    '....dddddddddd....',
]

/** A waddle: the body rocks a pixel while the feet alternate. */
export const DUCK_WALK = [
    outlined([...DUCK_BODY, '......bb...b......', '.....bb...bb......']),
    outlined(['', ...DUCK_BODY.slice(0, -1), '....ddddddddd.....', '......b...bb......']),
]

const DUCKLING_BODY = ['....yyy..', '...yyeyb.', '....yyybb', 'y..yyy...', 'yyyyyyy..', '.yyYYyy..', '..yyyyy..']

export const DUCKLING_WALK = [
    outlined([...DUCKLING_BODY, '...b.b...']),
    outlined(['', ...DUCKLING_BODY.slice(0, -1), '..yyyyy..', '...bb....']),
]

export const COW_MAP: ColorMap = {
    o: 'ink',
    c: 'cow',
    C: 'cowShade',
    p: 'cowPatch',
    m: 'muzzle',
    h: 'horn',
    e: 'eye',
    b: 'bell',
}

/** Big and slow: a full obstacle like the hay, but one that walks into its lane. */
const COW_BODY = [
    '.......................................h......h',
    '........................................h....h',
    '........................................h....h',
    '........................................cccccc',
    '.......................................cccccccc',
    '....................................CCCcccccccc',
    '....................................CCCcccceccc',
    '....................................ccccccceccc',
    '........ccccccccpccccccccccccccccpccccccccccccc',
    '...cc.cccccccpppppppccccccccccccpppcccccccccccc',
    '...cc.cccccpppppppppppcccccccccpppppcccccccmmmmm',
    '..cc.ccccccpppppppppppccccccccccpppcccccccmmmmmmm',
    '..cc.cccccpppppppppppppccccccccccpccccccccmmCmmCm',
    '..cc.ccccccpppppppppppccccccccccccccccccc.mmmmmmm',
    '..cccccccccpppppppppppccccccpcccccccccccc.mmmmmmm',
    '..cc.ccccccccpppppppcccccpppppppccccccccc..mmmmm',
    '..cc.cccccccccccpcccccccpppppppppcccccccc',
    '..cc.ccccccccccccccccccpppppppppppcccbbc',
    '.ppp..ccccccccccccccccccpppppppppccccbb',
    '.ppp..cccccccccccccccccccpppppppccccccc',
    '.ppp....ccccccccccccccccccccpcccccccc',
    '........ccCCCCCCCCCCCCCCCCCCCCCCCCCcc',
]

/** Two steps: the legs move in diagonal pairs, the body stays put. */
export const COW_WALK = [
    outlined([
        ...COW_BODY,
        '.........cCCCCCCCCCCCCCCCCCCCCCCCCCcc',
        '.........ccc...ccc...........ccc..ccc',
        '.........ccc...ccc...........ccc..ccc',
        '.........ccc...ccc...........ccc..ccc',
        '.........ccc...ccc...........ccc..ccc',
        '.........ccc...ccc...........ccc..ccc',
        '.........ccc...ccc...........ccc..ccc',
        '.........ppp...ppp...........ppp..ppp',
        '.........ppp...ppp...........ppp..ppp',
    ]),
    outlined([
        ...COW_BODY,
        '..........CCCCCCCCCCCCCCCCCCCCCCCCCccc',
        '..........ccc.ccc...........ccc....ccc',
        '..........ccc.ccc...........ccc....ccc',
        '..........ccc.ccc...........ccc....ccc',
        '..........ccc.ccc...........ccc....ccc',
        '..........ccc.ccc...........ccc....ccc',
        '..........ccc.ccc...........ccc....ccc',
        '..........ppp.ppp...........ppp....ppp',
        '..........ppp.ppp...........ppp....ppp',
    ]),
]
