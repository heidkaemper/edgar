import { CAPE_FRAMES, JAR_SIZE, MAGNET_FRAMES, TURBO_FRAMES } from '../config'
import type { Game } from '../core/Game'
import { view } from '../track/View'
import type { Ability } from './Art'
import { ART } from './Art'
import { drawText } from './Font'
import { PAL } from './Palette'
import type { Surface } from './Surface'

const MARGIN = 10
const PAUSE_W = 26
const PAUSE_H = 24
const JAR_SCALE = 2
const DURATION: Record<Ability, number> = { helmet: 1, cape: CAPE_FRAMES, magnet: MAGNET_FRAMES, turbo: TURBO_FRAMES }

/**
 * Distance on the left, the acorn jar on the right, the pause button in the
 * middle. On a wide screen the corners lie in the scenery beside the road,
 * on a tall one in the sky above it; the same corners serve both.
 */
export class Hud {
    draw(ctx: CanvasRenderingContext2D, game: Game, touch: boolean): void {
        this.drawDistance(ctx, game.metres)
        if (touch) {
            this.drawPause(ctx)
        }
        const jarBottom = this.drawJar(ctx, game)
        this.drawAbilities(ctx, game, jarBottom + 6)
        if (game.toastTimer > 0) {
            this.drawToast(ctx, game)
        }
    }

    hitsPause(x: number, y: number): boolean {
        const left = view.w / 2 - PAUSE_W / 2
        return x >= left - 8 && x <= left + PAUSE_W + 8 && y <= MARGIN + PAUSE_H + 10
    }

    private drawDistance(ctx: CanvasRenderingContext2D, metres: number): void {
        drawText(ctx, `${metres} M`, MARGIN + 2, MARGIN + 4, { color: PAL.hud, outline: PAL.ink, scale: 2 })
    }

    private drawPause(ctx: CanvasRenderingContext2D): void {
        const left = Math.round(view.w / 2 - PAUSE_W / 2)
        ctx.globalAlpha = 0.6
        ctx.fillStyle = PAL.hudDim
        ctx.fillRect(left, MARGIN, PAUSE_W, PAUSE_H)
        ctx.globalAlpha = 1
        ctx.fillStyle = PAL.hud
        ctx.fillRect(left + 8, MARGIN + 6, 3, 12)
        ctx.fillRect(left + 15, MARGIN + 6, 3, 12)
    }

    /** The jar fills with acorns; the ability it is about to give sits beside it. */
    private drawJar(ctx: CanvasRenderingContext2D, game: Game): number {
        const jar = ART.jar
        const w = jar.width * JAR_SCALE
        const h = jar.height * JAR_SCALE
        const x = view.w - MARGIN - w
        const y = MARGIN

        // Inside of the glass, in jar pixels, outline included.
        const insideTop = 5
        const insideBottom = 19
        const level = Math.round(((insideBottom - insideTop) * game.jar) / JAR_SIZE)
        ctx.globalAlpha = 0.45
        ctx.fillStyle = PAL.glass
        ctx.fillRect(x + 2 * JAR_SCALE, y + insideTop * JAR_SCALE, 14 * JAR_SCALE, (insideBottom - insideTop) * JAR_SCALE)
        ctx.globalAlpha = 1
        if (level > 0) {
            const top = y + (insideBottom - level) * JAR_SCALE
            ctx.fillStyle = PAL.acorn
            ctx.fillRect(x + 2 * JAR_SCALE, top, 14 * JAR_SCALE, level * JAR_SCALE)
            ctx.fillStyle = PAL.acornCap
            for (let row = 0; row < level; row += 3) {
                const offset = (row / 3) % 2 === 0 ? 0 : 3
                for (let col = 1 + offset; col < 13; col += 6) {
                    ctx.fillRect(x + (2 + col) * JAR_SCALE, top + row * JAR_SCALE, 2 * JAR_SCALE, JAR_SCALE)
                }
            }
            ctx.fillStyle = PAL.acornLight
            ctx.fillRect(x + 2 * JAR_SCALE, top, 14 * JAR_SCALE, JAR_SCALE)
        }
        ctx.drawImage(jar, x, y, w, h)

        const icon = ART.icons[game.next]
        const full = game.jar >= JAR_SIZE - 3 && Math.floor(game.frame / 8) % 2 === 0
        drawScaled(ctx, icon, x - icon.width * 2 - 4, y + 10 + (full ? -2 : 0), 2)
        return y + h
    }

    /** What Edgar wears or uses right now, each with a bar running down. */
    private drawAbilities(ctx: CanvasRenderingContext2D, game: Game, top: number): void {
        const right = view.w - MARGIN
        let y = top
        if (game.helmet) {
            drawScaled(ctx, ART.icons.helmet, right - ART.icons.helmet.width * 2, y, 2)
            y += ART.icons.helmet.height * 2 + 6
        }
        if (!game.power || game.powerEnding) {
            return
        }
        const icon = ART.icons[game.power]
        const iconX = right - icon.width * 2
        drawScaled(ctx, icon, iconX, y, 2)
        const share = game.powerTimer / DURATION[game.power]
        const barW = 40
        const barX = iconX - barW - 6
        const barY = y + icon.height - 3
        ctx.fillStyle = PAL.ink
        ctx.fillRect(barX - 1, barY - 1, barW + 2, 8)
        ctx.fillStyle = PAL.hudDim
        ctx.fillRect(barX, barY, barW, 6)
        ctx.fillStyle = PAL.helmet
        ctx.fillRect(barX + barW - Math.round(barW * share), barY, Math.round(barW * share), 6)
    }

    private drawToast(ctx: CanvasRenderingContext2D, game: Game): void {
        const rise = Math.max(0, 80 - game.toastTimer - 60)
        const y = Math.round(view.horizon * 0.55) - rise
        drawText(ctx, game.toast, view.w / 2, Math.max(44, y), {
            color: PAL.helmet,
            outline: PAL.ink,
            align: 'center',
            scale: 3,
        })
    }
}

function drawScaled(ctx: CanvasRenderingContext2D, image: Surface, x: number, y: number, scale: number): void {
    ctx.drawImage(image, Math.round(x), Math.round(y), image.width * scale, image.height * scale)
}
