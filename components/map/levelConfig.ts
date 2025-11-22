
import { UnitType } from '../../types';

// Steps per level: [Level 1, ..., Level 7]
export const LEVEL_STEPS = [6, 7, 8, 9, 10, 11, 12];

export interface LevelConfig {
  difficultyMult: number; // Multiplier for Enemy Stats and Size
  unitCounts: Partial<Record<UnitType, number>>; // Enemy composition
  enemyCommanders: UnitType[]; // Now uses specific UnitType keys
}

export const GAME_LEVELS: LevelConfig[] = [
  { 
    // Level 1: Basic Melee + Range
    difficultyMult: 1, 
    unitCounts: { [UnitType.INFANTRY]: 2, [UnitType.ARCHER]: 1 }, 
    enemyCommanders: [] 
  },
  { 
    // Level 2
    difficultyMult: 1.0, 
    unitCounts: { [UnitType.INFANTRY]: 5, [UnitType.ARCHER]: 3 }, 
    enemyCommanders: [] 
  },
  { 
    // Level 3: Unlock Shield (Warlord)
    difficultyMult: 1.0, 
    unitCounts: { [UnitType.INFANTRY]: 7, [UnitType.ARCHER]: 5, [UnitType.SHIELD]: 2 }, 
    enemyCommanders: [] 
  },
  { 
    // Level 4: MINI BOSS
    difficultyMult: 1.05, 
    unitCounts: { [UnitType.INFANTRY]: 8, [UnitType.ARCHER]: 6, [UnitType.SHIELD]: 4, [UnitType.SPEAR]: 2 }, 
    enemyCommanders: [UnitType.COMMANDER_WARLORD] 
  },
  { 
    // Level 5: Unlock Spear (Elf)
    difficultyMult: 1.1, 
    unitCounts: { [UnitType.INFANTRY]: 10, [UnitType.ARCHER]: 8, [UnitType.SHIELD]: 5, [UnitType.SPEAR]: 3 }, 
    enemyCommanders: [UnitType.COMMANDER_ELF] 
  },
  { 
    // Level 6: High Defense (Guardian)
    difficultyMult: 1.15, 
    unitCounts: { [UnitType.INFANTRY]: 10, [UnitType.ARCHER]: 10, [UnitType.SHIELD]: 10, [UnitType.SPEAR]: 6 }, 
    enemyCommanders: [UnitType.COMMANDER_GUARDIAN] 
  },
  { 
    // Level 7: FINAL BOSS (Vanguard + Warlord)
    difficultyMult: 1.25, 
    unitCounts: { [UnitType.INFANTRY]: 20, [UnitType.ARCHER]: 18, [UnitType.SHIELD]: 15, [UnitType.SPEAR]: 10 }, 
    enemyCommanders: [UnitType.COMMANDER_VANGUARD, UnitType.COMMANDER_CENTURION] 
  }
];
