
import React from 'react';
import { GameState, GridItem, UnitType } from '../types';
import { PuzzleControls, ReshuffleModal } from './puzzle/PuzzleUI';
import { PuzzleCell } from './puzzle/PuzzleCell';
import { usePuzzleLogic } from './puzzle/usePuzzleLogic';

interface PuzzleGridProps {
  gameState: GameState;
  onSummon: (units: UnitType[]) => void;
  onMatch: (count: number) => void;
  onBattleStart: (finalGrid: GridItem[]) => void;
  onReshufflePay: (cost: number) => void;
  isLocked?: boolean;
}

export const PuzzleGrid: React.FC<PuzzleGridProps> = ({ 
    gameState, onSummon, onMatch, onBattleStart, onReshufflePay, isLocked = false 
}) => {
    
  const {
      grid,
      steps,
      animating,
      matchedIds,
      strategyLocked,
      showReshuffleModal,
      canAffordReshuffle,
      setStrategyLocked,
      setShowReshuffleModal,
      handleCellClick,
      clickReshuffleBtn,
      confirmReshuffle,
      getCommander
  } = usePuzzleLogic({
      gameState,
      isLocked,
      onSummon,
      onMatch,
      onBattleStart,
      onReshufflePay
  });

  const RESHUFFLE_COST = 3;
  const cellSize = gameState.gridSize === 3 ? 'w-20 h-20' : gameState.gridSize === 4 ? 'w-16 h-16' : 'w-14 h-14';
  
  // Sort for rendering consistency (Top to Bottom, Left to Right)
  const sortedGrid = [...grid].sort((a, b) => {
     if (a.row !== b.row) return a.row - b.row;
     return a.col - b.col;
  });

  const commander = getCommander();

  return (
    <div className={`h-full w-full bg-gray-800 flex flex-col items-center p-2 relative transition-all duration-1000 ${isLocked ? 'grayscale brightness-50 pointer-events-none' : ''}`}>
      
      <style>{`
         @keyframes grow-in {
            0% { opacity: 0; transform: scale(0); }
            70% { transform: scale(1.15); }
            100% { opacity: 1; transform: scale(1); }
         }
         .animate-grow-in {
            animation: grow-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
         }
      `}</style>

      {/* Controls Overlay */}
      <PuzzleControls 
          steps={steps}
          isLocked={isLocked}
          strategyLocked={strategyLocked}
          canAffordReshuffle={canAffordReshuffle}
          setStrategyLocked={setStrategyLocked}
          onReshuffleClick={clickReshuffleBtn}
      />

      {/* Reshuffle Modal */}
      {showReshuffleModal && (
          <ReshuffleModal 
              cost={RESHUFFLE_COST}
              canAfford={canAffordReshuffle}
              onCancel={() => setShowReshuffleModal(false)}
              onConfirm={confirmReshuffle}
          />
      )}

      {/* The Grid */}
      <div className="flex-1 flex items-center justify-center">
         <div 
           className={`grid gap-2 p-2 rounded-lg shadow-inner border-2 transition-colors duration-300
              ${strategyLocked ? 'bg-red-950/30 border-red-900/50' : 'bg-gray-700 border-gray-600'}
           `}
           style={{ gridTemplateColumns: `repeat(${gameState.gridSize}, minmax(0, 1fr))` }}
         >
           {sortedGrid.map((item) => (
               <PuzzleCell 
                    key={item.id}
                    item={item}
                    commander={commander}
                    gameState={gameState}
                    animating={animating}
                    steps={steps}
                    isLocked={isLocked}
                    matchedIds={matchedIds}
                    cellSize={cellSize}
                    onCellClick={handleCellClick}
               />
           ))}
         </div>
      </div>
      
    </div>
  );
};
