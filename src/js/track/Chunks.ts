/**
 * Handmade stretches of track, hung together at random. A chunk reads like a
 * sprite: one line per obstacle row, the first line arrives first.
 *
 *   .  free           a  acorn
 *   H  hurdle, jump   S  gate, duck       K  hay, change lanes
 *   M  mud, jump      R  rail starts      |  rail goes on, an acorn on top
 *   C  a chicken      E  a duck family, arriving in this lane
 *   U  a cow, walking into this lane as it reaches Edgar
 *   W  hay wagon, its ramp   =  the wagon goes on, an acorn on top
 *   ~  water                  B  the bridge over it, an acorn on the deck
 *
 * `entry` and `exit` are the lanes without hay, a cow or water in the first
 * and last row: those are the only things that force a lane change,
 * everything else can be jumped, ducked or ridden. The next chunk is drawn from those whose entry meets the
 * last exit, so a way through the endless track is guaranteed by construction.
 */
export interface Chunk {
    rows: string[]
    /** Metres into a run before the chunk joins the pool. */
    from: number
    entry: number
    exit: number
}

const TEMPLATES: [number, string[]][] = [
    [0, ['.a.', '.a.', 'K.K', '...']],
    [0, ['a..', 'a..', '.H.', '...']],
    [0, ['..a', '..a', 'H..', '...']],
    [0, ['...', '.H.', '.a.', '...']],
    [0, ['.a.', '.a.', 'S.S', '...']],
    [0, ['a..', '...', '.KK', '...']],
    [0, ['..a', '...', 'KK.', '...']],
    [0, ['.M.', '...', 'a.a', '...']],
    [0, ['...', 'M..', '.a.', '...']],
    [0, ['...', '.a.', '.a.', '...']],

    [100, ['.a.', 'H.H', '.a.', 'S.S', '...']],
    [100, ['R..', '|..', '|..', '|..', '...']],
    [100, ['..R', '..|', '..|', '..|', '...']],
    [100, ['C..', '...', '..a', '..a', '...']],
    [100, ['..C', '...', 'a..', '...']],
    [100, ['a..', 'a..', '.MK', '...']],
    [100, ['K..', '.M.', '..K', '...']],
    [100, ['..K', '.M.', 'K..', '...']],
    [100, ['.S.', '...', 'H.H', '.a.', '...']],

    [250, ['.R.', '.|.', 'K|K', '.|.', '...']],
    [250, ['.C.', '...', '...']],
    [250, ['..E', '...', '.a.', '...']],
    [250, ['E..', '...', '...']],
    [250, ['W..', '=..', '=..', '...', '...']],
    [250, ['..W', '..=', '..=', '...', '...']],
    [250, ['M.M', '.a.', 'K.K', '...']],
    [250, ['.C.', 'H.H', '...', '...']],

    [450, ['H..', '.H.', '..H', '...']],
    [450, ['..H', '.H.', 'H..', '...']],
    [450, ['K..', '.K.', '..K', '...']],
    [450, ['..K', '.K.', 'K..', '...']],
    [450, ['KK.', '...', '.KK', '...']],
    [450, ['.KK', '...', 'KK.', '...']],
    [450, ['R.R', '|.|', '|K|', '|.|', '...']],
    [450, ['S..', '.S.', '..S', '...']],
    [450, ['a..', 'a..', '.U.', '...']],
    [450, ['..U', '...', '.a.', '...']],
    [450, ['U..', '...', '..K', '...']],
    [450, ['.W.', '.=.', '.=.', '...', '...']],
    [450, ['.a.', '.a.', '~B~', '~B~', '...']],
    [450, ['a..', 'a..', 'B~~', 'B~~', '...']],
    [450, ['..a', '..a', '~~B', '~~B', '...']],

    [900, ['H.K', '...', 'K.H', '...']],
    [900, ['.S.', 'K.K', '.H.', '...']],
    [900, ['C.C', '...', '.K.', '...']],
    [900, ['E..', '..E', '...']],
    [900, ['S.K', 'K.S', '...']],
    [900, ['HHH', '...', 'SSS', '...']],
    [900, ['M.M', 'HHH', '...']],
    [900, ['K.K', '.S.', 'K.K', '.H.', '...']],
    [900, ['U..', '.a.', '..U', '...']],
    [900, ['.U.', 'H.H', '...']],
    [900, ['..U', 'K..', '.a.', '...']],
    [900, ['W.K', '=..', '=.K', '...', '...']],
    [900, ['.W.', 'K=K', '.=.', '...', '...']],
    [900, ['K..', '...', '~~B', '~~B', '...']],
    [900, ['..K', '...', 'B~~', 'B~~', '...']],

    [1300, ['KK.', 'S..', '.KK', '..H', 'K..', '...']],
    [1300, ['.a.', 'H.H', 'S.S', 'K.K', '...']],
    [1300, ['.C.', 'HHH', '.C.', '...']],
    [1300, ['.R.', 'S|S', 'K|K', '.|.', '...']],
    [1300, ['SSS', 'K.K', 'HHH', '...']],
    [1300, ['H.K', 'K.S', 'M.K', '...']],
    [1300, ['U.K', '...', 'K.U', '...']],
    [1300, ['.U.', 'K.K', '.H.', '...']],
    [1300, ['W.W', '=K=', '=.=', '...', '...']],
    [1300, ['.K.', '...', '~B~', '~B~', '~B~', '...']],
]

/** A quiet stretch: rhythm comes from the change between busy and calm. */
export const BREATHER: string[] = ['...', '...', '.a.', '.a.', '...']

export const OPENING: string[] = ['...', '...', '...', '...', '.a.', '.a.', '...']

const FREE = new Set(['.', 'a'])
/** What an acorn may lead into: free road, a ramp, a wagon's top, a bridge. */
const OPEN = new Set(['.', 'a', 'W', '=', 'B'])
const BLOCKING = new Set(['H', 'S', 'K', 'M', 'R', 'C', 'E', 'U', '~'])
const FULL = new Set(['K', 'U', '~'])

/** Lanes without hay, a cow or water. */
export function maskOf(row: string): number {
    let mask = 0
    for (let lane = 0; lane < 3; lane++) {
        if (!FULL.has(row[lane])) {
            mask |= 1 << lane
        }
    }
    return mask
}

/** A row with nothing in it: the tail a hard chunk may lose. */
export function isEmpty(row: string): boolean {
    return [...row].every((cell) => FREE.has(cell))
}

export const CHUNKS: Chunk[] = TEMPLATES.map(([from, rows]) => ({
    rows,
    from,
    entry: maskOf(rows[0]),
    exit: maskOf(rows[rows.length - 1]),
}))

/**
 * Acorns are signposts: a row of them always leads into a lane that is free
 * in the next row with an obstacle. Checked here rather than kept by hand.
 */
export function validateChunks(): string[] {
    const problems: string[] = []
    for (const chunk of CHUNKS) {
        const name = chunk.rows.join(' ')
        if (chunk.rows.some((row) => maskOf(row) === 0)) {
            problems.push(`${name}: a row with no way through`)
        }
        chunk.rows.forEach((row, index) => {
            const next = chunk.rows.slice(index + 1).find((later) => [...later].some((cell) => BLOCKING.has(cell)))
            if (!next) {
                return
            }
            for (let lane = 0; lane < 3; lane++) {
                if (row[lane] === 'a' && !OPEN.has(next[lane])) {
                    problems.push(`${name}: acorn in lane ${lane} leads into ${next}`)
                }
            }
        })
    }
    return problems
}
