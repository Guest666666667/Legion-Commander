
import { UnitType, CommanderProfile, CommanderType, EntityStats } from './types';
import { Box, Grid, Coins, Swords, Crosshair, ShieldCheck, Tent, Footprints, LucideIcon } from 'lucide-react';

export const INITIAL_GRID_SIZE = 3;
export const MAX_GRID_SIZE = 5;
export const LEVELS_PER_RUN = 6;
export const DEFAULT_SPEED_MULTIPLIER = 3;
export const VICTORY_DELAY_MS = 2000;

// Steps per level: [Level 1, Level 2, ..., Level 6]
export const LEVEL_STEPS = [10, 13, 18, 25, 34, 45];

export const SCORING = {
  VICTORY_BONUS: 5000,
  MATCH_3: 100,
  MATCH_4: 300,
  MATCH_5: 1000,
  RESHUFFLE_COST: 50,
  UNIT_SURVIVOR_BONUS: {
    [UnitType.COMMANDER]: 800,
    [UnitType.INFANTRY]: 100,
    [UnitType.ARCHER]: 100,
    [UnitType.SHIELD]: 150,
    [UnitType.SPEAR]: 200,
  } as Record<string, number>,
  KILL_SCORE: {
    [UnitType.COMMANDER]: 400,
    [UnitType.INFANTRY]: 50, 
    [UnitType.ARCHER]: 50,
    [UnitType.SHIELD]: 75,
    [UnitType.SPEAR]: 100,
    [UnitType.OBSTACLE]: 5,
  } as Record<string, number>
};

export const COMMANDERS: Record<CommanderType, CommanderProfile> = {
  [CommanderType.CENTURION]: {
    id: CommanderType.CENTURION,
    name: "Centurion",
    role: "Tactician",
    description: "A disciplined leader of the iron legion.",
    skillName: "Reinforce",
    skillDesc: "At battle start, randomly recruits 1 adjacent soldier."
  },
  [CommanderType.ELF]: {
    id: CommanderType.ELF,
    name: "Elven Ranger",
    role: "Sharpshooter",
    description: "A master of long-range warfare.",
    skillName: "Eagle Eye",
    skillDesc: "All friendly Archers gain +50% Attack Range."
  }
};

// Speed: Lower is faster (ms delay between attacks)
export const UNIT_STATS: Record<UnitType, EntityStats> = {
  [UnitType.COMMANDER]: { hp: 500, maxHp: 500, atk: 30, range: 1, def: 5, speed: 1000, scale: 1.2 },
  [UnitType.INFANTRY]: { hp: 100, maxHp: 100, atk: 15, range: 1, def: 2, speed: 800, scale: 1 }, // Fast attacker
  [UnitType.ARCHER]: { hp: 60, maxHp: 60, atk: 25, range: 6, def: 0, speed: 2000, scale: 0.8 },   // Slow attacker, high dmg
  [UnitType.SHIELD]: { hp: 200, maxHp: 200, atk: 8, range: 1, def: 8, speed: 1200, scale: 1.1 },
  [UnitType.SPEAR]: { hp: 120, maxHp: 120, atk: 20, range: 2.5, def: 3, speed: 1100, scale: 1 }, // Slightly ranged melee
  [UnitType.OBSTACLE]: { hp: 500, maxHp: 500, atk: 0, range: 0, def: 0, speed: 99999, scale: 1 },
};

// Upgrade Config: Absolute values added to base stats
export const UNIT_UPGRADES: Partial<Record<UnitType, Partial<EntityStats>>> = {
  [UnitType.INFANTRY]: { hp: 50, atk: 10, def: 1, scale: 1.3 },
  [UnitType.ARCHER]: { hp: 30, atk: 15, range: 2, scale: 1.3 },
  [UnitType.SHIELD]: { hp: 100, def: 4, scale: 1.3 },
  [UnitType.SPEAR]: { hp: 90, atk: 15, scale: 1.3 },
};

export const UNIT_COLORS: Record<UnitType, string> = {
  [UnitType.COMMANDER]: 'bg-yellow-700',
  [UnitType.INFANTRY]: 'bg-red-900',
  [UnitType.ARCHER]: 'bg-emerald-900',
  [UnitType.SHIELD]: 'bg-blue-900',
  [UnitType.SPEAR]: 'bg-purple-900',
  [UnitType.OBSTACLE]: 'bg-gray-700',
};

// Reward Definitions
export interface RewardDef {
  id: string;
  label: string;
  desc: string;
  icon: any; // LucideIcon type
}

export const REWARD_DEFINITIONS: Record<string, RewardDef> = {
  'EXPAND': { id: 'EXPAND', label: 'Expand', desc: 'Increase board size by 1. Adds new Unit types.', icon: Grid },
  'SCAVENGER': { id: 'SCAVENGER', label: 'Scavenger', desc: 'Obstacle lines (3+) summon units passively.', icon: Box },
  'GREED': { id: 'GREED', label: 'Greed', desc: '+1 Reward Selection for future victories.', icon: Coins },
  'AGILITY': { id: 'AGILITY', label: 'Agility', desc: 'Commander Move Range +1.', icon: Footprints },
  [`UPGRADE_${UnitType.INFANTRY}`]: { id: `UPGRADE_${UnitType.INFANTRY}`, label: 'Elite Inf.', desc: '+HP, +ATK, +DEF', icon: Swords },
  [`UPGRADE_${UnitType.ARCHER}`]: { id: `UPGRADE_${UnitType.ARCHER}`, label: 'Elite Arch.', desc: '+HP, +ATK, +RANGE', icon: Crosshair },
  [`UPGRADE_${UnitType.SHIELD}`]: { id: `UPGRADE_${UnitType.SHIELD}`, label: 'Elite Shld.', desc: '+HP, +DEF', icon: ShieldCheck },
  [`UPGRADE_${UnitType.SPEAR}`]: { id: `UPGRADE_${UnitType.SPEAR}`, label: 'Elite Spr.', desc: '+HP, +ATK', icon: Tent },
};

// --- LEVEL CONFIGURATION ---

export interface LevelConfig {
  difficultyMult: number; // Multiplier for Enemy Stats
  unitCounts: Partial<Record<UnitType, number>>; // Enemy composition
  commanderCount: number;
}

export const GAME_LEVELS: LevelConfig[] = [
  { 
    // Level 1: Basic Melee + Range
    difficultyMult: 1.0, 
    unitCounts: { [UnitType.INFANTRY]: 3, [UnitType.ARCHER]: 1 }, 
    commanderCount: 0 
  },
  { 
    // Level 2: Unlock Shield
    difficultyMult: 1.05, 
    unitCounts: { [UnitType.INFANTRY]: 4, [UnitType.ARCHER]: 2 }, 
    commanderCount: 0 
  },
  { 
    // Level 3: Unlock Spear
    difficultyMult: 1.1, 
    unitCounts: { [UnitType.INFANTRY]: 6, [UnitType.ARCHER]: 4, [UnitType.SHIELD]: 1 }, 
    commanderCount: 0 
  },
  { 
    // Level 4: Introduce Commander
    difficultyMult: 1.15, 
    unitCounts: { [UnitType.INFANTRY]: 9, [UnitType.ARCHER]: 5, [UnitType.SHIELD]: 3, [UnitType.SPEAR]: 1 }, 
    commanderCount: 0 
  },
  { 
    // Level 5: Two Commanders
    difficultyMult: 1.25, 
    unitCounts: { [UnitType.INFANTRY]: 12, [UnitType.ARCHER]: 7, [UnitType.SHIELD]: 5, [UnitType.SPEAR]: 2 }, 
    commanderCount: 1 
  },
  { 
    // Level 6: Boss Rush (4 Commanders)
    difficultyMult: 1.4, 
    unitCounts: { [UnitType.INFANTRY]: 15, [UnitType.ARCHER]: 10, [UnitType.SHIELD]: 8, [UnitType.SPEAR]: 5 }, 
    commanderCount: 2 
  }
];
