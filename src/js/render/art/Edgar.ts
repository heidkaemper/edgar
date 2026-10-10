import type { ColorMap } from '../Sprites'
import { mirrorRows, overlay, symmetric } from '../Sprites'
import { outlined, stack } from './Outline'

/**
 * Edgar from behind, because the camera is behind him: ears, curly tail and
 * the wheels of his skates. His face shows when he looks back at Bello and at
 * the end. 30 x 34 of shapes, 32 x 36 with the outline.
 */
export const EDGAR_MAP: ColorMap = {
    o: 'ink',
    P: 'pigLight',
    p: 'pig',
    d: 'pigDark',
    D: 'pigDeep',
    s: 'skate',
    S: 'skateLight',
    w: 'wheel',
    W: 'wheelLight',
    e: 'eye',
    h: 'white',
    H: 'heart',
}

/** The turbo cycles these over his body, like a star in a kart race. */
export const RAINBOW_MAPS: ColorMap[] = [
    { ...EDGAR_MAP, p: 'rainbow1', P: 'rainbow2', d: 'rainbow5' },
    { ...EDGAR_MAP, p: 'rainbow2', P: 'white', d: 'rainbow1' },
    { ...EDGAR_MAP, p: 'rainbow3', P: 'rainbow2', d: 'rainbow4' },
    { ...EDGAR_MAP, p: 'rainbow4', P: 'rainbow3', d: 'rainbow5' },
]

const HEAD_BACK = symmetric([
    'dd.............',
    'pPpp...........',
    '.pPppp.........',
    '.dpPppp...PPPPP',
    '..ddpppd.PPPPPP',
    '....ddpPPPPPPPP',
    '....ppPPPPPPPPP',
    '...pppppPPPPPPP',
    '...pppppppppPPP',
    '..ppppppppppppp',
    '..ppppppppppppp',
    '..ppppppppppppp',
    '...pppppppppppp',
    '...dppppppppppp',
    '....ddppppppppp',
    '......ddddddddd',
])

/** Over the right shoulder: an eye, a cheek and the snout in profile. */
const HEAD_LOOK = overlay(
    HEAD_BACK,
    [
        '.......pp.....',
        '......hep.....',
        '......eep..ddd',
        '.....Hppppdddd',
        '.....HHpppdDdd',
        '......ppppdddd',
        '.......DDppddd',
        '..........pp..',
    ],
    15,
    6,
)

const TORSO = symmetric([
    '.......pppppppp',
    '......ppppppppp',
    '......ppppppppp',
    '......ppppppppp',
    '......ppppppppp',
    '......ppppppppp',
    '......ppppppppp',
    '......dpppppppp',
    '......ddppppppp',
    '.......dddppppp',
    '........ddddddd',
    '..........ddddd',
])

const TAIL = ['.DDD.', 'D...D', 'D.DDD', 'D....', '.DD..']

const ARM_DOWN = ['.pp', 'ppp', 'ppp', 'ppp', 'ppp', 'dDD', '.DD']
const ARM_OUT = ['....pp', '.ppppp', 'DDpppp', 'DD....']

const LEGS_GLIDE = [
    '..........pppp..pppp..........',
    '..........dppp..pppd..........',
    '.........sssss..sssss.........',
    '.........sSSSs..sSSSs.........',
    '.........wwwww..wwwww.........',
    '..........wWw....wWw..........',
]

const LEGS_PUSH_LEFT = [
    '........ppp.....pppp..........',
    '.......pppd.....pppd..........',
    '......sssss.....sssss.........',
    '......sSSSs.....sSSSs.........',
    '......wwwww.....wwwww.........',
    '.......wWw.......wWw..........',
]

const LEGS_TUCK = [
    '..........pppp..pppp..........',
    '.........sssss..sssss.........',
    '.........sSSSs..sSSSs.........',
    '.........wwwww..wwwww.........',
    '..........wWw....wWw..........',
]

const LEGS_DUCK = [
    '........ppppp....ppppp........',
    '.......sssss......sssss.......',
    '.......sSSSs......sSSSs.......',
    '.......wwwww......wwwww.......',
]

const LEGS_SPLAY = [
    '.......pppp......pppp.........',
    '......pppd........dppp........',
    '....sssss..........sssss......',
    '....sSSSs..........sSSSs......',
    '....wwwww..........wwwww......',
    '.....wWw............wWw.......',
]

/** An arm and where it goes, relative to the top of the torso. */
type Arm = [string[], number, number]

const DOWN_LEFT = (y: number): Arm => [ARM_DOWN, 2, y]
const DOWN_RIGHT = (y: number): Arm => [mirrorRows(ARM_DOWN), 25, y]
const OUT_LEFT = (y: number): Arm => [ARM_OUT, 0, y]
const OUT_RIGHT = (y: number): Arm => [mirrorRows(ARM_OUT), 24, y]

function edgar(head: string[], torso: string[], legs: string[], arms: Arm[], bob = 0): string[] {
    let body = stack([head, 0], [torso, 0], [legs, 0])
    body = overlay(body, TAIL, 13, head.length + 4)
    for (const [rows, x, y] of arms) {
        body = overlay(body, rows, x, head.length + y)
    }
    return outlined(bob > 0 ? ['', ...body] : body)
}

const TORSO_DUCK = [TORSO[0], TORSO[1], TORSO[2], ...TORSO.slice(7)]

/** Skating: push left, glide, push right, glide. The glide sits a pixel lower. */
function skating(head: string[]): string[][] {
    return [
        edgar(head, TORSO, LEGS_PUSH_LEFT, [DOWN_LEFT(0), DOWN_RIGHT(2)]),
        edgar(head, TORSO, LEGS_GLIDE, [DOWN_LEFT(1), DOWN_RIGHT(1)], 1),
        edgar(head, TORSO, mirrorRows(LEGS_PUSH_LEFT), [DOWN_LEFT(2), DOWN_RIGHT(0)]),
        edgar(head, TORSO, LEGS_GLIDE, [DOWN_LEFT(1), DOWN_RIGHT(1)], 1),
    ]
}

export const EDGAR_SKATE = skating(HEAD_BACK)
export const EDGAR_LOOK = skating(HEAD_LOOK)
export const EDGAR_JUMP = edgar(HEAD_BACK, TORSO, LEGS_TUCK, [OUT_LEFT(-1), OUT_RIGHT(-1)])
export const EDGAR_FALL = edgar(HEAD_BACK, TORSO, LEGS_GLIDE, [OUT_LEFT(1), OUT_RIGHT(1)])
export const EDGAR_DUCK = edgar(HEAD_BACK, TORSO_DUCK, LEGS_DUCK, [OUT_LEFT(1), OUT_RIGHT(1)])
export const EDGAR_STUMBLE = [
    edgar(HEAD_LOOK, TORSO, LEGS_SPLAY, [OUT_LEFT(-3), DOWN_RIGHT(3)]),
    edgar(HEAD_BACK, TORSO, mirrorRows(LEGS_SPLAY), [DOWN_LEFT(3), OUT_RIGHT(-3)]),
]

/** Height of the head in rows, outline included: where hats and magnets sit. */
export const EDGAR_HEAD_ROWS = HEAD_BACK.length + 1

/** Edgar's face from the front: the end of a run. */
const FACE_FRONT = symmetric([
    '...pp..........',
    '..pPpp.........',
    '..pdPpp........',
    '..pddPpp..ppppp',
    '...pdPppppPPPPP',
    '....pppPPPPPPPP',
    '...pppPPPPPPPPP',
    '..pppppheePPPPP',
    '..pppppeeePPPPP',
    '..ppppppppppddd',
    '..pHHppppppdddd',
    '..pHHppppppdDdd',
    '..ppppppppppddd',
    '...pppppppppppp',
    '....ppppppppDDD',
    '......ddddddddd',
])

export const EDGAR_FACE = outlined(FACE_FRONT)

/** The app icon: the same face, rounder than the game's, which is squashed to fit his body. */
export const EDGAR_ICON = outlined([
    '..p..........................p',
    '..pp........................pp',
    '..pdpp....................ppdp',
    '..ppdpp..................ppdpp',
    '..ppddpp................ppddpp',
    '..ppddddppppppppppppPpppddddpp',
    '...pddddppppppppPPPPPPPPddddp',
    '...pddpppppppppPPPPPPPPPPPddp',
    '...pdpppppppppPPPPPPPPPPPPPdp',
    '...ppppppppppppPPPPPPPPPPPppp',
    '...pppppppppppppPPPPPPPPPpppp',
    '...pppppppppppppppppPpppppppp',
    '..pppppppehppppppppppehppppppp',
    '..pppppppeeppppppppppeeppppppp',
    '..pppppppeeppppppppppeeppppppp',
    '..ppppppppppppddddpppppppppppp',
    '..pppppppppddPPPPPPddppppppppp',
    '..ppppppppddPPPPPPPPddpppppppp',
    '..pppHHpppdPPPPPPPPPPdpppHHppp',
    '..pppHHppddPPDDPPDDPPddppHHppp',
    '...pppppppdPPDDPPDDPPdppppppp',
    '...pppppppddPPPPPPPPddppppppp',
    '....pppppppddddddddddppppppp',
    '.....pppppppppddddppppppppp',
    '......pppppppppppppppppppp',
    '........pppppppppppppppp',
    '..........pppppppppppp',
])

/** Sitting, facing the camera, a little dizzy and quite happy: the end. */
export const EDGAR_CAUGHT = outlined(
    stack(
        [
            FACE_FRONT,
            0,
        ],
        [
            symmetric([
                '.......pppppppp',
                '..pp..pppppPPPP',
                '.ppp..ppppPPPPP',
                '.ppp..ppppPPPPP',
                '.dDD..ppppPPPPP',
                '.DD...pppppPPPP',
                '......dpppppppp',
                '......ddppppppp',
            ]),
            0,
        ],
        [
            [
                '....sssss..............sssss',
                '...sSSSSSs............sSSSSSs',
                '...swWwWws............swWwWws',
                '...swwwwws............swwwwws',
                '....sssss..............sssss',
            ],
            0,
        ],
    ),
)
