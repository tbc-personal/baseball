/**
 * Monte Carlo tuning script (GAME_DESIGN.md section 7).
 *
 * Plays N games with the section 5.4 opponent policy on both sides,
 * cycling through every pairing of the seven league teams (see
 * tune-lib.ts's matchupFor) so the measurement is league-wide rather than
 * one matchup, and reports every §7 stat against its target band. Then
 * runs the §7.1 policy matrix: each of the five guard policies head-to-head
 * against the sim policy, plus each policy's own walk rate and pitches per
 * plate appearance from a mirror batch (that policy on both sides).
 *
 * Run with `npm run tune` (default 10,000 games) or `npm run tune -- 2000`
 * to override the game count, and `npm run tune -- 2000 12345` to also
 * override the base seed. See scripts/README.md for how to read the
 * output.
 *
 * This is a measurement tool, not a test: it always exits 0. The
 * PASS/FAIL verdict is in the printed table. The reusable harness this
 * script drives lives in tune-lib.ts, so tests/tune.test.ts can exercise
 * it at a small game count without running the CLI's default 10,000-game
 * measurement.
 */

import { buildRows, directionNote, fmtPct, fmtRuns, rowPasses, runBatch, runPolicyMatrix } from './tune-lib'
import type { MatrixRow } from './tune-lib'

// ============================================================================
// CLI args
// ============================================================================

const DEFAULT_GAMES = 10_000
const DEFAULT_BASE_SEED = 20260401 // arbitrary, fixed so a run is reproducible

const argGames = Number.parseInt(process.argv[2] ?? '', 10)
const argSeed = Number.parseInt(process.argv[3] ?? '', 10)
const GAMES = Number.isFinite(argGames) && argGames > 0 ? argGames : DEFAULT_GAMES
const BASE_SEED = Number.isFinite(argSeed) ? argSeed : DEFAULT_BASE_SEED

// ============================================================================
// Printing
// ============================================================================

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length)
}

function padLeft(s: string, width: number): string {
  return s.length >= width ? s : ' '.repeat(width - s.length) + s
}

function printTable(rows: ReturnType<typeof buildRows>): boolean {
  const labelWidth = Math.max(...rows.map((r) => r.label.length)) + 2
  console.log(pad('Stat', labelWidth) + padLeft('Measured', 10) + padLeft('Target band', 16) + '  Result')
  console.log('-'.repeat(labelWidth + 10 + 16 + 10))
  let allPass = true
  for (const row of rows) {
    const pass = rowPasses(row)
    if (!pass) allPass = false
    const band = `${row.format(row.min)}–${row.format(row.max)}`
    const mark = pass ? 'PASS' : 'FAIL'
    console.log(pad(row.label, labelWidth) + padLeft(row.format(row.value), 10) + padLeft(band, 16) + `  ${mark}${directionNote(row)}`)
  }
  return allPass
}

/** "<= 60%" for a row whose floor is 0, "60-110%" otherwise. */
function bandLabel(row: MatrixRow): string {
  return row.min <= 0 ? `<=${fmtPct(row.max)}` : `${fmtPct(row.min)}-${fmtPct(row.max)}`
}

function printMatrix(matrix: MatrixRow[]): boolean {
  const labelWidth = Math.max(...matrix.map((r) => r.label.length)) + 2
  console.log(
    pad('Policy', labelWidth) +
      padLeft('Runs vs sim', 13) +
      padLeft('Band', 14) +
      padLeft('Walk%', 9) +
      padLeft('P/PA', 7) +
      '  Result'
  )
  console.log('-'.repeat(labelWidth + 13 + 14 + 9 + 7 + 10))
  let allPass = true
  for (const row of matrix) {
    if (!row.pass) allPass = false
    console.log(
      pad(row.label, labelWidth) +
        padLeft(fmtPct(row.ratio), 13) +
        padLeft(bandLabel(row), 14) +
        padLeft(fmtPct(row.mirrorWalkRate), 9) +
        padLeft(fmtRuns(row.mirrorPitchesPerPa), 7) +
        `  ${row.pass ? 'PASS' : 'FAIL'}`
    )
  }
  console.log('')
  console.log('Walk% and P/PA are from a mirror batch (the policy on both sides), not the head-to-head:')
  console.log('they are how a degenerate optimum shows itself -- a policy that walks most of the time.')
  return allPass
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  console.log(`Short Season tuning run: ${GAMES} games, base seed ${BASE_SEED}\n`)

  const mainResult = runBatch({ games: GAMES, baseSeed: BASE_SEED, label: 'sim vs sim' })

  console.log('\n=== Section 7 tuning targets (sim policy on both sides) ===\n')
  const rows = buildRows(mainResult.tally)
  const mainPass = printTable(rows)

  console.log(
    `\n(from ${mainResult.tally.games} games / ${mainResult.tally.teamGames} team-games, ` +
      `${mainResult.tally.pa} plate appearances, ${mainResult.tally.halfInnings} half-innings)`
  )

  // --------------------------------------------------------------------
  // Section 7.1 policy matrix
  // --------------------------------------------------------------------
  console.log('\n=== Section 7.1 policy matrix (each policy vs the sim policy) ===\n')

  const matrix = runPolicyMatrix(GAMES, BASE_SEED + 1, true)
  const matrixPass = printMatrix(matrix)

  console.log(
    `\n(each row: ${GAMES} head-to-head games, the guard policy alternating home and away per game,\n` +
      ` plus ${GAMES} mirror games of the policy against itself for the walk / pitches-per-PA columns)`
  )

  // --------------------------------------------------------------------
  // Overall verdict
  // --------------------------------------------------------------------
  const overallPass = mainPass && matrixPass
  console.log(`\n=== Overall: ${overallPass ? 'PASS' : 'FAIL'} ===`)
  if (!overallPass) {
    const failing = rows.filter((r) => !rowPasses(r)).map((r) => r.label)
    if (failing.length > 0) console.log(`Bands out of range: ${failing.join(', ')}`)
    const failingRows = matrix.filter((r) => !r.pass).map((r) => r.label)
    if (failingRows.length > 0) console.log(`Matrix rows out of range: ${failingRows.join(', ')}`)
  }
}

main()
