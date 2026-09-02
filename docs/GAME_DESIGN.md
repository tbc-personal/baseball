# Short Season — Game Design

Working title. A turn-based baseball game where one break at work is one
half-inning. No timing, no reflexes, no penalties for walking away
mid-pitch.

---

## 1. The pitch (in the other sense)

You run the batting side of a fictional team through a 20-game season. The
opponent's half-innings are simulated instantly. Yours are played one pitch
at a time with a single decision per pitch: **Take**, **Contact**, or
**Power**, plus **Bunt** when it makes sense. Counts, runners, and outs do
the rest.

Design goals, in order:

1. **Stoppable anywhere.** State saves after every pitch. Close the tab in a
   3-2 count and pick it up next week.
2. **Low intensity.** No timers, no animation you have to wait for, nothing
   that punishes a slow tap.
3. **A half-inning fits a break.** Target 60 to 90 seconds, 15 to 25 taps.
4. **Enough baseball to feel like baseball.** Counts matter, situations
   matter, a 3-1 Power swing with the bases loaded should feel like
   something.
5. **Persistent but low stakes.** A season and stat lines give continuity.
   Losing costs nothing.

Non-goals: fielding, pitching controls (v1), multiplayer, monetization,
notifications, realism beyond "the numbers look like baseball numbers".

---

## 2. Session structure

```
Break 1:  Home → play Top 1 (you bat if away) or Bottom 1 → summary → close
Break 2:  Home shows "Bottom 3rd, Herons 2 – Wrens 1. Play the 3rd" → ...
...
Game ends after 9 innings (extra innings if tied). Season is 20 games.
```

- **Home screen** always shows exactly one primary action: continue the
  current half-inning, start the next one, or start the next game.
- **Opponent half-innings** are simulated when your half ends and shown as
  a two-line summary on the between-innings screen. You never wait for
  them.
- **Between-innings screen** is a natural stopping point: it recaps your
  half, shows the opponent's half, and offers "Play the next inning" or
  "Done for now". Either is fine; nothing is lost.

Home/away alternates by game. When you are the home team you bat second, so
your first break of a game starts with the opponent's top half already in
the recap.

---

## 3. The at-bat: choices and pitch resolution

Every pitch, the game shows:

- Count, outs, runners on a diamond, score and inning.
- The batter's card: name, position, three ratings.
- A **read** on the pitcher: one of `Likely strike` / `Coin flip` /
  `Likely ball`. This is the batter's guess at whether the next pitch will
  be in the zone. Its accuracy depends on the batter's Eye rating.
- Three buttons, four when a bunt situation applies.

### 3.1 Ratings

All ratings use the scouting 20–80 scale (50 = league average).

| Batter | Meaning in the engine |
|---|---|
| **Contact (C)** | Lowers whiff rate; shifts batted balls from outs toward singles |
| **Power (P)** | Shifts batted balls from singles toward doubles and home runs |
| **Eye (E)** | Makes the read more accurate |

| Pitcher | Meaning in the engine |
|---|---|
| **Control (K)** | Raises in-zone probability |
| **Stuff (S)** | Raises whiff rate on swings |
| **Tendency** | `Attacker` (+0.08 zone), `Nibbler` (−0.08 zone), `Neutral` |

Rating effect formula, used everywhere a rating "shifts" a number:

```
adj(rating) = (rating - 50) / 100        # range −0.30 … +0.30
```

### 3.2 Is the pitch in the zone?

```
p_zone = BASE_ZONE + count_mod + adj(Control) + tendency_mod + challenge_mod
```

`BASE_ZONE` starts at **0.48** and is a tuning lever with range 0.42–0.56.
The count modifiers below are **fixed**: they are what makes a 3-0 count
feel different from an 0-2 count, and tuning must not flatten them.

| Count | count_mod |
|---|---|
| 3-0 | +0.20 |
| 2-0, 3-1 | +0.12 |
| 1-0, 2-1, 3-2 | +0.05 |
| 0-0, 1-1 | 0 |
| 0-1 | −0.05 |
| 2-2 | −0.02 |
| 1-2 | −0.05 |
| 0-2 | −0.08 |

The two-strike modifiers are deliberately mild. A pitcher ahead in the
count expands the zone, but he does not stop competing in it: real pitchers
throw roughly ten points fewer strikes at 0-2 than at 0-0, not twenty-five,
and a batter who can assume ball four is coming every time he reaches two
strikes is not playing baseball. An earlier draft used −0.20 at 0-2 and
−0.12 at 1-2; the effect was that the read at every two-strike count was
`Likely ball` for every legal `BASE_ZONE`, so the §5.4 policy took every
two-strike pitch and roughly seven strikeouts in ten were called strikes.

**`challenge_mod` — the pitcher picks on weak contact.**

```
challenge_mod = -adj(Contact) * CHALLENGE_WEIGHT
```

`CHALLENGE_WEIGHT` is **0.40** and is a tuning lever with range 0.20–0.60.
A pitcher challenges a hitter he is not afraid of and works around one he
is: against Contact 20 this adds +0.12 to `p_zone`, against Contact 80 it
subtracts 0.12. This is the only place the batter affects whether the pitch
is a strike, and it is what makes the read worth reading — the same count
gives a different pitch to the top of the order than to the bottom.

Clamp `p_zone` to [0.20, 0.90]. Roll once; the pitch is either `zone` or
`ball`.

### 3.3 The read

The true bucket is `Likely strike` if `p_zone ≥ 0.62`, `Likely ball` if
`p_zone ≤ 0.45`, else `Coin flip`. The displayed bucket is the true bucket
with probability `0.70 + adj(Eye)` (so Eye 20 = 40% accurate, Eye 80 =
100% accurate); otherwise it shows an adjacent bucket chosen at random.

### 3.4 Pitch outcome by choice × location

Each cell gives probabilities for `in play / foul / whiff`, or the fixed
outcome. Whiff probability is then multiplied by `1 + adj(Stuff) − adj(Contact)`
and the remainder redistributed proportionally to in-play and foul.

| Choice | Zone | Ball |
|---|---|---|
| **Take** | Called strike | Ball |
| **Contact** | 0.42 / 0.45 / 0.13 | 0.20 / 0.45 / 0.35 |
| **Power** | 0.35 / 0.40 / 0.25 | 0.12 / 0.38 / 0.50 |

These are starting values. Tuning may move them within these ranges: in
play 0.30–0.50 on zone pitches and 0.10–0.30 on balls; foul 0.30–0.50;
whiff never below 0.10 on a zone pitch. Real swings put the ball in play
well under half the time, and that is what makes plate appearances last.

Count rules: ball 4 is a walk; strike 3 (called, whiff, or foul bunt) is a
strikeout; a foul with two strikes keeps the count. **When a plate
appearance ends for any reason, the next batter starts at 0-0.**

### 3.5 Batted-ball outcome

When the pitch is in play, roll on the row for the swing that produced it:

| Swing × location | Out | Single | Double | Triple | HR |
|---|---|---|---|---|---|
| Contact, zone | 0.62 | 0.27 | 0.07 | 0.01 | 0.03 |
| Contact, ball | 0.75 | 0.20 | 0.04 | 0.005 | 0.005 |
| Power, zone | 0.58 | 0.15 | 0.12 | 0.01 | 0.14 |
| Power, ball | 0.74 | 0.13 | 0.07 | 0.01 | 0.05 |

Rows must sum to 1.0. Tuning may move any cell by up to 30% of its value;
the home-run cells may not exceed 1.3× these numbers, or Power becomes the
only button worth pressing.

Rating shifts, applied before normalising the row back to 1.0:

```
single *= 1 + adj(Contact)
out    *= 1 - adj(Contact) * 0.5
double *= 1 + adj(Power)
hr     *= 1 + adj(Power) * 2
```

### 3.6 Bunt

Shown as a fourth button only when there is a runner on first or second,
fewer than two outs, and fewer than two strikes.

| Outcome | Prob |
|---|---|
| Sacrifice: batter out, all runners advance one base | 0.70 |
| Foul bunt: strike, count continues | 0.15 |
| Pop-up: batter out, runners hold | 0.10 |
| Bunt single: batter safe, runners advance one | 0.05 |

---

## 4. Base running and outs

Deterministic where possible; a few rolls where baseball has them.

| Event | Rule |
|---|---|
| Walk | Batter to first; runners advance only if forced |
| Single | R3 scores. R2 scores with p 0.65, else to third. R1 to second (to third with p 0.30 if third is open after R2 moves). Batter to first |
| Double | R3 and R2 score. R1 scores with p 0.45, else to third. Batter to second |
| Triple | Everyone scores, batter to third |
| Home run | Everyone scores |
| Out, fewer than 2 outs, R1 on | Double play with p 0.12 (batter and R1 out); otherwise runners hold |
| Out, fewer than 2 outs, R3 on, no DP | Sacrifice fly with p 0.25: R3 scores |
| Third out | Half-inning ends; no runs score on the play unless the out was a sacrifice fly (impossible on a third out, so: none) |

Three outs end the half-inning. After the bottom of the ninth (or any
later inning), the game ends if the score is not tied; the home team does
not bat in the bottom of an inning it already leads after the top. Extra
innings continue normally.

### 4.1 Scenario tests (implement verbatim)

```
Given runners on 1st and 3rd, 1 out, batter hits a single with R2-scores roll irrelevant
When resolved with the "R1 to third" roll failing
Then R3 scores, R1 is on second, batter on first, 1 out, +1 run

Given bases loaded, 2 outs, count 3-2
When the batter takes and the pitch is a ball
Then a walk: one run scores, bases stay loaded, 2 outs

Given runner on 1st, 0 outs
When the batter grounds out and the DP roll succeeds
Then 2 outs, bases empty

Given bottom of the 9th, home team trails by 1, runner on 2nd, 2 outs
When the batter hits a double and the R1 roll is irrelevant
Then the game is tied and continues; not over

Given top of the 9th ends with the home team ahead
Then the game ends without a bottom half

Given a count of 1-2 and a batter who strikes out (or walks, or puts the ball in play)
When the plate appearance ends
Then the next batter's count is 0-0, and outs, bases and score reflect the play

Given bottom of the 9th, tied, runner on 3rd, 1 out
When the batter singles
Then the game ends immediately as a walk-off; the half-inning does not continue
```

---

## 5. Content

### 5.1 Your roster (default: Harbor Herons, batting order as listed)

| # | Name | Pos | C | P | E | Note |
|---|---|---|---|---|---|---|
| 1 | Dee Okafor | CF | 60 | 35 | 65 | Leadoff, sees pitches |
| 2 | Marco Villanueva | 2B | 65 | 40 | 55 | Contact hitter |
| 3 | Sam Achterberg | RF | 55 | 65 | 55 | Best all-round bat |
| 4 | Tomasz "Tank" Wrona | 1B | 40 | 75 | 40 | Cleanup, all or nothing |
| 5 | Ines Ferreira | 3B | 50 | 60 | 50 | |
| 6 | Kwame Boateng | LF | 55 | 50 | 45 | |
| 7 | Ruth Halvorsen | SS | 50 | 35 | 60 | Glove-first, patient |
| 8 | Eli Nakamura | C | 45 | 45 | 50 | |
| 9 | Jordan Pike | DH | 35 | 55 | 30 | Free swinger |

Team average is a shade above 50 in Contact to make the player side feel
slightly capable. Names are placeholders and are easy to edit in one file.

Your pitching staff (used only in the opponent sim): three starters rotated
by game number.

| Name | Control | Stuff | Tendency |
|---|---|---|---|
| Priya Raman | 60 | 50 | Attacker |
| Owen Castellanos | 45 | 65 | Nibbler |
| Bea Lindqvist | 55 | 45 | Neutral |

### 5.2 Opponents

Every team in the league is a bird. Six opponents. Each has a strength that sets its hitters' ratings (all nine
hitters share the team's three numbers in v1; individual names are flavor
only) and two starting pitchers alternated by game.

| Team | C | P | E | Pitcher A (K/S/tend) | Pitcher B (K/S/tend) |
|---|---|---|---|---|---|
| Ashford Wrens | 45 | 45 | 45 | 50/45/Neutral | 45/50/Nibbler |
| Bellweather Grackles | 50 | 55 | 45 | 55/55/Attacker | 50/50/Neutral |
| Copper Hill Kestrels | 55 | 50 | 50 | 60/50/Attacker | 50/60/Neutral |
| Silver Lake Loons | 50 | 50 | 55 | 45/60/Nibbler | 55/50/Neutral |
| Marrow Creek Cranes | 55 | 60 | 50 | 60/60/Attacker | 55/55/Nibbler |
| Port Ellery Ospreys | 60 | 55 | 60 | 65/65/Attacker | 60/60/Neutral |

Listed weakest to strongest. The schedule front-loads the weak teams.

Suggested league name, composed and flagged for your review: **the Flyway
League** (a flyway is a migration route; a small nod to the birds without
being cute about it). It appears in one place, the home screen masthead,
so it is cheap to change.

### 5.3 Schedule

20 games: Wrens ×4, Grackles ×4, Kestrels ×3, Loons ×3, Cranes ×3, Ospreys ×3,
interleaved so no opponent appears twice in a row, home/away alternating.
Other teams' games against each other are simulated by strength (a single
roll per game, p(win) from the Contact+Power+Eye sum difference) so the
standings table is full.

### 5.4 Opponent batting policy (used by the sim)

The opponent uses the same engine and the same read. Its policy:

```
if strikes == 2:            Take if read == Likely ball, else Contact
elif balls == 3:            Take                      # never swing 3-0 or 3-1
elif read == Likely ball:   Take
elif read == Likely strike: Power if balls >= 2, else Contact (p 0.6) / Power (p 0.4)
elif strikes == 0:          Take                      # first-pitch coin flip: look
else:                       Contact (p 0.6) / Power (p 0.4)
```

The policy is count-aware on purpose. A policy that only takes on a
`Likely ball` read can never walk, because the count modifiers push the
read toward `Likely strike` exactly as balls accumulate. This policy is
fixed; tuning does not change it.

It is deliberately reasonable-but-beatable so a thoughtful player is
slightly better than the sim.

---

## 6. Progression and persistence

- **Season stats** per batter: PA, AB, H, 2B, 3B, HR, BB, K, R, RBI, AVG,
  OBP, SLG. Shown on the season screen, sorted by your choice of column.
- **Standings**: W-L, GB, run differential, last five.
- **Season log**: one line per game (`G7 vs Loons W 5–3`).
- **Milestones**: a small fixed list, shown once as a line on the
  between-innings screen when hit. First HR, first walk-off, first shutout,
  10-game mark, clinch/eliminated, season over. No badges screen.
- **Season over**: a summary screen, then "Start a new season" which keeps
  the roster and resets stats. No carry-over progression in v1.

Persistence: whole `GameState` to localStorage after every engine
transition. Save schema carries a version integer and a `migrate()`
function. Settings screen has "Copy save code" / "Paste save code" for
moving between devices, and "Reset season" behind a confirm.

### 6.1 Save code (cross-device transfer)

There is no backend, so moving a season from laptop to phone is a
copy-and-paste of one short text string. Design goals: short enough to
paste into Notes or a message to yourself, self-describing, safe against a
truncated paste, and forward-compatible with schema migrations.

**Format**

```
SS1-<payload>-<check>
```

| Part | Meaning |
|---|---|
| `SS1` | Magic prefix and container version. `SS1` = deflate + base64url. A future `SS2` can change the container without touching the schema |
| `payload` | `base64url( deflate-raw( JSON.stringify(envelope) ) )`, no padding |
| `check` | 4 hex chars: FNV-1a 32-bit of the payload string, low 16 bits. Catches truncated or mangled pastes before inflate runs |

The envelope, before compression:

```json
{ "v": 1, "savedAt": "2026-09-02T14:31:07Z", "device": "iPhone", "state": { ...GameState } }
```

`v` is the save-schema version that `migrate()` understands; `device` is a
free-text label the user can set in Settings (default: coarse user-agent
family) so the paste preview can say where the save came from.

**Size.** A mid-season `GameState` with full per-player stat lines is
roughly 4–6 KB of JSON and compresses to about 1–1.5 KB, so the code is
around 1.5–2 KB of text. That pastes cleanly into any messaging app.

**Compression** uses the browser `CompressionStream("deflate-raw")` API,
available in Safari 16.4+, Chrome 80+, Firefox 113+. If it is missing, the
exporter falls back to `SS0-` (base64url of the raw JSON, same checksum,
roughly 3× longer) and the importer accepts both.

**Export flow.** Settings → "Copy save code" copies to the clipboard and
also shows the code in a selectable box, because iOS clipboard writes can
fail silently outside a user gesture. The box shows the first and last few
characters and a length so the user can eyeball that a paste is complete.

**Import flow.** Settings → paste into the box → the app decodes without
applying and shows a preview line: `Game 7 · Herons 4–2 · bottom 4th · saved
2 hours ago on iPhone`. If the pasted save is *older* than the local one,
the preview says so in red. "Load this save" replaces local state after a
confirm. The replaced local state is stashed under a second localStorage
key for one session so "Undo load" works once.

**Failure messages** are specific: bad prefix, checksum mismatch (with
"looks truncated: N chars" when the length is short), schema too new
("this save is from a newer version of the game; update this device").
Never throw a raw error at the user.

**Tests (T6):** round-trip a fresh, a mid-game, and an end-of-season state;
truncation by 1, 10, and 200 chars fails the checksum; a hand-edited
`savedAt` older than local triggers the warning; `v: 0` is migrated; `v: 99`
is refused with the "newer version" message.

---

## 7. Tuning targets

Measured by the Phase 1 Monte Carlo script over 10,000 games with the
opponent policy on both sides (so both teams play "sensibly"), league-wide:

| Stat | Target band |
|---|---|
| Runs per team per game | 4.2 – 4.9 |
| Batting average | .245 – .265 |
| On-base percentage | .315 – .335 |
| Strikeout rate (per PA) | 20% – 25% |
| Walk rate (per PA) | 8% – 10% |
| Home runs per team per game | 1.0 – 1.3 |
| Pitches per plate appearance | 3.7 – 4.0 |
| Plate appearances per half-inning | 4.1 – 4.5 |

The last two together give the tap budget: about 16 to 18 taps per
half-inning, plus a couple of navigation taps.

### 7.1 Policy matrix (exploit guards)

The bands above describe the league. They say nothing about whether a
human can break the game by pressing one button. So the tuning script also
plays each policy below head-to-head against the §5.4 sim policy,
alternating home and away, and reports the policy's runs as a percentage
of the sim's. Every row must pass; a run is not PASS otherwise.

| Policy | Runs vs sim | Why |
|---|---|---|
| Always Take | ≤ 60% | Walking must not be free |
| Always Contact | 60–110% | One button must not dominate or be useless |
| Always Power | ≤ 110% | Same |
| Take until two strikes, then Contact | ≤ 110% | The obvious "patient" exploit |
| Take unless `Likely strike` (Power); Contact with two strikes | 95–130% | The intended thoughtful play should win, modestly |

If the bands and the matrix cannot both be satisfied, report the conflict
with numbers. Do not pick one and call it done.

### 7.2 What tuning may touch

- `BASE_ZONE` within 0.42–0.56.
- `CHALLENGE_WEIGHT` (§3.2) within 0.20–0.60.
- The swing table (§3.4) within its stated ranges.
- The batted-ball table (§3.5) within its stated ranges.
- Base-running probabilities (§4) by at most ±0.15.

Not tunable: the count modifiers, the read thresholds, the rating formula,
the §5.4 policy. Those define what the game is.

---

## 8. Screens

Four screens, all in the mockups. Portrait phone first; on a laptop the
same layout sits centred at 390px wide. That is intentional: it keeps one
layout and looks like a small game rather than a stretched web page.

1. **Home / Continue.** Score strip for the game in progress, one primary
   button, a three-line standings snippet, next opponent.
2. **At-bat.** The core loop. Diamond with runners, count and outs, batter
   card with ratings, pitcher read, choice buttons, last play in words.
3. **Between innings.** Your half in plays, the opponent's half in two
   lines, updated line score, "Play the next inning" / "Done for now".
4. **Season.** Standings and your batting table.
5. **Settings / Transfer.** A sheet off the home screen: team name, copy
   save code, paste save code with preview, reset season.

### Visual direction

"Scorecard": cream paper, ink and pencil red, typewriter stats, a drawn
diamond. Chosen because it reads as calm and pocket-sized, and because a
paper scorebook is what a spectator uses to follow a game at their own
pace, which is the whole idea. Two alternate directions were sketched
beside it in the mockups (a dark LED scoreboard, and a newspaper
box-score broadsheet) in case the scorecard look is not your taste.
