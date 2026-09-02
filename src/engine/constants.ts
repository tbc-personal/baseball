/**
 * All tunable numbers from GAME_DESIGN.md.
 * This is the single file a future ticket edits to tune the game.
 * No numeric constant is hardcoded anywhere else.
 */

// ============================================================================
// Section 3.1: Rating effect formula
// ============================================================================

/**
 * adj(rating) = (rating - 50) / RATING_ADJ_DIVISOR, range -0.30 .. +0.30.
 * Raising the divisor flattens how much ratings matter.
 */
export const RATING_BASELINE = 50
export const RATING_ADJ_DIVISOR = 100

// ============================================================================
// Section 3.2: Pitch zone probability
// ============================================================================

/** Base in-zone probability before modifiers */
export const BASE_ZONE_PROBABILITY = 0.55

/** Count modifiers for p_zone calculation: count -> adjustment */
export const COUNT_MOD: Record<string, number> = {
  '3-0': 0.2,
  '2-0': 0.12,
  '3-1': 0.12,
  '1-0': 0.05,
  '2-1': 0.05,
  '3-2': 0.05,
  '0-0': 0,
  '1-1': 0,
  '0-1': -0.05,
  '2-2': -0.05,
  '1-2': -0.12,
  '0-2': -0.2
}

/** Zone probability clamping bounds */
export const ZONE_CLAMP_MIN = 0.2
export const ZONE_CLAMP_MAX = 0.9

// ============================================================================
// Section 3.1: Pitcher tendency modifiers
// ============================================================================

export const TENDENCY_MOD_ATTACKER = 0.08
export const TENDENCY_MOD_NIBBLER = -0.08
export const TENDENCY_MOD_NEUTRAL = 0

// ============================================================================
// Section 3.3: Read accuracy and bucket thresholds
// ============================================================================

/** Threshold for "Likely strike" bucket */
export const READ_BUCKET_LIKELY_STRIKE = 0.62

/** Threshold for "Likely ball" bucket */
export const READ_BUCKET_LIKELY_BALL = 0.45

/** Base accuracy of the read (before Eye adjustment) */
export const READ_BASE_ACCURACY = 0.7

// ============================================================================
// Section 3.4: Pitch outcome by choice and location
// ============================================================================

/**
 * Pitch outcome table: [inPlay, foul, whiff]
 * Choice × Location -> probabilities
 * Whiff probability is later multiplied by: 1 + adj(Stuff) - adj(Contact)
 */
export const PITCH_OUTCOMES: Record<string, [number, number, number]> = {
  'contact-zone': [0.7, 0.2, 0.1],
  'contact-ball': [0.3, 0.35, 0.35],
  'power-zone': [0.5, 0.25, 0.25],
  'power-ball': [0.15, 0.3, 0.55]
}

// Note: Take choice is deterministic (called strike if zone, ball if ball)

// ============================================================================
// Section 3.5: Batted-ball outcome
// ============================================================================

/**
 * Batted-ball outcome table: [out, single, double, triple, hr]
 * Swing × Location -> probabilities
 * Rating shifts are applied before normalization.
 */
export const BATTED_BALL_OUTCOMES: Record<string, [number, number, number, number, number]> = {
  'contact-zone': [0.62, 0.27, 0.07, 0.01, 0.03],
  'contact-ball': [0.75, 0.2, 0.04, 0.005, 0.005],
  'power-zone': [0.58, 0.15, 0.12, 0.01, 0.14],
  'power-ball': [0.74, 0.13, 0.07, 0.01, 0.05]
}

/**
 * Rating shift multipliers for batted-ball outcomes.
 * Applied before normalization:
 *   single *= 1 + adj(Contact)
 *   out    *= 1 - adj(Contact) * 0.5
 *   double *= 1 + adj(Power)
 *   hr     *= 1 + adj(Power) * 2
 */
export const CONTACT_SHIFT_SINGLE = 1
export const CONTACT_SHIFT_OUT = 0.5
export const POWER_SHIFT_DOUBLE = 1
export const POWER_SHIFT_HR = 2

/**
 * Whiff multiplier adjustment: 1 + adj(Stuff) - adj(Contact)
 * (This is applied to whiff probability after the initial roll)
 */

// ============================================================================
// Section 3.6: Bunt outcome probabilities
// ============================================================================

export const BUNT_OUTCOMES: Record<string, number> = {
  sacrifice: 0.7,
  'foul-bunt': 0.15,
  'pop-up': 0.1,
  'bunt-single': 0.05
}

// ============================================================================
// Section 4: Base running probabilities
// ============================================================================

/** R2 scores on single with this probability (else to third) */
export const BASE_RUNNING_R2_SCORES_ON_SINGLE = 0.65

/** R1 advances to third on single (if third is open) */
export const BASE_RUNNING_R1_THIRD_ON_SINGLE = 0.3

/** R1 scores on double with this probability (else to third) */
export const BASE_RUNNING_R1_SCORES_ON_DOUBLE = 0.45

/** Double play probability on groundout with runners on base */
export const BASE_RUNNING_DOUBLE_PLAY = 0.12

/** Sacrifice fly probability on out with R3 on base (no DP) */
export const BASE_RUNNING_SACRIFICE_FLY = 0.25

// ============================================================================
// Section 4: Game structure
// ============================================================================

/** Regulation length of a game, in innings. Extra innings continue past this. */
export const INNINGS_PER_GAME = 9

/** Number of batters in a full batting order */
export const BATTERS_PER_LINEUP = 9

/** Outs that end a half-inning */
export const OUTS_PER_HALF_INNING = 3

/** Balls that force a walk */
export const BALLS_FOR_WALK = 4

/** Strikes that force a strikeout */
export const STRIKES_FOR_STRIKEOUT = 3
