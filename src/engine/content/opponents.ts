/**
 * Opponent teams from the Flyway League
 * From GAME_DESIGN.md §5.2 – transcribed exactly, ordered weakest to strongest
 */

import type { Batter, Team } from '../types'

/** The league name */
export const LEAGUE_NAME = 'Flyway League'

/**
 * Helper to create a team's nine batters with shared C/P/E ratings
 */
function createTeamBatters(
  teamId: string,
  contact: number,
  power: number,
  eye: number,
  names: string[]
): Batter[] {
  return names.map((name, i) => ({
    id: `${teamId}-batter-${i + 1}`,
    name,
    position: 'DH', // simplified: all hitters are "DH" in v1
    contact,
    power,
    eye
  }))
}

/**
 * Ashford Wrens: C45 P45 E45
 * Pitchers: 50/45/Neutral, 45/50/Nibbler
 * Weakest team
 */
export const ASHFORD_WRENS = {
  id: 'wrens',
  name: 'Ashford Wrens',
  shortName: 'Wrens',
  batters: createTeamBatters('wrens', 45, 45, 45, [
    'Twyla Finch',
    'Pip Sparrow',
    'Mercer Wren',
    'Indigo Swift',
    'Chester Thrush',
    'Ollie Warbler',
    'Nora Titmouse',
    'Silas Jay',
    'Vera Chickadee'
  ]),
  pitchers: [
    {
      id: 'wrens-pitcher-1',
      name: 'Grady Thornton',
      control: 50,
      stuff: 45,
      tendency: 'Neutral' as const
    },
    {
      id: 'wrens-pitcher-2',
      name: 'Ezra Ashford',
      control: 45,
      stuff: 50,
      tendency: 'Nibbler' as const
    }
  ]
}

/**
 * Bellweather Grackles: C50 P55 E45
 * Pitchers: 55/55/Attacker, 50/50/Neutral
 */
export const BELLWEATHER_GRACKLES = {
  id: 'grackles',
  name: 'Bellweather Grackles',
  shortName: 'Grackles',
  batters: createTeamBatters('grackles', 50, 55, 45, [
    'Vivian Crow',
    'Marcus Raven',
    'Lexi Starling',
    'Jax Blackbird',
    'Sage Cowbird',
    'Dakota Magpie',
    'Casey Jackdaw',
    'Riley Rook',
    'Morgan Oriole'
  ]),
  pitchers: [
    {
      id: 'grackles-pitcher-1',
      name: 'Hadley Sterling',
      control: 55,
      stuff: 55,
      tendency: 'Attacker' as const
    },
    {
      id: 'grackles-pitcher-2',
      name: 'Avery Bellweather',
      control: 50,
      stuff: 50,
      tendency: 'Neutral' as const
    }
  ]
}

/**
 * Copper Hill Kestrels: C55 P50 E50
 * Pitchers: 60/50/Attacker, 50/60/Neutral
 */
export const COPPER_HILL_KESTRELS = {
  id: 'kestrels',
  name: 'Copper Hill Kestrels',
  shortName: 'Kestrels',
  batters: createTeamBatters('kestrels', 55, 50, 50, [
    'Kestrel Hayes',
    'Falcon Moss',
    'Merlin Cross',
    'Ember Hawk',
    'Scout Harrier',
    'Peregrine Stone',
    'Arrow Buzzard',
    'Talus Swift',
    'Eyrie Noble'
  ]),
  pitchers: [
    {
      id: 'kestrels-pitcher-1',
      name: 'Sienna Copper',
      control: 60,
      stuff: 50,
      tendency: 'Attacker' as const
    },
    {
      id: 'kestrels-pitcher-2',
      name: 'Everett Ridgeton',
      control: 50,
      stuff: 60,
      tendency: 'Neutral' as const
    }
  ]
}

/**
 * Silver Lake Loons: C50 P50 E55
 * Pitchers: 45/60/Nibbler, 55/50/Neutral
 */
export const SILVER_LAKE_LOONS = {
  id: 'loons',
  name: 'Silver Lake Loons',
  shortName: 'Loons',
  batters: createTeamBatters('loons', 50, 50, 55, [
    'Sterling Beck',
    'Waverly Finn',
    'Diver Cross',
    'Luminous Drake',
    'Aqua Maven',
    'Horizon Crane',
    'Mirrored Wells',
    'Silvian Greens',
    'Echoing Song'
  ]),
  pitchers: [
    {
      id: 'loons-pitcher-1',
      name: 'Thea Lakeside',
      control: 45,
      stuff: 60,
      tendency: 'Nibbler' as const
    },
    {
      id: 'loons-pitcher-2',
      name: 'Silas Silverton',
      control: 55,
      stuff: 50,
      tendency: 'Neutral' as const
    }
  ]
}

/**
 * Marrow Creek Cranes: C55 P60 E50
 * Pitchers: 60/60/Attacker, 55/55/Nibbler
 */
export const MARROW_CREEK_CRANES = {
  id: 'cranes',
  name: 'Marrow Creek Cranes',
  shortName: 'Cranes',
  batters: createTeamBatters('cranes', 55, 60, 50, [
    'Egret Vale',
    'Heron Marsh',
    'Ibis Shore',
    'Spoonbill Reach',
    'Sandhill Pride',
    'Whooping Charm',
    'Crowned Ash',
    'Creekside Swan',
    'Marrow Stone'
  ]),
  pitchers: [
    {
      id: 'cranes-pitcher-1',
      name: 'Gavin Torrent',
      control: 60,
      stuff: 60,
      tendency: 'Attacker' as const
    },
    {
      id: 'cranes-pitcher-2',
      name: 'Presley Marrow',
      control: 55,
      stuff: 55,
      tendency: 'Nibbler' as const
    }
  ]
}

/**
 * Port Ellery Ospreys: C60 P55 E60
 * Pitchers: 65/65/Attacker, 60/60/Neutral
 * Strongest team
 */
export const PORT_ELLERY_OSPREYS = {
  id: 'ospreys',
  name: 'Port Ellery Ospreys',
  shortName: 'Ospreys',
  batters: createTeamBatters('ospreys', 60, 55, 60, [
    'Erne Saunders',
    'Bald Ashton',
    'Golden Majestic',
    'Wedge-tail Sinclair',
    'Harpy Quinn',
    'Talon Swift',
    'Pier Ellery',
    'Seafarer Drake',
    'Royale Marsh'
  ]),
  pitchers: [
    {
      id: 'ospreys-pitcher-1',
      name: 'Atlas Kingfisher',
      control: 65,
      stuff: 65,
      tendency: 'Attacker' as const
    },
    {
      id: 'ospreys-pitcher-2',
      name: 'Desmond Ellery',
      control: 60,
      stuff: 60,
      tendency: 'Neutral' as const
    }
  ]
}

/** All opponent teams, ordered weakest to strongest */
export const OPPONENTS: Team[] = [
  ASHFORD_WRENS,
  BELLWEATHER_GRACKLES,
  COPPER_HILL_KESTRELS,
  SILVER_LAKE_LOONS,
  MARROW_CREEK_CRANES,
  PORT_ELLERY_OSPREYS
]
