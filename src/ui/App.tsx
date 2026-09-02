/**
 * App shell: the five screens and the navigation between them
 * (GAME_DESIGN.md sections 2 and 8).
 *
 * The session shape this implements: home shows exactly one primary action;
 * playing runs your half-inning one pitch at a time; when it ends, the
 * opponent's half is simulated instantly and both are recapped on the
 * between-innings screen, which is a safe stopping point because state is
 * already saved.
 *
 * This file composes engine and store calls. It decides no baseball
 * outcome; every derived number comes from an engine selector.
 */

import { useState } from 'preact/hooks'
import type { Choice, GameState } from '../engine/types'
import type { Teams } from '../engine/inning'
import { applyPitch, createGame } from '../engine/inning'
import type { HalfInningRecap, PlayLogEntry } from '../engine/sim'
import { simulateHalfInningWithRecap, isHitEvent } from '../engine/sim'
import { makeRng } from '../engine/rng'
import { recommendedChoice } from '../engine/recommend'
import { isBuntAvailable } from '../engine/pitch'
import {
  HERONS_TEAM_ID,
  pitcherForGame,
  accumulateStats,
  teamById,
  standingsTable,
  recordGameResult,
  checkMilestones
} from '../engine/season'
import { LEAGUE_NAME } from '../engine/content/opponents'
import { INNINGS_PER_GAME } from '../engine/constants'
import type { AppState, SavePreview, SaveEnvelope } from '../store/types'
import {
  save,
  load,
  loadLocalEnvelope,
  applyImportedSave,
  undoLoad,
  exportSaveCode,
  decodeSaveCode,
  previewOf,
  freshAppState,
  getBrowserStorage,
  createMemoryStorage,
  DEFAULT_TEAM_NAME
} from '../store'
import { AtBatScreen } from './AtBatScreen'
import { HomeScreen } from './HomeScreen'
import { BetweenScreen } from './BetweenScreen'
import { SeasonScreen } from './SeasonScreen'
import { SettingsScreen, type DecodeOutcome } from './SettingsScreen'
import { describeHalfInning, halfInningLabel, ordinal, primaryAction, resumeSentence, surname } from './format'

const storage = getBrowserStorage() ?? createMemoryStorage()
const TOTAL_GAMES = 20

type Screen = 'home' | 'atbat' | 'between' | 'season' | 'settings'

interface BetweenData {
  yours: HalfInningRecap
  opponent: HalfInningRecap | null
  gameEnded: boolean
  milestones: string[]
  /**
   * The finished game, kept only when it ended on this half. appState's
   * currentGame is cleared the moment a game is over, so without this the
   * between-innings screen would draw the final line score from nothing --
   * every inning blank, 0-0, and the two teams in the wrong rows.
   */
  finalGame: GameState | null
}

function deviceLabel(): string {
  if (typeof navigator === 'undefined') return 'This device'
  const ua = navigator.userAgent
  if (/iPhone|iPad/.test(ua)) return 'iPhone'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  return 'This device'
}

const battingSideOf = (s: GameState) => (s.half === 'top' ? 'away' : 'home')
const pitchingSideOf = (s: GameState) => (s.half === 'top' ? 'home' : 'away')
const heronsSideOf = (s: GameState) => (s.homeTeamId === HERONS_TEAM_ID ? 'home' : 'away')
const teamsFor = (s: GameState): Teams => ({ home: teamById(s.homeTeamId), away: teamById(s.awayTeamId) })

function startNextGame(appState: AppState): AppState {
  const rng = makeRng(appState.season.rngState)
  const scheduled = appState.season.schedule.find((g) => !g.played)
  if (!scheduled) return appState

  const homeTeam = teamById(scheduled.homeTeamId)
  const awayTeam = teamById(scheduled.awayTeamId)
  const gameState = createGame({
    gameIndex: scheduled.gameIndex,
    homeTeam,
    awayTeam,
    homePitcher: pitcherForGame(homeTeam, scheduled.gameIndex),
    awayPitcher: pitcherForGame(awayTeam, scheduled.gameIndex),
    seed: Math.floor(rng.next() * 0xffffffff)
  })
  return {
    ...appState,
    season: { ...appState.season, rngState: rng.state() },
    currentGame: gameState
  }
}

export function App() {
  const [appState, setAppState] = useState<AppState>(() =>
    load(storage, Math.floor(Math.random() * 0xffffffff), DEFAULT_TEAM_NAME)
  )
  const [screen, setScreen] = useState<Screen>('home')
  const [between, setBetween] = useState<BetweenData | null>(null)
  const [yourPlays, setYourPlays] = useState<PlayLogEntry[]>([])
  const [yourHits, setYourHits] = useState(0)
  const [pendingImport, setPendingImport] = useState<SaveEnvelope | null>(null)
  const [canUndo, setCanUndo] = useState(false)

  const persist = (next: AppState) => {
    setAppState(next)
    save(storage, next, deviceLabel())
  }

  const game = appState.currentGame
  const seasonComplete = appState.season.schedule.every((g) => g.played)

  // ==========================================================================
  // Playing
  // ==========================================================================

  /**
   * Run the opponent's half-innings until it is the Herons' turn again (or
   * the game is over), keeping the last one's recap for the between screen.
   */
  function runOpponentHalves(state: GameState): { state: GameState; recap: HalfInningRecap | null } {
    let current = state
    let recap: HalfInningRecap | null = null
    while (!current.isOver && battingSideOf(current) !== heronsSideOf(current)) {
      const rng = makeRng(current.rngState)
      const stepped = simulateHalfInningWithRecap(current, teamsFor(current), rng)
      current = stepped.state
      recap = stepped.recap
    }
    return { state: current, recap }
  }

  function beginPlaying() {
    let next = appState
    if (next.currentGame === null) next = startNextGame(next)
    if (next.currentGame === null) return

    // The opponent bats first when the Herons are at home; play those out
    // before handing control over.
    const { state, recap } = runOpponentHalves(next.currentGame)
    next = { ...next, currentGame: state }
    setYourPlays([])
    setYourHits(0)
    persist(next)

    if (recap !== null && state.isOver === false && battingSideOf(state) === heronsSideOf(state) && recap.log.length > 0) {
      // Opponent batted before our first turn of this visit; show it, then play.
      setBetween({ yours: emptyRecap(state), opponent: recap, gameEnded: false, milestones: [], finalGame: null })
      setScreen('between')
      return
    }
    setScreen(state.isOver ? 'home' : 'atbat')
  }

  function emptyRecap(state: GameState): HalfInningRecap {
    return {
      half: state.half,
      inning: state.inning,
      battingTeamId: HERONS_TEAM_ID,
      log: [],
      runs: 0,
      hits: 0,
      leftOnBase: 0
    }
  }

  function onChoose(choice: Choice) {
    if (game === null || game.isOver) return
    const battingSide = battingSideOf(game)
    const battingTeamId = battingSide === 'home' ? game.homeTeamId : game.awayTeamId
    const batter = teamById(battingTeamId).batters[game.currentBatterIndex[battingSide]]
    const outsBefore = game.outs

    const rng = makeRng(game.rngState)
    const { state: afterPitch, result } = applyPitch(game, choice, teamsFor(game), rng)

    const plays =
      result.play !== null
        ? [...yourPlays, { text: result.play, outsAfter: outsBefore + result.outsAdded, runsScored: result.runsScored.length }]
        : yourPlays
    setYourPlays(plays)
    const hits = yourHits + (isHitEvent(result.event) ? 1 : 0)
    setYourHits(hits)

    let season = accumulateStats(appState.season, battingTeamId, batter.id, result)
    let nextGame = afterPitch

    if (!result.halfInningEnded && !result.gameEnded) {
      persist({ ...appState, season, currentGame: nextGame })
      return
    }

    // Your half is over. Recap it, then run the opponent's half.
    const yours: HalfInningRecap = {
      half: game.half,
      inning: game.inning,
      battingTeamId,
      log: plays,
      runs: plays.reduce((n, p) => n + p.runsScored, 0),
      hits,
      leftOnBase: result.runnersLeftOnBase ?? 0
    }

    let opponentRecap: HalfInningRecap | null = null
    if (!nextGame.isOver) {
      const stepped = runOpponentHalves(nextGame)
      nextGame = stepped.state
      opponentRecap = stepped.recap
    }

    let milestones: string[] = []
    if (nextGame.isOver) {
      season = recordGameResult(season, nextGame)
      const checked = checkMilestones(season, nextGame)
      season = checked.season
      milestones = checked.fired
    }

    const next: AppState = { ...appState, season, currentGame: nextGame.isOver ? null : nextGame }
    persist(next)
    setYourPlays([])
    setYourHits(0)
    setBetween({
      yours,
      opponent: opponentRecap,
      gameEnded: nextGame.isOver,
      milestones,
      finalGame: nextGame.isOver ? nextGame : null
    })
    setScreen('between')
  }

  // ==========================================================================
  // Screens
  // ==========================================================================

  if (screen === 'season') {
    const gamesPlayed = appState.season.schedule.filter((g) => g.played).length
    return (
      <SeasonScreen
        gamesPlayed={gamesPlayed}
        standings={standingsTable(appState.season)}
        ownTeamId={HERONS_TEAM_ID}
        batting={appState.season.batterStats.map((s) => {
          const b = teamById(HERONS_TEAM_ID).batters.find((x) => x.id === s.batterId)
          return { batterId: s.batterId, label: b ? `${surname(b.name)} ${b.position}` : s.batterId, stats: s }
        })}
        onBack={() => setScreen('home')}
      />
    )
  }

  if (screen === 'settings') {
    return (
      <SettingsScreen
        teamName={appState.teamName}
        onTeamNameChange={(name) => persist({ ...appState, teamName: name })}
        onCopy={async () => {
          const code = await exportSaveCode(appState, deviceLabel())
          let copied = false
          try {
            await navigator.clipboard.writeText(code)
            copied = true
          } catch {
            // iOS can refuse a clipboard write outside a user gesture (6.1);
            // the code is shown in a selectable box regardless.
            copied = false
          }
          return { code, copied }
        }}
        onDecode={async (pastedCode): Promise<DecodeOutcome> => {
          const result = await decodeSaveCode(pastedCode)
          if (!result.ok) {
            setPendingImport(null)
            return { ok: false, message: result.message }
          }
          setPendingImport(result.envelope)
          const local = loadLocalEnvelope(storage)
          const preview: SavePreview = previewOf(result.envelope, local?.savedAt ?? null)
          return { ok: true, preview }
        }}
        onApply={() => {
          if (pendingImport === null) return
          applyImportedSave(storage, pendingImport)
          setAppState(pendingImport.state)
          setPendingImport(null)
          setCanUndo(true)
          setScreen('home')
        }}
        canUndo={canUndo}
        onUndo={() => {
          const restored = undoLoad(storage)
          if (restored !== null) setAppState(restored)
          setCanUndo(false)
        }}
        onReset={() => {
          const fresh = freshAppState(Math.floor(Math.random() * 0xffffffff), appState.teamName)
          persist(fresh)
          setBetween(null)
          setYourPlays([])
          setScreen('home')
        }}
        onBack={() => setScreen('home')}
      />
    )
  }

  if (screen === 'between' && between !== null) {
    const b = between
    const shown = b.opponent ?? b.yours
    const lineScoreGame = game ?? b.finalGame
    return (
      <BetweenScreen
        milestones={b.milestones}
        yoursPlayed={b.yours.log.length > 0}
        halfLabel={halfInningLabel(b.yours.half, b.yours.inning)}
        runs={b.yours.runs}
        hits={b.yours.hits}
        leftOnBase={b.yours.leftOnBase}
        log={b.yours.log}
        opponentHalfLabel={b.opponent ? halfInningLabel(b.opponent.half, b.opponent.inning) : ''}
        opponentTeamName={b.opponent ? teamById(b.opponent.battingTeamId).shortName : ''}
        opponentSummary={
          b.opponent
            ? describeHalfInning({
                runs: b.opponent.runs,
                hits: b.opponent.hits,
                leftOnBase: b.opponent.leftOnBase,
                plays: b.opponent.log.length
              })
            : 'No opponent half to play.'
        }
        lineScore={buildLineScore(lineScoreGame, shown)}
        nextLabel={b.gameEnded ? 'Next game' : `Play the ${ordinal(nextInningOf(lineScoreGame, b))}`}
        savedNote={savedNote(lineScoreGame, b)}
        onNext={() => {
          setBetween(null)
          if (b.gameEnded) {
            const started = startNextGame(appState)
            persist(started)
            setScreen('home')
          } else {
            setScreen('atbat')
          }
        }}
        onDone={() => {
          setBetween(null)
          setScreen('home')
        }}
      />
    )
  }

  if (screen === 'atbat' && game !== null && !game.isOver) {
    const teams = teamsFor(game)
    const battingSide = battingSideOf(game)
    const pitchingSide = pitchingSideOf(game)
    const battingTeam = teams[battingSide]
    const pitchingTeam = teams[pitchingSide]
    const ownSide = heronsSideOf(game)
    const ownTeam = teams[ownSide]
    const opponentTeam = ownSide === 'home' ? teams.away : teams.home
    const batter = battingTeam.batters[game.currentBatterIndex[battingSide]]
    const pitcherId = pitchingSide === 'home' ? game.homePitcherId : game.awayPitcherId
    const pitcher = pitchingTeam.pitchers.find((p) => p.id === pitcherId) ?? pitchingTeam.pitchers[0]
    const batterStats =
      appState.season.batterStats.find((s) => s.batterId === batter.id) ??
      { batterId: batter.id, pa: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, bb: 0, k: 0, r: 0, rbi: 0 }

    return (
      <AtBatScreen
        ownTeamName={ownTeam.shortName}
        ownScore={ownSide === 'home' ? game.homeScore : game.awayScore}
        opponentName={opponentTeam.shortName}
        opponentScore={ownSide === 'home' ? game.awayScore : game.homeScore}
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
        pitchLabel={`${game.count.balls + game.count.strikes} this at-bat`}
        recommended={recommendedChoice(game.currentPitch.displayedBucket)}
        buntAvailable={isBuntAvailable(game.bases, game.outs, game.count)}
        lastPlay={yourPlays.length > 0 ? yourPlays[yourPlays.length - 1].text : null}
        onChoose={onChoose}
      />
    )
  }

  // Home
  const standings = standingsTable(appState.season)
  const gamesPlayed = appState.season.schedule.filter((g) => g.played).length
  const ownRecord = standings.find((r) => r.teamId === HERONS_TEAM_ID)
  const nextScheduled = appState.season.schedule.find((g) => !g.played)
  const midAtBat = game !== null && (game.count.balls > 0 || game.count.strikes > 0 || game.outs > 0 || game.plays.length > 0)

  const inProgress =
    game !== null && !game.isOver
      ? (() => {
          const teams = teamsFor(game)
          const ownSide = heronsSideOf(game)
          const battingSide = battingSideOf(game)
          const batter = teams[battingSide].batters[game.currentBatterIndex[battingSide]]
          const runnersOn = [game.bases.first, game.bases.second, game.bases.third].filter((r) => r !== null).length
          return {
            homeOrAway: ownSide === 'home' ? 'home' : 'away',
            opponentName: (ownSide === 'home' ? teams.away : teams.home).name,
            ownTeamShort: teams[ownSide].shortName,
            ownScore: ownSide === 'home' ? game.homeScore : game.awayScore,
            opponentShort: (ownSide === 'home' ? teams.away : teams.home).shortName,
            opponentScore: ownSide === 'home' ? game.awayScore : game.homeScore,
            sentence: resumeSentence({
              half: game.half,
              inning: game.inning,
              runnersOn,
              outs: game.outs,
              batterSurname: surname(batter.name),
              balls: game.count.balls,
              strikes: game.count.strikes
            })
          }
        })()
      : null

  return (
    <HomeScreen
      teamName={appState.teamName}
      leagueName={LEAGUE_NAME}
      gameNumber={Math.min(gamesPlayed + 1, TOTAL_GAMES)}
      totalGames={TOTAL_GAMES}
      record={ownRecord ? `${ownRecord.wins}–${ownRecord.losses}` : '0–0'}
      inProgress={inProgress}
      action={primaryAction({
        seasonComplete,
        hasGameInProgress: game !== null && !game.isOver,
        midAtBat,
        half: game?.half ?? 'top',
        inning: game?.inning ?? 1
      })}
      standings={standings}
      ownTeamId={HERONS_TEAM_ID}
      upNext={
        nextScheduled && (game === null || game.isOver)
          ? `Game ${nextScheduled.gameIndex + 1} ${nextScheduled.homeTeamId === HERONS_TEAM_ID ? 'vs' : 'at'} ${
              teamById(nextScheduled.homeTeamId === HERONS_TEAM_ID ? nextScheduled.awayTeamId : nextScheduled.homeTeamId).name
            }`
          : null
      }
      onPrimary={beginPlaying}
      onSeason={() => setScreen('season')}
      onSettings={() => setScreen('settings')}
    />
  )
}

// ============================================================================
// Small presentation helpers that need engine data
// ============================================================================

function nextInningOf(game: GameState | null, b: BetweenData): number {
  if (game !== null && !game.isOver) return game.inning
  return b.yours.inning + 1
}

function savedNote(game: GameState | null, b: BetweenData): string {
  if (b.gameEnded) return 'Saved. Game over.'
  if (game === null) return 'Saved.'
  const diff = game.homeScore - game.awayScore
  if (diff === 0) return `Saved. Tied ${game.homeScore}–${game.awayScore}.`
  return `Saved. ${game.homeScore}–${game.awayScore}.`
}

function buildLineScore(game: GameState | null, fallback: HalfInningRecap) {
  const ls = game?.lineScore ?? { home: [], away: [] }
  const homeId = game?.homeTeamId ?? HERONS_TEAM_ID
  const awayId = game?.awayTeamId ?? fallback.battingTeamId
  const ownSide = homeId === HERONS_TEAM_ID ? ('home' as const) : ('away' as const)
  return {
    awayShort: teamById(awayId).shortName,
    homeShort: teamById(homeId).shortName,
    away: ls.away,
    home: ls.home,
    awayRuns: game?.awayScore ?? 0,
    homeRuns: game?.homeScore ?? 0,
    awayHits: game?.hits.away ?? 0,
    homeHits: game?.hits.home ?? 0,
    ownSide,
    currentInningIndex: Math.min((game?.inning ?? 1) - 1, INNINGS_PER_GAME - 1)
  }
}
