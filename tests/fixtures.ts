import type { Rng } from '../src/engine/rng'
import type { Batter, Pitcher, Team, Bases, GameState } from '../src/engine/types'

/**
 * A scripted Rng: returns each value in `values` in order, then throws if
 * asked for more. Lets scenario tests pin down exactly which branch each
 * roll takes without depending on a seed producing the right sequence.
 */
export class StubRng implements Rng {
  private i = 0
  private values: number[]

  constructor(values: number[]) {
    this.values = values
  }

  next(): number {
    if (this.i >= this.values.length) {
      throw new Error(`StubRng exhausted after ${this.i} calls`)
    }
    return this.values[this.i++]
  }

  state(): number {
    return this.i
  }
}

/** Padding appended to scripted sequences so unrelated trailing rolls (like the next pitch's read) never exhaust the stub. */
export const PAD = Array(10).fill(0.5)

export function makeBatter(id: string, overrides: Partial<Batter> = {}): Batter {
  return { id, name: `Batter ${id}`, position: 'CF', contact: 50, power: 50, eye: 50, ...overrides }
}

export function makePitcher(id: string, overrides: Partial<Pitcher> = {}): Pitcher {
  return { id, name: `Pitcher ${id}`, control: 50, stuff: 50, tendency: 'Neutral', ...overrides }
}

export function makeTeam(id: string, overrides: Partial<Team> = {}): Team {
  const batters = overrides.batters ?? Array.from({ length: 9 }, (_, i) => makeBatter(`${id}-b${i + 1}`))
  const pitchers = overrides.pitchers ?? [makePitcher(`${id}-p1`)]
  return { id, name: id, shortName: id, batters, pitchers, ...overrides }
}

export const EMPTY_BASES: Bases = { first: null, second: null, third: null }

export interface GameStateOverrides extends Partial<Omit<GameState, 'currentPitch'>> {
  currentPitch?: Partial<GameState['currentPitch']>
}

/** A minimal, valid GameState for tests, with sane defaults overridable per-test. */
export function makeGameState(overrides: GameStateOverrides = {}): GameState {
  const { currentPitch, ...rest } = overrides
  return {
    gameIndex: 0,
    homeTeamId: 'home',
    awayTeamId: 'away',
    homePitcherId: 'home-p1',
    awayPitcherId: 'away-p1',
    currentPitch: { pZone: 0.6, trueBucket: 'Coin flip', displayedBucket: 'Coin flip', ...currentPitch },
    inning: 1,
    half: 'top',
    outs: 0,
    count: { balls: 0, strikes: 0 },
    bases: { ...EMPTY_BASES },
    homeScore: 0,
    awayScore: 0,
    lineScore: { home: [], away: [] },
    hits: { home: 0, away: 0 },
    currentBatterIndex: { home: 0, away: 0 },
    rngState: 0,
    plays: [],
    isOver: false,
    ...rest
  }
}
