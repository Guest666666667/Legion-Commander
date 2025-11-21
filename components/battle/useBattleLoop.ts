
import { useState, useRef, useEffect } from 'react';
import { BattleEntity, Phase, UnitType, Projectile, VisualEffect, CommanderClass } from '../../types';
import { UNIT_STATS, GAME_LEVELS, VICTORY_DELAY_MS, DEFAULT_SPEED_MULTIPLIER } from '../../constants';
import { createBattleEntity, calculateEntityStats, findNearestTarget, isInRange, calculateDamage, calculateMovement } from './battleUtils';
import { updateEntityBehavior, syncEntityStateBuffs, processRegeneration } from './entityBehaviors';

interface UseBattleLoopProps {
    allies: UnitType[];
    level: number;
    phase: Phase;
    commanderUnitType: UnitType;
    upgrades: UnitType[];
    onBattleEnd: (victory: boolean, survivors?: UnitType[], kills?: Record<string, number>) => void;
}

export const useBattleLoop = ({ allies, level, phase, commanderUnitType, upgrades, onBattleEnd }: UseBattleLoopProps) => {
    const [entities, setEntities] = useState<BattleEntity[]>([]);
    const [projectiles, setProjectiles] = useState<Projectile[]>([]);
    const [effects, setEffects] = useState<VisualEffect[]>([]);
    const [speedMultiplier, setSpeedMultiplier] = useState(DEFAULT_SPEED_MULTIPLIER);
    const [isPaused, setIsPaused] = useState(false);

    const frameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const alliesProcessedCount = useRef<number>(0);
    const isBattleEndingRef = useRef(false);
    const killsRef = useRef<Record<string, number>>({});
    const processedDeathsRef = useRef<Set<string>>(new Set());

    // --- Initialization (Spawning) ---
    useEffect(() => {
        const initialEnemies: BattleEntity[] = [];
        let idCounter = 0;
        
        const configIndex = Math.min(level - 1, GAME_LEVELS.length - 1);
        const config = GAME_LEVELS[configIndex];

        // Pre-calculate Enemy Commander presence
        const hasEnemyWarlord = config.enemyCommanders?.includes(UnitType.COMMANDER_WARLORD);
        const hasEnemyGuardian = config.enemyCommanders?.includes(UnitType.COMMANDER_GUARDIAN);
        const hasEnemyElf = config.enemyCommanders?.includes(UnitType.COMMANDER_ELF);
        const hasEnemyVanguard = config.enemyCommanders?.includes(UnitType.COMMANDER_VANGUARD);

        const spawnEnemy = (type: UnitType) => {
            const initialBuffs: string[] = [];
            
            // Apply Commander Passives (Enemy)
            if (type === UnitType.INFANTRY && hasEnemyWarlord) initialBuffs.push('FRENZY');
            if (type === UnitType.SHIELD && hasEnemyGuardian) initialBuffs.push('HEAL');
            if (type === UnitType.ARCHER && hasEnemyElf) initialBuffs.push('ELF_RANGE');
            if (type === UnitType.SPEAR && hasEnemyVanguard) initialBuffs.push('VANGUARD_PASSIVE');

            const entity = createBattleEntity(
                `e-${level}-${type}-${idCounter++}`,
                type,
                'ENEMY',
                initialBuffs,
                [], // Enemies don't have upgrades yet
                config.difficultyMult
            );
            initialEnemies.push(entity);
        };

        // Spawn Enemies
        Object.entries(config.unitCounts).forEach(([typeStr, count]) => {
            for (let i = 0; i < count; i++) spawnEnemy(typeStr as UnitType);
        });
        config.enemyCommanders?.forEach(spawnEnemy);
        
        setEntities(initialEnemies);
        setProjectiles([]);
        setEffects([]);
        alliesProcessedCount.current = 0;
        isBattleEndingRef.current = false;
        setIsPaused(false);
        killsRef.current = {};
        processedDeathsRef.current = new Set();
    }, [level]);

    // --- Ally Spawning ---
    useEffect(() => {
        if (allies.length > alliesProcessedCount.current) {
            const newUnits = allies.slice(alliesProcessedCount.current);
            const newEntities: BattleEntity[] = [];
            const playerCmdClass = UNIT_STATS[commanderUnitType]?.commanderClass;

            newUnits.forEach((type, idx) => {
                const initialBuffs: string[] = [];
                
                // Apply Commander Passives (Player)
                if (type === UnitType.INFANTRY && playerCmdClass === CommanderClass.WARLORD) initialBuffs.push('FRENZY');
                if (type === UnitType.SHIELD && playerCmdClass === CommanderClass.GUARDIAN) initialBuffs.push('HEAL');
                if (type === UnitType.ARCHER && playerCmdClass === CommanderClass.ELF) initialBuffs.push('ELF_RANGE');
                if (type === UnitType.SPEAR && playerCmdClass === CommanderClass.VANGUARD) initialBuffs.push('VANGUARD_PASSIVE');

                const entity = createBattleEntity(
                    `p-${Date.now()}-${idx}`,
                    type,
                    'PLAYER',
                    initialBuffs,
                    upgrades,
                    1.0
                );
                newEntities.push(entity);
            });

            setEntities(prev => [...prev, ...newEntities]);
            alliesProcessedCount.current = allies.length;
        }
    }, [allies, upgrades, commanderUnitType]);

    // --- Game Loop ---
    useEffect(() => {
        lastTimeRef.current = performance.now();
        frameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameRef.current);
    }, [phase, speedMultiplier, isPaused]);

    const loop = (time: number) => {
        const delta = time - lastTimeRef.current;
        lastTimeRef.current = time;

        if (phase === Phase.BATTLE && !isPaused) {
            updateEntities(time, delta);
            updateProjectiles(time, delta);
            cleanupEffects(time);
        }

        frameRef.current = requestAnimationFrame(loop);
    };

    const updateEntities = (time: number, delta: number) => {
        setEntities(prevEnts => {
            // 1. Handle Deaths (Count logic)
            prevEnts.forEach(e => {
                if (e.hp <= 0 && e.team === 'ENEMY' && !processedDeathsRef.current.has(e.id)) {
                    processedDeathsRef.current.add(e.id);
                    killsRef.current[e.type] = (killsRef.current[e.type] || 0) + 1;
                }
            });

            // Filter out dead soldiers, but KEEP dead Commanders (Downed State)
            const nextEnts = prevEnts.filter(e => {
                if (e.hp > 0) return true;
                // Keep commanders even if HP <= 0
                if (e.type.startsWith('COMMANDER_')) return true;
                return false;
            });

            const activePlayers = nextEnts.filter(e => e.team === 'PLAYER' && e.hp > 0);
            const activeEnemies = nextEnts.filter(e => e.team === 'ENEMY' && e.hp > 0);

            // 2. Victory/Defeat Check
            if (!isBattleEndingRef.current) {
                if (activePlayers.length === 0 && activeEnemies.length > 0) {
                    isBattleEndingRef.current = true;
                    onBattleEnd(false, [], killsRef.current);
                } else if (activeEnemies.length === 0 && activePlayers.length > 0) {
                    isBattleEndingRef.current = true;
                    setTimeout(() => {
                        // Exclude Commanders from the "Survivors" list passed to UI
                        const survivorUnits = activePlayers
                            .filter(p => !p.type.startsWith('COMMANDER_'))
                            .map(p => p.type);
                        
                        onBattleEnd(true, survivorUnits, killsRef.current);
                    }, VICTORY_DELAY_MS);
                } else if (activePlayers.length === 0 && activeEnemies.length === 0 && prevEnts.length > 0) {
                     isBattleEndingRef.current = true;
                     onBattleEnd(false, [], killsRef.current);
                }
            }

            // 3. Process Individual Entities
            nextEnts.forEach(entity => {
                // Skip update logic if dead/downed
                if (entity.hp <= 0) return;

                // A. Dynamic Stats Calculation
                const effectiveStats = calculateEntityStats(entity.type, entity.buffs, entity.team === 'PLAYER' ? upgrades : [], entity.team);
                
                entity.atk = effectiveStats.atk;
                entity.def = effectiveStats.def;
                entity.range = effectiveStats.range;
                entity.moveSpeed = effectiveStats.moveSpeed;
                entity.atkSpeed = effectiveStats.atkSpeed;

                // B. Logic & AI State
                updateEntityBehavior(entity, effectiveStats, delta, speedMultiplier);
                syncEntityStateBuffs(entity);

                // C. Passive Effects (Regen)
                const regen = processRegeneration(entity, effectiveStats, delta, speedMultiplier);
                if (regen.hpAmount > 0) {
                    entity.hp = Math.min(entity.maxHp, entity.hp + regen.hpAmount);
                    if (regen.shouldTriggerVfx) {
                        setEffects(prev => [...prev, {
                            id: `heal-${Date.now()}-${Math.random()}`,
                            x: entity.x, y: entity.y - 2, type: 'HEAL', createdAt: time, duration: 600
                        }]);
                    }
                }

                // D. Skip Combat if in Special AI State
                if (entity.aiState && entity.aiState !== 'NORMAL') return;

                // E. Targeting (Find Nearest Alive Enemy)
                const potentialTargets = entity.team === 'PLAYER' ? activeEnemies : activePlayers;
                const target = findNearestTarget(entity, potentialTargets); // findNearestTarget already ignores dead/downed
                entity.targetId = target ? target.id : null;

                // F. Combat & Movement
                if (target) {
                    if (isInRange(entity, target)) {
                        // Attack
                        const effectiveCooldown = entity.atkSpeed / speedMultiplier;
                        if (time - entity.lastAttackTime > effectiveCooldown) {
                            entity.lastAttackTime = time;

                            if (entity.range > 3) {
                                // Ranged Projectile
                                setProjectiles(prev => [...prev, {
                                    id: `proj-${Date.now()}-${Math.random()}`,
                                    x: entity.x, y: entity.y,
                                    targetId: target.id,
                                    damage: calculateDamage(entity, target),
                                    speed: 0.08 * speedMultiplier,
                                    rotation: Math.atan2(target.y - entity.y, target.x - entity.x) * (180 / Math.PI),
                                    opacity: 1
                                }]);
                            } else {
                                // Melee Damage
                                const dmg = calculateDamage(entity, target);
                                target.hp -= dmg;
                                target.lastHitTime = time;
                                
                                const isSlash = entity.buffs.includes('FRENZY');
                                setEffects(prev => [...prev, {
                                    id: `vfx-${Date.now()}-${Math.random()}`,
                                    x: target.x, y: target.y,
                                    type: isSlash ? 'SLASH' : 'HIT',
                                    createdAt: time, duration: 300
                                }]);
                            }
                        }
                    } else {
                        // Move
                        const nextPos = calculateMovement(entity, target, delta, speedMultiplier);
                        entity.x = nextPos.x;
                        entity.y = nextPos.y;
                    }
                }
            });

            return nextEnts;
        });
    };

    const updateProjectiles = (time: number, delta: number) => {
        setEntities(currentEntities => {
            let nextEntities = [...currentEntities];
            let hitOccurred = false;

            setProjectiles(currentProjs => {
                let nextProjs: Projectile[] = [];
                currentProjs.forEach(p => {
                    const target = nextEntities.find(e => e.id === p.targetId);
                    
                    // If target is dead/downed, projectile misses or fades (simple behavior: just allow hit even if overkill/downed)
                    // But for "downed" commander, we shouldn't deal damage? 
                    // Let's assume projectiles in flight still hit, but we check HP in damage calc.
                    
                    let tx = p.x, ty = p.y;
                    let targetFound = false;
                    if (target) { tx = target.x; ty = target.y; targetFound = true; }

                    let dx, dy, dist;
                    if (targetFound) {
                        dx = tx - p.x; dy = ty - p.y; dist = Math.hypot(dx, dy);
                    } else {
                        const rad = p.rotation * (Math.PI / 180);
                        dx = Math.cos(rad) * 100; dy = Math.sin(rad) * 100; dist = 1000;
                    }

                    if (targetFound && dist < 2) {
                        if (target!.hp > 0) {
                             target!.hp -= p.damage;
                             target!.lastHitTime = time;
                             hitOccurred = true;
                             setEffects(prev => [...prev, { id: `vfx-${Date.now()}-${Math.random()}`, x: target!.x, y: target!.y, type: 'HIT', createdAt: time, duration: 300 }]);
                        }
                    } else {
                        let moveAmt = p.speed * (delta / 16);
                        let newX = p.x, newY = p.y;
                        if (targetFound) {
                            const vx = dx / dist; const vy = dy / dist;
                            newX += vx * moveAmt; newY += vy * moveAmt;
                        } else {
                            const rad = p.rotation * (Math.PI / 180);
                            newX += Math.cos(rad) * moveAmt; newY += Math.sin(rad) * moveAmt;
                        }
                        let newOpacity = p.opacity ?? 1;
                        if (!targetFound) newOpacity -= 0.05;
                        if (newOpacity > 0) nextProjs.push({ ...p, x: newX, y: newY, rotation: p.rotation, opacity: newOpacity });
                    }
                });
                return nextProjs;
            });
            return hitOccurred ? nextEntities : currentEntities;
        });
    };

    const cleanupEffects = (time: number) => {
        setEffects(prev => prev.filter(e => time - e.createdAt < e.duration));
    };

    return {
        entities,
        projectiles,
        effects,
        speedMultiplier,
        isPaused,
        setSpeedMultiplier,
        setIsPaused
    };
};
