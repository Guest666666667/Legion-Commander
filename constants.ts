
import { UnitType, CommanderProfile, EntityStats, CommanderClass, BuffStats } from './types';
import { Box, Grid, Coins, Swords, Crosshair, ShieldCheck, Tent, Footprints, Hammer, UserPlus } from 'lucide-react';

export const INITIAL_GRID_SIZE = 3;
export const MAX_GRID_SIZE = 5;
export const LEVELS_PER_RUN = 6;
export const DEFAULT_SPEED_MULTIPLIER = 3;
export const VICTORY_DELAY_MS = 2000;
export const MAX_PER_UNIT_COUNT = 6; // Max number of units PER TYPE to carry over (e.g., max 6 Archers, max 6 Infantry)

// DEBUG: Define units to spawn immediately with the Commander at game start
export const INITIAL_ARMY_CONFIG: UnitType[] = [
    // UnitType.INFANTRY,
    // UnitType.ARCHER,
    // UnitType.SHIELD,
    // UnitType.SPEAR
];

// Steps per level: [Level 1, Level 2, ..., Level 6]
export const LEVEL_STEPS = [10, 12, 15, 18, 21, 25];

export const SCORING = {
  VICTORY_BONUS: 5000,
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

// Keys are now the specific UnitType
export const COMMANDERS: Record<string, CommanderProfile> = {
  [UnitType.COMMANDER_CENTURION]: {
    id: UnitType.COMMANDER_CENTURION,
    name: "Centurion",
    shortName: "Centurion",
    role: "Tactician",
    description: "A disciplined leader of the iron legion.",
    skillName: "Praetorian Guard",
    skillDesc: "Starts the campaign with a squad of four soldiers.",
    class: CommanderClass.CENTURION
  },
  [UnitType.COMMANDER_ELF]: {
    id: UnitType.COMMANDER_ELF,
    name: "Elven Ranger",
    shortName: "Ranger",
    role: "Sharpshooter",
    description: "A master of long-range warfare.",
    skillName: "Eagle Eye",
    skillDesc: "All Archer allies gain Attack Range and Attack Speed bouns.",
    class: CommanderClass.ELF
  },
  [UnitType.COMMANDER_WARLORD]: {
    id: UnitType.COMMANDER_WARLORD,
    name: "Iron Warlord",
    shortName: "Warlord",
    role: "Berserker",
    description: "A brutal commander who leads from the front.",
    skillName: "Bloodlust",
    skillDesc: "All Infantry allies gain HP and Attack Range bouns.",
    class: CommanderClass.WARLORD
  },
  [UnitType.COMMANDER_GUARDIAN]: {
    id: UnitType.COMMANDER_GUARDIAN,
    name: "High Guardian",
    shortName: "Guardian",
    role: "Protector",
    description: "A stalwart defender of the weak.",
    skillName: "Phalanx",
    skillDesc: "All Shield allies regenerate HP over time.",
    class: CommanderClass.GUARDIAN
  },
  [UnitType.COMMANDER_VANGUARD]: {
    id: UnitType.COMMANDER_VANGUARD,
    name: "Storm Vanguard",
    shortName: "Vanguard",
    role: "Shock Trooper",
    description: "A lightning-fast initiator.",
    skillName: "Blitzkrieg",
    skillDesc: "All Spear allies gain HP and MoveSpeed bouns.",
    class: CommanderClass.VANGUARD
  }
};

// atkSpeed: Lower is faster (ms delay between attacks)
// moveSpeed: Units per frame (approximate percentage of screen width)
export const UNIT_STATS: Record<UnitType, EntityStats> = {
  // --- COMMANDERS (Distinct Stats) ---
  [UnitType.COMMANDER_CENTURION]: { hp: 500, maxHp: 500, atk: 22, range: 1, def: 7, atkSpeed: 1000, moveSpeed: 0.025, scale: 1.2, commanderClass: CommanderClass.CENTURION },
  [UnitType.COMMANDER_ELF]:       { hp: 400, maxHp: 400, atk: 30, range: 5, def: 3, atkSpeed: 1500, moveSpeed: 0.03, scale: 1.1, commanderClass: CommanderClass.ELF },
  [UnitType.COMMANDER_WARLORD]:   { hp: 600, maxHp: 600, atk: 28, range: 1, def: 5, atkSpeed: 800, moveSpeed: 0.04, scale: 1.3, commanderClass: CommanderClass.WARLORD },
  [UnitType.COMMANDER_GUARDIAN]:  { hp: 800, maxHp: 800, atk: 15, range: 1, def: 15, atkSpeed: 1800, moveSpeed: 0.015, scale: 1.25, commanderClass: CommanderClass.GUARDIAN },
  [UnitType.COMMANDER_VANGUARD]:  { hp: 450, maxHp: 450, atk: 35, range: 2, def: 6, atkSpeed: 900, moveSpeed: 0.06, scale: 1.2, commanderClass: CommanderClass.VANGUARD },

  // --- SOLDIERS ---
  [UnitType.INFANTRY]: { hp: 100, maxHp: 100, atk: 15, range: 1, def: 5, atkSpeed: 800, moveSpeed: 0.05, scale: 1, commanderClass: CommanderClass.NONE }, // Fast mover
  [UnitType.ARCHER]:   { hp: 60, maxHp: 60, atk: 20, range: 6, def: 1, atkSpeed: 2000, moveSpeed: 0.025, scale: 0.8, commanderClass: CommanderClass.NONE },   // Slow mover
  [UnitType.SHIELD]:   { hp: 200, maxHp: 200, atk: 8, range: 1, def: 10, atkSpeed: 1500, moveSpeed: 0.02, scale: 1.1, commanderClass: CommanderClass.NONE }, // Very slow
  [UnitType.SPEAR]:    { hp: 120, maxHp: 120, atk: 25, range: 2, def: 8, atkSpeed: 900, moveSpeed: 0.04, scale: 1, commanderClass: CommanderClass.NONE }, // Average
  [UnitType.OBSTACLE]: { hp: 500, maxHp: 500, atk: 0, range: 0, def: 0, atkSpeed: 99999, moveSpeed: 0, scale: 1, commanderClass: CommanderClass.NONE },
};

// Upgrade Config: Absolute values added to base stats
export const UNIT_UPGRADES: Partial<Record<UnitType, Partial<EntityStats>>> = {
  [UnitType.INFANTRY]: { hp: 50, atk: 10, def: 1, moveSpeed: 0.01, scale: 1.3 },
  [UnitType.ARCHER]: { hp: 30, atk: 15, range: 2, scale: 1.3 },
  [UnitType.SHIELD]: { hp: 100, def: 4, scale: 1.3 },
  [UnitType.SPEAR]: { hp: 90, atk: 15, scale: 1.3 },
};

// NEW: Centralized Buff Configuration
// Defines the numerical impact of specific buff keys
export const BUFF_CONFIG: Record<string, BuffStats> = {
  'FRENZY': { maxHp: 50, hp: 50, range: 1.5, label: 'Bloodlust', description: 'Increase MaxHP and Melee range.', isCommanderBuff: true }, // Warlord Buff
  'HEAL': { hpRegen: 0.02, label: 'Regeneration', description: 'Restores 2% HP per second.', isCommanderBuff: true }, // Guardian Buff
  'ELF_RANGE': { range: 3, atkSpeed: -500, label: 'Eagle Eye', description: 'Massively increase Attack Range and Attack Speed.', isCommanderBuff: true }, // Elf Passive
  'SPEAR_CHARGE': { def: 15, moveSpeed: 0.25, label: 'Phalanx Charge', description: 'Massively increase Defense and MoveSpeed.' }, // Spear Charge state (Not a commander passive)
  'VANGUARD_PASSIVE': { maxHp: 120, hp: 120, moveSpeed: 0.04, label: 'Blitzkrieg', description: 'Massively increase MaxHP and MoveSpeed.', isCommanderBuff: true } // Vanguard Commander
};

export const UNIT_COLORS: Record<UnitType, string> = {
  [UnitType.COMMANDER_CENTURION]: 'bg-orange-700',
  [UnitType.COMMANDER_ELF]: 'bg-emerald-950',
  [UnitType.COMMANDER_WARLORD]: 'bg-red-950',
  [UnitType.COMMANDER_GUARDIAN]: 'bg-blue-950',
  [UnitType.COMMANDER_VANGUARD]: 'bg-purple-950',
  
  [UnitType.INFANTRY]: 'bg-red-900',
  [UnitType.ARCHER]: 'bg-emerald-900',
  [UnitType.SHIELD]: 'bg-blue-900',
  [UnitType.SPEAR]: 'bg-purple-900',
  [UnitType.OBSTACLE]: 'bg-gray-700',
};

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
    [UnitType.ARCHER]: { base: 90, variance: 6 },
    [UnitType.INFANTRY]: { base: 85, variance: 8 },
    [UnitType.SHIELD]: { base: 55, variance: 5 },
    [UnitType.SPEAR]: { base: 80, variance: 8 },
    
    // Commanders
    [UnitType.COMMANDER_CENTURION]: { base: 75, variance: 6 },
    [UnitType.COMMANDER_ELF]: { base: 85, variance: 6 },
    [UnitType.COMMANDER_WARLORD]: { base: 70, variance: 6 },
    [UnitType.COMMANDER_GUARDIAN]: { base: 60, variance: 6 },
    [UnitType.COMMANDER_VANGUARD]: { base: 75, variance: 6 },

    DEFAULT: { base: 85, variance: 10 }
  }
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
  'REMODEL': { id: 'REMODEL', label: 'Remodel', desc: 'Replaces 1 Obstacle with a random Unit.', icon: Hammer },
  'GREED': { id: 'GREED', label: 'Greed', desc: '+1 Reward Selection for future victories.', icon: Coins },
  'AGILITY': { id: 'AGILITY', label: 'Agility', desc: 'Commander Move Range +1.', icon: Footprints },
  'REINFORCE': { id: 'REINFORCE', label: 'Reinforce', desc: 'Recruits 1 adjacent soldier before battle.', icon: UserPlus },
  [`UPGRADE_${UnitType.INFANTRY}`]: { id: `UPGRADE_${UnitType.INFANTRY}`, label: 'Elite Inf.', desc: '+HP, +ATK, +SPD', icon: Swords },
  [`UPGRADE_${UnitType.ARCHER}`]: { id: `UPGRADE_${UnitType.ARCHER}`, label: 'Elite Arch.', desc: '+HP, +ATK, +RANGE', icon: Crosshair },
  [`UPGRADE_${UnitType.SHIELD}`]: { id: `UPGRADE_${UnitType.SHIELD}`, label: 'Elite Shld.', desc: '+HP, +DEF', icon: ShieldCheck },
  [`UPGRADE_${UnitType.SPEAR}`]: { id: `UPGRADE_${UnitType.SPEAR}`, label: 'Elite Spr.', desc: '+HP, +ATK', icon: Tent },
};

// --- LEVEL CONFIGURATION ---

export interface LevelConfig {
  difficultyMult: number; // Multiplier for Enemy Stats and Size
  unitCounts: Partial<Record<UnitType, number>>; // Enemy composition
  enemyCommanders: UnitType[]; // Now uses specific UnitType keys
}

export const GAME_LEVELS: LevelConfig[] = [
  { 
    // Level 1: Basic Melee + Range
    difficultyMult: 1.0, 
    unitCounts: { [UnitType.INFANTRY]: 2, [UnitType.ARCHER]: 1 }, 
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
