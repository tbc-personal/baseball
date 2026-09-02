/**
 * Pitcher read row (docs/mockups/Main.dc.html lines 87-100): "Read on
 * <pitcher>" with the bucket in red Oswald, plus the tendency and pitch
 * count on the right (three filled bars, one per pitch shown -- the mockup
 * draws exactly 3, so this caps the bar row at 3 regardless of the real
 * count). `pitchLabel` carries the pitcher's tendency, his pitch count for
 * the game and the count for this plate appearance; it is built by
 * format.ts's pitcherWorkload, so this component stays presentational.
 *
 * "{tendency} · {pitchLabel}" can run past the mockup's 3-digit pitch
 * counts on a real game -- both flex columns get minWidth: 0 so the text
 * wraps to a second line instead of overflowing the 390px screen (flex
 * items default to min-width: auto, which blocks shrinking below content
 * size and defeats wrapping).
 */

import type { ReadBucket, Tendency } from '../engine/types'

export interface PitcherReadProps {
  pitcherName: string
  bucket: ReadBucket
  tendency: Tendency
  pitchLabel: string
}

export function PitcherRead({ pitcherName, bucket, tendency, pitchLabel }: PitcherReadProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
        <span style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--sc-muted-ink)' }}>
          Read on {pitcherName}
        </span>
        <span style={{ fontFamily: 'var(--sc-font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--sc-pencil-red)' }}>
          {bucket}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', minWidth: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: '22px', height: '8px', background: 'var(--sc-pencil-red)' }} />
          ))}
        </div>
        <span style={{ fontSize: '11px', color: 'var(--sc-muted-ink)', textAlign: 'right' }}>
          {tendency} &middot; {pitchLabel}
        </span>
      </div>
    </div>
  )
}
