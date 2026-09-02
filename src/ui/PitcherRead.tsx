/**
 * Pitcher read row (docs/mockups/Main.dc.html lines 87-100): "Read on
 * <pitcher>" with the bucket in red Oswald, plus the tendency and pitch
 * count on the right. `pitchLabel` carries the pitcher's tendency, his
 * pitch count for the game and the count for this plate appearance; it is
 * built by format.ts's pitcherWorkload, so this component stays
 * presentational.
 *
 * The mockup's three filled bars next to this text are dropped: they were
 * hardcoded to always render 3 regardless of the actual pitch count, so
 * they carried no information.
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
      <span style={{ fontSize: '11px', color: 'var(--sc-muted-ink)', textAlign: 'right', minWidth: 0 }}>
        {tendency} &middot; {pitchLabel}
      </span>
    </div>
  )
}
