import type { ColorMap } from '../Sprites'
import { symmetric } from '../Sprites'
import { outlined } from './Outline'

/**
 * The class of an obstacle has to show in its silhouette before its colour
 * does: low ones are wide and flat, the gate spans the lane high up, the hay
 * is a massive block, the mud lies flat. At the far end only the outline is
 * left, so the outline has to carry the meaning.
 */
export const OBSTACLE_MAP: ColorMap = {
    o: 'ink',
    Y: 'hazard',
    K: 'hazardDark',
    G: 'post',
    g: 'postDark',
    R: 'barrier',
    W: 'white',
    h: 'hay',
    H: 'hayLight',
    j: 'hayDark',
    t: 'twine',
    m: 'mud',
    M: 'mudLight',
    n: 'mudDark',
    l: 'rail',
    L: 'railDark',
}

function repeat(row: string, count: number): string[] {
    return new Array(count).fill(row)
}

/** Low: jump it. Three broad bands, not a fine stripe pattern. */
export const HURDLE = outlined([
    'YYYYYYKKKKKYYYYYYYYYYYYKKKKKYYYYYYYYYY',
    'YYYYYKKKKKYYYYYYYYYYYYKKKKKYYYYYYYYYYY',
    'YYYYKKKKKYYYYYYYYYYYYKKKKKYYYYYYYYYYYY',
    'YYYKKKKKYYYYYYYYYYYYKKKKKYYYYYYYYYYYYY',
    'YYKKKKKYYYYYYYYYYYYKKKKKYYYYYYYYYYYYYY',
    '......................................',
    ...repeat('...GGg..........................GGg...', 9),
    '..GGGGg........................GGGGg..',
    '..gggggg.......................gggggg.',
])

/**
 * High: duck under it. The beam and the sign above make it too tall to jump,
 * which is the point: otherwise ducking would never be needed.
 */
export const GATE = outlined([
    'GGGgYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYGGGg',
    'GGGgYYYYYYYYYYYYYYYYKKYYYYYYYYYYYYYYYYGGGg',
    'GGGgYYYYYYYYYYYYYYYYKKYYYYYYYYYYYYYYYYGGGg',
    'GGGgYYYYYYYYYYYYYYYYKKYYYYYYYYYYYYYYYYGGGg',
    'GGGgYYYYYYYYYYYYYYYYKKYYYYYYYYYYYYYYYYGGGg',
    'GGGgYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYGGGg',
    'GGGgYYYYYYYYYYYYYYYYKKYYYYYYYYYYYYYYYYGGGg',
    'GGGgYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYGGGg',
    'GGGg..................................GGGg',
    ...repeat('GGGg..................................GGGg', 16),
    ...repeat('GGGgRRRRRRRRRWWWWWWWWRRRRRRRRWWWWWWWWWGGGg', 9),
    'GGGg..................................GGGg',
    ...repeat('GGGg..................................GGGg', 28),
    'GGGGg................................GGGGg',
    'gggggg..............................gggggg',
])

/** Full: change lanes. Two stacked bales held by twine, lit from above. */
export const HAY = outlined([
    '..HHHHHHHHtHHHHHHHHHHHHHHHHHHHtHHHHHHHHH..',
    '.HHHHHHHHHtHHHHHHHHHHHHHHHHHHHtHHHHHHHHHH.',
    'HHHHHHHHHHtHHHHHHHHHHHHHHHHHHHtHHHHHHHHHHH',
    ...repeat('hhhhhhhhhhthhhhhhhhhhhhhhhhhhhthhhhhhhhhhh', 3),
    'hhhhhHhhhhthhhhhhhhhhhhhhHhhhhthhhhhhhhhhh',
    'hhhhhhHhhhthhhhhhhhhhhhhhhHhhhthhhhhhhHhhh',
    ...repeat('hhhhhhhhhhthhhhhhhhhhhhhhhhhhhthhhhhhhhhhh', 8),
    'jhhhhhhhhhthhhhhhhhhhhhhhhhhhhthhhhhhhhhhj',
    'jjjjjjjjjjtjjjjjjjjjjjjjjjjjjjtjjjjjjjjjjj',
    'HHHHHHHHHHtHHHHHHHHHHHHHHHHHHHtHHHHHHHHHHH',
    ...repeat('hhhhhhhhhhthhhhhhhhhhhhhhhhhhhthhhhhhhhhhh', 2),
    'hhhhhhhhhhthhhhhhHhhhhhhhhhhhhthhhhhhhhhhh',
    'hhhhhhhhhhthhhhhhhHhhhhhhhhhhhthhhhhhhhhhh',
    ...repeat('hhhhhhhhhhthhhhhhhhhhhhhhhhhhhthhhhhhhhhhh', 10),
    'jhhhhhhhhhthhhhhhhhhhhhhhhhhhhthhhhhhhhhhj',
    'jjjjjjjjjjtjjjjjjjjjjjjjjjjjjjtjjjjjjjjjjj',
])

/** Flat: jump it or drive round it. Drive through and it splashes the screen. */
export const MUD = outlined(
    symmetric([
        '.......nnnnnnnnnnnnnnnn',
        '...nnnnmmmmmmmmmmmmmmmm',
        '.nnmmmmmmMMMmmmmmmmmmmm',
        'nmmmmmmmMMMMMmmmmmmmmmm',
        'nmmmmmmmmMMMmmmmmmmmmMm',
        '.nmmmmmmmmmmmmmmmmmmmmm',
        '..nnnmmmmmmmmmmmmmmmmmm',
        '.....nnnnnnnnnnnnnnnnnn',
    ]),
)

/** A post of the rail; the rail itself is drawn along the depth by the renderer. */
/** Ten rows and the outline: it ends just under the bar, which is drawn over the ground. */
export const RAIL_POST = outlined(['llL', 'llL', 'llL', 'llL', 'llL', 'llL', 'llL', 'llL', 'llL', 'LLL'])
