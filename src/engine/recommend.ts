/**
 * UI-affordance selector: which choice button the at-bat screen fills in
 * as "recommended" (docs/mockups/README.md: "the recommended choice is
 * filled ink").
 *
 * This is NOT a game rule. GAME_DESIGN.md does not define "recommended" --
 * there is no strategy engine in scope for this project, and none is
 * implied by any ticket. This is the simplest defensible rule consistent
 * with the one piece of information the player already has before
 * choosing (the displayed read): swing big when the read says the pitch
 * is likely a strike, take when it says likely a ball, and default to the
 * balanced middle option (Contact) on a coin flip. It is pure and
 * deterministic so it stays testable, but it is an invented UI
 * convenience, not baseball -- flagged as such in the T7 report.
 */

import type { Choice, ReadBucket } from './types'

export function recommendedChoice(displayedBucket: ReadBucket): Choice {
  switch (displayedBucket) {
    case 'Likely strike':
      return 'Power'
    case 'Likely ball':
      return 'Take'
    case 'Coin flip':
      return 'Contact'
  }
}
