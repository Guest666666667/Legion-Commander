
import React from 'react';
import { GameState } from '../../types';
import { Flag, Skull, Swords } from 'lucide-react';

interface MapZoneProps {
  gameState: GameState;
}

export const MapZone: React.FC<MapZoneProps> = ({ gameState }) => {
  const levels = Array.from({ length: gameState.maxLevels }, (_, i) => i + 1);

  return (
    <div className="h-full w-full bg-slate-800 border-b-4 border-slate-900 relative overflow-hidden flex flex-col items-center justify-center p-4">
      
      <div className="flex items-center justify-between w-full max-w-md px-4 relative z-10">
        <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-600 -z-10 transform -translate-y-1/2"></div>
        
        {levels.map((lvl) => {
          const isCurrent = lvl === gameState.currentLevel;
          const isCompleted = lvl < gameState.currentLevel;
          const isFinal = lvl === gameState.maxLevels;
          const isMiniBoss = lvl === 4;

          let bgClass = "bg-slate-700 border-slate-500";
          if (isCompleted) bgClass = "bg-green-600 border-green-400";
          if (isCurrent) bgClass = "bg-yellow-500 border-yellow-300 scale-125";
          if (isCurrent && isFinal) bgClass = "bg-red-600 border-red-400 scale-125";
          if (isCurrent && isMiniBoss) bgClass = "bg-orange-500 border-orange-300 scale-125";

          let sizeClass = "w-8 h-8";
          if (isFinal) sizeClass = "w-12 h-12 border-4 border-red-900 bg-red-800";
          else if (isMiniBoss) sizeClass = "w-10 h-10 border-3 border-orange-900 bg-orange-900/50";

          return (
            <div key={lvl} className={`flex flex-col items-center gap-1`}>
              <div className={`${sizeClass} rounded-full border-2 flex items-center justify-center transition-all shadow-lg ${bgClass}`}>
                {isFinal ? (
                   <Skull size={isFinal ? 20 : 14} className={isCurrent ? "text-black" : "text-gray-300"} />
                ) : isMiniBoss ? (
                   <Swords size={16} className={isCurrent ? "text-black" : "text-orange-400"} />
                ) : isCompleted ? (
                   <Flag size={14} className="text-white" />
                ) : (
                   <span className={`text-xs font-bold ${isCurrent ? "text-black" : "text-gray-400"}`}>{lvl}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
    </div>
  );
};
