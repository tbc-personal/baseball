/**
 * Home / continue (docs/mockups/Home.dc.html).
 *
 * GAME_DESIGN.md section 2: this screen always shows exactly one primary
 * action. Which one it is comes from `primaryAction` in format.ts.
 */

import type { StandingsRow } from '../engine/season'
import { formatGamesBack, type PrimaryAction } from './format'

export interface HomeScreenProps {
  teamName: string
  leagueName: string
  gameNumber: number
  totalGames: number
  record: string
  /** Null when no game is in progress. */
  inProgress: {
    homeOrAway: string
    opponentName: string
    ownTeamShort: string
    ownScore: number
    opponentShort: string
    opponentScore: number
    sentence: string
  } | null
  action: PrimaryAction
  standings: StandingsRow[]
  ownTeamId: string
  upNext: string | null
  onPrimary: () => void
  onSeason: () => void
  onSettings: () => void
}

const LABEL: preact.JSX.CSSProperties = {
  fontSize: '11px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--sc-muted-ink)'
}

export function HomeScreen(props: HomeScreenProps) {
  const { inProgress } = props
  return (
    <div className="sc-screen" style={{ paddingTop: '36px', gap: '22px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '12px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--sc-muted-ink)' }}>
          Short Season
        </div>
        <div
          style={{
            fontFamily: 'var(--sc-font-display)',
            fontSize: '38px',
            fontWeight: 600,
            lineHeight: 1.05,
            textTransform: 'uppercase',
            letterSpacing: '0.02em'
          }}
        >
          {props.teamName}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--sc-muted-ink)' }}>
          {props.leagueName} · Game {props.gameNumber} of {props.totalGames} · {props.record}
        </div>
      </div>

      {inProgress !== null && (
        <div
          style={{
            border: '1.5px solid var(--sc-ink)',
            background: 'var(--sc-card-bg)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', ...LABEL }}>
            <span>In progress · {inProgress.homeOrAway}</span>
            <span>vs {inProgress.opponentName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontFamily: 'var(--sc-font-display)', fontSize: '22px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {inProgress.ownTeamShort}
              </span>
              <span style={{ fontFamily: 'var(--sc-font-display)', fontSize: '40px', fontWeight: 600, color: 'var(--sc-pencil-red)', lineHeight: 1 }}>
                {inProgress.ownScore}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontFamily: 'var(--sc-font-display)', fontSize: '40px', fontWeight: 600, lineHeight: 1 }}>
                {inProgress.opponentScore}
              </span>
              <span style={{ fontFamily: 'var(--sc-font-display)', fontSize: '22px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {inProgress.opponentShort}
              </span>
            </div>
          </div>
          <div style={{ fontSize: '14px', lineHeight: 1.45, borderTop: '1px solid var(--sc-faint-rule)', paddingTop: '12px' }}>
            {inProgress.sentence}
          </div>
        </div>
      )}

      <button
        onClick={props.onPrimary}
        disabled={props.action.kind === 'season-over'}
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--sc-pencil-red)',
          color: 'var(--sc-paper)',
          border: 'none',
          fontFamily: 'var(--sc-font-display)',
          fontSize: '20px',
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          opacity: props.action.kind === 'season-over' ? 0.55 : 1
        }}
      >
        {props.action.label}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid var(--sc-ink)', paddingBottom: '6px' }}>
          <span style={{ fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Standings</span>
          <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sc-muted-ink)' }}>W · L · GB</span>
        </div>
        {props.standings.slice(0, 4).map((row, i) => {
          const own = row.teamId === props.ownTeamId
          return (
            <div
              key={row.teamId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px',
                padding: '4px 0',
                fontWeight: own ? 700 : 400,
                color: own ? 'var(--sc-pencil-red)' : undefined
              }}
            >
              <span>
                {i + 1} {row.teamName}
              </span>
              <span>
                {row.wins} · {row.losses} · {formatGamesBack(row.gamesBack)}
              </span>
            </div>
          )
        })}
      </div>

      {props.upNext !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={LABEL}>Up next</div>
          <div style={{ fontSize: '14px' }}>{props.upNext}</div>
        </div>
      )}

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--sc-faint-rule)',
          paddingTop: '14px'
        }}
      >
        <button onClick={props.onSeason} style={navStyle('var(--sc-ink)')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19h16" />
            <path d="M6 19V9" />
            <path d="M11 19V5" />
            <path d="M16 19v-8" />
          </svg>
          <span>Season</span>
        </button>
        <button onClick={props.onSettings} style={navStyle('var(--sc-muted-ink)')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v3" />
            <path d="M12 18v3" />
            <path d="M3 12h3" />
            <path d="M18 12h3" />
            <path d="M5.6 5.6l2.1 2.1" />
            <path d="M16.3 16.3l2.1 2.1" />
            <path d="M5.6 18.4l2.1-2.1" />
            <path d="M16.3 7.7l2.1-2.1" />
          </svg>
          <span>Settings</span>
        </button>
      </div>
    </div>
  )
}

function navStyle(color: string): preact.JSX.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minHeight: 'var(--sc-tap-target-min)',
    fontSize: '13px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color,
    background: 'none',
    border: 'none',
    padding: 0,
    fontFamily: 'var(--sc-font-body)'
  }
}
