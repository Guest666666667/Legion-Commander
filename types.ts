
export enum Phase {
  MENU = 'MENU',
  MAP = 'MAP',
  PUZZLE = 'PUZZLE',
  BATTLE = 'BATTLE',
  REWARD = 'REWARD',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum UnitType {
  // Specific Commanders
  COMMANDER_CENTURION = 'COMMANDER_CENTURION',
  COMMANDER_ELF = 'COMMANDER_ELF',
  COMMANDER_WARLORD = 'COMMANDER_WARLORD',
  COMMANDER_GUARDIAN = 'COMMANDER_GUARDIAN',
  COMMANDER_VANGUARD = 'COMMANDER_VANGUARD',

  // Soldiers
  INFANTRY = 'INFANTRY', // Basic Melee
  ARCHER = 'ARCHER',     // Basic Range
  SHIELD = 'SHIELD',     // High Def (Unlock n=4)
  SPEAR = 'SPEAR',       // High Reach (Unlock n=5)
  OBSTACLE = 'OBSTACLE'
}

export enum CommanderClass {
  NONE = 'NONE',
  CENTURION = 'CENTURION',
  ELF = 'ELF',
  WARLORD = 'WARLORD',
  GUARDIAN = 'GUARDIAN',
  VANGUARD = 'VANGUARD'
}

export interface EntityStats {
  hp: number;
  maxHp: number;
  atk: number;
  range: number; // 1 = melee, 3+ = range
  def: number;
  atkSpeed: number; // Attack Interval in ms (Lower is faster)
  moveSpeed: number; // Movement speed (0.01 - 0.1 range recommended)
  scale: number; // Visual size multiplier
  commanderClass: CommanderClass; // Identity tag
}

// New: For configuration-based buffs
export interface BuffStats {
  atk?: number;
  def?: number;
  range?: number;
  moveSpeed?: number;
  hpRegen?: number; // % per second
  maxHp?: number; // Additive max HP
  hp?: number; // Additive Current HP (for initialization)
  atkSpeed?: number; // Additive Attack Interval (e.g. -500 means 500ms faster)
  speedMultiplier?: number; // 1.0 is normal, 0.5 is faster (lower delay)
  label?: string; // Display name for UI
  description?: string; // Short description of effect
  isCommanderBuff?: boolean; // If true, triggers unified visual effect (Golden Border)
}

export interface GridItem {
  id: string;
  type: UnitType;
  row: number;
  col: number;
  isMatched?: boolean;
  isNew?: boolean; // Flag to trigger entry animations only on spawn
}

export interface BattleEntity extends EntityStats {
  id: string;
  type: UnitType;
  x: number; // 0-100% (Left to Right)
  y: number; // 0-100% (Top to Bottom)
  team: 'PLAYER' | 'ENEMY';
  targetId: string | null;
  lastAttackTime: number;
  lastHitTime: number; // For damage flash effect
  
  // Special AI States (e.g. for Spear Charge)
  aiState?: 'WAITING' | 'CHARGING' | 'NORMAL';
  aiTimer?: number;

  // Generic Buff System
  buffs: string[]; // e.g. ['HEAL', 'RAGE']
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number;
  rotation: number;
  opacity?: number;
}

export interface VisualEffect {
  id: string;
  x: number;
  y: number;
  type: 'HIT' | 'EXPLOSION' | 'SLASH' | 'HEAL';
  createdAt: number;
  duration: number;
}

export interface CommanderProfile {
  id: UnitType; // Keyed by UnitType now
  name: string;
  shortName: string; // Display name for small grids
  role: string;
  description: string;
  skillName: string;
  skillDesc: string;
  class: CommanderClass;
}

export interface ScoreStats {
  matches3: number;
  matches4: number;
  matches5: number; // 5 or more
  reshuffles: number;
  won: boolean;
  kills: Record<string, number>; // UnitType -> count
}

export interface GameState {
  phase: Phase;
  gridSize: number; // n
  currentLevel: number; // 1 to 6
  maxLevels: number;
  commanderUnitType: UnitType; // Replaces commanderType enum
  stepsRemaining: number;
  reshufflesUsed: number; 
  summonQueue: UnitType[]; 
  playerHp: number; 
  inventory: string[]; 
  survivors: UnitType[]; 
  
  // New Mechanics
  scavengerLevel: number; 
  commanderMoveRange: number; 
  maxRewardSelections: number; 
  rewardsRemaining: number; 
  upgrades: UnitType[]; 
  remodelLevel: number; 
  
  // Reward Randomization
  currentRewardIds: string[];
  rewardsHistory: Record<string, number>; 
  
  // Scoring
  scoreStats: ScoreStats;
}
