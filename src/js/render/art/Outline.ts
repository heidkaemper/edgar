/**
 * Art is written as filled shapes only; the ink outline is added here, one
 * pixel wide on all four sides. That keeps every outline consistent and lets
 * a shape change without redrawing its edge by hand. A dot left inside a
 * shape becomes ink too, which is how limbs are separated from the body.
 */
export const INK = 'o'

export function outlined(rows: string[]): string[] {
    const width = rows.reduce((max, row) => Math.max(max, row.length), 0) + 2
    const padded = ['', ...rows, ''].map((row) => ('.' + row).padEnd(width, '.'))
    const filled = (x: number, y: number): boolean => {
        const character = padded[y]?.[x]
        return character !== undefined && character !== '.' && character !== INK
    }

    return padded.map((row, y) =>
        [...row]
            .map((character, x) => {
                if (character !== '.') {
                    return character
                }
                const touches = filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)
                return touches ? INK : '.'
            })
            .join(''),
    )
}

/** Stacks parts vertically, each at its own sideways offset. */
export function stack(...parts: [string[], number][]): string[] {
    const result: string[] = []
    for (const [rows, dx] of parts) {
        for (const row of rows) {
            result.push('.'.repeat(Math.max(0, dx)) + row)
        }
    }
    return result
}
