import type { Ability } from '../render/Art'
import { SONG } from './Tracks'

/**
 * The four waveforms the game is written in. Not `OscillatorType`, which also
 * offers `custom` and does not exist outside a browser.
 */
export type Wave = 'sine' | 'square' | 'sawtooth' | 'triangle'

/**
 * Smooths a hard jump of a wave over the sample it falls in. A square or saw
 * computed naively jumps between samples, and its overtones above half the
 * sample rate fold back as inharmonic grit, loudest on a phone speaker.
 * `step` is the phase advance per sample.
 */
function polyBlep(phase: number, step: number): number {
    if (phase < step) {
        const t = phase / step
        return t + t - t * t - 1
    }
    if (phase > 1 - step) {
        const t = (phase - 1) / step
        return t * t + t + t + 1
    }
    return 0
}

/** One period of each wave, over a phase from 0 to 1, band-limited where it jumps. */
const WAVES: Record<Wave, (phase: number, step: number) => number> = {
    sine: (phase) => Math.sin(phase * Math.PI * 2),
    square: (phase, step) => (phase < 0.5 ? 1 : -1) + polyBlep(phase, step) - polyBlep((phase + 0.5) % 1, step),
    sawtooth: (phase, step) => phase * 2 - 1 - polyBlep(phase, step),
    triangle: (phase) => 1 - Math.abs(phase - 0.5) * 4,
}

/** Fade-in of noise bursts, so they do not start with a click. */
const NOISE_ATTACK = 0.004

/** Resonance of the swept bandpass the noise runs through. */
const NOISE_Q = 1.4

/** Tail after a tone, so its release is not cut off mid ramp. */
const TAIL = 0.02

/** Loud enough to stand next to other apps; the worst pile-up still stays below the top. */
const MASTER_VOL = 1.1

/**
 * Every sound starts this far in the future. `currentTime` as the page sees it
 * lags behind the audio thread, on iOS by a good part of a buffer: a sound
 * starting "now" had its fade-in already in the past and jumped in at full
 * level, which is a click. Thirty milliseconds are not felt as a delay.
 */
const SCHEDULE_AHEAD = 0.03

/** Under the effects, but not so far under that it disappears. */
const MUSIC_VOL = 0.32

/** How far ahead the music is scheduled on the audio clock, in seconds. */
const LOOKAHEAD = 0.12

/**
 * `calm` is the title and the end: melody and bass, no drums. `run` adds the
 * drums, which grow busier with `intensity` from 0 to 1.
 */
export type MusicMode = 'off' | 'calm' | 'run'

/** A major pentatonic from C6: acorns in a row climb it. */
const PENTATONIC = [1047, 1175, 1319, 1568, 1760, 2093, 2349, 2637]

/** Seconds within which acorns count as one row and keep climbing. */
const STREAK_GAP = 0.6

/**
 * Every sound builds two nodes and leaves them hanging off the graph. A
 * browser sweeps those up on its own; the Switch is not trusted to.
 */
function release(source: AudioBufferSourceNode, gain: GainNode): void {
    source.onended = () => {
        source.disconnect()
        gain.disconnect()
    }
}

/**
 * Every sound of the game, synthesised sample by sample into buffers. An
 * oscillator would be shorter, but nx.js on the Switch has none, and one set
 * of sounds for both is worth more than the few lines it costs.
 *
 * The context may only start after a user gesture, hence `unlock`.
 */
export class Sound {
    private ctx: BaseAudioContext | null = null
    private master: GainNode | null = null
    private readonly buffers = new Map<string, AudioBuffer>()
    private streak = 0
    private lastAcorn = -10
    private music: GainNode | null = null
    private mode: MusicMode = 'off'
    private bpm = 100
    private intensity = 0
    private step = 0
    private nextStep = 0

    /** `context` is for measuring offline in development; the game passes nothing. */
    unlock(context?: BaseAudioContext): void {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') {
                void (this.ctx as AudioContext).resume()
            }
            return
        }
        if (context) {
            this.ctx = context
            this.connect(context)
            return
        }
        const Ctor =
            globalThis.AudioContext ??
            (globalThis as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (!Ctor) {
            return
        }
        this.ctx = new Ctor()
        this.connect(this.ctx)
    }

    private connect(context: BaseAudioContext): void {
        this.master = context.createGain()
        this.master.gain.value = MASTER_VOL
        this.master.connect(context.destination)
        this.music = context.createGain()
        this.music.gain.value = MUSIC_VOL
        this.music.connect(this.master)
    }

    /** A hidden tab or app stops making noise, and picks up where it was. */
    suspend(hidden: boolean): void {
        if (!this.ctx) {
            return
        }
        const live = this.ctx as AudioContext
        void (hidden ? live.suspend() : live.resume())
    }

    /**
     * What the music should be doing; called every frame. The tempo follows
     * Edgar's speed, so a change of tempo is never a change of key: the notes
     * simply come closer together.
     */
    setMusic(mode: MusicMode, bpm: number, intensity: number): void {
        if (mode !== this.mode && mode !== 'off') {
            this.step = 0
            this.nextStep = 0
        }
        this.mode = mode
        this.bpm = bpm
        this.intensity = intensity
    }

    /** Schedules the next sixteenths on the audio clock; called every frame. */
    tick(): void {
        if (!this.ctx || this.mode === 'off') {
            return
        }
        const now = this.ctx.currentTime
        if (this.nextStep < now) {
            this.nextStep = now + 0.02
        }
        while (this.nextStep < now + LOOKAHEAD) {
            this.playStep(this.step, this.nextStep - now)
            this.step = (this.step + 1) % SONG.length
            this.nextStep += 60 / this.bpm / 4
        }
    }

    /**
     * Note lengths stay fixed whatever the tempo: chiptune staccato, and a
     * bounded set of buffers to cache.
     */
    private playStep(step: number, delay: number): void {
        const destination = this.music!
        if (step % 2 === 0) {
            const bass = SONG.bass[step >> 1]
            this.tone('triangle', bass, bass, 0.14, 0.2, delay, destination)
        }
        const lead = SONG.lead[step]
        if (lead > 0) {
            const calm = this.mode === 'calm'
            this.tone(calm ? 'triangle' : 'square', lead, lead, 0.1, calm ? 0.12 : 0.055, delay, destination)
        }
        if (this.mode !== 'run') {
            return
        }

        const beat = step % 16
        const busy = this.intensity > 0.6
        if (beat % 8 === 0 || (busy && (beat === 6 || beat === 14))) {
            this.tone('sine', 150, 48, 0.1, 0.3, delay, destination)
        }
        if (beat === 4 || beat === 12) {
            this.noise(0.09, 0.13, 2600, 1200, delay, destination)
        }
        // Off-beat eighths first, then every eighth, then every sixteenth.
        const offbeat = beat % 4 === 2
        if (offbeat || (this.intensity > 0.3 && beat % 2 === 0) || this.intensity > 0.75) {
            this.noise(0.03, offbeat ? 0.05 : 0.03, 8000, 7000, delay, destination)
        }
    }

    jump(cape: boolean): void {
        this.tone('triangle', 300, 680, 0.13, 0.22)
        this.tone('square', 600, 1100, 0.07, 0.03)
        if (cape) {
            this.tone('sine', 1300, 2200, 0.2, 0.06, 0.05)
        }
    }

    /** A step faster: a rising whoosh and two bright notes. */
    faster(): void {
        this.noise(0.3, 0.08, 400, 3800)
        this.tone('triangle', 784, 784, 0.07, 0.13, 0.05)
        this.tone('triangle', 1175, 1175, 0.1, 0.13, 0.12)
    }

    land(): void {
        this.noise(0.06, 0.12, 900, 300)
        this.tone('triangle', 140, 70, 0.07, 0.14)
    }

    duck(): void {
        this.noise(0.12, 0.1, 2600, 500)
    }

    /** The skates carving into the next lane. */
    swish(): void {
        // A soft swell rather than a hiss: low, falling air and a gentle rising
        // hum, both fading in and out slowly, so a lane change sounds like a glide.
        this.noise(0.24, 0.04, 700, 360, 0, undefined, 0.08)
        this.tone('sine', 190, 280, 0.2, 0.03, 0, undefined, 0.07)
    }

    /** Acorns in quick succession climb a scale, which makes a row feel like one thing. */
    acorn(): void {
        const now = this.ctx?.currentTime ?? 0
        this.streak = now - this.lastAcorn < STREAK_GAP ? this.streak + 1 : 0
        this.lastAcorn = now
        const note = PENTATONIC[Math.min(this.streak, PENTATONIC.length - 1)]
        // A bell rather than a buzzer: phone speakers turn bright squares up here into grit.
        this.tone('triangle', note, note, 0.06, 0.13)
        this.tone('sine', note * 2, note * 2, 0.09, 0.05, 0.03)
    }

    /** The jar is full: a fanfare, each ability with its own last note. */
    ability(ability: Ability): void {
        const last: Record<Ability, number> = { helmet: 784, cape: 1319, magnet: 1047, turbo: 1568 }
        const notes = [523, 659, 784, last[ability]]
        notes.forEach((note, i) => this.tone('square', note, note, 0.12, 0.08, i * 0.07))
        this.tone('triangle', 262, 262, 0.35, 0.16, 0.21)
        if (ability === 'turbo') {
            this.noise(0.5, 0.12, 300, 5000, 0.2)
        }
    }

    /** The helmet takes the hit: a bright clonk instead of a stumble. */
    bonk(): void {
        this.tone('square', 1250, 900, 0.09, 0.08)
        this.tone('triangle', 1900, 1700, 0.18, 0.1)
        this.noise(0.05, 0.1, 6000, 3000)
    }

    /** A stumble is a wobble, not a crash: silly, and over quickly. */
    stumble(): void {
        this.noise(0.08, 0.16, 700, 200)
        this.tone('sine', 520, 170, 0.32, 0.2, 0.03)
        this.tone('sine', 560, 190, 0.3, 0.06, 0.05)
    }

    /** Wau! Two barks: a falling sawtooth through a narrow band of noise. */
    bark(): void {
        for (const delay of [0, 0.17]) {
            this.tone('sawtooth', 430, 220, 0.11, 0.17, delay)
            this.tone('square', 215, 120, 0.1, 0.06, delay)
            this.noise(0.09, 0.1, 1100, 500, delay)
        }
    }

    splash(): void {
        this.noise(0.32, 0.2, 700, 140)
        this.tone('square', 220, 70, 0.14, 0.1)
    }

    /** Short scrapes of metal, called every few frames while grinding. */
    grind(): void {
        this.noise(0.07, 0.05, 5200, 4200)
    }

    railHop(): void {
        this.tone('triangle', 420, 760, 0.08, 0.14)
        this.tone('triangle', 1500, 1500, 0.04, 0.07, 0.06)
    }

    /** The turbo breaks something. */
    smash(): void {
        this.noise(0.24, 0.2, 1700, 180)
        this.tone('square', 320, 60, 0.16, 0.12)
    }

    cluck(): void {
        this.tone('square', 760, 520, 0.04, 0.07)
        this.tone('square', 820, 560, 0.05, 0.07, 0.09)
        this.tone('square', 980, 640, 0.06, 0.06, 0.2)
    }

    quack(): void {
        this.tone('sawtooth', 360, 290, 0.13, 0.11)
        this.tone('square', 720, 580, 0.12, 0.04)
    }

    /** Bounced off the side of a wagon: a dull wooden knock. */
    bump(): void {
        this.tone('triangle', 180, 110, 0.09, 0.2)
        this.noise(0.06, 0.08, 900, 400)
    }

    /** Muh: low, slow and falling, with a breath of air through it. */
    moo(): void {
        this.tone('sawtooth', 150, 112, 0.55, 0.09, 0, undefined, 0.14)
        this.tone('triangle', 300, 225, 0.5, 0.07, 0, undefined, 0.14)
        this.noise(0.45, 0.025, 900, 600, 0.03, undefined, 0.12)
    }

    start(): void {
        const notes = [523, 659, 784, 1047]
        notes.forEach((note, i) => this.tone('square', note, note, 0.08, 0.09, i * 0.06))
    }

    pause(): void {
        this.tone('square', 660, 660, 0.05, 0.1)
        this.tone('square', 440, 440, 0.07, 0.1, 0.06)
    }

    /** Caught: a tumble down, then a bounce back up, because Bello means no harm. */
    caught(): void {
        const notes = [784, 659, 523, 392, 523, 659]
        notes.forEach((note, i) => this.tone('triangle', note, note, 0.13, 0.18, 0.3 + i * 0.1))
    }

    record(): void {
        const notes = [523, 659, 784, 1047, 784, 1047, 1319]
        notes.forEach((note, i) => this.tone('square', note, note, 0.15, 0.1, i * 0.11))
    }

    private tone(
        type: Wave,
        from: number,
        to: number,
        duration: number,
        volume: number,
        delay = 0,
        destination?: AudioNode,
        attack = 0.008,
    ): void {
        if (!this.ctx || !this.master) {
            return
        }
        const time = this.ctx.currentTime + SCHEDULE_AHEAD + delay
        const source = this.ctx.createBufferSource()
        const gain = this.ctx.createGain()
        source.buffer = this.waveBuffer(type, from, to, duration)

        gain.gain.setValueAtTime(0.0001, time)
        gain.gain.linearRampToValueAtTime(volume, time + attack)
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

        source.connect(gain)
        gain.connect(destination ?? this.master)
        source.start(time)
        source.stop(time + duration + TAIL)
        release(source, gain)
    }

    /** One tone, its pitch sweeping the way an oscillator's exponential ramp would. */
    private waveBuffer(type: Wave, from: number, to: number, duration: number): AudioBuffer {
        // A sweep that touches zero makes `Math.pow` return NaN for every
        // sample but the first, and a buffer of NaN silences the whole mixer.
        const low = Math.max(1, from)
        const high = Math.max(1, to)
        const key = `t|${type}|${low}|${high}|${duration}`
        const hit = this.buffers.get(key)
        if (hit) {
            return hit
        }

        const ctx = this.ctx!
        const rate = ctx.sampleRate
        const sweep = Math.max(1, Math.floor(rate * duration))
        const length = sweep + Math.ceil(rate * TAIL)
        const buffer = ctx.createBuffer(1, length, rate)
        const data = buffer.getChannelData(0)
        const shape = WAVES[type]
        const ratio = high / low

        let phase = 0
        for (let index = 0; index < length; index++) {
            const step = (low * Math.pow(ratio, Math.min(index / sweep, 1))) / rate
            data[index] = shape(phase, step)
            phase += step
            phase -= Math.floor(phase)
        }
        this.buffers.set(key, buffer)
        return buffer
    }

    /** Noise through a bandpass swept from one frequency to another. */
    private noise(
        duration: number,
        volume: number,
        filterFrom: number,
        filterTo: number,
        delay = 0,
        destination?: AudioNode,
        attack = NOISE_ATTACK,
    ): void {
        if (!this.ctx || !this.master) {
            return
        }
        const time = this.ctx.currentTime + SCHEDULE_AHEAD + delay
        const source = this.ctx.createBufferSource()
        source.buffer = this.noiseBuffer(duration, filterFrom, filterTo)
        const gain = this.ctx.createGain()
        gain.gain.setValueAtTime(0.0001, time)
        gain.gain.linearRampToValueAtTime(volume, time + attack)
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

        source.connect(gain)
        gain.connect(destination ?? this.master)
        source.start(time)
        release(source, gain)
    }

    /** Cached: the grind asks for the same burst ten times a second. */
    private noiseBuffer(duration: number, filterFrom: number, filterTo: number): AudioBuffer {
        const key = `n|${duration}|${filterFrom}|${filterTo}`
        const hit = this.buffers.get(key)
        if (hit) {
            return hit
        }

        const ctx = this.ctx!
        const rate = ctx.sampleRate
        const length = Math.max(1, Math.floor(rate * duration))
        const buffer = ctx.createBuffer(1, length, rate)
        const data = buffer.getChannelData(0)
        const ratio = Math.max(20, filterTo) / filterFrom
        let x1 = 0
        let x2 = 0
        let y1 = 0
        let y2 = 0

        for (let index = 0; index < length; index++) {
            const frequency = Math.min(filterFrom * Math.pow(ratio, index / length), rate * 0.45)
            const w0 = (Math.PI * 2 * frequency) / rate
            const alpha = Math.sin(w0) / (2 * NOISE_Q)
            const x0 = Math.random() * 2 - 1
            const y0 = (alpha * (x0 - x2) + 2 * Math.cos(w0) * y1 - (1 - alpha) * y2) / (1 + alpha)
            data[index] = y0
            x2 = x1
            x1 = x0
            y2 = y1
            y1 = y0
        }

        // The resonant filter can overshoot 1; every burst peaks at exactly 1.
        let peak = 0
        for (const value of data) {
            peak = Math.max(peak, Math.abs(value))
        }
        for (let index = 0; index < length; index++) {
            data[index] /= peak || 1
        }
        this.buffers.set(key, buffer)
        return buffer
    }
}
