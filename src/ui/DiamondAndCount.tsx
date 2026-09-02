/**
 * The diamond + count region of the at-bat screen (docs/mockups/Main.dc.html
 * lines 30-69): an SVG diamond with runners as filled/hollow bases and
 * surnames beside them, the big count numeral, and the balls/strikes/outs
 * dot rows. Geometry and colors are taken verbatim from the mockup.
 */

import type { Bases, Count } from '../engine/types'
import { countDots, countNumeral, runnerDisplay, type DotState } from './format'
import type { Batter } from '../engine/types'

const INK = '#23292d'
const RED = '#b5402c'
const PAPER = '#f4eee0'

function baseFill(occupied: boolean): string {
  return occupied ? RED : PAPER
}

function Dots({ states, color }: { states: DotState[]; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
      {states.map((s, i) => (
        <div
          key={i}
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            border: `1.5px solid ${color}`,
            background: s === 'filled' ? color : 'transparent'
          }}
        />
      ))}
    </div>
  )
}

function DotRow({ label, states, color }: { label: string; states: DotState[]; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
      <span style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b6f6a' }}>
        {label}
      </span>
      <Dots states={states} color={color} />
    </div>
  )
}

export interface DiamondAndCountProps {
  bases: Bases
  count: Count
  outs: number
  batters: readonly Batter[]
}

export function DiamondAndCount({ bases, count, outs, batters }: DiamondAndCountProps) {
  const runners = runnerDisplay(bases, batters)
  const dots = countDots(count, outs)

  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <svg width="196" height="170" viewBox="0 0 200 170" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path d="M100 150 L172 88 L100 26 L28 88 Z" stroke={INK} stroke-width="1.5" fill="none" />
        <path d="M40 100 A 85 85 0 0 1 160 100" stroke={INK} stroke-width="1" stroke-dasharray="3 4" fill="none" />
        <circle cx="100" cy="88" r="6" stroke={INK} stroke-width="1.5" fill="none" />
        {/* First base */}
        <rect x="163" y="79" width="18" height="18" transform="rotate(45 172 88)" fill={baseFill(runners.first !== null)} stroke={INK} stroke-width="1.5" />
        {/* Second base */}
        <rect x="91" y="17" width="18" height="18" transform="rotate(45 100 26)" fill={baseFill(runners.second !== null)} stroke={INK} stroke-width="1.5" />
        {/* Third base */}
        <rect x="19" y="79" width="18" height="18" transform="rotate(45 28 88)" fill={baseFill(runners.third !== null)} stroke={INK} stroke-width="1.5" />
        {/* Home plate */}
        <path d="M90 143 L110 143 L110 151 L100 160 L90 151 Z" fill={PAPER} stroke={INK} stroke-width="1.5" />
        {runners.first !== null && (
          <text x="172" y="120" text-anchor="middle" font-family="Courier Prime, Courier New, monospace" font-size="11" fill="#6b6f6a">
            {runners.first}
          </text>
        )}
        {runners.second !== null && (
          <text x="100" y="50" text-anchor="middle" font-family="Courier Prime, Courier New, monospace" font-size="11" fill="#6b6f6a">
            {runners.second}
          </text>
        )}
        {runners.third !== null && (
          <text x="28" y="120" text-anchor="middle" font-family="Courier Prime, Courier New, monospace" font-size="11" fill="#6b6f6a">
            {runners.third}
          </text>
        )}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1, alignItems: 'flex-end' }}>
        <div style={{ fontFamily: 'var(--sc-font-display)', fontSize: '44px', fontWeight: 500, lineHeight: 1 }}>
          {countNumeral(count)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
          <DotRow label="Balls" states={dots.balls} color={INK} />
          <DotRow label="Strikes" states={dots.strikes} color={RED} />
          <DotRow label="Outs" states={dots.outs} color={INK} />
        </div>
      </div>
    </div>
  )
}
