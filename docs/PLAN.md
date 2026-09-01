# Short Season — Project Plan

A tiny, turn-based baseball game for two-minute breaks between meetings.
This document covers the platform decision, architecture, delivery phases,
and how the build gets handed to a cheaper agent. Gameplay lives in
[GAME_DESIGN.md](GAME_DESIGN.md); screen mockups in [mockups/](mockups/).

Status: **plan / design / mockups only. No code yet.**

---

## 1. Platform decision: web app first, iOS later if wanted

**Recommendation: build it as a static web app (PWA), hosted for free, and
add it to the iPhone home screen. Do not start with a native iOS app.**

### Why web wins for this project

| Concern | Web (PWA) | Native iOS via TestFlight |
|---|---|---|
| Where you actually play | Laptop between meetings *and* phone | Phone only |
| Cost | $0 | $99/yr Apple Developer Program |
| Build pipeline | Any machine, incl. this agent environment | Needs a Mac + Xcode, or a macOS CI runner with signing certs and App Store Connect API keys |
| Can a cheaper agent ship it end to end? | Yes, fully, from this repo | No. Signing, provisioning, and TestFlight upload need setup only you can do |
| Build expiry | Never | TestFlight builds expire after 90 days; you'd re-upload every quarter for a solo game |
| Install | "Add to Home Screen" in Safari (one time) | TestFlight app + invite |
| Offline | Yes, with a service worker | Yes |
| Save data | localStorage / IndexedDB on the device | On-device, plus iCloud if built |
| Haptics, native feel | Limited | Better |

The use case ("short breaks between work meetings") is mostly a laptop
context, which native iOS cannot serve at all. Web serves both.

### The iOS door stays open

If you later want a real App Store or TestFlight build, wrap the same web
app with Capacitor. That is a mechanical step on top of the web codebase,
not a rewrite. Nothing in the plan below forecloses it.

### Known PWA caveats on iOS (and why they are acceptable here)

- Safari can evict site storage after 7 days of non-use for regular tabs.
  An installed home-screen PWA is exempt from that cap. The plan also adds
  a one-tap "export save" so a save can be copied as text if ever needed.
- No push notifications needed; none planned.
- Safari's PWA install flow is manual (Share → Add to Home Screen). Once.

### Hosting

The repo is **private**. That rules out free GitHub Pages (GitHub Pages on
private repos requires GitHub Pro or a Team plan).

- **Recommended: Cloudflare Pages.** Free, deploys from a private GitHub
  repo on push, gives a `*.pages.dev` URL with HTTPS, no server to run.
  Setup is a five-minute one-time click-through that you must do (it
  needs your Cloudflare login). After that, every push to `main` deploys.
- Fallback: Netlify (same model), or GitHub Pages if you already pay for
  GitHub Pro. Either way the app is a static folder; hosting is swappable.

The site is public-by-URL but unlisted. The game holds no personal data
and there is no backend, so that is fine.

---

## 2. Architecture

Everything is a static site. No backend, no accounts, no analytics.

```
short-season/
├── src/
│   ├── engine/          # pure TypeScript, zero DOM imports, fully unit-tested
│   │   ├── rng.ts       # seeded PRNG (mulberry32 or similar)
│   │   ├── types.ts     # GameState, PlateAppearance, Player, Team, Season
│   │   ├── pitch.ts     # resolve one pitch: (state, choice, rng) -> outcome
│   │   ├── bases.ts     # runner advancement rules
│   │   ├── inning.ts    # outs, half-inning transitions, game end
│   │   ├── sim.ts       # auto-simulate the opponent's half-innings
│   │   ├── season.ts    # schedule, standings, per-player stat accumulation
│   │   └── content/     # rosters, opponent teams, pitchers (plain data)
│   ├── ui/              # Preact components; reads engine state, dispatches choices
│   ├── store/           # save/load, schema version, migrations, export/import
│   └── main.tsx
├── tests/               # vitest; engine tests + Monte Carlo tuning script
├── public/              # manifest.webmanifest, icons
└── .github/workflows/   # lint + test on every PR
```

### Stack

- **Vite + TypeScript + Preact.** Preact is 4 KB, React-shaped, and every
  code model knows it. No Tailwind; plain CSS with custom properties so the
  scorecard look from the mockups transfers directly.
- **vitest** for the engine.
- **vite-plugin-pwa** for the manifest and service worker.
- **No state library.** One `GameState` object, reduced by pure engine
  functions, held in a single Preact signal or `useReducer`.

### Design rules that make this cheap to build and review

1. **The engine is pure and deterministic.** Every function takes state plus
   an RNG and returns new state. Given a seed, a whole game replays
   identically. This is what makes unit tests and the tuning script
   trustworthy, and what lets a smaller model implement it against a spec.
2. **The UI never computes baseball.** It renders state and sends one of a
   handful of choices. If a screen needs a derived number, the engine
   exposes a selector for it.
3. **Save after every pitch.** State is small (a few KB). Serialize the
   whole thing to localStorage on every transition. Closing the tab
   mid-at-bat loses nothing.
4. **Versioned save schema** from day one, with a `migrate(save)` function,
   so tuning changes do not brick an in-progress season.

---

## 3. Phases

### Phase 0 — Plan, design, mockups (this PR)
Done: this document, the game design, the mockups.

### Phase 1 — Engine (no UI)
Pitch resolution, base running, innings, opponent sim, season, stats,
persistence. Ships with tests and a Monte Carlo tuning script that plays
10,000 games and prints league averages. **Exit criterion:** numbers land
in the target bands in GAME_DESIGN.md §7.

### Phase 2 — UI, playable
At-bat screen, between-innings screen, home/continue screen, box score,
standings. Playable end to end in a browser at `localhost`.

### Phase 3 — Ship
PWA manifest and icons, service worker, Cloudflare Pages deploy, home-screen
install tested on an iPhone. First season played.

### Phase 4 — Nice-to-haves (only if still being played)
Lineup editing, stolen bases, a "pitch" mode for the defensive half,
season-over summary, optional Capacitor iOS wrapper.

---

## 4. Handoff to a cheaper agent

Per your preference: uncertain or exploratory work stays with a stronger
model; understood and repeatable work goes to a cheaper one, and outputs get
verified by the stronger one.

**What is already settled** (safe to hand off): the engine spec, the data
shapes, the UI screens, the visual system. These are written so a Sonnet or
Haiku-class agent can implement them ticket by ticket without design
judgment.

**What stays with a stronger model:** probability tuning (Phase 1 exit
review), any change to the game rules, and review of each ticket's PR.

### Ticket list

Each ticket is one PR, sized for a single agent session, with acceptance
criteria a reviewer can check mechanically.

| # | Ticket | Agent | Acceptance criteria |
|---|---|---|---|
| T0 | Scaffold: Vite + Preact + TS, vitest, ESLint, CI workflow running lint + test | Haiku | `npm test` and `npm run lint` pass in CI on an empty engine |
| T1 | `rng.ts`, `types.ts`, and roster/opponent content files from GAME_DESIGN.md §5 | Haiku | Types compile; content matches the tables exactly; seeded RNG test vectors pass |
| T2 | `pitch.ts`: resolve one pitch per GAME_DESIGN.md §3 outcome tables | Sonnet | Table-driven tests for every (choice × pitch location) cell; probabilities within ±0.5% over 100k samples |
| T3 | `bases.ts` + `inning.ts`: runner advancement, outs, half-inning and game transitions | Sonnet | Scenario tests in §4 pass verbatim (they are written as given/when/then) |
| T4 | `sim.ts` + `season.ts`: opponent half-inning sim, schedule, standings, stat accumulation | Sonnet | A full 20-game season runs headless from one seed; standings and stat totals are internally consistent |
| T5 | Tuning script: 10k games, print league averages vs target bands | Sonnet, reviewed by a stronger model | Script exists; a stronger model adjusts constants until §7 bands are hit |
| T6 | `store/`: save/load, schema version, migrate, export/import as base64 text | Haiku | Round-trip tests; a corrupted save falls back to a fresh season without crashing |
| T7 | UI: at-bat screen per mockup `Main.dc.html` | Sonnet | Matches mockup layout; every engine choice reachable; tap targets ≥ 44px |
| T8 | UI: home, between-innings, box score, standings per the other mockups | Sonnet | Same |
| T9 | PWA: manifest, icons, service worker, offline load | Haiku | Lighthouse PWA installable check passes |
| T10 | Cloudflare Pages deploy config + README instructions for the one-time setup | Haiku | Preview deploy works from a PR |

Review policy: a stronger model reads every PR diff against its ticket's
acceptance criteria and the design doc before merge. The tuning ticket (T5)
is the one place where judgment is required, and it is explicitly assigned
back to a stronger model.

---

## 5. Open questions for you

None of these block Phase 1. Defaults are stated; correct them if wrong.

1. **Team name.** Default in the mockups is the "Harbor Herons". Placeholder;
   change it to anything.
2. **Decision granularity.** The design uses one choice per *pitch* (Take /
   Contact / Power), so a half-inning is roughly 15 to 25 taps and 60 to 90
   seconds. The alternative is one choice per *plate appearance*, which is
   about 5 taps per half-inning but noticeably thinner. Default: per pitch.
3. **Game length.** Default is 9 innings, played one half-inning per break,
   so a game spans about a workday. A 6-inning option is a one-line change.
4. **Hosting.** Cloudflare Pages is the default. If you already pay for
   GitHub Pro, GitHub Pages is equally fine and keeps everything on GitHub.
5. **Do you have an Apple Developer account already?** If yes, the cost
   argument against iOS weakens, though the pipeline argument stands.
