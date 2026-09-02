/**
 * Score strip (docs/mockups/Main.dc.html lines 18-28): team name + score on
 * each side, half-inning label centred, 2px ink bottom border.
 *
 * Ambiguity flagged in the T7 report: the mockup's example is unlabeled as
 * home/away, so which side is left is a guess. Chosen reading: the
 * player's own team is always shown on the left (its score in pencil red,
 * "your team" per docs/mockups/README.md), the opponent always on the
 * right, regardless of who is actually home/away that game -- so the
 * player's team stays in the same visual spot across every game, and the
 * "Bot 4th" label (not "your half" / "their half") is what actually tells
 * them whose turn it is.
 */

export interface ScoreStripProps {
  ownName: string
  ownScore: number
  opponentName: string
  opponentScore: number
  halfLabel: string
}

export function ScoreStrip({ ownName, ownScore, opponentName, opponentScore, halfLabel }: ScoreStripProps) {
  const nameStyle = {
    fontFamily: 'var(--sc-font-display)',
    fontSize: '20px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const
  }
  const scoreStyle = (own: boolean) => ({
    fontFamily: 'var(--sc-font-display)',
    fontSize: '30px',
    fontWeight: 600,
    color: own ? 'var(--sc-pencil-red)' : 'var(--sc-ink)'
  })

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderBottom: '2px solid var(--sc-ink)',
        paddingBottom: '8px'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: '8px' }}>
        <span style={nameStyle}>{ownName}</span>
        <span style={scoreStyle(true)}>{ownScore}</span>
      </div>
      <div style={{ fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--sc-muted-ink)' }}>
        {halfLabel}
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: '8px' }}>
        <span style={scoreStyle(false)}>{opponentScore}</span>
        <span style={nameStyle}>{opponentName}</span>
      </div>
    </div>
  )
}
