import { describe, it, expect } from 'vitest'
import { applyPitch, createGame } from '../src/engine/inning'
import { makeRng } from '../src/engine/rng'
import type { Teams } from '../src/engine/inning'
import { StubRng, PAD, makeTeam, makeGameState } from './fixtures'

const home = makeTeam('home')
const away = makeTeam('away')
const teams: Teams = { home, away }

function stub(values: number[]): StubRng {
  return new StubRng([...values, ...PAD])
}

describe('GAME_DESIGN.md section 4.1 scenarios (implemented verbatim)', () => {
  it('Given runners on 1st and 3rd, 1 out, batter hits a single with R2-scores roll irrelevant / When resolved with the "R1 to third" roll failing / Then R3 scores, R1 is on second, batter on first, 1 out, +1 run', () => {
    const state = makeGameState({
      outs: 1,
      bases: { first: 'r1', second: null, third: 'r3' },
      currentBatterIndex: { home: 0, away: 0 },
      half: 'top'
    })
    // location=zone(0.0), swing=in play(0.0), batted=single(0.7), R1-to-third roll fails(0.999999)
    const rng = stub([0.0, 0.0, 0.7, 0.999999])
    const { state: next, result } = applyPitch(state, 'Contact', teams, rng)

    expect(result.event).toBe('single')
    expect(result.runsScored).toEqual(['r3'])
    expect(next.bases).toEqual({ first: away.batters[0].id, second: 'r1', third: null })
    expect(next.outs).toBe(1)
    expect(next.awayScore).toBe(1)
  })

  it('Given bases loaded, 2 outs, count 3-2 / When the batter takes and the pitch is a ball / Then a walk: one run scores, bases stay loaded, 2 outs', () => {
    const state = makeGameState({
      outs: 2,
      count: { balls: 3, strikes: 2 },
      bases: { first: 'r1', second: 'r2', third: 'r3' },
      currentPitch: { pZone: 0.5 },
      half: 'top'
    })
    // location=ball (next() >= pZone)
    const rng = stub([0.9])
    const { state: next, result } = applyPitch(state, 'Take', teams, rng)

    expect(result.event).toBe('walk')
    expect(result.runsScored).toEqual(['r3'])
    expect(next.awayScore).toBe(1)
    expect(next.bases).toEqual({ first: away.batters[0].id, second: 'r1', third: 'r2' })
    expect(next.outs).toBe(2)
  })

  it('Given runner on 1st, 0 outs / When the batter grounds out and the DP roll succeeds / Then 2 outs, bases empty', () => {
    const state = makeGameState({
      outs: 0,
      bases: { first: 'r1', second: null, third: null },
      half: 'top'
    })
    // location=zone(0.0), swing=in play(0.0), batted=out(0.0), DP roll succeeds(0.0)
    const rng = stub([0.0, 0.0, 0.0, 0.0])
    const { state: next, result } = applyPitch(state, 'Contact', teams, rng)

    expect(result.event).toBe('double-play')
    expect(next.outs).toBe(2)
    expect(next.bases).toEqual({ first: null, second: null, third: null })
    expect(next.awayScore).toBe(0)
  })

  it('Given bottom of the 9th, home team trails by 1, runner on 2nd, 2 outs / When the batter hits a double and the R1 roll is irrelevant / Then the game is tied and continues; not over', () => {
    const state = makeGameState({
      inning: 9,
      half: 'bottom',
      outs: 2,
      bases: { first: null, second: 'r2', third: null },
      homeScore: 3,
      awayScore: 4
    })
    // location=zone(0.0), swing=in play(0.0), batted=double(0.92) -- no R1 roll: first base is empty
    const rng = stub([0.0, 0.0, 0.92])
    const { state: next, result } = applyPitch(state, 'Contact', teams, rng)

    expect(result.event).toBe('double')
    expect(next.homeScore).toBe(4)
    expect(next.awayScore).toBe(4)
    expect(next.isOver).toBe(false)
  })

  it('Given top of the 9th ends with the home team ahead / Then the game ends without a bottom half', () => {
    const state = makeGameState({
      inning: 9,
      half: 'top',
      outs: 2,
      count: { balls: 0, strikes: 2 },
      bases: { first: null, second: null, third: null },
      homeScore: 5,
      awayScore: 3,
      currentPitch: { pZone: 0.9 }
    })
    // location=zone -> called strike -> strike 3 -> the third out
    const rng = stub([0.0])
    const { state: next, result } = applyPitch(state, 'Take', teams, rng)

    expect(result.event).toBe('strikeout')
    expect(result.halfInningEnded).toBe(true)
    expect(result.gameEnded).toBe(true)
    expect(next.isOver).toBe(true)
    expect(next.homeScore).toBe(5)
    expect(next.awayScore).toBe(3)
  })

  it('Given a count of 1-2 and a batter who strikes out (or walks, or puts the ball in play) / When the plate appearance ends / Then the next batter\'s count is 0-0, and outs, bases and score reflect the play', () => {
    // Strikes out: 1-2, Take, pitch in the zone -> called strike three.
    const strikeoutState = makeGameState({
      outs: 0,
      count: { balls: 1, strikes: 2 },
      bases: { first: 'r1', second: null, third: null },
      currentPitch: { pZone: 0.9 },
      half: 'top'
    })
    const strikeout = applyPitch(strikeoutState, 'Take', teams, stub([0.0]))
    expect(strikeout.result.event).toBe('strikeout')
    expect(strikeout.state.count).toEqual({ balls: 0, strikes: 0 })
    expect(strikeout.state.outs).toBe(1)
    expect(strikeout.state.bases).toEqual({ first: 'r1', second: null, third: null })
    expect(strikeout.state.awayScore).toBe(0)

    // Puts the ball in play: 1-2, Contact, zone, in play, single.
    const inPlayState = makeGameState({
      outs: 0,
      count: { balls: 1, strikes: 2 },
      bases: { first: null, second: null, third: 'r3' },
      currentPitch: { pZone: 0.6 },
      half: 'top'
    })
    const inPlay = applyPitch(inPlayState, 'Contact', teams, stub([0.0, 0.0, 0.7]))
    expect(inPlay.result.event).toBe('single')
    expect(inPlay.state.count).toEqual({ balls: 0, strikes: 0 })
    expect(inPlay.state.outs).toBe(0)
    expect(inPlay.state.bases).toEqual({ first: away.batters[0].id, second: null, third: null })
    expect(inPlay.state.awayScore).toBe(1)

    // Walks: ball four cannot be reached from 1-2 on one pitch, so the walk
    // arm of this scenario starts at 3-2, the last count from which it can.
    const walkState = makeGameState({
      outs: 0,
      count: { balls: 3, strikes: 2 },
      bases: { first: 'r1', second: null, third: null },
      currentPitch: { pZone: 0.1 },
      half: 'top'
    })
    const walk = applyPitch(walkState, 'Take', teams, stub([0.9]))
    expect(walk.result.event).toBe('walk')
    expect(walk.state.count).toEqual({ balls: 0, strikes: 0 })
    expect(walk.state.outs).toBe(0)
    expect(walk.state.bases).toEqual({ first: away.batters[0].id, second: 'r1', third: null })
    expect(walk.state.awayScore).toBe(0)
  })

  it('Given bottom of the 9th, tied, runner on 3rd, 1 out / When the batter singles / Then the game ends immediately as a walk-off; the half-inning does not continue', () => {
    const state = makeGameState({
      inning: 9,
      half: 'bottom',
      outs: 1,
      bases: { first: null, second: null, third: 'r3' },
      homeScore: 3,
      awayScore: 3,
      currentPitch: { pZone: 0.6 }
    })
    // location=zone(0.0), swing=in play(0.0), batted=single(0.7); no R2/R1 rolls, first and second are empty
    const { state: next, result } = applyPitch(state, 'Contact', teams, stub([0.0, 0.0, 0.7]))

    expect(result.event).toBe('single')
    expect(result.runsScored).toEqual(['r3'])
    expect(result.gameEnded).toBe(true)
    expect(result.halfInningEnded).toBe(false)
    expect(next.isOver).toBe(true)
    expect(next.homeScore).toBe(4)
    expect(next.awayScore).toBe(3)
    // The half-inning did not continue: the out count stands where the
    // walk-off left it rather than being reset by a half-inning transition.
    expect(next.outs).toBe(1)
  })
})

describe('pitch-by-pitch trace: every plate appearance lasts at least three pitches', () => {
  it('plays one always-Take half-inning and counts the pitches in each plate appearance', () => {
    // With Take on every pitch, a plate appearance can only end on strike
    // three or ball four, so three pitches is the hard floor. Before the
    // count was reset per plate appearance, a batter inheriting the
    // previous batter's two strikes could be struck out on one pitch.
    const state = createGame({
      gameIndex: 0,
      homeTeam: home,
      awayTeam: away,
      homePitcher: home.pitchers[0],
      awayPitcher: away.pitchers[0],
      seed: 20260401
    })
    const rng = makeRng(20260402)

    let current = state
    let pitchesInCurrentPa = 0
    const paLengths: number[] = []

    while (true) {
      const { state: next, result } = applyPitch(current, 'Take', teams, rng)
      pitchesInCurrentPa += 1
      if (result.paEnded) {
        paLengths.push(pitchesInCurrentPa)
        pitchesInCurrentPa = 0
      }
      current = next
      if (result.halfInningEnded || result.gameEnded) break
    }

    // A half-inning always ends on a completed plate appearance (the third out).
    expect(pitchesInCurrentPa).toBe(0)
    expect(paLengths.length).toBeGreaterThanOrEqual(3)
    for (const length of paLengths) {
      expect(length).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('walk forcing', () => {
  it('bases loaded walk forces a run', () => {
    const state = makeGameState({
      bases: { first: 'r1', second: 'r2', third: 'r3' },
      count: { balls: 3, strikes: 0 },
      currentPitch: { pZone: 0.1 },
      half: 'top'
    })
    const rng = stub([0.9]) // ball
    const { state: next, result } = applyPitch(state, 'Take', teams, rng)
    expect(result.event).toBe('walk')
    expect(result.runsScored).toEqual(['r3'])
    expect(next.awayScore).toBe(1)
  })

  it('runner on second only is not forced and does not advance on a walk', () => {
    const state = makeGameState({
      bases: { first: null, second: 'r2', third: null },
      count: { balls: 3, strikes: 0 },
      currentPitch: { pZone: 0.1 },
      half: 'top'
    })
    const rng = stub([0.9]) // ball
    const { state: next, result } = applyPitch(state, 'Take', teams, rng)
    expect(result.event).toBe('walk')
    expect(next.bases.second).toBe('r2')
    expect(result.runsScored).toEqual([])
  })
})

describe('home run with bases loaded', () => {
  it('scores 4 runs', () => {
    const state = makeGameState({
      bases: { first: 'r1', second: 'r2', third: 'r3' },
      currentPitch: { pZone: 0.6 },
      half: 'top'
    })
    // location=zone(0.0), swing=in play(0.0), batted=hr (last slot: need roll near top of range)
    const rng = stub([0.0, 0.0, 0.999])
    const { state: next, result } = applyPitch(state, 'Contact', teams, rng)
    expect(result.event).toBe('hr')
    expect(result.runsScored).toHaveLength(4)
    expect(next.awayScore).toBe(4)
    expect(next.bases).toEqual({ first: null, second: null, third: null })
  })
})

describe('double play recording the third out', () => {
  it('scores no run even with a runner on third', () => {
    const state = makeGameState({
      outs: 1,
      bases: { first: 'r1', second: null, third: 'r3' },
      currentPitch: { pZone: 0.6 },
      half: 'top'
    })
    const rng = stub([0.0, 0.0, 0.0, 0.0]) // zone, in play, out, DP succeeds
    const { state: next, result } = applyPitch(state, 'Contact', teams, rng)
    expect(result.event).toBe('double-play')
    expect(result.runsScored).toEqual([])
    expect(next.outs).toBe(0) // half-inning ended and reset
    expect(next.awayScore).toBe(0)
  })
})

describe('half-inning transition', () => {
  it('flips at three outs with bases cleared and count reset', () => {
    const state = makeGameState({
      inning: 1,
      half: 'top',
      outs: 2,
      count: { balls: 1, strikes: 2 },
      bases: { first: 'r1', second: null, third: null },
      currentPitch: { pZone: 0.9 },
      plays: ['Someone singles.']
    })
    const { state: next } = applyPitch(state, 'Take', teams, stub([0.0]))
    expect(next.half).toBe('bottom')
    expect(next.inning).toBe(1)
    expect(next.outs).toBe(0)
    expect(next.count).toEqual({ balls: 0, strikes: 0 })
    expect(next.bases).toEqual({ first: null, second: null, third: null })
    expect(next.plays).toEqual([])
  })

  it('increments the inning when going from bottom to top', () => {
    const state = makeGameState({
      inning: 3,
      half: 'bottom',
      outs: 2,
      count: { balls: 0, strikes: 2 },
      bases: { first: null, second: null, third: null },
      currentPitch: { pZone: 0.9 }
    })
    const { state: next } = applyPitch(state, 'Take', teams, stub([0.0]))
    expect(next.half).toBe('top')
    expect(next.inning).toBe(4)
  })
})

describe('foul with two strikes', () => {
  it('leaves the count at two strikes', () => {
    const state = makeGameState({
      count: { balls: 1, strikes: 2 },
      currentPitch: { pZone: 0.6 },
      half: 'top'
    })
    // location=zone(0.0), swing outcome=foul: need roll landing in foul slice.
    // contact-zone: [inPlay 0.7, foul 0.2, whiff 0.1] -> foul range [0.7, 0.9)
    const rng = stub([0.0, 0.8])
    const { state: next, result } = applyPitch(state, 'Contact', teams, rng)
    expect(result.pitchResolution.result.kind).toBe('foul')
    expect(next.count).toEqual({ balls: 1, strikes: 2 })
    expect(result.paEnded).toBe(false)
  })

  it('a foul with fewer than two strikes adds a strike', () => {
    const state = makeGameState({
      count: { balls: 1, strikes: 0 },
      currentPitch: { pZone: 0.6 },
      half: 'top'
    })
    const rng = stub([0.0, 0.8])
    const { state: next, result } = applyPitch(state, 'Contact', teams, rng)
    expect(result.pitchResolution.result.kind).toBe('foul')
    expect(next.count).toEqual({ balls: 1, strikes: 1 })
  })
})

describe('batting order', () => {
  it('advances only when the plate appearance ends, and each side keeps its own spot', () => {
    const state = makeGameState({
      count: { balls: 1, strikes: 2 },
      currentPitch: { pZone: 0.6 },
      currentBatterIndex: { home: 3, away: 0 },
      half: 'top'
    })
    // foul: PA continues
    const foulRng = stub([0.0, 0.8])
    const { state: afterFoul } = applyPitch(state, 'Contact', teams, foulRng)
    expect(afterFoul.currentBatterIndex).toEqual({ home: 3, away: 0 })

    // now a called strike ends the PA (strikeout)
    const strikeoutState = { ...afterFoul, currentPitch: { pZone: 0.9, trueBucket: 'Coin flip' as const, displayedBucket: 'Coin flip' as const } }
    const { state: afterK } = applyPitch(strikeoutState, 'Take', teams, stub([0.0]))
    expect(afterK.currentBatterIndex.away).toBe(1)
    expect(afterK.currentBatterIndex.home).toBe(3) // untouched: home didn't bat
  })
})

describe('extra innings', () => {
  it('a game tied after 9 continues into the 10th', () => {
    const state = makeGameState({
      inning: 9,
      half: 'bottom',
      outs: 2,
      count: { balls: 0, strikes: 2 },
      bases: { first: null, second: null, third: null },
      homeScore: 4,
      awayScore: 4,
      currentPitch: { pZone: 0.9 }
    })
    const { state: next, result } = applyPitch(state, 'Take', teams, stub([0.0]))
    expect(result.gameEnded).toBe(false)
    expect(next.isOver).toBe(false)
    expect(next.inning).toBe(10)
    expect(next.half).toBe('top')
  })
})

describe('serialization', () => {
  it('GameState survives JSON.parse(JSON.stringify(state)) unchanged', () => {
    const state = createGame({
      gameIndex: 0,
      homeTeam: home,
      awayTeam: away,
      homePitcher: home.pitchers[0],
      awayPitcher: away.pitchers[0],
      seed: 42
    })
    const roundTripped = JSON.parse(JSON.stringify(state))
    expect(roundTripped).toEqual(state)
  })

  it('resuming from a serialized state reproduces the same next pitch', () => {
    const state = createGame({
      gameIndex: 0,
      homeTeam: home,
      awayTeam: away,
      homePitcher: home.pitchers[0],
      awayPitcher: away.pitchers[0],
      seed: 7
    })
    const serialized = JSON.parse(JSON.stringify(state))

    // The stored preview is what the player already saw; it must not
    // change on resume, and applying the same choice with a resumed Rng
    // seeded from rngState must reproduce the same outcome.
    expect(serialized.currentPitch).toEqual(state.currentPitch)

    const rngA = makeRng(state.rngState)
    const rngB = makeRng(serialized.rngState)
    const resultA = applyPitch(state, 'Contact', teams, rngA)
    const resultB = applyPitch(serialized, 'Contact', teams, rngB)
    expect(resultA.state).toEqual(resultB.state)
    expect(resultA.result).toEqual(resultB.result)
  })
})

describe('createGame', () => {
  it('builds a fresh state with the first pitch already prepared', () => {
    const state = createGame({
      gameIndex: 2,
      homeTeam: home,
      awayTeam: away,
      homePitcher: home.pitchers[0],
      awayPitcher: away.pitchers[0],
      seed: 123
    })
    expect(state.inning).toBe(1)
    expect(state.half).toBe('top')
    expect(state.outs).toBe(0)
    expect(state.isOver).toBe(false)
    expect(state.currentPitch.pZone).toBeGreaterThanOrEqual(0.2)
    expect(state.currentPitch.pZone).toBeLessThanOrEqual(0.9)
  })
})

describe('walk-off', () => {
  it('ends the game the moment the home team takes the lead in the bottom of the 9th', () => {
    const state = makeGameState({
      inning: 9,
      half: 'bottom',
      outs: 1,
      bases: { first: null, second: 'r2', third: null },
      homeScore: 3,
      awayScore: 3
    })
    // location=zone, swing=in play, batted=double -> R2 scores the go-ahead run
    const rng = stub([0.0, 0.0, 0.92])
    const { state: next, result } = applyPitch(state, 'Contact', teams, rng)

    expect(next.homeScore).toBe(4)
    expect(next.isOver).toBe(true)
    expect(result.gameEnded).toBe(true)
    // The half-inning did not run out of outs; the game simply stopped.
    expect(next.outs).toBe(1)
  })

  it('does not walk off before regulation is complete', () => {
    const state = makeGameState({
      inning: 5,
      half: 'bottom',
      outs: 1,
      bases: { first: null, second: 'r2', third: null },
      homeScore: 3,
      awayScore: 3
    })
    const rng = stub([0.0, 0.0, 0.92])
    const { state: next } = applyPitch(state, 'Contact', teams, rng)

    expect(next.homeScore).toBe(4)
    expect(next.isOver).toBe(false)
  })

  it('does not walk off on a run that only ties the game', () => {
    const state = makeGameState({
      inning: 9,
      half: 'bottom',
      outs: 1,
      bases: { first: null, second: 'r2', third: null },
      homeScore: 3,
      awayScore: 4
    })
    const rng = stub([0.0, 0.0, 0.92])
    const { state: next } = applyPitch(state, 'Contact', teams, rng)

    expect(next.homeScore).toBe(4)
    expect(next.awayScore).toBe(4)
    expect(next.isOver).toBe(false)
  })

  it('walks off in extra innings too', () => {
    const state = makeGameState({
      inning: 11,
      half: 'bottom',
      outs: 0,
      bases: { first: null, second: 'r2', third: null },
      homeScore: 6,
      awayScore: 6
    })
    const rng = stub([0.0, 0.0, 0.92])
    const { state: next } = applyPitch(state, 'Contact', teams, rng)

    expect(next.isOver).toBe(true)
  })
})

describe('line score', () => {
  it('records a 0 for a scoreless half-inning that was played', () => {
    const state = makeGameState({ inning: 1, half: 'top', outs: 2, count: { balls: 0, strikes: 2 }, currentPitch: { pZone: 0.9 } })
    // A called third strike: the half ends having scored nothing.
    const { state: next } = applyPitch(state, 'Take', teams, stub([0.0]))
    expect(next.lineScore.away[0]).toBe(0)
    expect(next.lineScore.away.length).toBe(1)
    // The home side has not batted yet, so it has no column at all.
    expect(next.lineScore.home.length).toBe(0)
  })
})
