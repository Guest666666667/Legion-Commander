
import React, { useState } from 'react';
import { COMMANDERS } from '../constants';
import { CommanderType, UnitType } from '../types';
import { Zap } from 'lucide-react';
import { UnitIcon } from './UnitIcon';

interface StartScreenProps {
  onStart: (commanderType: CommanderType) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const [selectedId, setSelectedId] = useState<CommanderType | null>(null);

  const selectedCommander = selectedId ? COMMANDERS[selectedId] : null;

  // Layout logic: 3x3 Grid.
  // Slots: 0,1,2,3,4,5,6,7,8
  // 4 (Center) = Centurion
  // 0, 2, 6, 8 (Corners) = Others
  const gridSlots: (CommanderType | null)[] = Array(9).fill(null);
  
  const corners = [0, 2, 6, 8];
  let cornerIdx = 0;

  Object.values(COMMANDERS).forEach(cmd => {
      if (cmd.id === CommanderType.CENTURION) {
          gridSlots[4] = cmd.id;
      } else {
          if (cornerIdx < corners.length) {
              gridSlots[corners[cornerIdx]] = cmd.id;
              cornerIdx++;
          }
      }
  });

  return (
    <div className="h-full w-full flex flex-col items-center bg-slate-900 p-6 text-center relative overflow-hidden">
      {/* Title */}
      <div className="mt-4 mb-4">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600 mb-2">
            LEGION
        </h1>
        <h2 className="text-2xl font-bold text-white tracking-widest">COMMANDER</h2>
      </div>

      {/* Commander Selection Grid */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-md mb-6">
        {gridSlots.map((cmdId, idx) => {
            if (!cmdId) {
                return <div key={idx} className="w-full aspect-square"></div>; // Empty slot
            }
            
            const cmd = COMMANDERS[cmdId];
            const isSelected = selectedId === cmd.id;
            
            return (
                <button
                    key={cmd.id}
                    onClick={() => setSelectedId(cmd.id)}
                    className={`
                        flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-300 relative overflow-hidden aspect-square
                        ${isSelected ? 'border-yellow-500 bg-slate-800 scale-110 shadow-[0_0_20px_rgba(234,179,8,0.3)] z-10' : 'border-slate-700 bg-slate-800/50 grayscale hover:grayscale-0'}
                    `}
                >
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="w-10 h-10 mb-2 rounded-lg overflow-hidden shadow-md">
                            <UnitIcon type={UnitType.COMMANDER} subtype={cmd.id} size={24} />
                        </div>
                        <h3 className={`font-bold text-[10px] uppercase leading-none ${isSelected ? 'text-white' : 'text-slate-400'}`}>{cmd.name.split(' ')[1] || cmd.name}</h3>
                    </div>
                </button>
            );
        })}
      </div>

      {/* Details Panel (Fixed Height) */}
      <div className="w-full max-w-md h-36 bg-slate-800/80 rounded-lg p-4 border border-slate-700 mb-4 flex flex-col justify-center transition-all">
        {selectedCommander ? (
            <div className="animate-fade-in">
                <h3 className="text-lg font-bold text-yellow-500 mb-1">{selectedCommander.name}</h3>
                <p className="text-xs text-slate-300 mb-3 italic">"{selectedCommander.description}"</p>
                <div className="flex items-center gap-2 text-white bg-slate-900/50 p-2 rounded border border-slate-600">
                    <Zap size={16} className="shrink-0 text-yellow-400" />
                    <div className="text-left">
                        <span className="text-xs font-bold block uppercase text-yellow-400">Skill: {selectedCommander.skillName}</span>
                        <span className="text-[10px] text-slate-300 leading-tight block">{selectedCommander.skillDesc}</span>
                    </div>
                </div>
            </div>
        ) : (
            <p className="text-slate-500 text-sm">Select a Commander to view details.</p>
        )}
      </div>

      {/* Start Button */}
      {selectedId && (
          <button 
            onClick={() => onStart(selectedId)}
            className="w-full max-w-xs py-4 bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-500 hover:to-red-500 text-white font-bold text-xl rounded-full shadow-lg animate-bounce border border-yellow-400/30"
          >
            START CAMPAIGN
          </button>
      )}

    </div>
  );
};
