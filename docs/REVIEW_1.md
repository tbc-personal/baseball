# Review of the implementation branch (`claude/handoff-prompt-review-levk3g`)

Reviewer pass over the eleven-ticket build. Read `BUILD_NOTES.md` and
`TUNING.md` first, then the commit history, then ran everything, then
went looking for what the notes could not see.

## Verdict

**Not playable yet, for one reason: the tuning is exploitable.** Everything
else is in good shape. One engine bug and two flaws in the spec caused the
tuning to converge on a bad optimum. The fix is small and well-defined;
the retune is the real work.

## What checked out

- `npm run typecheck`, `npm run lint`, `npm test` (269 tests), `npm run
  build` all green at the tip. Commit-per-ticket history holds.
- The engine is pure, seeded, and matches the spec's tables and
  base-running rules line for line. `bases.ts`, `pitch.ts`, and the
  walk-off handling in `inning.ts` are correct. The save code
  (`codec.ts`) is careful: feature-detected compression, checksum before
  inflate, specific error reasons, no raw throws.
- The tuning script reproduces `TUNING.md`'s numbers.
- The home screen renders as mocked (fallback fonts in this sandbox).
- `BUILD_NOTES.md` is honest and specific. The ambiguity resolutions
  (walk-off, OBP, logistic win probability, bunt pop-up) are all the ones
  I would have chosen.

## Findings, most severe first

### 1. Engine bug: the count is not reset when a plate appearance ends

`applyPitch` only resets the count at the end of a half-inning. After a
strikeout at 0-2, the next batter comes up at 0-2. After a walk, the next
batter starts at 3-0. Confirmed with a pitch-by-pitch trace. No test
covers the transition between batters; the one count-reset test checks
the half-inning boundary only.

This is the root cause of the tuning trouble. It is why pitches per plate
appearance measured 1.80 off the spec's tables (a batter inheriting two
strikes has a very short at-bat), and the tuning compensated by pushing
foul rates to 58–76% and the Power-in-zone home-run cell to 27.5%.

### 2. The tuned constants make "always Take" a dominant strategy

Measured head-to-head against the sim policy, 2,000 games each:

| Policy | Walk rate | Runs per game | Runs vs sim |
|---|---|---|---|
| Sim policy (baseline) | 9.1% | 4.9 | 100% |
| Always Take | 69.3% | 39.6 | 563% |
| Take until two strikes, then Contact | 30.8% | 13.5 | 198% |
| Always Contact | 0.0% | 2.8 | 48% |
| Always Power | 0.0% | 4.3 | 73% |

A human who never swings walks two times in three. The league bands
passed only because the sim policy swings at balls. The tuning cut the
base zone rate to 0.34 and zeroed the ball-side count modifiers to
manufacture walks for a policy that structurally could not walk.

With the count bug fixed and the spec's original constants restored, the
same matrix is contained: always Take drops to 17% of the sim, always
Power to 109%, take-until-two-strikes to 61%. So the bug, not the
design, produced the exploit.

### 3. Spec flaw (mine): the §5.4 sim policy could never walk

`TUNING.md` diagnosed this correctly. The policy only took on a `Likely
ball` read, and the count modifiers push the read toward `Likely strike`
as balls accumulate, so ball four needed a take the policy never made.
The right fix is a count-aware policy (take at three balls, look at a
first-pitch coin flip), not wilder pitchers. The spec now has that policy
and marks it non-tunable.

### 4. Spec flaw (mine): the §3.4 swing table put too many balls in play

At 70% in-play on a Contact swing in the zone, plate appearances end in
two pitches even with the bug fixed. Real swings put the ball in play
under half the time. The spec now starts at 0.42 and gives tuning a
range instead of a single number.

### 5. The always-Contact check was the wrong guard

One policy check cannot catch an always-Take exploit. The spec now has a
five-row policy matrix (§7.1) that the tuning script must print and pass,
and a list of what tuning may and may not touch (§7.2).

## Smaller items, all noted in BUILD_NOTES already

- Milestones are computed but the between-innings line is not rendered.
- Standings order at 0-0 looks arbitrary. Alphabetical is fine.
- Not verified on a device, no Lighthouse run, deploy unverified pending
  the repo going public. Expected; none of these block the retune.

## What the follow-up session does

See `HANDOFF_PROMPT_2.md`. Fix the bug with a regression test, apply the
revised §3.2, §3.4, §5.4 and §7 from `GAME_DESIGN.md`, retune, and print
the policy matrix. Then the two small UI items.
