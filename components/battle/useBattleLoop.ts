
import { useState, useRef, useEffect } from 'react';
import { Phase, UnitType, Projectile, VisualEffect } from '../../types';
import { VICTORY_DELAY_MS, DEFAULT_SPEED_MULTIPLIER } from '../../constants';
import { createUnit } from '../units/UnitFactory';
import { BaseUnit } from '../units/BaseUnit';
import { GAME_LEVELS } from '../map/levelConfig';

interface UseBattleLoopProps {
    allies: UnitType[];
    level: number;
    phase: Phase;
    commanderUnitType: UnitType;
    upgrades: UnitType[];
    onBattleEnd: (victory: boolean, survivors?: UnitType[], kills?: Record<string, number>) => void;
}

// Helper to standardize inspection logic and PREVENT CROSS-TEAM BUFFS
const runAllyInspection = (inspector: BaseUnit, recipient: BaseUnit) => {
    // 1. Don't inspect self
    if (inspector === recipient) return;
    
    // 2. CRITICAL: Teams must match. Enemies don't buff Players.
    if (inspector.team !== recipient.team) return;

    // 3. Delegate logic to the unit instance.
    // BaseUnit has a default empty implementation, so this is safe for all units.
    inspector.onAllySpawned(recipient);
};

export const useBattleLoop = ({ allies, level, phase, commanderUnitType, upgrades, onBattleEnd }: UseBattleLoopProps) => {
    // We store BaseUnit class instances here
    const [entities, setEntities] = useState<BaseUnit[]>([]);
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

    // --- Initialization (Spawning Enemies) ---
    useEffect(() => {
        const initialEnemies: BaseUnit[] = [];
        let idCounter = 0;
        
        const configIndex = Math.min(level - 1, GAME_LEVELS.length - 1);
        const config = GAME_LEVELS[configIndex];

        // 1. Instantiate All Enemies (Commanders + Soldiers)
        // We create them raw first, without buffs, just like the player units.
        
        // A. Spawn Commanders
        config.enemyCommanders?.forEach(type => {
            const unit = createUnit(
                `e-${level}-cmd-${idCounter++}`,
                type,
                'ENEMY',
                [], // No initial buffs, handled by inspection
                [], 
                config.difficultyMult
            );
            initialEnemies.push(unit);
        });

        // B. Spawn Soldiers
        Object.entries(config.unitCounts).forEach(([typeStr, count]) => {
            const type = typeStr as UnitType;
            for (let i = 0; i < count; i++) {
                const unit = createUnit(
                    `e-${level}-${type}-${idCounter++}`,
                    type,
                    'ENEMY',
                    [], // No initial buffs
                    [], 
                    config.difficultyMult
                );
                initialEnemies.push(unit);
            }
        });

        // 2. Cross-Inspection Phase
        // Since all enemies spawn at t=0, they must inspect each other to apply Auras.
        initialEnemies.forEach(inspector => {
            initialEnemies.forEach(recipient => {
                runAllyInspection(inspector, recipient);
            });
        });

        // 3. Finalize Spawn
        // Apply difficulty scaling and verify stats with the newly added buffs
        initialEnemies.forEach(unit => unit.finalizeSpawn());
        
        setEntities(initialEnemies);
        setProjectiles([]);
        setEffects([]);
        alliesProcessedCount.current = 0;
        isBattleEndingRef.current = false;
        setIsPaused(false);
        killsRef.current = {};
        processedDeathsRef.current = new Set();
    }, [level]);

    // --- Ally Spawning (Sequential Inspection Pattern) ---
    useEffect(() => {
        if (allies.length > alliesProcessedCount.current) {
            const newUnitsTypes = allies.slice(alliesProcessedCount.current);
            
            // We must process inside setEntities to access the MOST RECENT list of existing entities.
            // This ensures that if 3 units summon rapidly, they all get added and checked against the current state.
            setEntities(prevEntities => {
                const nextEntities = [...prevEntities];
                
                newUnitsTypes.forEach((type, idx) => {
                    // 1. Create the new unit
                    // Unique ID ensures React keys are stable. using Date.now() + index for uniqueness in batch
                    const newUnit = createUnit(
                        `p-${Date.now()}-${alliesProcessedCount.current + idx}`,
                        type,
                        'PLAYER',
                        [], // Start with no buffs, let the Commanders add them
                        upgrades,
                        1.0
                    );

                    // 2. INSPECTION PHASE (BIDIRECTIONAL)
                    // Iterate through all units currently on the field.
                    nextEntities.forEach(existingUnit => {
                        // A. Old Buffs New: Does the existing unit have an aura for the new recruit?
                        // (e.g., Existing Warlord buffs new Infantry)
                        runAllyInspection(existingUnit, newUnit);

                        // B. New Buffs Old: Does the new recruit have an aura for existing units?
                        // (e.g., New Warlord from Rewards buffs existing Infantry survivors)
                        runAllyInspection(newUnit, existingUnit);
                    });
                    
                    // 3. FINALIZE
                    // Apply all buffs accumulated during inspection and reset stats/HP
                    newUnit.finalizeSpawn();

                    // 4. Add the new unit to the field
                    nextEntities.push(newUnit);
                });

                return nextEntities;
            });
            
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
            // 1. Handle Deaths
            prevEnts.forEach(e => {
                if (e.hp <= 0 && e.team === 'ENEMY' && !processedDeathsRef.current.has(e.id)) {
                    processedDeathsRef.current.add(e.id);
                    killsRef.current[e.type] = (killsRef.current[e.type] || 0) + 1;
                }
            });

            // Filter dead soldiers (Keep Downed Commanders)
            const nextEnts = prevEnts.filter(e => {
                if (e.hp > 0) return true;
                if (e.type.startsWith('COMMANDER_')) return true;
                return false;
            });

            const activePlayers = nextEnts.filter(e => e.team === 'PLAYER' && e.hp > 0);
            const activeEnemies = nextEnts.filter(e => e.team === 'ENEMY' && e.hp > 0);

            // 2. Victory Check
            if (!isBattleEndingRef.current) {
                if (activePlayers.length === 0 && activeEnemies.length > 0) {
                    isBattleEndingRef.current = true;
                    setProjectiles([]);
                    setEffects([]);
                    onBattleEnd(false, [], killsRef.current);
                } else if (activeEnemies.length === 0 && activePlayers.length > 0) {
                    isBattleEndingRef.current = true;
                    setTimeout(() => {
                        setProjectiles([]);
                        setEffects([]);
                        // FIX: Send ALL surviving unit types. 
                        // Previously filtered out Commanders, which caused Recruited Commanders to disappear.
                        const survivorUnits = activePlayers.map(p => p.type);
                        onBattleEnd(true, survivorUnits, killsRef.current);
                    }, VICTORY_DELAY_MS);
                } else if (activePlayers.length === 0 && activeEnemies.length === 0 && prevEnts.length > 0) {
                     // Draw / Wipeout
                     isBattleEndingRef.current = true;
                     setProjectiles([]);
                     setEffects([]);
                     onBattleEnd(false, [], killsRef.current);
                }
            }

            // 3. Ticks (Logic Delegation)
            const addProjectile = (p: Projectile) => setProjectiles(prev => [...prev, p]);
            const addEffect = (e: VisualEffect) => setEffects(prev => [...prev, e]);

            nextEnts.forEach(entity => {
                const enemies = entity.team === 'PLAYER' ? activeEnemies : activePlayers;
                entity.tick(time, delta, speedMultiplier, enemies, addProjectile, addEffect);
            });

            return [...nextEnts];
        });
    };

    const updateProjectiles = (time: number, delta: number) => {
        setEntities(currentEntities => {
            let hitOccurred = false;

            setProjectiles(currentProjs => {
                let nextProjs: Projectile[] = [];
                currentProjs.forEach(p => {
                    const target = currentEntities.find(e => e.id === p.targetId);
                    
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
                             target!.takeDamage(p.damage, time);
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
                        if (!targetFound) newOpacity -= 0.02; // Slower fade out (was 0.05)
                        if (newOpacity > 0) nextProjs.push({ ...p, x: newX, y: newY, rotation: p.rotation, opacity: newOpacity });
                    }
                });
                return nextProjs;
            });
            return hitOccurred ? [...currentEntities] : currentEntities;
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
