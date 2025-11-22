
import React, { useState, useCallback } from 'react';
import { 
  GameState, Phase, UnitType, GridItem 
} from './types';
import { 
  INITIAL_GRID_SIZE, LEVELS_PER_RUN, INITIAL_ARMY_CONFIG, SCORING
} from './constants';
import { LEVEL_STEPS } from './components/map/levelConfig';
import { INITIAL_GEMS, INITIAL_MAX_REWARD_SELECTIONS, INITIAL_REWARD_OPTIONS_COUNT } from './components/rewards/rewardConfig';

// Components
import { StartScreen } from './components/screens/StartScreen';
import { MapZone } from './components/map/MapZone';
import { BattleZone } from './components/battle/BattleZone';
import { PuzzleGrid } from './components/puzzle/PuzzleGrid';
import { RewardScreen } from './components/rewards/RewardScreen';
import { GameOverScreen } from './components/screens/GameOverScreen';
import { generateRewardOptions, applyRewardsAndRestoreArmy } from './components/rewards/rewardUtils';

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
    inventory: [],
    survivors: [],
    scavengerLevel: 0,
    commanderMoveRange: 1,
    maxRewardSelections: INITIAL_MAX_REWARD_SELECTIONS,
    rewardOptionsCount: INITIAL_REWARD_OPTIONS_COUNT,
    gems: INITIAL_GEMS, // Initial Gems from config
    upgrades: [],
    remodelLevel: 0,
    armyLimitBonus: 0, 
    blockCommonRewards: false,
    currentRewardIds: [],
    rewardsHistory: {},
    scoreStats: { matches3: 0, matches4: 0, matches5: 0, reshuffles: 0, won: false, kills: {} },
    battleId: 0
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
      scavengerLevel: 0,
      commanderMoveRange: 1,
      maxRewardSelections: INITIAL_MAX_REWARD_SELECTIONS,
      rewardOptionsCount: INITIAL_REWARD_OPTIONS_COUNT,
      gems: INITIAL_GEMS,
      upgrades: [],
      remodelLevel: 0,
      armyLimitBonus: 0,
      blockCommonRewards: false,
      currentRewardIds: [],
      rewardsHistory: {},
      scoreStats: { matches3: 0, matches4: 0, matches5: 0, reshuffles: 0, won: false, kills: {} },
      battleId: prev.battleId + 1
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
      // Award Gems
      const earnedGems = SCORING.GEM_WIN_BONUS;
      
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
          gems: prev.gems + earnedGems, // Add Gems
          phase: Phase.REWARD,
          survivors: survivingUnits, // Store survivors for display/score, NOT for next level roster
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
        const nextLevel = prev.currentLevel + 1;
        const nextSteps = LEVEL_STEPS[nextLevel - 1] || 10;
        
        // Use isolated utility for complex state transitions
        const updates = applyRewardsAndRestoreArmy(prev, rewardIds, nextSteps);
        
        return {
            ...prev,
            ...updates
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
        inventory: [],
        survivors: [],
        scavengerLevel: 0,
        commanderMoveRange: 1,
        maxRewardSelections: INITIAL_MAX_REWARD_SELECTIONS,
        rewardOptionsCount: INITIAL_REWARD_OPTIONS_COUNT,
        gems: INITIAL_GEMS,
        upgrades: [],
        remodelLevel: 0,
        armyLimitBonus: 0,
        blockCommonRewards: false,
        currentRewardIds: [],
        rewardsHistory: {},
        scoreStats: { matches3: 0, matches4: 0, matches5: 0, reshuffles: 0, won: false, kills: {} },
        battleId: 0
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
          key={gameState.battleId}
          allies={gameState.summonQueue} 
          level={gameState.currentLevel}
          phase={gameState.phase}
          commanderUnitType={gameState.commanderUnitType}
          onBattleEnd={handleBattleEnd}
          upgrades={gameState.upgrades}
          rewardsHistory={gameState.rewardsHistory}
          gems={gameState.gems}
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
          freeSelections={gameState.maxRewardSelections}
          currentGems={gameState.gems}
          upgrades={gameState.upgrades}
          rewardsHistory={gameState.rewardsHistory}
          survivors={gameState.survivors}
          roster={gameState.summonQueue}
          currentLevel={gameState.currentLevel}
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
