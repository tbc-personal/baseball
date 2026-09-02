/**
 * Save schema types (GAME_DESIGN.md 6 and 6.1).
 */

import type { GameState, SeasonState } from '../engine/types'

/**
 * The whole persisted app state: everything that needs to survive a
 * reload or a device transfer.
 *
 * GAME_DESIGN.md 6 and PLAN.md 2/3 both say "save the whole GameState"
 * loosely, meaning "the whole game" rather than the engine's `GameState`
 * type specifically (which is just the one game in progress). The engine
 * has no single type for "season + in-progress game + settings" -- that
 * combination is a store-level concern, not an engine one -- so this is
 * defined here. `currentGame` is null between games (including a fresh,
 * ungenerated season) and holds the in-progress game otherwise.
 */
export interface AppState {
  /** Settings screen "Team name" (mockup Transfer.dc.html); default 'Harbor Herons'. */
  teamName: string
  season: SeasonState
  currentGame: GameState | null
}

/**
 * The save-schema version this build understands. Bump when AppState's
 * shape changes in a way `migrate()` needs to account for.
 */
export const SAVE_SCHEMA_VERSION = 1

/**
 * The envelope wrapping every save, whether it lives in localStorage or is
 * round-tripped as a save code (GAME_DESIGN.md 6.1). `v` is the schema
 * version `migrate()` understands; `device` is the free-text label set in
 * Settings (default: coarse user-agent family), used only for the paste
 * preview.
 */
export interface SaveEnvelope {
  v: typeof SAVE_SCHEMA_VERSION
  savedAt: string // ISO 8601
  device: string
  state: AppState
}

/** A save envelope of any schema version, as read back from JSON before migration. */
export interface AnyVersionEnvelope {
  v: number
  savedAt: string
  device: string
  state: unknown
}

/** Why `decodeSaveCode` refused a pasted code. Never a raw thrown error (6.1). */
export type DecodeFailureReason = 'bad-prefix' | 'checksum-mismatch' | 'schema-too-new' | 'unreadable'

export type DecodeResult =
  | { ok: true; envelope: SaveEnvelope }
  | { ok: false; reason: DecodeFailureReason; message: string }

/**
 * Structured data for the paste preview line (6.1: "Game 7 · Herons 4–2 ·
 * bottom 4th · saved 2 hours ago on iPhone"). The UI formats this into
 * text and relative time; this only reports facts.
 */
export interface SavePreview {
  teamName: string
  /** 1-based game number for display ("Game 7"); null if no game is in progress. */
  gameNumber: number | null
  inGame: boolean
  half: GameState['half'] | null
  inning: number | null
  /** The saved team's own score and its opponent's, regardless of home/away. */
  ownScore: number | null
  opponentScore: number | null
  opponentTeamId: string | null
  savedAt: string
  device: string
  /** null when there is no local save to compare against. */
  isOlderThanLocal: boolean | null
}
