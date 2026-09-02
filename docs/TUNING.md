# Tuning (round 2, after REVIEW_1.md)

Measured with `npm run tune`, the §5.4 opponent policy on both sides, all
seven teams cycled through as matchups. Base seed `20260401`, 10,000 games
for the band table and 10,000 head-to-head plus 10,000 mirror games for
each row of the §7.1 policy matrix.

## Result in one line

**All five §7.1 matrix rows pass on the default seed, but two of them pass
by less than a percentage point and tip over on a second seed. Three of the
eight §7 bands pass and five do not.**

Read that first sentence strictly: this is the closest result found, not a
clean pass. Always Contact measures 109.4% and Always Power 109.9% against
a 110% ceiling on seed 20260401, and 110.9% and 111.0% on seed 777. The
matrix is satisfied at the spec's own measurement size and seed, and is a
coin flip at the boundary otherwise. The numbers are in **Seed check**.

The strikeout band is a different kind of failure: it is not merely missed,
it is unreachable, and the derivation below shows no permitted constant can
bring it into range. The other four missed bands — runs, average, on-base
and home runs — are low *because* of the change that makes the matrix rows
land where they do. That trade is measured in the conflict section.

Per `HANDOFF_PROMPT_2.md` — "pick the closest result that keeps every
matrix row passing. The matrix is the one that protects the player from a
boring game" — this is the result committed.

## Final printed output

```
Short Season tuning run: 10000 games, base seed 20260401

=== Section 7 tuning targets (sim policy on both sides) ===

Stat                                 Measured     Target band  Result
-----------------------------------------------------------------------
Runs per team per game                   3.85       4.20–4.90  FAIL (too low)
Batting average                          .239       .245–.265  FAIL (too low)
On-base percentage                       .301       .315–.335  FAIL (too low)
Strikeout rate (per PA)                 31.9%     20.0%–25.0%  FAIL (too high)
Walk rate (per PA)                       8.1%      8.0%–10.0%  PASS
Home runs per team per game              1.00       1.00–1.30  FAIL (too low)
Pitches per plate appearance             3.74       3.70–4.00  PASS
Plate appearances per half-inning        4.22       4.10–4.50  PASS

(from 10000 games / 20000 team-games, 766023 plate appearances, 181469 half-innings)

=== Section 7.1 policy matrix (each policy vs the sim policy) ===

Policy                                                         Runs vs sim          Band    Walk%   P/PA  Result
------------------------------------------------------------------------------------------------------------------
Always Take                                                          59.1%       <=60.0%     6.3%   4.38  PASS
Always Contact                                                      109.4%  60.0%-110.0%     0.0%   2.24  PASS
Always Power                                                        109.9%      <=110.0%     0.0%   3.04  PASS
Take until two strikes, then Contact                                 94.1%      <=110.0%    10.1%   4.96  PASS
Take unless Likely strike (Power); Contact with two strikes         114.4%  95.0%-130.0%     5.2%   4.32  PASS

Walk% and P/PA are from a mirror batch (the policy on both sides), not the head-to-head:
they are how a degenerate optimum shows itself -- a policy that walks most of the time.

(each row: 10000 head-to-head games, the guard policy alternating home and away per game,
 plus 10000 mirror games of the policy against itself for the walk / pitches-per-PA columns)

=== Overall: FAIL ===
Bands out of range: Runs per team per game, Batting average, On-base percentage, Strikeout rate (per PA), Home runs per team per game
```

Three matrix rows sit close to their limits: Always Take at 59.1% against a
60% ceiling, Always Contact at 109.4% and Always Power at 109.9% against
110%. Always Take holds on a second seed; the other two do not. See
**Seed check**.

## Where it started

The §3/§4/§5.4 values as revised by the review, with the count-reset bug
fixed (i.e. the state at the end of R2, before any tuning). Measured over
400 games:

```
Runs per team per game                   3.21       4.20–4.90  FAIL (too low)
Batting average                          .193       .245–.265  FAIL (too low)
On-base percentage                       .285       .315–.335  FAIL (too low)
Strikeout rate (per PA)                 40.7%     20.0%–25.0%  FAIL (too high)
Walk rate (per PA)                      11.4%      8.0%–10.0%  FAIL (too high)
Home runs per team per game              0.80       1.00–1.30  FAIL (too low)
Pitches per plate appearance             4.06       3.70–4.00  FAIL (too high)
Plate appearances per half-inning        4.14       4.10–4.50  PASS

Always Take                             142.0%       <=60.0%  FAIL
Always Contact                           89.7%  60.0%-110.0%  PASS
Always Power                            131.9%      <=110.0%  FAIL
Take until two strikes, then Contact     81.4%      <=110.0%  PASS
Take unless Likely strike (Power)         96.8%  95.0%-130.0%  PASS
```

Note this is a different starting point from what `REVIEW_1.md` predicted.
The review expected the restored constants to contain always-Take at 17% of
the sim. Measured, it is 142%: the sim policy at the spec's own starting
values strikes out 41% of the time, and a batter who simply never swings
outscores that. The exploit was not fixed by restoring the constants; it
was fixed by the retune below.

## Before and after

Every change is a value in `src/engine/constants.ts`. No table gained or
lost a row, no mechanic was added, and no rule changed. "R2 (spec)" is the
revised spec's own starting value; "R4 (final)" is what is committed.

### `BASE_ZONE_PROBABILITY` — §7.2 range 0.42–0.56

| R1 (previous round) | R2 (spec) | R4 (final) |
|---|---|---|
| 0.34 | 0.48 | **0.518** |

### `PITCH_OUTCOMES` (in play / foul / whiff) — §3.4 ranges

| Cell | R2 (spec) | R4 (final) |
|---|---|---|
| Contact, zone | 0.42 / 0.45 / 0.13 | **0.50 / 0.40 / 0.10** |
| Contact, ball | 0.20 / 0.45 / 0.35 | **0.30 / 0.50 / 0.20** |
| Power, zone | 0.35 / 0.40 / 0.25 | **0.30 / 0.50 / 0.20** |
| Power, ball | 0.12 / 0.38 / 0.50 | **0.10 / 0.50 / 0.40** |

Every cell is at or inside its §3.4 bound: in play 0.30–0.50 on zone
pitches and 0.10–0.30 on balls, foul 0.30–0.50, zone whiff never below
0.10. Contact-zone in play, Contact-ball in play and both zone whiffs sit
exactly on their limits; there is no headroom left in this table.

### `BATTED_BALL_OUTCOMES` (out / 1B / 2B / 3B / HR) — §3.5 ranges

| Cell | R2 (spec) | R4 (final) |
|---|---|---|
| Contact, zone | 0.62 / 0.27 / 0.07 / 0.01 / 0.03 | **0.5607 / 0.3121 / 0.0809 / 0.0116 / 0.0347** |
| Contact, ball | 0.75 / 0.20 / 0.04 / 0.005 / 0.005 | **0.825 / 0.14 / 0.028 / 0.0035 / 0.0035** |
| Power, zone | 0.58 / 0.15 / 0.12 / 0.01 / 0.14 | **0.5422 / 0.1635 / 0.1308 / 0.0109 / 0.1526** |
| Power, ball | 0.74 / 0.13 / 0.07 / 0.01 / 0.05 | **0.818 / 0.091 / 0.049 / 0.007 / 0.035** |

Every row sums to exactly 1.0, every cell is within 30% of its §3.5 value,
and no home-run cell exceeds 1.3× its §3.5 value (the Contact-zone home-run
cell is at exactly 1.3×, 0.0347 against a 0.039 ceiling; Power-zone is at
1.09×).

The two **ball** rows are moved to their minimum-offense end — every
non-out cell at its −30% floor. That is the single change that made the
matrix pass, and the reasoning is in the conflict section below.

### Base running — §7.2 allows ±0.15 from the §4 values

| Constant | §4 value | R4 (final) |
|---|---|---|
| `BASE_RUNNING_R2_SCORES_ON_SINGLE` | 0.65 | **0.78** |
| `BASE_RUNNING_R1_THIRD_ON_SINGLE` | 0.30 | **0.40** |
| `BASE_RUNNING_R1_SCORES_ON_DOUBLE` | 0.45 | **0.58** |
| `BASE_RUNNING_DOUBLE_PLAY` | 0.12 | 0.12 (unchanged) |
| `BASE_RUNNING_SACRIFICE_FLY` | 0.25 | 0.25 (unchanged) |

Base running is the one lever that adds runs without moving batting
average, so it is used to claw back some of the offense the ball rows cost.
All three moved cells are inside ±0.15.

### Not touched

`COUNT_MOD`, the read thresholds, the rating formula and the §5.4 policy
are all at their spec values, as §7.2 requires.

## The strikeout band cannot be reached. Here is the derivation.

Measured composition of strikeouts (300 games, sim policy both sides, at
the R2 starting values):

```
take rate 55.0% of all pitches
K: called 71.6%  whiff 28.4%  foul-bunt 0.0%
strike three by count: 0-2 34%   1-2 31%   2-2 21%   3-2 13%
```

Roughly seven strikeouts in ten are **called** strikes, and two thirds of
them arrive at 0-2 or 1-2. That is not a whiff-rate problem, so the §3.4
table cannot fix it — and the zone whiff cells are already pinned to their
0.10 floor.

The cause is an interaction between three things §7.2 marks non-tunable.
§5.4 says: with two strikes, take if the read is `Likely ball`. §3.3 says
the true read is `Likely ball` when `p_zone ≤ 0.45`. §3.2 says
`p_zone = BASE_ZONE + count_mod`, with `count_mod` −0.20 at 0-2 and −0.12
at 1-2. Tabulating the true read by count across the **entire** legal
`BASE_ZONE` range:

| Count | BASE_ZONE 0.42 | 0.48 | 0.51 | 0.56 |
|---|---|---|---|---|
| 0-0 | Likely ball | Coin flip | Coin flip | Coin flip |
| 0-1 | Likely ball | Likely ball | Coin flip | Coin flip |
| **0-2** | **Likely ball** | **Likely ball** | **Likely ball** | **Likely ball** |
| **1-2** | **Likely ball** | **Likely ball** | **Likely ball** | **Likely ball** |
| 2-2 | Likely ball | Likely ball | Coin flip | Coin flip |
| 3-2 | Coin flip | Coin flip | Coin flip | Coin flip |

At 0-2 and 1-2 the read is `Likely ball` for every `BASE_ZONE` §7.2 allows,
so the sim policy **always** takes there, and takes a called strike three
with probability `p_zone`. Reaching `Coin flip` at 0-2 would need
`BASE_ZONE > 0.65`, well outside the 0.42–0.56 range.

The strikeout rate therefore has a floor that no permitted constant can
lower. Measured across the whole search: **26.8% at best**, and that only
with the Power-zone in-play cell at its 0.50 maximum, which sends always-
Power to **206%** of the sim and destroys the matrix. Inside the region
where the matrix passes, the floor is **31–32%**. The committed value is
31.9%.

Fixing this needs a rule change, and each option is above this ticket's
authority:

1. **Change §5.4** so the policy protects the plate with two strikes
   (swing at anything not clearly a ball) rather than taking on a
   `Likely ball` read. This is the smallest change and the most realistic
   baseball; it is also exactly the branch the review just rewrote.
2. **Change the §3.3 `Likely ball` threshold** (0.45) or the 0-2/1-2
   `count_mod` values, so a two-strike count is not automatically read as
   a ball. §7.2 marks both non-tunable.
3. **Widen the §7 strikeout band** to something like 28–33%, and accept
   that this game's league strikes out more than a real one.

## The conflict between the bands and the matrix

Beyond the strikeout floor, runs, average, OBP and home runs all come in
low, and they are low **because** of what the matrix costs.

The binding fact is that `BASE_ZONE` moves always-Take in the opposite
direction from always-Contact and always-Power. Raising it suppresses
walks, which contains always-Take, but it also puts more hittable pitches
in the zone, which lifts the two swing-everything policies. Measured at
1,500 games with everything else fixed:

| BASE_ZONE | Always Take | Always Contact | Always Power |
|---|---|---|---|
| 0.505 | 66% (fail) | 112% (fail) | 102% |
| 0.513 | 61% (fail) | 111% (fail) | 111% (fail) |
| 0.517 | 59% | 115% (fail) | 113% (fail) |
| 0.520 | 53% | 118% (fail) | 109% |

There is no `BASE_ZONE` at which all three clear on the swing table alone.
What breaks the deadlock is the pair of **ball** rows in §3.5: the sim
policy takes most pitches out of the zone, and always-Contact and
always-Power swing at all of them, so pushing those two rows to their
minimum-offense end taxes the single-button policies far more than it taxes
the sim. That is what buys the matrix — and it is also what costs the
league roughly 0.25 runs a game, six points of batting average and nine
points of OBP, because the sim swings at some balls too.

The alternative was measured. Leaving the two ball rows at their §3.5
values and re-tuning around them gives a visibly better league and a
visibly worse matrix (3,000 games):

| | Committed (min-offense ball rows) | Alternative (§3.5 ball rows) |
|---|---|---|
| Runs per team per game | 3.85 | **4.09** |
| Batting average | .239 | **.250** |
| On-base percentage | .301 | **.310** |
| Home runs per team per game | 1.00 | 0.99 |
| Strikeout rate | 31.9% | 31.8% |
| Always Take | **59.1% PASS** | 59% PASS |
| Always Contact | **109.4% PASS** | **115% FAIL** |
| Always Power | **109.9% PASS** | 107% PASS |

The alternative's always-Contact row at 115% is the "one button dominates"
failure §7.1 exists to catch, so it was not taken. If the owner would
rather have the livelier league and accept a mildly dominant Contact
button, the change is the two ball rows of `BATTED_BALL_OUTCOMES` back to
their §3.5 values plus `BASE_ZONE_PROBABILITY` 0.515, `bb_cz` at
`[0.5539, 0.3170, 0.0822, 0.0117, 0.0352]` and `bb_pz` at
`[0.5372, 0.1653, 0.1322, 0.0110, 0.1543]`.

## Seed check

The same constants, `npm run tune -- 10000 777`:

```
Runs per team per game                   3.86       4.20–4.90  FAIL (too low)
Batting average                          .239       .245–.265  FAIL (too low)
On-base percentage                       .301       .315–.335  FAIL (too low)
Strikeout rate (per PA)                 31.9%     20.0%–25.0%  FAIL (too high)
Walk rate (per PA)                       8.1%      8.0%–10.0%  PASS
Home runs per team per game              0.99       1.00–1.30  FAIL (too low)
Pitches per plate appearance             3.74       3.70–4.00  PASS
Plate appearances per half-inning        4.22       4.10–4.50  PASS

Always Take                                                          59.3%       <=60.0%  PASS
Always Contact                                                      110.9%  60.0%-110.0%  FAIL
Always Power                                                        111.0%      <=110.0%  FAIL
Take until two strikes, then Contact                                 93.5%      <=110.0%  PASS
Take unless Likely strike (Power); Contact with two strikes         113.1%  95.0%-130.0%  PASS
```

The bands are stable to a hundredth across the two seeds. The matrix is
not: Always Contact moves 109.4% → 110.9% and Always Power 109.9% →
111.0%, so both cross a ceiling they cleared on the first seed. Always
Take, the row that looked tightest, is the steady one (59.1% → 59.3%).

**So the honest verdict is that the matrix is not reliably satisfied.** It
passes at the spec's stated measurement (10,000 games, and the base seed
the previous round used) and fails two rows on a re-seed. Everything in the
conflict section above says why the margin cannot be widened: the levers
that pull always-Contact and always-Power down push always-Take up, and
they meet with all three within a point or two of their limits.

This is the closest configuration found over roughly 250 measured points
covering the whole §7.2 space, and it is being committed as such rather
than reported as a clean pass.

## History: the zero-walk problem from round 1

Kept from the previous round's notes because it explains why the constants
looked the way they did before this round; the rest of that document is
superseded.

Round 1 measured a walk rate of **exactly zero across 739,000 plate
appearances**. The cause was an interaction between §3.2 and the *old*
§5.4 policy rather than a bug in either: the old policy only took when the
read was `Likely ball`, and §3.2's count modifiers raise `p_zone` as balls
accumulate, which pushes the read toward `Likely strike`. Measured take
rate by count at the time:

| Count | 0-0 | 1-0 | 2-0 | 3-0 |
|---|---|---|---|---|
| Take rate | 19.7% | 3.5% | 1.2% | **0.0%** |

Reaching ball four needed four consecutive takes, each less likely than the
last, and at 3-0 the policy never took. Round 1 worked around it by zeroing
the ball-side count modifiers, which flattened exactly the thing that makes
a 3-0 count feel different from an 0-2 count. The review's fix — a
count-aware §5.4 policy that takes at three balls — is the right one, and
the count modifiers are back at their §3.2 values. The walk rate is now
8.1% with the modifiers intact.

## Reproducing

```
npm run tune                # 10,000 games, base seed 20260401
npm run tune -- 2000        # faster, noisier
npm run tune -- 10000 777   # the second seed used for the check above
```

Matrix rows move by a percentage point or two between seeds at 10,000
games and by considerably more below about 3,000, which is why the two
tight rows are cross-checked rather than read off a single run.
