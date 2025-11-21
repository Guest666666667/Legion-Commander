
import React, { useState, useCallback } from 'react';
import { 
  GameState, Phase, UnitType, GridItem 
} from './types';
import { 
  INITIAL_GRID_SIZE, LEVELS_PER_RUN, MAX_GRID_SIZE, LEVEL_STEPS, REWARD_DEFINITIONS, INITIAL_ARMY_CONFIG, MAX_PER_UNIT_COUNT
} from './constants';

// Components
import { StartScreen } from './components/StartScreen';
import { MapZone } from './components/MapZone';
import { BattleZone } from './components/BattleZone';
import { PuzzleGrid } from './components/PuzzleGrid';
import { RewardScreen } from './components/RewardScreen';
import { GameOverScreen } from './components/GameOverScreen';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    phase: Phase.MENU,
    gridSize: INITIAL_GRID_SIZE,
    currentLevel: 1,
    maxLevels: LEVELS_PER_RUN,
    commanderUnitType: UnitType.COMMANDER_CENTURION, // Default
    stepsRemaining: LEVEL_STEPS[0],
    reshufflesUsed: 0,
    summonQueue: [],
    playerHp: 100,
    inventory: [],
    survivors: [],
    scavengerLevel: 0,
    commanderMoveRange: 1,
    maxRewardSelections: 1,
    rewardsRemaining: 0,
    upgrades: [],
    remodelLevel: 0,
    currentRewardIds: [],
    rewardsHistory: {},
    scoreStats: { matches3: 0, matches4: 0, matches5: 0, reshuffles: 0, won: false, kills: {} }
  });

  // --- Actions ---

  const startGame = (commanderUnitType: UnitType) => {
    // Apply INITIAL_ARMY_CONFIG to everyone (Debug/Global Config)
    const startingArmy = [commanderUnitType, ...INITIAL_ARMY_CONFIG];
    
    // Centurion Skill: Start with an EXTRA full retinue
    if (commanderUnitType === UnitType.COMMANDER_CENTURION) {
        startingArmy.push(UnitType.INFANTRY, UnitType.ARCHER, UnitType.SHIELD, UnitType.SPEAR);
    }

    setGameState(prev => ({
      ...prev,
      phase: Phase.PUZZLE,
      commanderUnitType,
      currentLevel: 1,
      gridSize: INITIAL_GRID_SIZE,
      stepsRemaining: LEVEL_STEPS[0],
      reshufflesUsed: 0,
      summonQueue: startingArmy, // Deploy Selected Commander + Config + Skill Units
      survivors: [],
      playerHp: 100,
      scavengerLevel: 0,
      commanderMoveRange: 1,
      maxRewardSelections: 1,
      rewardsRemaining: 0,
      upgrades: [],
      remodelLevel: 0,
      currentRewardIds: [],
      rewardsHistory: {},
      scoreStats: { matches3: 0, matches4: 0, matches5: 0, reshuffles: 0, won: false, kills: {} }
    }));
  };

  const handleSummon = (units: UnitType[]) => {
    setGameState(prev => ({
      ...prev,
      summonQueue: [...prev.summonQueue, ...units]
    }));
  };

  const handleMatchFound = (count: number) => {
    setGameState(prev => {
      const stats = { ...prev.scoreStats };
      if (count === 3) stats.matches3++;
      else if (count === 4) stats.matches4++;
      else if (count >= 5) stats.matches5++;
      return { ...prev, scoreStats: stats };
    });
  };

  const handleReshufflePay = (cost: number) => {
    setGameState(prev => ({
      ...prev,
      reshufflesUsed: prev.reshufflesUsed + 1,
      scoreStats: {
          ...prev.scoreStats,
          reshuffles: prev.scoreStats.reshuffles + 1
      }
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
      if (currentState.gridSize < MAX_GRID_SIZE && (history['EXPAND'] || 0) < 2) {
          pool.push('EXPAND');
      }
      
      // SCAVENGER (Unlimited)
      pool.push('SCAVENGER');

      // AGILITY (Max 1 time - adds +1 range)
      if ((history['AGILITY'] || 0) < 1) {
          pool.push('AGILITY');
      }
      
      // REINFORCE (Max 1 time - Old Centurion Skill)
      if ((history['REINFORCE'] || 0) < 1) {
          pool.push('REINFORCE');
      }

      // REMODEL (Max 4 times)
      if (currentState.remodelLevel < 4) {
          pool.push('REMODEL');
      }

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
      
      return pool.slice(0, 3);
  }

  const handleBattleEnd = (victory: boolean, survivingUnits: UnitType[] = [], kills: Record<string, number> = {}) => {
    // Merge kills
    const mergedKills = { ...gameState.scoreStats.kills };
    Object.entries(kills).forEach(([type, count]) => {
        mergedKills[type] = (mergedKills[type] || 0) + count;
    });
    
    const nextScoreStats = {
        ...gameState.scoreStats,
        kills: mergedKills
    };

    if (victory) {
      if (gameState.currentLevel >= gameState.maxLevels) {
        // Campaign Victory
        setGameState(prev => ({
            ...prev,
            phase: Phase.GAME_OVER,
            survivors: survivingUnits, // Store final army for score calculation
            scoreStats: { ...nextScoreStats, won: true }
        }));
      } else {
        // Level Victory -> Rewards
        const rewardOptions = generateRewardOptions(gameState);

        setGameState(prev => ({ 
          ...prev, 
          phase: Phase.REWARD,
          survivors: survivingUnits, // Store survivors for display/score, NOT for next level roster
          rewardsRemaining: prev.maxRewardSelections,
          currentRewardIds: rewardOptions,
          scoreStats: nextScoreStats
        }));
      }
    } else {
      // Defeat
      setGameState(prev => ({
        ...prev,
        phase: Phase.GAME_OVER,
        scoreStats: { ...nextScoreStats, won: false }
      }));
    }
  };

  const handleRewardSelect = (rewardIds: string[]) => {
    setGameState(prev => {
      let newSize = prev.gridSize;
      let newScavenger = prev.scavengerLevel;
      let newMaxRewards = prev.maxRewardSelections;
      let newMoveRange = prev.commanderMoveRange;
      let newRemodelLevel = prev.remodelLevel;
      const currentUpgrades = [...prev.upgrades];
      const newHistory = { ...prev.rewardsHistory };
      
      // Iterate all selections
      rewardIds.forEach(rewardId => {
        newHistory[rewardId] = (newHistory[rewardId] || 0) + 1;

        if (rewardId === 'EXPAND' && newSize < MAX_GRID_SIZE) {
            newSize += 1;
        } else if (rewardId === 'SCAVENGER') {
            newScavenger += 1;
        } else if (rewardId === 'GREED') {
            newMaxRewards += 1;
        } else if (rewardId === 'AGILITY') {
            newMoveRange += 1;
        } else if (rewardId === 'REMODEL') {
            newRemodelLevel += 1;
        } else if (rewardId.startsWith('UPGRADE_')) {
            const type = rewardId.replace('UPGRADE_', '') as UnitType;
            if (!currentUpgrades.includes(type)) {
                currentUpgrades.push(type);
            }
        }
      });

      // Proceed to Next Level immediately (since we batched selections)
      const nextLevel = prev.currentLevel + 1;
      const nextSteps = LEVEL_STEPS[nextLevel - 1] || 10;

      // RESTORE ARMY LOGIC:
      // 1. Separate Commander and Soldiers from previous roster
      const soldiersToProcess = prev.summonQueue.filter(u => !u.startsWith('COMMANDER_'));
      
      // 2. Filter Soldiers by Per-Type Limit
      const typeCounts: Record<string, number> = {};
      const restoredSoldiers: UnitType[] = [];

      for (const unit of soldiersToProcess) {
         const currentCount = typeCounts[unit] || 0;
         if (currentCount < MAX_PER_UNIT_COUNT) {
             restoredSoldiers.push(unit);
             typeCounts[unit] = currentCount + 1;
         }
      }

      return {
        ...prev,
        gridSize: newSize,
        scavengerLevel: newScavenger,
        maxRewardSelections: newMaxRewards,
        commanderMoveRange: newMoveRange,
        remodelLevel: newRemodelLevel,
        upgrades: currentUpgrades,
        rewardsRemaining: 0,
        rewardsHistory: newHistory,
        currentLevel: nextLevel,
        stepsRemaining: nextSteps,
        reshufflesUsed: 0,
        phase: Phase.PUZZLE, 
        summonQueue: [prev.commanderUnitType, ...restoredSoldiers], // Full army restored + Commander
        survivors: [], 
        currentRewardIds: []
      };
    });
  };
  
  const restartGame = () => {
      setGameState({
        phase: Phase.MENU,
        gridSize: INITIAL_GRID_SIZE,
        currentLevel: 1,
        maxLevels: LEVELS_PER_RUN,
        commanderUnitType: UnitType.COMMANDER_CENTURION,
        stepsRemaining: LEVEL_STEPS[0],
        reshufflesUsed: 0,
        summonQueue: [],
        playerHp: 100,
        inventory: [],
        survivors: [],
        scavengerLevel: 0,
        commanderMoveRange: 1,
        maxRewardSelections: 1,
        rewardsRemaining: 0,
        upgrades: [],
        remodelLevel: 0,
        currentRewardIds: [],
        rewardsHistory: {},
        scoreStats: { matches3: 0, matches4: 0, matches5: 0, reshuffles: 0, won: false, kills: {} }
      });
  };

  // --- Render Helpers ---

  if (gameState.phase === Phase.MENU) {
    return <StartScreen onStart={startGame} />;
  }

  const showPuzzle = gameState.phase === Phase.PUZZLE || gameState.phase === Phase.BATTLE || gameState.phase === Phase.REWARD || gameState.phase === Phase.GAME_OVER;
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
          commanderUnitType={gameState.commanderUnitType}
          onBattleEnd={handleBattleEnd}
          upgrades={gameState.upgrades}
          rewardsHistory={gameState.rewardsHistory}
        />
      </div>

      {/* BOTTOM: Operations Zone */}
      <div className="h-[45%] w-full relative z-20 bg-gray-800">
        {showPuzzle ? (
          <PuzzleGrid 
            key={gameState.currentLevel}
            gameState={gameState} 
            onSummon={handleSummon}
            onMatch={handleMatchFound}
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
          roster={gameState.summonQueue}
        />
      )}
      
      {gameState.phase === Phase.GAME_OVER && (
          <GameOverScreen 
            stats={gameState.scoreStats}
            finalArmy={gameState.survivors}
            onRestart={restartGame}
          />
      )}
    </div>
  );
};

export default App;
