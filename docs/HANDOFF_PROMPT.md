# Handoff prompt for the implementation session

Paste everything below the rule into a fresh Claude Code session (Opus 5)
opened on this repository, branch `claude/baseball-game-app-design-p3uh7v`
or a branch cut from it.

---

You are implementing a small web game called Short Season in this
repository. The design is finished and you are not being asked to redesign
it. Read these files completely before writing any code, in this order:

1. `docs/PLAN.md` (architecture, stack, ticket list T0 to T10)
2. `docs/GAME_DESIGN.md` (rules, probability tables, content, tuning targets)
3. `docs/mockups/README.md` and every `docs/mockups/*.dc.html` (the UI spec;
   colors, type sizes, spacing and button heights are in the markup)

## What to build

Implement tickets T0 through T10 from `docs/PLAN.md`, in order. The whole
thing: engine, tuning, persistence, UI, PWA, deploy workflow. Do not stop
after the engine.

## Rules

**One commit per ticket**, titled `T3: base running and inning transitions`
and so on. Do not squash tickets together and do not interleave them. The
reviewer reads the history commit by commit.

**The engine is pure.** Nothing under `src/engine/` imports from the DOM,
Preact, or `src/store/`. Every engine function takes state plus an RNG and
returns new state. If you find yourself wanting `Math.random()` anywhere,
stop; it goes through the seeded RNG.

**Follow the spec's numbers.** The probability tables, the count modifiers,
the rating formula, the base-running rules, the roster, and the opponent
policy are all specified. Implement them as written. Put every tunable
constant in one file, `src/engine/constants.ts`, so tuning is one diff.

**Tuning (T5) is the one place you exercise judgment.** Write the Monte
Carlo script, run it, and if the league averages fall outside the bands in
GAME_DESIGN.md section 7, adjust constants in `constants.ts` only, re-run,
and repeat until every band is hit. Also run the "always Contact" policy
check described in section 7. Commit the final script output to
`docs/TUNING.md` with a short note on what you changed and why. Do not
change the structure of the tables or add new mechanics to hit the numbers;
if the bands cannot be hit by adjusting constants alone, say so in
`docs/BUILD_NOTES.md` and pick the closest achievable result.

**Do not change the game rules.** If the spec is ambiguous or contradicts
itself, pick the reading that is closest to real baseball, implement it,
and record the ambiguity and your choice in `docs/BUILD_NOTES.md`. Do not
add features that are not in the tickets. Phase 4 items in the plan are
out of scope.

**Match the mockups.** The UI is plain CSS with custom properties, no
Tailwind, no component library. Take the color tokens, fonts, sizes, and
button heights from the mockup markup. Google Fonts (Oswald, Courier Prime)
are loaded with a `<link>`; give them the fallback stacks the mockups use.
Tap targets are 44px minimum. The layout is a 390px column, centered on
wider screens.

**Dependencies.** Vite, TypeScript, Preact, vitest, vite-plugin-pwa,
ESLint. Nothing else without writing down why in `docs/BUILD_NOTES.md`.

**Tests must pass before every commit.** `npm test` and `npm run lint` are
green at every commit in the history, not just the last one. The scenario
tests in GAME_DESIGN.md section 4.1 and the save-code tests in section 6.1
are implemented verbatim.

**Deploy.** GitHub Pages via `actions/deploy-pages`, base path
`/baseball/`, PWA `start_url` and `scope` under the same prefix. You cannot
enable Pages in the repo settings yourself; write the one-time steps for
the owner into `README.md`.

## When you are done

Write `docs/BUILD_NOTES.md` with these sections, briefly:

1. **Status**: which tickets are complete, and anything left undone with
   the reason.
2. **Deviations from spec**: every place the code differs from
   `docs/PLAN.md`, `docs/GAME_DESIGN.md`, or the mockups, with the reason.
   An empty list is a fine answer if it is true.
3. **Ambiguities resolved**: spec questions you had to decide, and what you
   chose.
4. **Tuning**: link to `docs/TUNING.md` and one paragraph on how close the
   numbers landed.
5. **Known gaps**: anything you know is rough, untested, or only works on
   one browser.
6. **How to run**: `npm install`, `npm run dev`, `npm test`, one line each.

Push the branch. Do not open a pull request. Do not merge to `main`.

The reviewer will read `docs/BUILD_NOTES.md` first, then the commit
history, then run the tests. Write the notes for that reader: specific,
short, no marketing.
