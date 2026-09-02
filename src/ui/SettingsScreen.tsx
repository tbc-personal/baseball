/**
 * Settings / transfer (docs/mockups/Transfer.dc.html).
 *
 * The export and import flows are GAME_DESIGN.md section 6.1's, including
 * the "copy failed" case: iOS can reject a clipboard write outside a user
 * gesture, so the code is always shown in a selectable box as well.
 * Decoding happens without applying, so the preview can be shown first.
 */

import { useState } from 'preact/hooks'
import type { SavePreview } from '../store/types'
import { formatCharacterCount, previewSummary, relativeTime, saveCodeExcerpt } from './format'

/** What the settings screen needs back from a paste: a preview, or why not. */
export type DecodeOutcome =
  | { ok: true; preview: SavePreview }
  | { ok: false; message: string }

export interface SettingsScreenProps {
  teamName: string
  onTeamNameChange: (name: string) => void
  /** Produces the save code for the current state. */
  onCopy: () => Promise<{ code: string; copied: boolean }>
  /** Decodes without applying, so the preview can be shown first. */
  onDecode: (pasted: string) => Promise<DecodeOutcome>
  onApply: () => void
  onUndo: () => void
  canUndo: boolean
  onReset: () => void
  onBack: () => void
}

const SECTION_HEADING: preact.JSX.CSSProperties = {
  fontSize: '12px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase'
}

export function SettingsScreen(props: SettingsScreenProps) {
  const [exported, setExported] = useState<{ code: string; copied: boolean } | null>(null)
  const [pasted, setPasted] = useState('')
  const [decoded, setDecoded] = useState<DecodeOutcome | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)

  async function handleCopy() {
    setExported(await props.onCopy())
  }

  async function handlePaste(value: string) {
    setPasted(value)
    setDecoded(value.trim() === '' ? null : await props.onDecode(value.trim()))
  }

  return (
    <div className="sc-screen" style={{ paddingTop: '28px', gap: '22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid var(--sc-ink)', paddingBottom: '8px' }}>
        <span style={{ fontFamily: 'var(--sc-font-display)', fontSize: '28px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          Settings
        </span>
        <button onClick={props.onBack} style={linkButton()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          <span>Home</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--sc-muted-ink)' }}>Team name</span>
        <input
          value={props.teamName}
          onInput={(e) => props.onTeamNameChange((e.target as HTMLInputElement).value)}
          style={{
            height: '48px',
            padding: '0 12px',
            border: '1.5px solid var(--sc-ink)',
            background: 'var(--sc-card-bg)',
            fontFamily: 'var(--sc-font-display)',
            fontSize: '18px',
            fontWeight: 500,
            color: 'var(--sc-ink)'
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderBottom: '1px solid var(--sc-ink)', paddingBottom: '6px' }}>
          <span style={SECTION_HEADING}>Move this season to another device</span>
          <span style={{ fontSize: '12px', color: 'var(--sc-muted-ink)' }}>
            Copy the code, paste it into Notes or a message, open it there.
          </span>
        </div>
        <button
          onClick={handleCopy}
          style={{
            height: '52px',
            background: 'var(--sc-ink)',
            color: 'var(--sc-paper)',
            border: 'none',
            fontFamily: 'var(--sc-font-display)',
            fontSize: '16px',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase'
          }}
        >
          Copy save code
        </button>
        {exported !== null && (
          <div style={{ border: '1px dashed var(--sc-muted-ink)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--sc-card-bg)' }}>
            <div style={{ fontSize: '12px', lineHeight: 1.5, wordBreak: 'break-all' }}>{saveCodeExcerpt(exported.code)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--sc-muted-ink)' }}>
              <span>{formatCharacterCount(exported.code.length)}</span>
              <span>{exported.copied ? 'Copied' : 'Copy failed — select the code below'}</span>
            </div>
            {/*
              Section 6.1: the box exists because an iOS clipboard write can
              fail silently. The excerpt above is for eyeballing a paste; when
              the write actually failed the full code has to be selectable, or
              there is no way to get the save off the device at all.
            */}
            {!exported.copied && (
              <textarea
                readOnly
                aria-label="Full save code"
                value={exported.code}
                onFocus={(e) => (e.target as HTMLTextAreaElement).select()}
                rows={3}
                style={{
                  fontSize: '11px',
                  lineHeight: 1.5,
                  wordBreak: 'break-all',
                  fontFamily: 'var(--sc-font-body)',
                  color: 'var(--sc-ink)',
                  background: 'transparent',
                  border: '1px solid var(--sc-faint-rule)',
                  padding: '8px',
                  resize: 'vertical'
                }}
              />
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ borderBottom: '1px solid var(--sc-ink)', paddingBottom: '6px' }}>
          <span style={SECTION_HEADING}>Load a save code</span>
        </div>
        <textarea
          value={pasted}
          onInput={(e) => void handlePaste((e.target as HTMLTextAreaElement).value)}
          placeholder="SS1-…"
          rows={3}
          style={{
            minHeight: '64px',
            border: '1.5px solid var(--sc-ink)',
            padding: '10px 12px',
            background: 'var(--sc-card-bg)',
            fontSize: '12px',
            lineHeight: 1.5,
            wordBreak: 'break-all',
            fontFamily: 'var(--sc-font-body)',
            color: 'var(--sc-ink)',
            resize: 'vertical'
          }}
        />
        {decoded !== null && <DecodeFeedback result={decoded} />}
        {decoded !== null && decoded.ok && (
          <button
            onClick={props.onApply}
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
            Load this save
          </button>
        )}
        {props.canUndo && (
          <button onClick={props.onUndo} style={linkButton('var(--sc-pencil-red)')}>
            <span>Undo load</span>
          </button>
        )}
      </div>

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--sc-faint-rule)',
          paddingTop: '14px',
          minHeight: 'var(--sc-tap-target-min)'
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--sc-muted-ink)' }}>Saved after every pitch.</span>
        {confirmingReset ? (
          <span style={{ display: 'flex', gap: '12px' }}>
            <button onClick={props.onReset} style={linkButton('var(--sc-pencil-red)')}>
              <span>Really reset</span>
            </button>
            <button onClick={() => setConfirmingReset(false)} style={linkButton()}>
              <span>Cancel</span>
            </button>
          </span>
        ) : (
          <button onClick={() => setConfirmingReset(true)} style={linkButton('var(--sc-pencil-red)')}>
            <span>Reset season</span>
          </button>
        )}
      </div>
    </div>
  )
}

/** The preview line, or the specific failure message section 6.1 requires. */
function DecodeFeedback({ result }: { result: DecodeOutcome }) {
  if (!result.ok) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: 1.45, color: 'var(--sc-pencil-red)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6" />
          <path d="M12 16h.01" />
        </svg>
        <span>{result.message}</span>
      </div>
    )
  }

  const p: SavePreview = result.preview
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: 1.45 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
        <path d="M5 12l5 5 9-10" />
      </svg>
      <span>
        {previewSummary(p)} · saved {relativeTime(p.savedAt)} on {p.device}.{' '}
        {p.isOlderThanLocal === true && (
          <span style={{ color: 'var(--sc-pencil-red)' }}>Older than the save on this device.</span>
        )}
        {p.isOlderThanLocal === false && (
          <span style={{ color: 'var(--sc-muted-ink)' }}>Newer than the save on this device.</span>
        )}
      </span>
    </div>
  )
}

function linkButton(color = 'var(--sc-ink)'): preact.JSX.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: 'var(--sc-tap-target-min)',
    fontSize: '12px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color,
    background: 'none',
    border: 'none',
    padding: 0,
    fontFamily: 'var(--sc-font-body)'
  }
}
