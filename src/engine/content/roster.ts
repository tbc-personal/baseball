/**
 * Harbor Herons roster (your team)
 * From GAME_DESIGN.md §5.1 – transcribed exactly
 */

import type { Batter, Pitcher } from '../types'

/**
 * Batting lineup: 9 batters in batting order
 * Contact, Power, Eye ratings transcribed exactly from §5.1 table
 */
export const HERONS_BATTERS: Batter[] = [
  {
    id: 'herons-batter-1',
    name: 'Dee Okafor',
    position: 'CF',
    contact: 60,
    power: 35,
    eye: 65
  },
  {
    id: 'herons-batter-2',
    name: 'Marco Villanueva',
    position: '2B',
    contact: 65,
    power: 40,
    eye: 55
  },
  {
    id: 'herons-batter-3',
    name: 'Sam Achterberg',
    position: 'RF',
    contact: 55,
    power: 65,
    eye: 55
  },
  {
    id: 'herons-batter-4',
    name: 'Tomasz "Tank" Wrona',
    position: '1B',
    contact: 40,
    power: 75,
    eye: 40
  },
  {
    id: 'herons-batter-5',
    name: 'Ines Ferreira',
    position: '3B',
    contact: 50,
    power: 60,
    eye: 50
  },
  {
    id: 'herons-batter-6',
    name: 'Kwame Boateng',
    position: 'LF',
    contact: 55,
    power: 50,
    eye: 45
  },
  {
    id: 'herons-batter-7',
    name: 'Ruth Halvorsen',
    position: 'SS',
    contact: 50,
    power: 35,
    eye: 60
  },
  {
    id: 'herons-batter-8',
    name: 'Eli Nakamura',
    position: 'C',
    contact: 45,
    power: 45,
    eye: 50
  },
  {
    id: 'herons-batter-9',
    name: 'Jordan Pike',
    position: 'DH',
    contact: 35,
    power: 55,
    eye: 30
  }
]

/**
 * Pitching staff: three starters rotated by game
 * Control, Stuff, Tendency transcribed exactly from §5.1 table
 */
export const HERONS_PITCHERS: Pitcher[] = [
  {
    id: 'herons-pitcher-1',
    name: 'Priya Raman',
    control: 60,
    stuff: 50,
    tendency: 'Attacker'
  },
  {
    id: 'herons-pitcher-2',
    name: 'Owen Castellanos',
    control: 45,
    stuff: 65,
    tendency: 'Nibbler'
  },
  {
    id: 'herons-pitcher-3',
    name: 'Bea Lindqvist',
    control: 55,
    stuff: 45,
    tendency: 'Neutral'
  }
]
