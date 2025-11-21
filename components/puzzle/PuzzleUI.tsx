
import React from 'react';
import { RefreshCw, Lock, Unlock } from 'lucide-react';

// --- CONTROLS (Side Buttons & Steps) ---

interface PuzzleControlsProps {
    steps: number;
    isLocked: boolean;
    strategyLocked: boolean;
    canAffordReshuffle: boolean;
    setStrategyLocked: (val: boolean) => void;
    onReshuffleClick: () => void;
}

export const PuzzleControls: React.FC<PuzzleControlsProps> = ({
    steps, isLocked, strategyLocked, canAffordReshuffle, setStrategyLocked, onReshuffleClick
}) => {
    if (isLocked) return null;

    return (
        <>
            <div className="absolute -top-6 bg-gray-900 px-4 py-1 rounded-t-xl border-t border-l border-r border-gray-600 text-yellow-400 font-bold text-sm z-20 flex gap-4">
                <span>STEPS: {steps}</span>
            </div>

            <div className="absolute left-2 top-1/2 -translate-y-1/2 z-30">
                <button
                    onClick={() => setStrategyLocked(!strategyLocked)}
                    className={`
                        w-12 h-12 rounded-full shadow-xl flex items-center justify-center border-2 transition-all
                        ${strategyLocked ? 'bg-red-900 border-red-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}
                    `}
                >
                    {strategyLocked ? <Lock size={20} className="text-red-200" /> : <Unlock size={20} />}
                </button>
            </div>

            <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30">
                <button 
                    onClick={onReshuffleClick}
                    disabled={!canAffordReshuffle}
                    className={`
                        w-12 h-12 rounded-full shadow-xl flex items-center justify-center border-2 transition-all
                        ${!canAffordReshuffle ? 'bg-slate-800 border-slate-600 opacity-50 cursor-not-allowed' : 'bg-yellow-700 border-yellow-400 text-white hover:bg-yellow-600'}
                    `}
                >
                    <RefreshCw size={20} />
                </button>
            </div>
        </>
    );
};

// --- RESHUFFLE CONFIRMATION MODAL ---

interface ReshuffleModalProps {
    cost: number;
    canAfford: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export const ReshuffleModal: React.FC<ReshuffleModalProps> = ({ cost, canAfford, onCancel, onConfirm }) => {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
            <div className="bg-slate-800 border-2 border-slate-600 rounded-xl p-6 shadow-2xl w-full max-w-xs flex flex-col items-center text-center">
                <h3 className="text-xl font-bold text-white mb-2">RESHUFFLE?</h3>
                <p className="text-slate-400 text-sm mb-4">
                    This will rearrange the board but consume steps.
                </p>
                
                <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-700 mb-6">
                    <span className="text-slate-400 text-sm">COST:</span>
                    <span className={`font-bold text-lg ${!canAfford ? 'text-red-500' : 'text-yellow-400'}`}>
                        {cost} STEPS
                    </span>
                </div>

                <div className="flex gap-3 w-full">
                    <button 
                        onClick={onCancel}
                        className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold"
                    >
                        CANCEL
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={!canAfford}
                        className={`
                            flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2
                            ${!canAfford ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-500 text-white'}
                        `}
                    >
                        CONFIRM
                    </button>
                </div>
            </div>
        </div>
    );
};
