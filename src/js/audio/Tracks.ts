/**
 * The music, as data: frequencies per sixteenth, a zero is a rest. One loop of
 * eight bars over I–vi–IV–V in C major: cheerful, simple, made for a pig on
 * skates. Four bars of melody plain (A), then the same chords busier (B).
 */

// Bass, one note per eighth.
const BASS_C = [131, 262, 131, 262, 196, 262, 131, 262]
const BASS_AM = [110, 220, 110, 220, 165, 220, 110, 220]
const BASS_F = [87, 175, 87, 175, 131, 175, 87, 175]
const BASS_G = [98, 196, 98, 196, 147, 196, 98, 247]

const LEAD_A = [
    [659, 0, 784, 0, 523, 0, 784, 0, 659, 0, 587, 0, 523, 0, 0, 0],
    [440, 0, 523, 0, 659, 0, 523, 0, 440, 0, 523, 0, 587, 0, 0, 0],
    [698, 0, 880, 0, 523, 0, 698, 0, 659, 0, 587, 0, 523, 0, 0, 0],
    [587, 0, 784, 0, 494, 0, 587, 0, 784, 0, 880, 0, 784, 0, 659, 587],
]

const LEAD_B = [
    [523, 659, 784, 659, 1047, 0, 784, 0, 659, 784, 659, 523, 587, 0, 0, 0],
    [440, 523, 659, 523, 880, 0, 659, 0, 523, 659, 523, 440, 494, 0, 0, 0],
    [349, 440, 523, 440, 698, 0, 523, 0, 440, 523, 698, 880, 784, 0, 0, 0],
    [392, 494, 587, 494, 784, 0, 587, 0, 494, 587, 784, 988, 1047, 0, 784, 0],
]

const BASS_BARS = [BASS_C, BASS_AM, BASS_F, BASS_G]

export const SONG = {
    /** Sixteenths in one loop. */
    length: 128,
    bass: [...BASS_BARS, ...BASS_BARS].flat(),
    lead: [...LEAD_A, ...LEAD_B].flat(),
}
