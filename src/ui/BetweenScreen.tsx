/**
 * Between innings (docs/mockups/Between.dc.html).
 *
 * GAME_DESIGN.md section 2: the natural stopping point. Recaps your half,
 * shows the opponent's simulated half, and offers exactly two ways out --
 * either of which is safe, because state is already saved.
 */

import type { PlayLogEntry } from '../engine/sim'
import { halfInningSummary, milestoneLine, playGutter } from './format'

export interface BetweenScreenProps {
  /**
   * Null when you have not batted yet this visit -- at home you bat second,
   * so your first break of a game opens on the opponent's half (section 2).
   */
  yoursPlayed: boolean
  halfLabel: string
  runs: number
  hits: number
  leftOnBase: number
  log: PlayLogEntry[]
  opponentHalfLabel: string
  opponentTeamName: string
  opponentSummary: string
  lineScore: {
    awayShort: string
    homeShort: string
    away: number[]
    home: number[]
    awayRuns: number
    homeRuns: number
    awayHits: number
    homeHits: number
    awayStrikeouts: number
    homeStrikeouts: number
    ownSide: 'home' | 'away'
    currentInningIndex: number
  }
  /**
   * Milestone ids that fired on the game just completed (section 6).
   * Empty for the ordinary between-innings break.
   */
  milestones: readonly string[]
  /**
   * "Herons win 5-4" when the game just ended, null between innings.
   */
  resultLine: string | null
  nextLabel: string
  savedNote: string
  onNext: () => void
  onDone: () => void
}

const INNING_COLUMNS = 9

export function BetweenScreen(props: BetweenScreenProps) {
  const ls = props.lineScore
  const gridTemplate = `62px repeat(${INNING_COLUMNS}, minmax(0, 1fr)) 26px 26px 26px`

  const row = (
    label: string,
    innings: number[],
    runs: number,
    hits: number,
    strikeouts: number,
    own: boolean,
    lastRow: boolean
  ) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: gridTemplate,
        fontSize: '13px',
        padding: '6px 0',
        textAlign: 'center',
        borderBottom: lastRow ? undefined : '1px solid var(--sc-faint-rule)'
      }}
    >
      <span
        style={{
          textAlign: 'left',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontSize: '12px',
          fontWeight: own ? 700 : 400,
          color: own ? 'var(--sc-pencil-red)' : undefined
        }}
      >
        {label}
      </span>
      {Array.from({ length: INNING_COLUMNS }, (_, i) => {
        const played = i < innings.length
        const isCurrent = own && i === ls.currentInningIndex
        return (
          <span
            key={i}
            style={{
              color: played ? (isCurrent ? 'var(--sc-pencil-red)' : undefined) : 'var(--sc-faint-rule)',
              fontWeight: isCurrent ? 700 : 400
            }}
          >
            {played ? innings[i] : '·'}
          </span>
        )
      })}
      <span style={{ fontWeight: 700 }}>{runs}</span>
      <span>{hits}</span>
      <span>{strikeouts}</span>
    </div>
  )

  const milestone = milestoneLine(props.milestones)

  return (
    <div className="sc-screen" style={{ paddingTop: '28px', gap: '18px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '2px solid var(--sc-ink)', paddingBottom: '10px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--sc-muted-ink)' }}>
          {props.yoursPlayed ? 'Half-inning done' : 'Before you bat'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--sc-font-display)', fontSize: '28px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {props.halfLabel}
          </span>
          {props.yoursPlayed && (
            <span style={{ fontFamily: 'var(--sc-font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--sc-pencil-red)' }}>
              {halfInningSummary(props.runs, props.hits, props.leftOnBase)}
            </span>
          )}
        </div>
      </div>

      {props.resultLine !== null && (
        <div
          style={{
            fontFamily: 'var(--sc-font-display)',
            fontSize: '26px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            color: 'var(--sc-pencil-red)',
            borderBottom: '2px solid var(--sc-ink)',
            paddingBottom: '10px',
            marginTop: '-8px'
          }}
        >
          {props.resultLine}
        </div>
      )}

      {milestone !== null && (
        <div
          style={{
            border: '1.5px solid var(--sc-pencil-red)',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <span style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--sc-muted-ink)' }}>
            Milestone
          </span>
          <span
            style={{
              fontFamily: 'var(--sc-font-display)',
              fontSize: '17px',
              fontWeight: 600,
              color: 'var(--sc-pencil-red)'
            }}
          >
            {milestone}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '14px', lineHeight: 1.4 }}>
        {props.log.map((entry, i) => {
          const outsBefore = i === 0 ? 0 : props.log[i - 1].outsAfter
          const { marker, scored } = playGutter(entry, outsBefore)
          return (
            <div key={i} style={{ display: 'flex', gap: '12px' }}>
              <span
                style={{
                  color: scored ? 'var(--sc-pencil-red)' : 'var(--sc-muted-ink)',
                  width: '26px',
                  flexShrink: 0,
                  fontWeight: scored ? 700 : 400
                }}
              >
                {marker}
              </span>
              <span>{entry.text}</span>
            </div>
          )
        })}
      </div>

      <div
        style={{
          border: '1.5px solid var(--sc-ink)',
          background: 'var(--sc-card-bg)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--sc-muted-ink)' }}>
          <span>
            {props.opponentHalfLabel} · {props.opponentTeamName}
          </span>
          <span>Simulated</span>
        </div>
        <div style={{ fontSize: '14px', lineHeight: 1.45 }}>{props.opponentSummary}</div>
      </div>

      <div style={{ borderTop: '1px solid var(--sc-ink)', borderBottom: '1px solid var(--sc-ink)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: gridTemplate,
            fontSize: '11px',
            color: 'var(--sc-muted-ink)',
            padding: '6px 0 4px 0',
            borderBottom: '1px solid var(--sc-faint-rule)',
            textAlign: 'center'
          }}
        >
          <span />
          {Array.from({ length: INNING_COLUMNS }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
          <span style={{ fontWeight: 700, color: 'var(--sc-ink)' }}>R</span>
          <span style={{ fontWeight: 700, color: 'var(--sc-ink)' }}>H</span>
          <span style={{ fontWeight: 700, color: 'var(--sc-ink)' }}>K</span>
        </div>
        {row(ls.awayShort, ls.away, ls.awayRuns, ls.awayHits, ls.awayStrikeouts, ls.ownSide === 'away', false)}
        {row(ls.homeShort, ls.home, ls.homeRuns, ls.homeHits, ls.homeStrikeouts, ls.ownSide === 'home', true)}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={props.onNext}
          style={{
            height: '60px',
            background: 'var(--sc-pencil-red)',
            color: 'var(--sc-paper)',
            border: 'none',
            fontFamily: 'var(--sc-font-display)',
            fontSize: '19px',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase'
          }}
        >
          {props.nextLabel}
        </button>
        <button
          onClick={props.onDone}
          style={{
            height: '52px',
            background: 'transparent',
            border: '2px solid var(--sc-ink)',
            color: 'var(--sc-ink)',
            fontFamily: 'var(--sc-font-display)',
            fontSize: '16px',
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase'
          }}
        >
          Done for now
        </button>
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--sc-muted-ink)' }}>{props.savedNote}</div>
      </div>
    </div>
  )
}
