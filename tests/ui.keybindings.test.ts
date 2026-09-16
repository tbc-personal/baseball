import { describe, it, expect } from 'vitest'
import { bindingFor } from '../src/ui/useKeyBindings'
import type { KeyBindings, KeyEventFacts } from '../src/ui/useKeyBindings'

/**
 * `bindingFor` is the whole keyboard decision, extracted from the hook so
 * it can be tested without a DOM (this project runs vitest in node; see
 * BUILD_NOTES.md section 5).
 */

function facts(overrides: Partial<KeyEventFacts> = {}): KeyEventFacts {
  return { key: 'c', repeat: false, withModifier: false, inEditableField: false, onButton: false, ...overrides }
}

describe('bindingFor', () => {
  const fired: string[] = []
  const bindings: KeyBindings = {
    t: () => fired.push('Take'),
    c: () => fired.push('Contact'),
    b: undefined,
    Enter: () => fired.push('primary'),
    Escape: () => fired.push('back')
  }

  it('returns the handler for a bound key', () => {
    expect(bindingFor(bindings, facts({ key: 'c' }))).toBe(bindings.c)
    expect(bindingFor(bindings, facts({ key: 't' }))).toBe(bindings.t)
  })

  it('matches single-character keys case-insensitively, so caps lock still plays', () => {
    expect(bindingFor(bindings, facts({ key: 'C' }))).toBe(bindings.c)
    expect(bindingFor(bindings, facts({ key: 'T' }))).toBe(bindings.t)
  })

  it('matches named keys exactly', () => {
    expect(bindingFor(bindings, facts({ key: 'Enter' }))).toBe(bindings.Enter)
    expect(bindingFor(bindings, facts({ key: 'Escape' }))).toBe(bindings.Escape)
  })

  it('returns null for an unbound key', () => {
    expect(bindingFor(bindings, facts({ key: 'z' }))).toBeNull()
  })

  it('returns null for a key that is deliberately unbound right now', () => {
    // Bunt with the bases empty: the binding exists in the map as undefined
    // so the event is left alone rather than swallowed.
    expect(bindingFor(bindings, facts({ key: 'b' }))).toBeNull()
  })

  it('ignores a held key, so leaning on Contact does not swing twice', () => {
    expect(bindingFor(bindings, facts({ key: 'c', repeat: true }))).toBeNull()
  })

  it('leaves browser and OS shortcuts alone', () => {
    expect(bindingFor(bindings, facts({ key: 'c', withModifier: true }))).toBeNull()
    expect(bindingFor(bindings, facts({ key: 'Enter', withModifier: true }))).toBeNull()
  })

  it('never steals a keystroke from a text field', () => {
    // Typing a team name, or pasting a save code, must not swing the bat.
    expect(bindingFor(bindings, facts({ key: 'c', inEditableField: true }))).toBeNull()
    expect(bindingFor(bindings, facts({ key: 't', inEditableField: true }))).toBeNull()
    expect(bindingFor(bindings, facts({ key: 'Escape', inEditableField: true }))).toBeNull()
  })

  it('leaves Enter and Space to a focused button, which activates itself', () => {
    expect(bindingFor(bindings, facts({ key: 'Enter', onButton: true }))).toBeNull()
    expect(bindingFor(bindings, facts({ key: ' ', onButton: true }))).toBeNull()
  })

  it('still handles letter keys while a button has focus', () => {
    // A button does not respond to letters, so there is nothing to collide
    // with -- tabbing to Season must not disable the swing keys.
    expect(bindingFor(bindings, facts({ key: 'c', onButton: true }))).toBe(bindings.c)
  })
})
