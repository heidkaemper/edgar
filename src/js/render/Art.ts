import { PLAYER_SCALE } from '../config'
import type { Kind } from '../entities/Thing'
import * as Animals from './art/Animals'
import * as BelloArt from './art/Bello'
import * as EdgarArt from './art/Edgar'
import * as Items from './art/Items'
import * as Obstacles from './art/Obstacles'
import * as Scenery from './art/Scenery'
import * as Sky from './art/Sky'
import type { ColorMap } from './Sprites'
import { bake, DepthSprite, mirrorRows, scaled } from './Sprites'
import type { Surface } from './Surface'

/**
 * Every baked image the game draws. Things on the road go through the depth
 * scaler; Edgar always stands at the same depth, so his frames are baked once
 * at that scale, in his own colours and in each of the turbo's.
 */
function depth(rows: string[], map: ColorMap): DepthSprite {
    return new DepthSprite({ rows, map })
}

function frames(list: string[][], map: ColorMap): DepthSprite[] {
    return list.map((rows) => depth(rows, map))
}

export interface EdgarFrame {
    image: Surface
    /** First row with ink, in screen pixels: where the head starts. */
    top: number
}

function edgarFrames(rows: string[], maps: ColorMap[]): EdgarFrame[] {
    const top = rows.findIndex((row) => /[^.]/.test(row)) * PLAYER_SCALE
    return maps.map((map) => ({ image: scaled(bake({ rows, map }), PLAYER_SCALE), top }))
}

function edgarSet(list: string[][]): EdgarFrame[][] {
    return list.map((rows) => edgarFrames(rows, [EdgarArt.EDGAR_MAP, ...EdgarArt.RAINBOW_MAPS]))
}

function big(rows: string[], map: ColorMap): Surface {
    return scaled(bake({ rows, map }), PLAYER_SCALE)
}

export const ART = {
    edgar: {
        skate: edgarSet(EdgarArt.EDGAR_SKATE),
        look: edgarSet(EdgarArt.EDGAR_LOOK),
        jump: edgarSet([EdgarArt.EDGAR_JUMP])[0],
        fall: edgarSet([EdgarArt.EDGAR_FALL])[0],
        duck: edgarSet([EdgarArt.EDGAR_DUCK])[0],
        stumble: edgarSet(EdgarArt.EDGAR_STUMBLE),
        caught: edgarSet([EdgarArt.EDGAR_CAUGHT])[0],
    },
    helmet: big(Items.HELMET, Items.ITEM_MAP),
    helmetFlying: [big(Items.HELMET_FLYING, Items.ITEM_MAP), big(mirrorRows(Items.HELMET_FLYING), Items.ITEM_MAP)],
    cape: Items.CAPE_FLUTTER.map((rows) => big(rows, Items.ITEM_MAP)),
    capeGlide: big(Items.CAPE_GLIDE, Items.ITEM_MAP),
    magnet: big(Items.MAGNET, Items.ITEM_MAP),
    heart: big(Items.HEART, Items.ITEM_MAP),
    mudSpots: big(Items.MUD_SPOTS, Items.ITEM_MAP),
    bello: frames(BelloArt.BELLO_RUN, BelloArt.BELLO_MAP),
    belloSit: depth(BelloArt.BELLO_SIT, BelloArt.BELLO_MAP),
    things: {
        hurdle: [depth(Obstacles.HURDLE, Obstacles.OBSTACLE_MAP)],
        gate: [depth(Obstacles.GATE, Obstacles.OBSTACLE_MAP)],
        hay: [depth(Obstacles.HAY, Obstacles.OBSTACLE_MAP)],
        mud: [depth(Obstacles.MUD, Obstacles.OBSTACLE_MAP)],
        rail: [depth(Obstacles.RAIL_POST, Obstacles.OBSTACLE_MAP)],
        acorn: [depth(Items.ACORN, Items.ITEM_MAP)],
        tree: [depth(Scenery.TREE, Scenery.SCENERY_MAP)],
        bush: [depth(Scenery.BUSH, Scenery.SCENERY_MAP)],
        fence: [depth(Scenery.FENCE, Scenery.SCENERY_MAP)],
        chicken: frames([...Animals.CHICKEN_WALK, ...Animals.CHICKEN_FLAP], Animals.CHICKEN_MAP),
        duck: frames(Animals.DUCK_WALK, Animals.DUCK_MAP),
        duckling: frames(Animals.DUCKLING_WALK, Animals.DUCK_MAP),
        cow: frames(Animals.COW_WALK, Animals.COW_MAP),
    } as Record<Kind, DepthSprite[]>,
    /** Animals walking left: the same drawings, mirrored. */
    thingsLeft: {
        chicken: frames([...Animals.CHICKEN_WALK, ...Animals.CHICKEN_FLAP].map(mirrorRows), Animals.CHICKEN_MAP),
        duck: frames(Animals.DUCK_WALK.map(mirrorRows), Animals.DUCK_MAP),
        duckling: frames(Animals.DUCKLING_WALK.map(mirrorRows), Animals.DUCK_MAP),
        cow: frames(Animals.COW_WALK.map(mirrorRows), Animals.COW_MAP),
    } as Partial<Record<Kind, DepthSprite[]>>,
    icons: {
        helmet: bake({ rows: Items.ICON_HELMET, map: Items.ITEM_MAP }),
        cape: bake({ rows: Items.ICON_CAPE, map: Items.ITEM_MAP }),
        magnet: bake({ rows: Items.ICON_MAGNET, map: Items.ITEM_MAP }),
        turbo: bake({ rows: Items.ICON_TURBO, map: Items.ITEM_MAP }),
    },
    jar: bake({ rows: Items.JAR, map: Items.ITEM_MAP }),
    acorn: bake({ rows: Items.ACORN, map: Items.ITEM_MAP }),
    moon: big(Sky.MOON, Sky.SKY_MAP),
}

export type Ability = keyof typeof ART.icons

const ALL_DEPTH: DepthSprite[] = [
    ...Object.values(ART.things).flat(),
    ...Object.values(ART.thingsLeft).flat(),
    ...ART.bello,
    ART.belloSit,
]

/**
 * Bakes a few missing depth steps, at most `count`. Called every frame until
 * everything is baked, so a kind of obstacle that first turns up two minutes
 * into a run does not cost a stutter when it does.
 */
export function prewarm(count: number): void {
    while (warmed < ALL_DEPTH.length) {
        const sprite = ALL_DEPTH[warmed]
        while (count > 0 && sprite.bakeNext()) {
            count--
        }
        if (count === 0) {
            return
        }
        warmed++
    }
}

/** Sprites before this index are fully baked. */
let warmed = 0
