
import { BattleEntity, EntityStats, UnitType } from '../../types';
import { BUFF_CONFIG } from '../../constants';

/**
 * Handles specific AI state transitions and mechanics for units (e.g., Spear Charge).
 * Mutates entity state and position directly.
 */
export const updateEntityBehavior = (entity: BattleEntity, stats: EntityStats, delta: number, speedMultiplier: number) => {
    // SPEAR CHARGE LOGIC
    if (entity.type === UnitType.SPEAR && entity.aiState && entity.aiState !== 'NORMAL') {
        entity.aiTimer = (entity.aiTimer || 0) + (delta * speedMultiplier);
        
        if (entity.aiState === 'WAITING') {
            if (entity.aiTimer >= 2000) entity.aiState = 'CHARGING';
        } else if (entity.aiState === 'CHARGING') {
            // Charge towards enemy side (Simple 1D charge)
            const targetX = entity.team === 'PLAYER' ? 90 : 10;
            const distToTarget = Math.abs(targetX - entity.x);
            
            // Charge speed is derived from moveSpeed
            const chargeSpeed = stats.moveSpeed * (delta / 16) * speedMultiplier;
            const dir = Math.sign(targetX - entity.x);
            
            entity.x += dir * chargeSpeed;
            
            // End charge if close to edge
            if (distToTarget < 2) entity.aiState = 'NORMAL';
        }
    }
};

/**
 * Synchronizes derived buffs based on entity state.
 * Example: Adds 'SPEAR_CHARGE' buff when in WAITING or CHARGING state.
 */
export const syncEntityStateBuffs = (entity: BattleEntity) => {
    if (entity.type === UnitType.SPEAR) {
        const isCharging = entity.aiState === 'WAITING' || entity.aiState === 'CHARGING';
        const buffId = 'SPEAR_CHARGE';
        const hasBuff = entity.buffs.includes(buffId);
        
        if (isCharging && !hasBuff) entity.buffs.push(buffId);
        else if (!isCharging && hasBuff) entity.buffs = entity.buffs.filter(b => b !== buffId);
    }
};

/**
 * Processes passive effects like Health Regeneration.
 * Returns the amount of HP to restore and whether a visual effect should trigger.
 */
export const processRegeneration = (
    entity: BattleEntity, 
    stats: EntityStats, 
    delta: number, 
    speedMultiplier: number
): { hpAmount: number, shouldTriggerVfx: boolean } => {
    if (entity.buffs.includes('HEAL') && entity.hp < stats.maxHp) {
        const regen = BUFF_CONFIG['HEAL'].hpRegen || 0.02;
        const hpAmount = (stats.maxHp * regen) * (delta / 1000) * speedMultiplier;
        const shouldTriggerVfx = Math.random() < 0.01 * speedMultiplier;
        return { hpAmount, shouldTriggerVfx };
    }
    return { hpAmount: 0, shouldTriggerVfx: false };
};
