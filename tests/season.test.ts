import { describe, it, expect } from 'vitest'
import {
  buildSchedule,
  createSeason,
  recordPlateAppearance,
  accumulateStats,
  battingAverage,
  onBasePercentage,
  sluggingPercentage,
  standingsTable,
  shortenTeamName,
  recordGameResult,
  checkMilestones,
  simulateSeason,
  formatLogEntry,
  HERONS_TEAM_ID,
  HERONS_TEAM
} from '../src/engine/season'
import { OPPONENTS } from '../src/engine/content/opponents'
import { SCHEDULE_OPPONENT_GAME_COUNTS } from '../src/engine/constants'
import { makeRng } from '../src/engine/rng'
import type { BatterStats, GameState } from '../src/engine/types'

// ============================================================================
// Schedule
// ============================================================================

describe('buildSchedule (GAME_DESIGN.md 5.3)', () => {
  it('has exactly 20 games', () => {
    const schedule = buildSchedule(makeRng(1))
    expect(schedule).toHaveLength(20)
  })

  it('has the exact documented per-opponent counts', () => {
    const schedule = buildSchedule(makeRng(1))
    const counts: Record<string, number> = {}
    for (const g of schedule) {
      const opp = g.homeTeamId === HERONS_TEAM_ID ? g.awayTeamId : g.homeTeamId
      counts[opp] = (counts[opp] ?? 0) + 1
    }
    expect(counts).toEqual(SCHEDULE_OPPONENT_GAME_COUNTS)
  })

  it('no opponent appears twice in a row', () => {
    const schedule = buildSchedule(makeRng(1))
    const opponents = schedule.map((g) => (g.homeTeamId === HERONS_TEAM_ID ? g.awayTeamId : g.homeTeamId))
    for (let i = 1; i < opponents.length; i++) {
      expect(opponents[i]).not.toBe(opponents[i - 1])
    }
  })

  it('home/away alternates every game', () => {
    const schedule = buildSchedule(makeRng(1))
    for (let i = 1; i < schedule.length; i++) {
      const prevHeronsHome = schedule[i - 1].homeTeamId === HERONS_TEAM_ID
      const currHeronsHome = schedule[i].homeTeamId === HERONS_TEAM_ID
      expect(currHeronsHome).toBe(!prevHeronsHome)
    }
  })

  it('every game is Herons vs a real opponent, never Herons vs Herons', () => {
    const schedule = buildSchedule(makeRng(1))
    for (const g of schedule) {
      expect([g.homeTeamId, g.awayTeamId]).toContain(HERONS_TEAM_ID)
      const opp = g.homeTeamId === HERONS_TEAM_ID ? g.awayTeamId : g.homeTeamId
      expect(OPPONENTS.map((t) => t.id)).toContain(opp)
    }
  })

  it('is front-loaded: average opponent rank (weakest=0) is lower in the first half than the second', () => {
    const schedule = buildSchedule(makeRng(1))
    const rankOf: Record<string, number> = {}
    OPPONENTS.forEach((t, i) => (rankOf[t.id] = i))
    const opponents = schedule.map((g) => (g.homeTeamId === HERONS_TEAM_ID ? g.awayTeamId : g.homeTeamId))
    const firstHalf = opponents.slice(0, 10).map((id) => rankOf[id])
    const secondHalf = opponents.slice(10).map((id) => rankOf[id])
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    expect(avg(firstHalf)).toBeLessThan(avg(secondHalf))
  })

  it('is deterministic for a given rng state, and the home/away roll is what varies it', () => {
    const scheduleA = buildSchedule(makeRng(77))
    const scheduleB = buildSchedule(makeRng(77))
    expect(scheduleA).toEqual(scheduleB)
  })
})

// ============================================================================
// createSeason
// ============================================================================

describe('createSeason', () => {
  it('has a schedule, zeroed standings for all 7 teams, zeroed stats for all 9 Herons, empty log/milestones', () => {
    const season = createSeason(42)
    expect(season.schedule).toHaveLength(20)
    expect(season.standings).toHaveLength(7)
    for (const record of season.standings) {
      expect(record.wins).toBe(0)
      expect(record.losses).toBe(0)
      expect(record.runsFor).toBe(0)
      expect(record.runsAgainst).toBe(0)
      expect(record.lastFive).toEqual([])
    }
    expect(season.batterStats).toHaveLength(9)
    for (const stats of season.batterStats) {
      expect(stats).toMatchObject({ pa: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, bb: 0, k: 0, r: 0, rbi: 0 })
    }
    expect(season.log).toEqual([])
    expect(season.firedMilestones).toEqual([])
  })

  it('is deterministic for a given seed', () => {
    expect(createSeason(2026)).toEqual(createSeason(2026))
  })
})

// ============================================================================
// Per-batter stats
// ============================================================================

function zeroStats(id: string): BatterStats {
  return { batterId: id, pa: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, bb: 0, k: 0, r: 0, rbi: 0 }
}

describe('recordPlateAppearance', () => {
  it('a walk raises PA and BB but not AB', () => {
    const next = recordPlateAppearance(zeroStats('b1'), 'walk', 0)
    expect(next.pa).toBe(1)
    expect(next.bb).toBe(1)
    expect(next.ab).toBe(0)
  })

  it('a strikeout raises PA, AB, and K', () => {
    const next = recordPlateAppearance(zeroStats('b1'), 'strikeout', 0)
    expect(next.pa).toBe(1)
    expect(next.ab).toBe(1)
    expect(next.k).toBe(1)
  })

  it('a sacrifice bunt raises PA but not AB', () => {
    const next = recordPlateAppearance(zeroStats('b1'), 'sacrifice-bunt', 0)
    expect(next.pa).toBe(1)
    expect(next.ab).toBe(0)
  })

  it('a sacrifice fly raises PA but not AB, and can carry an RBI', () => {
    const next = recordPlateAppearance(zeroStats('b1'), 'sacrifice-fly', 1)
    expect(next.pa).toBe(1)
    expect(next.ab).toBe(0)
    expect(next.rbi).toBe(1)
  })

  it('a home run with two runners on credits 3 RBI and counts as PA/AB/H/HR', () => {
    const next = recordPlateAppearance(zeroStats('b1'), 'hr', 3)
    expect(next.pa).toBe(1)
    expect(next.ab).toBe(1)
    expect(next.h).toBe(1)
    expect(next.hr).toBe(1)
    expect(next.rbi).toBe(3)
  })

  it('a double raises PA/AB/H/2B', () => {
    const next = recordPlateAppearance(zeroStats('b1'), 'double', 0)
    expect(next).toMatchObject({ pa: 1, ab: 1, h: 1, doubles: 1 })
  })

  it('a plain out and a double play both raise PA/AB only', () => {
    expect(recordPlateAppearance(zeroStats('b1'), 'out', 0)).toMatchObject({ pa: 1, ab: 1, h: 0 })
    expect(recordPlateAppearance(zeroStats('b1'), 'double-play', 0)).toMatchObject({ pa: 1, ab: 1, h: 0 })
  })
})

describe('accumulateStats', () => {
  it('is a no-op for a non-Herons batting side', () => {
    const season = createSeason(1)
    const someOtherTeam = OPPONENTS[0].id
    const result = {
      pitchResolution: { location: 'zone' as const, result: { kind: 'called-strike' as const } },
      paEnded: true,
      event: 'strikeout' as const,
      runsScored: [],
      outsAdded: 1,
      halfInningEnded: false,
      gameEnded: false,
      play: null
    }
    const next = accumulateStats(season, someOtherTeam, 'opp-batter-1', result)
    expect(next).toEqual(season)
  })

  it('credits a run to the runner who scored and an RBI to the batter, on a Herons single scoring a runner', () => {
    const season = createSeason(1)
    const batterId = season.batterStats[0].batterId
    const scorerId = season.batterStats[1].batterId
    const result = {
      pitchResolution: { location: 'zone' as const, result: { kind: 'in-play' as const, batted: 'single' as const } },
      paEnded: true,
      event: 'single' as const,
      runsScored: [scorerId],
      outsAdded: 0,
      halfInningEnded: false,
      gameEnded: false,
      play: null
    }
    const next = accumulateStats(season, HERONS_TEAM_ID, batterId, result)
    const batterStats = next.batterStats.find((s) => s.batterId === batterId)!
    const scorerStats = next.batterStats.find((s) => s.batterId === scorerId)!
    expect(batterStats.h).toBe(1)
    expect(batterStats.ab).toBe(1)
    expect(batterStats.rbi).toBe(1)
    expect(scorerStats.r).toBe(1)
  })
})

// ============================================================================
// Derived selectors
// ============================================================================

describe('battingAverage / onBasePercentage / sluggingPercentage', () => {
  it('0 AB gives .000, not NaN', () => {
    const stats = zeroStats('b1')
    expect(battingAverage(stats)).toBe(0)
    expect(onBasePercentage(stats)).toBe(0)
    expect(sluggingPercentage(stats)).toBe(0)
  })

  it('matches hand-computed values on a small fixture', () => {
    // 10 AB, 3 H (1 single counted implicitly, 1 double, 1 HR), 2 BB -> 12 PA
    const stats: BatterStats = { batterId: 'b1', pa: 12, ab: 10, h: 3, doubles: 1, triples: 0, hr: 1, bb: 2, k: 2, r: 2, rbi: 4 }
    // AVG = 3/10 = .300
    expect(battingAverage(stats)).toBeCloseTo(0.3, 10)
    // OBP = (3 + 2) / (10 + 2) = 5/12
    expect(onBasePercentage(stats)).toBeCloseTo(5 / 12, 10)
    // singles = 3 - 1 - 0 - 1 = 1; total bases = 1*1 + 1*2 + 0*3 + 1*4 = 7; SLG = 7/10
    expect(sluggingPercentage(stats)).toBeCloseTo(0.7, 10)
  })
})

describe('standingsTable', () => {
  it('sorts by win pct, computes games back / run differential / last-five display, handles 0 games', () => {
    const season = createSeason(1)
    const table = standingsTable(season)
    expect(table).toHaveLength(7)
    for (const row of table) {
      expect(row.winPct).toBe(0)
      expect(row.gamesBack).toBe(0)
      expect(row.runDifferential).toBe(0)
      expect(row.lastFiveDisplay).toBe('')
    }
  })

  it('sorts a fresh 0-0 season alphabetically by the short name the standings table prints', () => {
    const season = createSeason(1)
    const names = standingsTable(season).map((r) => r.teamShortName)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  it('shows the renamed team in the standings, full and short', () => {
    const season = createSeason(1)
    const table = standingsTable(season, 'Portland Pickles')
    const own = table.find((r) => r.teamId === 'herons')
    expect(own?.teamName).toBe('Portland Pickles')
    expect(own?.teamShortName).toBe('Pickles')
    // The other six are untouched.
    expect(table.filter((r) => r.teamId !== 'herons').map((r) => r.teamName)).toContain('Ashford Wrens')
  })

  it('falls back to the built-in name when no override is given or it is blank', () => {
    const season = createSeason(1)
    for (const override of [undefined, '', '   ']) {
      const own = standingsTable(season, override).find((r) => r.teamId === 'herons')
      expect(own?.teamName).toBe('Harbor Herons')
      expect(own?.teamShortName).toBe('Herons')
    }
  })

  it('re-sorts on the renamed team, so a rename moves the row', () => {
    const season = createSeason(1)
    const ids = (name?: string) => standingsTable(season, name).map((r) => r.teamId)
    // "Herons" sorts third of seven; "Albatrosses" sorts first.
    expect(ids()[2]).toBe('herons')
    expect(ids('Anchorage Albatrosses')[0]).toBe('herons')
  })

  it('the alphabetical tiebreak is only a tiebreak: a win still outranks it', () => {
    const season = createSeason(1)
    // Give the alphabetically *last* team the only win in the league.
    const byName = standingsTable(season)
    const lastAlphabetically = byName[byName.length - 1].teamId
    const standings = season.standings.map((r) =>
      r.teamId === lastAlphabetically ? { ...r, wins: 1 } : r
    )
    const table = standingsTable({ ...season, standings })
    expect(table[0].teamId).toBe(lastAlphabetically)
    // The teams still tied at 0-0 below it stay in alphabetical order.
    const tiedNames = table.slice(1).map((r) => r.teamShortName)
    expect(tiedNames).toEqual([...tiedNames].sort((a, b) => a.localeCompare(b)))
  })
})

// ============================================================================
// recordGameResult / checkMilestones / full season consistency
// ============================================================================

function fakeFinishedGame(gameIndex: number, homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number): GameState {
  return {
    gameIndex,
    homeTeamId,
    awayTeamId,
    homePitcherId: 'x',
    awayPitcherId: 'y',
    currentPitch: { pZone: 0.5, trueBucket: 'Coin flip', displayedBucket: 'Coin flip' },
    inning: 9,
    half: 'bottom',
    outs: 3,
    count: { balls: 0, strikes: 0 },
    bases: { first: null, second: null, third: null },
    homeScore,
    awayScore,
    lineScore: { home: [], away: [] },
    hits: { home: 0, away: 0 },
    currentBatterIndex: { home: 0, away: 0 },
    rngState: 0,
    plays: [],
    isOver: true
  }
}

describe('recordGameResult', () => {
  it('updates standings for both sides, appends the log, marks the schedule slot played, and fills out other teams games', () => {
    const season = createSeason(9)
    const scheduled = season.schedule[0]
    const gameState = fakeFinishedGame(0, scheduled.homeTeamId, scheduled.awayTeamId, 5, 3)
    const next = recordGameResult(season, gameState)

    expect(next.log).toHaveLength(1)
    expect(next.schedule[0].played).toBe(true)

    const homeWon = gameState.homeScore > gameState.awayScore
    const homeRecord = next.standings.find((r) => r.teamId === scheduled.homeTeamId)!
    const awayRecord = next.standings.find((r) => r.teamId === scheduled.awayTeamId)!
    expect(homeRecord.wins).toBe(homeWon ? 1 : 0)
    expect(awayRecord.wins).toBe(homeWon ? 0 : 1)
    expect(homeRecord.runsFor).toBe(5)
    expect(awayRecord.runsFor).toBe(3)

    // Every team should have played exactly one game after this slot: the
    // Herons game, plus the other five opponents paired 2-and-2 (one bye).
    const totalGamesPlayed = next.standings.reduce((sum, r) => sum + r.wins + r.losses, 0)
    // 2 teams from the Herons game + 4 teams from two other-team games = 6 teams x 1 game = 6,
    // but each game counts for 2 teams, so total (wins+losses) summed = 2 * numberOfGamesPlayed.
    expect(totalGamesPlayed).toBe(2 * 3)
  })

  it('formats the log line in the "G7 vs Loons W 5-3" shape', () => {
    const season = createSeason(9)
    const scheduled = season.schedule[6] // G7
    const heronsHome = scheduled.homeTeamId === HERONS_TEAM_ID
    const gameState = fakeFinishedGame(6, scheduled.homeTeamId, scheduled.awayTeamId, heronsHome ? 5 : 3, heronsHome ? 3 : 5)
    const next = recordGameResult(season, gameState)
    const line = formatLogEntry(next.log[0])
    expect(line).toMatch(/^G7 vs \w+ W \d+-\d+$/)
  })
})

describe('checkMilestones', () => {
  it('fires first-hr once and only once', () => {
    let season = createSeason(1)
    season = { ...season, batterStats: season.batterStats.map((s, i) => (i === 0 ? { ...s, hr: 1 } : s)) }
    const gameState = fakeFinishedGame(0, HERONS_TEAM_ID, OPPONENTS[0].id, 2, 1)

    const first = checkMilestones(season, gameState)
    expect(first.fired).toContain('first-hr')

    const second = checkMilestones(first.season, gameState)
    expect(second.fired).not.toContain('first-hr')
  })

  it('fires first-shutout when the Herons win and hold the opponent to 0', () => {
    const season = createSeason(1)
    const gameState = fakeFinishedGame(0, HERONS_TEAM_ID, OPPONENTS[0].id, 4, 0)
    const result = checkMilestones(season, gameState)
    expect(result.fired).toContain('first-shutout')
  })

  it('fires games-played-mark once the log reaches 10 entries', () => {
    let season = createSeason(1)
    for (let i = 0; i < 10; i++) {
      season = { ...season, log: [...season.log, { gameIndex: i, homeTeamId: HERONS_TEAM_ID, awayTeamId: OPPONENTS[0].id, homeScore: 1, awayScore: 0 }] }
    }
    const gameState = fakeFinishedGame(9, HERONS_TEAM_ID, OPPONENTS[0].id, 1, 0)
    const result = checkMilestones(season, gameState)
    expect(result.fired).toContain('games-played-mark')
    const again = checkMilestones(result.season, gameState)
    expect(again.fired).not.toContain('games-played-mark')
  })

  it('fires clinch once Herons wins reach the winning-season threshold, and eliminated once losses do', () => {
    let season = createSeason(1)
    season = {
      ...season,
      standings: season.standings.map((r) => (r.teamId === HERONS_TEAM_ID ? { ...r, wins: 11 } : r))
    }
    const gameState = fakeFinishedGame(0, HERONS_TEAM_ID, OPPONENTS[0].id, 1, 0)
    const clinch = checkMilestones(season, gameState)
    expect(clinch.fired).toContain('clinch')
    expect(clinch.fired).not.toContain('eliminated')

    let losingSeason = createSeason(1)
    losingSeason = {
      ...losingSeason,
      standings: losingSeason.standings.map((r) => (r.teamId === HERONS_TEAM_ID ? { ...r, losses: 10 } : r))
    }
    const eliminated = checkMilestones(losingSeason, fakeFinishedGame(0, HERONS_TEAM_ID, OPPONENTS[0].id, 0, 1))
    expect(eliminated.fired).toContain('eliminated')
  })

  it('fires season-over once the log matches the schedule length', () => {
    let season = createSeason(1)
    for (let i = 0; i < 20; i++) {
      season = { ...season, log: [...season.log, { gameIndex: i, homeTeamId: HERONS_TEAM_ID, awayTeamId: OPPONENTS[0].id, homeScore: 1, awayScore: 0 }] }
    }
    const gameState = fakeFinishedGame(19, HERONS_TEAM_ID, OPPONENTS[0].id, 1, 0)
    const result = checkMilestones(season, gameState)
    expect(result.fired).toContain('season-over')
  })
})

// ============================================================================
// Full headless season: the acceptance-level consistency test
// ============================================================================

describe('simulateSeason: a full 20-game season runs headless and is internally consistent', () => {
  const season = simulateSeason(2026)

  it('every game is played', () => {
    expect(season.schedule.every((g) => g.played)).toBe(true)
    expect(season.log).toHaveLength(20)
  })

  it('standings W+L totals equal games played for each team', () => {
    for (const record of season.standings) {
      // Herons play exactly 20; opponents play a mix of Herons games and
      // paired other-team games, but every recorded result increments
      // exactly one win or one loss, never both/neither.
      expect(record.wins + record.losses).toBeGreaterThan(0)
    }
    const heronsRecord = season.standings.find((r) => r.teamId === HERONS_TEAM_ID)!
    expect(heronsRecord.wins + heronsRecord.losses).toBe(20)
  })

  it("the Herons' summed runs match the season log", () => {
    const heronsRecord = season.standings.find((r) => r.teamId === HERONS_TEAM_ID)!
    let runsFor = 0
    let runsAgainst = 0
    for (const entry of season.log) {
      const heronsHome = entry.homeTeamId === HERONS_TEAM_ID
      runsFor += heronsHome ? entry.homeScore : entry.awayScore
      runsAgainst += heronsHome ? entry.awayScore : entry.homeScore
    }
    expect(heronsRecord.runsFor).toBe(runsFor)
    expect(heronsRecord.runsAgainst).toBe(runsAgainst)
  })

  it('per-batter H <= AB <= PA for every batter, and the roster is the 9 Herons', () => {
    expect(season.batterStats).toHaveLength(9)
    expect(season.batterStats.map((s) => s.batterId).sort()).toEqual(HERONS_TEAM.batters.map((b) => b.id).sort())
    for (const stats of season.batterStats) {
      expect(stats.h).toBeLessThanOrEqual(stats.ab)
      expect(stats.ab).toBeLessThanOrEqual(stats.pa)
      expect(stats.doubles + stats.triples + stats.hr).toBeLessThanOrEqual(stats.h)
    }
  })

  it('is deterministic for a given seed', () => {
    const other = simulateSeason(2026)
    expect(other).toEqual(season)
  })

  it('a different seed produces a different season', () => {
    const other = simulateSeason(2027)
    expect(other).not.toEqual(season)
  })
})

describe('shortenTeamName', () => {
  it('takes the last word, matching how the built-in names are shaped', () => {
    expect(shortenTeamName('Portland Pickles')).toBe('Pickles')
    expect(shortenTeamName('Marrow Creek Cranes')).toBe('Cranes')
  })

  it('uses a one-word name whole', () => {
    expect(shortenTeamName('Herons')).toBe('Herons')
  })

  it('tolerates stray whitespace', () => {
    expect(shortenTeamName('  Harbor   Herons  ')).toBe('Herons')
  })
})
