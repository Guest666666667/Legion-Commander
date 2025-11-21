
import { useState, useEffect, useCallback } from 'react';
import { GameState, GridItem, UnitType } from '../../types';
import { generateInitialGrid, shuffleSoldiers, replaceMatchedItems, getMatches, isCommander, isSoldier } from './puzzleUtils';

const RESHUFFLE_COST = 3;

interface UsePuzzleLogicProps {
    gameState: GameState;
    isLocked: boolean;
    onSummon: (units: UnitType[]) => void;
    onMatch: (count: number) => void;
    onBattleStart: (finalGrid: GridItem[]) => void;
    onReshufflePay: (cost: number) => void;
}

export const usePuzzleLogic = ({ gameState, isLocked, onSummon, onMatch, onBattleStart, onReshufflePay }: UsePuzzleLogicProps) => {
    const [grid, setGrid] = useState<GridItem[]>([]);
    const [steps, setSteps] = useState(gameState.stepsRemaining);
    const [animating, setAnimating] = useState(false);
    const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
    const [showReshuffleModal, setShowReshuffleModal] = useState(false);
    const [strategyLocked, setStrategyLocked] = useState(false);

    // --- Initialization ---
    useEffect(() => {
        setSteps(gameState.stepsRemaining);
    }, [gameState.stepsRemaining]);

    const initGrid = useCallback(() => {
        if (isLocked) return;
        const newGrid = generateInitialGrid(gameState);
        setGrid(newGrid);
        setMatchedIds(new Set());
    }, [gameState.gridSize, gameState.remodelLevel, gameState.commanderUnitType, isLocked]);

    // Ensure grid is valid
    useEffect(() => {
        const n = gameState.gridSize;
        if (!isLocked) {
            if (grid.length === 0 || grid.length !== n * n) {
                initGrid();
            }
        }
    }, [initGrid, isLocked, grid.length, gameState.gridSize]);

    // --- Core Logic ---

    const getCommander = () => grid.find(g => isCommander(g.type));

    const checkPhaseEnd = (currentGrid: GridItem[], currentSteps: number) => {
        if (currentSteps <= 0) {
            setTimeout(() => handlePhaseEnd(currentGrid), 500);
        }
    };

    const handlePhaseEnd = (finalGrid: GridItem[]) => {
        const commander = finalGrid.find(c => isCommander(c.type));
        let skillSummons: UnitType[] = [];
    
        // REINFORCE Logic
        if (commander && gameState.rewardsHistory['REINFORCE']) {
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

    const processMatchesAndShuffle = (currentGrid: GridItem[], currentSteps: number) => {
        const { matches, types, obstacleSummons } = getMatches(currentGrid, gameState.gridSize, gameState.scavengerLevel);

        if (obstacleSummons.length > 0) {
            onSummon(obstacleSummons);
        }

        if (matches.size > 0) {
            if (types.length > 0 || matches.size >= 3) {
                // Only fire match callback if valid soldiers/obstacles matched (filter empty returns)
                onMatch(matches.size);
            }
            setMatchedIds(matches);
            onSummon(types);

            setTimeout(() => {
                setMatchedIds(new Set());
                
                // Replace Logic
                const nextGrid = replaceMatchedItems(currentGrid, matches, gameState);
                setGrid(nextGrid);
                
                // Recursive Cascade
                setTimeout(() => {
                    processMatchesAndShuffle(nextGrid, currentSteps);
                }, 400);
            }, 800);
        } else {
            setAnimating(false);
            checkPhaseEnd(currentGrid, currentSteps);
        }
    };

    const performSwap = (commander: GridItem, target: GridItem) => {
        setAnimating(true);
        
        const swappedGrid = grid.map(item => {
            // IMPORTANT: Clear isNew flag on interaction so animations don't replay on move
            const base = { ...item, isNew: false };
            
            if (item.id === commander.id) return { ...base, row: target.row, col: target.col };
            if (item.id === target.id) return { ...base, row: commander.row, col: commander.col };
            return base;
        });
        
        setGrid(swappedGrid);
        const nextSteps = steps - 1;
        setSteps(nextSteps);
    
        if (strategyLocked) {
            setTimeout(() => {
                setAnimating(false);
                checkPhaseEnd(swappedGrid, nextSteps);
            }, 250);
        } else {
            setTimeout(() => {
                processMatchesAndShuffle(swappedGrid, nextSteps);
            }, 300);
        }
    };

    // --- Inputs ---

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

    // Keyboard
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

    // --- Reshuffle Logic ---

    const canAffordReshuffle = steps >= RESHUFFLE_COST;

    const clickReshuffleBtn = () => {
        if (isLocked || animating) return;
        if (!canAffordReshuffle) return; 
        setShowReshuffleModal(true);
    }

    const confirmReshuffle = () => {
        if (steps < RESHUFFLE_COST) return;

        const newGrid = shuffleSoldiers(grid, gameState, true); 
        setGrid(newGrid);
        
        const newSteps = steps - RESHUFFLE_COST;
        setSteps(newSteps);

        onReshufflePay(RESHUFFLE_COST);
        setShowReshuffleModal(false);
        
        setTimeout(() => {
           processMatchesAndShuffle(newGrid, newSteps);
        }, 300);
    };

    return {
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
    };
};
