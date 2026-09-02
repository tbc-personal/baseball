# Tuning (round 2, after REVIEW_1.md)

Measured with `npm run tune`, the §5.4 opponent policy on both sides, all
seven teams cycled through as matchups. 10,000 games for the band table,
and 10,000 head-to-head plus 10,000 mirror games for each row of the §7.1
policy matrix. Base seed `20260401`, cross-checked against seed `777`.

## Result

**All five §7.1 matrix rows pass, with margin, on both seeds. Seven of the
eight §7 bands pass. The strikeout band does not: 27.9% against a 20–25%
target.**

Getting here needed a rule change (see **The two-strike rule change**
below), made on the owner's instruction. The result reachable *without*
that change is recorded too, because it was the R4 commit and it is much
worse: three bands, and a matrix that passed only on one seed.

## Final printed output

```
Short Season tuning run: 10000 games, base seed 20260401

=== Section 7 tuning targets (sim policy on both sides) ===

Stat                                 Measured     Target band  Result
-----------------------------------------------------------------------
Runs per team per game                   4.42       4.20–4.90  PASS
Batting average                          .255       .245–.265  PASS
On-base percentage                       .321       .315–.335  PASS
Strikeout rate (per PA)                 27.9%     20.0%–25.0%  FAIL (too high)
Walk rate (per PA)                       8.8%      8.0%–10.0%  PASS
Home runs per team per game              1.03       1.00–1.30  PASS
Pitches per plate appearance             3.72       3.70–4.00  PASS
Plate appearances per half-inning        4.34       4.10–4.50  PASS

(from 10000 games / 20000 team-games, 784492 plate appearances, 180873 half-innings)

=== Section 7.1 policy matrix (each policy vs the sim policy) ===

Policy                                                         Runs vs sim          Band    Walk%   P/PA  Result
------------------------------------------------------------------------------------------------------------------
Always Take                                                          57.6%       <=60.0%    10.1%   4.44  PASS
Always Contact                                                       97.7%  60.0%-110.0%     0.0%   2.24  PASS
Always Power                                                        103.1%      <=110.0%     0.0%   3.05  PASS
Take until two strikes, then Contact                                 95.4%      <=110.0%    11.7%   4.97  PASS
Take unless Likely strike (Power); Contact with two strikes         110.6%  95.0%-130.0%     6.5%   4.35  PASS

Walk% and P/PA are from a mirror batch (the policy on both sides), not the head-to-head:
they are how a degenerate optimum shows itself -- a policy that walks most of the time.

(each row: 10000 head-to-head games, the guard policy alternating home and away per game,
 plus 10000 mirror games of the policy against itself for the walk / pitches-per-PA columns)

=== Overall: FAIL ===
Bands out of range: Strikeout rate (per PA)
```

### Seed check

`npm run tune -- 10000 777`, same constants:

```
Runs per team per game                   4.41       4.20–4.90  PASS
Batting average                          .255       .245–.265  PASS
On-base percentage                       .321       .315–.335  PASS
Strikeout rate (per PA)                 27.9%     20.0%–25.0%  FAIL (too high)
Walk rate (per PA)                       8.7%      8.0%–10.0%  PASS
Home runs per team per game              1.04       1.00–1.30  PASS
Pitches per plate appearance             3.72       3.70–4.00  PASS
Plate appearances per half-inning        4.34       4.10–4.50  PASS

Always Take                                                          57.4%       <=60.0%  PASS
Always Contact                                                      101.2%  60.0%-110.0%  PASS
Always Power                                                        103.1%      <=110.0%  PASS
Take until two strikes, then Contact                                 95.0%      <=110.0%  PASS
Take unless Likely strike (Power); Contact with two strikes         109.1%  95.0%-130.0%  PASS
```

Every band lands within a hundredth of the first seed and every matrix row
keeps its verdict. The closest row to its limit is always Take at 57.6% /
57.4% against a 60% ceiling; always Power, the row that broke the R4
attempt, sits at 103.1% on both seeds against a 110% ceiling.

**A note on sample size, learned the hard way.** Matrix rows move by five
or six points between 1,000-game runs. Two configurations were adopted
during this round on the strength of a 600–1,000-game reading and then
failed at 10,000. Nothing below about 4,000 games should be trusted for a
matrix verdict, and a final candidate should be measured at 10,000 on two
seeds. The band table is far steadier — it is stable to a hundredth by
about 3,000 games.

## The two-strike rule change

The retune could not reach this result under the spec as the review left
it. §7.2 marks the count modifiers non-tunable, and they were the problem.

Measured strikeout composition before the change (400 games):

```
take rate 55.0% of all pitches
K: called 71.6%  whiff 28.4%
strike three by count: 0-2 34%   1-2 31%   2-2 21%   3-2 13%
```

Seven strikeouts in ten were **called** strikes and two thirds of those
arrived at 0-2 or 1-2. That is not a whiff-rate problem, so §3.4 could not
fix it, and the zone whiff cells were already pinned to their 0.10 floor.

The cause was an interaction between three things §7.2 marked
non-tunable. §5.4 takes with two strikes on a `Likely ball` read; §3.3
calls the read `Likely ball` when `p_zone ≤ 0.45`; §3.2 set `count_mod` to
−0.20 at 0-2 and −0.12 at 1-2. Tabulating the true read across the **whole**
legal `BASE_ZONE` range:

| Count | BASE_ZONE 0.42 | 0.48 | 0.51 | 0.56 |
|---|---|---|---|---|
| **0-2** | **Likely ball** | **Likely ball** | **Likely ball** | **Likely ball** |
| **1-2** | **Likely ball** | **Likely ball** | **Likely ball** | **Likely ball** |
| 2-2 | Likely ball | Likely ball | Coin flip | Coin flip |

At 0-2 and 1-2 the read was `Likely ball` for every `BASE_ZONE` the spec
allowed, so the policy always took there and took a called strike three
with probability `p_zone`. Reaching `Coin flip` at 0-2 needed
`BASE_ZONE > 0.65`, far outside 0.42–0.56. The strikeout band was
unreachable by construction.

The owner's decision was that this was wrong as baseball, not just
inconvenient: a pitcher ahead in the count expands the zone but does not
stop competing in it, and he should be willing to challenge a hitter he is
not afraid of. Two changes went into §3.2 (commit R6):

- **Milder two-strike modifiers**: 0-2 −0.20 → **−0.08**, 1-2 −0.12 →
  **−0.05**, 2-2 −0.05 → **−0.02**. Real pitchers throw roughly ten points
  fewer strikes at 0-2 than at 0-0, not twenty-five. The ball-side
  modifiers and 0-1 are untouched, so 3-0 still feels different from 0-2.
- **A challenge term**: `challenge_mod = -adj(Contact) * CHALLENGE_WEIGHT`,
  weight 0.40 at first and **0.50** as tuned, range 0.20–0.60. This is the
  only term in `p_zone` that depends on the batter.

The read now depends on who is batting. At the committed `BASE_ZONE`:

| Count | Contact 20 | Contact 50 | Contact 80 |
|---|---|---|---|
| 0-0 | Likely strike | Coin flip | Likely ball |
| 0-2 | Coin flip | Likely ball | Likely ball |
| 1-2 | Coin flip | Coin flip | Likely ball |

A weak-contact hitter gets challenged with two strikes and has to protect
the plate; a dangerous one gets pitched around and can afford to wait.

Effect on the measured composition (400 games, after the change):

```
take rate 52.8% of all pitches
K: called 60.5%  whiff 39.5%
```

Called strikes fell from 71.6% to 60.5% of strikeouts, and the whole
matrix went from one fragile row to five with margin.

## Why strikeouts are still 27.9%

The band is 20–25% and the committed result is 27.9%. Two ways to close it
were measured, and both cost more than they are worth:

- **Push the two-strike modifiers further.** The remaining called strikes
  are the residue of the same mechanism, and cutting 0-2 below −0.08 keeps
  eroding it. But the modifiers are what makes an 0-2 count feel different
  from 0-0, and flattening them to buy a stat is the mistake round 1 made
  with the ball-side modifiers.
- **Raise Power's in-play rate on balls** (`power-ball` in play 0.10 →
  0.30). This cuts strikeouts to about 26.7% and pushes always-Power from
  103% to 123% of the sim — a clear "one button dominates" failure.

Measured, at the committed constants:

| power-ball in play | Strikeout rate | Always Power |
|---|---|---|
| 0.10 (committed) | 27.9% | 103% |
| 0.20 | 27.4% | 119% (fail) |
| 0.30 | 26.7% | 123% (fail) |

Seven points of Power-row margin buys one point of strikeout rate. The
matrix is what protects the player from a boring game, so the margin was
kept. If the owner wants the band met, the honest options are a further
§3.2 change or widening §7's strikeout band to about 26–30%.

## What R4 achieved without the rule change

Kept because `HANDOFF_PROMPT_2.md` asked for both tables with numbers, and
because it is the evidence that the rule change was necessary rather than
convenient. This is commit `e217343`, tuned only within §7.2's allowances
over roughly 250 measured configurations covering the legal space:

| | R4 (spec unchanged) | R7 (committed) |
|---|---|---|
| Runs per team per game | 3.85 | **4.42** |
| Batting average | .239 | **.255** |
| On-base percentage | .301 | **.321** |
| Strikeout rate | 31.9% | **27.9%** |
| Walk rate | 8.1% | 8.8% |
| Home runs per team per game | 1.00 (just under) | **1.03** |
| Bands passing | 3 of 8 | **7 of 8** |
| Always Take | 59.1% / 59.3% on seed 777 | **57.6% / 57.4%** |
| Always Contact | 109.4% / **110.9% fail** | **97.7% / 101.2%** |
| Always Power | 109.9% / **111.0% fail** | **103.1% / 103.1%** |
| Matrix on two seeds | passes one, fails the other | **passes both** |

R4's matrix was a boundary result: two rows cleared the 110% ceiling by
less than a point on the default seed and crossed it on a re-seed. The
reason it could get no better is that `BASE_ZONE` moves always-Take in the
opposite direction from always-Contact and always-Power — raising it
suppresses walks and contains always-Take, but puts more hittable pitches
in the zone and lifts the two swing-everything policies. Measured at 1,500
games with everything else fixed:

| BASE_ZONE | Always Take | Always Contact | Always Power |
|---|---|---|---|
| 0.505 | 66% (fail) | 112% (fail) | 102% |
| 0.513 | 61% (fail) | 111% (fail) | 111% (fail) |
| 0.517 | 59% | 115% (fail) | 113% (fail) |
| 0.520 | 53% | 118% (fail) | 109% |

There is no `BASE_ZONE` at which all three clear. R4 broke the deadlock by
pushing both **ball** rows of the batted-ball table to their minimum-offense
end, which taxes the swing-at-everything policies far more than the sim
(the sim takes most pitches out of the zone) — and that is what cost R4
its offense: 0.6 runs a game, sixteen points of average, twenty of OBP.
Those two rows are still at their minimum-offense end in the committed
tuning; the rule change is what bought the offense back.

## Before and after

Every change is a value in `src/engine/constants.ts` except the §3.2 rule
change, which is in `pitch.ts` and the spec. "R2 (spec)" is the revised
spec's starting value; "R7 (final)" is what is committed.

### `BASE_ZONE_PROBABILITY` — §7.2 range 0.42–0.56

| R1 (previous round) | R2 (spec) | R4 | R7 (final) |
|---|---|---|---|
| 0.34 | 0.48 | 0.518 | **0.515** |

### `CHALLENGE_WEIGHT` — new in §3.2, tuning range 0.20–0.60

| R6 (as specified) | R7 (final) |
|---|---|
| 0.40 | **0.50** |

### `COUNT_MOD` — §3.2, two-strike entries only

| Count | R2 (spec) | R7 (final) |
|---|---|---|
| 0-2 | −0.20 | **−0.08** |
| 1-2 | −0.12 | **−0.05** |
| 2-2 | −0.05 | **−0.02** |

All other entries, including the whole ball side, are at their §3.2 values.

### `PITCH_OUTCOMES` (in play / foul / whiff) — §3.4 ranges

| Cell | R2 (spec) | R7 (final) |
|---|---|---|
| Contact, zone | 0.42 / 0.45 / 0.13 | **0.50 / 0.40 / 0.10** |
| Contact, ball | 0.20 / 0.45 / 0.35 | **0.30 / 0.50 / 0.20** |
| Power, zone | 0.35 / 0.40 / 0.25 | **0.30 / 0.50 / 0.20** |
| Power, ball | 0.12 / 0.38 / 0.50 | **0.10 / 0.50 / 0.40** |

Every cell is at or inside its §3.4 bound (in play 0.30–0.50 on zone
pitches and 0.10–0.30 on balls, foul 0.30–0.50, zone whiff never below
0.10). Several sit exactly on their limits; there is no headroom left in
this table.

### `BATTED_BALL_OUTCOMES` (out / 1B / 2B / 3B / HR) — §3.5 ranges

| Cell | R2 (spec) | R7 (final) |
|---|---|---|
| Contact, zone | 0.62 / 0.27 / 0.07 / 0.01 / 0.03 | **0.5607 / 0.3121 / 0.0809 / 0.0116 / 0.0347** |
| Contact, ball | 0.75 / 0.20 / 0.04 / 0.005 / 0.005 | **0.825 / 0.14 / 0.028 / 0.0035 / 0.0035** |
| Power, zone | 0.58 / 0.15 / 0.12 / 0.01 / 0.14 | **0.5422 / 0.1635 / 0.1308 / 0.0109 / 0.1526** |
| Power, ball | 0.74 / 0.13 / 0.07 / 0.01 / 0.05 | **0.818 / 0.091 / 0.049 / 0.007 / 0.035** |

Every row sums to exactly 1.0, every cell is within 30% of its §3.5 value,
and no home-run cell exceeds 1.3× its §3.5 value (Contact-zone is at
exactly 1.3×, 0.0347 against a 0.039 ceiling; Power-zone at 1.09×).

### Base running — §7.2 allows ±0.15 from the §4 values

| Constant | §4 value | R7 (final) |
|---|---|---|
| `BASE_RUNNING_R2_SCORES_ON_SINGLE` | 0.65 | **0.78** |
| `BASE_RUNNING_R1_THIRD_ON_SINGLE` | 0.30 | **0.40** |
| `BASE_RUNNING_R1_SCORES_ON_DOUBLE` | 0.45 | **0.58** |
| `BASE_RUNNING_DOUBLE_PLAY` | 0.12 | 0.12 (unchanged) |
| `BASE_RUNNING_SACRIFICE_FLY` | 0.25 | 0.25 (unchanged) |

Base running adds runs without moving batting average, so it is used to
offset what the minimum-offense ball rows cost. All three are inside ±0.15.

### Not touched

The read thresholds, the rating formula, the §5.4 policy, and every
count modifier except the three two-strike entries above.

## Where it started

The §3/§4/§5.4 values as the review revised them, with the count-reset bug
fixed — the state at the end of R2, before any tuning (400 games):

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
Take unless Likely strike (Power)        96.8%  95.0%-130.0%  PASS
```

This differs from what `REVIEW_1.md` predicted. The review expected the
restored constants to contain always-Take at 17% of the sim; measured, it
is 142%. The sim policy at the spec's own starting values struck out 41% of
the time, and a batter who never swings outscores that. Restoring the
constants did not fix the exploit — the retune did.

## History: the zero-walk problem from round 1

Kept because it explains why the constants looked the way they did before
this round; the rest of the round-1 document is superseded.

Round 1 measured a walk rate of **exactly zero across 739,000 plate
appearances**. The cause was an interaction between §3.2 and the *old* §5.4
policy rather than a bug in either: the old policy only took when the read
was `Likely ball`, and §3.2's count modifiers raise `p_zone` as balls
accumulate, pushing the read toward `Likely strike`. Measured take rate by
count at the time:

| Count | 0-0 | 1-0 | 2-0 | 3-0 |
|---|---|---|---|---|
| Take rate | 19.7% | 3.5% | 1.2% | **0.0%** |

Ball four needed four consecutive takes, each less likely than the last,
and at 3-0 the policy never took. Round 1 worked around it by zeroing the
ball-side count modifiers, flattening exactly the thing that makes a 3-0
count feel different from an 0-2 count. The review's count-aware §5.4
policy is the right fix, the ball-side modifiers are back at their §3.2
values, and the walk rate is 8.8% with them intact.

It is worth noting that this round found the mirror image of the same bug
on the strike side — the two-strike modifiers making every two-strike read
`Likely ball` — and that the fix was again to change the rule rather than
to flatten a table.

## Reproducing

```
npm run tune                # 10,000 games, base seed 20260401
npm run tune -- 2000        # faster, and too noisy for a matrix verdict
npm run tune -- 10000 777   # the second seed used for the check above
```
