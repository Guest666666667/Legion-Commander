
import { UnitType } from '../../types';

// Steps per level: [Level 1, Level 2, ..., Level 6]
export const LEVEL_STEPS = [1, 12, 15, 18, 21, 25];

export interface LevelConfig {
  difficultyMult: number; // Multiplier for Enemy Stats and Size
  unitCounts: Partial<Record<UnitType, number>>; // Enemy composition
  enemyCommanders: UnitType[]; // Now uses specific UnitType keys
}

export const GAME_LEVELS: LevelConfig[] = [
  { 
    // Level 1: Basic Melee + Range
    difficultyMult: 1.0, 
    unitCounts: { [UnitType.INFANTRY]: 1, [UnitType.ARCHER]: 1 }, 
    enemyCommanders: [] 
  },
  { 
    // Level 2
    difficultyMult: 1.0, 
    unitCounts: { [UnitType.INFANTRY]: 4, [UnitType.ARCHER]: 3 }, 
    enemyCommanders: [] 
  },
  { 
    // Level 3: Unlock Shield
    difficultyMult: 1.0, 
    unitCounts: { [UnitType.INFANTRY]: 6, [UnitType.ARCHER]: 4, [UnitType.SHIELD]: 1 }, 
    enemyCommanders: [UnitType.COMMANDER_WARLORD] 
  },
  { 
    // Level 4: Unlock Spear
    difficultyMult: 1.05, 
    unitCounts: { [UnitType.INFANTRY]: 9, [UnitType.ARCHER]: 7, [UnitType.SHIELD]: 3, [UnitType.SPEAR]: 1 }, 
    enemyCommanders: [UnitType.COMMANDER_ELF] 
  },
  { 
    // Level 5: Introduce Commander
    difficultyMult: 1.1, 
    unitCounts: { [UnitType.INFANTRY]: 12, [UnitType.ARCHER]: 10, [UnitType.SHIELD]: 7, [UnitType.SPEAR]: 5 }, 
    enemyCommanders: [UnitType.COMMANDER_GUARDIAN] 
  },
  { 
    // Level 6: Boss Rush
    difficultyMult: 1.2, 
    unitCounts: { [UnitType.INFANTRY]: 18, [UnitType.ARCHER]: 15, [UnitType.SHIELD]: 12, [UnitType.SPEAR]: 8 }, 
    enemyCommanders: [UnitType.COMMANDER_VANGUARD, UnitType.COMMANDER_CENTURION] 
  }
];
