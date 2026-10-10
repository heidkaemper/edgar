/**
 * Every offscreen canvas in the game is made here. nx.js on the Switch has no
 * `document`, and offers `OffscreenCanvas` in its place.
 */
export type Surface = HTMLCanvasElement | OffscreenCanvas

export function createSurface(width: number, height: number): { canvas: Surface; ctx: CanvasRenderingContext2D } {
    const canvas =
        typeof document === 'undefined' ? new OffscreenCanvas(width, height) : document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    // The two context types differ only in name; everything drawn here is
    // plain 2D canvas either way.
    const ctx = (canvas as HTMLCanvasElement).getContext('2d')! as CanvasRenderingContext2D

    return { canvas, ctx }
}
