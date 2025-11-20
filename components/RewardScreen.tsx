
import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { UnitType } from '../types';
import { REWARD_DEFINITIONS } from '../constants';
import { UnitIcon } from './UnitIcon';

interface RewardScreenProps {
  rewardIds: string[];
  onSelect: (rewardType: string) => void;
  selectionsLeft: number;
  upgrades: UnitType[];
  rewardsHistory: Record<string, number>;
  survivors: UnitType[];
}

export const RewardScreen: React.FC<RewardScreenProps> = ({ rewardIds, onSelect, selectionsLeft, upgrades, rewardsHistory, survivors }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);

  // Summarize survivors
  const survivorCounts = survivors.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  const handleConfirm = () => {
    if (selectedId) {
      setExiting(true);
      setTimeout(() => {
          onSelect(selectedId);
      }, 400); // Match duration
    }
  };

  const selectedReward = selectedId ? REWARD_DEFINITIONS[selectedId] : null;

  return (
    <div className="absolute inset-0 z-[50000] flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-hidden">
      
      <div className={`
          w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col
          transition-transform duration-500 ease-in-out
          ${exiting ? '-translate-x-[120vw]' : 'animate-slide-in-right'}
      `}>
          
          {/* HEADER with Survivors */}
          <div className="bg-slate-800 p-4 border-b border-slate-700 text-center">
            <h2 className="text-2xl font-black text-yellow-500 tracking-widest mb-2">VICTORY</h2>
            
            <div className="flex justify-center gap-3 mb-2">
                {Object.entries(survivorCounts).map(([type, count]) => (
                    <div key={type} className="flex flex-col items-center bg-slate-900/50 p-1 rounded border border-slate-700 w-10">
                        <div className="w-6 h-6 mb-1">
                             <UnitIcon type={type as UnitType} isUpgraded={upgrades.includes(type as UnitType)} />
                        </div>
                        <span className="text-[10px] font-mono text-white">{count}</span>
                    </div>
                ))}
                {survivors.length === 0 && <span className="text-xs text-slate-500 italic">No survivors...</span>}
            </div>

            <p className="text-slate-400 text-[10px] uppercase tracking-wide">
                Picks Remaining: <span className="text-yellow-400 font-bold text-sm ml-1">{selectionsLeft}</span>
            </p>
          </div>

          {/* CONTENT */}
          <div className="p-4 flex flex-col items-center">
              <div className="grid grid-cols-3 gap-3 w-full mb-4">
                {rewardIds.map(id => {
                  const def = REWARD_DEFINITIONS[id];
                  const isSelected = selectedId === id;
                  
                  let isValid = true;
                  if (id.startsWith('UPGRADE_')) {
                      const type = id.replace('UPGRADE_', '') as UnitType;
                      if (upgrades.includes(type)) isValid = false;
                  } else if (id === 'GREED') {
                      if ((rewardsHistory['GREED'] || 0) >= 1) isValid = false;
                  } else if (id === 'EXPAND') {
                      if ((rewardsHistory['EXPAND'] || 0) >= 2) isValid = false;
                  }
                  
                  if (!def) return null;

                  return (
                    <button
                      key={id}
                      onClick={() => isValid && setSelectedId(id)}
                      disabled={!isValid}
                      className={`
                        flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 aspect-square relative
                        ${!isValid ? 'opacity-30 grayscale cursor-not-allowed border-slate-800 bg-slate-950' : 
                          isSelected 
                          ? 'bg-gradient-to-br from-yellow-900/40 to-slate-900 border-yellow-400 scale-105 z-10 shadow-lg' 
                          : 'bg-slate-800 border-slate-600 hover:border-slate-500 hover:bg-slate-700'
                        }
                      `}
                    >
                      {!isValid && (
                          <div className="absolute inset-0 flex items-center justify-center z-20 transform -rotate-12 pointer-events-none">
                              <span className="text-red-500 font-black text-lg border-2 border-red-500 px-1 bg-black/50">SOLD</span>
                          </div>
                      )}
                      
                      <div className={`p-2 rounded-full mb-2 ${isSelected ? 'bg-yellow-500 text-black' : 'bg-slate-900 text-slate-400'}`}>
                        <def.icon size={28} strokeWidth={2} />
                      </div>
                      <span className={`font-bold text-[9px] uppercase text-center leading-tight ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {def.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* DETAILS & CONFIRM */}
              <div className={`w-full transition-all duration-300 overflow-hidden ${selectedReward ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                {selectedReward && (
                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-center">
                        <h3 className="text-sm font-bold text-white mb-1">{selectedReward.label}</h3>
                        <p className="text-xs text-slate-400 mb-3">{selectedReward.desc}</p>
                        <button 
                            onClick={handleConfirm}
                            className="w-full py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <CheckCircle size={16} />
                            CONFIRM
                        </button>
                    </div>
                )}
              </div>
          </div>
      </div>
      
      <style>{`
        @keyframes slide-in-right {
            0% { transform: translateX(100vw); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
            animation: slide-in-right 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
};
