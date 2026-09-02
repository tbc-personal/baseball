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
import { battingAverage, onBasePercentage } from '../engine/season'
import { formatGamesBack, formatRate, formatRunDifferential } from './format'

export type BattingSortKey = 'avg' | 'hr' | 'rbi' | 'obp' | 'k'

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
const BATTING_GRID = 'minmax(0, 1fr) 50px 30px 36px 50px 30px'

export function sortBatting(rows: BattingRow[], key: BattingSortKey): BattingRow[] {
  const value = (r: BattingRow): number => {
    switch (key) {
      case 'avg':
        return battingAverage(r.stats)
      case 'obp':
        return onBasePercentage(r.stats)
      case 'hr':
        return r.stats.hr
      case 'rbi':
        return r.stats.rbi
      case 'k':
        return r.stats.k
    }
  }
  return [...rows].sort((a, b) => value(b) - value(a) || a.label.localeCompare(b.label))
}

export function SeasonScreen(props: SeasonScreenProps) {
  const [sortKey, setSortKey] = useState<BattingSortKey>('avg')
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
          <span style={{ fontSize: '11px', color: 'var(--sc-muted-ink)' }}>tap a column to sort</span>
        </div>
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
          <span style={{ textAlign: 'left' }} />
          {sortHeader('avg', 'AVG')}
          {sortHeader('hr', 'HR')}
          {sortHeader('rbi', 'RBI')}
          {sortHeader('obp', 'OBP')}
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
            <span style={{ textAlign: 'left' }}>{r.label}</span>
            <span>{formatRate(battingAverage(r.stats))}</span>
            <span>{r.stats.hr}</span>
            <span>{r.stats.rbi}</span>
            <span>{formatRate(onBasePercentage(r.stats))}</span>
            <span>{r.stats.k}</span>
          </div>
        ))}
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
