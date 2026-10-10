import { MUD_FRAMES, PLAYER_SCALE, PLAYER_Z, SHADOW_ALPHA, SKATE_FRAME_Z, Z_MAX, Z_NEAR } from '../config'
import type { Game, Splash } from '../core/Game'
import type { Thing } from '../entities/Thing'
import { ANIMALS, LONG, SCENERY } from '../entities/Thing'
import type { Projection } from '../track/Projection'
import { stepIndex } from '../track/Projection'
import { ACORN_LIFT } from '../track/Spawner'
import { view } from '../track/View'
import type { EdgarFrame } from './Art'
import { ART } from './Art'
import { drawText, textWidth } from './Font'
import { PAL } from './Palette'

const enum Layer {
    Haze,
    Thing,
    Edgar,
    Bello,
}

/** One entry of the back-to-front list. Entries are kept and reused across frames. */
interface Drawable {
    z: number
    layer: Layer
    thing: Thing | null
    near: number
    far: number
}

function backToFront(a: Drawable, b: Drawable): number {
    return b.z - a.z
}

const BELLO_STRIDE_Z = 26

/**
 * Everything standing on the road, back to front: things, rails, Bello and
 * Edgar with whatever he is wearing. Sorting is cheap because the list is
 * nearly sorted already; everything moves towards the camera at one speed.
 */
export class WorldRenderer {
    private readonly pool: Drawable[] = []
    private readonly order: Drawable[] = []
    private used = 0

    constructor(private readonly projection: Projection) {}

    /**
     * `haze` goes in just behind Edgar: it fades everything in the distance,
     * but never him, however high the cape carries him.
     */
    draw(ctx: CanvasRenderingContext2D, game: Game, haze: () => void): void {
        this.used = 0
        this.order.length = 0
        this.add(PLAYER_Z + 0.01, Layer.Haze, null)

        for (const thing of game.things) {
            if (LONG.has(thing.kind)) {
                continue
            }
            if (thing.z > Z_MAX * 1.05) {
                continue
            }
            this.add(thing.z, Layer.Thing, thing)
        }

        this.add(PLAYER_Z, Layer.Edgar, null)
        if (game.bello.visible) {
            this.add(PLAYER_Z - game.bello.gap - 0.01, Layer.Bello, null)
        }

        this.order.sort(backToFront)
        for (const item of this.order) {
            this.drawItem(ctx, game, item, haze)
        }
    }

    private drawItem(ctx: CanvasRenderingContext2D, game: Game, item: Drawable, haze: () => void): void {
        switch (item.layer) {
            case Layer.Haze:
                haze()
                break
            case Layer.Thing:
                this.drawThing(ctx, item.thing!, game.frame)
                break
            case Layer.Edgar:
                this.drawEdgar(ctx, game)
                break
            case Layer.Bello:
                this.drawBello(ctx, game)
                break
        }
    }

    /** Takes the next entry from the pool; it only grows, never shrinks. */
    private add(z: number, layer: Layer, thing: Thing | null, near = 0, far = 0): void {
        if (this.used === this.pool.length) {
            this.pool.push({ z: 0, layer: Layer.Haze, thing: null, near: 0, far: 0 })
        }
        const item = this.pool[this.used++]
        item.z = z
        item.layer = layer
        item.thing = thing
        item.near = near
        item.far = far
        this.order.push(item)
    }

    /** On top of everything in the world, under the HUD. */
    drawEffects(ctx: CanvasRenderingContext2D, game: Game): void {
        for (const particle of game.particles.list) {
            if (particle.sprite) {
                const image = particle.spin && Math.floor(particle.life / 4) % 2 ? particle.spin : particle.sprite
                ctx.drawImage(image, Math.round(particle.x - image.width / 2), Math.round(particle.y - image.height / 2))
                continue
            }
            ctx.fillStyle = particle.color
            const size = particle.life < particle.max * 0.3 ? Math.max(1, particle.size - 1) : particle.size
            ctx.fillRect(Math.round(particle.x), Math.round(particle.y), size, size)
        }

        if (game.turbo || game.stageFlash > 0) {
            this.drawSpeedLines(ctx, game.frame)
        }
        // Mud sits on the lens, so it covers everything, Edgar included.
        for (const splash of game.splashes) {
            this.drawSplash(ctx, splash)
        }
        if (game.bello.bark > 0 && game.bello.visible) {
            this.drawBark(ctx, game)
        }
    }

    /**
     * Mud on the lens, not a ball on the road: a splat with droplets around
     * it and a drip running down. It pops in, then shrinks away.
     */
    private drawSplash(ctx: CanvasRenderingContext2D, splash: Splash): void {
        const age = MUD_FRAMES - splash.life
        const grow = Math.min(1, age / 4)
        const fade = Math.min(1, splash.life / 24)
        const radius = Math.round(splash.r * grow * fade)
        if (radius < 2) {
            return
        }
        const drip = Math.min(1, age / 60) * fade
        const layers: [string, number][] = [
            [PAL.mudDark, 0],
            [PAL.mud, 2],
        ]
        for (const [color, inset] of layers) {
            disc(ctx, splash.x, splash.y, radius - inset, color)
            for (let i = 0; i < 3; i++) {
                const angle = splash.seed + i * 2.1
                const x = splash.x + Math.cos(angle) * radius * 0.55
                const y = splash.y + Math.sin(angle) * radius * 0.45
                disc(ctx, x, y, Math.round(radius * 0.7) - inset, color)
            }
            for (let i = 0; i < 7; i++) {
                const angle = splash.seed + 0.4 + i * 0.9
                const distance = radius * (1.45 + ((i * 37) % 5) * 0.1)
                const size = Math.round(radius * (0.1 + ((i * 13) % 4) * 0.04)) - inset / 2
                disc(ctx, splash.x + Math.cos(angle) * distance, splash.y + Math.sin(angle) * distance, size, color)
            }
            ctx.fillStyle = color
            for (const [offset, reach] of [
                [-0.35, 0.7],
                [0.3, 1.1],
            ]) {
                const x = Math.round(splash.x + radius * offset)
                const length = Math.round(radius * (0.6 + reach * drip))
                const width = Math.max(1, 3 - inset)
                ctx.fillRect(x, Math.round(splash.y), width, length)
                disc(ctx, x + 1, splash.y + length, 2 - inset / 2, color)
            }
        }
        disc(ctx, splash.x - radius * 0.35, splash.y - radius * 0.4, Math.round(radius * 0.22), PAL.mudLight)
    }

    private drawThing(ctx: CanvasRenderingContext2D, thing: Thing, frame: number): void {
        const point = this.projection.project(thing.x, thing.z)
        const sprites = thing.vx < 0 ? (ART.thingsLeft[thing.kind] ?? ART.things[thing.kind]) : ART.things[thing.kind]
        const image = sprites[this.frameOf(thing, frame, sprites.length)].at(thing.z)
        const bob = thing.kind === 'acorn' && !thing.pulled ? Math.sin(frame * 0.12 + thing.timer) * 1.5 : 0
        const lift = (thing.lift + bob) * point.scale

        // An acorn above a rail or a wagon would cast its shadow on the road beneath.
        if (!SCENERY.has(thing.kind) && thing.kind !== 'mud' && thing.lift <= ACORN_LIFT) {
            const width = ART.things[thing.kind][0].w * (thing.kind === 'acorn' ? 0.3 : 0.42)
            shadow(ctx, point.x, point.groundY, width * point.scale, SHADOW_ALPHA)
        }
        ctx.drawImage(image, Math.round(point.x - image.width / 2), Math.round(point.groundY - image.height - lift))
    }

    private frameOf(thing: Thing, frame: number, count: number): number {
        if (!ANIMALS.has(thing.kind)) {
            return 0
        }
        if (thing.kind === 'cow') {
            return Math.floor(frame / 14) % count
        }
        if (thing.kind === 'chicken') {
            return (thing.flap > 0 ? 2 : 0) + (Math.floor(frame / (thing.flap > 0 ? 3 : 7)) % 2)
        }
        return Math.floor(frame / 9) % count
    }

    private edgarFrame(game: Game): EdgarFrame[] {
        const edgar = game.edgar
        const art = ART.edgar
        if (game.state === 'caught' && game.bello.mode === 'sitting') {
            return art.caught
        }
        if (game.state === 'over') {
            return art.caught
        }
        if (edgar.stumble > 0) {
            return art.stumble[Math.floor(game.frame / 5) % 2]
        }
        if (!edgar.onGround) {
            return edgar.vy > 0.5 ? art.jump : art.fall
        }
        if (edgar.duck > 0) {
            return art.duck
        }
        const step = Math.floor(edgar.stride / SKATE_FRAME_Z) % 4
        const looking = game.bello.threatening && game.frame % 90 < 55
        return (looking ? art.look : art.skate)[step]
    }

    /**
     * In a stream he stands in the water up to his belly: drawn lower and cut
     * off at the surface, with a ring of ripples round him.
     */
    private drawEdgar(ctx: CanvasRenderingContext2D, game: Game): void {
        const edgar = game.edgar
        const point = this.projection.project(edgar.x, PLAYER_Z)
        const sink = Math.round(edgar.sink * PLAYER_SCALE)
        if (!edgar.wading) {
            const height = Math.min(1, (edgar.y - edgar.floor) / 40)
            shadow(ctx, point.x, point.groundY - edgar.floor * PLAYER_SCALE, 13 * PLAYER_SCALE * (1 - height * 0.3), SHADOW_ALPHA * (1 - height * 0.5))
            this.drawFigure(ctx, game, point.x, point.groundY + sink)
            return
        }

        const surface = Math.round(point.groundY - edgar.y * PLAYER_SCALE)
        const reach = Math.round((15 + Math.sin(game.frame * 0.25) * 1.5) * PLAYER_SCALE)
        ripples(ctx, point.x, surface, reach, true)
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, view.w, surface)
        ctx.clip()
        this.drawFigure(ctx, game, point.x, point.groundY + sink)
        ctx.restore()
        ripples(ctx, point.x, surface, reach, false)
    }

    private drawFigure(ctx: CanvasRenderingContext2D, game: Game, x: number, ground: number): void {
        const edgar = game.edgar
        const blink = game.turbo && !game.powerEnding
        const palette = blink ? 1 + (Math.floor(game.frame / 3) % 4) : 0
        const frame = this.edgarFrame(game)[palette]
        const sprite = frame.image
        const x0 = Math.round(x - sprite.width / 2)
        const y0 = Math.round(ground - sprite.height - edgar.y * PLAYER_SCALE)
        const wobble = edgar.stumble > 0 ? Math.sin(game.frame * 0.7) * 0.8 : 0
        const lean = Math.round((edgar.lean + wobble) * 6)

        // Three bands with decreasing offset: a lean without a second drawing.
        const h = sprite.height
        const b1 = Math.round(h * 0.42)
        const b2 = Math.round(h * 0.74)
        ctx.drawImage(sprite, 0, 0, sprite.width, b1, x0 + lean, y0, sprite.width, b1)
        ctx.drawImage(sprite, 0, b1, sprite.width, b2 - b1, x0 + Math.round(lean * 0.5), y0 + b1, sprite.width, b2 - b1)
        ctx.drawImage(sprite, 0, b2, sprite.width, h - b2, x0, y0 + b2, sprite.width, h - b2)

        if (game.state === 'over' || (game.state === 'caught' && game.bello.mode === 'sitting')) {
            return
        }

        const head = y0 + frame.top
        if (game.muddy > 0) {
            ctx.drawImage(ART.mudSpots, x0 + 6 + Math.round(lean * 0.5), head + 40)
        }
        if (game.cape && !(game.powerEnding && game.frame % 2 === 0)) {
            const glide = game.gliding
            const cape = glide ? ART.capeGlide : ART.cape[Math.floor(game.frame / 6) % ART.cape.length]
            const sway = Math.round(lean * 0.7 - edgar.lean * 4)
            ctx.drawImage(cape, Math.round(x - cape.width / 2) + sway, head + (glide ? 28 : 32))
        }
        if (game.helmet) {
            ctx.drawImage(ART.helmet, Math.round(x - ART.helmet.width / 2) + lean, head + 2)
        }
        if (game.power === 'magnet' && !game.powerEnding) {
            const bob = Math.round(Math.sin(game.frame * 0.15) * 2)
            ctx.drawImage(ART.magnet, Math.round(x - ART.magnet.width / 2) + lean, head - 22 + bob)
        }
    }

    private drawBello(ctx: CanvasRenderingContext2D, game: Game): void {
        const bello = game.bello
        const z = Math.max(Z_NEAR * 0.75, PLAYER_Z - bello.gap)
        const point = this.projection.project(bello.x, z)

        if (bello.mode === 'sitting') {
            const image = ART.belloSit.at(PLAYER_Z)
            ctx.drawImage(image, Math.round(point.x - image.width / 2), Math.round(point.groundY - image.height))
            return
        }

        const sprites = ART.bello
        const frame = Math.floor(bello.stride / BELLO_STRIDE_Z) % sprites.length
        const image = sprites[frame].step(stepIndex(z))
        shadow(ctx, point.x, point.groundY, sprites[0].w * 0.4 * point.scale, SHADOW_ALPHA)
        const top = Math.round(point.groundY - image.height - bello.y * point.scale)
        ctx.drawImage(image, Math.round(point.x - image.width / 2), top)
    }

    private drawBark(ctx: CanvasRenderingContext2D, game: Game): void {
        const bello = game.bello
        const z = Math.max(Z_NEAR * 0.75, PLAYER_Z - bello.gap)
        const point = this.projection.project(bello.x, z)
        const text = 'WAU!'
        const width = textWidth(text, 2) + 12
        const x = Math.round(Math.min(view.w - width - 4, Math.max(4, point.x - width / 2 + 10)))
        const y = Math.round(Math.max(view.horizon + 4, Math.min(view.h - 70, point.groundY - 120)))
        ctx.fillStyle = PAL.ink
        ctx.fillRect(x - 2, y, width + 4, 22)
        ctx.fillRect(x, y - 2, width, 26)
        ctx.fillStyle = PAL.white
        ctx.fillRect(x, y, width, 22)
        ctx.fillRect(x + 8, y + 22, 6, 4)
        ctx.fillStyle = PAL.ink
        ctx.fillRect(x + 8, y + 26, 6, 2)
        drawText(ctx, text, x + 6, y + 4, { color: PAL.collar, scale: 2 })
    }

    private drawSpeedLines(ctx: CanvasRenderingContext2D, frame: number): void {
        ctx.fillStyle = PAL.white
        for (let i = 0; i < 8; i++) {
            const seed = (i * 7919 + Math.floor(frame / 2) * 104729) % 1000
            const left = i % 2 === 0
            const y = view.horizon + 10 + ((seed * 37) % Math.max(20, view.h - view.horizon - 20))
            const length = 18 + (seed % 30)
            const x = left ? (seed % 40) : view.w - (seed % 40) - length
            ctx.fillRect(x, y, length, 2)
        }
    }
}

/**
 * A flat ring on the water round someone standing in it, the back half
 * before they are drawn, the front half after, and a line of foam where the
 * surface cuts across them.
 */
function ripples(ctx: CanvasRenderingContext2D, x: number, y: number, reach: number, back: boolean): void {
    const ry = Math.max(2, Math.round(reach * 0.22))
    ctx.fillStyle = PAL.waterLight
    for (let dy = back ? -ry : 1; dy <= (back ? 0 : ry); dy++) {
        const dx = Math.round(reach * Math.sqrt(1 - (dy / ry) * (dy / ry)))
        const edge = Math.abs(dy) === ry ? dx : 3
        ctx.fillRect(Math.round(x) - dx, y + dy, edge, 1)
        ctx.fillRect(Math.round(x) + dx - edge, y + dy, edge, 1)
    }
    if (!back) {
        ctx.fillRect(Math.round(x - reach * 0.6), y - 1, Math.round(reach * 1.2), 2)
    }
}

/** A squashed disc on the ground, which anchors a sprite that would else float. */
function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, radiusX: number, alpha: number): void {
    const rx = Math.round(radiusX)
    if (rx < 2) {
        return
    }
    const ry = Math.max(1, Math.round(rx * 0.3))
    ctx.globalAlpha = alpha
    ctx.fillStyle = PAL.ink
    for (let dy = -ry; dy <= ry; dy++) {
        const dx = Math.round(rx * Math.sqrt(1 - (dy / ry) * (dy / ry)))
        ctx.fillRect(Math.round(x) - dx, Math.round(y) + dy, dx * 2 + 1, 1)
    }
    ctx.globalAlpha = 1
}

function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, color: string): void {
    if (radius < 1) {
        return
    }
    ctx.fillStyle = color
    for (let dy = -radius; dy <= radius; dy++) {
        const dx = Math.floor(Math.sqrt(radius * radius - dy * dy))
        ctx.fillRect(Math.round(cx - dx), Math.round(cy + dy), dx * 2 + 1, 1)
    }
}
