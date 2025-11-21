
import { BattleEntity, EntityStats, UnitType, CommanderClass } from '../../types';
import { SPAWN_CONFIG, UNIT_STATS, UNIT_UPGRADES, BUFF_CONFIG } from '../../constants';

/**
 * Calculate spawn X position based on type and team configuration
 */
export const getSpawnX = (type: UnitType, team: 'PLAYER' | 'ENEMY'): number => {
    const config = team === 'ENEMY' ? SPAWN_CONFIG.ENEMY : SPAWN_CONFIG.PLAYER;
    // @ts-ignore - dynamic property access safe due to DEFAULT fallback
    const spawnData = config[type] || config.DEFAULT;
    return spawnData.base + (Math.random() * spawnData.variance);
};

/**
 * Calculates the final effective stats based on Base Stats + Upgrades + Buffs
 * This is used dynamically in the loop to update stats based on changing buffs/AI states.
 */
export const calculateEntityStats = (type: UnitType, currentBuffs: string[], upgrades: UnitType[] = [], team: 'PLAYER' | 'ENEMY'): EntityStats => {
    // 1. Start with Base Stats
    const base = { ...UNIT_STATS[type] };

    // 2. Apply Upgrades (Permanent Stat Boosts)
    // Only Player gets upgrades usually, but function allows checking
    if (team === 'PLAYER' && upgrades.includes(type)) {
        const bonus = UNIT_UPGRADES[type];
        if (bonus) {
            if (bonus.hp) base.maxHp += bonus.hp;
            if (bonus.hp) base.hp += bonus.hp; // Base HP increases too
            if (bonus.atk) base.atk += bonus.atk;
            if (bonus.def) base.def += bonus.def;
            if (bonus.moveSpeed) base.moveSpeed += bonus.moveSpeed;
            if (bonus.scale) base.scale = bonus.scale;
            if (bonus.range) base.range += bonus.range;
        }
    }

    let finalDef = base.def;
    let finalRange = base.range;
    let finalMoveSpeed = base.moveSpeed;
    let finalAtk = base.atk;
    let finalMaxHp = base.maxHp;
    let finalAtkSpeed = base.atkSpeed; // Interval (ms)

    // 3. Apply Active Buffs (Passives, States, Auras)
    currentBuffs.forEach(buffId => {
        const mod = BUFF_CONFIG[buffId];
        if (mod) {
            if (mod.def) finalDef += mod.def;
            if (mod.range) finalRange += mod.range;
            if (mod.moveSpeed) finalMoveSpeed += mod.moveSpeed;
            if (mod.atk) finalAtk += mod.atk;
            if (mod.maxHp) finalMaxHp += mod.maxHp;
            if (mod.atkSpeed) finalAtkSpeed += mod.atkSpeed; // Additive reduction/increase to interval
            if (mod.speedMultiplier) finalAtkSpeed *= mod.speedMultiplier; // Multiplicative
        }
    });

    return {
        ...base,
        maxHp: finalMaxHp,
        def: finalDef,
        range: finalRange,
        moveSpeed: finalMoveSpeed,
        atk: finalAtk,
        atkSpeed: Math.max(50, finalAtkSpeed), // Cap minimum interval at 50ms
        hp: base.hp, // This is just a placeholder return, actual HP is stateful
        commanderClass: base.commanderClass,
        scale: base.scale
    };
};

/**
 * Factory function to create a BattleEntity with all initial stats correctly calculated.
 * Solves the issue of MaxHP being updated after HP is set.
 */
export const createBattleEntity = (
    id: string,
    type: UnitType,
    team: 'PLAYER' | 'ENEMY',
    initialBuffs: string[],
    upgrades: UnitType[],
    difficultyMult: number = 1.0
): BattleEntity => {
    // 1. Get fully calculated stats (Base + Upgrades + Initial Buffs)
    const stats = calculateEntityStats(type, initialBuffs, upgrades, team);

    // 2. Apply Difficulty Multiplier (Enemy Only)
    if (team === 'ENEMY' && difficultyMult !== 1.0) {
        stats.maxHp = Math.floor(stats.maxHp * difficultyMult);
        stats.atk = Math.floor(stats.atk * difficultyMult);
        stats.scale = (stats.scale || 1) * difficultyMult;
    }

    // 3. Construct Entity
    // Initialize HP to the FULL MaxHP (including buffs)
    return {
        ...stats,
        id,
        type,
        team,
        hp: stats.maxHp, // Correctly set to full buffed health
        x: getSpawnX(type, team),
        y: 20 + (Math.random() * 60),
        targetId: null,
        lastAttackTime: 0,
        lastHitTime: 0,
        aiState: type === UnitType.SPEAR ? 'WAITING' : 'NORMAL',
        aiTimer: 0,
        buffs: initialBuffs
    };
};

export const findNearestTarget = (entity: BattleEntity, potentialTargets: BattleEntity[]): BattleEntity | null => {
    let minDist = 10000;
    let bestTarget: BattleEntity | null = null;
    
    for (const t of potentialTargets) {
        // Critical: Ignore dead/downed units
        if (t.hp <= 0) continue;

        const dist = Math.hypot(t.x - entity.x, t.y - entity.y);
        if (dist < minDist) { 
            minDist = dist; 
            bestTarget = t; 
        }
    }
    return bestTarget;
};

export const isInRange = (entity: BattleEntity, target: BattleEntity): boolean => {
    let rangeThreshold = 5; // Base melee contact distance
    
    // If stats.range > 1.5, it's considered a ranged unit
    if (entity.range > 1.5) {
        rangeThreshold = entity.range * 8; // Convert logic range to screen distance roughly
    }
    
    const dist = Math.hypot(target.x - entity.x, target.y - entity.y);
    return dist <= rangeThreshold;
};

export const calculateDamage = (attacker: BattleEntity, target: BattleEntity): number => {
    return Math.max(1, attacker.atk - target.def);
};

export const calculateMovement = (
    entity: BattleEntity, 
    target: BattleEntity, 
    delta: number, 
    speedMultiplier: number
): { x: number, y: number } => {
    const dist = Math.hypot(target.x - entity.x, target.y - entity.y);
    if (dist === 0) return { x: entity.x, y: entity.y }; // Avoid divide by zero

    const moveSpeed = entity.moveSpeed * (delta / 16) * speedMultiplier;
    const vx = (target.x - entity.x) / dist;
    const vy = (target.y - entity.y) / dist;
    
    return {
        x: entity.x + (vx * moveSpeed),
        y: entity.y + (vy * moveSpeed)
    };
};

// --- VISUAL HELPERS ---

export const getUnitGlowColor = (type: UnitType): string => {
    switch (type) {
      case UnitType.INFANTRY:
      case UnitType.COMMANDER_WARLORD:
        return '#ef4444'; // Red-500
      case UnitType.ARCHER:
      case UnitType.COMMANDER_ELF:
        return '#10b981'; // Emerald-500
      case UnitType.SHIELD:
      case UnitType.COMMANDER_GUARDIAN:
        return '#3b82f6'; // Blue-500
      case UnitType.SPEAR:
      case UnitType.COMMANDER_VANGUARD:
        return '#a855f7'; // Purple-500
      case UnitType.COMMANDER_CENTURION:
        return '#f97316'; // Orange-500
      default:
        return '#eab308'; // Yellow-500
    }
};

export const getEntityFilterStyle = (entity: BattleEntity): string => {
    const healthRatio = Math.max(0, entity.hp / entity.maxHp);
    
    // Downed/Dead State (Commanders only ideally, but safe for all if rendered)
    if (entity.hp <= 0) {
        return 'grayscale(100%) brightness(40%) contrast(120%)';
    }

    if (entity.team === 'PLAYER') {
        // Players get saturated/brighter as they lose HP (Adrenaline effect) or just standard visibility
        const b = 1 + (1 - healthRatio) * 1.2;
        const s = 0.3 + (0.7 * healthRatio);
        return `brightness(${b}) saturate(${s})`;
    } else {
        // Enemies get darker as they lose HP
        const b = 0.25 + (healthRatio * 0.45);
        return `brightness(${b})`;
    }
};
