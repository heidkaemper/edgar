/**
 * Every value that decides how the game looks and feels, in one place.
 * Durations are frames at 60 Hz, distances are world units: one sprite pixel
 * is one unit sideways and upwards, and `z` is depth in front of the camera.
 */

// The short side of the screen is always 360; the long one grows with the
// device, up to a point, and whatever it adds is scenery and HUD.
export const VIEW_SHORT = 360
export const VIEW_LONG_MIN = 360
export const VIEW_LONG_MAX = 800

// The lens. `FOCAL / z` is the scale of everything drawn. A sprite pixel is two
// screen pixels where Edgar stands. 0.053 is the wide end, chosen for the
// fastest picture; it trades legibility in the distance for speed.
export const FOCAL = 200
export const PLAYER_Z = 100
export const PLAYER_SCALE = FOCAL / PLAYER_Z
export const Z_NEAR = 60
export const FAR_RATIO = 0.053
export const Z_MAX = PLAYER_Z / FAR_RATIO

// Landscape keeps the horizon and the feet line of the prototype. Portrait
// lifts the camera instead of narrowing the view: the ground gets more rows,
// the sight distance stays the same, so neither format is easier.
export const LANDSCAPE_HORIZON = 116
export const LANDSCAPE_FEET = 300
export const PORTRAIT_BOTTOM_SHARE = 0.2
export const PORTRAIT_SPAN_GROWTH = 0.35
export const PORTRAIT_SPAN_MAX = 300

// Speed. `CRUISE_SPEED` is the one at which the far end reaches Edgar in
// `WARN_SECONDS`. Speed follows the distance, never the player: stumbling
// on purpose buys nothing but a few slow seconds.
export const WARN_SECONDS = 3.3
export const CRUISE_SPEED = (Z_MAX - PLAYER_Z) / (60 * WARN_SECONDS)
export const TITLE_SPEED = CRUISE_SPEED * 0.3

/** Every `STAGE_METRES` Edgar is one step faster, as multiples of `CRUISE_SPEED`. */
export const STAGE_METRES = 250
export const STAGE_BASE = 0.68
export const STAGE_STEP = 0.13
export const STAGE_MAX = 2.3
/** At the start and after a stumble: this share of the stage's speed, for this long. */
export const SLOW_SHARE = 0.6
export const SLOW_FRAMES = 150
/**
 * Music tempo: `MUSIC_BPM` at the first stage's speed, rising with the
 * speed to the power `MUSIC_CURVE`, so it gets faster without running away.
 */
export const MUSIC_BPM = 112
export const MUSIC_CURVE = 0.45
export const MUSIC_BPM_MAX = 184
export const MUSIC_BPM_CALM = 92
/** How quickly he gets back up to speed afterwards: about half a second. */
export const RECOVER_EASE = 0.06

/**
 * Obstacle density over the metres of a run, as [metres, value] keys eased
 * into each other. The last key holds from then on. Quiet until 800 m.
 */
export type Curve = [number, number][]

/** Frames between two obstacle rows; rows come at a beat, not a distance. */
export const ROW_FRAMES_CURVE: Curve = [
    [0, 24],
    [800, 24],
    [2500, 16],
]
/** Chunks between two quiet stretches. */
export const BREATHER_CURVE: Curve = [
    [0, 4],
    [800, 5],
    [2500, 10],
]
/** Chance that a chunk loses its empty last rows, so the next follows hard on it. */
export const SQUEEZE_CURVE: Curve = [
    [0, 0],
    [800, 0],
    [2500, 0.8],
]

/**
 * The time of day, by distance like the speed: afternoon, sunset, night,
 * sunrise, afternoon, and round again. Each value is where that light is
 * fullest; between two of them it fades over the whole stretch.
 */
export const DUSK_METRES = 800
export const NIGHT_METRES = 1050
export const NIGHT_END_METRES = 1850
export const DAWN_METRES = 2050
export const DAY_METRES = 2300
export const DAY_CYCLE_METRES = 3000
/** The light is worked out afresh every this many metres, not every frame. */
export const LIGHT_STEP_METRES = 8

/** World units per metre on the HUD. */
export const METRE = 54

// Track. Lanes sit at -LANE_W, 0 and +LANE_W.
export const ROAD_HALF = 72
export const LANE_W = 46
export const RUMBLE_W = 5
export const LINE_W = 3
export const STRIPE_PIXELS = 40
export const STRIPE = STRIPE_PIXELS / (((LANDSCAPE_FEET - LANDSCAPE_HORIZON) / PLAYER_SCALE) * FOCAL / (PLAYER_Z * PLAYER_Z))

// Sprites. One baked size per 7 % change: coarse enough to stay a whole-pixel
// blit, fine enough that the jump reads as a scaler.
export const STEP_SIZE_CHANGE = 1.07
export const DARKEN_MAX = 0.14
export const SHADOW_ALPHA = 0.22

// Curves are only a picture: lanes, collisions and generation know nothing of
// them. `CURVE_MAX` bends the far end by about 140 pixels.
export const CURVE_MAX = 0.0008
export const CURVE_STRAIGHT_MIN = 1800
export const CURVE_STRAIGHT_MAX = 5000
export const CURVE_LENGTH_MIN = 2400
export const CURVE_LENGTH_MAX = 6000
export const CURVE_PARALLAX = 260
export const CURVE_LEAN = 500

// Camera.
export const CAMERA_FOLLOW = 0.35
export const CAMERA_EASE = 0.12

// Edgar. Heights are world units above the road; he is 36 tall.
export const DRIFT_EASE = 0.17
export const LEAN_EASE = 0.3
export const JUMP_SPEED = 4.45
export const GRAVITY = 0.25
export const CAPE_JUMP_SPEED = 6.4
export const CAPE_GRAVITY = 0.2
export const GLIDE_SPEED = -0.55
export const FAST_FALL = -3.4
/** The hop onto a rail from the side; peaks a little above it. */
export const HOP_SPEED = 3.3
export const DUCK_FRAMES = 32
/** How far apart Edgar and an obstacle may be sideways and still touch. */
export const HIT_HALF = 21
/** Frames of skating per animation step at top speed. */
export const SKATE_FRAME_Z = 34

// The hay wagon: up the ramp at the front, along the top, off the end.
export const WAGON_TOP = 34
export const RAMP_LENGTH = 90
export const WAGON_HALF = 20
/** How far below the top Edgar may be and still land on it, rather than bump into its side. */
export const WAGON_STEP = 8

// The stream: water across the road, one lane bridged. The deck and its
// railings reach a little beyond the banks on either side.
export const BRIDGE_HALF = 20
export const BRIDGE_MARGIN = 40
export const RAILING_TOP = 12
/** In the water Edgar sinks to his belly and slows down, until he is out again. */
export const WADE_DEPTH = 13
export const WADE_SPEED = 0.7
export const WADE_EASE = 0.22

// What it takes to clear an obstacle.
export const HURDLE_CLEAR = 16
/** Hay and the cow: out of reach of a jump, only the cape clears them. */
export const FULL_CLEAR = 44
export const RAIL_TOP = 14
export const MUD_CLEAR = 6
export const ANIMAL_CLEAR = 15
/** Only with a cape: the gate cannot be jumped otherwise. */
export const GATE_CLEAR = 66

// Stumbling and Bello.
export const STUMBLE_FRAMES = 40
export const BELLO_FRAMES = 360
export const BELLO_FAR = 64
export const BELLO_NEAR = 24
export const BELLO_SIDE = 30
export const BELLO_BARK_FRAMES = 70
export const CAUGHT_FRAMES = 150

// The end: the one Bello caught sighs now and then; the winner of a race turns, cheers and gets a trophy.
export const SIGH_EVERY = 160
export const SIGH_FRAMES = 45
export const CHEER_TURN = 40
export const TROPHY_DROP = 85
export const TROPHY_FALL = 36

// Mud covers part of the picture rather than tripping Edgar.
export const MUD_FRAMES = 130

// The acorn jar and the four abilities.
export const JAR_SIZE = 25
export const CAPE_FRAMES = 600
export const MAGNET_FRAMES = 600
export const TURBO_FRAMES = 360
export const TURBO_SPEED = 1.35
export const BLINK_FRAMES = 120
export const MAGNET_RANGE = 520
export const GRACE_FRAMES = 60

// Moving animals, in world units per frame sideways.
export const CHICKEN_SPEED = 0.55
export const DUCK_SPEED = 0.42
export const DUCK_SPACING = 13
/**
 * The cow walks a little over a lane while it comes all the way from the far
 * end, measured in depth rather than time, so it always arrives where planned.
 */
export const COW_DRIFT = (LANE_W * 1.15) / (Z_MAX - PLAYER_Z)

export const STORAGE_KEY = 'edgar.best'
