
import React, { useState } from 'react';
import { CheckCircle, Info, ArrowRight } from 'lucide-react';
import { UnitType } from '../types';
import { REWARD_DEFINITIONS, MAX_PER_UNIT_COUNT } from '../constants';
import { UnitIcon } from './UnitIcon';

interface RewardScreenProps {
  rewardIds: string[];
  onSelect: (rewardIds: string[]) => void;
  selectionsLeft: number;
  upgrades: UnitType[];
  rewardsHistory: Record<string, number>;
  survivors: UnitType[];
  roster: UnitType[]; // Full army roster including those who died
}

export const RewardScreen: React.FC<RewardScreenProps> = ({ rewardIds, onSelect, selectionsLeft, upgrades, rewardsHistory, survivors, roster }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exiting, setExiting] = useState(false);

  // Calculate how many we can/must select. 
  const maxSelectable = Math.min(selectionsLeft, rewardIds.length);

  // Count logic
  const survivorCounts = survivors.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  const rosterCounts = roster.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  // Get all unique unit types present in the roster
  // FILTER OUT COMMANDERS from this view as requested
  const displayTypes = Object.keys(rosterCounts)
      .filter(type => !type.startsWith('COMMANDER'))
      .sort((a, b) => {
          // Standard sort (Infantry first etc if needed, or just alphabetical)
          return 0;
      });

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      // Deselect always allowed
      setSelectedIds(prev => prev.filter(sid => sid !== id));
    } else {
      if (maxSelectable === 1) {
          // If limit is 1, simple swap without needing to deselect first
          setSelectedIds([id]);
      } else if (selectedIds.length < maxSelectable) {
          // Multi-select mode: add if space available
          setSelectedIds(prev => [...prev, id]);
      }
    }
  };

  const handleConfirm = () => {
    if (selectedIds.length === maxSelectable) {
      setExiting(true);
      setTimeout(() => {
          onSelect(selectedIds);
      }, 400); // Match duration
    }
  };

  const selectedRewards = selectedIds.map(id => REWARD_DEFINITIONS[id]).filter(Boolean);
  const isReady = selectedIds.length === maxSelectable;

  return (
    <div className="absolute inset-0 z-[50000] flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-hidden">
      
      <div className={`
          w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col
          transition-transform duration-500 ease-in-out
          ${exiting ? '-translate-x-[120vw]' : 'animate-slide-in-right'}
      `}>
          
          {/* HEADER with Unit Restoration */}
          <div className="bg-slate-800 p-4 border-b border-slate-700 text-center">
            <h2 className="text-2xl font-black text-yellow-500 tracking-widest mb-3">VICTORY</h2>
            
            <div className="flex justify-center gap-2 mb-3 flex-wrap">
                {displayTypes.map((type) => {
                    const rawTotal = rosterCounts[type] || 0;
                    // VISUAL FIX: Clamp the total to the max allowed per unit.
                    const effectiveTotal = Math.min(rawTotal, MAX_PER_UNIT_COUNT);
                    
                    const survived = survivorCounts[type] || 0;
                    
                    // Logic for display states
                    const isRestoring = survived < effectiveTotal;
                    const isCulling = survived > effectiveTotal;
                    
                    return (
                        <div key={type} className="flex flex-col items-center bg-slate-900/80 p-1.5 rounded border border-slate-700 w-14">
                            <div className="w-6 h-6 mb-1">
                                 <UnitIcon type={type as UnitType} isUpgraded={upgrades.includes(type as UnitType)} />
                            </div>
                            <div className="flex items-center justify-center gap-0.5 text-[10px] font-mono font-bold w-full">
                                {isRestoring ? (
                                    <>
                                        <span className="text-red-400">{survived}</span>
                                        <ArrowRight size={8} className="text-slate-500" />
                                        <span className="text-green-400">{effectiveTotal}</span>
                                    </>
                                ) : isCulling ? (
                                    <>
                                        <span className="text-yellow-400">{survived}</span>
                                        <ArrowRight size={8} className="text-slate-500" />
                                        <span className="text-slate-300">{effectiveTotal}</span>
                                    </>
                                ) : (
                                    <span className="text-slate-200 text-xs">{effectiveTotal}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-slate-400 text-[10px] uppercase tracking-wide">
                Picks Remaining: <span className={`font-bold text-sm ml-1 ${selectedIds.length < maxSelectable ? 'text-yellow-400 animate-pulse' : 'text-green-500'}`}>
                  {Math.max(0, maxSelectable - selectedIds.length)}
                </span>
            </p>
          </div>

          {/* CONTENT */}
          <div className="p-4 flex flex-col items-center">
              <div className="grid grid-cols-3 gap-3 w-full mb-4">
                {rewardIds.map(id => {
                  const def = REWARD_DEFINITIONS[id];
                  const isSelected = selectedIds.includes(id);
                  
                  // Determine validity
                  let isValid = true;
                  if (id.startsWith('UPGRADE_')) {
                      const type = id.replace('UPGRADE_', '') as UnitType;
                      if (upgrades.includes(type)) isValid = false;
                  } else if (id === 'GREED') {
                      if ((rewardsHistory['GREED'] || 0) >= 1) isValid = false;
                  } else if (id === 'EXPAND') {
                      if ((rewardsHistory['EXPAND'] || 0) >= 2) isValid = false;
                  }

                  // If not selected, and we are at capacity, it appears disabled visually (or just distinct)
                  const atCapacity = selectedIds.length >= maxSelectable;
                  const canSelect = isValid && (isSelected || !atCapacity);
                  
                  if (!def) return null;

                  return (
                    <button
                      key={id}
                      onClick={() => isValid && toggleSelection(id)}
                      disabled={!isValid || (!isSelected && atCapacity && maxSelectable > 1)}
                      className={`
                        flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 aspect-square relative
                        ${!isValid 
                            ? 'opacity-30 grayscale cursor-not-allowed border-slate-800 bg-slate-950' 
                            : isSelected 
                                ? 'bg-gradient-to-br from-yellow-900/60 to-slate-900 border-yellow-400 scale-105 z-10 shadow-lg' 
                                : (atCapacity && maxSelectable > 1)
                                    ? 'bg-slate-800 border-slate-700 opacity-60 cursor-not-allowed'
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
                      
                      {/* Selection Order Badge */}
                      {isSelected && maxSelectable > 1 && (
                          <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                              {selectedIds.indexOf(id) + 1}
                          </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* DETAILS & CONFIRM */}
              <div className={`w-full transition-all duration-300 overflow-hidden ${selectedRewards.length > 0 ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                {selectedRewards.length > 0 && (
                    <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2 text-yellow-500 border-b border-slate-700 pb-1">
                           <Info size={14} />
                           <span className="text-xs font-bold uppercase">Selected Rewards</span>
                        </div>
                        
                        <div className="space-y-1 mb-3">
                            {selectedRewards.map((reward) => (
                                <div key={reward.id} className="flex items-start gap-2 text-xs">
                                    <span className="text-yellow-400 font-bold shrink-0">• {reward.label}:</span>
                                    <span className="text-slate-300">{reward.desc}</span>
                                </div>
                            ))}
                        </div>
                        
                        <button 
                            onClick={handleConfirm}
                            disabled={!isReady}
                            className={`w-full py-3 font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all
                                ${isReady 
                                    ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black active:scale-95' 
                                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'}
                            `}
                        >
                            <CheckCircle size={18} />
                            {isReady ? 'CONFIRM SELECTION' : `SELECT ${maxSelectable - selectedIds.length} MORE`}
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
