/**
 * Choice buttons (docs/mockups/Main.dc.html lines 102-109): a three-column
 * grid of 60px buttons with 2px ink borders; the recommended choice is
 * filled ink. Below it the bunt button, 48px, dashed border, shown only
 * when isBuntAvailable is true.
 */

import type { Choice } from '../engine/types'

const CHOICES: Array<Exclude<Choice, 'Bunt'>> = ['Take', 'Contact', 'Power']

export interface ChoiceButtonsProps {
  recommended: Choice
  buntAvailable: boolean
  onChoose: (choice: Choice) => void
  disabled?: boolean
}

const choiceButtonBase = {
  height: 'var(--sc-button-choice-height)',
  minHeight: 'var(--sc-tap-target-min)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '2px solid var(--sc-ink)',
  fontFamily: 'var(--sc-font-display)',
  fontSize: '18px',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const
}

export function ChoiceButtons({ recommended, buntAvailable, onChoose, disabled }: ChoiceButtonsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
        {CHOICES.map((choice) => {
          const isRecommended = choice === recommended
          return (
            <button
              key={choice}
              type="button"
              disabled={disabled}
              onClick={() => onChoose(choice)}
              style={{
                ...choiceButtonBase,
                background: isRecommended ? 'var(--sc-ink)' : 'var(--sc-paper)',
                color: isRecommended ? 'var(--sc-paper)' : 'var(--sc-ink)'
              }}
            >
              {choice}
            </button>
          )
        })}
      </div>
      {buntAvailable && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChoose('Bunt')}
          style={{
            height: 'var(--sc-button-bunt-height)',
            minHeight: 'var(--sc-tap-target-min)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px dashed var(--sc-muted-ink)',
            background: 'transparent',
            fontFamily: 'var(--sc-font-display)',
            fontSize: '15px',
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--sc-muted-ink)'
          }}
        >
          Bunt &middot; runners on
        </button>
      )}
    </div>
  )
}
