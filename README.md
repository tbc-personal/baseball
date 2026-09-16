# Short Season

A small turn-based baseball game, built to be played in the gaps between
meetings. One break is one half-inning. You bat for a fictional team through
a 20-game season, one pitch at a time, choosing Take, Contact or Power (and
Bunt where it applies); the opponent's half-innings are simulated instantly
so you never wait. There are no timers and no reflexes, and the game saves
after every pitch, so closing the tab in a 3-2 count costs nothing.

**Play at:** https://tbc-personal.github.io/baseball/ — the stable release.

**Play the latest build:** https://tbc-personal.github.io/baseball/preview/ —
whatever is on the `preview` branch, for playtesting before it is released.

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
npm run probe    # per-batter measurement: what each rating and each button buys
```

`npm run tune` is the Monte Carlo harness used to balance the game. It
takes an optional game count and seed: `npm run tune -- 2000 777`.

`npm run probe` measures a single plate appearance in isolation — what one
rating or one choice is worth — which is the question `tune` cannot answer.
It takes a mode, a PA count and a seed: `npm run probe -- ratings 60000`.

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

## Two builds

`main` publishes the stable release at `/baseball/`; the `preview` branch
publishes the latest build at `/baseball/preview/`. A push to either
rebuilds and republishes both, because GitHub Pages serves one artifact and
`.github/workflows/deploy.yml` assembles it from both branches.

To start using the preview channel, create the branch and push to it:

```bash
git checkout -b preview main
git push -u origin preview
```

Until that branch exists the workflow publishes the release on its own and
notes it in the run summary. The preview branch can never break the
release: its checkout, install and build all continue on error, and the
preview directory is only added to the artifact if a build came out of it.
Preview is deliberately **not** gated on lint or tests — the point is to
play something still being worked on — but the tests do run and a failure
is written to the run summary.

Three things differ in a preview build, and they are all there to stop it
interfering with the release it shares an origin with:

- **It keeps its own save.** `localStorage` is per-origin, not per-path, so
  both builds would otherwise share one season — and since the two exist
  because their engines differ, that save would be resumed under the wrong
  tuning. The preview build writes `shortSeason:save:preview`.
- **It ships no service worker**, and the release's worker is told to keep
  out of the preview path. Its scope covers `/baseball/preview/`, so
  without that it answers preview navigations from its own precache and
  serves the release at the preview URL. Offline play is a property of the
  release; a build you are testing should load the newest code every time.
- **It says so**, with a "latest build" marker on the home screen, so an
  empty season at the wrong URL is explained rather than alarming.

## Keyboard

The game is mostly played on a laptop, so every screen can be driven from
the keyboard. On a device with a real pointer each button shows the key
that presses it.

| Screen | Keys |
|---|---|
| At bat | `T` `C` `P` `B`, or `1` `2` `3` `4` — Take, Contact, Power, Bunt. `Enter` takes the recommended choice. |
| Home, between innings | `Enter` — the primary action |
| Season, settings | `Esc` — back |

Keys never fire while you are typing in the team-name field or a save-code
box, and `Enter` is left alone whenever a button has focus, so tabbing to a
button and pressing `Enter` does what you would expect.

## Saves

Game state lives in your browser's localStorage, so it is per-browser and
per-device. The save code in Settings moves a season between devices — and
between the two builds above, which do not share one. To move a season between devices, use **Settings → Copy save
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
- [docs/ROADMAP.md](docs/ROADMAP.md) — what to build next and in what
  order, and the measured balance problem that sets that order
- [docs/BUILD_NOTES.md](docs/BUILD_NOTES.md) — build status, deviations from
  the spec, resolved ambiguities and known gaps
- [docs/mockups/](docs/mockups/) — the five screen mockups used as the
  layout spec
