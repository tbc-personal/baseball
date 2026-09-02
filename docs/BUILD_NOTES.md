# Build notes

Written for the reviewer described in `HANDOFF_PROMPT.md`: read this, then
the commit history, then run the tests.

## 1. Status

All eleven tickets, T0 through T10, are complete and committed one per
commit, in order. 269 tests pass. `npm run lint`, `npm test`,
`npm run typecheck` and `npm run build` are green at **every** commit in
the history, not only at the tip — verified by checking out each ticket
commit in a worktree and running all three.

One caveat on that claim: at T0, T1 and T2 the ESLint flat config was
defective (see §3), so lint passed at those commits while checking less
than it appeared to. It has been correct since T3 and the existing code
passes the real rules.

Nothing is left undone within the ticket scope. Phase 4 items in
`PLAN.md` — lineup editing, stolen bases, a pitching mode, a season-over
summary screen, a Capacitor iOS wrapper — are out of scope and absent.

The one target not met is the §7 always-Contact balance check. It is not
an omission; it is unachievable alongside the walk-rate band by adjusting
constants. See §4 and `TUNING.md`.

## 2. Deviations from spec

**The walk-off (`GAME_DESIGN.md` §4).** §4 states only an end-of-half
check for game end, which would let the home team keep batting after
taking the lead in the bottom of the 9th. §6 lists "first walk-off" as a
milestone, so the spec contradicts itself. Implemented the real-baseball
reading: once regulation is complete, the home team taking the lead ends
the game immediately.

**Ball-side count modifiers zeroed (§3.2).** The tuning pass set the
`3-0`, `2-0`, `3-1`, `1-0`, `2-1` and `3-2` entries of `COUNT_MOD` to 0.
This is the change that makes walks possible at all; the strike-side
entries are untouched. The cost is that a pitcher behind 3-0 is no longer
more likely to throw a strike. Full reasoning and measurements in
`TUNING.md`.

**Other tuned constants.** `BASE_ZONE_PROBABILITY`,
`READ_BUCKET_LIKELY_BALL`, both outcome tables, and two base-running
probabilities all moved. Every change is a value in `constants.ts`; no
table gained or lost a row and no mechanic was added. Itemised with
before/after values in `TUNING.md`.

**Batted-ball rows normalised to sum to 1.0.** Some rows as tuned summed
to 1.015. `rngPick` normalises internally, so such a row silently shifts
every probability away from its declared value — the table said one thing
and the engine did another. The rows now sum to exactly 1.0.

**Pitcher pitch count (`Main.dc.html`).** The mockup shows "61 pitches"
next to the read. `GameState` has no cumulative per-pitcher counter and
adding persisted state to match a mockup label was not worth it, so the
screen shows "N this at-bat", which is derivable from real state.

**Season standings use short team names.** `Season.dc.html` does too;
full names wrap onto two lines in that narrow table.

**`previewOf` returns data, not a formatted string.** §6.1 specifies the
preview line's content; the wording is assembled in the UI so the store
stays presentation-free.

**Save code size.** §6.1 estimates 1.5–2 KB. Measured: 1243 bytes for an
end-of-season save, 984 bytes mid-season. Under the estimate, which is
better for pasting. The doc was left as written.

## 3. Ambiguities resolved

**"Recommended choice" (`Main.dc.html`).** The mockup fills one choice
button but nothing defines what recommended means. Implemented as the
simplest rule matching the mockup's example — `Likely strike` → Power,
`Likely ball` → Take, `Coin flip` → Contact — in `src/engine/recommend.ts`,
commented as a UI affordance rather than a game rule. It is not consulted
by the engine or the opponent policy.

**Other teams' win probability (§5.3).** The doc says other teams' games
are decided by "a single roll per game, p(win) from the Contact+Power+Eye
sum difference" but gives no formula. Used a logistic on the rating-sum
difference, scaled so weakest-vs-strongest is about 73%. The shape is a
choice, not a specification, and is commented as such. Simulated games also
need a score for run differential, which the doc does not specify either;
that is a documented roll.

**Milestones (§6).** "Clinch" and "eliminated" have no playoff mechanic to
attach to, so they are read as clinching or being eliminated from a winning
(>.500) season. "Walk-off" and "shutout" are scoped to Herons-favourable
events.

**OBP.** `BatterStats` is the fixed §6 list and has no sacrifice-fly
counter, so OBP is `(H+BB)/(AB+BB)` — the standard formula with HBP and SF
at zero.

**Bunt pop-up (§3.6).** "Batter out, runners hold" is taken literally as a
deterministic override, not subject to §4's double-play or sacrifice-fly
rolls.

**Pitches per plate appearance.** Measured as every pitch the batter sees,
including the ball in play that ends the appearance.

## 4. Tuning

See [TUNING.md](TUNING.md).

All eight numeric bands in §7 pass, from a starting point where six failed
— including a walk rate that was not merely low but **exactly zero across
739,000 plate appearances**, because §3.2's count modifiers push the read
toward "Likely strike" exactly as balls accumulate, so §5.4's policy could
never reach ball four. Runs 4.83 (4.20–4.90), average .252, OBP .321,
strikeouts 23.8%, walks 9.3%, home runs 1.20, pitches per plate appearance
3.81, plate appearances per half-inning 4.32. Stable across seeds.

The §7 always-Contact check measures 48% against a "within 10%"
requirement, and **cannot be satisfied at the same time as the 8–10% walk
band by adjusting constants**. The two requirements pull in opposite
directions along one axis: a walk rate in band requires taking to be
frequent and valuable, and a player who never takes forgoes exactly that.
Measured tradeoff and the evidence ruling out the alternatives — including
that making the Power and Contact rows identical still yields 49%, so §7's
own suggested remedy does not apply — are in `TUNING.md`, with three
options for resolving it. Each requires a rule change, so the decision is
the owner's.

## 5. Known gaps

- **The always-Contact balance target is unmet**, as above. A player who
  mashes one button will have a markedly worse season than one who reads
  the pitcher. Whether that is a bug or the point is a design call.
- **Not verified on a real device.** No iOS or Android hardware here, so
  home-screen install, the maskable icon under Android's adaptive mask, and
  iOS clipboard behaviour are unverified. The service worker, offline
  reload from precache, and the manifest's `start_url`/`scope` were checked
  against the built output in headless Chromium.
- **No Lighthouse run.** The T9 acceptance criterion names the Lighthouse
  installable check; it was not run.
- **Pages deployment is unverified** and will stay that way until the owner
  makes the repo public and sets Settings → Pages → Source to "GitHub
  Actions". See the README.
- **Google Fonts are loaded from a CDN.** Blocked in this sandbox, so every
  screenshot here rendered on the fallback stacks. The fallbacks are the
  ones the mockups specify and the layout holds, but the app has never been
  seen in Oswald and Courier Prime.
- **UI tests cover extracted presentation logic, not rendering.**
  `@testing-library/preact` is not a dependency and adding one was out of
  scope, so components are kept thin and their logic is tested as pure
  functions. This is a real gap: it is exactly the gap that let 17
  camelCase SVG attributes go unnoticed in T7 until the screen was
  screenshotted and its DOM measured.
- **Milestones are computed but not surfaced.** `checkMilestones` runs and
  records what fired; §6 asks for a line on the between-innings screen and
  that line is not rendered yet.
- **Standings ordering at 0-0** falls back to a tiebreak, so a fresh season
  shows an arbitrary-looking order.
- **The engine has no bunt policy for the opponent.** §5.4's policy never
  bunts, as written; this is intentional and commented.

## 6. How to run

```bash
npm install   # install dependencies
npm run dev   # dev server at http://localhost:5173/baseball/
npm test      # 269 tests
npm run tune  # 10,000 simulated games, printed against the section 7 bands
```

---

# Round 2 (after REVIEW_1.md)

Seven commits, R1 through R7. R1–R5 are the items in
`HANDOFF_PROMPT_2.md`; R6 and R7 are a rule change the owner asked for
mid-round and the retune it required.

## 1. What changed

**R1 — the count reset.** `applyPitch` reset the count only at the end of a
half-inning, so the next batter inherited the previous batter's count: 0-2
after a strikeout at 0-2, 3-0 after a walk. §3.4 says the count is per
plate appearance. Fixed, with the two new §4.1 scenario tests and a
pitch-by-pitch trace test that plays an always-Take half-inning and asserts
every plate appearance lasts at least three pitches — the hard floor when
every pitch is taken. All three fail without the fix; I checked by
reverting it.

**R2 — the revised rules.** `COUNT_MOD` back to §3.2 (the ball-side entries
had been zeroed), `BASE_ZONE_PROBABILITY` to 0.48, `READ_BUCKET_LIKELY_BALL`
to 0.45, both outcome tables to their §3.4/§3.5 values, base running to §4,
and `opponentChoice` to the new count-aware §5.4 policy. Only the §5.4 tests
encoded the old values; nothing else in the suite hardcoded a tuned number.

**R3 — the policy matrix.** `npm run tune` prints the §7.1 matrix after the
band table: five policies head-to-head against the sim policy, alternating
home and away *per game* (the old always-Contact check alternated once per
21-game pairing cycle), with each policy's own walk rate and pitches per
plate appearance from a mirror batch. Overall PASS now needs every band and
every matrix row.

**R4 — the retune, within §7.2.** Roughly 250 configurations measured across
the legal space. Best achievable: three of eight bands, and a matrix that
passed on the default seed with two rows inside a point of their ceiling and
failing on a re-seed. Committed as the closest result, with the conflict
documented.

**R6 — the two-strike rule change (owner decision).** §3.2's two-strike
modifiers went from 0-2 −0.20 / 1-2 −0.12 / 2-2 −0.05 to −0.08 / −0.05 /
−0.02, and `p_zone` gained `challenge_mod = -adj(Contact) * CHALLENGE_WEIGHT`
so a pitcher challenges a weak-contact hitter and works around a dangerous
one. `zoneProbability` takes the batter for this; it is the only
batter-dependent term. `GAME_DESIGN.md` §3.2 and §7.2 are updated to match.

**R7 — the retune under the new rule.** `BASE_ZONE_PROBABILITY` 0.515,
`CHALLENGE_WEIGHT` 0.50; the tables are unchanged from R4.

**R5 — the two UI items.** The between-innings screen renders a milestone
band when one fired, and `standingsTable`'s last tiebreak is the team's
display name rather than its id, so a fresh 0-0 season reads alphabetically.

## 2. Deviations from spec

**§3.2 two-strike modifiers and the challenge term (R6).** A real change to
a table §7.2 marks non-tunable, made on the owner's explicit instruction
after they saw the strikeout diagnosis. `GAME_DESIGN.md` §3.2 is rewritten
to state the new rule, and `CHALLENGE_WEIGHT` is added to §7.2's tunable
list, so the spec and the code agree. Everything in `TUNING.md` from R4
downwards is the evidence that the change was necessary and not merely
convenient.

**`REVIEW_1.md`'s predicted numbers do not reproduce.** The review states
that with the bug fixed and the spec's constants restored, always-Take
drops to 17% of the sim. Measured, it is 142%. The review's diagnosis of the
*bug* was exactly right; its forecast of the post-fix matrix was not, because
the sim policy at the spec's starting values strikes out 41% of the time and
a batter who never swings beats that. Worth flagging since the review used
that number as evidence the design was sound.

**Everything else** is as round 1 left it. The round-1 deviations recorded
above — the walk-off reading, the pitcher pitch-count label, short team names
in standings, `previewOf` returning data — all still stand. The one that does
not is "ball-side count modifiers zeroed": those are back at their §3.2
values.

## 3. Ambiguities resolved

**Milestone wording.** §6 names the milestones and asks for a line between
innings, but neither §6 nor `Between.dc.html` specifies the text, so the
labels ("First home run of the season", "Winning season clinched", and so
on) are mine and live in `format.ts` with the other presentation logic.
Please review them for voice. An unknown id renders as the raw id rather
than being silently dropped.

**The walk arm of the new §4.1 count-reset scenario.** The scenario reads
"Given a count of 1-2 and a batter who strikes out (or walks, or puts the
ball in play)". A walk cannot happen on one pitch from 1-2, so that arm of
the test starts at 3-2, the latest count it can reach ball four from. The
strikeout and ball-in-play arms are at 1-2 as written.

**`CHALLENGE_WEIGHT` range.** The owner specified the behaviour, not the
number. 0.40 is written into §3.2 as the starting value with a 0.20–0.60
tuning range, chosen so the term spans roughly ±0.12 of `p_zone` across the
20–80 rating scale — comparable to the pitcher tendency modifier (±0.08) and
smaller than the biggest count modifier (+0.20). Tuned to 0.50.

## 4. Tuning

See [TUNING.md](TUNING.md). In one paragraph: at `BASE_ZONE_PROBABILITY`
0.515 and `CHALLENGE_WEIGHT` 0.50, with the swing table at
`0.50/0.40/0.10` (Contact zone), `0.30/0.50/0.20` (Contact ball),
`0.30/0.50/0.20` (Power zone) and `0.10/0.50/0.40` (Power ball), the
batted-ball rows at `0.5607/0.3121/0.0809/0.0116/0.0347`,
`0.825/0.14/0.028/0.0035/0.0035`, `0.5422/0.1635/0.1308/0.0109/0.1526` and
`0.818/0.091/0.049/0.007/0.035`, and base running at 0.78 / 0.40 / 0.58
(double play and sacrifice fly unchanged), 10,000 games give runs 4.42,
average .255, OBP .321, strikeouts 27.9%, walks 8.8%, home runs 1.03,
pitches per plate appearance 3.72 and plate appearances per half-inning
4.34 — seven of eight bands, the strikeout rate 2.9 points high — while the
§7.1 matrix passes every row with margin (always Take 57.6%, always Contact
97.7%, always Power 103.1%, take-until-two-strikes 95.4%, the reading
policy 110.6%), and seed 777 reproduces every verdict.

## 5. Known gaps

- **The strikeout band is still missed**, 27.9% against 20–25%. Closing it
  needs either a further cut to the two-strike modifiers or Power's in-play
  rate on balls raised, and the second was measured: it buys one point of
  strikeout rate for seven points of always-Power margin. `TUNING.md` has
  the numbers and the two honest options.
- **The matrix has margin but not a lot on one row.** Always Take is 57.6%
  against a 60% ceiling. Any future engine change should re-run
  `npm run tune` at 10,000 games on two seeds before being trusted; matrix
  rows move five or six points between 1,000-game runs, and two candidates
  were adopted and then withdrawn this round on exactly that mistake.
- **Milestone rendering is still not covered by an automated DOM test.**
  `@testing-library/preact` is not a dependency, so `milestoneLine` is
  unit-tested and the band is checked only by the manual playthrough below.
- Everything in round 1's "Known gaps" that was not about tuning still
  applies: no device testing, no Lighthouse run, unverified Pages deploy,
  Google Fonts never seen in this sandbox.

## 7. Alpha verification (0.1)

Before tagging 0.1 the built app was driven in headless Chromium at a
390x844 viewport — the first time anyone had played it rather than tested
it. What was checked, and what it found:

- **A full nine-inning game, plus a ten-inning one**, choosing by the read
  (Power on `Likely strike`, Take on `Likely ball`, Contact on `Coin flip`).
  119 and 148 clicks respectively, no uncaught errors, no console errors
  beyond the blocked Google Fonts request.
- **Two real bugs, both fixed** in the commit before the tag: the
  between-innings screen drew a blank box score at the end of every game,
  and the standings tiebreak sorted on a name the standings table does not
  print. Neither was reachable by the existing tests, because both are in
  the seam between `App.tsx` state and a screen's props — exactly the gap
  round 1 named when it said the UI tests cover extracted logic and not
  rendering.
- **The milestone band renders**, verified visually ("First home run of the
  season") — the R5 item, now confirmed in the real app rather than only as
  a pure function.
- **The challenge term reads sensibly on the at-bat screen.** The read
  varies by batter as intended.
- **Persistence survives a reload** mid-at-bat: the home screen came back
  with "Top of the 1st. Nobody on, two outs, Achterberg up. You left it at
  a 0-1 count."
- **The save code round-trips**: 993 bytes, `SS1-` prefix, copied to the
  clipboard from the settings screen.

Still unverified, and unverifiable here: real iOS/Android hardware,
home-screen install, the Pages deployment itself, and the app rendered in
Oswald and Courier Prime rather than the fallback stacks.

## 6. How to run

Unchanged from round 1. `npm install`, `npm run dev`, `npm test` (285
tests), `npm run tune`.
