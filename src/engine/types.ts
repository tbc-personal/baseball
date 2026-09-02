/**
 * Type definitions for the baseball engine.
 * Everything must be JSON-serializable (no class instances, no Map/Set, no functions).
 * This is intentional to enable save/load and resume from saved state.
 */

/** Scouting scale 20-80 (50 = league average) */
export type Rating = number

/** Tendency in pitcher's zone preference */
export type Tendency = 'Attacker' | 'Nibbler' | 'Neutral'

/** Choice made on each pitch */
export type Choice = 'Take' | 'Contact' | 'Power' | 'Bunt'

/** Is the pitch in the zone? */
export type PitchLocation = 'zone' | 'ball'

/** Batter's read on the pitch (their guess at location) */
export type ReadBucket = 'Likely strike' | 'Coin flip' | 'Likely ball'

/** Half-inning side */
export type HalfInning = 'top' | 'bottom'

/** Unique identifier for a team or player */
export type Id = string

/** Unique identifier for a team */
export type TeamId = string

/** Unique identifier for a batter */
export type BatterId = string

/** Unique identifier for a pitcher */
export type PitcherId = string

/**
 * Batter (player card)
 */
export interface Batter {
  id: BatterId
  name: string
  position: string
  contact: Rating
  power: Rating
  eye: Rating
}

/**
 * Pitcher
 */
export interface Pitcher {
  id: PitcherId
  name: string
  control: Rating
  stuff: Rating
  tendency: Tendency
}

/**
 * Team
 */
export interface Team {
  id: TeamId
  name: string
  shortName: string
  batters: Batter[]
  pitchers: Pitcher[]
}

/**
 * Runners on base (each is a batter id or null)
 */
export interface Bases {
  first: BatterId | null
  second: BatterId | null
  third: BatterId | null
}

/**
 * Count (balls and strikes)
 */
export interface Count {
  balls: number
  strikes: number
}

/**
 * Per-batter season statistics
 */
export interface BatterStats {
  batterId: BatterId
  pa: number // plate appearances
  ab: number // at-bats
  h: number // hits
  doubles: number
  triples: number
  hr: number
  bb: number // walks
  k: number // strikeouts
  r: number // runs
  rbi: number
}

/**
 * Team record and standings
 */
export interface TeamRecord {
  teamId: TeamId
  wins: number
  losses: number
  runsFor: number
  runsAgainst: number
  /** Most recent results, newest last; rendered as the L5 column */
  lastFive: Array<'W' | 'L'>
}

/**
 * The pitch preview computed by preparePitch() and shown to the player
 * before they choose. Stored on GameState so that saving mid-at-bat and
 * resuming shows the exact same read the player already acted on, and so
 * resolvePitch() can be replayed with the same p_zone (T3).
 */
export interface CurrentPitch {
  /** p_zone fixed for the pitch about to be thrown */
  pZone: number
  /** The true bucket (not shown to the player; kept for tests/box score) */
  trueBucket: ReadBucket
  /** The bucket displayed on the at-bat screen */
  displayedBucket: ReadBucket
}

/**
 * Complete game state (one game in progress)
 * Must be JSON-serializable for save/load.
 */
export interface GameState {
  // Identifiers
  gameIndex: number // 0-19
  homeTeamId: TeamId
  awayTeamId: TeamId

  // Which pitcher each side is throwing this game (T3: rotation selection
  // happens outside the engine; the engine just needs to know who's on
  // the mound to resolve pitches)
  homePitcherId: PitcherId
  awayPitcherId: PitcherId

  // The read/pZone already shown for the pitch about to be resolved
  currentPitch: CurrentPitch

  // Game situation
  inning: number // 1-9 (may go higher in extra innings)
  half: HalfInning // 'top' or 'bottom'
  outs: number
  count: Count
  bases: Bases

  // Runs
  homeScore: number
  awayScore: number

  // Per-inning line scores
  lineScore: {
    home: number[] // index 0 = 1st inning; grows for extra innings
    away: number[]
  }

  // Hits in THIS game, per side
  hits: {
    home: number
    away: number
  }

  // Each side keeps its own place in the batting order across innings
  currentBatterIndex: {
    home: number
    away: number
  }

  // RNG state (for deterministic save/resume)
  rngState: number

  // Play-by-play log for current half-inning (human-readable strings)
  plays: string[]

  // Game end flag
  isOver: boolean
}

/**
 * Season state (entire 20-game season)
 * Must be JSON-serializable.
 */
export interface SeasonState {
  // Schedule and results
  schedule: Array<{
    gameIndex: number
    homeTeamId: TeamId
    awayTeamId: TeamId
    homeScore?: number
    awayScore?: number
    played: boolean
  }>

  // Standings (one entry per team)
  standings: TeamRecord[]

  // Per-batter season stats (across all games)
  batterStats: BatterStats[]

  // Season log (one entry per completed game)
  log: Array<{
    gameIndex: number
    homeTeamId: TeamId
    awayTeamId: TeamId
    homeScore: number
    awayScore: number
  }>

  // Milestones already triggered (to avoid duplicates)
  firedMilestones: string[]
}
