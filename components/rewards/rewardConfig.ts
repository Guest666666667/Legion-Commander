
import { Rarity, UnitType, GameState } from '../../types';
import { Box, Grid, Coins, Swords, Crosshair, ShieldCheck, Tent, Footprints, Hammer, UserPlus, Crown, Clover, Gem, Sword, Target, Shield, Triangle, Ban } from 'lucide-react';
import { MAX_GRID_SIZE } from '../../constants';

// Global Defaults
export const INITIAL_GEMS = 100;
export const INITIAL_MAX_REWARD_SELECTIONS = 0;
export const INITIAL_REWARD_OPTIONS_COUNT = 5;
export const MAX_REWARD_OPTIONS = 6;

// Leave empty [] to use normal randomization logic.
export const DEBUG_REWARD_POOL: string[] = [];

// Probability Configuration (Must sum to 100)
export type RarityWeights = Record<Rarity, number>;

export const DEFAULT_RARITY_WEIGHTS: RarityWeights = {
    [Rarity.COMMON]: 60,
    [Rarity.RARE]: 25,
    [Rarity.EPIC]: 10,
    [Rarity.MYTHIC]: 5,
};

export const ELITE_RARITY_WEIGHTS: RarityWeights = {
    [Rarity.COMMON]: 0,
    [Rarity.RARE]: 70,
    [Rarity.EPIC]: 20,
    [Rarity.MYTHIC]: 10,
};

// Reward Definitions
export interface RewardDef {
  id: string;
  label: string;
  desc: string;
  icon: any; // LucideIcon type
  rarity: Rarity;
  cost: number; // Gem cost if free selection is used up
  maxLimit?: number; // Maximum times this can be selected in a run. Undefined = Unlimited.
  noInventory?: boolean; // If true, this reward will not appear in the Battle Buffs list (e.g. one-time consumables)
}

export const REWARD_DEFINITIONS: Record<string, RewardDef> = {
  // --- MYTHIC ---
  'EXPAND': { 
      id: 'EXPAND', 
      label: 'Expand', 
      desc: 'Increase board size by 1. Adds new Unit types.', 
      icon: Grid, 
      rarity: Rarity.EPIC, 
      cost: 200,
      maxLimit: MAX_GRID_SIZE - 3 // Assuming start size is 3, max 5. Limit = 2.
  },
  'AGILITY': { 
      id: 'AGILITY', 
      label: 'Agility', 
      desc: 'Commander Move Range +1.', 
      icon: Footprints, 
      rarity: Rarity.MYTHIC, 
      cost: 250,
      maxLimit: 2
  },
  'GEMS_HUGE': {
      id: 'GEMS_HUGE',
      label: 'Gem Hoard',
      desc: 'Gain 500 Gems.',
      icon: Gem,
      rarity: Rarity.MYTHIC, 
      cost: 0,
      noInventory: true
      // No maxLimit
  },

  // --- EPIC ---
  'GREED': { 
      id: 'GREED', 
      label: 'Greed', 
      desc: '+1 Free Selection (Covers lowest cost item).', 
      icon: Coins, 
      rarity: Rarity.EPIC, 
      cost: 200,
      maxLimit: 2
  },
  'REMODEL': { 
      id: 'REMODEL', 
      label: 'Remodel', 
      desc: 'Replaces 1 Obstacle with a random Unit.', 
      icon: Hammer, 
      rarity: Rarity.EPIC, 
      cost: 150,
      maxLimit: 4
  },
  'REINFORCE': { 
      id: 'REINFORCE', 
      label: 'Reinforce', 
      desc: 'Recruits ALL soldiers within Move Range before battle.', 
      icon: UserPlus, 
      rarity: Rarity.EPIC, 
      cost: 200,
      maxLimit: 1
  },
  'GEMS_LARGE': {
      id: 'GEMS_LARGE',
      label: 'Gem Trove',
      desc: 'Gain 250 Gems.',
      icon: Gem,
      rarity: Rarity.EPIC,
      cost: 0,
      noInventory: true
      // No maxLimit
  },

  // --- RARE ---
  'QUALITY_CONTROL': {
      id: 'QUALITY_CONTROL',
      label: 'Elite Recruiter',
      desc: 'Common rewards will no longer appear.',
      icon: Ban,
      rarity: Rarity.RARE,
      cost: 150,
      maxLimit: 1
  },
  'LIMIT_BREAK': { 
      id: 'LIMIT_BREAK', 
      label: 'Command Cap', 
      desc: '+1 Army Capacity per unit type.', 
      icon: Crown, 
      rarity: Rarity.RARE, 
      cost: 150,
      maxLimit: 10
  },
  'SCAVENGER': { 
      id: 'SCAVENGER', 
      label: 'Scavenger', 
      desc: 'Now obstacle lines (3+) can summon random available unit.', 
      icon: Box, 
      rarity: Rarity.RARE, 
      cost: 150,
      maxLimit: 1 
  },
  'FORTUNE': { 
      id: 'FORTUNE', 
      label: 'Fortune', 
      desc: '+1 Option to choose from next level.', 
      icon: Clover, 
      rarity: Rarity.RARE, 
      cost: 0, 
      maxLimit: MAX_REWARD_OPTIONS - INITIAL_REWARD_OPTIONS_COUNT 
  },
  'GEMS_MEDIUM': {
      id: 'GEMS_MEDIUM',
      label: 'Gem Stash',
      desc: 'Gain 120 Gems.',
      icon: Gem,
      rarity: Rarity.RARE,
      cost: 0,
      noInventory: true
      // No maxLimit
  },
  
  // Upgrades (RARE)
  [`UPGRADE_${UnitType.INFANTRY}`]: { 
      id: `UPGRADE_${UnitType.INFANTRY}`, 
      label: 'Elite Inf.', 
      desc: '+HP, +ATK, +SPD', 
      icon: Swords, 
      rarity: Rarity.RARE, 
      cost: 150,
      maxLimit: 1
  },
  [`UPGRADE_${UnitType.ARCHER}`]: { 
      id: `UPGRADE_${UnitType.ARCHER}`, 
      label: 'Elite Arch.', 
      desc: '+HP, +ATK, +RANGE', 
      icon: Crosshair, 
      rarity: Rarity.RARE, 
      cost: 150,
      maxLimit: 1
  },
  [`UPGRADE_${UnitType.SHIELD}`]: { 
      id: `UPGRADE_${UnitType.SHIELD}`, 
      label: 'Elite Shld.', 
      desc: '+HP, +DEF', 
      icon: ShieldCheck, 
      rarity: Rarity.RARE, 
      cost: 150,
      maxLimit: 1
  },
  [`UPGRADE_${UnitType.SPEAR}`]: { 
      id: `UPGRADE_${UnitType.SPEAR}`, 
      label: 'Elite Spr.', 
      desc: '+HP, +ATK', 
      icon: Tent, 
      rarity: Rarity.RARE, 
      cost: 150,
      maxLimit: 1
  },

  // --- COMMON (Cost 0) ---
  'GEMS_SMALL': {
      id: 'GEMS_SMALL',
      label: 'Gem Cache',
      desc: 'Gain 50-150 Gems immediately.',
      icon: Gem,
      rarity: Rarity.COMMON,
      cost: 70,
      noInventory: true
  },
  'UNIT_INFANTRY': {
      id: 'UNIT_INFANTRY',
      label: 'Draft Inf.',
      desc: 'Add 1 Infantry to next battle.',
      icon: Sword,
      rarity: Rarity.COMMON,
      cost: 30,
      noInventory: true
  },
  'UNIT_ARCHER': {
      id: 'UNIT_ARCHER',
      label: 'Draft Arch.',
      desc: 'Add 1 Archer to next battle.',
      icon: Target,
      rarity: Rarity.COMMON,
      cost: 30,
      noInventory: true
  },
  'UNIT_SHIELD': {
      id: 'UNIT_SHIELD',
      label: 'Draft Shld.',
      desc: 'Add 1 Shield to next battle.',
      icon: Shield,
      rarity: Rarity.COMMON,
      cost: 30,
      noInventory: true
  },
  'UNIT_SPEAR': {
      id: 'UNIT_SPEAR',
      label: 'Draft Spear',
      desc: 'Add 1 Spear to next battle.',
      icon: Triangle,
      rarity: Rarity.COMMON,
      cost: 30,
      noInventory: true
  },
};

export const RARITY_COLORS: Record<Rarity, string> = {
  [Rarity.COMMON]: 'border-slate-500 text-slate-300',
  [Rarity.RARE]: 'border-blue-500 text-blue-400',
  [Rarity.EPIC]: 'border-purple-500 text-purple-400',
  [Rarity.MYTHIC]: 'border-orange-500 text-orange-400',
};
