/**
 * Monte Carlo tuning script (GAME_DESIGN.md section 7).
 *
 * Plays N games with the section 5.4 opponent policy on both sides,
 * cycling through every pairing of the seven league teams (see
 * tune-lib.ts's matchupFor) so the measurement is league-wide rather than
 * one matchup, and reports every §7 stat against its target band. Also
 * runs the "always Contact" policy check described at the end of §7.
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

import { buildRows, directionNote, fmtRuns, rowPasses, runBatch, runContactCheck } from './tune-lib'

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
  // Always-Contact check
  // --------------------------------------------------------------------
  console.log('\n=== Always-Contact policy check ===\n')

  const contactTally = runContactCheck(GAMES, BASE_SEED + 1, 'always-Contact check')

  const simRate = contactTally.simRuns / contactTally.simTeamGames
  const contactRate = contactTally.contactRuns / contactTally.contactTeamGames
  const ratio = contactRate / simRate
  const withinTenPct = ratio >= 0.9 && ratio <= 1.1

  console.log(`Sim-policy side:      ${fmtRuns(simRate)} runs/team-game (${contactTally.simTeamGames} team-games)`)
  console.log(`Always-Contact side:  ${fmtRuns(contactRate)} runs/team-game (${contactTally.contactTeamGames} team-games)`)
  console.log(`Ratio (Contact / sim): ${(ratio * 100).toFixed(1)}%  ${withinTenPct ? 'PASS' : 'FAIL'}`)
  if (!withinTenPct) {
    console.log(
      ratio > 1.1
        ? '  Always-Contact dominates: Power needs more upside or Contact needs more outs.'
        : '  Always-Contact gets crushed: Contact needs more upside relative to Power.'
    )
  }

  // --------------------------------------------------------------------
  // Overall verdict
  // --------------------------------------------------------------------
  const overallPass = mainPass && withinTenPct
  console.log(`\n=== Overall: ${overallPass ? 'PASS' : 'FAIL'} ===`)
  if (!overallPass) {
    const failing = rows.filter((r) => !rowPasses(r)).map((r) => r.label)
    if (failing.length > 0) console.log(`Out of band: ${failing.join(', ')}`)
    if (!withinTenPct) console.log('Always-Contact check out of band.')
  }
}

main()
