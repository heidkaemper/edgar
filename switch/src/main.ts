import { Sound } from '@game/audio/Sound'
import { Game } from '@game/core/Game'
import { Input } from '@game/core/Input'
import { Loop } from '@game/core/Loop'
import { createSurface } from '@game/render/Surface'
import { layoutView, view } from '@game/track/View'
import { bindSwitchInput, nxScreen } from './Switch'

/**
 * The Switch entry point. 1280 x 720 is the landscape view of 640 x 360 twice
 * over, so the picture is a whole-pixel blit and there is nothing to letterbox.
 * A race for two stands two taller views side by side and scales them to fit.
 */
layoutView(nxScreen.width / nxScreen.height)
const SCALE = nxScreen.width / view.w

const screenCtx = nxScreen.getContext('2d')
screenCtx.imageSmoothingEnabled = false

// The game draws into a playfield of its own, exactly as it does in a browser.
let frame = createSurface(view.w, view.h)
let fitted = view.version

function fit(): void {
    frame = createSurface(view.w * view.panes, view.h)
    frame.ctx.imageSmoothingEnabled = false
    fitted = view.version
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
        screenCtx.drawImage(frame.canvas, 0, 0, nxScreen.width, nxScreen.height)
    },
)
loop.start()
