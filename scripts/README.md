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
   - `AVG`, `OBP`, `SLG`, `OPS`, `K%`, `Walk%` and `P/PA` — the policy's
     *own* full rate profile, measured from a **mirror** batch (that
     policy on both sides), not the head-to-head. `runPolicyMatchup` (the
     head-to-head) folds both sides' events into one scratch tally, so it
     cannot report a single policy's rates; the mirror batch is clean,
     single-policy data, and it is where all seven of these columns come
     from. They are how a degenerate optimum shows itself before the run
     ratio is read: a policy that walks two times in three is visible in
     `Walk%`, and a policy that sits comfortably inside its runs band
     while hitting far above the league average -- which is what the
     season screen actually prints -- is visible in `AVG` and the columns
     built from it. `OPS` is `OBP + SLG`, not independently measured.
     There are no pass/fail bands on these seven columns; PASS/FAIL is
     still decided by the runs ratio alone.

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

---

# scripts/probe.ts

Per-batter measurement. `tune.ts` reports league-wide rate stats and each
§7.1 policy's *runs*; neither can see what a single rating or a single
choice is worth to one hitter, and the §7.1 matrix bands runs only. A
policy can sit comfortably inside its runs band while hitting fifty points
above the league average — which is what always-Contact does, and batting
average is what the season screen prints.

This script isolates the plate appearance: one batter, one policy, against
the twelve-pitcher opponent pool, with no bases, outs or lineup. It never
writes constants.

```
npm run probe                        # mode "policies", 40,000 PA per line
npm run probe -- ratings 60000       # mode, PA count
npm run probe -- challenge 40000 777 # mode, PA count, base seed
```

## Modes

- **`policies`** — every §7.1 guard policy, plus the two a human actually
  plays, against the real Herons roster and a 50/50/50 control. Answers
  "which button pays, and in which stat".
- **`ratings`** — one rating swept 20–80 with the other two pinned at 50,
  under three policies. Answers "is this rating worth anything".
- **`challenge`** — `CHALLENGE_WEIGHT` swept against the Contact rating.
  §3.2's challenge term is the only batter-dependent term in `p_zone`, and
  it is strong enough to decide what the Contact rating *means*: whether a
  good contact hitter gets hits or gets pitched around. This mode is the
  measurement for that question, and it is the one place the script
  recomputes `p_zone` itself rather than calling `zoneProbability`, so the
  weight can vary without editing `constants.ts`. If §3.2's formula
  changes, `zoneProbabilityWith` has to change with it.

## The "run val" column

Static linear weights (BB .69, 1B .89, 2B 1.27, 3B 1.62, HR 2.10), not
derived from this engine's base running. It is a fixed yardstick for
ranking one choice against another *within a run*. It is not comparable
with the §7 run-per-game targets and should never be quoted as one.

## Reproducing the numbers in docs/ROADMAP.md

```
npm run probe -- policies 40000
npm run probe -- ratings 60000
npm run probe -- challenge 40000
```

All three at the default base seed `20260401`.

## Mode `experiment`

Candidate rule changes, measured against the committed engine before
anything in `src/engine/` moves. Each variant is a `Variant` record at the
top of the modes section — which rating the §3.2 challenge term hangs on,
at what weight, and whether a check swing is in play — and each is scored
on the three questions Phase A has to answer at once: whether the three
ratings are worth comparable amounts, whether the Contact rating raises
batting average, and what the policies do.

```
npm run probe -- experiment 60000
```

This mode is the one place the probe duplicates engine logic:
`zoneProbabilityFor` re-implements §3.2's `p_zone` so the challenge term's
rating and weight can vary, and `resolveWithVariant` re-implements
`resolvePitch`'s draw order so the check-swing roll can be inserted
between the location roll and the swing. **If either of those engine
functions changes, these two have to change with them**, or the variants
stop being comparable with the baseline. The baseline variant delegates
to `pitch.ts` directly rather than to the copies, so a divergence shows up
as the baseline row disagreeing with `npm run probe ratings`.

Results and the recommended package are in `docs/ROADMAP.md` §0.4, §0.6
and §0.7.

## Mirror batches are capped at regulation

`runPolicyMatrix` passes `maxInnings: INNINGS_PER_GAME` to the mirror
batches. This is not cosmetic — without it one matrix row reported a
number that was wrong by a factor of three.

A mirror batch plays the guard policy on **both** sides. For always-Take
that is a game in which nobody ever puts a ball in play: runs can only
score on bases-loaded walks, so the games are scoreless and run to extra
innings — measured, an average of 76.5 innings against a normal game's
9.1. The matchups that drag on longest are exactly the ones where the
pitcher throws the most strikes and walks the fewest, so the batch
over-samples them and every rate drawn from it is biased. Uncapped,
always-Take measured a 10% walk rate against a true per-PA rate near 28%.

Only per-PA and per-AB rates are read from a mirror batch, so truncating a
tied game costs nothing. **Nothing that reads runs per game or a final
score may be measured from a capped batch** — the runs verdict comes from
the head-to-head batch, which is uncapped and does not degenerate because
the sim side scores. `docs/TUNING.md` has the full write-up.

## The visible-stats diagnostic

`npm run tune` prints an OPS comparison between the intended thoughtful
policy and the best one-button policy. **It is reported, not banded, and
nothing gates on it.** OPS weights a point of on-base and a point of
slugging equally; this engine's run value weights on-base roughly twice as
heavily, so an always-Power policy lands level with the thoughtful play on
OPS while scoring seven points fewer runs. Read the margin next to the
runs column, never on its own. `docs/ROADMAP.md` §0.8 explains why this is
a design question rather than a tuning one.
