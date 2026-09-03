hi# Short Season

A small turn-based baseball game, built to be played in the gaps between
meetings. One break is one half-inning. You bat for a fictional team through
a 20-game season, one pitch at a time, choosing Take, Contact or Power (and
Bunt where it applies); the opponent's half-innings are simulated instantly
so you never wait. There are no timers and no reflexes, and the game saves
after every pitch, so closing the tab in a 3-2 count costs nothing.

**Play at:** https://tbc-personal.github.io/baseball/

## Running it locally

```bash
npm install      # install dependencies
npm run dev      # dev server at http://localhost:5173/baseball/
npm test         # run the test suite
npm run lint     # ESLint
npm run typecheck  # tsc --noEmit
npm run build    # typecheck, then build to dist/
npm run preview  # serve the built dist/ locally
npm run tune     # play 10,000 simulated games and print league averages
```

`npm run tune` is the Monte Carlo harness used to balance the game. It
takes an optional game count and seed: `npm run tune -- 2000 777`.

## How it is built

Vite, TypeScript and Preact. No Tailwind, no component library, no state
library — plain CSS with custom properties, and one state object reduced by
pure functions.

- `src/engine/` is pure: no DOM, Preact or storage imports, and no
  `Math.random()`. Every function takes state plus a seeded RNG and returns
  new state, so a whole game replays identically from a seed. This is what
  makes the tests and the tuning harness trustworthy.
- `src/store/` handles localStorage, the versioned save schema, and the
  save code. It depends on the engine; the engine never depends on it.
- `src/ui/` renders engine state and dispatches choices. It does not compute
  baseball — derived numbers come from engine selectors.
- `scripts/` holds the tuning harness and the icon sources.

## Saves

Game state lives in your browser's localStorage, so it is per-browser and
per-device. To move a season between devices, use **Settings → Copy save
code**, paste the code into Notes or a message to yourself, open it on the
other device, and paste it into **Settings → Load a save code**. The app
shows you what the pasted save contains before it replaces anything, and
warns you if it is older than the save already on that device.

## Documentation

- [docs/PLAN.md](docs/PLAN.md) — platform decision, architecture, delivery
  phases, and the ticket list the build followed
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) — rules, probability tables,
  base running, rosters, persistence format, and the tuning targets
- [docs/TUNING.md](docs/TUNING.md) — what the constants were tuned to, what
  changed and why, and the one §7 target that could not be met
- [docs/BUILD_NOTES.md](docs/BUILD_NOTES.md) — build status, deviations from
  the spec, resolved ambiguities and known gaps
- [docs/mockups/](docs/mockups/) — the five screen mockups used as the
  layout spec
