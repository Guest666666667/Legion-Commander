
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, GridItem, UnitType, CommanderType } from '../types';
import { UnitIcon } from './UnitIcon';
import { RefreshCw, Lock, Unlock } from 'lucide-react';

interface PuzzleGridProps {
  gameState: GameState;
  onSummon: (units: UnitType[]) => void;
  onMatch: (count: number) => void;
  onBattleStart: (finalGrid: GridItem[]) => void;
  onReshufflePay: (cost: number) => void;
  isLocked?: boolean;
}

export const PuzzleGrid: React.FC<PuzzleGridProps> = ({ gameState, onSummon, onMatch, onBattleStart, onReshufflePay, isLocked = false }) => {
  const [grid, setGrid] = useState<GridItem[]>([]);
  const [steps, setSteps] = useState(gameState.stepsRemaining);
  const [animating, setAnimating] = useState(false);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [showReshuffleModal, setShowReshuffleModal] = useState(false);
  const [strategyLocked, setStrategyLocked] = useState(false); // Strategy Mode

  useEffect(() => {
    setSteps(gameState.stepsRemaining);
  }, [gameState.stepsRemaining]);

  // --- Initialization ---
  const initGrid = useCallback(() => {
    if (isLocked) return; 

    const n = gameState.gridSize;
    const totalCells = n * n;
    
    const obstacleCount = n - 1;
    const soldierTypesCount = n - 1; 
    const commanderCount = 1;
    const soldierTotalCount = totalCells - obstacleCount - commanderCount;
    const countPerSoldier = Math.floor(soldierTotalCount / soldierTypesCount);
    
    const items: GridItem[] = [];
    let idCounter = 0;

    // Add Commander
    items.push({ id: `gen-${idCounter++}`, type: UnitType.COMMANDER, row: 0, col: 0 });

    // Add Obstacles
    for (let i = 0; i < obstacleCount; i++) {
      items.push({ id: `gen-${idCounter++}`, type: UnitType.OBSTACLE, row: 0, col: 0 });
    }

    // Add Soldiers
    const availableTypes = [UnitType.INFANTRY, UnitType.ARCHER, UnitType.SHIELD, UnitType.SPEAR];
    const currentTypes = availableTypes.slice(0, soldierTypesCount);

    currentTypes.forEach(type => {
      for (let i = 0; i < countPerSoldier; i++) {
        items.push({ id: `gen-${idCounter++}`, type: type, row: 0, col: 0 });
      }
    });

    while(items.length < totalCells) {
       items.push({ id: `gen-${idCounter++}`, type: currentTypes[0], row: 0, col: 0 });
    }

    // Shuffle
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    // Assign coords
    items.forEach((item, index) => {
      item.row = Math.floor(index / n);
      item.col = index % n;
    });

    setGrid(items);
    setMatchedIds(new Set());
  }, [gameState.gridSize, isLocked]);

  useEffect(() => {
    if (!isLocked && grid.length === 0) {
       initGrid();
    } else if (!isLocked && grid.length !== gameState.gridSize * gameState.gridSize) {
       initGrid(); 
    }
  }, [initGrid, isLocked, grid.length, gameState.gridSize]);


  // --- Helper Logic ---

  const isSoldier = (t: UnitType) => [UnitType.INFANTRY, UnitType.ARCHER, UnitType.SHIELD, UnitType.SPEAR].includes(t);

  const getCommander = () => grid.find(g => g.type === UnitType.COMMANDER);

  const shuffleSoldiers = (currentGrid: GridItem[], forceAll = false): GridItem[] => {
    const includeObstacles = forceAll || gameState.scavengerLevel > 0;
    const movableItems = currentGrid.filter(item => 
        isSoldier(item.type) || (includeObstacles && item.type === UnitType.OBSTACLE)
    );
    const movableSlots = movableItems.map(s => ({ row: s.row, col: s.col }));
    
    for (let i = movableSlots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [movableSlots[i], movableSlots[j]] = [movableSlots[j], movableSlots[i]];
    }

    const newGrid = [...currentGrid];
    movableItems.forEach((item, index) => {
       const slot = movableSlots[index];
       const gridIdx = newGrid.findIndex(g => g.id === item.id);
       if (gridIdx !== -1) {
         newGrid[gridIdx] = { ...newGrid[gridIdx], row: slot.row, col: slot.col };
       }
    });
    return newGrid;
  };

  const RESHUFFLE_COST = 3;
  const canAffordReshuffle = steps >= RESHUFFLE_COST;

  const clickReshuffleBtn = () => {
      if (isLocked || animating) return;
      if (!canAffordReshuffle) return; 
      setShowReshuffleModal(true);
  }

  const confirmReshuffle = () => {
      // Check against local steps to ensure validity
      if (steps < RESHUFFLE_COST) return;

      // Perform Reset
      const newGrid = shuffleSoldiers(grid, true); 
      setGrid(newGrid);
      
      // Update local steps immediately
      const newSteps = steps - RESHUFFLE_COST;
      setSteps(newSteps);

      // Notify parent (mostly for stats, steps logic is handled locally here)
      onReshufflePay(RESHUFFLE_COST);
      setShowReshuffleModal(false);
      
      // Logic check: if steps become 0 here, it will end phase after timeout.
      setTimeout(() => {
         processMatchesAndShuffle(newGrid, newSteps);
      }, 300);
  };

  const handleCellClick = (clickedItem: GridItem) => {
    if (animating || steps <= 0 || isLocked) return;

    const commander = getCommander();
    if (!commander) return;
    if (clickedItem.id === commander.id) return;

    const dr = Math.abs(clickedItem.row - commander.row);
    const dc = Math.abs(clickedItem.col - commander.col);
    const dist = dr + dc;
    const range = gameState.commanderMoveRange || 1;
    
    const isValidMove = (dist > 0 && dist <= range);

    if (isValidMove) {
      performSwap(commander, clickedItem);
    }
  };

  // --- Keyboard Controls ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (animating || steps <= 0 || isLocked) return;
      
      const commander = getCommander();
      if (!commander) return;

      let targetRow = commander.row;
      let targetCol = commander.col;

      if (e.key === 'ArrowUp') targetRow -= 1;
      else if (e.key === 'ArrowDown') targetRow += 1;
      else if (e.key === 'ArrowLeft') targetCol -= 1;
      else if (e.key === 'ArrowRight') targetCol += 1;
      else return; 

      const targetItem = grid.find(g => g.row === targetRow && g.col === targetCol);
      
      if (targetItem) {
        performSwap(commander, targetItem);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [grid, animating, steps, isLocked, strategyLocked]);


  const performSwap = (commander: GridItem, target: GridItem) => {
    setAnimating(true);
    
    const swappedGrid = grid.map(item => {
      if (item.id === commander.id) return { ...item, row: target.row, col: target.col };
      if (item.id === target.id) return { ...item, row: commander.row, col: commander.col };
      return item;
    });
    
    setGrid(swappedGrid);
    const nextSteps = steps - 1;
    setSteps(nextSteps);

    if (strategyLocked) {
        // Strategy Mode: Move, consume step, but DO NOT check matches
        setTimeout(() => {
            setAnimating(false);
            checkPhaseEnd(swappedGrid, nextSteps);
        }, 250);
    } else {
        // Normal Mode: Move -> Check Matches
        setTimeout(() => {
            processMatchesAndShuffle(swappedGrid, nextSteps);
        }, 300);
    }
  };

  const processMatchesAndShuffle = (currentGrid: GridItem[], currentSteps: number) => {
      const { matches, types, obstacleSummons } = getMatches(currentGrid);

      if (obstacleSummons.length > 0) {
          onSummon(obstacleSummons);
      }

      if (matches.size > 0) {
        setMatchedIds(matches);
        onSummon(types); // 'types' can contain multiple entries (e.g., 2 Infantry) if multiple lines matched

        setTimeout(() => {
          setMatchedIds(new Set()); 
          const shuffledGrid = shuffleSoldiers(currentGrid);
          setGrid(shuffledGrid);
          setTimeout(() => {
             processMatchesAndShuffle(shuffledGrid, currentSteps);
          }, 400);
        }, 800); 
      } else {
        setAnimating(false);
        checkPhaseEnd(currentGrid, currentSteps);
      }
  };

  const checkPhaseEnd = (currentGrid: GridItem[], currentSteps: number) => {
    if (currentSteps <= 0) {
       setTimeout(() => handlePhaseEnd(currentGrid), 500);
    }
  };

  const getMatches = (currentGrid: GridItem[]) => {
    const n = gameState.gridSize;
    const matrix: (GridItem | null)[][] = Array(n).fill(null).map(() => Array(n).fill(null));
    currentGrid.forEach(item => matrix[item.row][item.col] = item);

    const matchedIds = new Set<string>();
    const typesToSummon: UnitType[] = [];
    const obstacleSummons: UnitType[] = [];

    const checkLine = (items: (GridItem | null)[]) => {
       let matchBuffer: GridItem[] = [];
       for (let i = 0; i < items.length; i++) {
         const curr = items[i];
         if (curr && (matchBuffer.length === 0 || curr.type === matchBuffer[0].type)) {
           matchBuffer.push(curr);
         } else {
           processBuffer(matchBuffer);
           matchBuffer = curr ? [curr] : [];
         }
       }
       processBuffer(matchBuffer);
    };

    const processBuffer = (buffer: GridItem[]) => {
        if (buffer.length >= 3) {
            const type = buffer[0].type;
            
            if (type === UnitType.OBSTACLE && gameState.scavengerLevel === 0) {
                return;
            }
            
            // Report the match for scoring
            if (isSoldier(type) || type === UnitType.OBSTACLE) {
                onMatch(buffer.length);
            }

            buffer.forEach(m => matchedIds.add(m.id));

            if (isSoldier(type)) {
                let count = 1;
                if (buffer.length === 4) count = 2;
                if (buffer.length >= 5) count = 4;
                for (let k = 0; k < count; k++) typesToSummon.push(type);
            }
            if (type === UnitType.OBSTACLE && gameState.scavengerLevel > 0) {
                const availableSoldiers = [UnitType.INFANTRY, UnitType.ARCHER, UnitType.SHIELD, UnitType.SPEAR];
                for(let k=0; k < gameState.scavengerLevel; k++) {
                    const rand = availableSoldiers[Math.floor(Math.random() * availableSoldiers.length)];
                    obstacleSummons.push(rand);
                }
            }
        }
    };

    // 1. Rows
    for (let r = 0; r < n; r++) checkLine(matrix[r]);

    // 2. Columns
    for (let c = 0; c < n; c++) checkLine(matrix.map(row => row[c]));
    
    // 3. All Diagonals (TL to BR) -> k = row - col
    for (let k = -(n - 1); k <= (n - 1); k++) {
        const diag: GridItem[] = [];
        for (let r = 0; r < n; r++) {
            const c = r - k;
            if (c >= 0 && c < n) {
                const item = matrix[r][c];
                if (item) diag.push(item);
            }
        }
        if (diag.length >= 3) checkLine(diag);
    }

    // 4. All Anti-Diagonals (TR to BL) -> k = row + col
    for (let k = 0; k <= 2 * (n - 1); k++) {
        const diag: GridItem[] = [];
        for (let r = 0; r < n; r++) {
            const c = k - r;
            if (c >= 0 && c < n) {
                const item = matrix[r][c];
                if (item) diag.push(item);
            }
        }
        if (diag.length >= 3) checkLine(diag);
    }

    return { matches: matchedIds, types: typesToSummon, obstacleSummons };
  };

  const handlePhaseEnd = (finalGrid: GridItem[]) => {
    const commander = finalGrid.find(c => c.type === UnitType.COMMANDER);
    let skillSummons: UnitType[] = [];

    if (commander && gameState.commanderType === CommanderType.CENTURION) {
        const neighbors: UnitType[] = [];
        finalGrid.forEach(item => {
            if (isSoldier(item.type)) {
                const dr = Math.abs(item.row - commander.row);
                const dc = Math.abs(item.col - commander.col);
                if (dr + dc === 1) {
                    neighbors.push(item.type);
                }
            }
        });

        if (neighbors.length > 0) {
            const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
            skillSummons.push(randomNeighbor);
        }
    }

    if (skillSummons.length > 0) {
      onSummon(skillSummons);
    }
    
    setTimeout(() => {
      onBattleStart(finalGrid);
    }, 500);
  };

  const cellSize = gameState.gridSize === 3 ? 'w-20 h-20' : gameState.gridSize === 4 ? 'w-16 h-16' : 'w-14 h-14';
  const sortedGrid = [...grid].sort((a, b) => {
     if (a.row !== b.row) return a.row - b.row;
     return a.col - b.col;
  });
  const commander = getCommander();
  
  return (
    <div className={`h-full w-full bg-gray-800 flex flex-col items-center p-2 relative transition-all duration-1000 ${isLocked ? 'grayscale brightness-50 pointer-events-none' : ''}`}>
      {!isLocked && (
        <div className="absolute -top-6 bg-gray-900 px-4 py-1 rounded-t-xl border-t border-l border-r border-gray-600 text-yellow-400 font-bold text-sm z-20 flex gap-4">
          <span>STEPS: {steps}</span>
        </div>
      )}
      
      {!isLocked && (
        <button
            onClick={() => setStrategyLocked(!strategyLocked)}
            className={`
                absolute bottom-4 left-4 w-14 h-14 rounded-full shadow-lg flex flex-col items-center justify-center z-30 border-2 transition-all
                ${strategyLocked ? 'bg-red-900 border-red-500 text-white' : 'bg-slate-700 border-slate-500 text-slate-300 hover:bg-slate-600'}
            `}
        >
            {strategyLocked ? <Lock size={20} className="mb-0.5 text-red-200" /> : <Unlock size={20} className="mb-0.5" />}
            <span className="text-[9px] font-mono leading-none">{strategyLocked ? 'LOCKED' : 'UNLOCK'}</span>
        </button>
      )}

      {!isLocked && (
          <button 
            onClick={clickReshuffleBtn}
            disabled={!canAffordReshuffle}
            className={`
                absolute bottom-4 right-4 w-14 h-14 rounded-full shadow-lg flex flex-col items-center justify-center z-30 border-2 transition-all
                ${!canAffordReshuffle ? 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed' : 'bg-yellow-700 border-yellow-400 text-white hover:scale-110'}
            `}
          >
            <RefreshCw size={18} className="mb-0.5" />
            <span className="text-[9px] font-mono leading-none">-3 STP</span>
          </button>
      )}

      {showReshuffleModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
              <div className="bg-slate-800 border-2 border-slate-600 rounded-xl p-6 shadow-2xl w-full max-w-xs flex flex-col items-center text-center">
                  <h3 className="text-xl font-bold text-white mb-2">RESHUFFLE?</h3>
                  <p className="text-slate-400 text-sm mb-4">
                      This will rearrange the board but consume steps.
                  </p>
                  
                  <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-700 mb-6">
                      <span className="text-slate-400 text-sm">COST:</span>
                      <span className={`font-bold text-lg ${!canAffordReshuffle ? 'text-red-500' : 'text-yellow-400'}`}>
                          {RESHUFFLE_COST} STEPS
                      </span>
                  </div>

                  <div className="flex gap-3 w-full">
                      <button 
                        onClick={() => setShowReshuffleModal(false)}
                        className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold"
                      >
                        CANCEL
                      </button>
                      <button 
                        onClick={confirmReshuffle}
                        disabled={!canAffordReshuffle}
                        className={`
                            flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2
                            ${!canAffordReshuffle ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-500 text-white'}
                        `}
                      >
                        CONFIRM
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex-1 flex items-center justify-center">
         <div 
           className={`grid gap-2 p-2 rounded-lg shadow-inner border-2 transition-colors duration-300
              ${strategyLocked ? 'bg-red-950/30 border-red-900/50' : 'bg-gray-700 border-gray-600'}
           `}
           style={{ gridTemplateColumns: `repeat(${gameState.gridSize}, minmax(0, 1fr))` }}
         >
           {sortedGrid.map((item) => {
             const isCommander = item.type === UnitType.COMMANDER;
             const isMatched = matchedIds.has(item.id);
             const isUpgraded = gameState.upgrades.includes(item.type);
             let isValidTarget = false;
             
             if (commander && !isCommander && !animating && steps > 0 && !isLocked) {
                const dr = Math.abs(item.row - commander.row);
                const dc = Math.abs(item.col - commander.col);
                const range = gameState.commanderMoveRange || 1;
                const dist = dr + dc;
                isValidTarget = (dist > 0 && dist <= range);
             }

             return (
               <div
                 key={item.id}
                 onClick={() => handleCellClick(item)}
                 className={`
                   ${cellSize} rounded-md cursor-pointer transition-all duration-300 relative
                   ${isCommander ? 'ring-4 ring-yellow-500 z-10' : ''}
                   ${isMatched ? 'ring-2 ring-dashed ring-yellow-300 animate-bounce z-20' : ''}
                   hover:bg-white/5
                 `}
               >
                 <UnitIcon type={item.type} isUpgraded={isUpgraded} />
                 {isValidTarget && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="w-full h-full border-4 border-white/60 rounded-md animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.4)]"></div>
                    </div>
                 )}
               </div>
             );
           })}
         </div>
      </div>
      
    </div>
  );
};