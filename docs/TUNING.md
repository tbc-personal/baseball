# Tuning

- [Phase A (round 3)](#phase-a-round-3) — the current committed tuning
- [Round 2](#round-2-after-review_1md) — the previous round, kept for its evidence

---

# Phase A (round 3)

The rating-economy retune from `docs/ROADMAP.md` §0. Measured with
`npm run tune`, the §5.4 opponent policy on both sides, all seven teams
cycled through as matchups, 10,000 games on base seed `20260401` and
cross-checked on `777`.

## Result

**All eight §7 bands pass and all five §7.1 matrix rows pass, on both
seeds.** This is the first overall PASS the project has recorded; round 2
finished 7 of 8, with the strikeout band unreachable.

Two things made it reachable, and only one of them is a band change:

- The strikeout band was **widened from 20–25% to 22–28%** on the owner's
  decision — see §7 of `GAME_DESIGN.md` for the reasoning. Measured at
  26.5%, it would have failed the old band.
- A **harness measurement bug** was found and fixed (see *The mirror-batch
  selection bias* below). It did not affect the band table, but it made
  one matrix row report a number that was wrong by a factor of three.

### Section 7 bands, 10,000 games

| Stat | Seed 20260401 | Seed 777 | Band | |
|---|---|---|---|---|
| Runs per team per game | 4.56 | 4.61 | 4.20–4.90 | PASS |
| Batting average | .258 | .258 | .245–.265 | PASS |
| On-base percentage | .326 | .327 | .315–.335 | PASS |
| Strikeout rate (per PA) | 26.5% | 26.5% | 22.0–28.0% | PASS |
| Walk rate (per PA) | 9.1% | 9.2% | 8.0–10.0% | PASS |
| Home runs per team per game | 1.09 | 1.10 | 1.00–1.30 | PASS |
| Pitches per plate appearance | 3.74 | 3.74 | 3.70–4.00 | PASS |
| Plate appearances per half-inning | 4.37 | 4.37 | 4.10–4.50 | PASS |

### Section 7.1 matrix, 10,000 games

Runs as a fraction of the sim policy's, both seeds:

| Policy | Seed 20260401 | Seed 777 | Band | Round 2 |
|---|---|---|---|---|
| Always Take | 49.4% | 49.7% | ≤60% | 57.6% |
| Always Contact | 98.7% | 99.0% | 60–110% | 97.7% |
| Always Power | 104.7% | 105.0% | ≤110% | 103.1% |
| Take until two strikes, then Contact | 95.2% | 97.6% | ≤110% | 95.4% |
| Take unless Likely strike (Power); Contact 2K | 111.8% | 110.4% | 95–130% | 110.6% |

Every row keeps its verdict across seeds. The tightest is always-Power at
104.7 / 105.0 against a 110% ceiling — five points of margin, better than
round 2's seven-point margin was fragile at, and deliberately bought (see
the ball rows below). Always-Take improved most, from 57.6% against a 60%
ceiling to 49.4%: it was the row round 2 flagged as having the least
margin, and it is no longer the binding constraint.

## What changed, and why

### `CHALLENGE_WEIGHT` 0.50 → 0.25

At 0.50 the §3.2 challenge term was strong enough to decide what the
Contact rating *meant*. Measured against the §5.4 policy before the change:

| Contact | AVG | OBP | K% | BB% |
|---|---|---|---|---|
| 20 | .252 | .253 | 19.1% | 0.2% |
| 50 | .254 | .299 | 27.7% | 6.1% |
| 80 | **.246** | .429 | **30.4%** | 24.2% |

The best contact hitter on the roster had the lowest batting average and
the highest strikeout rate, because the pitcher worked around him, the
count-aware policy took, and the rating cashed out as walks and called
strike threes. At 0.25 the same sweep runs .223 / .254 / .284 — monotonic,
which is the whole point — and the walk rate at Contact 80 falls to 11.7%.

Hanging the term on Power instead was measured and **rejected**: it fixes
Contact and inverts Power (.287 at Power 20 against .247 at Power 80),
taking Power's value across its range from +0.091 to +0.053 while
Contact's rises to +0.141. Hanging it on mean threat `(C+P)/2` was also
rejected, for the same reason in milder form. The term is too strong to
hang on any single rating; the fix is less of it, not a different home for
it. `docs/ROADMAP.md` §0.4 has the full tables.

The two-strike read table was re-derived at 0.25, since that is what the
term was introduced to fix. The property round 2 needed — that a
two-strike read is not `Likely ball` for every hitter — still holds; the
band of hitters who get challenged at 0-2 narrows from Contact < 47 to
Contact < 44. The measured strikeout composition did not regress.

### Check swing: new rule (§3.4a)

The Eye rating did essentially nothing. Across its 20–80 range it was
worth +0.013 of run value against +0.092 for Contact and +0.095 for
Power, and under an always-Contact policy exactly zero, because a policy
that ignores the read ignores the only thing Eye touched.

The rule: a swing at a pitch **out of the zone** is held up, and counts as
a ball, with probability `clamp(0.10 + adj(Eye) * 0.50, 0, 1)`, scaled by
`CHECK_SWING_TWO_STRIKE_FACTOR` (committed at 1). Eye is now worth
**+0.048** against Contact's +0.112 and Power's +0.093 — close enough
that the rating spread is no longer the game's largest balance problem.

Two things about it are worth recording because they were not obvious:

- **It acts on swings, not takes.** That is why it was preferred to the
  alternative of shading borderline called strikes by Eye, which would
  have rewarded only taking and widened the always-Take row that round 2
  flagged as the thinnest. Measured, always-Take is unmoved by it.
- **The two-strike case is nearly all of its value and nearly none of its
  cost.** The valuable check swing is the one that rescues a strike three.
  Measured across the factor at 800 mirror games per point:

  | factor | Eye 20→80 run value | league AVG | league OBP | K rate |
  |---|---|---|---|---|
  | 0 | +0.015 | .265 | .329 | 26.8% |
  | 0.5 | +0.030 | .266 | .331 | 26.6% |
  | 1 | +0.047 | .266 | .333 | 26.4% |

  Tripling what Eye is worth costs one point of league batting average, so
  the factor is committed at 1. An earlier reading that suggested the
  opposite came from a flawed measurement and does not stand.

### `BATTED_BALL_OUTCOMES`, both ball rows

| Cell | R7 (round 2) | Phase A |
|---|---|---|
| Contact, ball | 0.825 / 0.14 / 0.028 / 0.0035 / 0.0035 | **0.86 / 0.112 / 0.0224 / 0.0028 / 0.0028** |
| Power, ball | 0.818 / 0.091 / 0.049 / 0.007 / 0.035 | **0.88 / 0.06 / 0.0323 / 0.0046 / 0.0231** |

This is where the check swing is paid for. The rule removes chase swings,
which were mostly outs, so it lifts league batting average about ten
points on its own — enough to put it out of band. Taxing the rows only a
chase can reach charges that back to the policies doing the chasing rather
than to the league: it brought batting average from .267 to .258 and
pulled always-Power from 108% of the sim to 105%. Both cells stay inside
the ±30% §7.2 allows from their §3.5 values. Every row still sums to 1.0.

## The mirror-batch selection bias

A pre-existing bug in `scripts/tune-lib.ts`, found while setting per-policy
bands, and the reason round 2's always-Take row reports a walk rate that
is wrong by a factor of three.

The §7.1 matrix draws each policy's own rate stats from a **mirror** batch,
the policy played on both sides. For always-Take that is a game in which
nobody ever puts a ball in play: runs can only score on bases-loaded
walks, so the games are scoreless and go to extra innings — **measured, an
average of 76.5 innings against a normal game's 9.1**. The matchups that
drag on longest are exactly the ones where the pitcher throws the most
strikes and issues the fewest walks, so the batch over-samples them badly.
Mean 0-0 `p_zone` in those games measured 0.641 against 0.552 in normal
ones.

The effect on the reported numbers:

| Always Take, mirror batch | Uncapped (round 2) | Capped (Phase A) |
|---|---|---|
| Walk rate | 10.1% | **28.2%** |
| Strikeout rate | (not reported) | 71.8% |
| Pitches per PA | 4.44 | 4.83 |

The capped figure is the right one. Two independent checks agree with it
and not with the uncapped one: an exact Markov walk over the count model
gives 19.5% for a league-average pitcher, and `npm run probe policies`
gives 22.8% for a 50/50/50 batter — both in the same region as 28.2% once
roster spread is accounted for, and nowhere near 10%.

**The fix** is `maxInnings` on `runBatch`/`playGame`, set to regulation for
mirror batches only. Only per-PA and per-AB rates are read from a mirror
batch, so truncating a tied game costs nothing. The runs verdict comes
from the head-to-head batch, which does not degenerate because the sim
side scores. The other four policy rows moved by less than a point, which
is the expected result: they all put the ball in play, so their games end
on time.

Anyone re-reading round 2's matrix should treat its `Walk%` and `P/PA`
columns as unreliable for always-Take and roughly right for everything
else.

## Reproducing

```
npm run tune                 # 10,000 games, base seed 20260401
npm run tune -- 10000 777    # the second seed
npm run probe experiment     # the candidate comparison behind §0.4/§0.7
npx vitest run tests/tuning-regression.test.ts   # the CI drift guard
```

---

# Round 2, after REVIEW_1.md

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
