import type { ColorMap } from '../Sprites'
import { mirrorRows, overlay, symmetric } from '../Sprites'
import { outlined, stack } from './Outline'

/**
 * Bello, the farm dog, seen from behind while he chases Edgar. A back view of
 * a dog is easy to misread, so he carries everything that makes one legible:
 * floppy ears flapping against the gallop, a wagging tail with a white tip, a
 * red collar and a tongue hanging out to one side.
 */
export const BELLO_MAP: ColorMap = {
    o: 'ink',
    g: 'dog',
    G: 'dogLight',
    k: 'dogDark',
    e: 'dogEar',
    c: 'collar',
    t: 'tongue',
    w: 'white',
    y: 'tag',
}

const HEAD_EARS_DOWN = symmetric([
    '.........gggg',
    '........Ggggg',
    '....ee.Gggggg',
    '...eeeegggggg',
    '...eeeegggggg',
    '..eeeeegggggg',
    '..eeeeekggggg',
    '..eeeee.kgggg',
    '..eeee..kkggg',
    '...eee.cccccc',
    '....e..cccccc',
])

const HEAD_EARS_UP = symmetric([
    '.ee......gggg',
    '.eeee...Ggggg',
    '..eeee.Gggggg',
    '...eeeegggggg',
    '....eeegggggg',
    '......kgggggg',
    '......kgggggg',
    '.......kggggg',
    '........kkggg',
    '.......cccccc',
    '.......cccccc',
])

const BODY = symmetric([
    '......gggggkk',
    '.....ggggkkkk',
    '.....gggkkkkk',
    '....ggggkkkkk',
    '....gggggkkkk',
    '...gggggggkkk',
    '...gggggggggg',
    '..ggggggggggg',
    '..ggggggggggg',
    '..kgggggggggg',
    '...kkgggggg..',
])

const LEGS_STRIDE = symmetric([
    '..gggggg.....',
    '...ggggg.....',
    '....gggg.....',
    '....gggg.....',
    '....kggg.....',
    '....wwww.....',
])

const LEGS_MID = symmetric([
    '..gggggg.....',
    '...ggggg.....',
    '...ggggg.....',
    '...wwwww.....',
    '.............',
    '.............',
])

const LEGS_TUCK = symmetric([
    '..gggggg.....',
    '..wwwww......',
    '..wkkkw......',
    '.............',
    '.............',
    '.............',
])

const TAIL_UP = ['..oo..', '.owwo.', '.owwo.', '.oggo.', '.oggo.', '.oggo.', '..gg..']
const TAIL_LEFT = ['.oo...', 'owwo..', 'owwo..', 'oggo..', '.oggo.', '.oggo.', '..gg..']
const TONGUE = ['oo.', 'tto', 'tto', '.o.']

/** The shorter leg poses end in blank rows, which lifts him off the ground mid-gallop. */
function bello(head: string[], legs: string[], tail: string[], tongueDrop: number): string[] {
    let body = stack([head, 0], [BODY, 0], [legs, 0])
    body = overlay(body, tail, 10, 13)
    body = overlay(body, TONGUE, 19, 8 + tongueDrop)
    return outlined(body)
}

/** Gallop: stride, gather, tuck in the air, gather. Ears and tail run against it. */
export const BELLO_RUN = [
    bello(HEAD_EARS_DOWN, LEGS_STRIDE, TAIL_LEFT, 0),
    bello(HEAD_EARS_UP, LEGS_MID, TAIL_UP, 1),
    bello(HEAD_EARS_UP, LEGS_TUCK, mirrorRows(TAIL_LEFT), 1),
    bello(HEAD_EARS_DOWN, LEGS_MID, TAIL_UP, 0),
]

/** Sitting, facing Edgar and the camera, after the catch. */
export const BELLO_SIT = outlined(
    overlay(
        stack(
            [
                symmetric([
                    '........ggggg',
                    '......GGggggg',
                    '...ee.Ggggggg',
                    '..eeeeggggGGG',
                    '..eeeeggwoGGG',
                    '..eeeeggooGGG',
                    '..eeeegggGGGG',
                    '..eeeeggGGGoo',
                    '...eeegGGGGoo',
                    '...eee.gGGGGo',
                    '....e..gggGGG',
                    '......ccccccc',
                    '......cccccc.',
                ]),
                0,
            ],
            [
                symmetric([
                    '......ggggGww',
                    '.....gggggGww',
                    '....ggggggGww',
                    '...ggggggg.Gw',
                    '...gggggg.ggw',
                    '...gggggg.ggw',
                    '...kkkkk.wwww',
                ]),
                0,
            ],
        ),
        ['.tt.', 'tttt', '.tt.', '.yy.'],
        11,
        10,
    ),
)
