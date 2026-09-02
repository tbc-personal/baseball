# scripts/tune.ts

The Phase 1 Monte Carlo tuning script from `GAME_DESIGN.md` section 7. It
plays games with the §5.4 opponent policy on both sides and reports the
league-wide numbers section 7 sets target bands for, plus the §7.1 policy
matrix that guards against a single button being a dominant strategy.

This is a **measurement tool, not a tuning tool**: it never touches
`src/engine/constants.ts`. Read its printed table, then hand-tune the
constants and re-run.

## Running it

```
npm run tune                 # 10,000 games, fixed default seed
npm run tune -- 2000         # override the game count
npm run tune -- 2000 12345   # also override the base seed
```

10,000 games (the default) takes well under a minute. Progress lines are
written to stderr every ~5% of the run so a long run doesn't look hung.

The script always exits 0 -- it is a report, not a test. The PASS/FAIL
verdict is in the output, not the exit code.

## What it does

- Cycles through every unique pairing of the seven league teams (21
  pairings; see `matchupFor` in `scripts/tune-lib.ts`), flipping home/away
  each time the cycle of pairings repeats, so the measurement isn't one
  matchup played over and over.
- Plays each game pitch by pitch with `opponentChoice` (§5.4) on both
  sides, tallying every plate appearance and pitch as it goes. The season
  stat accumulator (`src/engine/season.ts`) only tracks the Herons, so
  this script keeps its own league-wide tally instead of reusing it.
- Runs the §7.1 policy matrix: for each of the five guard policies, a
  head-to-head batch against the sim policy (the guard policy alternating
  home and away on every game, so the comparison isn't confounded with the
  home/away slot), plus a mirror batch of that policy against itself.
- Uses a fixed default base seed (`20260401`) so a default run is
  reproducible; a run seeds every individual game deterministically from
  that base seed, so the whole measurement is reproducible end to end.

## Reading the output

Two tables:

1. **Section 7 targets**, one row per stat with the measured value, the
   target band from §7, and PASS/FAIL. A FAIL line says whether the
   measurement came in too high or too low.
2. **Section 7.1 policy matrix**, one row per guard policy:
   - `Runs vs sim` — that policy's runs per team-game as a percentage of
     the sim policy's, from the head-to-head batch.
   - `Band` — the §7.1 requirement for that row.
   - `Walk%` and `P/PA` — the policy's *own* walk rate and pitches per
     plate appearance, measured from the **mirror** batch (the policy on
     both sides), not the head-to-head. These are how a degenerate optimum
     shows itself: a policy that walks two times in three is visible in
     these columns before its run ratio is read.

An **Overall** verdict line follows, plus a summary of anything out of
band. **Overall PASS requires every band and every matrix row to pass.**

## Notes on measurement choices

- **"Pitches per plate appearance"** counts every call into pitch
  resolution -- balls, called strikes, fouls, whiffs, bunt fouls, and the
  pitch that ends the PA in play -- i.e. exactly the pitches a batter sees.
- **Half-innings** are only counted when actually played (including a
  bottom-of-the-9th-or-later half that ends short on a walk-off, which did
  happen even though it wasn't three outs).
- **Runs/HR "per team per game"** divide by team-games (2 × games played),
  matching "per team" in the §7 table.
- Batting average and OBP use the league-wide totals across all plate
  appearances in the run, not an average of per-game or per-team rates.

## tests/tune.test.ts

A separate, fast test (a few dozen games) that checks the harness itself
is internally consistent -- PA/AB/hit/walk/strikeout counts stay in the
right order, every tallied half-inning had a plate appearance, the tally
is a reproducible function of its seed, and so on. It does not assert
anything about where the numbers land relative to the §7 bands; that's
what running the script itself is for.

## scripts/tune-lib.ts

The reusable harness (`playGame`, `runBatch`, `runPolicyMatchup`,
`runPolicyMatrix`, the five `MATRIX_POLICIES`, the §7 row builder) that both `scripts/tune.ts` and `tests/tune.test.ts` import.
Split out purely so the test can run a handful of games without pulling in
the CLI's default 10,000-game run.
