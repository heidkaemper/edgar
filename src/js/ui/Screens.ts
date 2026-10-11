import type { Game } from '../core/Game'
import { drawText } from '../render/Font'
import { PAL } from '../render/Palette'
import { view } from '../track/View'

const CHOICES = ['1 SPIELER', '2 SPIELER']
const SIDES = ['LINKS', 'RECHTS']
const PAUSE_ENTRIES = ['WEITER', 'HAUPTMENÜ']
/** Big enough for a thumb, small enough that both fit side by side in portrait. */
const BUTTON_W = 136
const BUTTON_H = 40
const BUTTON_GAP = 16

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
                this.paused(ctx, game)
                break
            case 'over':
                if (game.players > 1) {
                    this.result(ctx, game)
                    break
                }
                this.over(ctx, game)
                break
        }
    }

    /** At the start of a race, each half names what steers it. */
    seat(ctx: CanvasRenderingContext2D, hint: string): void {
        drawText(ctx, hint, view.w / 2, view.h - view.padBottom - 30, { color: PAL.hud, outline: PAL.ink, align: 'center', scale: 2 })
    }

    /** Where Edgar will stand: his name once claimed, a call to press for the next free half. */
    join(ctx: CanvasRenderingContext2D, game: Game, pane: number): void {
        const device = game.devices[pane]
        if (device) {
            this.seat(ctx, device)
            return
        }
        if (pane !== game.devices.length) {
            return
        }
        const cx = view.w / 2
        if (Math.floor(game.frame / 30) % 2 === 0) {
            drawText(ctx, 'TASTE DRÜCKEN', cx, view.feetY - 40, { color: PAL.white, outline: PAL.ink, align: 'center', scale: 2 })
        }
        drawText(ctx, 'MENÜ: PAUSE', cx, view.h - view.padBottom - 14, { color: PAL.hud, outline: PAL.ink, align: 'center' })
    }

    private title(ctx: CanvasRenderingContext2D, game: Game, hint: string): void {
        const cx = view.w / 2
        const top = Math.max(view.padTop + 26, Math.round(view.horizon * 0.22))
        drawText(ctx, 'EDGAR!', cx, top, { color: PAL.pigLight, outline: PAL.ink, shadow: PAL.pigDeep, align: 'center', scale: 6 })

        const prompt = Math.min(view.h - view.padBottom - 34, view.feetY + 18)
        if (game.canRace) {
            this.menu(ctx, game, prompt)
        }
        if (!game.canRace && Math.floor(game.frame / 30) % 2 === 0) {
            drawText(ctx, 'TIPPEN ZUM STARTEN', cx, prompt, { color: PAL.hud, outline: PAL.ink, align: 'center', scale: 2 })
        }
        drawText(ctx, hint, cx, view.h - view.padBottom - 14, { color: PAL.hud, outline: PAL.ink, align: 'center' })
        if (game.best > 0) {
            drawText(ctx, `REKORD ${game.best} M`, cx, top + 60, { color: PAL.helmet, outline: PAL.ink, align: 'center', scale: 2 })
        }
    }

    /** The entries side by side; the one the cursor is on is lit and blinks. */
    private menu(ctx: CanvasRenderingContext2D, game: Game, y: number): void {
        const spacing = Math.min(150, view.w / 2 - 20)
        CHOICES.forEach((label, index) => {
            const x = view.w / 2 + (index - 0.5) * spacing
            const chosen = index === game.choice
            if (chosen && Math.floor(game.frame / 30) % 2 === 1) {
                return
            }
            drawText(ctx, label, x, y, { color: chosen ? PAL.helmet : PAL.hud, outline: PAL.ink, align: 'center', scale: 2 })
        })
    }

    /** The pause entry under a tap, or -1 for none. Edges are generous: a thumb is no cursor. */
    entryAt(x: number, y: number): number {
        const top = this.entryTop()
        if (y < top - 8 || y > top + BUTTON_H + 8) {
            return -1
        }
        return PAUSE_ENTRIES.findIndex((_, index) => x >= this.entryLeft(index) - 8 && x <= this.entryLeft(index) + BUTTON_W + 8)
    }

    /** Buttons for a finger; with keys or a pad the one the cursor is on is lit. */
    private paused(ctx: CanvasRenderingContext2D, game: Game): void {
        this.dim(ctx)
        const cx = (view.w * view.panes) / 2
        const cy = Math.round(view.h * 0.4)
        drawText(ctx, 'PAUSE', cx, cy, { color: PAL.white, outline: PAL.ink, align: 'center', scale: 4 })

        const top = this.entryTop()
        PAUSE_ENTRIES.forEach((label, index) => {
            const left = this.entryLeft(index)
            const lit = !game.touch && index === game.pauseChoice
            ctx.globalAlpha = 0.82
            ctx.fillStyle = PAL.hudDim
            ctx.fillRect(left, top, BUTTON_W, BUTTON_H)
            ctx.globalAlpha = 1
            ctx.strokeStyle = lit ? PAL.helmet : PAL.ink
            ctx.lineWidth = 2
            ctx.strokeRect(left + 1, top + 1, BUTTON_W - 2, BUTTON_H - 2)
            drawText(ctx, label, left + BUTTON_W / 2, top + (BUTTON_H - 14) / 2, { color: lit ? PAL.helmet : PAL.hud, align: 'center', scale: 2 })
        })
    }

    private entryTop(): number {
        return Math.round(view.h * 0.4) + 48
    }

    private entryLeft(index: number): number {
        const cx = (view.w * view.panes) / 2
        return Math.round(cx - BUTTON_W - BUTTON_GAP / 2 + index * (BUTTON_W + BUTTON_GAP))
    }

    private over(ctx: CanvasRenderingContext2D, game: Game): void {
        const runner = game.runners[0]
        const cx = view.w / 2
        const y = this.panel(ctx, 150)

        drawText(ctx, 'BELLO HAT DICH!', cx, y + 14, { color: PAL.pigLight, outline: PAL.ink, align: 'center', scale: 3 })
        drawText(ctx, `STRECKE ${runner.metres} M`, cx, y + 52, { color: PAL.white, align: 'center', scale: 2 })
        drawText(ctx, `EICHELN ${runner.acorns}`, cx, y + 74, { color: PAL.acornLight, align: 'center', scale: 2 })
        const record = game.newBest ? 'NEUER REKORD!' : `REKORD ${game.best} M`
        drawText(ctx, record, cx, y + 96, { color: PAL.helmet, align: 'center', scale: 2 })
        this.again(ctx, game, y + 124)
    }

    /** Whoever Bello did not catch wins; both caught at once is a draw. */
    private result(ctx: CanvasRenderingContext2D, game: Game): void {
        const cx = (view.w * view.panes) / 2
        const y = this.panel(ctx, 110)

        const winner = game.winner
        const headline = winner < 0 ? 'UNENTSCHIEDEN!' : `${SIDES[winner]} GEWINNT!`
        drawText(ctx, headline, cx, y + 14, { color: PAL.helmet, outline: PAL.ink, align: 'center', scale: 3 })
        drawText(ctx, `STRECKE ${game.raceMetres} M`, cx, y + 52, { color: PAL.white, align: 'center', scale: 2 })
        this.again(ctx, game, y + 84)
    }

    /** With keys or a pad the way back to the menu is the pause button; a finger only ever plays alone. */
    private again(ctx: CanvasRenderingContext2D, game: Game, y: number): void {
        if (game.stateFrame <= 45 || Math.floor(game.frame / 30) % 2 === 1) {
            return
        }
        const cx = (view.w * view.panes) / 2
        if (!game.canRace) {
            drawText(ctx, 'NOCHMAL: TIPPEN', cx, y, { color: PAL.hud, align: 'center', scale: 2 })
            return
        }
        drawText(ctx, 'NOCHMAL: SPRINGEN   MENÜ: PAUSE', cx, y + 4, { color: PAL.hud, align: 'center' })
    }

    /** A dark band across the middle of the playfield; returns its top. */
    private panel(ctx: CanvasRenderingContext2D, height: number): number {
        const cx = (view.w * view.panes) / 2
        const width = Math.min(view.w * view.panes - 24, 320)
        const x = Math.round(cx - width / 2)
        const y = Math.round(Math.max(view.padTop + 12, view.horizon * 0.5 - 40))

        ctx.globalAlpha = 0.82
        ctx.fillStyle = PAL.hudDim
        ctx.fillRect(x, y, width, height)
        ctx.globalAlpha = 1
        ctx.fillStyle = PAL.ink
        ctx.fillRect(x, y, width, 2)
        ctx.fillRect(x, y + height - 2, width, 2)
        return y
    }

    private dim(ctx: CanvasRenderingContext2D): void {
        ctx.globalAlpha = 0.55
        ctx.fillStyle = PAL.hudDim
        ctx.fillRect(0, 0, view.w * view.panes, view.h)
        ctx.globalAlpha = 1
    }
}
