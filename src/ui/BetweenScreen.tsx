/**
 * Between innings (docs/mockups/Between.dc.html).
 *
 * GAME_DESIGN.md section 2: the natural stopping point. Recaps your half,
 * shows the opponent's simulated half, and offers exactly two ways out --
 * either of which is safe, because state is already saved.
 */

import type { PlayLogEntry } from '../engine/sim'
import { halfInningSummary, milestoneLine, playGutter } from './format'
import { useEffect, useRef } from 'preact/hooks'
import { useKeyBindings } from './useKeyBindings'

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
  /**
   * The opponent's simulated half, or null when there was not one to play --
   * which happens exactly when the game just ended. The box is omitted
   * entirely in that case rather than rendered with an empty header and
   * "No opponent half to play."; the result line above already says the
   * game is over.
   */
  opponentSummary: string | null
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

/**
 * A game is nine innings unless it is not. The line score always shows at
 * least this many columns, so a 3rd-inning box does not look truncated,
 * and grows past it for extra innings -- before this it was a hard nine
 * and innings 10 and up were not rendered at all, which left the R column
 * disagreeing with the innings beside it in any game that went long.
 */
const REGULATION_INNINGS = 9

/**
 * Fixed rather than fractional, because the line score scrolls once a game
 * runs long and a fractional track cannot overflow its container. 23px is
 * what a ninth of the row worked out to at the 390px width this is played
 * at, so a nine-inning box looks exactly as it did.
 */
const INNING_COLUMN_WIDTH = 23

/**
 * How many inning columns the line score draws: never fewer than
 * regulation, and never fewer than the innings actually played.
 */
export function inningColumnCount(away: readonly number[], home: readonly number[]): number {
  return Math.max(REGULATION_INNINGS, away.length, home.length)
}

/**
 * R, H and K pin to the right edge the way the team name pins to the left,
 * so a game that has run long never scrolls its own score out of view. The
 * offsets are the widths of the columns to their right, which only works
 * because those columns are a fixed 26px. When the line score fits without
 * scrolling these sit exactly where they would anyway.
 */
const TOTALS_COLUMN_WIDTH = 26

function stickyTotalCell(fromRight: number) {
  return {
    position: 'sticky' as const,
    right: fromRight * TOTALS_COLUMN_WIDTH,
    zIndex: 1,
    background: 'var(--sc-paper)',
    boxShadow: fromRight === 2 ? '-3px 0 4px -2px rgba(0, 0, 0, 0.16)' : undefined
  }
}

/** Shared by the pinned team-name cell in the header and in both rows. */
const stickyNameCell = {
  textAlign: 'left' as const,
  position: 'sticky' as const,
  left: 0,
  zIndex: 1,
  background: 'var(--sc-paper)',
  borderRight: '1px solid var(--sc-faint-rule)',
  boxShadow: '3px 0 4px -2px rgba(0, 0, 0, 0.16)'
}

export function BetweenScreen(props: BetweenScreenProps) {
  // One primary action: on to the next half-inning. The half-inning is the
  // game's natural stopping point, so this is the key a player holding a
  // coffee presses most.
  useKeyBindings({ Enter: props.onNext })

  const ls = props.lineScore
  const inningColumns = inningColumnCount(ls.away, ls.home)
  const extraInnings = inningColumns > REGULATION_INNINGS

  /*
   * A game that has gone long opens at its live end rather than at the
   * first inning. The innings worth looking at in the 11th are the 10th and
   * the 11th, and at the default scroll position those sit behind the
   * pinned R/H/K -- so the one thing extra innings are scrolled for would
   * be the one thing hidden. Regulation games fit and are left alone.
   */
  const scroller = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = scroller.current
    if (el === null || !extraInnings) return
    el.scrollLeft = el.scrollWidth
  }, [extraInnings, inningColumns])
  const gridTemplate = `62px repeat(${inningColumns}, ${INNING_COLUMN_WIDTH}px) repeat(3, ${TOTALS_COLUMN_WIDTH}px)`

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
        // max-content so the row grows with the innings and its rule spans
        // the whole scrollable width, not just the part on screen.
        width: 'max-content',
        minWidth: '100%',
        borderBottom: lastRow ? undefined : '1px solid var(--sc-faint-rule)'
      }}
    >
      <span
        style={{
          ...stickyNameCell,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontSize: '12px',
          fontWeight: own ? 700 : 400,
          color: own ? 'var(--sc-pencil-red)' : undefined
        }}
      >
        {label}
      </span>
      {Array.from({ length: inningColumns }, (_, i) => {
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
      <span style={{ ...stickyTotalCell(2), fontWeight: 700 }}>{runs}</span>
      <span style={stickyTotalCell(1)}>{hits}</span>
      <span style={stickyTotalCell(0)}>{strikeouts}</span>
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

      {props.opponentSummary !== null && (
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
      )}

      {/* One scroll container around the header and both rows, so they can
          never scroll out of step with each other. */}
      <div
        ref={scroller}
        style={{
          borderTop: '1px solid var(--sc-ink)',
          borderBottom: '1px solid var(--sc-ink)',
          overflowX: 'auto'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: gridTemplate,
            fontSize: '11px',
            color: 'var(--sc-muted-ink)',
            padding: '6px 0 4px 0',
            borderBottom: '1px solid var(--sc-faint-rule)',
            textAlign: 'center',
            width: 'max-content',
            minWidth: '100%'
          }}
        >
          <span style={stickyNameCell} />
          {Array.from({ length: inningColumns }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
          <span style={{ ...stickyTotalCell(2), fontWeight: 700, color: 'var(--sc-ink)' }}>R</span>
          <span style={{ ...stickyTotalCell(1), fontWeight: 700, color: 'var(--sc-ink)' }}>H</span>
          <span style={{ ...stickyTotalCell(0), fontWeight: 700, color: 'var(--sc-ink)' }}>K</span>
        </div>
        {row(ls.awayShort, ls.away, ls.awayRuns, ls.awayHits, ls.awayStrikeouts, ls.ownSide === 'away', false)}
        {row(ls.homeShort, ls.home, ls.homeRuns, ls.homeHits, ls.homeStrikeouts, ls.ownSide === 'home', true)}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={props.onNext}
          className="sc-key-host"
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
          <span className="sc-key-hint">&crarr;</span>
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
