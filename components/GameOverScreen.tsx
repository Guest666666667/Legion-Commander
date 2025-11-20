
import React from 'react';
import { ScoreStats, UnitType } from '../types';
import { SCORING } from '../constants';
import { Trophy, Skull, RotateCcw, Swords, LayoutGrid, RefreshCw, Crosshair } from 'lucide-react';
import { UnitIcon } from './UnitIcon';

interface GameOverScreenProps {
  stats: ScoreStats;
  finalArmy: UnitType[];
  onRestart: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ stats, finalArmy, onRestart }) => {
  const armyCounts = finalArmy.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const killCounts = stats.kills || {};

  // --- Score Calculation ---
  let totalScore = 0;
  
  // 1. Victory Bonus
  const victoryScore = stats.won ? SCORING.VICTORY_BONUS : 0;
  totalScore += victoryScore;

  // 2. Match Scores
  const match3Score = stats.matches3 * SCORING.MATCH_3;
  const match4Score = stats.matches4 * SCORING.MATCH_4;
  const match5Score = stats.matches5 * SCORING.MATCH_5;
  totalScore += match3Score;
  totalScore += match4Score;
  totalScore += match5Score;

  // 3. Reshuffle Costs
  const reshuffleScore = stats.reshuffles * SCORING.RESHUFFLE_COST;
  totalScore += reshuffleScore;

  // 4. Survivor Scores
  let survivorScore = 0;
  Object.entries(armyCounts).forEach(([type, count]) => {
    const pts = SCORING.UNIT_SURVIVOR_BONUS[type] || 50;
    survivorScore += (count * pts);
  });
  totalScore += survivorScore;

  // 5. Kill Scores
  let killScore = 0;
  Object.entries(killCounts).forEach(([type, count]) => {
      const pts = SCORING.KILL_SCORE[type] || 50;
      killScore += (count * pts);
  });
  totalScore += killScore;

  const renderRow = (label: string, count: number, ptsPerUnit: number, icon?: React.ReactNode, isNegative = false) => {
    if (count === 0) return null;
    const total = count * ptsPerUnit;
    return (
      <div className="flex items-center justify-between py-1 border-b border-slate-800/50 text-sm">
        <div className="flex items-center gap-2 text-slate-300">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-slate-500 text-xs">x {count}</span>
           <span className={`font-mono font-bold w-16 text-right ${isNegative ? 'text-red-400' : 'text-yellow-400'}`}>
             {total > 0 && !isNegative ? '+' : ''}{total}
           </span>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-[60000] bg-slate-950 flex flex-col items-center justify-center p-6 animate-fade-in">
       <div className="w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
          
          {/* Header */}
          <div className={`p-6 text-center border-b-4 ${stats.won ? 'bg-yellow-900/20 border-yellow-500' : 'bg-red-900/20 border-red-600'}`}>
             <div className="mb-2 flex justify-center">
                {stats.won ? <Trophy size={64} className="text-yellow-500" /> : <Skull size={64} className="text-red-500" />}
             </div>
             <h1 className={`text-4xl font-black uppercase tracking-widest ${stats.won ? 'text-yellow-500' : 'text-red-500'}`}>
               {stats.won ? 'VICTORY' : 'DEFEAT'}
             </h1>
             <p className="text-slate-400 text-sm uppercase tracking-wide mt-1">Campaign Summary</p>
          </div>

          {/* Score Receipt */}
          <div className="p-6 bg-slate-900/80 backdrop-blur-sm flex-1 overflow-y-auto max-h-[50vh]">
              
              {/* Base Bonus */}
              {stats.won && (
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700">
                    <span className="font-bold text-yellow-200 uppercase">Campaign Complete</span>
                    <span className="font-mono font-bold text-yellow-400 text-lg">+{SCORING.VICTORY_BONUS}</span>
                </div>
              )}

              {/* Matches Section */}
              <div className="mb-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Tactical Merits</h3>
                  {renderRow("Triple Match", stats.matches3, SCORING.MATCH_3, <LayoutGrid size={14} />)}
                  {renderRow("Quad Match", stats.matches4, SCORING.MATCH_4, <LayoutGrid size={14} className="text-blue-400"/>)}
                  {renderRow("Penta Match", stats.matches5, SCORING.MATCH_5, <LayoutGrid size={14} className="text-purple-400"/>)}
                  {renderRow("Reshuffles", stats.reshuffles, SCORING.RESHUFFLE_COST, <RefreshCw size={14} />, true)}
              </div>

               {/* Kills Section */}
               {Object.keys(killCounts).length > 0 && (
                  <div className="mb-4">
                      <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Enemies Defeated</h3>
                      {Object.entries(killCounts).map(([type, count]) => (
                          renderRow(
                              type === UnitType.COMMANDER ? 'Enemy Commander' : type.replace('ENEMY_', ''), 
                              count, 
                              SCORING.KILL_SCORE[type] || 50,
                              <Crosshair size={14} className="text-red-400" />
                          )
                      ))}
                  </div>
              )}

              {/* Army Section */}
              {Object.keys(armyCounts).length > 0 && (
                  <div className="mb-4">
                      <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Survivors</h3>
                      {Object.entries(armyCounts).map(([type, count]) => (
                          renderRow(
                              type === UnitType.COMMANDER ? 'Commander' : type, 
                              count, 
                              SCORING.UNIT_SURVIVOR_BONUS[type] || 50,
                              <div className="w-4 h-4"><UnitIcon type={type as UnitType} size={16} /></div>
                          )
                      ))}
                  </div>
              )}

              {/* Total */}
              <div className="mt-4 pt-4 border-t-2 border-slate-600 flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-400">TOTAL SCORE</span>
                  <span className="text-3xl font-black text-white tracking-tighter">{totalScore}</span>
              </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-800 border-t border-slate-700">
              <button 
                onClick={onRestart}
                className="w-full py-4 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-black text-lg uppercase rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                  <RotateCcw size={24} />
                  Play Again
              </button>
          </div>
       </div>
    </div>
  );
};
