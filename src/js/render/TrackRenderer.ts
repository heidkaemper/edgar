import {
    BRIDGE_HALF,
    BRIDGE_MARGIN,
    DARKEN_MAX,
    FOCAL,
    LANE_W,
    LINE_W,
    RAIL_TOP,
    RAILING_TOP,
    ROAD_HALF,
    RUMBLE_W,
    STRIPE,
    Z_MAX,
    Z_NEAR,
} from '../config'
import type { Thing } from '../entities/Thing'
import type { Curve } from '../track/Curve'
import type { Projection } from '../track/Projection'
import { view } from '../track/View'
import { ART } from './Art'
import type { Light } from './Light'
import { mix, PAL, pixel, toRgb } from './Palette'
import type { Surface } from './Surface'
import { createSurface } from './Surface'
import { WagonRenderer } from './WagonRenderer'

/** Colours as 32-bit pixels, ready to be written into `ImageData` as they are. */
interface GroundRow {
    y: number
    z: number
    scale: number
    half: number
    rumbleW: number
    lineW: number
    grass: [number, number]
    road: [number, number]
    rumble: [number, number]
    lineOn: number
    lineOff: [number, number]
    water: [number, number]
    bank: number
    plank: [number, number]
}

const BAYER = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
]

function clamp01(value: number): number {
    return value < 0 ? 0 : value > 1 ? 1 : value
}

/** Eight steps, so a fade stays a countable ramp rather than a gradient. */
function quantise(t: number): number {
    return Math.round(t * 8) / 8
}

/** More slices than a rail can have between the horizon and the camera. */
const MAX_SLICES = 2048
const INK = pixel(toRgb(PAL.ink))
const RAIL_POST_EVERY = 38

/** A bar along the road on posts: a rail to grind, or the railing of a bridge. */
interface BarStyle {
    body: number
    shine: number
    dark: number
}

const RAIL: BarStyle = { body: pixel(toRgb(PAL.rail)), shine: pixel(toRgb(PAL.white)), dark: pixel(toRgb(PAL.railDark)) }
const RAILING: BarStyle = { body: pixel(toRgb(PAL.plank)), shine: pixel(toRgb(PAL.ramp)), dark: pixel(toRgb(PAL.plankDark)) }

/** Streams on screen at once, at most; one in sight is the rule. */
const MAX_STREAMS = 4
/** Depth of the muddy bank at either edge of a stream. */
const BANK = 10

/** Where the sky blends from one band into the next, as shares of its height. */
const SKY_SEAMS: [number, number][] = [
    [0.38, 0.48],
    [0.76, 0.86],
]
const SUN_RADIUS = 22
const STAR_COUNT = 70
const STAR = pixel(toRgb(PAL.star))

/** An offscreen canvas painted pixel by pixel. */
interface Painted {
    canvas: Surface
    ctx: CanvasRenderingContext2D
    image: ImageData
    pixels: Uint32Array
}

function painted(width: number, height: number): Painted {
    const { canvas, ctx } = createSurface(width, height)
    const image = ctx.createImageData(width, height)
    return { canvas, ctx, image, pixels: new Uint32Array(image.data.buffer) }
}

function disc(radius: number, color: string): Surface {
    const { canvas, ctx } = createSurface(radius * 2 + 1, radius * 2 + 1)
    ctx.fillStyle = color
    for (let dy = -radius; dy <= radius; dy++) {
        const dx = Math.floor(Math.sqrt(radius * radius - dy * dy))
        ctx.fillRect(radius - dx, radius + dy, dx * 2 + 1, 1)
    }
    return canvas
}

/** A fixed scatter in [0, 1): the same stars on every device and every night. */
function hash(n: number): number {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
    return x - Math.floor(x)
}

/** How far a hill strip may slide before it is drawn afresh. */
const HILL_MARGIN = 96

/**
 * One layer of hills, drawn once into a strip wider than the screen. In a
 * bend it slides sideways with the road; only when it has slid further than
 * its margin is it drawn again, one column at a time.
 */
class HillStrip {
    private strip: { canvas: Surface; ctx: CanvasRenderingContext2D } | null = null
    private origin = 0
    private version = -1
    private color = ''

    constructor(
        private readonly rate: number,
        private readonly tallest: number,
        private readonly height: (t: number) => number,
    ) {}

    draw(ctx: CanvasRenderingContext2D, drift: number, color: string): void {
        const shift = Math.round(drift * this.rate)
        if (!this.strip || this.version !== view.version || Math.abs(shift - this.origin) > HILL_MARGIN) {
            this.color = color
            this.build(shift)
        }
        if (color !== this.color) {
            this.recolour(color)
        }
        const strip = this.strip!.canvas
        ctx.drawImage(strip, shift - this.origin - HILL_MARGIN, view.horizon - strip.height)
    }

    private build(shift: number): void {
        this.origin = shift
        this.version = view.version
        const width = view.w + HILL_MARGIN * 2
        const { canvas, ctx } = createSurface(width, this.tallest * 2)
        ctx.fillStyle = this.color
        for (let x = 0; x < width; x++) {
            const h = this.height((x - HILL_MARGIN - shift) / 2) * 2
            ctx.fillRect(x, canvas.height - h, 1, h)
        }
        this.strip = { canvas, ctx }
    }

    /** The same hills in the light of another hour: one fill that keeps their shape. */
    private recolour(color: string): void {
        this.color = color
        const { canvas, ctx } = this.strip!
        ctx.globalCompositeOperation = 'source-in'
        ctx.fillStyle = color
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.globalCompositeOperation = 'source-over'
    }
}

/**
 * Sky, hills, ground and haze. Everything that depends only on the screen
 * row is computed once per layout. The ground is written as spans of pixels
 * into one buffer and handed over in a single call: hundreds of rows of six
 * coloured rectangles each were most of a frame's work on a phone.
 */
export class TrackRenderer {
    private version = -1
    private lightVersion = -1
    private sky!: Painted
    private haze!: Painted
    private sun!: Surface
    private rows: GroundRow[] = []
    private ground: ImageData | null = null
    private readonly farHills = new HillStrip(0.5, 26, (t) =>
        Math.round(15 + Math.sin(t * 0.03) * 6 + Math.sin(t * 0.012) * 5),
    )

    private readonly nearHills = new HillStrip(1, 15, (t) =>
        Math.round(8 + Math.sin(t * 0.044 + 2) * 4 + Math.sin(t * 0.018) * 3),
    )

    private pixels = new Uint32Array(0)
    private readonly slices = new Int32Array(MAX_SLICES * 4)
    private readonly streams = new Float64Array(MAX_STREAMS * 3)
    private readonly wagons: WagonRenderer

    constructor(
        private readonly curve: Curve,
        private readonly projection: Projection,
    ) {
        this.wagons = new WagonRenderer(projection)
    }

    /**
     * `shakeX` because the ground is put, not drawn, and ignores the
     * transform. `things` for the rails, whose bars are drawn into the ground.
     */
    draw(ctx: CanvasRenderingContext2D, travel: number, shakeX: number, things: readonly Thing[], light: Light): void {
        if (this.version !== view.version) {
            this.rebuild(ctx)
        }
        if (this.lightVersion !== light.version) {
            this.relight(light)
        }
        ctx.drawImage(this.sky.canvas, 0, 0)
        this.drawBodies(ctx, light)
        this.drawClouds(ctx, travel, light)
        this.drawHills(ctx, light)
        this.drawGround(ctx, travel, shakeX, things)
    }

    /** Drawn after the objects, so the far ones fade in out of the distance. */
    drawHaze(ctx: CanvasRenderingContext2D): void {
        ctx.drawImage(this.haze.canvas, 0, view.horizon)
    }

    private rebuild(ctx: CanvasRenderingContext2D): void {
        this.version = view.version
        this.lightVersion = -1
        this.sky = painted(view.w, view.horizon + 1)
        this.haze = painted(view.w, Math.max(2, Math.round(view.camY * (FOCAL / Z_MAX))))
        this.rows = this.buildRows()
        this.ground = ctx.createImageData(view.w, Math.max(1, view.h - view.horizon - 1))
        this.pixels = new Uint32Array(this.ground.data.buffer)
    }

    /** A new hour: the sky, the haze and the sun are painted again, the rest takes its colours as it draws. */
    private relight(light: Light): void {
        this.lightVersion = light.version
        this.paintSky(light)
        this.paintHaze(light)
        this.sun = disc(SUN_RADIUS, light.sun)
    }

    /**
     * Three bands with dithered seams between them, and the stars. Written as
     * pixels: drawn as rectangles, the dither alone was thousands of calls,
     * too many to repeat every few metres of a sunset.
     */
    private paintSky(light: Light): void {
        const { pixels, image, ctx } = this.sky
        const width = image.width
        const height = image.height
        const colours = light.sky.map(pixel)
        const seams = SKY_SEAMS.map(([from, to]) => [Math.round(from * height), Math.round(to * height)])

        for (let y = 0; y < height; y++) {
            let band = 0
            let density = 0
            for (let i = 0; i < seams.length; i++) {
                const [y0, y1] = seams[i]
                if (y >= y0) {
                    band = i + 1
                    density = y < y1 ? 1 - (y - y0) / Math.max(1, y1 - y0) : 0
                }
            }
            const lower = colours[band]
            const upper = colours[Math.max(0, band - 1)]
            const pattern = BAYER[y & 3]
            const threshold = density * 16
            const base = y * width
            for (let x = 0; x < width; x++) {
                pixels[base + x] = pattern[x & 3] < threshold ? upper : lower
            }
        }

        this.paintStars(light.stars, width, height)
        ctx.putImageData(image, 0, 0)
    }

    /** Fixed places, so the same stars come out every night; the brightest first. */
    private paintStars(share: number, width: number, height: number): void {
        const pixels = this.sky.pixels
        const count = Math.round(STAR_COUNT * share)
        const bottom = Math.max(8, height - 40)
        for (let i = 0; i < count; i++) {
            const x = Math.floor(hash(i * 2 + 1) * width)
            const y = 4 + Math.floor(Math.pow(hash(i * 2 + 2), 1.4) * (bottom - 4))
            pixels[y * width + x] = STAR
            if (i % 6 === 0 && x > 0 && x < width - 1) {
                pixels[y * width + x - 1] = STAR
                pixels[y * width + x + 1] = STAR
                pixels[(y - 1) * width + x] = STAR
                pixels[(y + 1) * width + x] = STAR
            }
        }
    }

    /** The horizon colour, dithered thinner towards Edgar. */
    private paintHaze(light: Light): void {
        const { pixels, image, ctx } = this.haze
        const width = image.width
        const depth = image.height
        const colour = pixel(light.sky[2])
        pixels.fill(0)
        for (let y = 0; y < depth; y++) {
            const pattern = BAYER[y & 3]
            const threshold = 0.82 * Math.pow(1 - y / depth, 1.4) * 16
            const base = y * width
            for (let x = 0; x < width; x++) {
                if (pattern[x & 3] < threshold) {
                    pixels[base + x] = colour
                }
            }
        }
        ctx.putImageData(image, 0, 0)
    }

    /** Behind the clouds and the hills, so a setting sun sinks behind them. */
    private drawBodies(ctx: CanvasRenderingContext2D, light: Light): void {
        if (light.sunY < view.horizon + SUN_RADIUS) {
            ctx.drawImage(this.sun, light.sunX - SUN_RADIUS, light.sunY - SUN_RADIUS)
        }
        const moon = ART.moon
        if (light.moonY < view.horizon + moon.height / 2) {
            ctx.drawImage(moon, light.moonX - moon.width / 2, light.moonY - moon.height / 2)
        }
    }

    /**
     * A row just below the horizon covers hundreds of stripe periods, so one
     * sample per row is noise that re-rolls every frame. Where the pattern
     * cannot be resolved its contrast fades to the mean, and the lane dashes
     * merge into one solid line so the lanes stay readable.
     */
    private buildRows(): GroundRow[] {
        const grassA = toRgb(PAL.grassAlt)
        const grassB = toRgb(PAL.grass)
        const roadA = toRgb(PAL.roadAlt)
        const roadB = toRgb(PAL.road)
        const rumbleA = toRgb(PAL.rumbleAlt)
        const rumbleB = toRgb(PAL.rumble)
        const line = toRgb(PAL.line)
        const ink = toRgb(PAL.ink)
        const grassMid = mix(grassA, grassB, 0.5)
        const roadMid = mix(roadA, roadB, 0.5)
        const rumbleMid = mix(rumbleA, rumbleB, 0.5)
        const waterA = toRgb(PAL.waterDark)
        const waterB = toRgb(PAL.water)
        const waterMid = mix(waterA, waterB, 0.5)
        const plankA = toRgb(PAL.plankDark)
        const plankB = toRgb(PAL.plank)
        const plankMid = mix(plankA, plankB, 0.5)
        const groundRows = view.h - view.horizon
        const rows: GroundRow[] = []

        for (let y = view.horizon + 1; y < view.h; y++) {
            const dy = y - view.horizon
            const scale = dy / view.camY
            const depthPerRow = (FOCAL * view.camY) / (dy * dy)
            const stripe = quantise(clamp01(1 - depthPerRow / (STRIPE * 0.5)))
            const dash = quantise(clamp01(1 - depthPerRow / (STRIPE * 0.25)))
            // A touch of shade towards the horizon: distance, not a shadow.
            const shade = quantise(clamp01(1 - dy / (groundRows * 0.55))) * DARKEN_MAX
            const tint = (rgb: readonly number[]): number => pixel(mix(rgb, ink, shade))
            const road: [number, number, number][] = [mix(roadMid, roadA, stripe), mix(roadMid, roadB, stripe)]

            rows.push({
                y,
                z: FOCAL / scale,
                scale,
                half: ROAD_HALF * scale,
                rumbleW: Math.max(1, Math.round(RUMBLE_W * scale)),
                lineW: Math.max(1, Math.round(LINE_W * scale)),
                grass: [tint(mix(grassMid, grassA, stripe)), tint(mix(grassMid, grassB, stripe))],
                road: [tint(road[0]), tint(road[1])],
                rumble: [tint(mix(rumbleMid, rumbleA, stripe)), tint(mix(rumbleMid, rumbleB, stripe))],
                lineOn: tint(line),
                lineOff: [tint(mix(road[0], line, 1 - dash)), tint(mix(road[1], line, 1 - dash))],
                water: [tint(mix(waterMid, waterA, stripe)), tint(mix(waterMid, waterB, stripe))],
                bank: tint(toRgb(PAL.bank)),
                plank: [tint(mix(plankMid, plankA, dash)), tint(mix(plankMid, plankB, dash))],
            })
        }
        return rows
    }

    private drawGround(ctx: CanvasRenderingContext2D, travel: number, shakeX: number, things: readonly Thing[]): void {
        const pixels = this.pixels
        const width = view.w
        const streams = this.gatherStreams(things)
        let base = 0
        for (const row of this.rows) {
            const world = row.z + travel
            const band = Math.floor(world / STRIPE) & 1
            const centre = this.projection.centreX(row.z, row.scale)
            const stream = streams > 0 ? this.streamAt(row.z, streams) : -1

            if (stream >= 0 && this.wet(row.z, stream)) {
                const near = this.streams[stream * 3]
                const far = this.streams[stream * 3 + 1]
                const bank = row.z < near + BANK || row.z > far - BANK
                pixels.fill(bank ? row.bank : row.water[band], base, base + width)
            }
            if (stream < 0 || !this.wet(row.z, stream)) {
                const roadX = Math.round(centre - row.half)
                const roadW = Math.max(1, Math.round(row.half * 2))
                const offset = (LANE_W / 2) * row.scale
                const line = (Math.floor(world / (STRIPE * 0.5)) & 1) === 0 ? row.lineOn : row.lineOff[band]

                pixels.fill(row.grass[band], base, base + width)
                span(pixels, base, width, roadX - row.rumbleW, row.rumbleW, row.rumble[band])
                span(pixels, base, width, roadX + roadW, row.rumbleW, row.rumble[band])
                span(pixels, base, width, roadX, roadW, row.road[band])
                span(pixels, base, width, Math.round(centre - offset - row.lineW / 2), row.lineW, line)
                span(pixels, base, width, Math.round(centre + offset - row.lineW / 2), row.lineW, line)
            }
            if (stream >= 0) {
                const x = Math.round(centre + (this.streams[stream * 3 + 2] - BRIDGE_HALF) * row.scale)
                const plank = Math.floor(world / (STRIPE * 0.25)) & 1
                span(pixels, base, width, x, Math.max(1, Math.round(BRIDGE_HALF * 2 * row.scale)), row.plank[plank])
            }
            base += width
        }
        for (let i = 0; i < streams; i++) {
            const x = this.streams[i * 3 + 2]
            const start = this.streams[i * 3] - BRIDGE_MARGIN
            const length = this.streams[i * 3 + 1] - this.streams[i * 3] + BRIDGE_MARGIN * 2
            this.drawBar(x - BRIDGE_HALF, start, length, RAILING_TOP, RAILING)
            this.drawBar(x + BRIDGE_HALF, start, length, RAILING_TOP, RAILING)
        }
        for (const thing of things) {
            if (thing.kind === 'rail') {
                this.drawBar(thing.x, thing.z, thing.length, RAIL_TOP, RAIL)
            }
        }
        for (const thing of things) {
            if (thing.kind === 'wagon') {
                this.wagons.draw(pixels, this.rows.length, thing)
            }
        }
        ctx.putImageData(this.ground!, shakeX, view.horizon + 1)
    }

    /** Near end, far end and bridge lane of each stream in sight, into a buffer kept between frames. */
    private gatherStreams(things: readonly Thing[]): number {
        let count = 0
        for (const thing of things) {
            if (thing.kind !== 'stream' || count === MAX_STREAMS) {
                continue
            }
            this.streams[count * 3] = thing.z
            this.streams[count * 3 + 1] = thing.z + thing.length
            this.streams[count * 3 + 2] = thing.x
            count++
        }
        return count
    }

    /** The stream whose bridge reaches depth `z`, or -1. */
    private streamAt(z: number, count: number): number {
        for (let i = 0; i < count; i++) {
            if (z >= this.streams[i * 3] - BRIDGE_MARGIN && z <= this.streams[i * 3 + 1] + BRIDGE_MARGIN) {
                return i
            }
        }
        return -1
    }

    private wet(z: number, stream: number): boolean {
        return z >= this.streams[stream * 3] && z <= this.streams[stream * 3 + 1]
    }

    /**
     * A bar on posts, one slice per screen row, in three passes: outline,
     * body, shine. One pass per slice would stack the outlines into a ladder.
     * The slices go into a buffer kept from frame to frame: a long rail is
     * hundreds of them, and a fresh array each frame was a steady stream of
     * garbage for a phone to collect.
     */
    private drawBar(x: number, start: number, length: number, top: number, style: BarStyle): void {
        const near = Math.max(start, Z_NEAR * 0.7)
        const far = Math.min(start + length, Z_MAX)
        const slices = this.slices
        let count = 0
        for (let z = far; z >= near && count < MAX_SLICES; z -= Math.max(0.5, (z * z * 0.8) / (FOCAL * (view.camY - top - 2)))) {
            const scale = FOCAL / z
            const width = Math.max(1, Math.round(5 * scale))
            const centre = this.projection.centreX(z, scale) + x * scale
            slices[count * 4] = Math.round(centre - width / 2)
            slices[count * 4 + 1] = Math.round(view.horizon + (view.camY - top - 2) * scale)
            slices[count * 4 + 2] = width
            slices[count * 4 + 3] = Math.max(1, Math.round(2.5 * scale))
            count++
        }
        this.drawPosts(x, start, near, far, top - 1, style)
        this.fillSlices(count, INK, 1, false)
        this.fillSlices(count, style.body, 0, false)
        this.fillSlices(count, style.shine, 0, true)
    }

    /**
     * The posts, far to near, before the bar: a nearer stretch of bar has to
     * hide the top of a post behind it, which a sprite drawn later could not.
     */
    private drawPosts(x: number, start: number, near: number, far: number, height: number, style: BarStyle): void {
        const first = start + Math.floor((far - start) / RAIL_POST_EVERY) * RAIL_POST_EVERY
        for (let z = first; z >= near; z -= RAIL_POST_EVERY) {
            const scale = FOCAL / z
            const width = Math.max(1, Math.round(3 * scale))
            const left = Math.round(this.projection.centreX(z, scale) + x * scale - width / 2)
            const bottom = Math.round(view.horizon + view.camY * scale)
            const top = Math.round(view.horizon + (view.camY - height) * scale)
            this.fillBox(left - 1, top - 1, width + 2, bottom - top + 2, INK)
            this.fillBox(left, top, width, bottom - top, style.body)
            this.fillBox(left + width - Math.max(1, Math.round(scale)), top, Math.max(1, Math.round(scale)), bottom - top, style.dark)
        }
    }

    /** A rectangle in screen coordinates, into the ground buffer. */
    private fillBox(left: number, top: number, width: number, height: number, color: number): void {
        const rows = this.rows.length
        const first = top - (view.horizon + 1)
        for (let row = Math.max(0, first); row < Math.min(rows, first + height); row++) {
            span(this.pixels, row * view.w, view.w, left, width, color)
        }
    }

    private fillSlices(count: number, color: number, grow: number, shine: boolean): void {
        const rows = this.rows.length
        const width = view.w
        for (let i = 0; i < count; i++) {
            const left = this.slices[i * 4] - grow
            const top = this.slices[i * 4 + 1] - grow - (view.horizon + 1)
            const height = shine ? 1 : this.slices[i * 4 + 3] + grow * 2
            const length = this.slices[i * 4 + 2] + grow * 2
            for (let row = Math.max(0, top); row < Math.min(rows, top + height); row++) {
                span(this.pixels, row * width, width, left, length, color)
            }
        }
    }

    private drawHills(ctx: CanvasRenderingContext2D, light: Light): void {
        this.farHills.draw(ctx, this.curve.drift, light.hillDark)
        this.nearHills.draw(ctx, this.curve.drift, light.hill)
    }

    private drawClouds(ctx: CanvasRenderingContext2D, travel: number, light: Light): void {
        const span = view.w + 140
        const drift = travel * 0.004 - this.curve.drift * 0.3
        const count = Math.ceil(view.w / 160)
        for (let i = 0; i < count; i++) {
            let x = (i * 194 + 20 - drift) % span
            if (x < 0) {
                x += span
            }
            const cx = Math.round(x) - 70
            const cy = Math.round(view.horizon * (0.2 + (i % 3) * 0.17))
            const w = (22 + (i % 2) * 12) * 2
            ctx.fillStyle = light.cloud
            ctx.fillRect(cx, cy + 4, w, 8)
            ctx.fillRect(cx + 8, cy, w - 20, 6)
            ctx.fillStyle = light.cloudDark
            ctx.fillRect(cx + 4, cy + 12, w - 8, 2)
        }
    }
}

/** One run of a colour within a row of the ground, clipped to the screen. */
function span(pixels: Uint32Array, base: number, width: number, x: number, length: number, color: number): void {
    const from = Math.max(0, x)
    const to = Math.min(width, x + length)
    if (to > from) {
        pixels.fill(color, base + from, base + to)
    }
}
