/** Everything on or beside the road that runs towards the camera. */
export type Kind =
    | 'hurdle'
    | 'gate'
    | 'hay'
    | 'mud'
    | 'rail'
    | 'wagon'
    | 'stream'
    | 'chicken'
    | 'duck'
    | 'duckling'
    | 'cow'
    | 'acorn'
    | 'tree'
    | 'bush'
    | 'fence'

export interface Thing {
    kind: Kind
    /** Sideways, world units; lanes sit at -LANE_W, 0 and +LANE_W. */
    x: number
    z: number
    prevZ: number
    /** Height above the road: an acorn floats, one on a rail floats higher. */
    lift: number
    /** Rails, wagons and streams: how far they reach into the distance from `z`. */
    length: number
    /** Animals only: sideways speed, per frame; the cow's per unit of depth. */
    vx: number
    /** Animals: frames until the next change of mind. Acorns: the bob phase. */
    timer: number
    /** Frames left of a chicken's flustered flapping. */
    flap: number
    /** Pulled in by the magnet. */
    pulled: boolean
    /** Animals: has already made its noise. */
    heard: boolean
    /** A stream: Edgar has already fallen in once. */
    soaked: boolean
    gone: boolean
}

export function makeThing(kind: Kind, x: number, z: number, extra: Partial<Thing> = {}): Thing {
    return { kind, x, z, prevZ: z, lift: 0, length: 0, vx: 0, timer: 0, flap: 0, pulled: false, heard: false, soaked: false, gone: false, ...extra }
}

/** Half the width that counts for a collision, in world units. */
export const HALF_WIDTH: Partial<Record<Kind, number>> = {
    hurdle: 19,
    gate: 20,
    hay: 21,
    mud: 18,
    rail: 4,
    chicken: 8,
    duck: 8,
    duckling: 4,
    cow: 20,
    acorn: 12,
}

export const ANIMALS = new Set<Kind>(['chicken', 'duck', 'duckling', 'cow'])
export const SCENERY = new Set<Kind>(['tree', 'bush', 'fence'])
/** Long things, drawn into the ground buffer rather than as sprites. */
export const LONG = new Set<Kind>(['rail', 'wagon', 'stream'])
