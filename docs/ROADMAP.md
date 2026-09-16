# Roadmap

Ordering for the features parked in `docs/FUTURE_FEATURES.md` and
`docs/PLAN.md` Phase 4, plus a balance problem that changes the order.

**Provenance.** The feature list is the owner's. Everything else here —
the ordering argument, the balance diagnosis, the added features, the
parked ones — is Claude's, written to be edited. Prose is Claude's
composition throughout; the numbers are measured, and every table says how
to reproduce it.

**Revision 2 (reviewer pass).** Edits by the design reviewer. Inserted
passages are marked `> Reviewer:` or "(rev 2)" in a heading; everything so
marked is composed text for the owner to edit. What changed, in one place:

- §0: the headline is restated. In game context the read is already worth
  about 13 points of runs over always-Contact; the probe understates it.
  The defects that matter are the inert Eye rating and the Contact rating
  that pays out as walks. The .311 average is a symptom.
- §0.4 and §0.6: two new Phase A candidates, both to be measured: move the
  challenge term from Contact to Power, and give Eye a check-swing channel
  that works under every policy. A recommendation on the strikeout band.
- §1: the save-invalidation constraint is withdrawn; saves resume from the
  stored RNG position. Ordering now rests on retune cost and schema
  migrations only.
- §2: Phase B takes the player's hook decision. Phase D is split into a
  one-decision-per-half-inning pitching mode first and pitch-by-pitch
  last, opt-in. Phase E becomes owner-directed offseason choices with
  light age drift.
- §3: added keyboard play, a tuning regression in CI, a pennant game at
  season end, and a difficulty ladder as the opponents' side of
  progression.
- §5: the reviewer's recommended answer under each open question.

**Revision 4 (Phase A shipped).** Phase A is built, retuned and passing on
two seeds; §0.8 is the summary and `docs/TUNING.md` "Phase A (round 3)" is
the measurement record. One finding did not fit in a phase: OPS turns out
not to track run value in this engine, so putting it on the season screen
only half-closes §0.1. That is now open question 5.

**Revision 3 (measured).** The rev-2 candidates were measured rather than
argued about (`npm run probe experiment`, new with this revision), and the
owner answered §5. Marked `> Measured:` and "(rev 3)". What changed:

- §0.1 and §0.2: the reviewer's two factual corrections verified and taken.
  One of them (OBP is on the season screen) makes the case sharper, not
  weaker.
- §0.4: **challenge-on-Power tested and rejected.** It fixes the Contact
  rating by inverting the Power rating. A third option, hanging the term
  on mean threat, was tested and also rejected. Lowering the weight on
  Contact remains the best of the three.
- §0.6: **check swing tested and adopted**, at the reviewer's exact
  numbers. It is the single largest lever measured here.
- §0.7 (new): the recommended Phase A package, with the measured table.
- §1: the save constraint is struck. The reviewer was right; the evidence
  is now cited.
- §2, §5: the owner's decisions recorded — widen the strikeout band, split
  Phase D, keep career mode alive as a later release.
- §3: the CI regression sized against a measured drift figure.

---

## 0. The balance problem comes first, and it is not the one we thought

Short version: **Contact is not overpowered in runs. It is overpowered in
the stats the game shows you.** And the real defect underneath is that
**Eye is worth almost nothing and the Contact *rating* has been quietly
converted into a walk rating.**

> Reviewer: I would restate the headline. The §7.1 matrix already shows
> the reading policy at 110.6% of the sim's runs and always-Contact at
> 97.7%, so in game context reading the pitcher is worth about 13 points.
> The probe's 0.333 versus 0.330 is measured with static weights and no
> base state, which is exactly the setting where a walk and a single look
> alike; it understates the read. Neither number is large, but the design
> asked for a thoughtful player to be "slightly better", and 13% is that.
> So the balance problem is not "the read does not pay". It is the two
> rating defects in §0.3 and §0.4: one rating does nothing, one does the
> wrong thing. Fix those and keep the .311 as the symptom to re-measure.

> Measured (rev 3): taken. The probe understates OBP-heavy policies
> because team run scoring is convex in on-base — a walk with two on is
> worth more than the static weight — and the probe has no bases. The
> matrix's 13 points is the better number for "does reading pay", and
> this document should not have leaned on 0.333 against 0.330 for that
> question. What those two numbers *do* still establish, and what the
> matrix independently confirms (always-Contact 97.7%, always-Power
> 103.1%), is the §0.1 finding: **Contact and Power are worth the same and
> look completely different.** That was the owner's original complaint and
> it survives the correction.

All numbers below come from `npm run probe`, added with this document. It
isolates one plate appearance — one batter, one policy, the twelve-pitcher
opponent pool, no bases or outs — which is the question `npm run tune`
cannot answer. `tune` measures league rate stats and each policy's *runs*;
it has no view of what a single rating buys. That blind spot is why this
shipped.

The "run val" column is static linear weights (BB .69, 1B .89, 2B 1.27,
3B 1.62, HR 2.10) — a fixed yardstick for ranking choices against each
other inside one run, not a §7 run target.

### 0.1 Every swing button is worth the same; they just look different

League-average batter (50/50/50), 40,000 PA each
(`npm run probe policies`):

| Policy | AVG | OBP | SLG | K% | BB% | run val | P/PA |
|---|---|---|---|---|---|---|---|
| always Take | .000 | .228 | .000 | 77.2% | 22.8% | 0.158 | 4.74 |
| always Contact | .311 | .311 | .447 | 10.5% | 0.0% | 0.330 | 2.25 |
| always Power | .234 | .234 | .540 | 39.5% | 0.0% | 0.330 | 3.04 |
| sim policy (§5.4) | .254 | .300 | .404 | 27.2% | 6.1% | 0.310 | 3.59 |
| read: Power on strike, Contact 2K | .273 | .307 | .457 | 22.0% | 4.6% | 0.333 | 4.26 |
| read: Contact on strike, Contact 2K | .279 | .309 | .404 | 18.8% | 4.3% | 0.314 | 3.93 |

Always-Contact and always-Power produce **the same run value to three
decimal places**. §7.1 already knew this: always-Contact measured 97.7% of
the sim's runs, well inside its band. So Power is not underpowered in the
sense of scoring fewer runs.

What it *is*: 77 points of batting average and 29 points of strikeout rate
worse, for the same output. The season screen prints AVG, OBP and K. It
does not print run value. A player mashing Contact sees a .311 team that never
strikes out and correctly concludes the button is working; the cost —
every walk in the season, and about a third of a pitch per PA off the
opposing starter — is charged to a ledger nobody can see.

> Reviewer: OBP is on the season screen, so walks are not invisible; the
> point stands because always-Contact's OBP (.311) still beats the sim's
> (.300). The number that is invisible and matters more for this game is
> pitches per plate appearance. Always-Contact at 2.25 turns a half-inning
> into about ten taps. That is the quiet way a one-button policy makes the
> game boring, and it is worth banding in §0.6 item 1.

> Measured (rev 3): correct, and it sharpens the claim rather than
> softening it. `SeasonScreen.tsx` prints AVG, HR, RBI, OBP and K, sorted
> by AVG. **There is no SLG column.** So the one thing the screen cannot
> show is the entire payoff of the Power button — a double is invisible,
> and only the HR column catches the top of it. That is the precise
> version of "the feedback channel disagrees with the balance metric", and
> it is why §0.6 item 5 is not cosmetic. The P/PA catch is right and is
> now item 1's floor.

**The tuning process and the game's feedback channel disagree about what
winning looks like.** That is the bug. Either the visible stats have to
track run value, or run value has to become visible.

### 0.2 The ".300 hitters after 7 games" reading is real

At a true .311, seven games is ~24 AB per regular, and
`P(AVG ≥ .300) = 48%` per hitter — expected count over .300 out of nine is
**4.3**. Four or five is exactly what the measurement predicts.

But the sample proves nothing on its own: at a "correct" .280 you would
still expect ~3.2 of nine over .300 at that point. The 40,000-PA runs are
the evidence; the seven games are the symptom that prompted looking.

### 0.3 Eye is worth 8% of what the other two ratings are worth

Sweeping one rating 20 → 80 with the other two pinned at 50, under the
reading policy, 60,000 PA per row (`npm run probe ratings`):

| Rating swept 20 → 80 | run val 20 | run val 80 | Δ |
|---|---|---|---|
| Contact | 0.309 | 0.401 | **+0.092** |
| Power | 0.285 | 0.380 | **+0.095** |
| Eye | 0.331 | 0.344 | **+0.013** |

Sixty points of Eye buys a seventh of what sixty points of Contact or
Power buys. Under always-Contact it buys literally nothing — Eye only
touches read accuracy, and a policy that ignores the read ignores Eye.

This is the defect that matters most, because it is the one every later
feature multiplies. Season-to-season progression over a rating worth
0.013 is bookkeeping. A pitch-location display is a UI flourish rather
than a skill if the rating governing it is inert.

### 0.4 The Contact rating currently makes you walk, not hit

Same sweep, under the §5.4 policy — the count-aware one, i.e. the one a
thinking player approximates:

| Contact | AVG | OBP | K% | BB% |
|---|---|---|---|---|
| 20 | .252 | .253 | 19.1% | 0.2% |
| 50 | .254 | .299 | 27.7% | 6.1% |
| 80 | **.246** | .429 | **30.4%** | 24.2% |

Your best contact hitter has the **lowest batting average** and the
**highest strikeout rate** on the team. That is backwards as baseball, and
it is not a table error — it is `challenge_mod = -adj(Contact) * 0.5` in
§3.2 working exactly as specified. The pitcher works around the dangerous
hitter, the count-aware policy takes, and the rating cashes out as walks
and called strike threes instead of hits.

Sweeping the weight (`npm run probe challenge`, sim policy, P/E at 50):

| CHALLENGE_WEIGHT | AVG at C20 | AVG at C50 | AVG at C80 | BB% at C80 |
|---|---|---|---|---|
| 0.50 (committed) | .252 | .254 | **.246** | 24.2% |
| 0.35 | .236 | .257 | .275 | 15.5% |
| 0.20 | .224 | .258 | .293 | 10.5% |
| 0.00 | .194 | .254 | .324 | 6.1% |

Somewhere around 0.20–0.25, Contact starts behaving like a contact rating.

> Reviewer: measure a third option beside the weight sweep: keep the term
> at its current strength but hang it on Power instead of Contact,
> `challenge_mod = -adj(Power) * CHALLENGE_WEIGHT`. Pitchers work around
> sluggers, not singles hitters. The walk-rate side effect then lands on
> the hitter whose real-world profile it matches, and Contact goes back to
> touching only whiffs and the batted-ball row, which is what its name
> promises. Because the term's magnitude does not change, the two-strike
> read fix that `TUNING.md` credits it with should survive; that is the
> thing to confirm first with `npm run probe challenge` adapted to sweep
> Power.

> Measured (rev 3): **tested and rejected.** `npm run probe experiment`
> hangs the term on Power, on Contact at a lower weight, and on mean
> threat `(Contact + Power) / 2`, and scores each on what the three
> ratings are worth. Hanging it on Power does fix Contact — batting
> average under the sim policy goes .195 / .257 / .327 across Contact
> 20 / 50 / 80, exactly the shape we want — but it moves the inversion
> rather than removing it. **Power then inverts: .287 at Power 20 against
> .247 at Power 80**, and Power's value across its range falls from +0.091
> to +0.053 while Contact's rises to +0.141. That is a 2.7× gap between
> the two ratings, worse than the 1.05× the committed engine has. The
> reasoning was sound baseball; the term is simply too strong to hang on
> any single rating, because whichever rating carries it gets paid in
> walks instead of its own currency.
>
> Mean threat, which is the version this document proposed in reply and
> which splits the penalty across both, is also rejected: Contact +0.123,
> Power +0.083, and it drags Power down without making Contact behave any
> better than the simpler option below.
>
> **Lowering the weight on Contact wins.** At `CHALLENGE_WEIGHT` 0.25,
> Contact goes .223 / .254 / .284 across 20 / 50 / 80 under the sim policy
> — monotonic, which is the whole point — its walk rate at Contact 80
> drops from 24.3% to 11.7%, and Power is untouched at +0.090 against
> Contact's +0.112. Keeping some of the term is right: a great contact
> hitter *should* get pitched around a little. 0.50 was just too much of
> it.

**This cannot be changed on its own.** `TUNING.md` is explicit that the
challenge term at 0.50 is half of what unbroke the two-strike read — at
the old count modifiers every two-strike read was `Likely ball` for every
legal `BASE_ZONE`, and the strikeout band was unreachable by construction.
Cutting the weight re-opens that door. It has to move together with the
count modifiers and a full retune. Treat the table above as a direction to
measure, not a value to commit.

### 0.5 On the earlier diagnosis

The claim that Power carries a strikeout penalty with no equivalent payoff
because only Contact reduces the out probability is **accurate about the
code and wrong about the consequence**. The out-reduction asymmetry is
real, but Power's reallocation toward XBH/HR pays for it almost exactly:
the two policies land within 0.001 of run value. The problem is not the
size of Power's payoff, it is that the payoff arrives in a currency
(slugging) the season screen under-weights against one (average) it does
not.

### 0.6 What Phase A should therefore do

In rough confidence order:

1. **Add per-policy rate bands to the §7.1 matrix.** Right now the matrix
   bands runs only, which is why a .311-hitting exploit passed. Band AVG,
   OBP, SLG and K% per policy too, and pitches per plate appearance with
   a floor (always-Contact at 2.25 is the one to catch). Cheapest change
   here, no engine risk, and it is what catches the next one of these. Do
   it first, and wire the small-N version into CI (§3).
2. **Cut `CHALLENGE_WEIGHT` from 0.50 to 0.25** (rev 3: measured, §0.4)
   so Contact raises batting average rather than walk rate, and re-derive
   the two-strike read table — `TUNING.md` has the shape of that table,
   and this is the one step of Phase A that can re-open the problem the
   challenge term was introduced to fix. Leave `CONTACT_SHIFT_OUT` at 0.5
   until the retune says otherwise; at 0.25 the Contact rating already
   carries +0.112 against Power's +0.090, so there is no shortfall left
   to fill.
3. **Give Eye a second channel that works under every policy.** Read
   accuracy alone cannot carry a rating, because a player who ignores the
   read zeroes it out. Pitch-location visibility scaled by Eye (Phase C)
   is the durable channel, and the argument for pulling that phase
   forward stands.

   > Reviewer (rev 2): the interim I would build is a **check swing**.
   > When the batter swings at a pitch out of the zone, roll once: with
   > probability `0.15 + adj(Eye) * 0.5` (0.00 at Eye 20, 0.30 at Eye 80)
   > he holds up and the pitch is a ball. One roll, one constant, and it
   > pays under always-Contact as much as under the reading policy,
   > because it acts on swings rather than takes. It also feeds walk rate
   > for patient hitters through a channel that is not the challenge
   > term. The original draft's alternative, shading borderline called
   > strikes by Eye, rewards only taking and would widen the always-Take
   > margin that is already at 57.6% against a 60% ceiling.

   > Measured (rev 3): **adopted, at these exact numbers.** It is the
   > largest single lever measured in this document. Eye's value across
   > its range goes from **+0.012 to +0.057**, which moves it from "does
   > nothing" to within reach of Contact and Power. The weaker variant
   > tried alongside it (`0.10 + adj(Eye) * 0.25`) only reaches +0.028,
   > so the magnitude is doing real work and should not be trimmed
   > pre-emptively. Two side effects, both checked: always-Take is
   > unmoved (0.157 against 0.156 — the rule acts on swings, so the
   > reviewer's argument for preferring it over called-strike shading
   > holds), and league offense rises about 5%, which the Phase A retune
   > absorbs. It does **not** fix the §0.4 inversion; the two changes are
   > orthogonal and Phase A needs both.

4. **Take the strikeout band decision.** 27.9% against a 20–25% target,
   and `TUNING.md` says the two honest options are a further §3.2 change
   or widening the band to 26–30%. Phase A is a retune anyway; decide it
   here rather than carrying it through four more phases. Power's zone
   whiff rate at 0.20 is what produces the 39% always-Power K rate, and
   trimming it against HR share attacks both problems at once.

   > Reviewer: widen it, to 22–28%, and stop spending retunes on it. The
   > 20–25% band was a guess in the original design, and a league with a
   > Power button lands where modern baseball does, near the top of that
   > range. Cut the two-strike modifiers again only if playtesting says
   > two-strike counts feel hopeless, which is a feel question, not a
   > band question.

   > **Decided (rev 3): widen to 22–28%.** Owner's call, reviewer's
   > recommendation. Note that Phase A moves this band for free in the
   > right direction anyway: with the check swing in, the sim policy's
   > strikeout rate falls from 27.3% to 26.3% before any two-strike
   > modifier is touched. Update §7 in `GAME_DESIGN.md` and the band table
   > in `tune.ts` as part of Phase A, and record the change in
   > `TUNING.md` alongside the reason, so the next reader does not
   > re-litigate it.

5. **Put a slugging-aware number on the season screen.** OPS at minimum,
   and make it the default sort. If AVG is the only number the player
   reads, AVG is the only thing they will optimise, whatever the tables
   say. Rev 3: this needs a SLG column added, not just a derived one —
   `SeasonScreen.tsx` does not currently compute slugging at all.

### 0.7 The recommended Phase A package (rev 3)

Everything above, measured together. 60,000 PA per line,
`npm run probe experiment`. "Rating value" is what a rating is worth
across its whole 20–80 range under the reading policy; "spread" is the
most valuable rating over the least.

| Variant | Contact | Power | Eye | spread |
|---|---|---|---|---|
| committed engine | +0.087 | +0.091 | +0.012 | **7.6×** |
| challenge on Power, 0.50 | +0.141 | +0.053 | +0.011 | 12.8× |
| challenge on Power, 0.30 | +0.141 | +0.064 | +0.011 | 12.8× |
| challenge on threat, 0.35 | +0.123 | +0.083 | +0.008 | 15.4× |
| `CHALLENGE_WEIGHT` 0.25 | +0.112 | +0.090 | +0.011 | 10.2× |
| check swing alone | +0.100 | +0.092 | +0.057 | 1.8× |
| **0.25 + check swing** | **+0.120** | **+0.099** | **+0.053** | **2.3×** |

The recommendation is the last row: `CHALLENGE_WEIGHT` 0.50 → 0.25, plus
a check swing at `0.15 + adj(Eye) * 0.50`. Together they take the rating
spread from 7.6× to 2.3× and make the Contact rating monotonic in batting
average (.232 / .267 / .295 across Contact 20 / 50 / 80 under the sim
policy, against .250 / .256 / .243 today).

What the package does to the league, to brief the retune:

| | committed | package |
|---|---|---|
| sim policy run value | 0.312 | 0.328 |
| sim policy strikeout rate | 27.3% | 26.3% |
| always-Contact vs sim | 104.8% | 103.7% |
| reading policy vs sim | 107.4% | 107.6% |
| always-Take run value | 0.157 | 0.156 |

Offense rises about 5% and strikeouts fall a point, both of which the
retune absorbs and both of which move toward the bands rather than away.
The policy ratios barely move, so the §7.1 matrix should survive — but
that is a prediction from a no-bases model and the 10,000 × two-seed run
is what settles it.

> Shipped (rev 4): the direction held, the magnitudes did not. The
> committed rule is `0.10 + adj(Eye) * 0.50`, not 0.15, and it needed both
> ball rows of the batted-ball table taxed to pay for it — the check swing
> removes chase swings, which were mostly outs, and lifts league batting
> average about ten points on its own. Measured in the real harness rather
> than the probe, Eye lands at +0.049 and Contact at +0.112. The table
> below is the probe's prediction; §0.8 and `docs/TUNING.md` carry what
> actually shipped, and the two differ enough that the probe should be
> read as a way to rank candidates, never as a forecast of league rates.

**Two things this package does not do.** It does not touch the §0.1
symptom directly: always-Contact still hits .321 and still beats the sim.
That is the right order of operations — fix what the ratings mean first,
then re-measure the symptom, per the reviewer's §0 note — but Phase A is
not finished until always-Contact has been re-measured against a season
screen that shows SLG. And it does not address the two-strike read, which
cutting the challenge weight can re-open; that check comes first in the
retune, not last.

---


### 0.8 Phase A: what shipped, and the one thing it did not fix (rev 4)

Phase A is done. `docs/TUNING.md` "Phase A (round 3)" is the measurement
record; this is the design summary.

**All eight §7 bands and all five §7.1 matrix rows pass at 10,000 games on
two seeds** — the first overall PASS the project has recorded. The rating
spread, the thing §0.3 identified as the real defect, closed from 7.6× to
about 2×:

| Rating, 20 → 80 | Before | After |
|---|---|---|
| Contact | +0.087 | +0.112 |
| Power | +0.091 | +0.090 |
| Eye | **+0.013** | **+0.049** |

And the §0.4 inversion is gone: the Contact rating is now monotonic in
batting average (.223 / .254 / .284 across 20 / 50 / 80) instead of
peaking in the middle.

What shipped: `CHALLENGE_WEIGHT` 0.50 → 0.25; a check-swing rule (§3.4a)
giving Eye a second channel; both ball rows of the batted-ball table
pushed further toward their minimum-offense end to pay for it; the
strikeout band widened to 22–28%; OPS on the season screen as the default
sort, replacing RBI; per-policy rate columns on the §7.1 matrix; a CI
drift guard; and a fix to a pre-existing harness measurement bug (see
`TUNING.md`, "The mirror-batch selection bias") that had one matrix row
reporting a walk rate wrong by a factor of three.

**What it did not fix: OPS is not a faithful proxy for run value here, so
putting it on the screen only half-closes §0.1.**

This was supposed to be the loop closing — the player sorts by OPS, sees
the thoughtful approach on top, and the visible stat finally agrees with
the balance metric. It does not, and the reason is structural rather than
a tuning miss. OPS weights a point of on-base and a point of slugging
equally; this engine's run value weights on-base roughly twice as heavily.
An always-Power policy runs about 90 points of slugging above the
thoughtful play against about 90 points of on-base below it, so the two
land on top of each other on OPS while differing by five to nine points of
actual runs:

| Policy | AVG | OBP | SLG | OPS | Runs vs sim |
|---|---|---|---|---|---|
| Always Power | .244 | .244 | .567 | **.811** | 104.7% |
| Take unless Likely strike; Contact 2K | .281 | .333 | .473 | **.806** | **111.8%** |

A gate was built on this and then removed, because it was measuring noise:
across four check-swing settings the OPS gap between those two policies
never left ±0.003 while their run difference stayed stable. It survives as
a reported diagnostic in `npm run tune`, not a band.

So a Power-mashing player will still top their own OPS sort. OPS is a
large improvement on an AVG-only table — slugging is visible at all now,
where before it was nowhere — but the honest fix is a run-value-weighted
number on the season screen, and that is a design decision rather than a
tuning one. **Parked as an open question for the owner** (§5, question 5).

---

## 1. Two constraints set the order

**Retunes dominate cost.** Any engine change forces a fresh §7 band run
and §7.1 matrix at 10,000 games on two seeds. `TUNING.md` records two
configurations adopted on a 1,000-game reading and withdrawn at 10,000.
That is roughly a full session of measurement per change. **So: batch
engine changes into phases and retune once per phase, never per feature.**
Every phase below is drawn to end on one retune.

> Reviewer: the run itself is under a minute; the cost is the judgment
> loop. Two things shrink it. A CI regression at small N (§3) makes
> drift visible on the PR instead of at the next retune. And each phase
> should state up front which constants it expects to move, so the retune
> is a search over three or four levers rather than all of §7.2.

**New RNG draws invalidate saves.** ~~The engine replays a game from a
seed; any added draw shifts the stream, so in-flight seasons stop
replaying.~~

> Reviewer: withdrawn. A save stores the RNG position (`rngState` on
> `GameState` and on the season) and resumes from it; nothing in `src/`
> replays a game from its seed. A new draw changes what happens next,
> which the player cannot see, not whether the save loads. What does
> break a save is a schema change without a migration, and `migrate()`
> exists for that. So there is no reason to front-load "stream-changing"
> work and no reason on these grounds to put progression last. Phase E
> stays last for the other two reasons given under it. What this
> constraint should say instead: **every engine phase ships a migration
> or a test proving the old envelope still loads**, and tuning
> reproducibility (`TUNING.md` seeds) is re-established per phase, which
> the retune does anyway.

> Verified (rev 3): the reviewer is right and the original constraint was
> wrong. Every `makeRng` call on the app path is seeded from a stored
> position — `App.tsx:106`, `170` and `228` from `rngState`,
> `season.ts:437` and `660` likewise. The only seed-from-scratch call is
> `inning.ts:545` in `createGame`, which is a new game. Nothing replays a
> game forward from its original seed, so a new draw cannot invalidate a
> save. The replacement constraint above is the one that holds, and
> Phase E's position no longer rests on this.

---

## 2. The order

### Phase A — Fix the rating economy — **DONE (rev 4)**
*Features 0.6 above. Engine change, one retune. Results in §0.8.*

First because everything after it multiplies the rating economy. Ship
progression on top of an Eye rating worth 0.013 and you have built a
career mode over a rounding error; ship pitch grades on top of a Control
rating whose effect is invisible and the grades are decoration. Doing this
after the other phases means retuning all of them a second time.

Exit: `npm run tune` at 10,000 × two seeds, matrix extended with rate
bands, and `npm run probe ratings` showing all three ratings inside a
band of each other. **All three met** — see §0.8. The matrix carries
reported per-policy rates rather than bands, for the reason in §0.8.

### Phase B — Pitcher state: fatigue, the pen, and per-inning variance
*`FUTURE_FEATURES.md` 1, 2 and 4. Engine change, one retune.*

These are one feature wearing three hats. Fatigue needs cumulative
per-pitcher counts in `GameState`; the per-inning modifier needs a
per-half-inning roll held in `GameState`; relief needs both plus bullpens
in `opponents.ts`. All three touch the same `adj(Control)` term, the same
state, and the same retune. Splitting them costs three retunes for one
phase of work.

Internal order matters:

1. **Cumulative pitcher state + command decay**, with the pitch count and
   a fatigue cue on screen from the first commit. `FUTURE_FEATURES.md`
   asks whether the curve is visible to the player; the answer is that an
   invisible curve is a tax rather than a mechanic. This is also what
   finally makes Take pay — working a starter out of the game becomes a
   thing patience *does*.
2. **Bullpens**, with a sim hook rule (pitch count and runs allowed are
   enough; leverage can wait). Content work in `opponents.ts` plus the
   hook. ~~The player's own hook decision is deferred to Phase D, where
   the player is actually pitching.~~

   > Reviewer: take the player's hook decision here, not in Phase D. It
   > is one tap per game, offered between innings when the starter
   > crosses the fatigue threshold ("Stay with Raman" / "Go to the pen"),
   > so it fits the budget, and it is the only place the fatigue curve
   > becomes the player's problem rather than the opponent's. Without it,
   > Phase B is a feature the player watches. Per-game pitch counts are
   > already in `GameState` (`pitchCounts`); the cumulative-across-games
   > count is only needed for a pen rest rule, which §4 argues against.
3. **The per-inning modifier last, and only if B1 and B2 read clearly.**
   `FUTURE_FEATURES.md` already spots the risk: fatigue is monotonic and
   legible, per-inning noise is not, and stacking them can turn a readable
   pitcher into an arbitrary one. Add noise only once the signal is
   established, and cut it if the read gets muddier.

Why second: it is the largest gain in felt depth per unit of engine risk,
it needs nothing that does not already exist, and the late innings
currently feel identical to the early ones.

### Phase C — Pitch identity and location visibility
*Pitch types with grades, plus the location display. Engine change, one
retune.*

Deliberately **before** playing the pitching half, and deliberately as a
*batting-side* feature first. Build the pitch-type model where you already
have §7 bands to tune against: each pitcher gets at most three pitches
(one always a fastball), each with its own zone/whiff/contact profile, and
what the batter sees about the incoming pitch — type, location, or neither
— scales with Eye.

Three things fall out at once:

- Eye stops being inert, because the read carries real information and the
  rating governs how much of it you get. This is the durable fix for §0.3.
- Take becomes a skill expression rather than a count-management tic.
- The pitch-type model ships tuned and tested from the side of the game
  that already has targets, so Phase D is mostly UI and a policy.

Pitch types and location visibility ship together; they are the same
information channel and splitting them means tuning the channel twice.

> Reviewer: one constraint to write into the phase before it starts.
> **Pitch identity adds information, not taps.** The choice set stays
> Take / Contact / Power / Bunt. If the design drifts toward "guess the
> pitch" as a fourth decision, the phase has doubled the at-bat and
> should be stopped. The test is the §7 tap budget, unchanged.

### Phase D — Play the pitching half
*`FUTURE_FEATURES.md` 3. Largest item. Engine + UI, needs its own §7 bands.*

Last of the big four because it doubles the game and everything it needs
is built by then: fatigue and a pen to manage (B), pitches with grades to
select from (C), and a batter-side policy to pitch against (§5.4, already
there).

> Reviewer: split this phase, and build the first half before deciding
> whether the second is wanted at all.
>
> **D1 (rev 2): manage the pitching half, one decision per half-inning.**
> Before each opponent half, the player picks an approach for their
> pitcher: Attack (more zone, more contact allowed), Nibble (less zone,
> more whiffs and walks), or Pitch to contact (more balls in play, fewer
> pitches thrown, which matters once fatigue exists). The sim plays the
> half as now with those modifiers applied, and shows the recap. One tap,
> the tap budget holds, the opponent's half stops being a text box, and
> the batter model needs no opinion about sliders because there are no
> sliders. It reuses the tendency modifier and the whiff term that
> already exist, so the engine change is small and the retune is a
> matrix re-run.
>
> **D2: pitch by pitch, opt-in per game.** The original Phase D as
> written below. Build it only if D1 gets played more than once, and keep
> it opt-in per game for the tap-budget reason the draft already gives.

> **Decided (rev 3): split, and versioned.** D1 ships in **1.0.0**; D2 is
> **1.1 or later**, gated on D1 actually being played. One consequence to
> plan for: D1's three approaches are a modifier on `p_zone` and the whiff
> term, which means D1 needs the §7 bands re-measured with a non-neutral
> approach selected — a player who picks Nibble every half-inning is a
> new policy row, and the §7.1 matrix should gain one. Cheap, but it is
> a retune, so D1 is a phase and not a patch.

Two calls to make when you get here, both flagged in `FUTURE_FEATURES.md`:

- **Opt in per game, at least at first.** §7 targets 16–18 taps per
  half-inning and §2 makes the half-inning the stopping point. Pitching
  every half doubles the tap budget and breaks the premise the game is
  built on. Make it a choice per game and measure whether anyone opts in
  twice.
- **The batter model has to react to pitch type**, or pitch selection is
  a slot machine. The §5.4 policy is a swing-decision policy; it has no
  opinion about a slider. That is new work, and it is the real cost of
  this phase.

### Phase E — Progression and the franchise
*`FUTURE_FEATURES.md` 5. Save-schema work, season-level, low engine risk.*

Last of the named features, for three reasons. It is the one that needs
everything before it to be meaningful; it is the one that forces the
"what is a franchise" scope decision, which is bigger than the feature;
and it is the one whose value is destroyed by a bad rating economy, so it
wants Phase A to have settled first.

Two things to decide before writing any of it:

- **Twenty games is too small a sample to drive progression.** A hot 20
  games is noise. Either the season gets longer, or progression is mostly
  age and career arc with a small, heavily regressed performance term.
  `FUTURE_FEATURES.md` already names this; the answer should be "mostly
  age, lightly performance", and it should be stated in the design before
  it is coded.
- **Opponents have to progress too**, or league run scoring drifts with
  your roster and the §7 bands stop describing the league.

> Reviewer: I would drop performance-driven growth entirely and make the
> offseason a set of **owner choices**, which sidesteps the sample-size
> problem instead of regressing it away. Sketch, to be edited: after the
> season, the player (a) promotes one batter, +5 to one rating, capped at
> 80; (b) picks one of three generated players to replace any batter; and
> (c) watches age drift, where every batter past a career age loses 2 in
> one rating. Deterministic, legible on a single screen, no regression
> maths, and it gives the next season a reason to exist. For the
> opponents' side, use the difficulty ladder in §3 rather than an
> opponent progression model; it keeps the §7 bands describing the league
> by construction, because the ladder is a rating offset the tuning can
> be re-run at.

> **Decided (rev 3): the reviewer's offseason choices are the 1.x step,
> but career mode stays on the roadmap as a later release.** The owner's
> position: the reviewer's version is the right way to *find out* whether
> season-over-season play is fun before committing to the heavier thing,
> and the heavier thing — the career mode scoped before this document
> existed — remains wanted, provisionally as **2.0.0**. What is ruled out
> at every version is the simulation tier below that: no minor leagues,
> no contracts, no money. That level of management is more than the
> between-meetings premise can carry.
>
> Practical consequence for the 1.x design: build the offseason so the
> career version is an extension of it rather than a replacement. That
> means persisting a roster with per-player career totals from the first
> offseason, even though the 1.x offseason only needs this season's
> line — the ledger in §3 is the same data. It costs a wider schema now
> and saves a migration and a rewrite later.
>
> One interaction to watch: the +5 promotion and the §3 difficulty
> ladder's +2 to every opponent are the player's and the league's growth
> rates, and they have to be tuned against each other or the player
> outruns the league in four seasons. They are one decision, not two.

Phase E should ship *after* the season-over summary and the franchise
ledger (§3 below), because a career needs somewhere to be displayed
before it needs to exist.

---

## 3. Features worth adding

Not on the owner's list. Ordered by where they fit.

**A per-batter probe in the tuning harness — Phase A, prerequisite.**
Done, in this change: `npm run probe`. It is the tool that found
everything in §0, and the §7.1 rate bands in §0.6 are the deterministic
version of the same check. Listed here because it is a real dependency of
Phase A, not a nicety.

**Lineup editing — right after Phase A.** Already in `PLAN.md` Phase 4 as
a nice-to-have. It stops being a nice-to-have the moment ratings mean
something: Phase A's whole point is that a 65-Contact hitter should play
differently from a 40-Contact one, and the player currently cannot act on
that. Cheap, no engine change, and it makes Phase A legible.

**Pitcher stat lines for your own staff — with Phase B.** `season.ts`
accumulates Herons batting only. The moment there is a bullpen to manage,
the player needs ERA/K/BB/WHIP to manage it with, and right now they have
no read on their own pitchers at all. Small, and a hard dependency of
Phase D.

**Handedness and platoon splits — with Phase C.** Cheap in the engine (a
modifier on the existing terms), high flavour, and it turns both lineup
editing and relief pitching from bookkeeping into decisions — bring in the
lefty, sit the platoon bat. Fits naturally alongside pitch identity
because it is the same kind of information: something true about this
pitcher that changes what you should do.

**Season-over summary and a franchise ledger — before Phase E.** The
summary is in `PLAN.md` Phase 4. A 20-game season currently stops rather
than ends. The ledger (career lines, season-by-season) is the thing
progression writes into, and building the display first means Phase E has
somewhere to land instead of inventing a screen and a data model at once.

> Reviewer: add a **pennant game** to this item. If the player finishes
> first or second, the season ends with one game against the other for
> the pennant; otherwise it ends with the summary. It gives the 20 games
> a stake in the last week, costs no engine work (it is one more
> scheduled game with a flag), and it is the natural thing for the ledger
> to record.

**Keyboard play on the laptop — ship any time (rev 2).** The stated use
case is a break between meetings, which is mostly a laptop. Bind Take,
Contact, Power and Bunt to keys (1–4, or T/C/P/B), Enter for the primary
button on every other screen. No engine change, an afternoon of work, and
it changes how the game feels in its main setting more than anything in
Phase B.

**A tuning regression in CI — with Phase A (rev 2).** A test that runs
the harness at a small N (about 2,000 games) and fails if any §7 band or
§7.1 row moves outside a widened guard. Not a replacement for the 10,000
× two-seed retune, which stays manual; it is what stops an engine PR
from drifting the game between retunes. This is the "capture repeatable
behaviour in deterministic code" version of the retune discipline.

> Measured (rev 3): N = 2,000 runs in **40 seconds** and is more stable
> than `TUNING.md`'s warning suggests — that warning is about 1,000-game
> runs. Measured against the committed 10,000-game figures, the matrix
> rows at N = 2,000 come in at 56.4 / 96.8 / 104.2 / 95.4 / 111.5 against
> 57.6 / 97.7 / 103.1 / 95.4 / 110.6: **every row within 1.2 points**, and
> the band table within a hundredth on every row. So: run it at N = 3,000
> (about a minute), guard the band table tightly and the matrix rows at
> ±5 points, and keep the 10,000 × two-seed run as the thing that moves a
> band. Size the guards off a recorded baseline in the test file, not off
> the §7 bands, so the test catches *drift* rather than re-asserting what
> `tune.ts` already checks.

**A difficulty ladder — with the season-over summary, instead of opponent
progression (rev 2).** Each new season, if the player won the pennant,
every opponent's ratings rise by 2, capped at 70; otherwise unchanged.
It is the league progressing, for one constant and one line of season
state, and the §7 bands can be re-measured at each rung.

## 4. Features worth not adding

**Stolen bases and base-running decisions** (`PLAN.md` Phase 4). Adds a
decision per baserunner and competes with pitch selection for the same tap
budget, in a game whose premise is one half-inning per coffee break.
Revisit after Phase D, and only if the tap budget survived it.

**Injuries and a rest model.** `FUTURE_FEATURES.md` raises rest as a
consequence of a used-up bullpen. Over 20 games an injury is mostly a
frustration with no time to recover from, and it adds season-level state
for very little. If a pen needs a rest rule, keep it to pitcher
availability inside a short window, not a health model.

---

## 5. The questions

The first four are **decided as of rev 3**; the answers are folded into
§0–§4 above and repeated here with the reasoning that produced them. Kept
as questions rather than rewritten as statements so the next reader can
see what was traded away.

**Questions 5 and 6 are open.** Question 5 is new in rev 4: Phase A
surfaced it and could not settle it.

1. **Is a .300-hitting team the bug, or the fantasy the game is selling?**
   Phase A can make the visible stats honest (batting average tracks run
   value, Contact costs what it buys), or it can keep the stats generous
   and make the *other* buttons feel as good. These are different games.
   Everything in §0.6 assumes the first.

   > Reviewer: honest stats, but reached by fixing the ratings (challenge
   > term on Power, check swing for Eye, OPS on screen), not by nerfing
   > average. If a Contact masher hits .290 after Phase A and a reader
   > scores more, that is the right game. A .300 team is fine when it is
   > earned by a good roster rather than by one button.

   > **Decided (rev 3): balance the options, do not raise the difficulty.**
   > The reviewer's framing, with one substitution the measurement forces:
   > the challenge term moves off 0.50 by being *reduced*, not by being
   > hung on Power — that was tested and inverts the Power rating instead
   > (§0.4). Check swing and OPS on screen are in as proposed. The success
   > test for Phase A is §0.7's spread row reaching roughly 2×, not the
   > team average reaching any particular number.

2. **The strikeout band: meet it, or widen it to 26–30%?** `TUNING.md`
   frames it as a genuine fork. Phase A is the cheapest place to settle
   it.

   > Reviewer: widen, to 22–28%. See §0.6 item 4.

   > **Decided (rev 3): widen to 22–28%.** See §0.6 item 4.

3. **Does Phase D's pitching half replace the simulated half, or sit
   beside it as an option?** This changes whether Phase D is a feature or
   a second game.

   > Reviewer: beside it, opt-in, and only after D1 (one decision per
   > half-inning) has been played. D1 may be all the pitching half the
   > game needs.

   > **Decided (rev 3): split. D1 in 1.0.0, D2 in 1.1 or later.** See
   > Phase D.

5. **Should the season screen carry a run-value-weighted stat instead of
   OPS?** New in rev 4, and the one thing Phase A could not fix (§0.8).
   OPS ranks an always-Power approach level with a thoughtful one while
   the thoughtful one scores seven points more runs, because OPS weights
   on-base and slugging equally and this engine does not. The options are
   to leave OPS (honest about slugging, wrong about value), to weight it
   (`OBP * 1.8 + SLG`, an OPS+-ish number that needs a name a player will
   accept), or to show something else entirely. This is a design call
   about what the game wants the player to optimise, which is why it is
   here rather than decided.

6. **Is "franchise" in scope at all?** Progression without a persistent
   roster across seasons is a stat that gets thrown away. If the answer is
   no, Phase E shrinks to an end-of-season ratings report and the ledger
   work in §3 is most of it.

   > Reviewer: in scope only as a persistent roster plus the offseason
   > choices in Phase E and a ledger. No contracts, no money, no minors.
   > If that still sounds like too much, the difficulty ladder alone gives
   > seasons a shape and costs almost nothing.

   > **Decided (rev 3): yes, in two steps.** The reviewer's version is
   > 1.x and is how we find out whether season-over-season play is fun.
   > The fuller career mode stays on the roadmap, provisionally 2.0.0.
   > Minor leagues, contracts and money are ruled out at every version.
   > See Phase E for the schema consequence — persist career totals from
   > the first offseason, so 2.0 extends the 1.x data instead of
   > replacing it.
