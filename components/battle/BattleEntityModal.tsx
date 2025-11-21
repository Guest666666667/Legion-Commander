
import React from 'react';
import { BattleEntity, UnitType } from '../../types';
import { COMMANDERS, BUFF_CONFIG } from '../../constants';
import { UnitIcon } from '../UnitIcon';
import { X, Shield, Sword, Heart, Zap, Target, Footprints, Timer } from 'lucide-react';
import { calculateEntityStats } from './battleUtils';

interface BattleEntityModalProps {
    entity: BattleEntity;
    upgrades: UnitType[];
    onClose: () => void;
}

export const BattleEntityModal: React.FC<BattleEntityModalProps> = ({ entity, upgrades, onClose }) => {
    // Calculate BASE stats (Unit Base + Permanent Upgrades + No Buffs) for comparison
    const baseStats = calculateEntityStats(
        entity.type, 
        [], 
        entity.team === 'PLAYER' ? upgrades || [] : [], 
        entity.team
    );

    const renderStatBox = (
        icon: React.ReactNode, 
        current: number, 
        base: number, 
        isFloat: boolean, 
        multiplier = 1
     ) => {
         const val = current * multiplier;
         const baseVal = base * multiplier;
         const diff = val - baseVal;
         const hasChange = Math.abs(diff) >= (isFloat ? 0.1 : 1);
         
         const isGood = diff > 0; 
         
         const textColor = hasChange ? (isGood ? 'text-green-400' : 'text-red-400') : 'text-white';
         const display = isFloat ? val.toFixed(1) : Math.round(val);
         const deltaDisplay = isFloat ? Math.abs(diff).toFixed(1) : Math.round(Math.abs(diff));
         const sign = diff > 0 ? '+' : '-';

         return (
             <div className="bg-slate-900/60 rounded-lg p-1.5 flex flex-col items-center justify-center border border-slate-700/50 relative h-12">
                 <div className="text-slate-400 mb-0.5 scale-75">{icon}</div>
                 <span className={`font-mono font-bold text-base leading-none ${textColor}`}>{display}</span>
                 
                 {hasChange && (
                      <div className={`absolute top-0 right-1 text-[8px] font-bold ${isGood ? 'text-green-500' : 'text-red-500'}`}>
                         {sign}{deltaDisplay}
                      </div>
                 )}
             </div>
         )
    }

    return (
        <div className="fixed inset-0 z-[9999] flex justify-center bg-black/60 backdrop-blur-[1px]" onClick={onClose}>
            <div className="w-full max-w-lg h-full flex flex-col pointer-events-none">
                <div className="h-[10%]" /> {/* Map Spacer */}
                <div className="flex-1 flex items-center justify-center p-4 relative pointer-events-auto">
                    <div className="bg-slate-800 border-2 border-slate-600 rounded-xl p-4 shadow-2xl w-full max-w-[300px] relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        
                        {/* Compact Header */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-lg p-1.5 border-2 shadow-inner ${entity.team === 'PLAYER' ? 'bg-green-900/50 border-green-500' : 'bg-red-900/50 border-red-500'}`}>
                                    <UnitIcon type={entity.type} isUpgraded={upgrades.includes(entity.type) && entity.team === 'PLAYER'} />
                                </div>
                                <div>
                                    <h3 className={`font-black text-base uppercase tracking-wide leading-none mb-1 ${entity.team === 'PLAYER' ? 'text-green-400' : 'text-red-400'}`}>
                                        {COMMANDERS[entity.type] ? COMMANDERS[entity.type].name : entity.type}
                                    </h3>
                                    
                                    <div className="flex items-center gap-1.5 text-sm font-mono font-bold text-slate-200">
                                        <Heart size={12} className="text-red-500 fill-red-500" />
                                        <span>
                                            <span className={entity.hp < entity.maxHp ? "text-red-400" : "text-white"}>
                                                {Math.ceil(entity.hp)}
                                            </span>
                                            <span className="text-slate-500 text-[10px]">/{entity.maxHp}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 bg-slate-900 rounded-full hover:bg-slate-700 transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Compact Stats Grid */}
                        <div className="grid grid-cols-5 gap-1.5 mb-3">
                            {renderStatBox(<Sword size={14}/>, entity.atk, baseStats.atk, false)}
                            {renderStatBox(<Shield size={14}/>, entity.def, baseStats.def, false)}
                            {renderStatBox(<Target size={14}/>, entity.range, baseStats.range, true)}
                            {/* For AtkSpeed: Convert Interval (ms) to APS (freq) for display. Lower interval = Higher APS */}
                            {renderStatBox(<Timer size={14}/>, 1000 / entity.atkSpeed, 1000 / baseStats.atkSpeed, true)}
                            {renderStatBox(<Footprints size={14}/>, entity.moveSpeed, baseStats.moveSpeed, true, 100)} 
                        </div>
                        
                        {/* Buffs Section */}
                        {entity.buffs.length > 0 && (
                            <div className="bg-slate-900/50 px-2 py-2 rounded border border-slate-700/50">
                                <div className="w-full space-y-1">
                                    {entity.buffs.map(b => {
                                        const conf = BUFF_CONFIG[b];
                                        return (
                                            <div key={b} className="text-[10px] bg-black/30 px-2 py-1 rounded flex flex-col">
                                                <div className="flex items-center gap-1.5 text-yellow-400 font-bold">
                                                    <Zap size={10} />
                                                    <span>{conf?.label || b}</span>
                                                </div>
                                                {conf?.description && (
                                                    <div className="text-slate-400 text-[9px] leading-tight mt-0.5 pl-4 opacity-80">
                                                        {conf.description}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="h-[45%]" /> {/* Puzzle Spacer */}
            </div>
        </div>
    );
};
