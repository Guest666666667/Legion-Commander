
import { BattleEntity, Projectile, UnitType, VisualEffect, EntityStatsModifiers } from '../../types';
import { calculateDamage, calculateMovement, getSpawnX, isInRange } from '../battle/battleUtils';
import { BUFF_CONFIG, UNIT_STATS, UNIT_UPGRADES } from './unitConfig';

export class BaseUnit implements BattleEntity {
    // BattleEntity Interface Implementation
    id: string;
    type: UnitType;
    team: 'PLAYER' | 'ENEMY';
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
    range: number;
    atkSpeed: number;
    moveSpeed: number;
    scale: number;
    commanderClass: any;
    
    // Stats Tracking
    statsModifiers: EntityStatsModifiers = { maxHp: 0, atk: 0, def: 0, range: 0, moveSpeed: 0, atkSpeed: 0 };
    
    // State
    targetId: string | null = null;
    lastAttackTime: number = 0;
    lastHitTime: number = 0;
    buffs: string[] = [];
    aiState?: 'WAITING' | 'CHARGING' | 'NORMAL' = 'NORMAL';
    aiTimer?: number = 0;

    // Internal
    protected upgrades: UnitType[] = [];
    protected difficultyMult: number = 1.0;

    constructor(
        id: string, 
        type: UnitType, 
        team: 'PLAYER' | 'ENEMY', 
        initialBuffs: string[] = [],
        upgrades: UnitType[] = [],
        difficultyMult: number = 1.0
    ) {
        this.id = id;
        this.type = type;
        this.team = team;
        this.buffs = [...initialBuffs];
        this.upgrades = upgrades;
        this.difficultyMult = difficultyMult;

        // Initial Position
        this.x = getSpawnX(type, team);
        this.y = 20 + (Math.random() * 60);

        // Initialize Stats
        const base = UNIT_STATS[type];
        this.scale = base.scale;
        this.commanderClass = base.commanderClass;
        
        // Initialize dynamic stats (Calculates MaxHP correctly first)
        this.recalculateStats();
        this.hp = this.maxHp; // Start at full HP
    }

    /**
     * Final step of spawning logic.
     * Should be called after all Commanders/Allies have had a chance to inspect and add buffs.
     * Recalculates stats to include all new buffs and resets HP to full (MaxHP).
     */
    public finalizeSpawn() {
        this.recalculateStats();
        this.hp = this.maxHp;
    }

    /**
     * Called specifically when this unit is checking a NEWLY SPAWNED ally.
     * This allows this unit (e.g., a Commander) to apply buffs to the new recruit immediately.
     */
    public onAllySpawned(newUnit: BaseUnit) {
        // Default: Do nothing. Override in subclasses (Commanders).
    }

    /**
     * Adds a buff to this unit if it doesn't already have it.
     * Automatically triggers stat recalculation and handles immediate effects (HP gain).
     */
    public addBuff(buffId: string) {
        if (!this.buffs.includes(buffId)) {
            this.buffs.push(buffId);

            // Capture state before update
            const oldMaxHp = this.maxHp;

            // 1. Immediate Recalculation
            // Ensure statsModifiers and MaxHP are updated instantly. 
            // Critical for existing units receiving buffs mid-battle or from late-joining Commanders.
            this.recalculateStats();

            // 2. Handle "On Apply" effects (HP restoration/boost)
            const mod = BUFF_CONFIG[buffId];
            if (mod) {
                let hpGain = 0;
                
                if (mod.hp !== undefined) {
                    // Explicit HP boost from config (e.g. "Give 50 HP")
                    hpGain = mod.hp;
                } else {
                    // Implicit HP boost: If MaxHP increased, increase Current HP by the same delta
                    // so the unit effectively gains the "Buff Health" without appearing damaged.
                    const maxHpDiff = this.maxHp - oldMaxHp;
                    if (maxHpDiff > 0) hpGain = maxHpDiff;
                }
                
                if (hpGain > 0) {
                    // Apply gain, respecting the new MaxHP cap
                    this.hp = Math.min(this.hp + hpGain, this.maxHp);
                }
            }
        }
    }

    public tick(
        time: number, 
        delta: number, 
        speedMultiplier: number, 
        enemies: BaseUnit[], 
        addProjectile: (p: Projectile) => void,
        addEffect: (e: VisualEffect) => void
    ) {
        if (this.hp <= 0) return;

        // 1. Recalculate Stats (Handle dynamic buffs)
        this.recalculateStats();

        // 2. Process Passives (Regen)
        this.processPassives(time, delta, speedMultiplier, addEffect);

        // 3. Unit Specific Behavior (Hook for subclasses)
        this.updateBehavior(delta, speedMultiplier);

        // 4. Skip standard combat if in special AI state (e.g. Charging)
        if (this.aiState && this.aiState !== 'NORMAL') return;

        // 5. Targeting
        const target = this.findTarget(enemies);
        this.targetId = target ? target.id : null;

        // 6. Combat / Movement
        if (target) {
            if (isInRange(this, target)) {
                this.performAttack(time, target, speedMultiplier, addProjectile, addEffect);
            } else {
                this.moveTowards(target, delta, speedMultiplier);
            }
        }
    }

    /**
     * Core Stat Calculation Logic
     * Merges Base + Upgrades + Buffs + Difficulty
     * Updates statsModifiers for UI display
     */
    protected recalculateStats() {
        const base = UNIT_STATS[this.type];
        
        // Start with base
        let fMaxHp = base.maxHp;
        let fAtk = base.atk;
        let fDef = base.def;
        let fRange = base.range;
        let fMoveSpeed = base.moveSpeed;
        let fAtkSpeed = base.atkSpeed;

        // Apply Upgrades (Player Only)
        if (this.team === 'PLAYER' && this.upgrades.includes(this.type)) {
            const upg = UNIT_UPGRADES[this.type];
            if (upg) {
                if (upg.hp) fMaxHp += upg.hp;
                if (upg.atk) fAtk += upg.atk;
                if (upg.def) fDef += upg.def;
                if (upg.moveSpeed) fMoveSpeed += upg.moveSpeed;
                if (upg.range) fRange += upg.range;
            }
        }

        // Apply Buffs
        this.buffs.forEach(buffId => {
            const mod = BUFF_CONFIG[buffId];
            if (mod) {
                if (mod.maxHp) fMaxHp += mod.maxHp;
                if (mod.atk) fAtk += mod.atk;
                if (mod.def) fDef += mod.def;
                if (mod.range) fRange += mod.range;
                if (mod.moveSpeed) fMoveSpeed += mod.moveSpeed;
                if (mod.atkSpeed) fAtkSpeed += mod.atkSpeed;
                if (mod.speedMultiplier) fAtkSpeed *= mod.speedMultiplier;
            }
        });

        // Apply Difficulty (Enemy Only)
        if (this.team === 'ENEMY' && this.difficultyMult !== 1.0) {
            fMaxHp = Math.floor(fMaxHp * this.difficultyMult);
            fAtk = Math.floor(fAtk * this.difficultyMult);
        }

        // Assign to instance
        this.maxHp = fMaxHp;
        this.atk = fAtk;
        this.def = fDef;
        this.range = fRange;
        this.moveSpeed = fMoveSpeed;
        this.atkSpeed = Math.max(50, fAtkSpeed);

        // Calculate Modifiers for UI (Final - Base)
        // This captures upgrades, buffs, and difficulty scaling
        this.statsModifiers = {
            maxHp: this.maxHp - base.maxHp,
            atk: this.atk - base.atk,
            def: this.def - base.def,
            range: this.range - base.range,
            moveSpeed: this.moveSpeed - base.moveSpeed,
            atkSpeed: this.atkSpeed - base.atkSpeed
        };
    }

    protected processPassives(time: number, delta: number, speedMultiplier: number, addEffect: (e: VisualEffect) => void) {
        // Heal Logic
        if (this.buffs.includes('HEAL') && this.hp < this.maxHp) {
            const regenPct = BUFF_CONFIG['HEAL'].hpRegen || 0.02;
            const amount = (this.maxHp * regenPct) * (delta / 1000) * speedMultiplier;
            this.hp = Math.min(this.maxHp, this.hp + amount);
            
            if (Math.random() < 0.01 * speedMultiplier) {
                addEffect({
                    id: `heal-${this.id}-${time}-${Math.random()}`,
                    x: this.x, y: this.y - 2, type: 'HEAL', createdAt: time, duration: 600
                });
            }
        }
    }

    protected updateBehavior(delta: number, speedMultiplier: number) {
        // Override in subclasses (e.g. Spear charge)
    }

    protected findTarget(enemies: BaseUnit[]): BaseUnit | null {
        let minDist = 10000;
        let bestTarget: BaseUnit | null = null;
        
        for (const t of enemies) {
            if (t.hp <= 0) continue;
            const dist = Math.hypot(t.x - this.x, t.y - this.y);
            if (dist < minDist) { 
                minDist = dist; 
                bestTarget = t; 
            }
        }
        return bestTarget;
    }

    protected performAttack(
        time: number, 
        target: BaseUnit, 
        speedMultiplier: number, 
        addProjectile: (p: Projectile) => void,
        addEffect: (e: VisualEffect) => void
    ) {
        const effectiveCooldown = this.atkSpeed / speedMultiplier;
        
        if (time - this.lastAttackTime > effectiveCooldown) {
            this.lastAttackTime = time;

            if (this.range > 3) {
                // Ranged
                addProjectile({
                    id: `proj-${this.id}-${time}-${Math.random()}`,
                    x: this.x, y: this.y,
                    targetId: target.id,
                    damage: calculateDamage(this, target),
                    speed: 0.5 * speedMultiplier,
                    rotation: Math.atan2(target.y - this.y, target.x - this.x) * (180 / Math.PI)
                });
            } else {
                // Melee
                const dmg = calculateDamage(this, target);
                target.takeDamage(dmg, time);
                
                const isSlash = this.buffs.includes('FRENZY');
                addEffect({
                    id: `vfx-${target.id}-${time}-${Math.random()}`,
                    x: target.x, y: target.y,
                    type: isSlash ? 'SLASH' : 'HIT',
                    createdAt: time, duration: 300
                });
            }
        }
    }

    protected moveTowards(target: BaseUnit, delta: number, speedMultiplier: number) {
        const nextPos = calculateMovement(this, target, delta, speedMultiplier);
        this.x = nextPos.x;
        this.y = nextPos.y;
    }

    public takeDamage(amount: number, time: number) {
        this.hp -= amount;
        this.lastHitTime = time;
    }
}
