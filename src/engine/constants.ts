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
export const BASE_ZONE_PROBABILITY = 0.518

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
  '2-2': -0.02,
  '1-2': -0.05,
  '0-2': -0.08
}

/**
 * GAME_DESIGN.md 3.2: challenge_mod = -adj(Contact) * CHALLENGE_WEIGHT.
 * A pitcher attacks a hitter he is not afraid of and works around one he
 * is, so a low Contact rating raises the chance the pitch is a strike.
 * Tuning lever, range 0.20-0.60. This is the only term in p_zone that
 * depends on the batter.
 */
export const CHALLENGE_WEIGHT = 0.4

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
  'contact-zone': [0.5, 0.4, 0.1],
  'contact-ball': [0.3, 0.5, 0.2],
  'power-zone': [0.3, 0.5, 0.2],
  'power-ball': [0.1, 0.5, 0.4]
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
  'contact-zone': [0.5607, 0.3121, 0.0809, 0.0116, 0.0347],
  'contact-ball': [0.825, 0.14, 0.028, 0.0035, 0.0035],
  'power-zone': [0.5422, 0.1635, 0.1308, 0.0109, 0.1526],
  'power-ball': [0.818, 0.091, 0.049, 0.007, 0.035]
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
export const BASE_RUNNING_R2_SCORES_ON_SINGLE = 0.78

/** R1 advances to third on single (if third is open) */
export const BASE_RUNNING_R1_THIRD_ON_SINGLE = 0.4

/** R1 scores on double with this probability (else to third) */
export const BASE_RUNNING_R1_SCORES_ON_DOUBLE = 0.58

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

// ============================================================================
// Section 5.4: Opponent batting policy (T4)
// ============================================================================

/**
 * When the policy falls through to its default branch (not a take, not two
 * strikes, not an aggressive count), it swings Contact with this
 * probability and Power the rest of the time. GAME_DESIGN.md §5.4 specifies
 * this exact 0.6/0.4 split.
 */
export const OPPONENT_POLICY_CONTACT_PROBABILITY = 0.6

// ============================================================================
// T4: Simulation safety caps
// ============================================================================

/**
 * Hard cap on pitches simulated within a single half-inning before
 * simulateHalfInning throws. A real half-inning under these tuning numbers
 * runs well under 100 pitches (§7 targets ~4.3 PA and ~4 pitches/PA, i.e.
 * roughly 17 pitches); this cap is generous headroom so a genuine tuning
 * bug (e.g. a probability row that never produces an out) surfaces as a
 * thrown error instead of an infinite loop.
 */
export const MAX_PITCHES_PER_HALF_INNING = 500

/**
 * Hard cap on pitches simulated within a single full game (all halves,
 * including extra innings) before the season-level game loop throws. Same
 * rationale as MAX_PITCHES_PER_HALF_INNING, sized for a whole game.
 */
export const MAX_PITCHES_PER_GAME = 6000

// ============================================================================
// Section 5.3: Other teams' games, simulated by strength (T4)
// ============================================================================

/**
 * GAME_DESIGN.md §5.3 says only: "a single roll per game, p(win) from the
 * Contact+Power+Eye sum difference." It does not specify a formula mapping
 * that difference to a probability. This engine uses a logistic curve,
 * a common, monotonic, and bounded-in-(0,1) choice for exactly this kind
 * of "rating difference -> win probability" mapping:
 *
 *   p(home wins) = 1 / (1 + exp(-diff / WIN_PROB_LOGISTIC_SCALE))
 *
 * where diff = teamStrength(home) - teamStrength(away), and teamStrength
 * is a team's average (Contact + Power + Eye) per batter (see sim.ts).
 * Since every opponent's nine hitters share one C/P/E line (§5.2), this
 * reduces to that team's own C/P/E sum for every opponent; the average is
 * only load-bearing for the Herons, whose batters vary player to player.
 *
 * The scale is picked so the widest gap in the league (weakest Wrens,
 * C+P+E sum 135, vs strongest Ospreys, sum 175, diff 40) gives the
 * stronger team roughly a 73% win probability -- clearly favoured but far
 * from a lock, matching "a reasonable-but-beatable" spread elsewhere in
 * the doc. This is a chosen shape, not a specified one.
 */
export const WIN_PROB_LOGISTIC_SCALE = 40

/**
 * Score generation for simulated (non-Herons) games. §5.3 only specifies a
 * win/loss roll; it says nothing about the actual score, but the
 * standings table needs runsFor/runsAgainst for a run-differential column.
 * This engine rolls the loser's runs uniformly in this range, then adds a
 * margin (also rolled uniformly in its range) for the winner's runs, which
 * keeps simulated games in a plausible range next to the §7 target of
 * 4.2-4.9 runs per team per game.
 */
export const SIM_OTHER_GAME_LOSER_RUNS_MIN = 1
export const SIM_OTHER_GAME_LOSER_RUNS_MAX = 6
export const SIM_OTHER_GAME_WIN_MARGIN_MIN = 1
export const SIM_OTHER_GAME_WIN_MARGIN_MAX = 5

/** Probability the first-listed team of a simulated other-team pairing is treated as home. */
export const SIM_OTHER_GAME_HOME_PROBABILITY = 0.5

/**
 * Upper bound (exclusive) of the integer seed space handed to makeRng()
 * when this engine needs to fan a single Rng stream out into fresh,
 * independent per-game seeds (T4 season simulation). Not a balance
 * number -- an implementation constant for the PRNG's usable range --
 * but kept here with everything else rather than inlined.
 */
export const MAX_SEED_VALUE = 2147483647

// ============================================================================
// Section 5.3: Schedule construction (T4)
// ============================================================================

/**
 * Per-opponent game counts for the 20-game schedule, transcribed exactly
 * from §5.3: Wrens x4, Grackles x4, Kestrels x3, Loons x3, Cranes x3,
 * Ospreys x3.
 */
export const SCHEDULE_OPPONENT_GAME_COUNTS: Record<string, number> = {
  wrens: 4,
  grackles: 4,
  kestrels: 3,
  loons: 3,
  cranes: 3,
  ospreys: 3
}

/**
 * How strongly the schedule builder favours weaker opponents (lower rank,
 * §5.2 lists weakest to strongest) for earlier game slots. §5.3 says only
 * "front-loaded"; this engine's scheduling priority for an opponent is
 * (gamesAlreadyScheduled / totalGamesVsThatOpponent) + rank * this bias,
 * always picking the lowest-priority available opponent next. A bias of 1
 * makes rank dominate the per-opponent completion ratio (which maxes out
 * at 1), so the schedule works fully through the weakest opponents (by
 * rank) before touching the strongest, while the ratio term still forces
 * rotation among an opponent's own games so no opponent repeats back to
 * back. This is a chosen shape, not a specified one.
 */
export const SCHEDULE_FRONT_LOAD_BIAS = 1

/** Probability the Herons are scheduled as home team in game 1 (then strictly alternates). */
export const SCHEDULE_HOME_FIRST_PROBABILITY = 0.5

// ============================================================================
// Section 6: Season stats and standings (T4)
// ============================================================================

/** Weights for total bases in the SLG formula: 1B=1, 2B=2, 3B=3, HR=4. */
export const SLG_SINGLE_WEIGHT = 1
export const SLG_DOUBLE_WEIGHT = 2
export const SLG_TRIPLE_WEIGHT = 3
export const SLG_HR_WEIGHT = 4

/** Games-back formula divisor: GB = ((leaderW - teamW) + (teamL - leaderL)) / 2 */
export const GAMES_BACK_DIVISOR = 2

/** Number of results kept for the standings "last five" column. */
export const LAST_FIVE_RESULTS_KEPT = 5

// ============================================================================
// Section 6: Milestones (T4)
// ============================================================================

/** "10-game mark" milestone fires once this many season-log entries exist. */
export const MILESTONE_GAMES_PLAYED_MARK = 10

/**
 * GAME_DESIGN.md lists a "clinch" and an "eliminated" milestone but the
 * doc has no playoff bracket or postseason mechanic anywhere -- the
 * standings table is flavor/progression only. Reading "clinch" as
 * "clinched a winning season" (cannot finish .500 or worse) and
 * "eliminated" as "cannot finish with a winning season" is the closest
 * literal, computable meaning available from a 20-game single-table
 * season, and needs no invented playoff structure. Both are mathematical
 * locks the moment the threshold is crossed, independent of what any
 * other team does.
 */
export const WINNING_SEASON_CLINCH_WINS = 11
export const WINNING_SEASON_ELIMINATION_LOSSES = 10
