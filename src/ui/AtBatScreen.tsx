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
  lastPlay: string | null

  onChoose: (choice: Choice) => void
  disabled?: boolean
}

export function AtBatScreen(props: AtBatScreenProps) {
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
      <LastPlay play={props.lastPlay} />
    </div>
  )
}
