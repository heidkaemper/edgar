/**
 * Fixed timestep. Physics and cooldowns stay independent of the refresh rate,
 * so the game behaves the same on a 120 Hz phone and on a 30 fps device.
 */
const STEP = 1000 / 60

/** Caps the catch-up spiral after the tab has been in the background. */
const MAX_STEPS = 5

export class Loop {
    private acc = 0
    private last = 0
    private raf = 0
    private running = false

    constructor(
        private readonly update: () => void,
        private readonly render: (alpha: number) => void,
    ) {}

    start(): void {
        if (this.running) {
            return
        }
        this.running = true
        this.last = performance.now()
        this.raf = requestAnimationFrame(this.tick)
    }

    stop(): void {
        this.running = false
        cancelAnimationFrame(this.raf)
    }

    private tick = (now: number): void => {
        if (!this.running) {
            return
        }
        this.raf = requestAnimationFrame(this.tick)

        this.acc += now - this.last
        this.last = now
        if (this.acc > STEP * MAX_STEPS) {
            this.acc = STEP * MAX_STEPS
        }

        let steps = 0
        while (this.acc >= STEP && steps < MAX_STEPS) {
            this.update()
            this.acc -= STEP
            steps++
        }

        this.render(this.acc / STEP)
    }
}
