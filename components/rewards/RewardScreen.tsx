import React, { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight, Diamond, Crown } from 'lucide-react';
import { UnitType, Rarity } from '../../types';
import { MAX_PER_UNIT_COUNT, SCORING } from '../../constants';
import { UnitIcon } from '../units/UnitIcon';
import { RARITY_COLORS, REWARD_DEFINITIONS } from './rewardConfig';
import { calculateTransactionCost } from './rewardUtils';

interface RewardScreenProps {
  rewardIds: string[];
  onSelect: (rewardIds: string[]) => void;
  freeSelections: number; // Renamed from selectionsLeft
  currentGems: number;
  upgrades: UnitType[];
  rewardsHistory: Record<string, number>;
  survivors: UnitType[];
  roster: UnitType[]; 
  currentLevel: number;
}

export const RewardScreen: React.FC<RewardScreenProps> = ({ 
    rewardIds, onSelect, freeSelections, currentGems, upgrades, rewardsHistory, survivors, roster, currentLevel 
}) => {
  // Change state to track INDICES instead of IDs to handle duplicate rewards independently
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [exiting, setExiting] = useState(false);

  // --- Gem Animation State ---
  const winBonus = SCORING.GEM_WIN_BONUS;
  const startGems = Math.max(0, currentGems - winBonus);
  const [displayGems, setDisplayGems] = useState(startGems);
  const [showGemBonus, setShowGemBonus] = useState(false);

  useEffect(() => {
      const timer1 = setTimeout(() => {
          setShowGemBonus(true);
      }, 500);

      const timer2 = setTimeout(() => {
          setDisplayGems(currentGems);
          setShowGemBonus(false);
      }, 2000);

      return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [currentGems]);

  // Calculate dynamic army limit
  const limitBreakCount = rewardsHistory['LIMIT_BREAK'] || 0;
  const currentPerUnitLimit = MAX_PER_UNIT_COUNT + limitBreakCount;

  // Count logic
  const survivorCounts = survivors.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  const rosterCounts = roster.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  const displayTypes = Object.keys(rosterCounts)
      .filter(type => !type.startsWith('COMMANDER'))
      .sort((a, b) => 0);

  // --- Transaction Logic ---
  
  // Helper to get IDs from indices
  const getSelectedIds = (indices: number[]) => indices.map(i => rewardIds[i]);

  const totalCost = calculateTransactionCost(getSelectedIds(selectedIndices), freeSelections);
  const canAfford = currentGems >= totalCost;
  
  const isAffordable = (indexToCheck: number) => {
      if (selectedIndices.includes(indexToCheck)) return true; // Already selected
      
      const nextIndices = [...selectedIndices, indexToCheck];
      const nextCost = calculateTransactionCost(getSelectedIds(nextIndices), freeSelections);
      return currentGems >= nextCost;
  };

  const toggleSelection = (index: number) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices(prev => prev.filter(i => i !== index));
    } else {
      setSelectedIndices(prev => [...prev, index]);
    }
  };

  const handleConfirm = () => {
    if (canAfford) {
      setExiting(true);
      setTimeout(() => {
          onSelect(getSelectedIds(selectedIndices));
      }, 400);
    }
  };

  const renderRarityIcons = (rarity: Rarity) => {
      const iconSize = 10;
      switch (rarity) {
          case Rarity.COMMON:
              return <Diamond size={iconSize} fill="currentColor" />;
          case Rarity.RARE:
              return <div className="flex gap-0.5"><Diamond size={iconSize} fill="currentColor" /><Diamond size={iconSize} fill="currentColor" /></div>;
          case Rarity.EPIC:
              return <div className="flex gap-0.5"><Diamond size={iconSize} fill="currentColor" /><Diamond size={iconSize} fill="currentColor" /><Diamond size={iconSize} fill="currentColor" /></div>;
          case Rarity.MYTHIC:
              return <Crown size={iconSize} fill="currentColor" />;
          default:
              return <Diamond size={iconSize} />;
      }
  };

  const selectedRewards = getSelectedIds(selectedIndices).map(id => REWARD_DEFINITIONS[id]).filter(Boolean);
  
  // Logic: "Lowest cost is free".
  // We need to find WHICH indices are free.
  // 1. Create objects { index, cost } for all selected items
  const selectionMeta = selectedIndices.map(i => ({
      index: i,
      cost: REWARD_DEFINITIONS[rewardIds[i]]?.cost || 0
  }));
  
  // 2. Sort by cost ascending
  selectionMeta.sort((a, b) => a.cost - b.cost);
  
  // 3. Take top N as free
  const freeIndices = selectionMeta.slice(0, freeSelections).map(s => s.index);
  
  const remainingFreePicks = Math.max(0, freeSelections - selectedIndices.length);

  return (
    <div className="absolute inset-0 z-[50000] flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-hidden">
      
      <div className={`
          w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col
          transition-transform duration-500 ease-in-out
          ${exiting ? '-translate-x-[120vw]' : 'animate-slide-in-right'}
      `}>
          
          {/* HEADER */}
          <div className="bg-slate-800 p-3 border-b border-slate-700">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-yellow-500 tracking-widest">LEVEL 1-{currentLevel} CLEAR</h2>
                
                {/* Animated Gem Counter */}
                <div className="relative flex items-center">
                    <div className={`flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border transition-colors duration-300 ${showGemBonus ? 'border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'border-slate-600'}`}>
                        <Diamond size={14} className="text-cyan-400 fill-cyan-400" />
                        <span className="font-mono font-bold text-cyan-300 min-w-[24px] text-right transition-all duration-300 relative">
                            {displayGems}
                            
                            {/* Floating Bonus Animation */}
                            {showGemBonus && (
                                <span className="absolute top-0 right-0 translate-x-full ml-1 text-xs font-bold text-cyan-300 animate-float-up-fade whitespace-nowrap">
                                    +{winBonus}
                                </span>
                            )}
                        </span>
                    </div>
                </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="p-4 flex flex-col items-center">
              <div className="flex flex-wrap justify-center gap-3 w-full mb-4">
                {rewardIds.map((id, index) => {
                  const def = REWARD_DEFINITIONS[id];
                  if (!def) return null;

                  const isSelected = selectedIndices.includes(index);
                  const rarityStyle = RARITY_COLORS[def.rarity];
                  
                  // Determine logic validity
                  let isValidLogic = true;
                  if (id.startsWith('UPGRADE_')) {
                      const type = id.replace('UPGRADE_', '') as UnitType;
                      if (upgrades.includes(type)) isValidLogic = false;
                  } else if (id === 'GREED') {
                      if ((rewardsHistory['GREED'] || 0) >= 2) isValidLogic = false;
                  } else if (id === 'EXPAND') {
                      if ((rewardsHistory['EXPAND'] || 0) >= 2) isValidLogic = false;
                  }
                  
                  const affordable = isAffordable(index);
                  const isDisabled = !isValidLogic || (!isSelected && !affordable);
                  
                  // Determine Cost Display
                  const isFreePick = isSelected && freeIndices.includes(index);
                  
                  return (
                    <button
                      key={`${id}-${index}`}
                      onClick={() => !isDisabled && toggleSelection(index)}
                      disabled={isDisabled}
                      className={`
                        w-[30%] flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-200 aspect-square relative group
                        ${!isValidLogic 
                            ? 'opacity-30 grayscale cursor-not-allowed border-slate-800 bg-slate-950' 
                            : isSelected 
                                ? 'bg-gradient-to-br from-slate-800 to-slate-900 scale-105 z-10 shadow-lg ' + rarityStyle.replace('text-', 'border-')
                                : isDisabled
                                    ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'
                                    : `bg-slate-800 border-slate-600 hover:bg-slate-700 hover:border-slate-500`
                        }
                      `}
                    >
                      {/* Rarity Indicator (Icons) */}
                      <div className={`absolute top-1.5 right-1.5 flex gap-0.5 ${rarityStyle}`}>
                          {renderRarityIcons(def.rarity)}
                      </div>

                      {/* Icon */}
                      <div className={`p-1.5 rounded-full mb-1 mt-2 ${isSelected ? rarityStyle.replace('border-', 'bg-').replace('text-', 'text-black ') : 'bg-slate-900 ' + rarityStyle}`}>
                        <def.icon size={24} strokeWidth={2} />
                      </div>
                      
                      {/* Label */}
                      <span className={`font-bold text-[9px] uppercase text-center leading-tight mb-1 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {def.label}
                      </span>
                      
                      {/* COST Badge */}
                      <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 
                          ${isSelected 
                                ? (isFreePick ? 'bg-green-500 text-black' : 'bg-cyan-900 text-cyan-200 border border-cyan-700')
                                : 'bg-black/40 text-slate-400'
                           }
                      `}>
                          {isSelected && isFreePick ? (
                              <span>FREE</span>
                          ) : (
                              <>
                                <Diamond size={8} className={isSelected ? "fill-cyan-200" : "fill-slate-400"} />
                                {def.cost}
                              </>
                          )}
                      </div>

                    </button>
                  );
                })}
              </div>

              {/* FOOTER: Total & Confirm */}
              <div className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3">
                    <div className="flex justify-between items-end mb-3 text-sm border-b border-slate-800 pb-2">
                        {/* Left Side: Army Restoration Bar */}
                        <div className="flex gap-1.5 flex-wrap max-w-[60%]">
                            {displayTypes.map((type) => {
                                const rawTotal = rosterCounts[type] || 0;
                                const effectiveTotal = Math.min(rawTotal, currentPerUnitLimit);
                                const survived = survivorCounts[type] || 0;
                                
                                const isRestoring = survived < effectiveTotal;
                                const isCulling = survived > effectiveTotal;
                                
                                return (
                                    <div key={type} className="flex flex-col items-center bg-slate-900/80 p-1 rounded border border-slate-700 w-10">
                                        <div className="w-4 h-4 mb-0.5">
                                             <UnitIcon type={type as UnitType} isUpgraded={upgrades.includes(type as UnitType)} />
                                        </div>
                                        <div className="flex items-center justify-center gap-0.5 text-[9px] font-mono font-bold w-full leading-none">
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
                                                <span className="text-slate-200">{effectiveTotal}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Right Side: Stats */}
                        <div className="flex flex-col items-end gap-1 pl-2">
                            {/* Free Picks Row */}
                            <div className="flex items-center gap-3">
                                <span className="text-slate-500 font-bold text-[10px] uppercase">Free Picks</span>
                                <span className={`font-black text-lg leading-none ${remainingFreePicks > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                                    {remainingFreePicks}
                                </span>
                            </div>

                            {/* Cost Row */}
                            <div className="flex items-center gap-3">
                                <span className="text-slate-500 font-bold text-[10px] uppercase">Cost</span>
                                <div className={`flex items-center gap-1.5 font-black text-lg leading-none ${canAfford ? 'text-cyan-300' : 'text-red-500'}`}>
                                    <Diamond size={16} className={canAfford ? 'fill-cyan-300' : 'fill-red-500'} />
                                    <span>{totalCost}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {selectedRewards.length > 0 && (
                         <div className="space-y-1 mb-3">
                            {selectedRewards.map((reward, i) => (
                                <div key={`${reward.id}-${i}`} className="flex items-start gap-2 text-xs">
                                    <span className={`font-bold shrink-0 ${RARITY_COLORS[reward.rarity]}`}>• {reward.label}:</span>
                                    <span className="text-slate-400 text-[10px]">{reward.desc}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <button 
                        onClick={handleConfirm}
                        disabled={!canAfford}
                        className={`w-full py-3 font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all
                            ${canAfford 
                                ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black active:scale-95' 
                                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'}
                        `}
                    >
                        {canAfford ? (
                             <><CheckCircle size={18} /> CONFIRM</>
                        ) : (
                             `NEED ${totalCost - currentGems} MORE GEMS`
                        )}
                    </button>
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
        @keyframes float-up-fade {
            0% { transform: translateY(100%); opacity: 0; }
            20% { opacity: 1; }
            100% { transform: translateY(-150%); opacity: 0; }
        }
        .animate-float-up-fade {
            animation: float-up-fade 1.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};