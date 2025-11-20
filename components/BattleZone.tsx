
import React, { useEffect, useRef, useState } from 'react';
import { BattleEntity, Phase, UnitType, Projectile, VisualEffect, CommanderType } from '../types';
import { UNIT_STATS, GAME_LEVELS, DEFAULT_SPEED_MULTIPLIER, UNIT_UPGRADES, VICTORY_DELAY_MS, REWARD_DEFINITIONS, SPAWN_CONFIG } from '../constants';
import { UnitIcon } from './UnitIcon';
import { Play, MoveRight, Sparkles, Pause, X, Shield, Sword, Heart, Crosshair, Flag, Plus, Zap } from 'lucide-react';

interface BattleZoneProps {
  allies: UnitType[];
  level: number;
  phase: Phase;
  commanderType: CommanderType;
  onBattleEnd: (victory: boolean, survivors?: UnitType[], kills?: Record<string, number>) => void;
  upgrades?: UnitType[];
  rewardsHistory: Record<string, number>;
}

export const BattleZone: React.FC<BattleZoneProps> = ({ allies, level, phase, commanderType, onBattleEnd, upgrades = [], rewardsHistory = {} }) => {
  const [entities, setEntities] = useState<BattleEntity[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [effects, setEffects] = useState<VisualEffect[]>([]);
  const [speedMultiplier, setSpeedMultiplier] = useState(DEFAULT_SPEED_MULTIPLIER);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<BattleEntity | null>(null);
  
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const alliesProcessedCount = useRef<number>(0);
  const isBattleEndingRef = useRef(false);
  
  const killsRef = useRef<Record<string, number>>({});
  const processedDeathsRef = useRef<Set<string>>(new Set());

  // --- Helpers ---

  const getSpawnX = (type: UnitType, team: 'PLAYER' | 'ENEMY') => {
    const config = team === 'ENEMY' ? SPAWN_CONFIG.ENEMY : SPAWN_CONFIG.PLAYER;
    // @ts-ignore - dynamic property access
    const spawnData = config[type] || config.DEFAULT;
    return spawnData.base + (Math.random() * spawnData.variance);
  };

  const getEffectiveDef = (entity: BattleEntity) => {
      if (entity.type === UnitType.SPEAR && entity.aiState && entity.aiState !== 'NORMAL') {
          return entity.def * 2;
      }
      return entity.def;
  };

  // --- Initialization ---

  useEffect(() => {
    const initialEnemies: BattleEntity[] = [];
    let idCounter = 0;
    
    const configIndex = Math.min(level - 1, GAME_LEVELS.length - 1);
    const config = GAME_LEVELS[configIndex];

    Object.entries(config.unitCounts).forEach(([typeStr, count]) => {
        const type = typeStr as UnitType;
        const baseStats = UNIT_STATS[type];
        if (!baseStats) return;

        const enemyScale = (baseStats.scale || 1) * config.difficultyMult;

        for (let i = 0; i < count; i++) {
            initialEnemies.push({
                ...baseStats,
                maxHp: Math.floor(baseStats.maxHp * config.difficultyMult),
                hp: Math.floor(baseStats.maxHp * config.difficultyMult),
                atk: Math.floor(baseStats.atk * config.difficultyMult),
                scale: enemyScale,
                id: `e-${level}-${type}-${idCounter++}`,
                type: type,
                team: 'ENEMY',
                x: getSpawnX(type, 'ENEMY'),
                y: 20 + (Math.random() * 60),
                targetId: null,
                lastAttackTime: 0,
                lastHitTime: 0,
                aiState: type === UnitType.SPEAR ? 'WAITING' : 'NORMAL',
                aiTimer: 0,
                buffs: []
            });
        }
    });

    if (config.enemyCommanders && config.enemyCommanders.length > 0) {
        const cmdStats = UNIT_STATS[UnitType.COMMANDER];
        const cmdScale = (cmdStats.scale || 1) * config.difficultyMult;

        config.enemyCommanders.forEach((enemyCmdType) => {
             initialEnemies.push({
                ...cmdStats,
                maxHp: Math.floor(cmdStats.maxHp * config.difficultyMult),
                hp: Math.floor(cmdStats.maxHp * config.difficultyMult),
                atk: Math.floor(cmdStats.atk * config.difficultyMult),
                scale: cmdScale,
                id: `e-cmd-${level}-${idCounter++}`,
                type: UnitType.COMMANDER,
                subtype: enemyCmdType,
                team: 'ENEMY',
                x: getSpawnX(UnitType.COMMANDER, 'ENEMY'),
                y: 20 + (Math.random() * 60),
                targetId: null,
                lastAttackTime: 0,
                lastHitTime: 0,
                aiState: 'NORMAL',
                aiTimer: 0,
                buffs: []
            });
        });
    }
    
    setEntities(initialEnemies);
    setProjectiles([]);
    setEffects([]);
    setSelectedEntity(null);
    alliesProcessedCount.current = 0;
    isBattleEndingRef.current = false;
    setIsPaused(false);
    killsRef.current = {};
    processedDeathsRef.current = new Set();
  }, [level]);

  useEffect(() => {
    if (allies.length > alliesProcessedCount.current) {
      const newUnits = allies.slice(alliesProcessedCount.current);
      const newEntities: BattleEntity[] = [];
      
      newUnits.forEach((type, idx) => {
         const base = UNIT_STATS[type];
         let stats = { ...base };

         if (upgrades.includes(type)) {
             const bonus = UNIT_UPGRADES[type];
             if (bonus) {
                 stats.maxHp += (bonus.hp || 0);
                 stats.hp += (bonus.hp || 0);
                 stats.atk += (bonus.atk || 0);
                 stats.def += (bonus.def || 0);
                 stats.moveSpeed += (bonus.moveSpeed || 0);
                 if (bonus.scale) stats.scale = bonus.scale;
             }
         }
         
         // Commander Passive: VANGUARD
         // Friendly Spears get HP and Speed buff
         if (type === UnitType.SPEAR && commanderType === CommanderType.VANGUARD) {
             stats.maxHp += 50; 
             stats.hp += 50;
             stats.moveSpeed += 0.02;
         }

         newEntities.push({
            ...stats,
            id: `p-${Date.now()}-${idx}`,
            type,
            subtype: type === UnitType.COMMANDER ? commanderType : undefined,
            team: 'PLAYER',
            x: getSpawnX(type, 'PLAYER'),
            y: 20 + (Math.random() * 60),
            targetId: null,
            lastAttackTime: 0,
            lastHitTime: 0,
            aiState: type === UnitType.SPEAR ? 'WAITING' : 'NORMAL',
            aiTimer: 0,
            buffs: []
         });
      });

      setEntities(prev => [...prev, ...newEntities]);
      alliesProcessedCount.current = allies.length;
    }
  }, [allies, upgrades, commanderType]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    frameRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frameRef.current);
  }, [phase, speedMultiplier, isPaused, commanderType]);

  const loop = (time: number) => {
    const delta = time - lastTimeRef.current;
    lastTimeRef.current = time;

    if (phase === Phase.BATTLE && !isPaused) {
      updateGameLogic(time, delta);
    }

    frameRef.current = requestAnimationFrame(loop);
  };

  const updateGameLogic = (time: number, delta: number) => {
    setEntities(prevEnts => {
      // Process Deaths
      prevEnts.forEach(e => {
          if (e.hp <= 0 && e.team === 'ENEMY' && !processedDeathsRef.current.has(e.id)) {
              processedDeathsRef.current.add(e.id);
              killsRef.current[e.type] = (killsRef.current[e.type] || 0) + 1;
          }
      });

      let activeEnts = prevEnts.filter(e => e.hp > 0);
      const players = activeEnts.filter(e => e.team === 'PLAYER');
      const enemies = activeEnts.filter(e => e.team === 'ENEMY');

      // --- Commander Aura Detection ---
      const playerElf = players.some(p => p.subtype === CommanderType.ELF);
      const enemyElf = enemies.some(e => e.subtype === CommanderType.ELF);
      
      const playerWarlord = players.some(p => p.subtype === CommanderType.WARLORD);
      const enemyWarlord = enemies.some(e => e.subtype === CommanderType.WARLORD);
      
      const playerGuardian = players.some(p => p.subtype === CommanderType.GUARDIAN);
      const enemyGuardian = enemies.some(e => e.subtype === CommanderType.GUARDIAN);

      // Victory Check
      if (!isBattleEndingRef.current) {
        if (players.length === 0 && enemies.length > 0) {
            isBattleEndingRef.current = true;
            onBattleEnd(false, [], killsRef.current);
        } else if (enemies.length === 0 && players.length > 0) {
            isBattleEndingRef.current = true;
            setTimeout(() => {
                const survivors = players.filter(p => p.type !== UnitType.COMMANDER).map(p => p.type);
                onBattleEnd(true, survivors, killsRef.current);
            }, VICTORY_DELAY_MS);
        } else if (players.length === 0 && enemies.length === 0 && prevEnts.length > 0) {
            isBattleEndingRef.current = true;
            onBattleEnd(false, [], killsRef.current);
        }
      }

      activeEnts.forEach(entity => {
        // --- Apply Aura Buffs ---
        
        const isPlayer = entity.team === 'PLAYER';
        const hasWarlord = isPlayer ? playerWarlord : enemyWarlord;
        const hasGuardian = isPlayer ? playerGuardian : enemyGuardian;

        // Warlord Logic (FRENZY)
        if (entity.type === UnitType.INFANTRY) {
            if (hasWarlord && !entity.buffs.includes('FRENZY')) {
                entity.buffs.push('FRENZY');
            } else if (!hasWarlord && entity.buffs.includes('FRENZY')) {
                entity.buffs = entity.buffs.filter(b => b !== 'FRENZY');
            }
        }

        // Guardian Logic (HEAL)
        if (entity.type === UnitType.SHIELD) {
             if (hasGuardian && !entity.buffs.includes('HEAL')) {
                entity.buffs.push('HEAL');
             } else if (!hasGuardian && entity.buffs.includes('HEAL')) {
                entity.buffs = entity.buffs.filter(b => b !== 'HEAL');
             }
        }

        // --- Process Passive Buff Effects ---
        
        // HEAL Effect
        if (entity.buffs.includes('HEAL')) {
            if (entity.hp < entity.maxHp) {
                // Heal 2% max HP per second approx
                const healAmount = (entity.maxHp * 0.02) * (delta / 1000) * speedMultiplier;
                entity.hp = Math.min(entity.maxHp, entity.hp + healAmount);
                
                // Visual for healing (chance to spawn particle)
                if (Math.random() < 0.01 * speedMultiplier) {
                    setEffects(prev => [...prev, {
                        id: `heal-${Date.now()}-${Math.random()}`,
                        x: entity.x, 
                        y: entity.y - 2, 
                        type: 'HEAL', 
                        createdAt: time, 
                        duration: 600 
                    }]);
                }
            }
        }

        // --- Spear Charge Logic ---
        if (entity.type === UnitType.SPEAR && entity.aiState && entity.aiState !== 'NORMAL') {
            entity.aiTimer = (entity.aiTimer || 0) + (delta * speedMultiplier);
            if (entity.aiState === 'WAITING') {
                if (entity.aiTimer >= 2000) entity.aiState = 'CHARGING';
                return;
            }
            if (entity.aiState === 'CHARGING') {
                const targetX = entity.team === 'PLAYER' ? 90 : 10;
                const distToTarget = Math.abs(targetX - entity.x);
                const chargeSpeed = (entity.moveSpeed || 0.04) * 8 * (delta / 16) * speedMultiplier;
                const dir = Math.sign(targetX - entity.x);
                entity.x += dir * chargeSpeed;
                if (distToTarget < 2) entity.aiState = 'NORMAL';
                return;
            }
        }

        // --- Standard AI ---
        const targets = entity.team === 'PLAYER' ? enemies : players;
        let minDist = 10000;
        let bestTarget: BattleEntity | null = null;
        targets.forEach(t => {
            const dist = Math.hypot(t.x - entity.x, t.y - entity.y);
            if (dist < minDist) { minDist = dist; bestTarget = t; }
        });
        
        const target = bestTarget || undefined;
        entity.targetId = target ? target.id : null;

        if (target) {
            const dist = Math.hypot(target.x - entity.x, target.y - entity.y);
            let rangeThreshold = 5; 
            if (entity.range > 5) rangeThreshold = 45;
            else if (entity.range > 1.5) rangeThreshold = 15;

            // Apply Buffs: Range
            if (entity.type === UnitType.ARCHER) {
                if (isPlayer && playerElf) rangeThreshold *= 1.5;
                else if (!isPlayer && enemyElf) rangeThreshold *= 1.5;
            }
            
            // Warlord Range Buff
            if (entity.buffs.includes('FRENZY')) {
                rangeThreshold += 10; // +1 Grid Range approx visually
            }

            if (dist <= rangeThreshold) {
              const effectiveCooldown = entity.speed / speedMultiplier;
              if (time - entity.lastAttackTime > effectiveCooldown) {
                entity.lastAttackTime = time;

                if (entity.range > 3) {
                   // Ranged Attack
                   setProjectiles(prev => [
                     ...prev, 
                     {
                       id: `proj-${Date.now()}-${Math.random()}`,
                       x: entity.x,
                       y: entity.y,
                       targetId: target!.id,
                       damage: Math.max(1, entity.atk - getEffectiveDef(target!)),
                       speed: 0.08 * speedMultiplier,
                       rotation: Math.atan2(target!.y - entity.y, target!.x - entity.x) * (180 / Math.PI),
                       opacity: 1
                     }
                   ]);
                } else {
                  // Melee Attack
                  const dmg = Math.max(1, entity.atk - getEffectiveDef(target));
                  target.hp -= dmg;
                  target.lastHitTime = time;
                  
                  // Check for Warlord VFX
                  const isSlash = entity.buffs.includes('FRENZY');

                  setEffects(prev => [
                    ...prev,
                    {
                      id: `vfx-${Date.now()}-${Math.random()}`,
                      x: target!.x,
                      y: target!.y,
                      type: isSlash ? 'SLASH' : 'HIT',
                      createdAt: time,
                      duration: 300
                    }
                  ]);
                }
              }
            } else {
              // Move
              const moveSpeed = (entity.moveSpeed || 0.03) * (delta / 16) * speedMultiplier;
              const vx = (target.x - entity.x) / dist;
              const vy = (target.y - entity.y) / dist;
              entity.x += vx * moveSpeed;
              entity.y += vy * moveSpeed;
            }
        }
      });

      return activeEnts;
    });

    // --- Projectiles ---
    setEntities(currentEntities => {
        let nextEntities = [...currentEntities];
        let hitOccurred = false;

        setProjectiles(currentProjs => {
            let nextProjs: Projectile[] = [];
            currentProjs.forEach(p => {
                const target = nextEntities.find(e => e.id === p.targetId);
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
                    target!.hp -= p.damage;
                    target!.lastHitTime = time;
                    hitOccurred = true;
                    setEffects(prev => [...prev, { id: `vfx-${Date.now()}-${Math.random()}`, x: target!.x, y: target!.y, type: 'HIT', createdAt: time, duration: 300 }]);
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

    setEffects(prev => prev.filter(e => time - e.createdAt < e.duration));
  };

  const toggleSpeed = () => setSpeedMultiplier(prev => prev === 3 ? 1 : prev + 1);
  const togglePause = () => {
    setIsPaused(prev => {
        const newState = !prev;
        if (!newState) setSelectedEntity(null); 
        return newState;
    });
  };
  const handleSurrender = () => {
      if (isBattleEndingRef.current) return;
      isBattleEndingRef.current = true;
      onBattleEnd(false, [], killsRef.current);
  };
  const handleEntityClick = (entity: BattleEntity) => {
      if (!isPaused) setIsPaused(true);
      setSelectedEntity(entity);
  };
  const handleCloseModal = () => {
      setSelectedEntity(null);
      setIsPaused(false);
  };

  const aliveEnemies = entities.filter(e => e.team === 'ENEMY' && e.hp > 0).length;
  const aliveAllies = entities.filter(e => e.team === 'PLAYER' && e.hp > 0).length;

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
       <style>{`
         @keyframes spawn-unit {
            0% { opacity: 0; transform: scale(0); }
            80% { transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
         }
         .animate-spawn-unit {
            animation: spawn-unit 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
         }
       `}</style>

       <div className={`absolute inset-0 transition-all duration-500 ${isPaused ? 'grayscale brightness-75' : ''}`}>
           <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
           
           {projectiles.map(p => (
               <div key={p.id} className="absolute w-4 h-2 text-yellow-300 z-30 pointer-events-none" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`, opacity: p.opacity ?? 1 }}>
                   <MoveRight size={16} strokeWidth={3} />
               </div>
           ))}

           {entities.map(ent => {
             if (ent.hp <= 0) return null;
             const zIndex = Math.floor(ent.y * 100);
             const isHit = performance.now() - ent.lastHitTime < 150;
             const isUpgraded = upgrades.includes(ent.type) && ent.team === 'PLAYER';
             const scale = ent.scale || 1;
             const healthRatio = ent.hp / ent.maxHp;
             
             let filterStyle = '';
             if (ent.team === 'PLAYER') {
                 const b = 1 + (1 - healthRatio) * 1.2;
                 const s = 0.3 + (0.7 * healthRatio);
                 filterStyle = `brightness(${b}) saturate(${s})`;
             } else {
                 const b = 0.25 + (healthRatio * 0.45);
                 filterStyle = `brightness(${b})`;
             }

             return (
               <div 
                key={ent.id} 
                onClick={() => handleEntityClick(ent)} 
                className={`absolute transition-transform duration-100 will-change-transform cursor-pointer hover:scale-110 active:scale-95`} 
                style={{ 
                    left: `${ent.x}%`, 
                    top: `${ent.y}%`, 
                    zIndex: zIndex, 
                    transform: `translate(-50%, -50%) scale(${scale})`,
                    width: '32px', 
                    height: '32px',
                    filter: filterStyle,
                }}
               >
                 <div className="w-full h-full animate-spawn-unit">
                    <div className={`w-full h-full transition-all duration-75 ${isHit ? 'brightness-200 sepia saturate-200 hue-rotate-[-50deg]' : ''}`}
                        style={{ transform: `scale(${ent.team === 'ENEMY' ? '-1, 1' : '1, 1'})` }}>
                        <UnitIcon type={ent.type} subtype={ent.subtype} isUpgraded={isUpgraded} />
                    </div>
                 </div>
                 
                 {ent.type === UnitType.SPEAR && ent.aiState === 'CHARGING' && (
                     <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-bold text-yellow-300 animate-pulse whitespace-nowrap shadow-black drop-shadow-md">
                        CHARGE!
                     </div>
                 )}

                 {/* Active Buff Indicators */}
                 {ent.buffs.includes('HEAL') && (
                     <div className="absolute -top-2 right-0 text-green-400 animate-bounce"><Plus size={10} strokeWidth={4} /></div>
                 )}
                 {ent.buffs.includes('FRENZY') && (
                     <div className="absolute -top-2 left-0 text-red-500 animate-pulse"><Zap size={10} strokeWidth={4} /></div>
                 )}
               </div>
             );
           })}

           {effects.map(fx => (
               <div key={fx.id} className={`absolute z-40 pointer-events-none ${fx.type === 'SLASH' ? 'text-red-500 scale-150' : fx.type === 'HEAL' ? 'text-green-400' : 'text-yellow-200'}`} 
                    style={{ left: `${fx.x}%`, top: `${fx.y}%`, transform: 'translate(-50%, -50%)' }}>
                    {fx.type === 'SLASH' ? <div className="animate-ping font-bold text-xl">/</div> : fx.type === 'HEAL' ? <div className="animate-float-up text-xs font-bold">+</div> : <Sparkles size={24} className="animate-ping" />}
               </div>
           ))}
       </div>

       {/* UI Overlays */}
       <div className="absolute top-2 left-2 text-[10px] text-green-400/70 font-mono pointer-events-none border border-green-900/50 bg-black/20 px-2 py-1 rounded z-50">ALLIES: {aliveAllies}</div>
       <div className="absolute top-2 right-2 text-[10px] text-red-400/70 font-mono pointer-events-none border border-red-900/50 bg-black/20 px-2 py-1 rounded z-50">ENEMIES: {aliveEnemies}</div>

       <div className="absolute bottom-2 left-2 flex gap-2 z-40">
            {Object.entries(rewardsHistory).map(([id, count]) => {
                const def = REWARD_DEFINITIONS[id];
                if (!def) return null;
                if (id.startsWith('UPGRADE_')) return null; 
                return (
                    <div key={id} className="relative w-8 h-8 bg-slate-800/80 border border-slate-600 rounded p-1.5 text-yellow-500 flex items-center justify-center shadow-lg backdrop-blur-sm">
                        <def.icon size={20} />
                        {count > 1 && (
                            <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-slate-900 shadow-sm">
                                {count}
                            </div>
                        )}
                    </div>
                )
            })}
       </div>

       <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-2 z-50">
           <button onClick={togglePause} className={`bg-slate-800/80 hover:bg-slate-700 text-white border border-slate-600 rounded-md px-3 py-1 flex items-center justify-center transition-all shadow-lg active:scale-95 w-10 ${isPaused ? 'animate-pulse ring-2 ring-yellow-500' : ''}`}>
             {isPaused ? <Play size={14} /> : <Pause size={14} />}
           </button>
           <button onClick={toggleSpeed} className="bg-slate-800/80 hover:bg-slate-700 text-yellow-400 border border-slate-600 rounded-md px-3 py-1 flex items-center gap-0.5 transition-all shadow-lg active:scale-95 min-w-[40px] justify-center">
             {Array.from({ length: speedMultiplier }).map((_, i) => (<Play key={i} size={12} fill="currentColor" className={i > 0 ? "-ml-1.5" : ""} />))}
           </button>
           <button onClick={handleSurrender} className="bg-red-900/80 hover:bg-red-700 text-white border border-red-700 rounded-md px-3 py-1 flex items-center justify-center transition-all shadow-lg active:scale-95 w-10">
             <Flag size={14} />
           </button>
       </div>

       {isPaused && selectedEntity && (
           <div className="absolute inset-0 z-[60] flex items-center justify-center p-8" onClick={handleCloseModal}>
               <div className="bg-slate-800 border-2 border-slate-600 rounded-xl p-4 shadow-2xl max-w-xs w-full relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
                   <button onClick={handleCloseModal} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X size={20} /></button>
                   <div className="flex items-center gap-4 mb-4">
                        <div className={`w-14 h-14 rounded-lg p-2 border-2 ${selectedEntity.team === 'PLAYER' ? 'bg-green-900/50 border-green-500' : 'bg-red-900/50 border-red-500'}`}>
                            <UnitIcon type={selectedEntity.type} subtype={selectedEntity.subtype} isUpgraded={upgrades.includes(selectedEntity.type) && selectedEntity.team === 'PLAYER'} />
                        </div>
                        <div>
                            <h3 className={`font-bold text-lg uppercase ${selectedEntity.team === 'PLAYER' ? 'text-green-400' : 'text-red-400'}`}>{selectedEntity.type}</h3>
                            <span className="text-xs text-slate-400 px-2 py-0.5 bg-slate-900 rounded">{selectedEntity.team === 'PLAYER' ? 'ALLY' : 'ENEMY'} UNIT</span>
                        </div>
                   </div>
                   <div className="space-y-2 text-sm">
                       <div className="flex justify-between items-center bg-slate-900/50 px-2 py-1 rounded"><div className="flex items-center gap-2 text-slate-300"><Heart size={14} /> HP</div><span className="font-mono text-white">{Math.ceil(selectedEntity.hp)} / {selectedEntity.maxHp}</span></div>
                       <div className="flex justify-between items-center bg-slate-900/50 px-2 py-1 rounded"><div className="flex items-center gap-2 text-slate-300"><Sword size={14} /> ATK</div><span className="font-mono text-white">{selectedEntity.atk}</span></div>
                       <div className="flex justify-between items-center bg-slate-900/50 px-2 py-1 rounded"><div className="flex items-center gap-2 text-slate-300"><Shield size={14} /> DEF</div>
                           <span className="font-mono text-white">
                               {getEffectiveDef(selectedEntity)} 
                               {selectedEntity.def !== getEffectiveDef(selectedEntity) && <span className="text-yellow-400 text-xs ml-1">(BUFF)</span>}
                           </span>
                       </div>
                       <div className="flex justify-between items-center bg-slate-900/50 px-2 py-1 rounded">
                           <div className="flex items-center gap-2 text-slate-300"><Zap size={14} /> BUFFS</div>
                           <span className="font-mono text-yellow-400 text-xs">{selectedEntity.buffs.length > 0 ? selectedEntity.buffs.join(', ') : 'NONE'}</span>
                       </div>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};
