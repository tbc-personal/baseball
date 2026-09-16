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
2. **Rebalance the challenge term against the count modifiers** so Contact
   raises batting average rather than walk rate, and re-derive the
   two-strike read table (`TUNING.md` has the shape of that table).
   Probably `CHALLENGE_WEIGHT` toward 0.25 and `CONTACT_SHIFT_OUT` up from
   0.5 — both to be measured, not assumed.
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

5. **Put a slugging-aware number on the season screen.** OPS at minimum,
   and make it the default sort. If AVG is the only number the player
   reads, AVG is the only thing they will optimise, whatever the tables
   say.

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

---

## 2. The order

### Phase A — Fix the rating economy
*Features 0.6 above. Engine change, one retune.*

First because everything after it multiplies the rating economy. Ship
progression on top of an Eye rating worth 0.013 and you have built a
career mode over a rounding error; ship pitch grades on top of a Control
rating whose effect is invisible and the grades are decoration. Doing this
after the other phases means retuning all of them a second time.

Exit: `npm run tune` at 10,000 × two seeds, matrix extended with rate
bands, and `npm run probe ratings` showing all three ratings inside a
band of each other.

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

## 5. Open questions for the owner

Ordered by how much they change the plan. Each carries the reviewer's
recommended answer (rev 2); the decision is the owner's.

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

2. **The strikeout band: meet it, or widen it to 26–30%?** `TUNING.md`
   frames it as a genuine fork. Phase A is the cheapest place to settle
   it.

   > Reviewer: widen, to 22–28%. See §0.6 item 4.

3. **Does Phase D's pitching half replace the simulated half, or sit
   beside it as an option?** This changes whether Phase D is a feature or
   a second game.

   > Reviewer: beside it, opt-in, and only after D1 (one decision per
   > half-inning) has been played. D1 may be all the pitching half the
   > game needs.

4. **Is "franchise" in scope at all?** Progression without a persistent
   roster across seasons is a stat that gets thrown away. If the answer is
   no, Phase E shrinks to an end-of-season ratings report and the ledger
   work in §3 is most of it.

   > Reviewer: in scope only as a persistent roster plus the offseason
   > choices in Phase E and a ledger. No contracts, no money, no minors.
   > If that still sounds like too much, the difficulty ladder alone gives
   > seasons a shape and costs almost nothing.
