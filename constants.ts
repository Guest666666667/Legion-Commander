
import { UnitType } from './types';

export const INITIAL_GRID_SIZE = 3;
export const MAX_GRID_SIZE = 5;
export const LEVELS_PER_RUN = 6;
export const DEFAULT_SPEED_MULTIPLIER = 3;
export const VICTORY_DELAY_MS = 2000;
export const MAX_PER_UNIT_COUNT = 10; // Max number of units PER TYPE to carry over (e.g., max 6 Archers, max 6 Infantry)

// DEBUG: Define units to spawn immediately with the Commander at game start
export const INITIAL_ARMY_CONFIG: UnitType[] = [
    // UnitType.INFANTRY,
    // UnitType.ARCHER,
    // UnitType.SHIELD,
    // UnitType.SPEAR
];

export const SCORING = {
  VICTORY_BONUS: 5000,
  GEM_WIN_BONUS: 150, // Gems earned per victory
  MATCH_3: 100,
  MATCH_4: 300,
  MATCH_5: 1000,
  RESHUFFLE_COST: -50,
  UNIT_SURVIVOR_BONUS: {
    [UnitType.COMMANDER_CENTURION]: 800,
    [UnitType.COMMANDER_ELF]: 800,
    [UnitType.COMMANDER_WARLORD]: 800,
    [UnitType.COMMANDER_GUARDIAN]: 800,
    [UnitType.COMMANDER_VANGUARD]: 800,
    [UnitType.INFANTRY]: 100,
    [UnitType.ARCHER]: 100,
    [UnitType.SHIELD]: 150,
    [UnitType.SPEAR]: 200,
  } as Record<string, number>,
  KILL_SCORE: {
    [UnitType.COMMANDER_CENTURION]: 400,
    [UnitType.COMMANDER_ELF]: 400,
    [UnitType.COMMANDER_WARLORD]: 400,
    [UnitType.COMMANDER_GUARDIAN]: 400,
    [UnitType.COMMANDER_VANGUARD]: 400,
    [UnitType.INFANTRY]: 50, 
    [UnitType.ARCHER]: 50,
    [UnitType.SHIELD]: 75,
    [UnitType.SPEAR]: 100,
    [UnitType.OBSTACLE]: 5,
  } as Record<string, number>
};
