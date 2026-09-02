# Future features

Ideas parked for later, with enough detail to pick up cold. Nothing here is
scheduled, specified or committed to. Anything that changes the engine will
need a §7 retune and a fresh §7.1 policy matrix — see `docs/TUNING.md` for
why that is not a formality.

Everything below is the owner's idea; the notes under each are mine
(implementation sketches and open questions), so treat the prose as a
starting point to edit rather than settled design.

---

## 1. Pitcher command decay by pitch count

As the opposing pitcher's pitch count climbs, his command degrades on a
curve — by around 110 pitches he is noticeably worse.

**Sketch.** A multiplier on the pitcher's effective Control that falls with
cumulative pitches, exponential rather than linear so the first 70 pitches
cost little and the last 30 cost a lot. It feeds §3.2's `adj(Control)`
term, so nothing else in the pitch model has to know about it.

**Open questions.**
- Does it decay `p_zone` only, or Stuff (whiff rate) too? Real fatigue costs
  both, but moving Stuff changes the strikeout rate, which is already the
  one §7 band that misses.
- Is the curve visible to the player? A pitch count on screen (already
  planned) plus a visible fatigue cue is most of the payoff.
- Requires the cumulative per-pitcher count that `GameState` does not
  currently carry.

## 2. Per-inning command modifier

Within an inning the pitcher gets a small random modifier to his command,
so he has better and worse innings rather than a flat performance.

**Sketch.** One roll per pitcher per half-inning, a narrow band (±0.03 to
±0.05 on `p_zone`, well inside the tendency modifier's ±0.08), drawn from
the seeded RNG when the half-inning starts and held in `GameState` so a
save resumes with the same inning.

**Open questions.**
- Interacts with decay above: fatigue is monotonic, this is noise. Both at
  once may make the read feel arbitrary rather than readable.
- Any new RNG draw changes the stream, so the tuning numbers and every
  existing save's replay shift. Worth batching with other engine work.

## 3. Play the pitching half too, with pitch selection

Instead of simulating the opponent's half, pitch it: each pitcher has at
most three pitches, at least one of which is always a fastball.

**Sketch.** The biggest of these by a distance — it roughly doubles the
game. Needs a pitch-type model (each pitch with its own zone/whiff/contact
profile), a batter-side policy to hit against, and a second set of §7
bands, because the current ones describe a league where both sides use the
§5.4 policy.

**Open questions.**
- Tap budget. §7 targets 16–18 taps per half-inning; pitching every half
  doubles that, and §2 calls a half-inning the natural stopping point.
- Does the player pitch every half, or opt in per game?
- Is the sim policy still the opponent's batting policy, or does pitch
  selection need a batter model that reacts to pitch type?

## 4. Relief pitching

Starters come out, relievers come in.

**Sketch.** Falls out of decay (1) fairly naturally: once the starter's
command has degraded past some threshold the opponent goes to the pen. Each
team needs a bullpen in `opponents.ts` — currently they carry a small
rotation only. For the player's own team it becomes a decision, which is a
different kind of game than "pick a swing".

**Open questions.**
- Who decides, the player or the sim? Both, eventually, but the sim needs a
  hook rule (pitch count, runs allowed, or leverage).
- Does a reliever's appearance persist across games, so a pen can be used
  up? That implies a rest model and season-level state.

## 5. Player progression across seasons

Ratings evolve season to season based on in-season performance.

**Sketch.** After a season, each batter's Contact/Power/Eye move by a small
amount driven by how they actually hit relative to their ratings, with age
or a career arc pulling in the other direction so nobody grows forever. The
save schema already versions and migrates, so carrying ratings forward is
mostly a `SeasonState` change plus a migration.

**Open questions.**
- Regression to the mean matters more than the reward: a 20-game sample is
  tiny, and a hot 20 games should not turn a 45 Contact hitter into a 70.
- Does the roster persist at all today? A new season currently starts from
  the fixed §5.1 roster; progression implies a career, which implies
  deciding what a "franchise" is.
- Interacts with the §7 bands: if the player's roster drifts upward, league
  run scoring drifts with it unless opponents progress too.

---

## Not in this file

Items already tracked elsewhere and deliberately not repeated here:

- The §7 strikeout band, still 27.9% against a 20–25% target, and the two
  rule-change options for closing it — `docs/TUNING.md`.
- Phase 4 items from the original plan (lineup editing, stolen bases, a
  season-over summary screen, a Capacitor iOS wrapper) — `docs/PLAN.md`.
