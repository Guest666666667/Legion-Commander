
import { UnitType } from '../../types';

// Spawn Position Configuration (Percentages 0-100)
// 'base': Starting X position
// 'variance': Random amount added to base
export const SPAWN_CONFIG = {
  PLAYER: {
    [UnitType.ARCHER]: { base: 5, variance: 8 },
    [UnitType.INFANTRY]: { base: 10, variance: 10 },
    [UnitType.SHIELD]: { base: 40, variance: 5 },
    [UnitType.SPEAR]: { base: 15, variance: 10 },
    
    // Commanders
    [UnitType.COMMANDER_CENTURION]: { base: 20, variance: 10 },
    [UnitType.COMMANDER_ELF]: { base: 10, variance: 10 },
    [UnitType.COMMANDER_WARLORD]: { base: 30, variance: 10 },
    [UnitType.COMMANDER_GUARDIAN]: { base: 35, variance: 10 },
    [UnitType.COMMANDER_VANGUARD]: { base: 25, variance: 10 },
    
    DEFAULT: { base: 10, variance: 10 }
  },
  ENEMY: {
    [UnitType.ARCHER]: { base: 90, variance: 8 },
    [UnitType.INFANTRY]: { base: 85, variance: 10 },
    [UnitType.SHIELD]: { base: 55, variance: 5 },
    [UnitType.SPEAR]: { base: 80, variance: 10 },
    
    // Commanders
    [UnitType.COMMANDER_CENTURION]: { base: 75, variance: 10 },
    [UnitType.COMMANDER_ELF]: { base: 85, variance: 10 },
    [UnitType.COMMANDER_WARLORD]: { base: 70, variance: 10 },
    [UnitType.COMMANDER_GUARDIAN]: { base: 60, variance: 10 },
    [UnitType.COMMANDER_VANGUARD]: { base: 75, variance: 10 },

    DEFAULT: { base: 85, variance: 10 }
  }
};
