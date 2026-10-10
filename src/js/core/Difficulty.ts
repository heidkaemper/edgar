import type { Curve } from '../config'

/** A difficulty curve at `at` (metres into a run), eased between its keys. */
export function curveAt(curve: Curve, at: number): number {
    if (at <= curve[0][0]) {
        return curve[0][1]
    }
    for (let i = 1; i < curve.length; i++) {
        const [time, value] = curve[i]
        if (at > time) {
            continue
        }
        const [fromTime, fromValue] = curve[i - 1]
        const t = (at - fromTime) / (time - fromTime)
        const eased = t * t * (3 - 2 * t)
        return fromValue + (value - fromValue) * eased
    }
    return curve[curve.length - 1][1]
}
