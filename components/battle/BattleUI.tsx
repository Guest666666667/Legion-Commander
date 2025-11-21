
import React from 'react';
import { REWARD_DEFINITIONS } from '../../constants';
import { Play, Pause, Flag, Backpack, X } from 'lucide-react';

// --- BATTLE CONTROLS ---

interface BattleControlsProps {
    isPaused: boolean;
    speedMultiplier: number;
    showBuffs: boolean;
    hasSelectedEntity: boolean;
    onTogglePause: () => void;
    onToggleSpeed: () => void;
    onSurrender: () => void;
    onToggleBuffs: () => void;
}

export const BattleControls: React.FC<BattleControlsProps> = ({
    isPaused, speedMultiplier, showBuffs, hasSelectedEntity,
    onTogglePause, onToggleSpeed, onSurrender, onToggleBuffs
}) => {
    return (
        <>
             {/* BUFF TOGGLE BUTTON */}
            <div className="absolute bottom-2 left-2 z-40">
                <button 
                    onClick={onToggleBuffs}
                    className={`
                        w-10 h-10 rounded-md shadow-lg flex items-center justify-center border-2 transition-all
                        ${showBuffs ? 'bg-slate-700 border-yellow-500 text-yellow-400' : 'bg-slate-800/80 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white'}
                    `}
                >
                    <Backpack size={18} />
                </button>
            </div>

            {/* TOP CONTROLS */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-2 z-50">
                <button onClick={onTogglePause} className={`bg-slate-800/80 hover:bg-slate-700 text-white border border-slate-600 rounded-md px-3 py-1 flex items-center justify-center transition-all shadow-lg active:scale-95 w-10 ${isPaused && !hasSelectedEntity && !showBuffs ? 'animate-pulse ring-2 ring-yellow-500' : ''}`}>
                    {isPaused && !hasSelectedEntity && !showBuffs ? <Play size={14} /> : <Pause size={14} />}
                </button>
                <button onClick={onToggleSpeed} className="bg-slate-800/80 hover:bg-slate-700 text-yellow-400 border border-slate-600 rounded-md px-3 py-1 flex items-center gap-0.5 transition-all shadow-lg active:scale-95 min-w-[40px] justify-center">
                    {Array.from({ length: speedMultiplier }).map((_, i) => (<Play key={i} size={12} fill="currentColor" className={i > 0 ? "-ml-1.5" : ""} />))}
                </button>
                <button onClick={onSurrender} className="bg-red-900/80 hover:bg-red-700 text-white border border-red-700 rounded-md px-3 py-1 flex items-center justify-center transition-all shadow-lg active:scale-95 w-10">
                    <Flag size={14} />
                </button>
            </div>
        </>
    );
};

// --- BUFFS LIST MODAL ---

interface BattleBuffsModalProps {
    rewardsHistory: Record<string, number>;
    onClose: () => void;
}

export const BattleBuffsModal: React.FC<BattleBuffsModalProps> = ({ rewardsHistory, onClose }) => {
    const ownedRewards = Object.entries(rewardsHistory)
        .map(([id, count]) => ({ id, count: count as number, def: REWARD_DEFINITIONS[id] }))
        .filter(item => item.def);

    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-8" onClick={onClose}>
            <div className="bg-slate-800 border-2 border-slate-600 rounded-xl p-4 shadow-2xl max-w-xs w-full relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <Backpack size={18} className="text-yellow-500" />
                        <span className="font-bold text-white uppercase">Current Gains</span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {ownedRewards.length === 0 && (
                        <p className="text-slate-500 text-sm text-center py-4 italic">No items collected yet.</p>
                    )}
                    {ownedRewards.map(({ id, count, def }) => (
                        <div key={id} className="bg-slate-900/50 p-2 rounded border border-slate-700 flex items-center gap-3">
                            <div className="bg-slate-800 p-1.5 rounded text-yellow-500 border border-slate-600">
                                <def.icon size={16} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-200 uppercase">{def.label}</span>
                                    {count > 1 && (
                                        <span className="text-[10px] font-bold text-black bg-yellow-500 px-1.5 rounded-full">x{count}</span>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 leading-tight">{def.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
