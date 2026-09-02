/**
 * Last play (docs/mockups/Main.dc.html line 111): italic, red left border,
 * pinned to the bottom of the screen. Renders nothing when there is no
 * play yet (start of a half-inning) -- the mockup doesn't show an empty
 * state, so an empty block is omitted rather than shown blank.
 *
 * Two lines, not one: `pitch` is what the last pitch did ("Taken in the
 * zone. Strike 2.") and `play` is how the plate appearance finished, if it
 * finished. Mid-at-bat only the pitch line is set, so the player can tell a
 * foul from a swinging strike and a chase from a strike -- which the play
 * log alone never showed.
 */

export interface LastPlayProps {
  pitch: string | null
  play: string | null
}

export function LastPlay({ pitch, play }: LastPlayProps) {
  if (play === null && pitch === null) return null
  return (
    <div
      style={{
        marginTop: 'auto',
        borderLeft: '3px solid var(--sc-pencil-red)',
        paddingLeft: '12px',
        fontStyle: 'italic',
        fontSize: '14px',
        lineHeight: 1.45,
        color: 'var(--sc-ink)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}
    >
      {pitch !== null && (
        <div style={{ fontStyle: 'normal', color: 'var(--sc-muted-ink)' }}>{pitch}</div>
      )}
      {play !== null && <div>{play}</div>}
    </div>
  )
}
