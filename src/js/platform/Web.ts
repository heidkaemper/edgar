import type { Input } from '../core/Input'

/**
 * Browser events into `Input`. Pointer coordinates arrive in client space,
 * which `toView` maps onto the playfield.
 */
export function bindWebInput(
    input: Input,
    target: HTMLElement,
    toView: (clientX: number, clientY: number) => { x: number; y: number },
): void {
    // A phone shows the pause button from the start, before the first touch.
    input.touchMode = matchMedia('(hover: none) and (pointer: coarse)').matches

    addEventListener('keydown', (event) => {
        // Space and the arrow keys would scroll the page.
        if (event.code === 'Space' || event.code.startsWith('Arrow')) {
            event.preventDefault()
        }
        if (event.repeat) {
            return
        }
        input.keyDown(event.code)
    })
    addEventListener('keyup', (event) => input.keyUp(event.code))
    addEventListener('blur', () => input.clearKeys())

    target.addEventListener('pointerdown', (event) => {
        const point = toView(event.clientX, event.clientY)
        input.pressDown(event.pointerId, point.x, point.y)
        target.setPointerCapture?.(event.pointerId)
    })
    target.addEventListener('pointermove', (event) => {
        const point = toView(event.clientX, event.clientY)
        input.pressMove(event.pointerId, point.x, point.y)
    })
    const release = (event: PointerEvent): void => {
        const point = toView(event.clientX, event.clientY)
        input.pressUp(event.pointerId, point.x, point.y)
    }
    target.addEventListener('pointerup', release)
    target.addEventListener('pointercancel', () => input.releaseAllPresses())

    // Blocks zoom gestures and rubber-band scrolling inside the playfield.
    target.addEventListener('touchstart', (event) => event.preventDefault(), { passive: false })
    target.addEventListener('contextmenu', (event) => event.preventDefault())
}
