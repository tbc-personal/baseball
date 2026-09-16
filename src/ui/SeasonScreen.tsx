/**
 * Season: standings and your batting table (docs/mockups/Season.dc.html).
 *
 * The mockup's "tap a column to sort" is wired up; sorting is presentation,
 * but every rate it sorts on comes from an engine selector, never computed
 * here (PLAN.md: the UI never computes baseball).
 */

import { useState } from 'preact/hooks'
import type { BatterStats } from '../engine/types'
import type { StandingsRow } from '../engine/season'
import { battingAverage, onBasePercentage, sluggingPercentage } from '../engine/season'
import { formatGamesBack, formatRate, formatRunDifferential } from './format'
import { useKeyBindings } from './useKeyBindings'

export type BattingSortKey = 'avg' | 'obp' | 'slg' | 'ops' | 'hr' | 'rbi' | 'k'

export interface BattingRow {
  batterId: string
  label: string
  stats: BatterStats
}

export interface SeasonScreenProps {
  gamesPlayed: number
  standings: StandingsRow[]
  ownTeamId: string
  batting: BattingRow[]
  onBack: () => void
}

const STANDINGS_GRID = 'minmax(0, 1fr) 30px 30px 36px 44px 56px'
// name | AVG | OBP | SLG | OPS | HR | RBI | K. The widths follow the
// content, so reordering the columns means moving these too: AVG, OBP and
// SLG print four characters (".321"), OPS prints five once a hitter clears
// 1.000, and HR/RBI/K are small integers. This no longer has to fit a
// 390px viewport on its own -- the batting table scrolls horizontally
// (see the Batting section below), so the name column keeps a real
// minimum instead of being squeezed to nothing.
// name | AVG | OBP | SLG | OPS | HR | RBI | K. AVG and OBP cannot exceed
// 1.000 and print four characters (".321"); SLG and OPS both can and do --
// a 4-for-4 with a homer slugs 1.250 -- so both get room for five. The
// table scrolls, so the name track no longer has to shrink to fit a phone.
const BATTING_GRID = 'minmax(120px, 1fr) 42px 42px 50px 50px 30px 36px 28px'

export function sortBatting(rows: BattingRow[], key: BattingSortKey): BattingRow[] {
  const value = (r: BattingRow): number => {
    switch (key) {
      case 'avg':
        return battingAverage(r.stats)
      case 'obp':
        return onBasePercentage(r.stats)
      case 'slg':
        return sluggingPercentage(r.stats)
      case 'hr':
        return r.stats.hr
      case 'rbi':
        return r.stats.rbi
      case 'ops':
        return onBasePercentage(r.stats) + sluggingPercentage(r.stats)
      case 'k':
        return r.stats.k
    }
  }
  return [...rows].sort((a, b) => value(b) - value(a) || a.label.localeCompare(b.label))
}

export function SeasonScreen(props: SeasonScreenProps) {
  // Escape only. Enter would be ambiguous here: the batting table's column
  // headers are buttons, so a player tabbing across them to sort expects
  // Enter to press the header they are on, not to leave the screen.
  useKeyBindings({ Escape: props.onBack })

  // Slugging is the entire payoff of the Power swing button, and it only
  // shows up in OPS -- defaulting the table to AVG hides it and pushes the
  // player toward optimising for average instead.
  const [sortKey, setSortKey] = useState<BattingSortKey>('ops')
  const sorted = sortBatting(props.batting, sortKey)

  const sortHeader = (key: BattingSortKey, label: string) => (
    <button
      onClick={() => setSortKey(key)}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        textAlign: 'right',
        font: 'inherit',
        fontSize: '11px',
        color: sortKey === key ? 'var(--sc-pencil-red)' : 'var(--sc-muted-ink)',
        fontWeight: sortKey === key ? 700 : 400
      }}
    >
      {label}
    </button>
  )

  return (
    <div className="sc-screen" style={{ paddingTop: '28px', gap: '22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid var(--sc-ink)', paddingBottom: '8px' }}>
        <span style={{ fontFamily: 'var(--sc-font-display)', fontSize: '28px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          Season
        </span>
        <span style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--sc-muted-ink)' }}>
          After game {props.gamesPlayed}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ paddingBottom: '6px', fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Standings</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: STANDINGS_GRID,
            fontSize: '11px',
            color: 'var(--sc-muted-ink)',
            padding: '4px 0',
            borderTop: '1px solid var(--sc-ink)',
            borderBottom: '1px solid var(--sc-faint-rule)',
            textAlign: 'right'
          }}
        >
          <span style={{ textAlign: 'left' }} />
          <span>W</span>
          <span>L</span>
          <span>GB</span>
          <span>RD</span>
          <span>L5</span>
        </div>
        {props.standings.map((row, i) => {
          const own = row.teamId === props.ownTeamId
          return (
            <div
              key={row.teamId}
              style={{
                display: 'grid',
                gridTemplateColumns: STANDINGS_GRID,
                fontSize: '13px',
                padding: '7px 0',
                textAlign: 'right',
                borderBottom: i === props.standings.length - 1 ? '1px solid var(--sc-ink)' : '1px solid var(--sc-faint-rule)',
                fontWeight: own ? 700 : 400,
                color: own ? 'var(--sc-pencil-red)' : undefined
              }}
            >
              <span style={{ textAlign: 'left' }}>{row.teamShortName}</span>
              <span>{row.wins}</span>
              <span>{row.losses}</span>
              <span>{formatGamesBack(row.gamesBack)}</span>
              <span>{formatRunDifferential(row.runDifferential)}</span>
              <span>{row.lastFiveDisplay || '—'}</span>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: '6px' }}>
          <span style={{ fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Batting</span>
          <span style={{ fontSize: '11px', color: 'var(--sc-muted-ink)' }}>tap to sort · scroll for more</span>
        </div>
        {/* Eight stat columns don't fit a 390px phone with the name column
            still readable, and the owner wants RBI back rather than traded
            away again for the next stat somebody asks for. So this section
            scrolls sideways instead: one overflow-x:auto container holds
            the header row and every data row as stacked children (not
            siblings that scroll independently, which would let the header
            and body drift out of alignment), and that inner column is
            `width: max-content` so the grid sizes to its own tracks rather
            than clamping to the viewport, with `min-width: 100%` so a
            short name still fills the screen when nothing needs to scroll.
            Because each row is a block child stretched to that column's
            full width (flex default align-items: stretch), a row's
            border-bottom is drawn at the row's own width -- the *scrollable*
            width -- so the rule always reaches the last column instead of
            stopping at the visible edge. */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '100%', width: 'max-content' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: BATTING_GRID,
                fontSize: '11px',
                color: 'var(--sc-muted-ink)',
                padding: '4px 0',
                borderTop: '1px solid var(--sc-ink)',
                borderBottom: '1px solid var(--sc-faint-rule)',
                textAlign: 'right'
              }}
            >
              {/* The pinned name column: sticky to the left edge of the
                  scroll container above, with an opaque background so the
                  stat cells scrolling underneath don't show through, a
                  z-index above them so its own border wins at the seam,
                  and a right-hand rule so the pin reads as pinned rather
                  than as a rendering glitch. */}
              <span
                style={{
                  textAlign: 'left',
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  background: 'var(--sc-paper)',
                  borderRight: '1px solid var(--sc-faint-rule)',
                  // The shadow is what sells the pin: without it a stat
                  // column caught mid-scroll against the name reads as a
                  // clipped glyph rather than as content passing underneath.
                  boxShadow: '3px 0 4px -2px rgba(0, 0, 0, 0.16)',
                  paddingRight: '10px'
                }}
              />
              {sortHeader('avg', 'AVG')}
              {sortHeader('obp', 'OBP')}
              {sortHeader('slg', 'SLG')}
              {sortHeader('ops', 'OPS')}
              {sortHeader('hr', 'HR')}
              {sortHeader('rbi', 'RBI')}
              {sortHeader('k', 'K')}
            </div>
            {sorted.map((r) => (
              <div
                key={r.batterId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: BATTING_GRID,
                  fontSize: '13px',
                  padding: '7px 0',
                  textAlign: 'right',
                  borderBottom: '1px solid var(--sc-faint-rule)'
                }}
              >
                <span
                  style={{
                    textAlign: 'left',
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    background: 'var(--sc-paper)',
                    borderRight: '1px solid var(--sc-faint-rule)',
                    boxShadow: '3px 0 4px -2px rgba(0, 0, 0, 0.16)',
                    paddingRight: '10px'
                  }}
                >
                  {r.label}
                </span>
                <span>{formatRate(battingAverage(r.stats))}</span>
                <span>{formatRate(onBasePercentage(r.stats))}</span>
                <span>{formatRate(sluggingPercentage(r.stats))}</span>
                {/* OPS routinely clears 1.000 for a hot hitter early in a
                    season, unlike AVG/OBP/SLG which can't exceed 1.
                    formatRate's leading-zero strip is anchored to "0." so it
                    leaves a value >= 1 alone (e.g. "1.083", not ".083") --
                    confirmed below, no extra handling needed here. */}
                <span>{formatRate(onBasePercentage(r.stats) + sluggingPercentage(r.stats))}</span>
                <span>{r.stats.hr}</span>
                <span>{r.stats.rbi}</span>
                <span>{r.stats.k}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={props.onBack}
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minHeight: 'var(--sc-tap-target-min)',
          fontSize: '13px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          borderTop: '1px solid var(--sc-faint-rule)',
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          paddingTop: '14px',
          background: 'none',
          color: 'var(--sc-ink)',
          fontFamily: 'var(--sc-font-body)'
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        <span>Back</span>
      </button>
    </div>
  )
}
