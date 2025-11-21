
import React, { useState } from 'react';
import { BattleEntity, Phase, UnitType } from '../types';
import { BUFF_CONFIG } from '../constants';
import { UnitIcon } from './UnitIcon';
import { Sparkles, MoveRight } from 'lucide-react';
import { useBattleLoop } from './battle/useBattleLoop';
import { getUnitGlowColor, getEntityFilterStyle } from './battle/battleUtils';
import { BattleEntityModal } from './battle/BattleEntityModal';
import { BattleControls, BattleBuffsModal } from './battle/BattleUI';

interface BattleZoneProps {
  allies: UnitType[];
  level: number;
  phase: Phase;
  commanderUnitType: UnitType; 
  onBattleEnd: (victory: boolean, survivors?: UnitType[], kills?: Record<string, number>) => void;
  upgrades?: UnitType[];
  rewardsHistory: Record<string, number>;
}

export const BattleZone: React.FC<BattleZoneProps> = (props) => {
  const {
      entities,
      projectiles,
      effects,
      speedMultiplier,
      isPaused,
      setSpeedMultiplier,
      setIsPaused
  } = useBattleLoop({
    ...props,
    upgrades: props.upgrades || []
  });

  const [selectedEntity, setSelectedEntity] = useState<BattleEntity | null>(null);
  const [showBuffs, setShowBuffs] = useState(false);

  const toggleSpeed = () => setSpeedMultiplier(prev => prev === 3 ? 1 : prev + 1);
  
  const togglePause = () => {
    setIsPaused(prev => {
        const newState = !prev;
        if (!newState) setSelectedEntity(null); 
        return newState;
    });
  };
  
  const handleSurrender = () => {
      props.onBattleEnd(false);
  };

  const handleEntityClick = (entity: BattleEntity) => {
      if (entity.hp <= 0) return; // Cannot select downed units
      if (!isPaused) setIsPaused(true);
      setSelectedEntity(entity);
      setShowBuffs(false);
  };

  const handleCloseModal = () => {
      setSelectedEntity(null);
      setShowBuffs(false);
      setIsPaused(false);
  };

  const toggleBuffs = () => {
      if (showBuffs) {
          setShowBuffs(false);
          if (selectedEntity === null) setIsPaused(false);
      } else {
          if (!isPaused) setIsPaused(true);
          setShowBuffs(true);
          setSelectedEntity(null);
      }
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
             const isDowned = ent.hp <= 0;
             
             // Only render alive units OR Commanders (even if down)
             // Soldiers disappear when dead
             if (isDowned && !ent.type.startsWith('COMMANDER_')) return null;

             const zIndex = Math.floor(ent.y * 100);
             const isHit = performance.now() - ent.lastHitTime < 150 && !isDowned;
             const isUpgraded = props.upgrades?.includes(ent.type) && ent.team === 'PLAYER';
             const scale = ent.scale || 1;
             
             // Check for Unified Commander Buff
             const hasCommanderBuff = ent.buffs.some(b => BUFF_CONFIG[b]?.isCommanderBuff);
             const glowColor = getUnitGlowColor(ent.type);
             const filterStyle = getEntityFilterStyle(ent);

             return (
               <div 
                key={ent.id} 
                onClick={() => handleEntityClick(ent)} 
                className={`
                    absolute transition-transform duration-100 will-change-transform rounded-md
                    ${!isDowned ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'}
                `} 
                style={{ 
                    left: `${ent.x}%`, 
                    top: `${ent.y}%`, 
                    zIndex: zIndex, 
                    transform: `translate(-50%, -50%) scale(${scale})`,
                    width: '32px', 
                    height: '32px',
                    filter: filterStyle,
                    boxShadow: (hasCommanderBuff && !isDowned) ? `0 0 10px 2px ${glowColor}` : undefined
                }}
               >
                 <div className="w-full h-full animate-spawn-unit">
                    <div className={`w-full h-full transition-all duration-75 ${isHit ? 'brightness-200 sepia saturate-200 hue-rotate-[-50deg]' : ''}`}
                        style={{ transform: `scale(${ent.team === 'ENEMY' ? '-1, 1' : '1, 1'})` }}>
                        <UnitIcon type={ent.type} isUpgraded={isUpgraded} />
                    </div>
                 </div>
                 
                 {ent.type === UnitType.SPEAR && ent.aiState === 'CHARGING' && !isDowned && (
                     <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-bold text-yellow-300 animate-pulse whitespace-nowrap shadow-black drop-shadow-md">
                        CHARGE!
                     </div>
                 )}

                 {ent.buffs.includes('HEAL') && !isDowned && (
                    <div className="absolute top-0 right-0 w-1 h-1 bg-green-400 rounded-full animate-ping" />
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

       <BattleControls 
            isPaused={isPaused}
            speedMultiplier={speedMultiplier}
            showBuffs={showBuffs}
            hasSelectedEntity={!!selectedEntity}
            onTogglePause={togglePause}
            onToggleSpeed={toggleSpeed}
            onSurrender={handleSurrender}
            onToggleBuffs={toggleBuffs}
       />

       {/* BUFFS LIST MODAL */}
       {showBuffs && (
           <BattleBuffsModal 
                rewardsHistory={props.rewardsHistory}
                onClose={handleCloseModal}
           />
       )}

       {/* ENTITY DETAIL MODAL */}
       {isPaused && selectedEntity && (
           <BattleEntityModal 
                entity={selectedEntity} 
                upgrades={props.upgrades || []} 
                onClose={handleCloseModal} 
           />
       )}
    </div>
  );
};
