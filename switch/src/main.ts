import { Sound } from '@game/audio/Sound'
import { Game } from '@game/core/Game'
import { Input } from '@game/core/Input'
import { Loop } from '@game/core/Loop'
import { PAL } from '@game/render/Palette'
import { createSurface } from '@game/render/Surface'
import { layoutView, view } from '@game/track/View'
import { bindSwitchInput, nxScreen } from './Switch'

/**
 * The Switch entry point. 1280 x 720 is the landscape view of 640 x 360 twice
 * over, so the picture is a whole-pixel blit and there is nothing to letterbox.
 * A race for two stands two taller views side by side, scaled evenly to fit
 * between bars.
 */
layoutView(nxScreen.width / nxScreen.height)
const SCALE = nxScreen.width / view.w

const screenCtx = nxScreen.getContext('2d')
screenCtx.imageSmoothingEnabled = false

// The game draws into a playfield of its own, exactly as it does in a browser.
let frame = createSurface(view.w, view.h)
let fitted = view.version
let placement = { x: 0, y: 0, w: nxScreen.width, h: nxScreen.height }

function fit(): void {
    const width = view.w * view.panes
    frame = createSurface(width, view.h)
    frame.ctx.imageSmoothingEnabled = false
    fitted = view.version

    const scale = Math.min(nxScreen.width / width, nxScreen.height / view.h)
    const w = Math.round(width * scale)
    const h = Math.round(view.h * scale)
    placement = { x: Math.round((nxScreen.width - w) / 2), y: Math.round((nxScreen.height - h) / 2), w, h }
}
fit()

const sound = new Sound()
const input = new Input()
// Touch only plays alone, on the single landscape view this scale belongs to.
bindSwitchInput(input, SCALE)
// No gesture is needed to start audio here, and no pointer could give one.
sound.unlock()

const game = new Game(frame.ctx, input, sound)

const loop = new Loop(
    () => game.update(),
    () => {
        if (view.version !== fitted) {
            fit()
            game.ctx = frame.ctx
        }
        game.render()
        if (placement.w < nxScreen.width || placement.h < nxScreen.height) {
            screenCtx.fillStyle = PAL.ink
            screenCtx.fillRect(0, 0, nxScreen.width, nxScreen.height)
        }
        screenCtx.drawImage(frame.canvas, placement.x, placement.y, placement.w, placement.h)
    },
)
loop.start()
