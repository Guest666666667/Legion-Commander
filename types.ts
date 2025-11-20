
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
  COMMANDER = 'COMMANDER',
  INFANTRY = 'INFANTRY', // Basic Melee
  ARCHER = 'ARCHER',     // Basic Range
  SHIELD = 'SHIELD',     // High Def (Unlock n=4)
  SPEAR = 'SPEAR',       // High Reach (Unlock n=5)
  OBSTACLE = 'OBSTACLE'
}

export interface EntityStats {
  hp: number;
  maxHp: number;
  atk: number;
  range: number; // 1 = melee, 3+ = range
  def: number;
  speed: number; // Lower is faster attack interval
  scale: number; // Visual size multiplier
}

export interface GridItem {
  id: string;
  type: UnitType;
  row: number;
  col: number;
  isMatched?: boolean;
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
  type: 'HIT' | 'EXPLOSION';
  createdAt: number;
  duration: number;
}

export enum CommanderType {
  CENTURION = 'CENTURION',
  ELF = 'ELF'
}

export interface CommanderProfile {
  id: CommanderType;
  name: string;
  role: string;
  description: string;
  skillName: string;
  skillDesc: string;
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
  commanderType: CommanderType;
  stepsRemaining: number;
  reshufflesUsed: number; // 0 = Free, 1 = cost 1, 2 = cost 2, etc.
  summonQueue: UnitType[]; // Soldiers recruited during puzzle phase
  playerHp: number; 
  inventory: string[]; 
  survivors: UnitType[]; // Units that survived the last battle
  
  // New Mechanics
  scavengerLevel: number; // 0 = disabled. >0 = Obstacles shuffle & generate units
  commanderMoveRange: number; // 1 = adjacent. 2 = up to 2 steps.
  maxRewardSelections: number; // Default 1. Greed increases this.
  rewardsRemaining: number; // Tracks picks left in current victory phase
  upgrades: UnitType[]; // List of unit types that have been upgraded
  
  // Reward Randomization
  currentRewardIds: string[];
  rewardsHistory: Record<string, number>; // Tracks how many times a reward was picked
  
  // Scoring
  scoreStats: ScoreStats;
}
