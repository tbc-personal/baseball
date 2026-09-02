# Tuning (ticket T5)

Measured with `npm run tune -- 10000`, the §5.4 opponent policy on both
sides, all seven teams cycled through as matchups. Base seed `20260401`;
re-checked against seed `777` with no band changing verdict.

## Result: all eight §7 bands pass

```
Stat                                 Measured     Target band  Result
-----------------------------------------------------------------------
Runs per team per game                   4.84       4.20–4.90  PASS
Batting average                          .251       .245–.265  PASS
On-base percentage                       .321       .315–.335  PASS
Strikeout rate (per PA)                 23.8%     20.0%–25.0%  PASS
Walk rate (per PA)                       9.3%      8.0%–10.0%  PASS
Home runs per team per game              1.20       1.00–1.30  PASS
Pitches per plate appearance             3.81       3.70–4.00  PASS
Plate appearances per half-inning        4.32       4.10–4.50  PASS

(from 10000 games / 20000 team-games, 777014 plate appearances, 179673 half-innings)
```

The always-Contact balance check does **not** pass. That is explained in
full below; it is not achievable alongside the walk-rate band by adjusting
constants, which is the constraint this ticket works under.

## Where it started

Straight off the §3 and §4 tables as written, before any tuning:

```
Runs per team per game                   3.26       4.20–4.90  FAIL (too low)
Batting average                          .270       .245–.265  FAIL (too high)
On-base percentage                       .270       .315–.335  FAIL (too low)
Strikeout rate (per PA)                 23.3%     20.0%–25.0%  PASS
Walk rate (per PA)                       0.0%      8.0%–10.0%  FAIL (too low)
Home runs per team per game              1.08       1.00–1.30  PASS
Pitches per plate appearance             1.80       3.70–4.00  FAIL (too low)
Plate appearances per half-inning        4.03       4.10–4.50  FAIL (too low)
```

## What changed, and why

Only values in `src/engine/constants.ts`. No table gained or lost a row,
no new mechanic was added, and no game rule changed.

### 1. `COUNT_MOD`: the ball-side modifiers zeroed

Was `3-0: +0.20, 2-0: +0.12, 3-1: +0.12, 1-0: +0.05, 2-1: +0.05, 3-2: +0.05`,
now all `0`. The strike-side entries are untouched.

This is the change that makes walks exist at all. The original walk rate
was not merely low, it was **exactly zero over 739,000 plate appearances**.
The cause is an interaction between §3.2 and §5.4 rather than a bug in
either. §5.4 only takes when the read is `Likely ball`; §3.2's count
modifiers raise `p_zone` as balls accumulate, which pushes the read toward
`Likely strike`. Measured take rate by count, before the change:

| Count | 0-0 | 1-0 | 2-0 | 3-0 |
|---|---|---|---|---|
| Take rate | 19.7% | 3.5% | 1.2% | **0.0%** |

Reaching ball four needs four consecutive takes, each less likely than the
last, and at 3-0 the policy never takes. Walks were structurally
impossible. Zeroing the ball-side modifiers keeps the read stable as balls
accumulate, and the walk rate lands at 9.3%.

The realism cost is real and worth stating: a pitcher behind 3-0 no longer
becomes more likely to throw a strike. The strike-side modifiers still
work, so a pitcher ahead in the count still expands the zone.

### 2. `BASE_ZONE_PROBABILITY`: 0.55 → 0.34, `READ_BUCKET_LIKELY_BALL`: 0.45 → 0.55

Together these get enough pitches out of the zone, and enough of them read
as `Likely ball`, for plate discipline to produce walks and for plate
appearances to last more than two pitches.

### 3. `PITCH_OUTCOMES`: fouls up, whiffs down

| Cell | Was (in play / foul / whiff) | Now |
|---|---|---|
| Contact, zone | 0.70 / 0.20 / 0.10 | 0.36 / 0.58 / 0.06 |
| Contact, ball | 0.30 / 0.35 / 0.35 | 0.15 / 0.76 / 0.09 |
| Power, zone | 0.50 / 0.25 / 0.25 | 0.28 / 0.59 / 0.13 |
| Power, ball | 0.15 / 0.30 / 0.55 | 0.09 / 0.71 / 0.20 |

Pitches per plate appearance was 1.80 against a 3.70–4.00 target — the
single largest miss. A foul with two strikes keeps the count, so foul rate
is the direct lever on plate-appearance length. Whiff rates had to come
down at the same time: raising fouls alone pushed the strikeout rate to
38% because long plate appearances gave whiffs more chances to end them.

### 4. `BATTED_BALL_OUTCOMES`: rebalanced, and every row now sums to 1.0

| Cell | Was (out/1B/2B/3B/HR) | Now |
|---|---|---|
| Contact, zone | 0.62 / 0.27 / 0.07 / 0.01 / 0.03 | 0.605 / 0.256 / 0.069 / 0.01 / 0.06 |
| Contact, ball | 0.75 / 0.20 / 0.04 / 0.005 / 0.005 | 0.742 / 0.189 / 0.045 / 0.005 / 0.019 |
| Power, zone | 0.58 / 0.15 / 0.12 / 0.01 / 0.14 | 0.505 / 0.095 / 0.115 / 0.01 / 0.275 |
| Power, ball | 0.74 / 0.13 / 0.07 / 0.01 / 0.05 | 0.705 / 0.095 / 0.075 / 0.01 / 0.115 |

Cutting in-play rates in step 3 removed roughly 40% of batted balls, which
dragged batting average, home runs and runs down with it; these rows put
that production back.

Note the rows are now normalised to sum to exactly 1.0. `rngPick`
normalises weights internally, so a row summing to 1.015 silently shifted
every probability in it away from its declared value — the table said one
thing and the engine did another. Caught by a T2 test asserting the table
reproduces within ±0.5%.

### 5. Base running: `R2_SCORES_ON_SINGLE` 0.65 → 0.50, `R1_SCORES_ON_DOUBLE` 0.45 → 0.30

Runs came in at 4.96 against a 4.90 ceiling with everything else in band.
Base-running probabilities trim runs without touching batting average,
which was already placed, so this was the lever that cost nothing else.

## The always-Contact check: not achievable, and why

§7 asks that a player who always picks Contact land within 10% of the sim
policy's run rate. **It measures 48%.** The check fails and I could not fix
it by adjusting constants.

This is not a tuning miss — it is a direct conflict between two §7
requirements. The measured tradeoff:

| Walk rate | always-Contact ratio |
|---|---|
| 0.0% (the spec's own constants) | 91% (would pass) |
| 1.2% | 81% |
| 4.5% | 70% |
| 9.3% (in band) | 48% |

A walk rate of 8–10% requires that taking pitches be frequent and
valuable. An always-Contact player never takes, so everything that makes
walks worth having is exactly what they forgo. The two targets move in
opposite directions along one axis.

Three things rule out the obvious escapes:

- **It is not about Power's upside.** Making the Power and Contact rows
  byte-identical — so the only difference between the policies is taking —
  still measures 49%. §7's suggested remedy ("the Power row needs more
  upside or the Contact row more outs") addresses the opposite failure,
  where mashing Contact dominates, and does not apply here.
- **Raising the zone rate does not fix it.** It reduces the penalty for
  swinging at balls, but collapses the walk rate on the way: zone 0.56
  gives an 81% ratio with a 1.2% walk rate.
- **Making ball-swings cheap does not fix it.** Both policies swing at
  balls, so improving those cells lifts both sides roughly equally; the
  ratio tops out near 57% while batting average, runs and pitches per
  plate appearance all leave their bands.

Per the handoff instruction, the closest achievable result was taken: all
eight numeric bands in §7's table pass, and the balance check is reported
failing rather than papered over. Resolving it needs a decision that is
above this ticket's authority, because each option changes a rule:

1. **Accept it.** Plate discipline matters a lot. That is defensible
   baseball, and a human player who thinks about the read beats the sim —
   which §5.4 says is the intent.
2. **Widen the §7 balance band** to something like 40–110%, asymmetric,
   forbidding "one button dominates" while allowing "one button is weak".
3. **Change §5.4's policy** so the sim also swings freely, which lowers the
   sim's own run rate and closes the gap from the other side. This changes
   the opponent's difficulty and so is a game-design decision.

## Reproducing

```
npm run tune              # 10,000 games, base seed 20260401
npm run tune -- 2000      # faster
npm run tune -- 10000 777 # a different seed
```
