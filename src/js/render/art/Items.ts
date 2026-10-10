import type { ColorMap } from '../Sprites'
import { symmetric } from '../Sprites'
import { outlined } from './Outline'

/** Acorns, what Edgar wears with an ability, and the icons for the HUD. */
export const ITEM_MAP: ColorMap = {
    o: 'ink',
    a: 'acorn',
    A: 'acornLight',
    c: 'acornCap',
    Y: 'helmet',
    L: 'helmetLight',
    K: 'helmetDark',
    w: 'white',
    C: 'capeLight',
    r: 'cape',
    R: 'capeDark',
    M: 'magnet',
    m: 'magnetDark',
    s: 'steel',
    S: 'steelDark',
    x: 'spark',
    g: 'glass',
    G: 'glassDark',
    t: 'rainbow2',
    T: 'rainbow1',
    n: 'mud',
    N: 'mudDark',
    l: 'mudLight',
    H: 'heart',
}

/** Floats up over Edgar and Bello at the end. */
export const HEART = outlined(['HH.HH', 'HHHHH', 'HHHHH', '.HHH.', '..H..'])

export const ACORN = outlined([
    '...cc...',
    '.cccccc.',
    'ccAccccc',
    'cccccccc',
    '.aaaaaa.',
    '.aAaaaa.',
    '.aAaaaa.',
    '.aaaaaa.',
    '..aaaa..',
    '...aa...',
])

/** Sits on Edgar's head from behind; the ears poke out at the sides. */
export const HELMET = outlined(
    symmetric([
        '.....LLLLw',
        '...LLLYYYw',
        '..LYYYYYYw',
        '.LYYYYYYYw',
        '.YYYYYYYYw',
        'YYYYYYYYYw',
        'KKKKKKKKKK',
    ]),
)

/** Spinning away after it took a hit: the same helmet on its side. */
export const HELMET_FLYING = outlined(['..LLLK', '.LYYYK', 'LYYYYK', 'wwwwwK', 'YYYYYK', 'YYYYYK', '.YYYK.', '..YK..'])

const CAPE_TOP = [
    '....CCCCCCCCCCCCCCCC....',
    '...CrrrrrrrrrrrrrrrrC...',
    '...rrrrrrrrrrrrrrrrrr...',
    '..rrrrrrrrrrrrrrrrrrrr..',
    '..rrrrrrRrrrrrrRrrrrrr..',
    '..rrrrrRrrrrrrrrRrrrrr..',
    '.rrrrrrRrrrrrrrrRrrrrrr.',
    '.rrrrrRrrrrrrrrrrRrrrrr.',
    '.rrrrrRrrrrrrrrrrRrrrrr.',
    'rrrrrRrrrrrrrrrrrrRrrrrr',
    'rrrrRrrrrrrrrrrrrrrRrrrr',
]

/** Fluttering from Edgar's shoulders; only the hem and the sway change. */
export const CAPE_FLUTTER = [
    outlined([...CAPE_TOP, 'rrrrRrrrrrrrrrrrrrrRrrrr', 'rrrrrrrrrr..rrrrrrrrrrrr', '.rrrrrr.......rrrrrrr...']),
    outlined([...CAPE_TOP, 'rrrrRrrrrrrrrrrrrrrRrrrr', 'rrrrrrrrrrrrrrrrrrrr.rrr', '..rrrrrrrr..rrrrrrr.....']),
    outlined([...CAPE_TOP, 'rrrrRrrrrrrrrrrrrrrRrrrr', 'rrr.rrrrrrrrrrrrrrrrrrrr', '.....rrrrrrr..rrrrrrrr..']),
]

/** Spread wide while gliding, like wings. */
export const CAPE_GLIDE = outlined(
    symmetric([
        '..........CCCCCCC',
        '.......CCCrrrrrrr',
        '....CCCrrrrrrrrrr',
        '.CCCrrrrrrrrRrrrr',
        'Crrrrrrrrrrrrrrrr',
        'rrrrrrrRrrrrrRrrr',
        'rrrrrrRrrrrrrRrrr',
        '.rrrrrRrrrrrrrRrr',
        '..rrr..rrrr..rrrr',
        '.........rr....rr',
    ]),
)

/** Floats above Edgar's head and pulls acorns in from every lane. */
export const MAGNET = outlined([
    'ss..ss',
    'SS..SS',
    'MM..MM',
    'MM..MM',
    'MMMMMM',
    'mMMMMm',
    '.mmmm.',
])

export const MUD_SPOTS = ['..........', '..nn......', '..n.......', '.......nN.', '...l...NN.']

// HUD icons, 14 x 14 with the outline.
export const ICON_HELMET = outlined([
    '....LLLL....',
    '..LLYYYYww..',
    '.LYYYYYYwwY.',
    '.YYYYYYYwwY.',
    'LYYYYYYYwwYY',
    'YYYYYYYYwwYY',
    'YYYYYYYYwwYY',
    'KKKKKKKKKKKK',
    'K..........K',
])

export const ICON_CAPE = outlined([
    '..CCCCCCCC..',
    '.Crrrrrrrr..',
    '.rrrrrrrrrr.',
    '.rrRrrrrRrr.',
    'rrrRrrrrrRrr',
    'rrrRrrrrrRrr',
    'rrRrrrrrrrRr',
    'rrRrrrrrrrRr',
    'rrrrrrrrrrrr',
    'rrrr..rrr..r',
])

export const ICON_MAGNET = outlined([
    'ss....ss',
    'SS....SS',
    'MM....MM',
    'MM....MM',
    'MM....MM',
    'MMM..MMM',
    'mMMMMMMm',
    '.mmmmmm.',
])

export const ICON_TURBO = outlined([
    '.....tt.....',
    '.....tt.....',
    '....tttt....',
    'tttttttttttt',
    '.tttttttttt.',
    '..tttTTttt..',
    '..ttTttTtt..',
    '.tttt..tttt.',
    '.tt......tt.',
])

/** The jar the acorns go into; its contents are drawn by the HUD. */
export const JAR = outlined([
    '..SSSSSSSSSSSS..',
    '..ssssssssssss..',
    '..SSSSSSSSSSSS..',
    '...g........g...',
    '..g..........g..',
    '.g............G.',
    'g..............G',
    'g.w............G',
    'g.w............G',
    'g.w............G',
    'g..............G',
    'g..............G',
    'g..............G',
    'g..............G',
    'g..............G',
    'g..............G',
    'g..............G',
    'g..............G',
    '.g............G.',
    '..GGGGGGGGGGGG..',
])
