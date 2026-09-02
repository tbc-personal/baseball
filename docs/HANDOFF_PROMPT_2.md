# Follow-up prompt for the implementation session (round 2)

Paste everything below the rule into a Claude Code session opened on this
repository. Start on branch `claude/handoff-prompt-review-levk3g` and
merge `claude/baseball-game-app-design-p3uh7v` into it first; that
branch carries only documentation changes and merges cleanly.

---

You are continuing the Short Season build in this repository. A review
found one engine bug and revised parts of the spec. Read, in this order:

1. `docs/REVIEW_1.md` (what was found and why)
2. `docs/GAME_DESIGN.md` sections 3.2, 3.4, 3.5, 4.1, 5.4, 7, 7.1 and 7.2
   (the revised rules; the rest is unchanged)
3. `docs/TUNING.md` and `docs/BUILD_NOTES.md` from the previous round

Then do the following, one commit each, in order. All the rules from
`docs/HANDOFF_PROMPT.md` still apply: engine stays pure, tests and lint
green at every commit, no new dependencies, no rule changes beyond what
the revised spec states.

## R1: Fix the count reset

In `applyPitch`, when a plate appearance ends for any reason, the next
batter's count is 0-0. Add the two new §4.1 scenario tests verbatim (the
count reset, and the walk-off single). Add a pitch-by-pitch trace test
that plays one always-Take half-inning and asserts every plate appearance
lasts at least three pitches.

## R2: Apply the revised rules

- `COUNT_MOD` back to the §3.2 values. `BASE_ZONE_PROBABILITY` to 0.48.
  `READ_BUCKET_LIKELY_BALL` back to 0.45.
- `PITCH_OUTCOMES` to the new §3.4 starting values.
- `BATTED_BALL_OUTCOMES` to the §3.5 values, rows summing to 1.0.
- Base-running probabilities back to the §4 values.
- `opponentChoice` in `sim.ts` to the new §5.4 policy exactly.
- Update every test that encoded the old values.

## R3: Add the policy matrix to the tuning script

`npm run tune` prints, after the band table, the §7.1 matrix: each of the
five policies head-to-head against the sim policy, alternating home and
away per game, with the runs ratio and a PASS/FAIL per row. Also print
each policy's own walk rate and pitches per plate appearance from a
mirror batch (policy versus itself), because those numbers are how a
reviewer sees a degenerate optimum. Overall PASS requires every band and
every matrix row.

## R4: Retune

Adjust only what §7.2 allows, within its ranges, until every band and
every matrix row passes. Record before and after values and the final
printed output in `docs/TUNING.md`, replacing the previous round's
content (keep its diagnosis of the zero-walk problem as a short history
note; the rest is superseded). If bands and matrix cannot both pass,
stop, report both tables with numbers in `TUNING.md`, and pick the
closest result that keeps every matrix row passing. The matrix is the
one that protects the player from a boring game.

Expect the retune to be iterative. Start by moving `BASE_ZONE` and the
swing table; touch the batted-ball table last and least.

## R5: Two UI items

- Render the milestone line on the between-innings screen when one fired
  (it is already computed).
- Standings at 0-0 sort alphabetically by team name within ties.

## When done

Append a "Round 2" section to `docs/BUILD_NOTES.md`: what changed,
deviations, ambiguities, the final tuning numbers in one paragraph, and
anything still rough. Push the branch. No pull request, no merge to main.
