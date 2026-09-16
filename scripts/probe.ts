/**
 * Per-batter measurement, the blind spot in `scripts/tune.ts`.
 *
 * The tuning harness measures two things: league-wide rate stats against
 * the §7 bands, and each §7.1 guard policy's *runs* as a fraction of the
 * sim policy's. Neither can see how a single rating or a single choice
 * pays off for one hitter, and the §7.1 matrix bands runs only. A policy
 * can therefore sit comfortably inside its runs band while producing a
 * batting average fifty points above the league's -- which is what
 * always-Contact does, and it is the stat the season screen prints.
 *
 * This script isolates the plate appearance: one batter, one policy,
 * against the twelve-pitcher opponent pool, with no bases, no outs and no
 * lineup. That is deliberately not a game -- run value here is a static
 * linear-weights approximation, not this engine's base-running model, so
 * the wOBA-ish column is for ranking choices against each other, never for
 * comparison with the §7 run targets. What it is good for is the question
 * `tune.ts` cannot answer: *does this rating do what its name says?*
 *
 * Like `tune.ts` this is a measurement tool. It never writes constants.
 */

import { makeRng } from '../src/engine/rng'
import type { Rng } from '../src/engine/rng'
import { adj, preparePitch, resolvePitch, displayedRead } from '../src/engine/pitch'
import { opponentChoice } from '../src/engine/sim'
import { HERONS_BATTERS } from '../src/engine/content/roster'
import { OPPONENTS } from '../src/engine/content/opponents'
import {
  BASE_ZONE_PROBABILITY,
  COUNT_MOD,
  ZONE_CLAMP_MIN,
  ZONE_CLAMP_MAX,
  TENDENCY_MOD_ATTACKER,
  TENDENCY_MOD_NIBBLER,
  TENDENCY_MOD_NEUTRAL,
  CHALLENGE_WEIGHT,
  BALLS_FOR_WALK,
  STRIKES_FOR_STRIKEOUT
} from '../src/engine/constants'
import type { Batter, Choice, Count, Pitcher, ReadBucket } from '../src/engine/types'

// ============================================================================
// Policies (the §7.1 five, plus the two a human actually plays)
// ============================================================================

type Policy = (read: ReadBucket, count: Count, rng: Rng) => Choice

const NO_BASES = { first: null, second: null, third: null }

const POLICIES: Array<[string, Policy]> = [
  ['always Take', () => 'Take'],
  ['always Contact', () => 'Contact'],
  ['always Power', () => 'Power'],
  ['sim policy (§5.4)', (r, c, rng) => opponentChoice(r, c, NO_BASES, 0, rng)],
  ['read: Power on strike, Contact 2K', (r, c) => (c.strikes >= 2 ? 'Contact' : r === 'Likely strike' ? 'Power' : 'Take')],
  ['read: Contact on strike, Contact 2K', (r, c) => (c.strikes >= 2 ? 'Contact' : r === 'Likely strike' ? 'Contact' : 'Take')]
]

const READING_POLICY = POLICIES[4][1]
const SIM_POLICY = POLICIES[3][1]

// ============================================================================
// One plate appearance, bases and outs removed
// ============================================================================

type Ev = 'walk' | 'strikeout' | 'single' | 'double' | 'triple' | 'hr' | 'out'

/**
 * Static linear weights, in the usual wOBA shape. These are not derived
 * from this engine's base running -- they are a fixed yardstick for
 * ranking one choice against another within a run, which is all this
 * script claims. Do not read the resulting number as a §7 run target.
 */
const LINEAR_WEIGHTS: Record<Ev, number> = {
  walk: 0.69,
  strikeout: 0,
  out: 0,
  single: 0.89,
  double: 1.27,
  triple: 1.62,
  hr: 2.1
}

/** Generous cap; a real PA under any of these policies is well under ten pitches. */
const MAX_PITCHES_PER_PA = 60

function tendencyMod(pitcher: Pitcher): number {
  switch (pitcher.tendency) {
    case 'Attacker':
      return TENDENCY_MOD_ATTACKER
    case 'Nibbler':
      return TENDENCY_MOD_NIBBLER
    case 'Neutral':
      return TENDENCY_MOD_NEUTRAL
  }
}

/**
 * `zoneProbability` with CHALLENGE_WEIGHT passed in rather than imported,
 * so the `challenge` mode can sweep it without editing constants.ts.
 * Kept identical to pitch.ts in every other term; if that formula changes,
 * this has to change with it.
 */
function zoneProbabilityWith(weight: number, count: Count, batter: Batter, pitcher: Pitcher): number {
  const countMod = COUNT_MOD[`${count.balls}-${count.strikes}`] ?? 0
  const raw =
    BASE_ZONE_PROBABILITY + countMod + adj(pitcher.control) + tendencyMod(pitcher) - adj(batter.contact) * weight
  return Math.min(ZONE_CLAMP_MAX, Math.max(ZONE_CLAMP_MIN, raw))
}

/** Play one plate appearance to a terminal event. Bunt is never offered (no bases). */
function playPlateAppearance(
  batter: Batter,
  pitcher: Pitcher,
  policy: Policy,
  rng: Rng,
  challengeWeight: number | null
): { event: Ev; pitches: number } {
  const count: Count = { balls: 0, strikes: 0 }

  for (let pitches = 1; pitches <= MAX_PITCHES_PER_PA; pitches++) {
    let pZone: number
    let read: ReadBucket
    if (challengeWeight === null) {
      const preview = preparePitch(count, batter, pitcher, rng)
      pZone = preview.pZone
      read = preview.displayedBucket
    } else {
      pZone = zoneProbabilityWith(challengeWeight, count, batter, pitcher)
      read = displayedRead(pZone, batter, rng)
    }

    const resolution = resolvePitch(policy(read, count, rng), pZone, batter, pitcher, rng)
    const kind = resolution.result.kind

    if (kind === 'called-strike' || kind === 'whiff') {
      count.strikes += 1
      if (count.strikes >= STRIKES_FOR_STRIKEOUT) return { event: 'strikeout', pitches }
    } else if (kind === 'ball') {
      count.balls += 1
      if (count.balls >= BALLS_FOR_WALK) return { event: 'walk', pitches }
    } else if (kind === 'foul') {
      if (count.strikes < STRIKES_FOR_STRIKEOUT - 1) count.strikes += 1
    } else if (kind === 'in-play') {
      return { event: resolution.result.batted as Ev, pitches }
    } else {
      return { event: 'out', pitches }
    }
  }

  throw new Error(`playPlateAppearance: no terminal event in ${MAX_PITCHES_PER_PA} pitches -- engine bug, not a long at-bat.`)
}

// ============================================================================
// Tally
// ============================================================================

interface Line {
  avg: number
  obp: number
  slg: number
  kRate: number
  bbRate: number
  hrRate: number
  runValue: number
  pitchesPerPa: number
}

const PITCHER_POOL: Pitcher[] = OPPONENTS.flatMap((team) => team.pitchers)

function measure(batter: Batter, policy: Policy, paCount: number, seed: number, challengeWeight: number | null = null): Line {
  const rng = makeRng(seed)
  let pa = 0
  let ab = 0
  let hits = 0
  let totalBases = 0
  let walks = 0
  let strikeouts = 0
  let homers = 0
  let runValue = 0
  let pitches = 0

  for (let i = 0; i < paCount; i++) {
    const { event, pitches: p } = playPlateAppearance(batter, PITCHER_POOL[i % PITCHER_POOL.length], policy, rng, challengeWeight)
    pa += 1
    pitches += p
    runValue += LINEAR_WEIGHTS[event]
    if (event === 'walk') {
      walks += 1
      continue
    }
    ab += 1
    if (event === 'strikeout') {
      strikeouts += 1
      continue
    }
    if (event === 'out') continue
    hits += 1
    totalBases += event === 'single' ? 1 : event === 'double' ? 2 : event === 'triple' ? 3 : 4
    if (event === 'hr') homers += 1
  }

  return {
    avg: hits / ab,
    obp: (hits + walks) / pa,
    slg: totalBases / ab,
    kRate: strikeouts / pa,
    bbRate: walks / pa,
    hrRate: homers / pa,
    runValue: runValue / pa,
    pitchesPerPa: pitches / pa
  }
}

// ============================================================================
// Formatting
// ============================================================================

const rate = (v: number) => v.toFixed(3).replace(/^0/, '')
const pct = (v: number) => `${(v * 100).toFixed(1).padStart(5)}%`

const HEADER = 'AVG   OBP   SLG    K%      BB%     HR%    run val  P/PA'

function lineOf(l: Line): string {
  return `${rate(l.avg)} ${rate(l.obp)} ${rate(l.slg)}  ${pct(l.kRate)}  ${pct(l.bbRate)}  ${pct(l.hrRate)}  ${l.runValue.toFixed(3)}    ${l.pitchesPerPa.toFixed(2)}`
}

function batterOf(contact: number, power: number, eye: number, name = 'synthetic'): Batter {
  return { id: 'probe', name, position: 'DH', contact, power, eye }
}

function seedFor(...parts: number[]): number {
  return parts.reduce((acc, p) => (acc * 31 + Math.round(p * 1000)) % 2147483647, 7)
}

// ============================================================================
// Modes
// ============================================================================

/** Every policy against the real roster: which button pays, and in which stat. */
function modePolicies(paCount: number, baseSeed: number): void {
  const roster = [...HERONS_BATTERS, batterOf(50, 50, 50, 'League-average')]
  for (const [label, policy] of POLICIES) {
    console.log(`\n--- ${label} ---`)
    console.log(`Batter                 C/P/E     ${HEADER}`)
    for (const batter of roster) {
      const l = measure(batter, policy, paCount, seedFor(baseSeed, batter.contact, batter.power, batter.eye, label.length))
      const ratings = `${String(batter.contact).padStart(2)}/${String(batter.power).padStart(2)}/${String(batter.eye).padStart(2)}`
      console.log(`${batter.name.padEnd(22)} ${ratings}  ${lineOf(l)}`)
    }
  }
}

/** One rating at a time, the others pinned at 50: is the rating worth anything? */
function modeRatings(paCount: number, baseSeed: number): void {
  const policies: Array<[string, Policy]> = [
    ['sim policy (§5.4)', SIM_POLICY],
    ['reading policy (§7.1 row 5)', READING_POLICY],
    ['always Contact', () => 'Contact']
  ]
  for (const [label, policy] of policies) {
    console.log(`\n===== ${label} =====`)
    for (const dimension of ['contact', 'power', 'eye'] as const) {
      console.log(`\n  ${dimension.toUpperCase()} swept, the other two held at 50`)
      console.log(`  rating  ${HEADER}`)
      for (const v of [20, 35, 50, 65, 80]) {
        const batter = batterOf(
          dimension === 'contact' ? v : 50,
          dimension === 'power' ? v : 50,
          dimension === 'eye' ? v : 50
        )
        const l = measure(batter, policy, paCount, seedFor(baseSeed, v, dimension.length, label.length))
        console.log(`  ${String(v).padStart(6)}  ${lineOf(l)}`)
      }
    }
  }
}

/**
 * CHALLENGE_WEIGHT sweep. §3.2's challenge term is the only batter-dependent
 * term in p_zone, and at its committed 0.50 it is strong enough to decide
 * what the Contact rating *means*: whether a good contact hitter gets hits
 * or gets pitched around. This mode is the measurement for that question.
 */
function modeChallenge(paCount: number, baseSeed: number): void {
  console.log(`\nCHALLENGE_WEIGHT sweep, sim policy, Power and Eye held at 50.`)
  console.log(`Committed value is ${CHALLENGE_WEIGHT.toFixed(2)}. The question is whether raising Contact raises batting average.\n`)
  for (const weight of [0.5, 0.35, 0.2, 0]) {
    console.log(`  CHALLENGE_WEIGHT ${weight.toFixed(2)}`)
    console.log(`  Contact  ${HEADER}`)
    for (const contact of [20, 35, 50, 65, 80]) {
      const l = measure(batterOf(contact, 50, 50), SIM_POLICY, paCount, seedFor(baseSeed, contact, weight), weight)
      console.log(`  ${String(contact).padStart(7)}  ${lineOf(l)}`)
    }
    console.log()
  }
}

// ============================================================================
// CLI
// ============================================================================

const MODES: Record<string, (paCount: number, baseSeed: number) => void> = {
  policies: modePolicies,
  ratings: modeRatings,
  challenge: modeChallenge
}

const mode = process.argv[2] ?? 'policies'
const paCount = Number(process.argv[3] ?? 40000)
const baseSeed = Number(process.argv[4] ?? 20260401)

const run = MODES[mode]
if (run === undefined) {
  console.error(`Unknown mode "${mode}". Use one of: ${Object.keys(MODES).join(', ')}`)
  process.exit(1)
}

console.log(`Short Season probe: mode "${mode}", ${paCount} PA per line, base seed ${baseSeed}`)
console.log(`Opponent pitcher pool: ${PITCHER_POOL.length} pitchers, cycled.`)
run(paCount, baseSeed)
