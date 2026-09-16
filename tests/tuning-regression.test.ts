/**
 * Drift guard for the Monte Carlo tuning measurement (GAME_DESIGN.md
 * section 7 and 7.1).
 *
 * `npm run tune` at 10,000 games on two seeds is the authoritative retune:
 * it takes minutes and needs a human reading the printed table to decide
 * whether a change is acceptable. That stays manual on purpose. What this
 * test adds is something that runs in CI on every PR and fails loudly the
 * moment an engine change silently moves the game between retunes --
 * before anyone remembers to run the slow measurement by hand.
 *
 * It re-runs the exact same harness calls scripts/tune.ts makes --
 * `runBatch` for the section 7 band table, `runPolicyMatrix(games,
 * BASE_SEED + 1, ...)` for the section 7.1 matrix -- at a much smaller
 * game count (see the timing note below), and compares every measured
 * value against a baseline recorded once in tests/tuning-baseline.json.
 * It does not re-derive the section 7 bands or the section 7.1 runs
 * bands; those are asserted too (via `rowPasses`/`row.pass`, the harness's
 * own verdicts), but the real content of this file is the tolerance
 * check against the recorded baseline, because a change that nudges every
 * stat a little without leaving its band is exactly the kind of drift the
 * band check alone would miss.
 *
 * Because every game seed here is fully deterministic (see rng.test.ts /
 * tune.test.ts's "reproducible deterministic function of the base seed"),
 * re-running this harness against unchanged engine code reproduces the
 * baseline bit-for-bit -- there is no sampling noise to buffer against.
 * The tolerances below exist for one reason only: so a deliberate,
 * confirmed retune doesn't have to reprint tests/tuning-baseline.json for
 * every single-digit-in-the-fourth-decimal nudge. They are not there to
 * absorb run-to-run randomness, because there isn't any.
 *
 * If this test fails: read the failure message (it names the stat, the
 * baseline, the measured value and the tolerance -- no need to re-run
 * anything to understand what happened), then decide whether the drift
 * was intended. If it was NOT intended, that's a bug -- go fix the engine
 * change that caused it. If it WAS intended and confirmed against a full
 * `npm run tune` (10,000 games, two seeds), regenerate
 * tests/tuning-baseline.json -- see that file's `_comment` field and
 * scripts/README.md for how. Never hand-edit the JSON to make this pass.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildRows, rowPasses, runBatch, runPolicyMatrix } from '../scripts/tune-lib'
import type { Row, MatrixRow } from '../scripts/tune-lib'

// ============================================================================
// Baseline
// ============================================================================

interface BandBaseline {
  label: string
  value: number
  min: number
  max: number
}

interface MatrixBaseline {
  label: string
  ratio: number
  min: number
  max: number
  mirrorBattingAverage: number
  mirrorOnBasePercentage: number
  mirrorSlugging: number
  mirrorOps: number
  mirrorStrikeoutRate: number
  mirrorWalkRate: number
  mirrorPitchesPerPa: number
}

interface Baseline {
  bandGames: number
  bandBaseSeed: number
  matrixGames: number
  matrixBaseSeed: number
  bandTable: BandBaseline[]
  matrix: MatrixBaseline[]
}

// Read with fs rather than a JSON import so the file's `_comment` field
// (an explanatory array of strings, not part of the data) can't confuse a
// consumer expecting every key to be a stat -- it's simply never parsed
// into these typed shapes.
const baselinePath = fileURLToPath(new URL('./tuning-baseline.json', import.meta.url))
const baseline = JSON.parse(readFileSync(baselinePath, 'utf-8')) as Baseline

// ============================================================================
// Game counts and seeds
//
// Mirrors scripts/tune.ts: the band table comes from one runBatch call at
// (games, BASE_SEED); the matrix comes from runPolicyMatrix(games,
// BASE_SEED + 1, ...) -- ten of its own batches (two per guard policy: a
// head-to-head plus a mirror). BASE_SEED here is the task's specified
// 20260401, matching npm run tune's own default.
//
// Timing check (see the task this file was written against): a full run
// at N=3000 for both the band table and the full policy matrix -- 11
// batches of 3000 games total -- measured well under the 90-second budget
// (about 14s for `npx vite-node scripts/tune.ts -- 3000 20260401`, and
// vitest's run below is in the same ballpark). So there was no need to
// drop the matrix to N=1500; both stay at the same 3000/20260401 the
// baseline was recorded at. If a future engine change makes the harness
// meaningfully slower, split BAND_GAMES from MATRIX_GAMES here (matrix
// down to 1500) rather than letting this test grow slow enough that
// nobody runs it locally -- and update tests/tuning-baseline.json and its
// bandGames/matrixGames fields to match.
// ============================================================================

const BASE_SEED = 20260401
const BAND_GAMES = baseline.bandGames
const MATRIX_GAMES = baseline.matrixGames

// ============================================================================
// Tolerances
//
// Deliberately looser than the section 7 / 7.1 bands themselves -- the
// job here is to catch a change that moved the game, not to re-assert
// what those bands already check (that's the rowPasses/row.pass
// assertions below). Values are absolute differences, on the same scale
// as the stat (a rate in [0, 1], a ratio in [0, 1], or a per-game/per-PA
// count).
// ============================================================================

/** Section 7 rate stats: batting average, OBP, strikeout rate, walk rate. */
const BAND_RATE_TOLERANCE = 0.006

/** Section 7 counting stats: runs/HR per team-game, pitches per PA, PA per half-inning. */
const BAND_COUNT_TOLERANCE = 0.1

/** Which section 7 band-table tolerance applies to which row label. */
const BAND_TOLERANCE_BY_LABEL: Record<string, number> = {
  'Runs per team per game': BAND_COUNT_TOLERANCE,
  'Batting average': BAND_RATE_TOLERANCE,
  'On-base percentage': BAND_RATE_TOLERANCE,
  'Strikeout rate (per PA)': BAND_RATE_TOLERANCE,
  'Walk rate (per PA)': BAND_RATE_TOLERANCE,
  'Home runs per team per game': BAND_COUNT_TOLERANCE,
  'Pitches per plate appearance': BAND_COUNT_TOLERANCE,
  'Plate appearances per half-inning': BAND_COUNT_TOLERANCE
}

/** Section 7.1 matrix runs ratio: +/-5 percentage points, i.e. +/-0.05 on the [0,1]-ish ratio. */
const MATRIX_RATIO_TOLERANCE = 0.05

/** Section 7.1 mirror-batch rates (AVG/OBP/SLG/OPS/K%/Walk%). */
const MATRIX_RATE_TOLERANCE = 0.01

/** Section 7.1 mirror-batch pitches per PA -- a count, not a rate, same scale as the band table's. */
const MATRIX_PITCHES_TOLERANCE = 0.1

// ============================================================================
// Assertion helper
//
// Every failure names the stat, the recorded baseline, the freshly
// measured value, the tolerance, and the reminder of what to do about it
// -- so a failing CI run is self-explanatory without anyone re-running the
// harness by hand to figure out what "expected 0.258 received 0.271"
// means.
// ============================================================================

function assertWithinTolerance(statLabel: string, measured: number, baselineValue: number, tolerance: number): void {
  const diff = Math.abs(measured - baselineValue)
  const message =
    `${statLabel}: measured ${measured.toFixed(6)}, baseline ${baselineValue.toFixed(6)} ` +
    `(diff ${diff.toFixed(6)}, tolerance +/-${tolerance}). This means the tuned engine has drifted ` +
    `since tests/tuning-baseline.json was recorded. If that drift was NOT intended, it's a bug -- ` +
    `find and fix the engine change that caused it. If it WAS intended and already confirmed against ` +
    `\`npm run tune\` at 10,000 games on two seeds, regenerate tests/tuning-baseline.json (see its ` +
    `_comment field and scripts/README.md) -- never hand-edit the JSON to make this pass.`
  expect(diff, message).toBeLessThanOrEqual(tolerance)
}

// ============================================================================
// The test
// ============================================================================

describe('tuning regression (drift guard against tests/tuning-baseline.json)', () => {
  // Run the harness once for the whole file -- every `it` below reads
  // from these two results rather than re-running games, so one slow
  // section (matching scripts/tune.ts's approach) buys every assertion.
  const bandResult = runBatch({ games: BAND_GAMES, baseSeed: BASE_SEED, label: '' })
  const rows: Row[] = buildRows(bandResult.tally)
  const matrix: MatrixRow[] = runPolicyMatrix(MATRIX_GAMES, BASE_SEED + 1, false)

  it('measured this run at the same game counts and seeds the baseline was recorded at', () => {
    // A mismatch here means someone edited BAND_GAMES/MATRIX_GAMES/BASE_SEED
    // above without regenerating the baseline (or vice versa) -- every
    // other assertion in this file is meaningless until this passes.
    expect(BAND_GAMES).toBe(baseline.bandGames)
    expect(BASE_SEED).toBe(baseline.bandBaseSeed)
    expect(MATRIX_GAMES).toBe(baseline.matrixGames)
    expect(BASE_SEED + 1).toBe(baseline.matrixBaseSeed)
  })

  describe('section 7 band table', () => {
    it('has a baseline entry and a freshly measured row for the same set of stats', () => {
      const rowLabels = rows.map((r) => r.label).sort()
      const baselineLabels = baseline.bandTable.map((b) => b.label).sort()
      expect(rowLabels).toEqual(baselineLabels)
    })

    it('every band still passes its section 7 target at N=3000', () => {
      for (const row of rows) {
        expect(rowPasses(row), `${row.label}: measured ${row.format(row.value)} is outside its target band [${row.format(row.min)}, ${row.format(row.max)}]`).toBe(true)
      }
    })

    for (const baselineRow of baseline.bandTable) {
      it(`${baselineRow.label} stays within tolerance of the recorded baseline`, () => {
        const row = rows.find((r) => r.label === baselineRow.label)
        expect(row, `no measured row found for baseline label "${baselineRow.label}"`).toBeDefined()
        const tolerance = BAND_TOLERANCE_BY_LABEL[baselineRow.label]
        expect(tolerance, `no tolerance configured for band-table stat "${baselineRow.label}"`).toBeDefined()
        assertWithinTolerance(baselineRow.label, row!.value, baselineRow.value, tolerance)
      })
    }
  })

  describe('section 7.1 policy matrix', () => {
    it('has a baseline entry and a freshly measured row for the same set of policies', () => {
      const matrixLabels = matrix.map((r) => r.label).sort()
      const baselineLabels = baseline.matrix.map((b) => b.label).sort()
      expect(matrixLabels).toEqual(baselineLabels)
    })

    it('every guard policy still passes its section 7.1 runs band at N=3000', () => {
      for (const row of matrix) {
        expect(row.pass, `${row.label}: runs ratio ${(row.ratio * 100).toFixed(1)}% is outside its band [${(row.min * 100).toFixed(0)}%, ${(row.max * 100).toFixed(0)}%]`).toBe(true)
      }
    })

    for (const baselineRow of baseline.matrix) {
      describe(baselineRow.label, () => {
        it('runs ratio stays within tolerance of the recorded baseline', () => {
          const row = matrix.find((r) => r.label === baselineRow.label)
          expect(row, `no measured matrix row found for baseline label "${baselineRow.label}"`).toBeDefined()
          assertWithinTolerance(`${baselineRow.label} runs ratio`, row!.ratio, baselineRow.ratio, MATRIX_RATIO_TOLERANCE)
        })

        it('mirror-batch rates stay within tolerance of the recorded baseline', () => {
          const row = matrix.find((r) => r.label === baselineRow.label)
          expect(row, `no measured matrix row found for baseline label "${baselineRow.label}"`).toBeDefined()
          const rateFields: Array<[string, keyof MatrixRow & keyof MatrixBaseline]> = [
            ['mirror batting average', 'mirrorBattingAverage'],
            ['mirror on-base percentage', 'mirrorOnBasePercentage'],
            ['mirror slugging', 'mirrorSlugging'],
            ['mirror OPS', 'mirrorOps'],
            ['mirror strikeout rate', 'mirrorStrikeoutRate'],
            ['mirror walk rate', 'mirrorWalkRate']
          ]
          for (const [description, key] of rateFields) {
            assertWithinTolerance(`${baselineRow.label} ${description}`, row![key] as number, baselineRow[key] as number, MATRIX_RATE_TOLERANCE)
          }
          assertWithinTolerance(`${baselineRow.label} mirror pitches per PA`, row!.mirrorPitchesPerPa, baselineRow.mirrorPitchesPerPa, MATRIX_PITCHES_TOLERANCE)
        })
      })
    }
  })
})
