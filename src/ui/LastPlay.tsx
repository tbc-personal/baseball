/**
 * Last play (docs/mockups/Main.dc.html line 111): italic, red left border,
 * pinned to the bottom of the screen. Renders nothing when there is no
 * play yet (start of a half-inning) -- the mockup doesn't show an empty
 * state, so an empty block is omitted rather than shown blank.
 */

export interface LastPlayProps {
  play: string | null
}

export function LastPlay({ play }: LastPlayProps) {
  if (play === null) return null
  return (
    <div
      style={{
        marginTop: 'auto',
        borderLeft: '3px solid var(--sc-pencil-red)',
        paddingLeft: '12px',
        fontStyle: 'italic',
        fontSize: '14px',
        lineHeight: 1.45,
        color: 'var(--sc-ink)'
      }}
    >
      {play}
    </div>
  )
}
