import { UnitType } from '../../types';

/**
 * Pure function to calculate the army to restore.
 * Returns the new list of units (Roster).
 * If the player wins, we restore the army from the previous roster (prevSummonQueue),
 * essentially reviving dead units up to the per-unit limit.
 */
export const restoreSurvivors = (
    prevSummonQueue: UnitType[], 
    perUnitLimit: number, 
    extraRecruits: UnitType[],
    commanderType: UnitType
): UnitType[] => {
    // 1. Filter queue: remove main commander (re-added later in App.tsx)
    const unitsToProcess = prevSummonQueue.filter(u => u !== commanderType);
    const restored: UnitType[] = [];
    const currentTypeCounts: Record<string, number> = {};

    // 2. Restore from previous roster (Revive Logic)
    // We iterate through the ARMY THAT STARTED THE BATTLE.
    for (const unit of unitsToProcess) {
        const currentAmt = currentTypeCounts[unit] || 0;
        
        // Only keep up to the limit (Prevent snowballing)
        if (currentAmt < perUnitLimit) {
            restored.push(unit);
            currentTypeCounts[unit] = currentAmt + 1;
        }
    }

    // 3. Add Extra Recruits (Rewards) 
    // Added ON TOP of restored limits to ensure rewards always feel valuable
    restored.push(...extraRecruits);
    
    return restored;
};