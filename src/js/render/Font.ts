import type { Surface } from './Surface'
import { createSurface } from './Surface'

/**
 * 5x7 arcade bitmap font: at this resolution `fillText` blurs. Seven rows of
 * 0/1 per glyph, separated by slashes.
 */
const GLYPHS: Record<string, string> = {
    A: '01110/10001/10001/11111/10001/10001/10001',
    B: '11110/10001/10001/11110/10001/10001/11110',
    C: '01110/10001/10000/10000/10000/10001/01110',
    D: '11110/10001/10001/10001/10001/10001/11110',
    E: '11111/10000/10000/11110/10000/10000/11111',
    F: '11111/10000/10000/11110/10000/10000/10000',
    G: '01110/10001/10000/10111/10001/10001/01111',
    H: '10001/10001/10001/11111/10001/10001/10001',
    I: '11111/00100/00100/00100/00100/00100/11111',
    J: '00111/00010/00010/00010/00010/10010/01100',
    K: '10001/10010/10100/11000/10100/10010/10001',
    L: '10000/10000/10000/10000/10000/10000/11111',
    M: '10001/11011/10101/10101/10001/10001/10001',
    N: '10001/11001/10101/10011/10001/10001/10001',
    O: '01110/10001/10001/10001/10001/10001/01110',
    P: '11110/10001/10001/11110/10000/10000/10000',
    Q: '01110/10001/10001/10001/10101/10010/01101',
    R: '11110/10001/10001/11110/10100/10010/10001',
    S: '01111/10000/10000/01110/00001/00001/11110',
    T: '11111/00100/00100/00100/00100/00100/00100',
    U: '10001/10001/10001/10001/10001/10001/01110',
    V: '10001/10001/10001/10001/10001/01010/00100',
    W: '10001/10001/10001/10101/10101/11011/10001',
    X: '10001/10001/01010/00100/01010/10001/10001',
    Y: '10001/10001/01010/00100/00100/00100/00100',
    Z: '11111/00001/00010/00100/01000/10000/11111',
    '0': '01110/10001/10011/10101/11001/10001/01110',
    '1': '00100/01100/00100/00100/00100/00100/01110',
    '2': '01110/10001/00001/00010/00100/01000/11111',
    '3': '11111/00010/00100/00010/00001/10001/01110',
    '4': '00010/00110/01010/10010/11111/00010/00010',
    '5': '11111/10000/11110/00001/00001/10001/01110',
    '6': '00110/01000/10000/11110/10001/10001/01110',
    '7': '11111/00001/00010/00100/01000/01000/01000',
    '8': '01110/10001/10001/01110/10001/10001/01110',
    '9': '01110/10001/10001/01111/00001/00010/01100',
    ' ': '00000/00000/00000/00000/00000/00000/00000',
    '.': '00000/00000/00000/00000/00000/01100/01100',
    ',': '00000/00000/00000/00000/01100/01100/01000',
    '!': '00100/00100/00100/00100/00100/00000/00100',
    '?': '01110/10001/00001/00010/00100/00000/00100',
    ':': '00000/01100/01100/00000/01100/01100/00000',
    '-': '00000/00000/00000/11111/00000/00000/00000',
    '/': '00001/00010/00010/00100/01000/01000/10000',
    '+': '00000/00100/00100/11111/00100/00100/00000',
    '%': '11001/11010/00010/00100/01000/01011/10011',
    '(': '00010/00100/01000/01000/01000/00100/00010',
    ')': '01000/00100/00010/00010/00010/00100/01000',
    "'": '00100/00100/00000/00000/00000/00000/00000',
    // Six rows of body under the dots, not five. With a blank row between
    // them the letter sat so low that LÖSCHEN read as a lowercase slip.
    Ä: '01010/01110/10001/11111/10001/10001/10001',
    Ö: '01010/01110/10001/10001/10001/10001/01110',
    Ü: '01010/10001/10001/10001/10001/10001/01110',
    ß: '01110/10001/10001/11110/10001/10001/11110',
    // heart
    '♥': '01010/11111/11111/11111/01110/00100/00000',
    // coin
    '¤': '00000/01110/10101/10101/10101/01110/00000',
}

export const GLYPH_W = 5
export const GLYPH_H = 7
/** One pixel of space between characters. */
export const LETTER_SPACING = 1

const cache = new Map<string, Surface>()

function glyphCanvas(ch: string, color: string): Surface {
    const key = ch + color
    const hit = cache.get(key)
    if (hit) {
        return hit
    }

    const { canvas, ctx } = createSurface(GLYPH_W, GLYPH_H)
    const rows = (GLYPHS[ch] ?? GLYPHS['?']).split('/')
    ctx.fillStyle = color
    for (let y = 0; y < rows.length; y++) {
        for (let x = 0; x < rows[y].length; x++) {
            if (rows[y][x] === '1') {
                ctx.fillRect(x, y, 1, 1)
            }
        }
    }
    cache.set(key, canvas)
    return canvas
}

export function textWidth(text: string, scale = 1): number {
    if (text.length === 0) {
        return 0
    }
    return (text.length * (GLYPH_W + LETTER_SPACING) - LETTER_SPACING) * scale
}

export interface TextOptions {
    color?: string
    /** Dark outline, which keeps text readable on any background. */
    outline?: string | null
    /** Hard drop shadow, offset downwards. */
    shadow?: string | null
    align?: 'left' | 'center' | 'right'
    /** Whole screen pixels per font pixel. */
    scale?: number
}

export function drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    opts: TextOptions = {},
): void {
    const { color = '#fcfcfc', outline = null, shadow = null, align = 'left', scale = 1 } = opts
    // Uppercase only, on purpose: it hits the arcade tone better than a
    // half-hearted lowercase set would.
    const upper = text.toUpperCase()
    const w = textWidth(upper, scale)
    const gw = GLYPH_W * scale
    const gh = GLYPH_H * scale
    let cursor = align === 'center' ? Math.round(x - w / 2) : align === 'right' ? x - w : x
    const top = Math.round(y)

    for (const ch of upper) {
        if (ch !== ' ') {
            if (outline) {
                const outlined = glyphCanvas(ch, outline)
                for (const [dx, dy] of [
                    [-1, 0],
                    [1, 0],
                    [0, -1],
                    [0, 1],
                ]) {
                    ctx.drawImage(outlined, cursor + dx * scale, top + dy * scale, gw, gh)
                }
            }
            if (shadow) {
                ctx.drawImage(glyphCanvas(ch, shadow), cursor, top + scale, gw, gh)
            }
            ctx.drawImage(glyphCanvas(ch, color), cursor, top, gw, gh)
        }
        cursor += (GLYPH_W + LETTER_SPACING) * scale
    }
}
