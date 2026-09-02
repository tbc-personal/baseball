/**
 * The paste preview line (6.1: "Game 7 · Herons 4–2 · bottom 4th · saved
 * 2 hours ago on iPhone"). This produces the structured facts only -- the
 * UI formats relative time and assembles the sentence.
 */

import type { SaveEnvelope, SavePreview } from './types'
import { HERONS_TEAM_ID } from '../engine/season'

/**
 * @param envelope The decoded (not-yet-applied) pasted save.
 * @param localSavedAt The local save's `savedAt`, if any, to compare
 *   against for the "older than the save on this device" warning.
 */
export function previewOf(envelope: SaveEnvelope, localSavedAt: string | null = null): SavePreview {
  const { state } = envelope
  const game = state.currentGame

  let inGame = false
  let gameNumber: number | null = null
  let half: SavePreview['half'] = null
  let inning: number | null = null
  let ownScore: number | null = null
  let opponentScore: number | null = null
  let opponentTeamId: string | null = null

  if (game) {
    inGame = true
    gameNumber = game.gameIndex + 1
    half = game.half
    inning = game.inning
    if (game.homeTeamId === HERONS_TEAM_ID) {
      ownScore = game.homeScore
      opponentScore = game.awayScore
      opponentTeamId = game.awayTeamId
    } else {
      ownScore = game.awayScore
      opponentScore = game.homeScore
      opponentTeamId = game.homeTeamId
    }
  }

  const isOlderThanLocal = localSavedAt == null ? null : Date.parse(envelope.savedAt) < Date.parse(localSavedAt)

  return {
    teamName: state.teamName,
    gameNumber,
    inGame,
    half,
    inning,
    ownScore,
    opponentScore,
    opponentTeamId,
    savedAt: envelope.savedAt,
    device: envelope.device,
    isOlderThanLocal
  }
}
