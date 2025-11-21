
import React from 'react';
import { GridItem, UnitType, GameState } from '../../types';
import { UnitIcon } from '../UnitIcon';
import { isCommander } from './puzzleUtils';

interface PuzzleCellProps {
    item: GridItem;
    commander: GridItem | undefined;
    gameState: GameState;
    animating: boolean;
    steps: number;
    isLocked: boolean;
    matchedIds: Set<string>;
    cellSize: string;
    onCellClick: (item: GridItem) => void;
}

export const PuzzleCell: React.FC<PuzzleCellProps> = ({
    item, commander, gameState, animating, steps, isLocked, matchedIds, cellSize, onCellClick
}) => {
    const isCmd = isCommander(item.type);
    const isMatched = matchedIds.has(item.id);
    const isUpgraded = gameState.upgrades.includes(item.type);
    
    let isValidTarget = false;
    if (commander && !isCmd && !animating && steps > 0 && !isLocked) {
        const dr = Math.abs(item.row - commander.row);
        const dc = Math.abs(item.col - commander.col);
        const range = gameState.commanderMoveRange || 1;
        const dist = dr + dc;
        isValidTarget = (dist > 0 && dist <= range);
    }

    // Logic for animation class:
    // 1. If Matched: Bounce
    // 2. If NOT matched AND is new: Grow in
    // 3. Otherwise: No animation (prevents re-triggering on move)
    const animationClass = isMatched 
        ? 'ring-2 ring-dashed ring-yellow-300 animate-bounce z-20' 
        : (item.isNew ? 'animate-grow-in' : '');

    return (
        <div
            onClick={() => onCellClick(item)}
            className={`
                ${cellSize} rounded-md cursor-pointer transition-all duration-300 relative
                ${isCmd ? 'ring-4 ring-yellow-500 z-10' : ''}
                ${animationClass}
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
};
