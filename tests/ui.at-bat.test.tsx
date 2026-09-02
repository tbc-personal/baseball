import { describe, it, expect } from 'vitest'
import {
  ordinal,
  halfInningLabel,
  battingOrderLabel,
  countDots,
  countNumeral,
  surname,
  abbreviateSurname,
  runnerDisplay,
  formatAverage,
  seasonLine
} from '../src/ui/format'
import { recommendedChoice } from '../src/engine/recommend'
import { isBuntAvailable } from '../src/engine/pitch'
import type { Bases, BatterStats, Count } from '../src/engine/types'
import { makeBatter } from './fixtures'

const EMPTY_BASES: Bases = { first: null, second: null, third: null }

function makeCount(balls: number, strikes: number): Count {
  return { balls, strikes }
}

describe('ordinal', () => {
  it('handles the common suffixes', () => {
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(2)).toBe('2nd')
    expect(ordinal(3)).toBe('3rd')
    expect(ordinal(4)).toBe('4th')
    expect(ordinal(9)).toBe('9th')
  })

  it('handles the 11-13 teen exception', () => {
    expect(ordinal(11)).toBe('11th')
    expect(ordinal(12)).toBe('12th')
    expect(ordinal(13)).toBe('13th')
    expect(ordinal(21)).toBe('21st')
  })
})

describe('halfInningLabel', () => {
  it('labels top and bottom across several innings', () => {
    expect(halfInningLabel('top', 1)).toBe('Top 1st')
    expect(halfInningLabel('bottom', 1)).toBe('Bot 1st')
    expect(halfInningLabel('top', 4)).toBe('Top 4th')
    expect(halfInningLabel('bottom', 4)).toBe('Bot 4th')
    expect(halfInningLabel('top', 9)).toBe('Top 9th')
    expect(halfInningLabel('bottom', 11)).toBe('Bot 11th')
  })
})

describe('battingOrderLabel', () => {
  it('converts a 0-based index to an ordinal-in-order label', () => {
    expect(battingOrderLabel(0)).toBe('1st in order')
    expect(battingOrderLabel(2)).toBe('3rd in order')
    expect(battingOrderLabel(8)).toBe('9th in order')
  })
})

describe('countDots', () => {
  it('0-0: all hollow, three ball slots, two strike slots, two out slots', () => {
    const dots = countDots(makeCount(0, 0), 0)
    expect(dots.balls).toEqual(['hollow', 'hollow', 'hollow'])
    expect(dots.strikes).toEqual(['hollow', 'hollow'])
    expect(dots.outs).toEqual(['hollow', 'hollow'])
  })

  it('3-2 (full count): all slots filled', () => {
    const dots = countDots(makeCount(3, 2), 1)
    expect(dots.balls).toEqual(['filled', 'filled', 'filled'])
    expect(dots.strikes).toEqual(['filled', 'filled'])
    expect(dots.outs).toEqual(['filled', 'hollow'])
  })

  it('2-1, 1 out: matches the mockup example', () => {
    const dots = countDots(makeCount(2, 1), 1)
    expect(dots.balls).toEqual(['filled', 'filled', 'hollow'])
    expect(dots.strikes).toEqual(['filled', 'hollow'])
    expect(dots.outs).toEqual(['filled', 'hollow'])
  })

  it('2 outs: both out slots filled', () => {
    const dots = countDots(makeCount(0, 0), 2)
    expect(dots.outs).toEqual(['filled', 'filled'])
  })
})

describe('countNumeral', () => {
  it('formats balls-strikes with an en dash', () => {
    expect(countNumeral(makeCount(0, 0))).toBe('0–0')
    expect(countNumeral(makeCount(2, 1))).toBe('2–1')
    expect(countNumeral(makeCount(3, 2))).toBe('3–2')
  })
})

describe('surname', () => {
  it('takes the last token of a plain name', () => {
    expect(surname('Dee Okafor')).toBe('Okafor')
  })

  it('takes the last token even with a quoted nickname in the middle', () => {
    expect(surname('Tomasz "Tank" Wrona')).toBe('Wrona')
  })
})

describe('abbreviateSurname', () => {
  it('leaves a short surname whole', () => {
    expect(abbreviateSurname('Okafor')).toBe('Okafor')
    expect(abbreviateSurname('Wrona')).toBe('Wrona')
  })

  it('truncates a long surname to 4 chars + a period, matching the mockup', () => {
    expect(abbreviateSurname('Villanueva')).toBe('Vill.')
  })
})

describe('runnerDisplay', () => {
  const batters = [makeBatter('b1', { name: 'Dee Okafor' }), makeBatter('b2', { name: 'Marco Villanueva' }), makeBatter('b3', { name: 'Sam Achterberg' })]

  it('empty bases: all null', () => {
    expect(runnerDisplay(EMPTY_BASES, batters)).toEqual({ first: null, second: null, third: null })
  })

  it('bases loaded: all three (abbreviated where long)', () => {
    const bases: Bases = { first: 'b1', second: 'b2', third: 'b3' }
    expect(runnerDisplay(bases, batters)).toEqual({ first: 'Okafor', second: 'Vill.', third: 'Acht.' })
  })

  it('runner on second only', () => {
    const bases: Bases = { first: null, second: 'b2', third: null }
    expect(runnerDisplay(bases, batters)).toEqual({ first: null, second: 'Vill.', third: null })
  })
})

describe('formatAverage / seasonLine', () => {
  it('drops the leading zero', () => {
    expect(formatAverage(0.281)).toBe('.281')
    expect(formatAverage(0)).toBe('.000')
  })

  it('builds the batter-card season line', () => {
    const stats: BatterStats = { batterId: 'b1', pa: 20, ab: 18, h: 5, doubles: 1, triples: 0, hr: 4, bb: 2, k: 3, r: 3, rbi: 8 }
    // battingAverage = 5/18 = .2777... -> ".278"
    expect(seasonLine(stats)).toBe('.278 · 4 HR')
  })
})

describe('recommendedChoice (invented UI affordance, not a game rule)', () => {
  it('recommends Power on a likely-strike read', () => {
    expect(recommendedChoice('Likely strike')).toBe('Power')
  })

  it('recommends Take on a likely-ball read', () => {
    expect(recommendedChoice('Likely ball')).toBe('Take')
  })

  it('recommends Contact on a coin flip', () => {
    expect(recommendedChoice('Coin flip')).toBe('Contact')
  })
})

describe('bunt button visibility matches isBuntAvailable (GAME_DESIGN.md 3.6)', () => {
  it('hidden with empty bases', () => {
    expect(isBuntAvailable(EMPTY_BASES, 0, makeCount(0, 0))).toBe(false)
  })

  it('shown with a runner on first, 0 outs, 0 strikes', () => {
    const bases: Bases = { first: 'b1', second: null, third: null }
    expect(isBuntAvailable(bases, 0, makeCount(0, 0))).toBe(true)
  })

  it('shown with a runner on second only', () => {
    const bases: Bases = { first: null, second: 'b1', third: null }
    expect(isBuntAvailable(bases, 1, makeCount(1, 1))).toBe(true)
  })

  it('hidden with a runner on third only (not first or second)', () => {
    const bases: Bases = { first: null, second: null, third: 'b1' }
    expect(isBuntAvailable(bases, 0, makeCount(0, 0))).toBe(false)
  })

  it('hidden with 2 outs even with a runner on first', () => {
    const bases: Bases = { first: 'b1', second: null, third: null }
    expect(isBuntAvailable(bases, 2, makeCount(0, 0))).toBe(false)
  })

  it('hidden with 2 strikes', () => {
    const bases: Bases = { first: 'b1', second: null, third: null }
    expect(isBuntAvailable(bases, 0, makeCount(1, 2))).toBe(false)
  })

  it('shown at 1 out, 1 strike, runner on first', () => {
    const bases: Bases = { first: 'b1', second: null, third: null }
    expect(isBuntAvailable(bases, 1, makeCount(2, 1))).toBe(true)
  })
})
