/**
 * Keyboard bindings for a screen.
 *
 * The game's stated setting is a break between meetings, which is mostly a
 * laptop, and reaching for the trackpad to pick Take/Contact/Power is the
 * slowest part of an at-bat. Each screen declares the keys it wants next to
 * the buttons those keys stand in for, so a binding cannot drift away from
 * the control it mirrors, and only the mounted screen has a listener.
 *
 * This is presentation, not a game rule: a key does exactly what pressing
 * the corresponding button does, and nothing is reachable by keyboard that
 * is not reachable by tapping.
 */

import { useEffect, useRef } from 'preact/hooks'

/**
 * Key name -> what to do. Single-character keys are matched
 * case-insensitively; everything else matches `KeyboardEvent.key` exactly
 * (`Enter`, `Escape`, ...). An `undefined` handler means the key is
 * deliberately unbound right now -- a Bunt key with no runners on, say --
 * and the event is left alone rather than swallowed.
 */
export type KeyBindings = Record<string, (() => void) | undefined>

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

/**
 * Everything `bindingFor` needs from a keydown, as plain data. The hook
 * reads these off the real event; the tests supply them directly, because
 * this project runs vitest without a DOM (see BUILD_NOTES.md) and the rules
 * below are the part worth testing.
 */
export interface KeyEventFacts {
  key: string
  repeat: boolean
  withModifier: boolean
  /** Focus is in a text field, so the keystroke belongs to that field. */
  inEditableField: boolean
  /** Focus is on a button, which already activates itself on Enter/Space. */
  onButton: boolean
}

/**
 * The whole decision: which handler, if any, a keydown should run. Pure, so
 * every rule here is covered by tests rather than by hoping.
 */
export function bindingFor(bindings: KeyBindings, facts: KeyEventFacts): (() => void) | null {
  // Leave browser and OS shortcuts alone.
  if (facts.withModifier) return null
  // A held key must not swing twice.
  if (facts.repeat) return null
  // Never steal a keystroke from the team-name field or a save-code box.
  if (facts.inEditableField) return null
  // A focused button already activates on Enter and Space. Handling those
  // here too would either fire twice or, worse, fire the screen's primary
  // action when the player meant the button they had tabbed to.
  if ((facts.key === 'Enter' || facts.key === ' ') && facts.onButton) return null

  const key = facts.key.length === 1 ? facts.key.toLowerCase() : facts.key
  return bindings[key] ?? null
}

/**
 * `enabled` is how a screen turns its own keys off while a choice is
 * resolving, matching the `disabled` its buttons already carry.
 */
export function useKeyBindings(bindings: KeyBindings, enabled = true): void {
  // Callers build a fresh bindings object every render, so the listener
  // reads the latest one through a ref rather than being torn down and
  // re-attached on each pitch.
  const latest = useRef(bindings)
  latest.current = bindings

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      const handler = bindingFor(latest.current, {
        key: event.key,
        repeat: event.repeat,
        withModifier: event.ctrlKey || event.metaKey || event.altKey,
        inEditableField: isEditable(event.target),
        onButton: document.activeElement instanceof HTMLButtonElement
      })
      if (handler === null) return

      // Stops Enter and Space from also synthesising a click, and stops
      // Space from scrolling the page.
      event.preventDefault()
      handler()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
