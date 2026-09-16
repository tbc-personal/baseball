/**
 * The at-bat screen (docs/mockups/Main.dc.html; GAME_DESIGN.md 3, 8): score
 * strip, diamond + count, batter card, pitcher read, choice buttons, last
 * play. Purely a composition of the sub-components above plus format.ts's
 * pure formatters -- it holds no baseball logic and no branching worth
 * testing on its own (see tests/ui.at-bat.test.tsx, which covers format.ts
 * and engine/recommend.ts directly).
 */

import type { Bases, Batter, BatterStats, Choice, Count, HalfInning, ReadBucket, Tendency } from '../engine/types'
import { ScoreStrip } from './ScoreStrip'
import { DiamondAndCount } from './DiamondAndCount'
import { BatterCard } from './BatterCard'
import { PitcherRead } from './PitcherRead'
import { ChoiceButtons } from './ChoiceButtons'
import { useKeyBindings } from './useKeyBindings'
import { LastPlay } from './LastPlay'
import { halfInningLabel, battingOrderLabel, seasonLine } from './format'

export interface AtBatScreenProps {
  ownTeamName: string
  ownScore: number
  opponentName: string
  opponentScore: number
  half: HalfInning
  inning: number

  bases: Bases
  count: Count
  outs: number
  battingTeamBatters: readonly Batter[]

  batter: Batter
  batterOrderIndex: number
  batterStats: BatterStats

  pitcherName: string
  bucket: ReadBucket
  tendency: Tendency
  pitchLabel: string

  recommended: Choice
  buntAvailable: boolean
  lastPitch: string | null
  lastPlay: string | null

  onChoose: (choice: Choice) => void
  disabled?: boolean
}

export function AtBatScreen(props: AtBatScreenProps) {
  // Keyboard play. Letters match the button faces (and the hints rendered
  // on them); the digits are the same three in the order they sit on
  // screen, for a hand that stays on the number row. Enter takes the
  // recommended choice, which is the one already drawn as filled ink.
  //
  // Bunt is bound only when it is offered, so pressing B with the bases
  // empty does nothing rather than quietly attempting an illegal choice --
  // `useKeyBindings` leaves an undefined binding's event alone.
  const bunt = props.buntAvailable ? () => props.onChoose('Bunt') : undefined
  useKeyBindings(
    {
      t: () => props.onChoose('Take'),
      c: () => props.onChoose('Contact'),
      p: () => props.onChoose('Power'),
      b: bunt,
      '1': () => props.onChoose('Take'),
      '2': () => props.onChoose('Contact'),
      '3': () => props.onChoose('Power'),
      '4': bunt,
      Enter: () => props.onChoose(props.recommended)
    },
    props.disabled !== true
  )

  return (
    <div className="sc-screen">
      <ScoreStrip
        ownName={props.ownTeamName}
        ownScore={props.ownScore}
        opponentName={props.opponentName}
        opponentScore={props.opponentScore}
        halfLabel={halfInningLabel(props.half, props.inning)}
      />
      <DiamondAndCount bases={props.bases} count={props.count} outs={props.outs} batters={props.battingTeamBatters} />
      <BatterCard
        orderLabel={battingOrderLabel(props.batterOrderIndex)}
        seasonLine={seasonLine(props.batterStats)}
        name={props.batter.name}
        position={props.batter.position}
        contact={props.batter.contact}
        power={props.batter.power}
        eye={props.batter.eye}
      />
      <PitcherRead pitcherName={props.pitcherName} bucket={props.bucket} tendency={props.tendency} pitchLabel={props.pitchLabel} />
      <ChoiceButtons
        recommended={props.recommended}
        buntAvailable={props.buntAvailable}
        onChoose={props.onChoose}
        disabled={props.disabled}
      />
      <LastPlay pitch={props.lastPitch} play={props.lastPlay} />
    </div>
  )
}
