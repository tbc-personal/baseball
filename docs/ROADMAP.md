# Roadmap

Ordering for the features parked in `docs/FUTURE_FEATURES.md` and
`docs/PLAN.md` Phase 4, plus a balance problem that changes the order.

**Provenance.** The feature list is the owner's. Everything else here —
the ordering argument, the balance diagnosis, the added features, the
parked ones — is Claude's, written to be edited. Prose is Claude's
composition throughout; the numbers are measured, and every table says how
to reproduce it.

---

## 0. The balance problem comes first, and it is not the one we thought

Short version: **Contact is not overpowered in runs. It is overpowered in
the stats the game shows you.** And the real defect underneath is that
**Eye is worth almost nothing and the Contact *rating* has been quietly
converted into a walk rating.**

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
worse, for the same output. The season screen prints AVG and K. It does
not print run value. A player mashing Contact sees a .311 team that never
strikes out and correctly concludes the button is working; the cost —
every walk in the season, and about a third of a pitch per PA off the
opposing starter — is charged to a ledger nobody can see.

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
   OBP, SLG and K% per policy too. Cheapest change here, no engine risk,
   and it is what catches the next one of these. Do it first.
2. **Rebalance the challenge term against the count modifiers** so Contact
   raises batting average rather than walk rate, and re-derive the
   two-strike read table (`TUNING.md` has the shape of that table).
   Probably `CHALLENGE_WEIGHT` toward 0.25 and `CONTACT_SHIFT_OUT` up from
   0.5 — both to be measured, not assumed.
3. **Give Eye a second channel.** Read accuracy alone cannot carry a
   rating, because a player who ignores the read zeroes it out. The
   durable fix is pitch-location visibility with fidelity scaled by Eye
   (Phase C) — which is the argument for pulling that feature forward.
   An interim: let Eye shade borderline called strikes, so a patient
   hitter genuinely gets a wider zone.
4. **Take the strikeout band decision.** 27.9% against a 20–25% target,
   and `TUNING.md` says the two honest options are a further §3.2 change
   or widening the band to 26–30%. Phase A is a retune anyway; decide it
   here rather than carrying it through four more phases. Power's zone
   whiff rate at 0.20 is what produces the 39% always-Power K rate, and
   trimming it against HR share attacks both problems at once.
5. **Put a slugging-aware number on the season screen.** OPS at minimum.
   If AVG is the only number the player reads, AVG is the only thing they
   will optimise, whatever the tables say.

---

## 1. Two constraints set the order

**Retunes dominate cost.** Any engine change forces a fresh §7 band run
and §7.1 matrix at 10,000 games on two seeds. `TUNING.md` records two
configurations adopted on a 1,000-game reading and withdrawn at 10,000.
That is roughly a full session of measurement per change. **So: batch
engine changes into phases and retune once per phase, never per feature.**
Every phase below is drawn to end on one retune.

**New RNG draws invalidate saves.** The engine replays a game from a seed;
any added draw shifts the stream, so in-flight seasons stop replaying.
That argues for landing stream-changing work early, while nobody has a
season they care about, and for batching it — and it argues that
progression (which implies a career worth preserving) goes last.

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
   hook. The player's own hook decision is deferred to Phase D, where the
   player is actually pitching.
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

### Phase D — Play the pitching half
*`FUTURE_FEATURES.md` 3. Largest item. Engine + UI, needs its own §7 bands.*

Last of the big four because it doubles the game and everything it needs
is built by then: fatigue and a pen to manage (B), pitches with grades to
select from (C), and a batter-side policy to pitch against (§5.4, already
there).

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

Ordered by how much they change the plan.

1. **Is a .300-hitting team the bug, or the fantasy the game is selling?**
   Phase A can make the visible stats honest (batting average tracks run
   value, Contact costs what it buys), or it can keep the stats generous
   and make the *other* buttons feel as good. These are different games.
   Everything in §0.6 assumes the first.
2. **The strikeout band: meet it, or widen it to 26–30%?** `TUNING.md`
   frames it as a genuine fork. Phase A is the cheapest place to settle
   it.
3. **Does Phase D's pitching half replace the simulated half, or sit
   beside it as an option?** This changes whether Phase D is a feature or
   a second game.
4. **Is "franchise" in scope at all?** Progression without a persistent
   roster across seasons is a stat that gets thrown away. If the answer is
   no, Phase E shrinks to an end-of-season ratings report and the ledger
   work in §3 is most of it.
