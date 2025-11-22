
import { GameState, UnitType, Phase, Rarity } from '../../types';
import { MAX_PER_UNIT_COUNT } from '../../constants';
import { REWARD_DEFINITIONS, DEBUG_REWARD_POOL, MAX_REWARD_OPTIONS, DEFAULT_RARITY_WEIGHTS, ELITE_RARITY_WEIGHTS, RewardIDs } from './rewardConfig';
import { restoreSurvivors } from './armyLogic';

// --- TYPES ---
type PoolMap = Record<Rarity, string[]>;

/**
 * Mapping between Reward ID and the UnitType it recruits.
 * Used to filter out rewards for commanders we already have.
 */
const RECRUIT_MAP: Record<string, UnitType> = {
    [RewardIDs.RECRUIT_CENTURION]: UnitType.COMMANDER_CENTURION,
    [RewardIDs.RECRUIT_WARLORD]: UnitType.COMMANDER_WARLORD,
    [RewardIDs.RECRUIT_ELF]: UnitType.COMMANDER_ELF,
    [RewardIDs.RECRUIT_GUARDIAN]: UnitType.COMMANDER_GUARDIAN,
    [RewardIDs.RECRUIT_VANGUARD]: UnitType.COMMANDER_VANGUARD,
};

/**
 * Calculates Gem cost accounting for free picks.
 */
export const calculateTransactionCost = (selectedIds: string[], freePicks: number): number => {
    if (selectedIds.length <= freePicks) return 0;

    // Get all costs, sort ascending
    const costs = selectedIds
        .map(id => REWARD_DEFINITIONS[id]?.cost || 0)
        .sort((a, b) => a - b); 

    // Pay for the most expensive ones (Total - Free)
    const costsToPay = costs.slice(freePicks);

    return costsToPay.reduce((sum, c) => sum + c, 0);
};

/**
 * Determines if specific guaranteed rewards should appear based on Level and History.
 */
const getGuaranteedRewards = (level: number, history: Record<string, number>, pickRandom: (r: Rarity) => string | null, pools: PoolMap): string[] => {
    const guaranteed: string[] = [];

    const hasHistoryOf = (rarities: Rarity[]) => {
        return Object.keys(history).some(id => {
            const count = history[id];
            const def = REWARD_DEFINITIONS[id];
            return count && count > 0 && def && rarities.includes(def.rarity);
        });
    };

    // Level 3: Guaranteed Epic if unlucky
    if (level === 3 && !hasHistoryOf([Rarity.EPIC, Rarity.MYTHIC])) {
        const pityEpic = pickRandom(Rarity.EPIC);
        if (pityEpic) guaranteed.push(pityEpic);
    }

    // Level 4 (Mini Boss): Guaranteed Mythic
    if (level === 4) {
        const mythic = pickRandom(Rarity.MYTHIC);
        if (mythic) guaranteed.push(mythic);
    }

    // Level 6: Pity Mythic (excluding GEMS_HUGE preference if possible)
    if (level === 6 && !hasHistoryOf([Rarity.MYTHIC])) {
        const validMythics = pools[Rarity.MYTHIC].filter(id => id !== RewardIDs.GEMS_HUGE);
        if (validMythics.length > 0) {
            guaranteed.push(validMythics[Math.floor(Math.random() * validMythics.length)]);
        } else {
            const fallback = pickRandom(Rarity.MYTHIC);
            if (fallback) guaranteed.push(fallback);
        }
    }

    return guaranteed;
};

/**
 * Generates reward options for the UI.
 */
export const generateRewardOptions = (currentState: GameState): string[] => {
    if (DEBUG_REWARD_POOL.length > 0) return [...DEBUG_REWARD_POOL];

    const { rewardOptionsCount, rewardsHistory, currentLevel, blockCommonRewards, summonQueue } = currentState;
    const generatedIds: string[] = [];

    // Identify existing commanders to prevent duplicates
    const existingCommanders = new Set(summonQueue.filter(u => u.startsWith('COMMANDER_')));

    // 1. Build Pools
    const pools: PoolMap = { [Rarity.COMMON]: [], [Rarity.RARE]: [], [Rarity.EPIC]: [], [Rarity.MYTHIC]: [] };

    Object.values(REWARD_DEFINITIONS).forEach(def => {
        // Check Max Limit
        const currentCount = rewardsHistory[def.id] || 0;
        if (def.maxLimit !== undefined && currentCount >= def.maxLimit) return;
        
        // Check Common Block
        if (blockCommonRewards && def.rarity === Rarity.COMMON) return;

        // Check Existing Commander Logic
        // If this reward recruits a commander, and we already have that unit type, skip it.
        if (RECRUIT_MAP[def.id] && existingCommanders.has(RECRUIT_MAP[def.id])) return;
        
        // Add to pool (handle weights)
        const weight = def.weight || 1;
        for (let w = 0; w < weight; w++) {
            pools[def.rarity].push(def.id);
        }
    });

    // Helper: Remove ID from pool to prevent duplicates in the same screen
    const removeIdFromPools = (idToRemove: string) => {
        // Remove ALL instances of this ID from ALL pools to prevent re-selection
        Object.keys(pools).forEach(key => {
            const rarity = key as Rarity;
            if (pools[rarity]) {
                pools[rarity] = pools[rarity].filter(id => id !== idToRemove);
            }
        });
    };

    // Helper: Recursive Random Picker
    const pickRandom = (rarity: Rarity): string | null => {
        const pool = pools[rarity];
        if (pool && pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
        
        // Fallback Chain
        if (rarity === Rarity.MYTHIC) return pickRandom(Rarity.EPIC);
        if (rarity === Rarity.EPIC) return pickRandom(Rarity.RARE);
        if (rarity === Rarity.RARE) return pickRandom(Rarity.COMMON);
        return null;
    };

    // 2. Add Guaranteed Rewards
    const guaranteed = getGuaranteedRewards(currentLevel, rewardsHistory, pickRandom, pools);
    
    guaranteed.forEach(id => {
        if (!generatedIds.includes(id)) {
            generatedIds.push(id);
            removeIdFromPools(id); // Crucial: Remove guarantee from pool so random slots don't pick it again
        }
    });

    // 3. Fill remaining slots
    const slotsRemaining = Math.max(0, rewardOptionsCount - generatedIds.length);
    const weights = blockCommonRewards ? ELITE_RARITY_WEIGHTS : DEFAULT_RARITY_WEIGHTS;
    
    for (let i = 0; i < slotsRemaining; i++) {
        const roll = Math.random() * 100;
        let cumulative = 0;
        let selectedRarity = Rarity.COMMON;

        for (const [rarityKey, weight] of Object.entries(weights)) {
            cumulative += weight;
            if (roll < cumulative) {
                selectedRarity = rarityKey as Rarity;
                break;
            }
        }
        
        let selectedId = pickRandom(selectedRarity);
        // Absolute fallback if everything is empty
        if (!selectedId) {
             // Try to find ANY valid ID remaining in pools
             for (const r of [Rarity.MYTHIC, Rarity.EPIC, Rarity.RARE, Rarity.COMMON]) {
                if (pools[r].length > 0) {
                    selectedId = pools[r][0];
                    break;
                }
            }
        }
        
        if(selectedId) {
            generatedIds.push(selectedId);
            removeIdFromPools(selectedId); // Remove from pool for subsequent slots
        }
    }

    // 4. Shuffle (Fisher-Yates)
    for (let i = generatedIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [generatedIds[i], generatedIds[j]] = [generatedIds[j], generatedIds[i]];
    }

    return generatedIds;
};

/**
 * Applies the specific effect of a single reward ID to the game state variables.
 * Returns partial updates to state variables.
 */
const applyRewardEffect = (
    rewardId: string, 
    currentState: { 
        gridSize: number; 
        scavengerLevel: number; 
        maxRewardSelections: number; 
        commanderMoveRange: number; 
        remodelLevel: number; 
        armyLimitBonus: number; 
        rewardOptionsCount: number; 
        blockCommonRewards: boolean; 
        gems: number;
        extraUnits: UnitType[];
        newUpgrades: UnitType[];
    }
) => {
    const state = { ...currentState };

    // Common/Gem Rewards with random logic
    if (rewardId === RewardIDs.GEMS_SMALL) {
        state.gems += Math.floor(Math.random() * 101) + 50;
        return state;
    }

    switch (rewardId) {
        // Mechanics
        case RewardIDs.EXPAND: state.gridSize += 1; break;
        case RewardIDs.SCAVENGER: state.scavengerLevel += 1; break;
        case RewardIDs.GREED: state.maxRewardSelections += 1; break;
        case RewardIDs.AGILITY: state.commanderMoveRange += 1; break;
        case RewardIDs.REMODEL: state.remodelLevel += 1; break;
        case RewardIDs.LIMIT_BREAK: state.armyLimitBonus += 3; break;
        case RewardIDs.FORTUNE: state.rewardOptionsCount = Math.min(MAX_REWARD_OPTIONS, state.rewardOptionsCount + 1); break;
        case RewardIDs.QUALITY_CONTROL: state.blockCommonRewards = true; break;
        case RewardIDs.REINFORCE: break; // Passive handled in PuzzleLogic

        // Gems
        case RewardIDs.GEMS_MEDIUM: state.gems += 120; break;
        case RewardIDs.GEMS_LARGE: state.gems += 180; break;
        case RewardIDs.GEMS_HUGE: state.gems += 250; break;

        // Recruits (Commanders)
        case RewardIDs.RECRUIT_CENTURION: state.extraUnits.push(UnitType.COMMANDER_CENTURION); break;
        case RewardIDs.RECRUIT_WARLORD: state.extraUnits.push(UnitType.COMMANDER_WARLORD); break;
        case RewardIDs.RECRUIT_ELF: state.extraUnits.push(UnitType.COMMANDER_ELF); break;
        case RewardIDs.RECRUIT_GUARDIAN: state.extraUnits.push(UnitType.COMMANDER_GUARDIAN); break;
        case RewardIDs.RECRUIT_VANGUARD: state.extraUnits.push(UnitType.COMMANDER_VANGUARD); break;

        // Recruits (Soldiers)
        case RewardIDs.UNIT_INFANTRY: state.extraUnits.push(UnitType.INFANTRY); break;
        case RewardIDs.UNIT_ARCHER: state.extraUnits.push(UnitType.ARCHER); break;
        case RewardIDs.UNIT_SHIELD: state.extraUnits.push(UnitType.SHIELD); break;
        case RewardIDs.UNIT_SPEAR: state.extraUnits.push(UnitType.SPEAR); break;

        default:
            // Upgrades
            if (rewardId.startsWith(RewardIDs.UPGRADE_PREFIX)) {
                const type = rewardId.replace(RewardIDs.UPGRADE_PREFIX, '') as UnitType;
                if (!state.newUpgrades.includes(type)) {
                    state.newUpgrades.push(type);
                }
            }
            break;
    }
    return state;
};

/**
 * Main orchestrator for transitioning between levels via Rewards.
 */
export const applyRewardsAndRestoreArmy = (
    prevState: GameState, 
    selectedRewardIds: string[],
    nextLevelSteps: number
): Partial<GameState> => {
    
    // 1. Calculate Initial Cost
    const cost = calculateTransactionCost(selectedRewardIds, prevState.maxRewardSelections);
    const initialGems = Math.max(0, prevState.gems - cost);

    // 2. Initialize Mutable State Container
    let stateContainer = {
        gridSize: prevState.gridSize,
        scavengerLevel: prevState.scavengerLevel,
        maxRewardSelections: prevState.maxRewardSelections,
        commanderMoveRange: prevState.commanderMoveRange,
        remodelLevel: prevState.remodelLevel,
        armyLimitBonus: prevState.armyLimitBonus || 0,
        rewardOptionsCount: prevState.rewardOptionsCount,
        blockCommonRewards: prevState.blockCommonRewards,
        gems: initialGems,
        extraUnits: [] as UnitType[],
        newUpgrades: [...prevState.upgrades]
    };

    // 3. Apply Effects Sequentially
    const newHistory = { ...prevState.rewardsHistory };
    selectedRewardIds.forEach(id => {
        newHistory[id] = (newHistory[id] || 0) + 1;
        stateContainer = applyRewardEffect(id, stateContainer);
    });

    // 4. Restore Army (Using imported logic)
    const finalLimit = MAX_PER_UNIT_COUNT + stateContainer.armyLimitBonus;
    const restoredArmy = restoreSurvivors(
        prevState.summonQueue,
        finalLimit,
        stateContainer.extraUnits,
        prevState.commanderUnitType
    );

    // 5. Return State Updates
    return {
        gems: stateContainer.gems,
        gridSize: stateContainer.gridSize,
        scavengerLevel: stateContainer.scavengerLevel,
        maxRewardSelections: stateContainer.maxRewardSelections,
        commanderMoveRange: stateContainer.commanderMoveRange,
        remodelLevel: stateContainer.remodelLevel,
        armyLimitBonus: stateContainer.armyLimitBonus,
        rewardOptionsCount: stateContainer.rewardOptionsCount,
        blockCommonRewards: stateContainer.blockCommonRewards,
        upgrades: stateContainer.newUpgrades,
        
        rewardsHistory: newHistory,
        currentLevel: prevState.currentLevel + 1,
        stepsRemaining: nextLevelSteps,
        reshufflesUsed: 0,
        phase: Phase.PUZZLE, 
        summonQueue: [prevState.commanderUnitType, ...restoredArmy], // Always keep Main Commander at front
        survivors: [], 
        currentRewardIds: [],
        battleId: prevState.battleId + 1
    };
};
