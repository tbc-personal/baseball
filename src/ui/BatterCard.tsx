/**
 * Batter card (docs/mockups/Main.dc.html lines 71-85): 1.5px ink border,
 * "At bat · Nth in order" and the season line on one row, name + position,
 * then Contact / Power / Eye in a three-column grid with top rules.
 */

export interface BatterCardProps {
  orderLabel: string
  seasonLine: string
  name: string
  position: string
  contact: number
  power: number
  eye: number
}

function Rating({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--sc-faint-rule)',
        paddingTop: '6px'
      }}
    >
      <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sc-muted-ink)' }}>
        {label}
      </span>
      <span style={{ fontWeight: 700, fontSize: '15px' }}>{value}</span>
    </div>
  )
}

export function BatterCard({ orderLabel, seasonLine, name, position, contact, power, eye }: BatterCardProps) {
  return (
    <div
      style={{
        border: '1.5px solid var(--sc-ink)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'var(--sc-card-bg)'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--sc-muted-ink)'
        }}
      >
        <span>At bat &middot; {orderLabel}</span>
        <span>{seasonLine}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: '10px' }}>
        <span style={{ fontFamily: 'var(--sc-font-display)', fontSize: '26px', fontWeight: 500 }}>{name}</span>
        <span style={{ fontSize: '14px', color: 'var(--sc-muted-ink)' }}>{position}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
        <Rating label="Contact" value={contact} />
        <Rating label="Power" value={power} />
        <Rating label="Eye" value={eye} />
      </div>
    </div>
  )
}
