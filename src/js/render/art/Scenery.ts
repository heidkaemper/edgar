import type { ColorMap } from '../Sprites'
import { outlined } from './Outline'

/** Roadside scenery for the afternoon world: trees, bushes and fences. */
export const SCENERY_MAP: ColorMap = {
    o: 'ink',
    F: 'leafLight',
    f: 'leaf',
    k: 'leafDark',
    T: 'trunk',
    w: 'white',
    W: 'shade',
}

function repeat(row: string, count: number): string[] {
    return new Array(count).fill(row)
}

export const TREE = outlined([
    '...........FFFFFFFF...........',
    '........FFFFFFFFFFFFFF........',
    '......FFFFFFFFFFFFFFFFFF......',
    '.....FFFFFFFFFFFFFFFFFFFF.....',
    '....FFFFFFFffffffFFFFFFfff....',
    '...FFFFFFfffffffffFFFFffff....',
    '..FFFFFFffffffffffffffffffff..',
    '..FFFFfffffffffffffffffffffff.',
    '.FFFFfffffffffffffffffffffffff',
    '.FFFffffffffffffffffffffffkfff',
    'FFFffffffffffffffffffffffkkfff',
    'FFfffffffffffffkkfffffffkkkfff',
    'Fffffffffffffffkkkfffffkkkkfff',
    'fffffffffffffffkkkkkfffkkkkff.',
    'ffffffffffffffkkkkkkkkkkkkkff.',
    '.fffffffffffffkkkkkkkkkkkkkf..',
    '.ffffkkkfffffkkkkkkkkkkkkkk...',
    '..fkkkkkkkkkkkkkkkkkkkkkkk....',
    '...kkkkkkkkkkkkkkkkkkkkkk.....',
    '.....kkkkkkkkkkkkkkkkkk.......',
    '........kkkkkkkkkkkk..........',
    '............TTTTT.............',
    ...repeat('............TTTTT.............', 12),
    '...........TTTTTTT............',
    '..........TTTTTTTTT...........',
])

export const BUSH = outlined([
    '........FFFFFF..........',
    '....FFFFFFFFFFFF.FFFF...',
    '..FFFFFFFFfffFFFFFFFFFF.',
    '.FFFFFfffffffffFFFffffff',
    'FFFfffffffffffffffffffff',
    'ffffffffffkkfffffffkkfff',
    'fffffffkkkkkkfffkkkkkkkf',
    '.kkkkkkkkkkkkkkkkkkkkkk.',
])

export const FENCE = outlined([
    '.WW..........WW..........WW.',
    'wwwW........wwwW........wwwW',
    'wwwW........wwwW........wwwW',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwww',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'wwwW........wwwW........wwwW',
    'wwwW........wwwW........wwwW',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwww',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'wwwW........wwwW........wwwW',
    'wwwW........wwwW........wwwW',
    'WWWW........WWWW........WWWW',
])
