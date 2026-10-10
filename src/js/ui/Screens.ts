import type { Game } from '../core/Game'
import { drawText } from '../render/Font'
import { PAL } from '../render/Palette'
import { view } from '../track/View'

/**
 * Title, pause and the end, drawn onto the playfield itself. The world keeps
 * moving behind the title, so the first thing a child sees is Edgar rolling.
 */
export class Screens {
    draw(ctx: CanvasRenderingContext2D, game: Game, hint: string): void {
        switch (game.state) {
            case 'title':
                this.title(ctx, game, hint)
                break
            case 'paused':
                this.paused(ctx)
                break
            case 'over':
                this.over(ctx, game)
                break
        }
    }

    private title(ctx: CanvasRenderingContext2D, game: Game, hint: string): void {
        const cx = view.w / 2
        const top = Math.max(view.padTop + 26, Math.round(view.horizon * 0.22))
        drawText(ctx, 'EDGAR!', cx, top, { color: PAL.pigLight, outline: PAL.ink, shadow: PAL.pigDeep, align: 'center', scale: 6 })

        const prompt = view.feetY + 18
        if (Math.floor(game.frame / 30) % 2 === 0) {
            drawText(ctx, 'TIPPEN ZUM STARTEN', cx, Math.min(view.h - view.padBottom - 34, prompt), {
                color: PAL.hud,
                outline: PAL.ink,
                align: 'center',
                scale: 2,
            })
        }
        drawText(ctx, hint, cx, view.h - view.padBottom - 14, { color: PAL.hud, outline: PAL.ink, align: 'center' })
        if (game.best > 0) {
            drawText(ctx, `REKORD ${game.best} M`, cx, top + 60, { color: PAL.helmet, outline: PAL.ink, align: 'center', scale: 2 })
        }
    }

    private paused(ctx: CanvasRenderingContext2D): void {
        this.dim(ctx)
        const cy = Math.round(view.h * 0.4)
        drawText(ctx, 'PAUSE', view.w / 2, cy, { color: PAL.white, outline: PAL.ink, align: 'center', scale: 4 })
        drawText(ctx, 'TIPPEN ZUM WEITERFAHREN', view.w / 2, cy + 44, { color: PAL.hud, outline: PAL.ink, align: 'center', scale: 2 })
    }

    private over(ctx: CanvasRenderingContext2D, game: Game): void {
        const cx = view.w / 2
        const panelW = Math.min(view.w - 24, 320)
        const panelH = 150
        const x = Math.round(cx - panelW / 2)
        const y = Math.round(Math.max(view.padTop + 12, view.horizon * 0.5 - 40))

        ctx.globalAlpha = 0.82
        ctx.fillStyle = PAL.hudDim
        ctx.fillRect(x, y, panelW, panelH)
        ctx.globalAlpha = 1
        ctx.fillStyle = PAL.ink
        ctx.fillRect(x, y, panelW, 2)
        ctx.fillRect(x, y + panelH - 2, panelW, 2)

        drawText(ctx, 'BELLO HAT DICH!', cx, y + 14, { color: PAL.pigLight, outline: PAL.ink, align: 'center', scale: 3 })
        drawText(ctx, `STRECKE ${game.metres} M`, cx, y + 52, { color: PAL.white, align: 'center', scale: 2 })
        drawText(ctx, `EICHELN ${game.acorns}`, cx, y + 74, { color: PAL.acornLight, align: 'center', scale: 2 })
        const record = game.newBest ? 'NEUER REKORD!' : `REKORD ${game.best} M`
        drawText(ctx, record, cx, y + 96, { color: PAL.helmet, align: 'center', scale: 2 })

        if (game.stateFrame > 45 && Math.floor(game.frame / 30) % 2 === 0) {
            drawText(ctx, 'NOCHMAL: TIPPEN', cx, y + 124, { color: PAL.hud, align: 'center', scale: 2 })
        }
    }

    private dim(ctx: CanvasRenderingContext2D): void {
        ctx.globalAlpha = 0.55
        ctx.fillStyle = PAL.hudDim
        ctx.fillRect(0, 0, view.w, view.h)
        ctx.globalAlpha = 1
    }
}
