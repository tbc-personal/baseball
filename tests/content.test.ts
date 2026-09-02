import { describe, it, expect } from 'vitest'
import { HERONS_BATTERS, HERONS_PITCHERS } from '../src/engine/content/roster'
import { OPPONENTS, LEAGUE_NAME } from '../src/engine/content/opponents'

describe('Content validation', () => {
  describe('Roster', () => {
    it('has exactly 9 batters', () => {
      expect(HERONS_BATTERS).toHaveLength(9)
    })

    it('batters are in documented order with documented ratings', () => {
      const expected = [
        { name: 'Dee Okafor', pos: 'CF', c: 60, p: 35, e: 65 },
        { name: 'Marco Villanueva', pos: '2B', c: 65, p: 40, e: 55 },
        { name: 'Sam Achterberg', pos: 'RF', c: 55, p: 65, e: 55 },
        { name: 'Tomasz "Tank" Wrona', pos: '1B', c: 40, p: 75, e: 40 },
        { name: 'Ines Ferreira', pos: '3B', c: 50, p: 60, e: 50 },
        { name: 'Kwame Boateng', pos: 'LF', c: 55, p: 50, e: 45 },
        { name: 'Ruth Halvorsen', pos: 'SS', c: 50, p: 35, e: 60 },
        { name: 'Eli Nakamura', pos: 'C', c: 45, p: 45, e: 50 },
        { name: 'Jordan Pike', pos: 'DH', c: 35, p: 55, e: 30 }
      ]

      HERONS_BATTERS.forEach((batter, i) => {
        const exp = expected[i]
        expect(batter.name).toBe(exp.name)
        expect(batter.position).toBe(exp.pos)
        expect(batter.contact).toBe(exp.c)
        expect(batter.power).toBe(exp.p)
        expect(batter.eye).toBe(exp.e)
      })
    })

    it('has exactly 3 pitchers', () => {
      expect(HERONS_PITCHERS).toHaveLength(3)
    })

    it('pitchers have documented ratings', () => {
      const expected = [
        { name: 'Priya Raman', control: 60, stuff: 50, tendency: 'Attacker' as const },
        { name: 'Owen Castellanos', control: 45, stuff: 65, tendency: 'Nibbler' as const },
        { name: 'Bea Lindqvist', control: 55, stuff: 45, tendency: 'Neutral' as const }
      ]

      HERONS_PITCHERS.forEach((pitcher, i) => {
        const exp = expected[i]
        expect(pitcher.name).toBe(exp.name)
        expect(pitcher.control).toBe(exp.control)
        expect(pitcher.stuff).toBe(exp.stuff)
        expect(pitcher.tendency).toBe(exp.tendency)
      })
    })
  })

  describe('Opponents', () => {
    it('has exactly 6 opponents', () => {
      expect(OPPONENTS).toHaveLength(6)
    })

    it('has Flyway League name', () => {
      expect(LEAGUE_NAME).toBe('Flyway League')
    })

    it('each opponent has exactly 9 hitters', () => {
      OPPONENTS.forEach((team) => {
        expect(team.batters).toHaveLength(9)
      })
    })

    it('each opponent has exactly 2 pitchers', () => {
      OPPONENTS.forEach((team) => {
        expect(team.pitchers).toHaveLength(2)
      })
    })

    it('opponents have documented ratings (sample check)', () => {
      const wrens = OPPONENTS[0]
      expect(wrens.id).toBe('wrens')
      expect(wrens.name).toBe('Ashford Wrens')
      expect(wrens.batters[0].contact).toBe(45)
      expect(wrens.batters[0].power).toBe(45)
      expect(wrens.batters[0].eye).toBe(45)
      expect(wrens.pitchers[0]).toEqual(
        expect.objectContaining({
          control: 50,
          stuff: 45,
          tendency: 'Neutral'
        })
      )
      expect(wrens.pitchers[1]).toEqual(
        expect.objectContaining({
          control: 45,
          stuff: 50,
          tendency: 'Nibbler'
        })
      )

      const ospreys = OPPONENTS[5]
      expect(ospreys.id).toBe('ospreys')
      expect(ospreys.name).toBe('Port Ellery Ospreys')
      expect(ospreys.batters[0].contact).toBe(60)
      expect(ospreys.batters[0].power).toBe(55)
      expect(ospreys.batters[0].eye).toBe(60)
      expect(ospreys.pitchers[0]).toEqual(
        expect.objectContaining({
          control: 65,
          stuff: 65,
          tendency: 'Attacker'
        })
      )
      expect(ospreys.pitchers[1]).toEqual(
        expect.objectContaining({
          control: 60,
          stuff: 60,
          tendency: 'Neutral'
        })
      )
    })
  })

  describe('Ratings validation', () => {
    it('all batter ratings are in [20, 80]', () => {
      HERONS_BATTERS.forEach((batter) => {
        expect(batter.contact).toBeGreaterThanOrEqual(20)
        expect(batter.contact).toBeLessThanOrEqual(80)
        expect(batter.power).toBeGreaterThanOrEqual(20)
        expect(batter.power).toBeLessThanOrEqual(80)
        expect(batter.eye).toBeGreaterThanOrEqual(20)
        expect(batter.eye).toBeLessThanOrEqual(80)
      })

      OPPONENTS.forEach((team) => {
        team.batters.forEach((batter) => {
          expect(batter.contact).toBeGreaterThanOrEqual(20)
          expect(batter.contact).toBeLessThanOrEqual(80)
          expect(batter.power).toBeGreaterThanOrEqual(20)
          expect(batter.power).toBeLessThanOrEqual(80)
          expect(batter.eye).toBeGreaterThanOrEqual(20)
          expect(batter.eye).toBeLessThanOrEqual(80)
        })
      })
    })

    it('all pitcher ratings are in [20, 80]', () => {
      HERONS_PITCHERS.forEach((pitcher) => {
        expect(pitcher.control).toBeGreaterThanOrEqual(20)
        expect(pitcher.control).toBeLessThanOrEqual(80)
        expect(pitcher.stuff).toBeGreaterThanOrEqual(20)
        expect(pitcher.stuff).toBeLessThanOrEqual(80)
      })

      OPPONENTS.forEach((team) => {
        team.pitchers.forEach((pitcher) => {
          expect(pitcher.control).toBeGreaterThanOrEqual(20)
          expect(pitcher.control).toBeLessThanOrEqual(80)
          expect(pitcher.stuff).toBeGreaterThanOrEqual(20)
          expect(pitcher.stuff).toBeLessThanOrEqual(80)
        })
      })
    })
  })

  describe('ID uniqueness', () => {
    it('all batter ids are unique', () => {
      const allIds = [
        ...HERONS_BATTERS.map((b) => b.id),
        ...OPPONENTS.flatMap((team) => team.batters.map((b) => b.id))
      ]
      const uniqueIds = new Set(allIds)
      expect(uniqueIds.size).toBe(allIds.length)
    })

    it('all pitcher ids are unique', () => {
      const allIds = [
        ...HERONS_PITCHERS.map((p) => p.id),
        ...OPPONENTS.flatMap((team) => team.pitchers.map((p) => p.id))
      ]
      const uniqueIds = new Set(allIds)
      expect(uniqueIds.size).toBe(allIds.length)
    })

    it('all team ids are unique', () => {
      const allIds = ['herons', ...OPPONENTS.map((team) => team.id)]
      const uniqueIds = new Set(allIds)
      expect(uniqueIds.size).toBe(allIds.length)
    })
  })
})
