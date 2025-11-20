
import React, { useState, useCallback } from 'react';
import { 
  GameState, Phase, CommanderType, UnitType, GridItem 
} from './types';
import { 
  INITIAL_GRID_SIZE, LEVELS_PER_RUN, MAX_GRID_SIZE, LEVEL_STEPS, REWARD_DEFINITIONS
} from './constants';

// Components
import { StartScreen } from './components/StartScreen';
import { MapZone } from './components/MapZone';
import { BattleZone } from './components/BattleZone';
import { PuzzleGrid } from './components/PuzzleGrid';
import { RewardScreen } from './components/RewardScreen';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    phase: Phase.MENU,
    gridSize: INITIAL_GRID_SIZE,
    currentLevel: 1,
    maxLevels: LEVELS_PER_RUN,
    commanderType: CommanderType.CENTURION,
    stepsRemaining: LEVEL_STEPS[0],
    reshufflesUsed: 0,
    summonQueue: [],
    playerHp: 100,
    inventory: [],
    survivors: [],
    scavengerLevel: 0,
    maxRewardSelections: 1,
    rewardsRemaining: 0,
    upgrades: [],
    currentRewardIds: [],
    rewardsHistory: {}
  });

  // --- Actions ---

  const startGame = (commanderType: CommanderType) => {
    setGameState(prev => ({
      ...prev,
      phase: Phase.PUZZLE,
      commanderType,
      currentLevel: 1,
      gridSize: INITIAL_GRID_SIZE,
      stepsRemaining: LEVEL_STEPS[0],
      reshufflesUsed: 0,
      summonQueue: [UnitType.COMMANDER], // Deploy Commander immediately
      survivors: [],
      playerHp: 100,
      scavengerLevel: 0,
      maxRewardSelections: 1,
      rewardsRemaining: 0,
      upgrades: [],
      currentRewardIds: [],
      rewardsHistory: {}
    }));
  };

  const handleSummon = (units: UnitType[]) => {
    setGameState(prev => ({
      ...prev,
      summonQueue: [...prev.summonQueue, ...units]
    }));
  };

  const handleReshufflePay = (cost: number) => {
    setGameState(prev => ({
      ...prev,
      stepsRemaining: Math.max(0, prev.stepsRemaining - cost),
      reshufflesUsed: prev.reshufflesUsed + 1
    }));
  };

  const handleBattleStart = (finalGrid: GridItem[]) => {
    setGameState(prev => ({
      ...prev,
      phase: Phase.BATTLE
      // Commander is already in summonQueue from start of level
    }));
  };

  const generateRewardOptions = (currentState: GameState): string[] => {
      // Pool logic
      const pool: string[] = [];
      const history = currentState.rewardsHistory || {};

      // EXPAND (Max 2 times allowed total)
      // Actually check if grid size is maxed out as well
      if (currentState.gridSize < MAX_GRID_SIZE && (history['EXPAND'] || 0) < 2) {
          pool.push('EXPAND');
      }
      
      // SCAVENGER (Unlimited)
      pool.push('SCAVENGER');

      // GREED (Max 1 time)
      if ((history['GREED'] || 0) < 1) {
          pool.push('GREED');
      }

      // UPGRADES (Max 1 per type)
      [UnitType.INFANTRY, UnitType.ARCHER, UnitType.SHIELD, UnitType.SPEAR].forEach(type => {
          if (!currentState.upgrades.includes(type)) {
              pool.push(`UPGRADE_${type}`);
          }
      });

      // Shuffle and pick 3
      for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      
      // If less than 3, just return what we have, fill with blanks handled by UI if needed (or Scavenger fallback)
      return pool.slice(0, 3);
  }

  const handleBattleEnd = (victory: boolean, survivingUnits: UnitType[] = []) => {
    if (victory) {
      if (gameState.currentLevel >= gameState.maxLevels) {
        alert("CAMPAIGN VICTORY! Thanks for playing.");
        setGameState(prev => ({ ...prev, phase: Phase.MENU }));
      } else {
        // Generate random options for this reward phase
        const rewardOptions = generateRewardOptions(gameState);

        setGameState(prev => ({ 
          ...prev, 
          phase: Phase.REWARD,
          survivors: survivingUnits, // Store survivors for next level
          rewardsRemaining: prev.maxRewardSelections,
          currentRewardIds: rewardOptions
        }));
      }
    } else {
      alert("DEFEAT! Your legion has fallen.");
      setGameState(prev => ({ ...prev, phase: Phase.MENU }));
    }
  };

  const handleRewardSelect = (rewardId: string) => {
    setGameState(prev => {
      let newSize = prev.gridSize;
      let newScavenger = prev.scavengerLevel;
      let newMaxRewards = prev.maxRewardSelections;
      const currentUpgrades = [...prev.upgrades];
      const newHistory = { ...prev.rewardsHistory };
      const remaining = prev.rewardsRemaining - 1;
      
      // Update History
      newHistory[rewardId] = (newHistory[rewardId] || 0) + 1;

      // Apply Reward Effect
      if (rewardId === 'EXPAND' && newSize < MAX_GRID_SIZE) {
        newSize += 1;
      } else if (rewardId === 'SCAVENGER') {
        newScavenger += 1;
      } else if (rewardId === 'GREED') {
        newMaxRewards += 1;
      } else if (rewardId.startsWith('UPGRADE_')) {
        const type = rewardId.replace('UPGRADE_', '') as UnitType;
        if (!currentUpgrades.includes(type)) {
            currentUpgrades.push(type);
        }
      }

      // Decide next step
      if (remaining > 0) {
        // Stay in Reward Phase
        return {
          ...prev,
          gridSize: newSize,
          scavengerLevel: newScavenger,
          maxRewardSelections: newMaxRewards,
          upgrades: currentUpgrades,
          rewardsRemaining: remaining,
          rewardsHistory: newHistory
        };
      } else {
        // Proceed to Next Level
        const nextLevel = prev.currentLevel + 1;
        const nextSteps = LEVEL_STEPS[nextLevel - 1] || 10;

        return {
          ...prev,
          gridSize: newSize,
          scavengerLevel: newScavenger,
          maxRewardSelections: newMaxRewards,
          upgrades: currentUpgrades,
          rewardsRemaining: 0,
          rewardsHistory: newHistory,
          currentLevel: nextLevel,
          stepsRemaining: nextSteps,
          reshufflesUsed: 0,
          phase: Phase.PUZZLE, 
          summonQueue: [UnitType.COMMANDER, ...prev.survivors], 
          survivors: [], // Clear temp storage
          currentRewardIds: []
        };
      }
    });
  };

  // --- Render Helpers ---

  if (gameState.phase === Phase.MENU) {
    return <StartScreen onStart={startGame} />;
  }

  const showPuzzle = gameState.phase === Phase.PUZZLE || gameState.phase === Phase.BATTLE || gameState.phase === Phase.REWARD;
  const isPuzzleLocked = gameState.phase !== Phase.PUZZLE;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 max-w-lg mx-auto relative shadow-2xl">
      {/* TOP: Map Zone */}
      <div className="h-[10%] w-full z-10">
        <MapZone gameState={gameState} />
      </div>

      {/* MIDDLE: Battle Zone */}
      <div className="flex-1 w-full relative border-b-4 border-slate-900 bg-slate-900 overflow-hidden z-0">
        <BattleZone 
          allies={gameState.summonQueue} 
          level={gameState.currentLevel}
          phase={gameState.phase}
          commanderType={gameState.commanderType}
          onBattleEnd={handleBattleEnd}
          upgrades={gameState.upgrades}
        />
      </div>

      {/* BOTTOM: Operations Zone */}
      <div className="h-[45%] w-full relative z-20 bg-gray-800">
        {showPuzzle ? (
          <PuzzleGrid 
            gameState={gameState} 
            onSummon={handleSummon}
            onBattleStart={handleBattleStart}
            onReshufflePay={handleReshufflePay}
            isLocked={isPuzzleLocked}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Loading...
          </div>
        )}
      </div>

      {/* OVERLAYS */}
      {gameState.phase === Phase.REWARD && (
        <RewardScreen 
          rewardIds={gameState.currentRewardIds}
          onSelect={handleRewardSelect} 
          selectionsLeft={gameState.rewardsRemaining}
          upgrades={gameState.upgrades}
          rewardsHistory={gameState.rewardsHistory}
          survivors={gameState.survivors}
        />
      )}
    </div>
  );
};

export default App;
