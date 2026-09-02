import { describe, it, expect, vi, afterEach } from 'vitest'

import {
  SAVE_SCHEMA_VERSION,
  createMemoryStorage,
  freshAppState,
  save,
  load,
  loadLocalEnvelope,
  applyImportedSave,
  undoLoad,
  SAVE_KEY,
  UNDO_KEY,
  exportSaveCode,
  decodeSaveCode,
  previewOf,
  migrate,
  SchemaTooNewError,
  DEFAULT_TEAM_NAME
} from '../src/store'
import type { AppState, AnyVersionEnvelope, SaveEnvelope } from '../src/store'

import { createSeason, simulateSeason, HERONS_TEAM, ALL_TEAMS, HERONS_TEAM_ID } from '../src/engine/season'
import { createGame } from '../src/engine/inning'
import { applyPitch } from '../src/engine/inning'
import { makeRng } from '../src/engine/rng'
import type { Teams } from '../src/engine/inning'

// ============================================================================
// Fixtures: fresh, mid-game, and end-of-season AppState
// ============================================================================

const OPPONENT = ALL_TEAMS.find((t) => t.id !== HERONS_TEAM_ID)!

function freshFixture(seed = 1): AppState {
  return freshAppState(seed, 'Harbor Herons')
}

/** A mid-game AppState: a season in progress, with a game a few pitches in. */
function midGameFixture(seed = 2): AppState {
  const season = createSeason(seed)
  let game = createGame({
    gameIndex: 0,
    homeTeam: HERONS_TEAM,
    awayTeam: OPPONENT,
    homePitcher: HERONS_TEAM.pitchers[0],
    awayPitcher: OPPONENT.pitchers[0],
    seed
  })
  const teams: Teams = { home: HERONS_TEAM, away: OPPONENT }
  const rng = makeRng(seed + 1)
  for (let i = 0; i < 6 && !game.isOver; i++) {
    game = applyPitch(game, 'Contact', teams, rng).state
  }
  return { teamName: 'Harbor Herons', season, currentGame: game }
}

/** An end-of-season AppState: every game played, no game in progress. */
function endOfSeasonFixture(seed = 3): AppState {
  return { teamName: 'Harbor Herons', season: simulateSeason(seed), currentGame: null }
}

const FIXTURES: Array<[string, () => AppState]> = [
  ['a fresh season', () => freshFixture()],
  ['a mid-game season', () => midGameFixture()],
  ['an end-of-season season', () => endOfSeasonFixture()]
]

// ============================================================================
// 6.1: round-trip a fresh, a mid-game, and an end-of-season state
// ============================================================================

describe('save code round-trip (GAME_DESIGN.md 6.1)', () => {
  for (const [label, make] of FIXTURES) {
    it(`round-trips ${label}`, async () => {
      const state = make()
      const code = await exportSaveCode(state, 'Test Device')
      expect(code.startsWith('SS1-')).toBe(true)

      const result = await decodeSaveCode(code)
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error('unreachable')
      expect(result.envelope.state).toEqual(state)
      expect(result.envelope.device).toBe('Test Device')
      expect(result.envelope.v).toBe(SAVE_SCHEMA_VERSION)
    })
  }
})

// ============================================================================
// 6.1: truncation by 1, 10, and 200 chars fails the checksum
// ============================================================================

describe('truncated save codes (GAME_DESIGN.md 6.1)', () => {
  it.each([1, 10, 200])('fails to decode when truncated by %i chars', async (n) => {
    const state = midGameFixture()
    const code = await exportSaveCode(state, 'Test Device')
    expect(code.length).toBeGreaterThan(n + 20) // sanity: fixture is big enough for all three cuts to be meaningful

    const truncated = code.slice(0, code.length - n)
    const result = await decodeSaveCode(truncated)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.reason).toBe('checksum-mismatch')
    expect(result.message).not.toMatch(/^(Error|TypeError|SyntaxError)/) // never a raw exception surfaced
  })
})

// ============================================================================
// 6.1: a hand-edited savedAt older than local triggers the warning
// ============================================================================

describe('previewOf / staleness warning (GAME_DESIGN.md 6.1)', () => {
  it('flags a pasted save as older than the local one', () => {
    const state = midGameFixture()
    const envelope: SaveEnvelope = {
      v: SAVE_SCHEMA_VERSION,
      savedAt: '2020-01-01T00:00:00.000Z', // hand-edited to be old
      device: 'Old iPhone',
      state
    }
    const localSavedAt = '2026-09-02T12:00:00.000Z'

    const preview = previewOf(envelope, localSavedAt)
    expect(preview.isOlderThanLocal).toBe(true)
  })

  it('does not flag a pasted save that is newer than the local one', () => {
    const state = midGameFixture()
    const envelope: SaveEnvelope = {
      v: SAVE_SCHEMA_VERSION,
      savedAt: '2026-09-02T12:00:00.000Z',
      device: 'New iPhone',
      state
    }
    const localSavedAt = '2020-01-01T00:00:00.000Z'

    const preview = previewOf(envelope, localSavedAt)
    expect(preview.isOlderThanLocal).toBe(false)
  })

  it('reports null when there is no local save to compare against', () => {
    const state = freshFixture()
    const envelope: SaveEnvelope = { v: SAVE_SCHEMA_VERSION, savedAt: new Date().toISOString(), device: 'iPhone', state }
    expect(previewOf(envelope).isOlderThanLocal).toBeNull()
  })

  it('reports the preview line data for a mid-game save', () => {
    const state = midGameFixture()
    const envelope: SaveEnvelope = { v: SAVE_SCHEMA_VERSION, savedAt: new Date().toISOString(), device: 'iPhone', state }
    const preview = previewOf(envelope)
    expect(preview.inGame).toBe(true)
    expect(preview.gameNumber).toBe(1) // gameIndex 0 -> "Game 1"
    expect(preview.half).toEqual(state.currentGame!.half)
    expect(preview.inning).toBe(state.currentGame!.inning)
    expect(preview.device).toBe('iPhone')
  })
})

// ============================================================================
// 6.1: v: 0 is migrated
// ============================================================================

describe('migrate (GAME_DESIGN.md 6.1)', () => {
  it('migrates a v: 0 envelope to the current version', () => {
    const season = createSeason(4)
    const v0: AnyVersionEnvelope = {
      v: 0,
      savedAt: '2025-01-01T00:00:00.000Z',
      device: 'Old Phone',
      // v0 predates the `teamName` field on the persisted state.
      state: { season, currentGame: null }
    }

    const migrated = migrate(v0)
    expect(migrated.v).toBe(SAVE_SCHEMA_VERSION)
    expect(migrated.state.teamName).toBe(DEFAULT_TEAM_NAME)
    expect(migrated.state.season).toEqual(season)
    expect(migrated.state.currentGame).toBeNull()
  })

  // 6.1: v: 99 is refused with the "newer version" message
  it('refuses a version newer than the current one', () => {
    const tooNew: AnyVersionEnvelope = {
      v: 99,
      savedAt: new Date().toISOString(),
      device: 'Future Phone',
      state: freshFixture()
    }
    expect(() => migrate(tooNew)).toThrow(SchemaTooNewError)
  })

  it('decodeSaveCode refuses v: 99 with the "newer version" message', async () => {
    const tooNew: SaveEnvelope = {
      // SaveEnvelope['v'] is typed to the current version, but a save
      // arriving from a newer build isn't -- this is exactly the case
      // under test, so a narrow cast stands in for "decoded off the wire".
      v: 99 as typeof SAVE_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      device: 'Future Phone',
      state: freshFixture()
    }
    const code = await encodeRawEnvelopeForTest(tooNew)
    const result = await decodeSaveCode(code)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.reason).toBe('schema-too-new')
    expect(result.message).toBe('This save is from a newer version of the game; update this device.')
  })
})

/** Build a syntactically-valid SS1 code for an arbitrary envelope object, bypassing exportSaveCode's version stamping -- for constructing an out-of-band "v: 99" code. */
async function encodeRawEnvelopeForTest(envelope: unknown): Promise<string> {
  const json = JSON.stringify(envelope)
  const bytes = new TextEncoder().encode(json)
  const stream = new CompressionStream('deflate-raw')
  const writer = stream.writable.getWriter()
  void writer.write(bytes)
  void writer.close()
  const compressed = new Uint8Array(await new Response(stream.readable).arrayBuffer())
  let binary = ''
  for (const b of compressed) binary += String.fromCharCode(b)
  const payload = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  let hash = 0x811c9dc5
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  const check = ((hash >>> 0) & 0xffff).toString(16).padStart(4, '0')
  return `SS1-${payload}-${check}`
}

// ============================================================================
// Corrupted localStorage falls back to a fresh season without throwing
// ============================================================================

describe('load() resilience (T6 acceptance criterion)', () => {
  it('falls back to a fresh season when localStorage holds unparseable garbage', () => {
    const storage = createMemoryStorage()
    storage.setItem(SAVE_KEY, 'not json at all {{{')
    expect(() => load(storage, 5)).not.toThrow()
    const state = load(storage, 5)
    expect(state.currentGame).toBeNull()
    expect(state.season.log).toEqual([])
  })

  it('falls back to a fresh season when localStorage holds valid JSON of the wrong shape', () => {
    const storage = createMemoryStorage()
    storage.setItem(SAVE_KEY, JSON.stringify({ hello: 'world', unrelated: [1, 2, 3] }))
    expect(() => load(storage, 5)).not.toThrow()
    const state = load(storage, 5)
    expect(state.currentGame).toBeNull()
  })

  it('falls back to a fresh season when the stored save is a schema version newer than this build', () => {
    const storage = createMemoryStorage()
    const tooNew: AnyVersionEnvelope = { v: 99, savedAt: new Date().toISOString(), device: 'x', state: freshFixture() }
    storage.setItem(SAVE_KEY, JSON.stringify(tooNew))
    expect(() => load(storage, 5)).not.toThrow()
    expect(load(storage, 5).currentGame).toBeNull()
  })

  it('round-trips a real save through localStorage', () => {
    const storage = createMemoryStorage()
    const state = midGameFixture()
    save(storage, state, 'Test Device')
    expect(load(storage, 999)).toEqual(state)
  })
})

// ============================================================================
// SS0 fallback (compression unavailable) and cross-format equivalence
// ============================================================================

describe('SS0 fallback (GAME_DESIGN.md 6.1)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips when CompressionStream is unavailable', async () => {
    vi.stubGlobal('CompressionStream', undefined)
    vi.stubGlobal('DecompressionStream', undefined)

    const state = midGameFixture()
    const code = await exportSaveCode(state, 'No-Compression Device')
    expect(code.startsWith('SS0-')).toBe(true)

    const result = await decodeSaveCode(code)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.envelope.state).toEqual(state)
  })

  it('an SS1 code and an SS0 code of the same state decode to the same envelope', async () => {
    const state = midGameFixture()
    const now = () => '2026-09-02T12:00:00.000Z'

    const ss1 = await exportSaveCode(state, 'Same Device', { now })

    vi.stubGlobal('CompressionStream', undefined)
    vi.stubGlobal('DecompressionStream', undefined)
    const ss0 = await exportSaveCode(state, 'Same Device', { now })
    vi.unstubAllGlobals()

    expect(ss1.startsWith('SS1-')).toBe(true)
    expect(ss0.startsWith('SS0-')).toBe(true)

    const decoded1 = await decodeSaveCode(ss1)
    const decoded0 = await decodeSaveCode(ss0)
    expect(decoded1.ok).toBe(true)
    expect(decoded0.ok).toBe(true)
    if (!decoded1.ok || !decoded0.ok) throw new Error('unreachable')
    expect(decoded1.envelope).toEqual(decoded0.envelope)
  })
})

// ============================================================================
// Bad prefix
// ============================================================================

describe('decodeSaveCode failure messages (GAME_DESIGN.md 6.1)', () => {
  it('rejects a bad prefix with a specific message', async () => {
    const result = await decodeSaveCode('XX1-abcdef-1234')
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.reason).toBe('bad-prefix')
    expect(result.message).toMatch(/SS1-|SS0-/)
  })

  it('rejects garbage with no valid structure at all, without throwing', async () => {
    const result = await decodeSaveCode('')
    expect(result.ok).toBe(false)
  })
})

// ============================================================================
// Undo load
// ============================================================================

describe('undo load (GAME_DESIGN.md 6.1)', () => {
  it('restores exactly the previous local state, once', async () => {
    const storage = createMemoryStorage()
    const original = midGameFixture()
    save(storage, original, 'Test Device')

    const incoming = endOfSeasonFixture()
    const code = await exportSaveCode(incoming, 'Other Device')
    const decoded = await decodeSaveCode(code)
    if (!decoded.ok) throw new Error('unreachable')

    applyImportedSave(storage, decoded.envelope)
    expect(load(storage, 1)).toEqual(incoming)

    const restored = undoLoad(storage)
    expect(restored).toEqual(original)
    expect(load(storage, 1)).toEqual(original)

    // Works once: a second undo has nothing left to restore.
    expect(undoLoad(storage)).toBeNull()
    expect(storage.getItem(UNDO_KEY)).toBeNull()
  })

  it('returns null when there is nothing to undo', () => {
    const storage = createMemoryStorage()
    expect(undoLoad(storage)).toBeNull()
  })
})

// ============================================================================
// loadLocalEnvelope (used to feed previewOf's "older than local" check)
// ============================================================================

describe('loadLocalEnvelope', () => {
  it('returns null when there is no local save', () => {
    const storage = createMemoryStorage()
    expect(loadLocalEnvelope(storage)).toBeNull()
  })

  it('returns the local envelope when there is one', () => {
    const storage = createMemoryStorage()
    const state = freshFixture()
    save(storage, state, 'Test Device', () => '2026-01-01T00:00:00.000Z')
    const envelope = loadLocalEnvelope(storage)
    expect(envelope).not.toBeNull()
    expect(envelope!.savedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(envelope!.state).toEqual(state)
  })
})

// ============================================================================
// The point of the whole feature: a season moved to another device must not
// just deserialize equal, it must keep playing the same way.
// ============================================================================

describe('a transferred save continues the game identically', () => {
  it('plays out the same after a full export/decode round-trip', async () => {
    const original = midGameFixture(99)
    const code = await exportSaveCode(original, 'iPhone')
    const decoded = await decodeSaveCode(code)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) throw new Error('unreachable')

    const restored = decoded.envelope.state as AppState
    const teams: Teams = { home: HERONS_TEAM, away: OPPONENT }

    const playOn = (state: AppState) => {
      let game = state.currentGame!
      // Resume from the saved rng state, exactly as the app does on load.
      const rng = makeRng(game.rngState)
      const choices = ['Contact', 'Power', 'Take', 'Contact', 'Power'] as const
      for (const choice of choices) {
        if (game.isOver) break
        game = applyPitch(game, choice, teams, rng).state
      }
      return game
    }

    expect(playOn(restored)).toEqual(playOn(original))
  })
})
