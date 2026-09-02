/**
 * Season state: schedule construction, per-batter season stats, standings,
 * the season log, and milestones (GAME_DESIGN.md sections 5.3 and 6).
 * Pure functions only: state in, new state out. No DOM/Preact/store
 * imports, no Math.random() -- all randomness flows through the Rng from
 * rng.ts.
 */

import type { BatterId, BatterStats, GameState, SeasonState, Team, TeamId, TeamRecord } from './types'
import type { Rng } from './rng'
import { makeRng, rngBool } from './rng'
import { createGame } from './inning'
import type { Teams } from './inning'
import type { PlateAppearanceEvent, ApplyPitchResult } from './inning'
import { applyPitch } from './inning'
import { opponentChoice, simulateGameBetween } from './sim'
import { HERONS_BATTERS, HERONS_PITCHERS } from './content/roster'
import { OPPONENTS } from './content/opponents'
import {
  SCHEDULE_OPPONENT_GAME_COUNTS,
  SCHEDULE_FRONT_LOAD_BIAS,
  SCHEDULE_HOME_FIRST_PROBABILITY,
  SIM_OTHER_GAME_HOME_PROBABILITY,
  MAX_SEED_VALUE,
  MAX_PITCHES_PER_GAME,
  SLG_SINGLE_WEIGHT,
  SLG_DOUBLE_WEIGHT,
  SLG_TRIPLE_WEIGHT,
  SLG_HR_WEIGHT,
  GAMES_BACK_DIVISOR,
  LAST_FIVE_RESULTS_KEPT,
  MILESTONE_GAMES_PLAYED_MARK,
  WINNING_SEASON_CLINCH_WINS,
  WINNING_SEASON_ELIMINATION_LOSSES,
  INNINGS_PER_GAME,
  OUTS_PER_HALF_INNING
} from './constants'

// ============================================================================
// Content: your team, and team lookup
// ============================================================================

export const HERONS_TEAM_ID: TeamId = 'herons'

/** The Harbor Herons as a Team, built from the roster content (§5.1). */
export const HERONS_TEAM: Team = {
  id: HERONS_TEAM_ID,
  name: 'Harbor Herons',
  shortName: 'Herons',
  batters: HERONS_BATTERS,
  pitchers: HERONS_PITCHERS
}

/** All seven teams in the league (Herons + the six Flyway League opponents). */
export const ALL_TEAMS: Team[] = [HERONS_TEAM, ...OPPONENTS]

function teamLookup(): Record<TeamId, Team> {
  const lookup: Record<TeamId, Team> = {}
  for (const team of ALL_TEAMS) {
    lookup[team.id] = team
  }
  return lookup
}

function teamById(id: TeamId): Team {
  const team = ALL_TEAMS.find((t) => t.id === id)
  if (!team) {
    throw new Error(`Unknown team id: ${id}`)
  }
  return team
}

/**
 * Which pitcher starts for `team` in game `gameIndex` of the season: the
 * Herons rotate three starters, opponents alternate two (§5.1/§5.2),
 * implemented generically as "rotate through team.pitchers by game index"
 * so it works for either roster size without a separate code path.
 */
export function pitcherForGame(team: Team, gameIndex: number) {
  return team.pitchers[gameIndex % team.pitchers.length]
}

// ============================================================================
// Section 5.3: Schedule construction
// ============================================================================

interface OpponentSlot {
  teamId: TeamId
  rank: number
  count: number
  scheduled: number
}

function schedulePriority(slot: OpponentSlot): number {
  return slot.scheduled / slot.count + slot.rank * SCHEDULE_FRONT_LOAD_BIAS
}

/**
 * The 20-game sequence of opponents (no home/away yet), front-loaded
 * toward the weaker teams and never repeating the same opponent back to
 * back. See SCHEDULE_FRONT_LOAD_BIAS for the scheduling rule.
 */
function buildOpponentSequence(): TeamId[] {
  const slots: OpponentSlot[] = OPPONENTS.map((team, rank) => ({
    teamId: team.id,
    rank,
    count: SCHEDULE_OPPONENT_GAME_COUNTS[team.id],
    scheduled: 0
  }))
  const total = slots.reduce((sum, slot) => sum + slot.count, 0)

  const sequence: TeamId[] = []
  let previous: TeamId | null = null

  for (let i = 0; i < total; i++) {
    const candidates = slots.filter((slot) => slot.scheduled < slot.count && slot.teamId !== previous)
    candidates.sort((a, b) => schedulePriority(a) - schedulePriority(b))
    const chosen = candidates[0]
    if (!chosen) {
      // Cannot happen with the documented counts (no team ever needs more
      // than half the remaining slots), but fail loudly rather than
      // silently repeating an opponent if the counts ever change.
      throw new Error('buildOpponentSequence: no schedulable opponent left that differs from the previous game')
    }
    chosen.scheduled += 1
    sequence.push(chosen.teamId)
    previous = chosen.teamId
  }

  return sequence
}

/**
 * Build the 20-game schedule (§5.3): the documented per-opponent counts,
 * interleaved so no opponent repeats back to back, front-loaded toward
 * weaker teams, home/away alternating. Consumes exactly one roll from
 * `rng` (whether the Herons start at home or away); the rest of the
 * schedule is deterministic given that.
 */
export function buildSchedule(rng: Rng): SeasonState['schedule'] {
  const opponents = buildOpponentSequence()
  const heronsHomeFirst = rngBool(rng, SCHEDULE_HOME_FIRST_PROBABILITY)

  return opponents.map((opponentId, i) => {
    const heronsAreHome = i % 2 === 0 ? heronsHomeFirst : !heronsHomeFirst
    return {
      gameIndex: i,
      homeTeamId: heronsAreHome ? HERONS_TEAM_ID : opponentId,
      awayTeamId: heronsAreHome ? opponentId : HERONS_TEAM_ID,
      played: false
    }
  })
}

// ============================================================================
// Season creation
// ============================================================================

function zeroTeamRecord(team: Team): TeamRecord {
  return { teamId: team.id, wins: 0, losses: 0, runsFor: 0, runsAgainst: 0, lastFive: [] }
}

function zeroBatterStats(batterId: BatterId): BatterStats {
  return { batterId, pa: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, bb: 0, k: 0, r: 0, rbi: 0 }
}

/** A fresh SeasonState: schedule, zeroed standings for all seven teams, zeroed Herons batter stats. */
export function createSeason(seed: number): SeasonState {
  const rng = makeRng(seed)
  const schedule = buildSchedule(rng)

  return {
    schedule,
    standings: ALL_TEAMS.map(zeroTeamRecord),
    batterStats: HERONS_BATTERS.map((b) => zeroBatterStats(b.id)),
    log: [],
    firedMilestones: [],
    rngState: rng.state()
  }
}

// ============================================================================
// Section 6: Per-batter stats
// ============================================================================

/**
 * Record one plate appearance's counting stats (not runs -- a run can be
 * credited to any runner on the bases, not just the batter at the plate,
 * so it's tracked separately; see accumulateStats). `rbis` is the number
 * of runs driven in on this play, already computed by the caller.
 *
 * A walk, sacrifice fly, and sacrifice bunt are each a PA but not an AB.
 * Everything else that ends a PA (a hit, a strikeout, any other out) is
 * both.
 */
export function recordPlateAppearance(stats: BatterStats, event: PlateAppearanceEvent, rbis: number): BatterStats {
  const base: BatterStats = { ...stats, pa: stats.pa + 1, rbi: stats.rbi + rbis }

  switch (event) {
    case 'walk':
      return { ...base, bb: base.bb + 1 }
    case 'strikeout':
      return { ...base, ab: base.ab + 1, k: base.k + 1 }
    case 'single':
    case 'bunt-single':
      return { ...base, ab: base.ab + 1, h: base.h + 1 }
    case 'double':
      return { ...base, ab: base.ab + 1, h: base.h + 1, doubles: base.doubles + 1 }
    case 'triple':
      return { ...base, ab: base.ab + 1, h: base.h + 1, triples: base.triples + 1 }
    case 'hr':
      return { ...base, ab: base.ab + 1, h: base.h + 1, hr: base.hr + 1 }
    case 'out':
    case 'double-play':
    case 'bunt-pop-up':
      return { ...base, ab: base.ab + 1 }
    case 'sacrifice-fly':
    case 'sacrifice-bunt':
      return base
  }
}

function creditRun(stats: BatterStats): BatterStats {
  return { ...stats, r: stats.r + 1 }
}

/**
 * Fold one resolved pitch (from applyPitch) into the season's Herons
 * batter stats: a run for every runner who scored on the play, and (if
 * the play ended the plate appearance) the PA/AB/hit/BB/K line plus RBI
 * for the batter at the plate. A no-op unless the side that just batted
 * was the Herons -- season stats only track your own nine batters (§6).
 */
export function accumulateStats(
  season: SeasonState,
  battingTeamId: TeamId,
  batterId: BatterId,
  result: ApplyPitchResult
): SeasonState {
  if (battingTeamId !== HERONS_TEAM_ID) {
    return season
  }

  let batterStats = season.batterStats

  if (result.runsScored.length > 0) {
    const scorers = new Set(result.runsScored)
    batterStats = batterStats.map((s) => (scorers.has(s.batterId) ? creditRun(s) : s))
  }

  if (result.paEnded && result.event !== null) {
    const rbis = result.runsScored.length
    batterStats = batterStats.map((s) => (s.batterId === batterId ? recordPlateAppearance(s, result.event as PlateAppearanceEvent, rbis) : s))
  }

  return { ...season, batterStats }
}

// ============================================================================
// Section 6: Derived selectors -- the UI must never compute baseball itself
// ============================================================================

export function battingAverage(stats: BatterStats): number {
  return stats.ab === 0 ? 0 : stats.h / stats.ab
}

/**
 * OBP = (H + BB) / (AB + BB). The textbook formula also has HBP in the
 * numerator and HBP + SF in the denominator, but this game has no hit-by-
 * pitch and BatterStats (§6's fixed stat list) has no separate sac-fly
 * counter, so there is nothing to add. This reduces to the standard
 * formula with HBP = SF = 0, which also matches how sac bunts are
 * handled: excluded from both AB and this denominator, same as a real
 * sac bunt is excluded from OBP.
 */
export function onBasePercentage(stats: BatterStats): number {
  const denominator = stats.ab + stats.bb
  return denominator === 0 ? 0 : (stats.h + stats.bb) / denominator
}

export function sluggingPercentage(stats: BatterStats): number {
  if (stats.ab === 0) return 0
  const singles = stats.h - stats.doubles - stats.triples - stats.hr
  const totalBases =
    singles * SLG_SINGLE_WEIGHT + stats.doubles * SLG_DOUBLE_WEIGHT + stats.triples * SLG_TRIPLE_WEIGHT + stats.hr * SLG_HR_WEIGHT
  return totalBases / stats.ab
}

function winPct(record: TeamRecord): number {
  const games = record.wins + record.losses
  return games === 0 ? 0 : record.wins / games
}

export interface StandingsRow extends TeamRecord {
  teamName: string
  /** Short name, for the narrow Season table (docs/mockups/Season.dc.html). */
  teamShortName: string
  winPct: number
  gamesBack: number
  runDifferential: number
  lastFiveDisplay: string
}

/**
 * Standings rows sorted by win pct (ties broken by run differential, then
 * alphabetically by team name -- §5.3/§6 don't specify a tiebreaker), with
 * games back, run differential, and the L5 display string computed so the
 * UI never has to.
 *
 * The final tiebreak is the team's display name rather than its id so that
 * a fresh season, where every team is 0-0 with a run differential of 0,
 * reads down the table in alphabetical order instead of an order that
 * looks arbitrary to the player.
 */
export function standingsTable(season: SeasonState): StandingsRow[] {
  const lookup = teamLookup()
  const nameOf = (id: TeamId): string => lookup[id]?.name ?? id
  const sorted = [...season.standings].sort((a, b) => {
    const pctDiff = winPct(b) - winPct(a)
    if (pctDiff !== 0) return pctDiff
    const diffDiff = b.runsFor - b.runsAgainst - (a.runsFor - a.runsAgainst)
    if (diffDiff !== 0) return diffDiff
    return nameOf(a.teamId).localeCompare(nameOf(b.teamId))
  })
  const leader = sorted[0]

  return sorted.map((record) => ({
    ...record,
    teamName: lookup[record.teamId]?.name ?? record.teamId,
    teamShortName: lookup[record.teamId]?.shortName ?? record.teamId,
    winPct: winPct(record),
    gamesBack: leader ? (leader.wins - record.wins + (record.losses - leader.losses)) / GAMES_BACK_DIVISOR : 0,
    runDifferential: record.runsFor - record.runsAgainst,
    lastFiveDisplay: record.lastFive.join('')
  }))
}

// ============================================================================
// Section 6: Recording a completed game
// ============================================================================

function applyGameToStandings(
  standings: TeamRecord[],
  homeTeamId: TeamId,
  awayTeamId: TeamId,
  homeScore: number,
  awayScore: number
): TeamRecord[] {
  const homeWon = homeScore > awayScore
  return standings.map((record) => {
    if (record.teamId === homeTeamId) return applyResultToRecord(record, homeWon, homeScore, awayScore)
    if (record.teamId === awayTeamId) return applyResultToRecord(record, !homeWon, awayScore, homeScore)
    return record
  })
}

function applyResultToRecord(record: TeamRecord, won: boolean, runsFor: number, runsAgainst: number): TeamRecord {
  const lastFive = [...record.lastFive, won ? ('W' as const) : ('L' as const)].slice(-LAST_FIVE_RESULTS_KEPT)
  return {
    ...record,
    wins: record.wins + (won ? 1 : 0),
    losses: record.losses + (won ? 0 : 1),
    runsFor: record.runsFor + runsFor,
    runsAgainst: record.runsAgainst + runsAgainst,
    lastFive
  }
}

/**
 * Record a completed Herons game into the season: updates standings for
 * both sides, appends the season-log entry, marks the schedule slot
 * played, and simulates the other five opponents' games for that same
 * slot (paired off two at a time, weakest-to-strongest order minus
 * whoever the Herons just played; with five teams left, one sits out each
 * slot) so the standings table stays full. `gameState.isOver` must be
 * true, and `gameState.gameIndex` must match an unplayed schedule slot.
 */
export function recordGameResult(season: SeasonState, gameState: GameState): SeasonState {
  const scheduled = season.schedule[gameState.gameIndex]
  if (!scheduled) {
    throw new Error(`recordGameResult: no scheduled game at index ${gameState.gameIndex}`)
  }

  const rng = makeRng(season.rngState)

  let standings = applyGameToStandings(
    season.standings,
    scheduled.homeTeamId,
    scheduled.awayTeamId,
    gameState.homeScore,
    gameState.awayScore
  )
  const schedule = season.schedule.map((g, i) =>
    i === gameState.gameIndex
      ? { ...g, played: true, homeScore: gameState.homeScore, awayScore: gameState.awayScore }
      : g
  )
  const log = [
    ...season.log,
    {
      gameIndex: gameState.gameIndex,
      homeTeamId: scheduled.homeTeamId,
      awayTeamId: scheduled.awayTeamId,
      homeScore: gameState.homeScore,
      awayScore: gameState.awayScore
    }
  ]

  const heronsOpponentId = scheduled.homeTeamId === HERONS_TEAM_ID ? scheduled.awayTeamId : scheduled.homeTeamId
  const others = OPPONENTS.filter((t) => t.id !== heronsOpponentId)
  for (let i = 0; i + 1 < others.length; i += 2) {
    const teamA = others[i]
    const teamB = others[i + 1]
    const aIsHome = rngBool(rng, SIM_OTHER_GAME_HOME_PROBABILITY)
    const home = aIsHome ? teamA : teamB
    const away = aIsHome ? teamB : teamA
    const outcome = simulateGameBetween(home, away, rng)
    standings = applyGameToStandings(standings, home.id, away.id, outcome.homeScore, outcome.awayScore)
  }

  return { ...season, standings, schedule, log, rngState: rng.state() }
}

/**
 * Human-readable season-log line, §6's `G7 vs Loons W 5-3` shape. The log
 * itself stays structured data (SeasonState.log); this formats one entry
 * for display.
 */
export function formatLogEntry(entry: SeasonState['log'][number]): string {
  const heronsAreHome = entry.homeTeamId === HERONS_TEAM_ID
  const heronsScore = heronsAreHome ? entry.homeScore : entry.awayScore
  const oppScore = heronsAreHome ? entry.awayScore : entry.homeScore
  const oppTeamId = heronsAreHome ? entry.awayTeamId : entry.homeTeamId
  const oppName = teamById(oppTeamId).shortName
  const result = heronsScore > oppScore ? 'W' : 'L'
  return `G${entry.gameIndex + 1} vs ${oppName} ${result} ${heronsScore}-${oppScore}`
}

// ============================================================================
// Section 6: Milestones
// ============================================================================

export type MilestoneId =
  | 'first-hr'
  | 'first-walk-off'
  | 'first-shutout'
  | 'games-played-mark'
  | 'clinch'
  | 'eliminated'
  | 'season-over'

export interface MilestoneCheck {
  season: SeasonState
  fired: MilestoneId[]
}

/**
 * Check the fixed §6 milestone list against a just-recorded game. Call
 * this AFTER recordGameResult (and after folding in this game's
 * accumulateStats calls) -- several of these read season.log/standings/
 * batterStats and need this game's result already reflected there.
 * Never re-fires a milestone already in season.firedMilestones.
 */
export function checkMilestones(season: SeasonState, gameState: GameState): MilestoneCheck {
  const fired: MilestoneId[] = []
  const already = new Set(season.firedMilestones)

  const heronsAreHome = gameState.homeTeamId === HERONS_TEAM_ID
  const heronsScore = heronsAreHome ? gameState.homeScore : gameState.awayScore
  const oppScore = heronsAreHome ? gameState.awayScore : gameState.homeScore
  const heronsWon = heronsScore > oppScore

  if (!already.has('first-hr') && season.batterStats.some((s) => s.hr > 0)) {
    fired.push('first-hr')
  }

  // A walk-off: the Herons, batting at home in the bottom of the 9th (or
  // later), took the lead and the game ended before three outs (per
  // inning.ts, the walk-off path returns with outs < OUTS_PER_HALF_INNING;
  // a normal third-out ending always resets outs to 0 via endHalfInning,
  // so this also correctly excludes an ordinary bottom-of-the-9th win).
  const isWalkOff =
    heronsAreHome &&
    heronsWon &&
    gameState.half === 'bottom' &&
    gameState.inning >= INNINGS_PER_GAME &&
    gameState.outs < OUTS_PER_HALF_INNING
  if (!already.has('first-walk-off') && isWalkOff) {
    fired.push('first-walk-off')
  }

  if (!already.has('first-shutout') && heronsWon && oppScore === 0) {
    fired.push('first-shutout')
  }

  if (!already.has('games-played-mark') && season.log.length >= MILESTONE_GAMES_PLAYED_MARK) {
    fired.push('games-played-mark')
  }

  const heronsRecord = season.standings.find((t) => t.teamId === HERONS_TEAM_ID)
  if (heronsRecord) {
    if (!already.has('clinch') && heronsRecord.wins >= WINNING_SEASON_CLINCH_WINS) {
      fired.push('clinch')
    }
    if (!already.has('eliminated') && heronsRecord.losses >= WINNING_SEASON_ELIMINATION_LOSSES) {
      fired.push('eliminated')
    }
  }

  if (!already.has('season-over') && season.log.length >= season.schedule.length) {
    fired.push('season-over')
  }

  if (fired.length === 0) {
    return { season, fired }
  }
  return { season: { ...season, firedMilestones: [...season.firedMilestones, ...fired] }, fired }
}

// ============================================================================
// Headless season simulation (both sides on the sim policy) -- what the
// §7 Monte Carlo tuning script and the season-consistency tests use.
// ============================================================================

function battingSideOf(state: GameState): 'home' | 'away' {
  return state.half === 'top' ? 'away' : 'home'
}

function currentBatterId(state: GameState, teams: Teams): BatterId {
  const side = battingSideOf(state)
  const team = side === 'home' ? teams.home : teams.away
  return team.batters[state.currentBatterIndex[side]].id
}

function battingTeamIdOf(state: GameState): TeamId {
  return battingSideOf(state) === 'home' ? state.homeTeamId : state.awayTeamId
}

/**
 * Play one Herons game to completion using the sim policy for both sides,
 * folding every pitch's result into the season's batter stats as it goes
 * (GameState.plays resets each half-inning, so per-batter stats can't be
 * reconstructed after the fact -- they have to be accumulated live).
 */
function playSeasonGame(
  season: SeasonState,
  gameState: GameState,
  teams: Teams,
  rng: Rng
): { season: SeasonState; gameState: GameState } {
  let state = gameState
  let currentSeason = season
  let pitches = 0

  while (!state.isOver) {
    if (pitches >= MAX_PITCHES_PER_GAME) {
      throw new Error(
        `playSeasonGame: exceeded ${MAX_PITCHES_PER_GAME} pitches without the game ending -- likely a tuning bug.`
      )
    }
    const battingTeamId = battingTeamIdOf(state)
    const batterId = currentBatterId(state, teams)
    const choice = opponentChoice(state.currentPitch.displayedBucket, state.count, state.bases, state.outs, rng)
    const { state: next, result } = applyPitch(state, choice, teams, rng)
    currentSeason = accumulateStats(currentSeason, battingTeamId, batterId, result)
    state = next
    pitches += 1
  }

  return { season: currentSeason, gameState: state }
}

function drawSeed(rng: Rng): number {
  return Math.floor(rng.next() * MAX_SEED_VALUE)
}

/**
 * Run an entire 20-game season headlessly, sim policy on both sides for
 * every Herons game, other teams' games simulated by strength. Used by
 * the §7 Monte Carlo tuning script and by the season-consistency tests.
 */
export function simulateSeason(seed: number): SeasonState {
  let season = createSeason(seed)
  const lookup = teamLookup()

  for (const scheduled of season.schedule) {
    const seedRng = makeRng(season.rngState)
    const gameSeed = drawSeed(seedRng)
    season = { ...season, rngState: seedRng.state() }

    const homeTeam = lookup[scheduled.homeTeamId]
    const awayTeam = lookup[scheduled.awayTeamId]
    const homePitcher = pitcherForGame(homeTeam, scheduled.gameIndex)
    const awayPitcher = pitcherForGame(awayTeam, scheduled.gameIndex)
    const teams: Teams = { home: homeTeam, away: awayTeam }

    const gameState = createGame({
      gameIndex: scheduled.gameIndex,
      homeTeam,
      awayTeam,
      homePitcher,
      awayPitcher,
      seed: gameSeed
    })
    const gameRng = makeRng(gameState.rngState)

    const played = playSeasonGame(season, gameState, teams, gameRng)
    season = played.season
    season = recordGameResult(season, played.gameState)
    season = checkMilestones(season, played.gameState).season
  }

  return season
}

export { teamById }
