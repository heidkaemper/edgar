import '../css/style.css'
import { Sound } from './audio/Sound'
import { Game } from './core/Game'
import { Input } from './core/Input'
import { Loop } from './core/Loop'
import { bindWebInput } from './platform/Web'
import { validateChunks } from './track/Chunks'
import { drawText } from './render/Font'
import { layoutView, view } from './track/View'

const stage = document.getElementById('stage') as HTMLDivElement
const canvas = document.getElementById('game') as HTMLCanvasElement
const insets = document.getElementById('insets') as HTMLDivElement
const ctx = canvas.getContext('2d', { alpha: false })!

let scale = 1

const sound = new Sound()
const input = new Input()
// Audio may only start after a user gesture. A gamepad button is not one the
// browser accepts, so every key and touch tries again.
input.onFirstInput = () => sound.unlock()
addEventListener('pointerdown', () => sound.unlock())
addEventListener('keydown', () => sound.unlock())
// iOS only lets audio start from the end of a touch, not its beginning.
addEventListener('touchend', () => sound.unlock())

/** A phone must not dim and lock in the middle of a run. */
let wakeLock: { release(): Promise<void> } | null = null
async function stayAwake(): Promise<void> {
    if (wakeLock || document.hidden || !('wakeLock' in navigator)) {
        return
    }
    try {
        wakeLock = await (navigator as unknown as { wakeLock: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock.request('screen')
    } catch {
        // Refused, for example on battery saver: the screen may dim, the game still runs.
    }
}
addEventListener('pointerdown', () => void stayAwake())

document.addEventListener('visibilitychange', () => {
    sound.suspend(document.hidden)
    // The lock is dropped whenever the page is hidden and must be asked for again.
    wakeLock = null
    void stayAwake()
})
bindWebInput(input, stage, (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect()
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale }
})

/** The layout the canvas was last fitted to; a race for two changes it without a resize. */
let fitted = -1

/**
 * The short side is 360 and the long one follows the screen, so the picture
 * fills a phone held either way. Whole steps keep the pixels square where
 * the screen has room for a letterbox; a phone has not.
 */
function resize(): void {
    layoutView(stage.clientWidth / Math.max(1, stage.clientHeight))
    fitted = view.version
    const width = view.w * view.panes
    const raw = Math.min(stage.clientWidth / width, stage.clientHeight / view.h)
    scale = raw >= 3 ? Math.floor(raw) : raw

    if (canvas.width !== width || canvas.height !== view.h) {
        // Resizing a canvas resets its context, image smoothing included.
        canvas.width = width
        canvas.height = view.h
    }
    ctx.imageSmoothingEnabled = false
    canvas.style.width = `${Math.round(width * scale)}px`
    canvas.style.height = `${Math.round(view.h * scale)}px`

    const { paddingTop, paddingBottom } = getComputedStyle(insets)
    view.padTop = Math.ceil(parseFloat(paddingTop) / scale)
    view.padBottom = Math.ceil(parseFloat(paddingBottom) / scale)
    if (import.meta.env.DEV) {
        document.title = `Edgar ${view.w}x${view.h} @${scale.toFixed(2)} stage ${stage.clientWidth}x${stage.clientHeight}`
    }
}

addEventListener('resize', resize)
addEventListener('orientationchange', () => setTimeout(resize, 120))
resize()

const game = new Game(ctx, input, sound)

if (import.meta.env.DEV) {
    const problems = validateChunks()
    if (problems.length > 0) {
        console.warn('Chunks:', problems)
    }
    const debug = game.debug()
    ;(window as unknown as Record<string, unknown>).__debug = debug

    // ?run&warp=600&give=cape&stumble — reach any state for a screenshot.
    const params = new URLSearchParams(location.search)
    if (params.has('run')) {
        debug.start(Number(params.get('seed') ?? 7) as never, (params.has('two') ? 2 : 1) as never)
    }
    if (params.has('ghost')) {
        debug.ghost()
    }
    const chunk = params.get('chunk')
    if (chunk) {
        debug.chunk(chunk as never)
    }
    const give = params.get('give')
    if (give) {
        debug.give(give as never)
    }
    if (params.has('warp')) {
        debug.warp(Number(params.get('warp')) as never)
    }
    if (params.has('stumble')) {
        debug.stumble()
    }
    if (params.has('metres')) {
        debug.metres(Number(params.get('metres')) as never)
    }
    if (params.has('fly')) {
        debug.fly(Number(params.get('fly')) as never)
    }
    if (params.has('rails')) {
        debug.rails()
    }
    if (params.has('splash')) {
        debug.splash()
    }
    if (params.has('after')) {
        debug.warp(Number(params.get('after')) as never)
    }
}

// ?fps — frames per second and the slowest frame of the last second, for
// judging performance on a phone. Dev only.
const showFps = import.meta.env.DEV && new URLSearchParams(location.search).has('fps')
let fpsFrames = 0
let fpsWorst = 0
let fpsLast = performance.now()
let fpsText = ''
let fpsSecond = performance.now()

const loop = new Loop(
    () => game.update(),
    () => {
        if (view.version !== fitted) {
            resize()
        }
        game.render()
        if (!showFps) {
            return
        }
        const now = performance.now()
        fpsWorst = Math.max(fpsWorst, now - fpsLast)
        fpsLast = now
        fpsFrames++
        if (now - fpsSecond >= 1000) {
            fpsText = `${fpsFrames} FPS  ${Math.round(fpsWorst)} MS`
            fpsFrames = 0
            fpsWorst = 0
            fpsSecond = now
        }
        drawText(ctx, fpsText, 6, view.h - view.padBottom - 12, { color: '#ffffff', outline: '#000000' })
    },
)
loop.start()
