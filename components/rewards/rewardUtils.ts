
import { GameState, UnitType, Phase, Rarity } from '../../types';
import { MAX_PER_UNIT_COUNT } from '../../constants';
import { REWARD_DEFINITIONS, DEBUG_REWARD_POOL, MAX_REWARD_OPTIONS, DEFAULT_RARITY_WEIGHTS, ELITE_RARITY_WEIGHTS } from './rewardConfig';

/**
 * Helper: Calculate the Gem cost for a set of selected rewards,
 * accounting for the "Free Selections" allowance.
 * 
 * Logic: The player gets `freePicks` number of items for FREE.
 * To balance the economy, we automatically discount the CHEAPEST items.
 * The player must pay for the more expensive ones.
 */
export const calculateTransactionCost = (selectedIds: string[], freePicks: number): number => {
    if (selectedIds.length <= freePicks) return 0;

    // Get all costs
    const costs = selectedIds
        .map(id => REWARD_DEFINITIONS[id]?.cost || 0)
        .sort((a, b) => a - b); // Ascending: [50, 150, 500]

    // Remove the top N (Free picks - the cheapest ones)
    const costsToPay = costs.slice(freePicks);

    // Sum the rest (The expensive ones)
    return costsToPay.reduce((sum, c) => sum + c, 0);
};

/**
 * Randomly generates unique reward options based on rarity probabilities.
 * Weights are configurable in rewardConfig.ts.
 */
export const generateRewardOptions = (currentState: GameState): string[] => {
    // DEBUG OVERRIDE
    if (DEBUG_REWARD_POOL.length > 0) {
        return [...DEBUG_REWARD_POOL];
    }

    const { rewardOptionsCount, rewardsHistory, currentLevel, blockCommonRewards } = currentState;
    const generatedIds: string[] = [];

    // 1. Build Available Pools by Rarity
    // We filter out items that have reached their maxLimit
    const pools: Record<Rarity, string[]> = {
        [Rarity.COMMON]: [],
        [Rarity.RARE]: [],
        [Rarity.EPIC]: [],
        [Rarity.MYTHIC]: []
    };

    Object.values(REWARD_DEFINITIONS).forEach(def => {
        const currentCount = rewardsHistory[def.id] || 0;
        if (def.maxLimit !== undefined && currentCount >= def.maxLimit) {
            return;
        }
        // If Common rewards are blocked, do not add them to the pool
        if (blockCommonRewards && def.rarity === Rarity.COMMON) {
            return;
        }
        pools[def.rarity].push(def.id);
    });

    // --- HELPER: Pick Random ID from Pool (with Fallback) ---
    const pickRandom = (rarity: Rarity): string | null => {
        const pool = pools[rarity];
        if (pool.length > 0) {
            return pool[Math.floor(Math.random() * pool.length)];
        }
        // Fallback chain if target pool is empty
        if (rarity === Rarity.MYTHIC) return pickRandom(Rarity.EPIC);
        if (rarity === Rarity.EPIC) return pickRandom(Rarity.RARE);
        if (rarity === Rarity.RARE) return pickRandom(Rarity.COMMON);
        return null;
    };

    // --- GUARANTEED REWARDS ---

    // Level 3 Victory: Guaranteed 'EXPAND'. 
    // If 'EXPAND' is not available (maxed out), replace with a Random Mythic.
    if (currentLevel === 3) {
        const expandDef = REWARD_DEFINITIONS['EXPAND'];
        const expandCount = rewardsHistory['EXPAND'] || 0;
        const isExpandAvailable = expandDef && (expandDef.maxLimit === undefined || expandCount < expandDef.maxLimit);

        if (isExpandAvailable) {
            generatedIds.push('EXPAND');
        } else {
            const fallback = pickRandom(Rarity.MYTHIC);
            if (fallback) generatedIds.push(fallback);
        }
    }

    // Level 5 Victory: Guaranteed Random Mythic.
    if (currentLevel === 5) {
        const mythic = pickRandom(Rarity.MYTHIC);
        if (mythic) generatedIds.push(mythic);
    }

    // 2. Determine remaining slots to fill
    const slotsRemaining = Math.max(0, rewardOptionsCount - generatedIds.length);
    
    // 3. Determine target rarities for each remaining slot based on weights
    const weights = blockCommonRewards ? ELITE_RARITY_WEIGHTS : DEFAULT_RARITY_WEIGHTS;
    
    const targetRarities: Rarity[] = [];
    
    for (let i = 0; i < slotsRemaining; i++) {
        const roll = Math.random() * 100;
        let cumulative = 0;
        let selectedRarity = Rarity.COMMON;

        // Iterate through weights config to find the range
        for (const [rarityKey, weight] of Object.entries(weights)) {
            cumulative += weight;
            if (roll < cumulative) {
                selectedRarity = rarityKey as Rarity;
                break;
            }
        }
        targetRarities.push(selectedRarity);
    }

    // 4. Select Rewards
    targetRarities.forEach(rarity => {
        let pool = pools[rarity];

        // Fallback: If the target rarity pool is empty (e.g. no more Mythics left),
        // we must pick from ANY remaining valid pool to fill the slot.
        if (pool.length === 0) {
            const allRemaining = [
                ...pools[Rarity.COMMON],
                ...pools[Rarity.RARE],
                ...pools[Rarity.EPIC],
                ...pools[Rarity.MYTHIC]
            ];

            if (allRemaining.length > 0) {
                const fallbackId = allRemaining[Math.floor(Math.random() * allRemaining.length)];
                generatedIds.push(fallbackId);
            }
            return;
        }

        // Pick a random item from the target pool
        const randIndex = Math.floor(Math.random() * pool.length);
        const selectedId = pool[randIndex];
        generatedIds.push(selectedId);

        // We DO NOT remove from source pool, allowing duplicates in the same batch
    });

    return generatedIds;
};

/**
 * Processes the selected rewards and calculates the state for the NEXT level.
 * Handles:
 * 1. Deducting Gems
 * 2. Applying reward effects
 * 3. Army Restoration
 * 4. Level Increment
 */
export const applyRewardsAndRestoreArmy = (
    prevState: GameState, 
    selectedRewardIds: string[],
    nextLevelSteps: number
): Partial<GameState> => {
    // 0. Calculate Cost & Deduct Gems
    const cost = calculateTransactionCost(selectedRewardIds, prevState.maxRewardSelections);
    let newGems = Math.max(0, prevState.gems - cost);

    // State Modifications
    let newSize = prevState.gridSize;
    let newScavenger = prevState.scavengerLevel;
    let newMaxRewards = prevState.maxRewardSelections;
    let newMoveRange = prevState.commanderMoveRange;
    let newRemodelLevel = prevState.remodelLevel;
    let newArmyLimitBonus = prevState.armyLimitBonus || 0;
    let newRewardOptionsCount = prevState.rewardOptionsCount;
    let newBlockCommonRewards = prevState.blockCommonRewards;
    
    const currentUpgrades = [...prevState.upgrades];
    const newHistory = { ...prevState.rewardsHistory };
    const extraUnits: UnitType[] = [];
    
    // 1. Apply Selections
    selectedRewardIds.forEach(rewardId => {
      newHistory[rewardId] = (newHistory[rewardId] || 0) + 1;

      // Handle standard rewards via Switch for cleanliness
      switch (rewardId) {
          case 'EXPAND':
              newSize += 1;
              break;
          case 'SCAVENGER':
              newScavenger += 1;
              break;
          case 'GREED':
              newMaxRewards += 1;
              break;
          case 'AGILITY':
              newMoveRange += 1;
              break;
          case 'REMODEL':
              newRemodelLevel += 1;
              break;
          case 'LIMIT_BREAK':
              newArmyLimitBonus += 1;
              break;
          case 'FORTUNE':
              newRewardOptionsCount = Math.min(MAX_REWARD_OPTIONS, newRewardOptionsCount + 1);
              break;
          case 'QUALITY_CONTROL':
              newBlockCommonRewards = true;
              break;
          case 'REINFORCE':
              // Passive effect checked in Puzzle Logic, just needs history update (done above)
              break;
          
          // --- COMMON REWARDS ---
          case 'GEMS_SMALL':
              // Generate random 50-100
              newGems += Math.floor(Math.random() * 101) + 50; 
              break;
          case 'GEMS_MEDIUM':
              newGems += 120;
              break;
          case 'GEMS_LARGE':
              newGems += 250;
              break;
          case 'GEMS_HUGE':
              newGems += 500;
              break;

          case 'UNIT_INFANTRY':
              extraUnits.push(UnitType.INFANTRY);
              break;
          case 'UNIT_ARCHER':
              extraUnits.push(UnitType.ARCHER);
              break;
          case 'UNIT_SHIELD':
              extraUnits.push(UnitType.SHIELD);
              break;
          case 'UNIT_SPEAR':
              extraUnits.push(UnitType.SPEAR);
              break;

          default:
              // Handle Dynamic IDs (Upgrades)
              if (rewardId.startsWith('UPGRADE_')) {
                  const type = rewardId.replace('UPGRADE_', '') as UnitType;
                  if (!currentUpgrades.includes(type)) {
                      currentUpgrades.push(type);
                  }
              }
              break;
      }
    });

    // 2. Army Restoration Logic
    const soldiersToProcess = prevState.summonQueue.filter(u => !u.startsWith('COMMANDER_'));
    const perUnitLimit = MAX_PER_UNIT_COUNT + newArmyLimitBonus;

    const typeCounts: Record<string, number> = {};
    const restoredSoldiers: UnitType[] = [];

    // A. Restore Survivors up to limit
    for (const unit of soldiersToProcess) {
       const currentCount = typeCounts[unit] || 0;
       if (currentCount < perUnitLimit) {
           restoredSoldiers.push(unit);
           typeCounts[unit] = currentCount + 1;
       }
    }

    // B. Add "Extra" Units from Rewards (Bypassing limit check or adding on top?)
    // Design Choice: Extra units from rewards are added on top of the restored army.
    // They help fill out the roster even if you are at the cap, or push you over slightly for one round.
    restoredSoldiers.push(...extraUnits);

    const nextLevel = prevState.currentLevel + 1;

    return {
      gems: newGems,
      gridSize: newSize,
      scavengerLevel: newScavenger,
      maxRewardSelections: newMaxRewards,
      commanderMoveRange: newMoveRange,
      remodelLevel: newRemodelLevel,
      armyLimitBonus: newArmyLimitBonus,
      rewardOptionsCount: newRewardOptionsCount,
      blockCommonRewards: newBlockCommonRewards,
      upgrades: currentUpgrades,
      rewardsHistory: newHistory,
      currentLevel: nextLevel,
      stepsRemaining: nextLevelSteps,
      reshufflesUsed: 0,
      phase: Phase.PUZZLE, 
      summonQueue: [prevState.commanderUnitType, ...restoredSoldiers], 
      survivors: [], 
      currentRewardIds: [],
      battleId: prevState.battleId + 1
    };
};
