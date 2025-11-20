
import React, { useState } from 'react';
import { COMMANDERS } from '../constants';
import { UnitType } from '../types';
import { Zap, Play } from 'lucide-react';
import { UnitIcon } from './UnitIcon';

interface StartScreenProps {
  onStart: (commanderType: UnitType) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  // Defined order for the carousel
  const COMMANDER_ORDER = [
    UnitType.COMMANDER_VANGUARD,
    UnitType.COMMANDER_ELF,
    UnitType.COMMANDER_CENTURION,
    UnitType.COMMANDER_WARLORD,
    UnitType.COMMANDER_GUARDIAN
  ];

  // Default to index 2 (Centurion)
  const [activeIndex, setActiveIndex] = useState(2);

  const handleCardClick = (index: number) => {
    setActiveIndex(index);
  };

  const selectedId = COMMANDER_ORDER[activeIndex];
  const selectedCommander = COMMANDERS[selectedId];

  return (
    <div className="h-full w-full flex flex-col items-center bg-slate-900 p-6 text-center relative overflow-hidden">
      {/* Title */}
      <div className="mt-8 mb-8 z-20">
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600 mb-0 leading-tight drop-shadow-2xl">
            BLOCK
        </h1>
        <h2 className="text-3xl font-bold text-white tracking-[0.2em] drop-shadow-md">COMMANDER</h2>
      </div>

      {/* Carousel Container */}
      <div className="relative w-full max-w-md h-64 flex items-center justify-center mb-8 perspective-1000">
        {COMMANDER_ORDER.map((cmdId, index) => {
          const cmd = COMMANDERS[cmdId];
          const offset = index - activeIndex;
          const isActive = index === activeIndex;
          
          // Visual calculation based on distance from center
          let transform = 'translateX(0) scale(0.8) opacity(0)';
          let zIndex = 0;
          let opacity = 0.5;
          
          if (offset === 0) {
            // Center
            transform = 'translateX(0) scale(1.1)';
            zIndex = 20;
            opacity = 1;
          } else if (Math.abs(offset) === 1) {
            // Immediate neighbors
            transform = `translateX(${offset * 120}px) scale(0.85) rotateY(${offset * -15}deg)`;
            zIndex = 10;
            opacity = 0.7;
          } else if (Math.abs(offset) >= 2) {
            // Outer cards
            // Cap movement so they don't fly off screen too far
            const dir = Math.sign(offset);
            transform = `translateX(${dir * 200}px) scale(0.7) rotateY(${dir * -30}deg)`;
            zIndex = 0;
            opacity = 0.3;
          }

          return (
            <div
              key={cmdId}
              onClick={() => handleCardClick(index)}
              className={`
                absolute w-32 h-40 rounded-xl border-2 transition-all duration-500 ease-out cursor-pointer shadow-2xl
                flex flex-col items-center justify-center
                ${isActive 
                    ? 'bg-slate-800 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)]' 
                    : 'bg-slate-900 border-slate-700 hover:border-slate-500 grayscale'
                }
              `}
              style={{
                transform,
                zIndex,
                opacity,
                // We hide items that are too far away if desired, but opacity handles it well
              }}
            >
                <div className="w-12 h-12 mb-3 rounded-lg overflow-hidden shadow-md">
                     <UnitIcon type={cmdId} size={32} />
                </div>
                <h3 className={`font-bold text-[10px] uppercase leading-none ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {cmd.shortName}
                </h3>
                {isActive && (
                    <div className="absolute -bottom-3 bg-yellow-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-full">
                        SELECTED
                    </div>
                )}
            </div>
          );
        })}
      </div>

      {/* Details Panel (Fixed Height) */}
      <div className="w-full max-w-md h-36 bg-slate-800/80 rounded-lg p-4 border border-slate-700 mb-6 flex flex-col justify-center transition-all relative overflow-hidden">
        {selectedCommander ? (
            <div className="animate-fade-in">
                <h3 className="text-xl font-black text-yellow-500 mb-1 uppercase">{selectedCommander.name}</h3>
                <p className="text-xs text-slate-300 mb-4 italic">"{selectedCommander.description}"</p>
                
                <div className="flex items-start gap-3 text-white bg-slate-900/50 p-3 rounded border border-slate-600">
                    <Zap size={18} className="shrink-0 text-yellow-400 mt-0.5" />
                    <div className="text-left">
                        <span className="text-xs font-bold block uppercase text-yellow-400 mb-0.5">{selectedCommander.skillName}</span>
                        <span className="text-[10px] text-slate-300 leading-tight block">{selectedCommander.skillDesc}</span>
                    </div>
                </div>
            </div>
        ) : null}
      </div>

      {/* Start Button */}
      <button 
        onClick={() => onStart(selectedId)}
        className="w-full max-w-xs py-4 bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-500 hover:to-red-500 text-white font-black text-xl tracking-wider rounded-full shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all border border-yellow-400/30"
      >
        <Play fill="currentColor" size={20} />
        START CAMPAIGN
      </button>

    </div>
  );
};
