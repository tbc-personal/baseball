import { describe, it, expect } from 'vitest'
import {
  playGutter,
  halfInningSummary,
  primaryAction,
  resumeSentence,
  formatRate,
  formatRunDifferential,
  formatGamesBack,
  saveCodeExcerpt,
  formatCharacterCount,
  relativeTime,
  previewSummary,
  describeHalfInning,
  milestoneLine,
  gameResultLine
} from '../src/ui/format'
import { sortBatting, type BattingRow } from '../src/ui/SeasonScreen'
import type { BatterStats } from '../src/engine/types'

const stats = (o: Partial<BatterStats>): BatterStats => ({
  batterId: 'b', pa: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, bb: 0, k: 0, r: 0, rbi: 0, ...o
})

describe('playGutter (Between.dc.html gutter column)', () => {
  it('shows a dash when the play recorded no out', () => {
    expect(playGutter({ outsAfter: 0, runsScored: 0 }, 0)).toEqual({ marker: '—', scored: false })
  })
  it('shows the out number when the play recorded an out', () => {
    expect(playGutter({ outsAfter: 2, runsScored: 0 }, 1)).toEqual({ marker: '2', scored: false })
  })
  it('marks a play that scored', () => {
    expect(playGutter({ outsAfter: 1, runsScored: 1 }, 0).scored).toBe(true)
  })
  it('a sacrifice fly both records an out and scores', () => {
    expect(playGutter({ outsAfter: 1, runsScored: 1 }, 0)).toEqual({ marker: '1', scored: true })
  })
})

describe('halfInningSummary', () => {
  it('pluralises correctly', () => {
    expect(halfInningSummary(1, 2, 1)).toBe('1 run · 2 hits · 1 LOB')
    expect(halfInningSummary(0, 1, 0)).toBe('0 runs · 1 hit · 0 LOB')
    expect(halfInningSummary(3, 0, 2)).toBe('3 runs · 0 hits · 2 LOB')
  })
})

describe('primaryAction (GAME_DESIGN 2: exactly one primary action)', () => {
  const base = { seasonComplete: false, hasGameInProgress: true, midAtBat: false, half: 'top' as const, inning: 4 }
  it('offers to resume when mid-at-bat', () => {
    expect(primaryAction({ ...base, midAtBat: true })).toEqual({ kind: 'resume', label: 'Pick up the 4th' })
  })
  it('offers to play the half when a game is in progress but not mid-at-bat', () => {
    expect(primaryAction(base)).toEqual({ kind: 'play-half', label: 'Play the 4th' })
  })
  it('offers the next game when none is in progress', () => {
    expect(primaryAction({ ...base, hasGameInProgress: false }).kind).toBe('next-game')
  })
  it('reports season over, and that outranks everything else', () => {
    expect(primaryAction({ ...base, seasonComplete: true, midAtBat: true }).kind).toBe('season-over')
  })
})

describe('resumeSentence', () => {
  it('reads like the mockup', () => {
    expect(
      resumeSentence({ half: 'bottom', inning: 4, runnersOn: 2, outs: 1, batterSurname: 'Achterberg', balls: 2, strikes: 1 })
    ).toBe('Bottom of the 4th. Two on, one out, Achterberg up. You left it at a 2–1 count.')
  })
  it('omits the count at 0-0', () => {
    expect(
      resumeSentence({ half: 'top', inning: 1, runnersOn: 0, outs: 0, batterSurname: 'Okafor', balls: 0, strikes: 0 })
    ).toBe('Top of the 1st. Nobody on, no outs, Okafor up.')
  })
})

describe('number formatting (Season.dc.html)', () => {
  it('prints averages without a leading zero', () => {
    expect(formatRate(0.281)).toBe('.281')
    expect(formatRate(0)).toBe('.000')
  })
  it('prints a signed run differential with a true minus sign', () => {
    expect(formatRunDifferential(14)).toBe('+14')
    expect(formatRunDifferential(-12)).toBe('−12')
    expect(formatRunDifferential(0)).toBe('0')
  })
  it('prints a dash for the leader in games back', () => {
    expect(formatGamesBack(0)).toBe('—')
    expect(formatGamesBack(3)).toBe('3')
  })
})

describe('sortBatting', () => {
  const rows: BattingRow[] = [
    { batterId: 'a', label: 'Wrona 1B', stats: stats({ ab: 24, h: 5, hr: 5, rbi: 11 }) },
    { batterId: 'b', label: 'Villanueva 2B', stats: stats({ ab: 24, h: 8, hr: 0, rbi: 4 }) },
    { batterId: 'c', label: 'Okafor CF', stats: stats({ ab: 29, h: 8, hr: 1, rbi: 3, bb: 6 }) }
  ]
  it('sorts by average descending', () => {
    expect(sortBatting(rows, 'avg').map((r) => r.batterId)).toEqual(['b', 'c', 'a'])
  })
  it('sorts by home runs descending', () => {
    expect(sortBatting(rows, 'hr')[0].batterId).toBe('a')
  })
  it('sorts by RBI descending', () => {
    expect(sortBatting(rows, 'rbi')[0].batterId).toBe('a')
  })
  it('sorts by OBP, which walks affect but average does not', () => {
    expect(sortBatting(rows, 'obp')[0].batterId).toBe('c')
  })
  it('does not mutate the input', () => {
    const before = rows.map((r) => r.batterId)
    sortBatting(rows, 'hr')
    expect(rows.map((r) => r.batterId)).toEqual(before)
  })
})

describe('save-code presentation (Transfer.dc.html)', () => {
  it('shows head and tail so a truncated paste is visible', () => {
    const code = 'SS1-' + 'x'.repeat(200) + '-ab12'
    const excerpt = saveCodeExcerpt(code)
    expect(excerpt.startsWith('SS1-')).toBe(true)
    expect(excerpt.endsWith('-ab12')).toBe(true)
    expect(excerpt).toContain('…')
    expect(excerpt.length).toBeLessThan(code.length)
  })
  it('leaves a short code intact', () => {
    expect(saveCodeExcerpt('SS1-abc-0000')).toBe('SS1-abc-0000')
  })
  it('formats the character count with a thousands separator', () => {
    expect(formatCharacterCount(1842)).toBe('1,842 characters')
  })
})

describe('relativeTime', () => {
  const now = Date.parse('2026-09-02T12:00:00Z')
  it('reports hours like the mockup preview line', () => {
    expect(relativeTime('2026-09-02T10:00:00Z', now)).toBe('2 hours ago')
  })
  it('reports minutes, days, and just now', () => {
    expect(relativeTime('2026-09-02T11:30:00Z', now)).toBe('30 minutes ago')
    expect(relativeTime('2026-08-30T12:00:00Z', now)).toBe('3 days ago')
    expect(relativeTime('2026-09-02T11:59:50Z', now)).toBe('just now')
  })
  it('does not throw on an unparseable timestamp', () => {
    expect(relativeTime('not a date', now)).toBe('at an unknown time')
  })
})

describe('previewSummary (6.1 preview line)', () => {
  it('reads like the mockup for a game in progress', () => {
    expect(
      previewSummary({ teamName: 'Herons', gameNumber: 7, inGame: true, half: 'bottom', inning: 4, ownScore: 4, opponentScore: 2 })
    ).toBe('Game 7 · Herons 4–2 · bottom 4th')
  })
  it('handles a save taken between games', () => {
    expect(
      previewSummary({ teamName: 'Herons', gameNumber: 8, inGame: false, half: null, inning: null, ownScore: null, opponentScore: null })
    ).toBe('Game 8 · Herons · between games')
  })
})

describe('describeHalfInning (the opponent recap the mockup shows)', () => {
  it('reports a 1-2-3 inning', () => {
    expect(describeHalfInning({ runs: 0, hits: 0, leftOnBase: 0, plays: 3 })).toBe('Three up, three down. No runs.')
  })
  it('stays short when the inning is long', () => {
    const text = describeHalfInning({ runs: 2, hits: 3, leftOnBase: 2, plays: 8 })
    expect(text).toBe('3 hits in 8 batters. 2 runs. 2 left on base.')
    expect(text.length).toBeLessThan(120)
  })
  it('reports a scoreless inning where runners reached', () => {
    expect(describeHalfInning({ runs: 0, hits: 1, leftOnBase: 1, plays: 5 })).toBe('1 hit in 5 batters. No runs. 1 left on base.')
  })
  it('does not claim three up three down when more than three batted', () => {
    expect(describeHalfInning({ runs: 0, hits: 0, leftOnBase: 0, plays: 5 })).toBe('Nobody reached. No runs.')
  })
})

describe('the gutter marker is the out count, not the run count', () => {
  it('reproduces the mockup sequence —, —, 1, 2, 3', () => {
    // Between.dc.html: walk, single, sac fly (scores), strikeout, groundout.
    const plays = [
      { outsAfter: 0, runsScored: 0 },
      { outsAfter: 0, runsScored: 0 },
      { outsAfter: 1, runsScored: 1 },
      { outsAfter: 2, runsScored: 0 },
      { outsAfter: 3, runsScored: 0 }
    ]
    const markers = plays.map((p, i) => playGutter(p, i === 0 ? 0 : plays[i - 1].outsAfter))
    expect(markers.map((m) => m.marker)).toEqual(['—', '—', '1', '2', '3'])
    // Only the run-scoring play is red.
    expect(markers.map((m) => m.scored)).toEqual([false, false, true, false, false])
  })

  it('a play that scores without recording an out still shows a dash', () => {
    // A bases-loaded walk scores a run but records no out.
    expect(playGutter({ outsAfter: 1, runsScored: 1 }, 1)).toEqual({ marker: '—', scored: true })
  })
})

describe('milestoneLine', () => {
  it('returns null when nothing fired, so the screen renders no empty band', () => {
    expect(milestoneLine([])).toBeNull()
  })

  it('gives every section 6 milestone id a readable label', () => {
    const ids = ['first-hr', 'first-walk-off', 'first-shutout', 'games-played-mark', 'clinch', 'eliminated', 'season-over']
    for (const id of ids) {
      const line = milestoneLine([id])
      expect(line).not.toBeNull()
      // A label, not the raw id echoed back.
      expect(line).not.toBe(id)
      expect(line!.length).toBeGreaterThan(0)
    }
  })

  it('joins several milestones fired on the same game', () => {
    expect(milestoneLine(['first-shutout', 'season-over'])).toBe('First shutout · Season complete')
  })

  it('falls back to the raw id rather than dropping an unknown milestone', () => {
    expect(milestoneLine(['not-a-milestone'])).toBe('not-a-milestone')
  })
})

describe('gameResultLine', () => {
  it('names the winner first, higher score first, however the sides fall', () => {
    expect(gameResultLine({ homeShort: 'Herons', awayShort: 'Wrens', homeScore: 5, awayScore: 4 })).toBe('Herons win 5–4')
    expect(gameResultLine({ homeShort: 'Wrens', awayShort: 'Herons', homeScore: 4, awayScore: 5 })).toBe('Herons win 5–4')
  })

  it('reports a loss as the opponent winning, not as a negative Herons line', () => {
    expect(gameResultLine({ homeShort: 'Herons', awayShort: 'Ospreys', homeScore: 2, awayScore: 7 })).toBe('Ospreys win 7–2')
  })

  it('handles a shutout', () => {
    expect(gameResultLine({ homeShort: 'Herons', awayShort: 'Loons', homeScore: 3, awayScore: 0 })).toBe('Herons win 3–0')
  })

  it('returns null on a level score, which a finished game never has', () => {
    expect(gameResultLine({ homeShort: 'Herons', awayShort: 'Wrens', homeScore: 4, awayScore: 4 })).toBeNull()
  })

  it('uses an en dash, matching the scoreboard elsewhere', () => {
    expect(gameResultLine({ homeShort: 'Herons', awayShort: 'Wrens', homeScore: 5, awayScore: 4 })).toContain('–')
  })
})

describe('sortBatting by strikeouts', () => {
  const row = (label: string, k: number): BattingRow => ({
    batterId: label,
    label,
    stats: { batterId: label, pa: 10, ab: 10, h: 3, doubles: 0, triples: 0, hr: 0, bb: 0, k, r: 0, rbi: 0 }
  })

  it('puts the most strikeouts first, matching the other counting columns', () => {
    const sorted = sortBatting([row('a', 2), row('b', 9), row('c', 5)], 'k')
    expect(sorted.map((r) => r.label)).toEqual(['b', 'c', 'a'])
  })

  it('breaks ties by name, as the other keys do', () => {
    const sorted = sortBatting([row('z', 4), row('a', 4)], 'k')
    expect(sorted.map((r) => r.label)).toEqual(['a', 'z'])
  })
})
