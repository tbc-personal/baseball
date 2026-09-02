/**
 * App shell for T7: loads/creates the persisted AppState, keeps the
 * in-progress game's opponent half-innings simulated instantly (per
 * GAME_DESIGN.md 2: "you never wait for them" -- there is no
 * between-innings screen yet, that's T8, so this fast-forwards straight to
 * the next Herons at-bat), renders the at-bat screen, and saves after
 * every pitch (PLAN.md section 2).
 *
 * This file composes engine + store calls; it does not itself decide any
 * baseball outcome. Home/between-innings/season/settings screens are T8.
 */

import { useState } from 'preact/hooks'
import type { Choice, GameState } from '../engine/types'
import type { Teams } from '../engine/inning'
import { applyPitch, createGame } from '../engine/inning'
import { simulateHalfInning } from '../engine/sim'
import { makeRng } from '../engine/rng'
import { recommendedChoice } from '../engine/recommend'
import { isBuntAvailable } from '../engine/pitch'
import { HERONS_TEAM_ID, pitcherForGame, accumulateStats, teamById } from '../engine/season'
import type { AppState } from '../store/types'
import { save, load, getBrowserStorage, createMemoryStorage, DEFAULT_TEAM_NAME } from '../store'
import { AtBatScreen } from './AtBatScreen'

// ============================================================================
// Bootstrapping
// ============================================================================

const storage = getBrowserStorage() ?? createMemoryStorage()

function deviceLabel(): string {
  if (typeof navigator === 'undefined') return 'This device'
  const ua = navigator.userAgent
  if (/iPhone|iPad/.test(ua)) return 'iPhone'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  return 'This device'
}

function battingSideOf(state: GameState): 'home' | 'away' {
  return state.half === 'top' ? 'away' : 'home'
}

function pitchingSideOf(state: GameState): 'home' | 'away' {
  return state.half === 'top' ? 'home' : 'away'
}

function teamsFor(state: GameState): Teams {
  return { home: teamById(state.homeTeamId), away: teamById(state.awayTeamId) }
}

function heronsSideOf(state: GameState): 'home' | 'away' {
  return state.homeTeamId === HERONS_TEAM_ID ? 'home' : 'away'
}

/**
 * Instantly simulate any opponent half-innings sitting at the front of
 * `state`, so the caller always lands on a Herons at-bat (or a finished
 * game). A no-op when it's already the Herons' turn.
 */
function fastForwardToHeronsTurn(state: GameState, teams: Teams): GameState {
  let current = state
  while (!current.isOver && battingSideOf(current) !== heronsSideOf(current)) {
    const rng = makeRng(current.rngState)
    current = simulateHalfInning(current, teams, rng)
  }
  return current
}

/** Build a fresh game for the next unplayed scheduled slot, seeded off the season's own RNG state. */
function startNextGame(appState: AppState): AppState {
  const rng = makeRng(appState.season.rngState)
  const scheduled = appState.season.schedule.find((g) => !g.played)
  if (!scheduled) {
    // Season complete; nothing to play. T8's season/home screens own this
    // case properly -- T7 just avoids crashing.
    return appState
  }
  const homeTeam = teamById(scheduled.homeTeamId)
  const awayTeam = teamById(scheduled.awayTeamId)
  const gameSeed = Math.floor(rng.next() * 0xffffffff)
  const gameState = createGame({
    gameIndex: scheduled.gameIndex,
    homeTeam,
    awayTeam,
    homePitcher: pitcherForGame(homeTeam, scheduled.gameIndex),
    awayPitcher: pitcherForGame(awayTeam, scheduled.gameIndex),
    seed: gameSeed
  })
  const teams = teamsFor(gameState)
  const forwarded = fastForwardToHeronsTurn(gameState, teams)
  return {
    ...appState,
    season: { ...appState.season, rngState: rng.state() },
    currentGame: forwarded
  }
}

function bootstrapAppState(): AppState {
  const seed = Math.floor(Math.random() * 0xffffffff)
  let appState = load(storage, seed, DEFAULT_TEAM_NAME)
  if (appState.currentGame === null) {
    appState = startNextGame(appState)
  } else if (!appState.currentGame.isOver) {
    // Resuming mid-game: if the save landed on the opponent's turn for any
    // reason, fast-forward same as a fresh game.
    const teams = teamsFor(appState.currentGame)
    const forwarded = fastForwardToHeronsTurn(appState.currentGame, teams)
    appState = { ...appState, currentGame: forwarded }
  }
  return appState
}

// ============================================================================
// App
// ============================================================================

export function App() {
  const [appState, setAppState] = useState<AppState>(bootstrapAppState)

  const game = appState.currentGame

  if (game === null || game.isOver) {
    // T8 territory (home / between-innings / season screens). T7 only owns
    // the at-bat screen, so this is a minimal, honest placeholder rather
    // than a fabricated screen.
    return (
      <div className="sc-screen">
        <p style={{ fontFamily: 'var(--sc-font-display)', fontSize: '20px' }}>
          {game === null ? 'Season complete.' : 'Game over.'}
        </p>
      </div>
    )
  }

  const teams = teamsFor(game)
  const battingSide = battingSideOf(game)
  const pitchingSide = pitchingSideOf(game)
  const battingTeam = battingSide === 'home' ? teams.home : teams.away
  const pitchingTeam = pitchingSide === 'home' ? teams.home : teams.away
  const ownTeam = teams[heronsSideOf(game)]
  const opponentTeam = heronsSideOf(game) === 'home' ? teams.away : teams.home

  const batter = battingTeam.batters[game.currentBatterIndex[battingSide]]
  const pitcherId = pitchingSide === 'home' ? game.homePitcherId : game.awayPitcherId
  const pitcher = pitchingTeam.pitchers.find((p) => p.id === pitcherId) ?? pitchingTeam.pitchers[0]

  const batterStats = appState.season.batterStats.find((s) => s.batterId === batter.id) ?? {
    batterId: batter.id,
    pa: 0,
    ab: 0,
    h: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    bb: 0,
    k: 0,
    r: 0,
    rbi: 0
  }

  function onChoose(choice: Choice) {
    if (game === null) return
    const rng = makeRng(game.rngState)
    const battingTeamId = battingSide === 'home' ? game.homeTeamId : game.awayTeamId
    const { state: afterPitch, result } = applyPitch(game, choice, teams, rng)

    const season = accumulateStats(appState.season, battingTeamId, batter.id, result)
    let nextGame: GameState = afterPitch

    if (!nextGame.isOver) {
      nextGame = fastForwardToHeronsTurn(nextGame, teamsFor(nextGame))
    }

    const nextAppState: AppState = { ...appState, season, currentGame: nextGame }
    setAppState(nextAppState)
    save(storage, nextAppState, deviceLabel())
  }

  const bunt = isBuntAvailable(game.bases, game.outs, game.count)
  const pitchesThisAtBat = game.count.balls + game.count.strikes

  return (
    <AtBatScreen
      ownTeamName={ownTeam.shortName}
      ownScore={heronsSideOf(game) === 'home' ? game.homeScore : game.awayScore}
      opponentName={opponentTeam.shortName}
      opponentScore={heronsSideOf(game) === 'home' ? game.awayScore : game.homeScore}
      half={game.half}
      inning={game.inning}
      bases={game.bases}
      count={game.count}
      outs={game.outs}
      battingTeamBatters={battingTeam.batters}
      batter={batter}
      batterOrderIndex={game.currentBatterIndex[battingSide]}
      batterStats={batterStats}
      pitcherName={pitcher.name}
      bucket={game.currentPitch.displayedBucket}
      tendency={pitcher.tendency}
      pitchLabel={`${pitchesThisAtBat} this at-bat`}
      recommended={recommendedChoice(game.currentPitch.displayedBucket)}
      buntAvailable={bunt}
      lastPlay={game.plays.length > 0 ? game.plays[game.plays.length - 1] : null}
      onChoose={onChoose}
    />
  )
}
