
import { GridItem, UnitType, GameState } from '../../types';

// --- HELPER PREDICATES ---
export const isSoldier = (t: UnitType) => [UnitType.INFANTRY, UnitType.ARCHER, UnitType.SHIELD, UnitType.SPEAR].includes(t);
export const isCommander = (t: UnitType) => t.startsWith('COMMANDER_');

/**
 * Generates the initial grid based on game configuration.
 */
export const generateInitialGrid = (gameState: GameState): GridItem[] => {
    const n = gameState.gridSize;
    const totalCells = n * n;
    
    // Remodel logic
    const totalObstacles = n - 1;
    const remodelCount = Math.min(totalObstacles, gameState.remodelLevel);
    const obstacleCount = Math.max(0, totalObstacles - remodelCount);
    
    const commanderCount = 1;
    
    const availableTypes = [UnitType.INFANTRY, UnitType.ARCHER, UnitType.SHIELD, UnitType.SPEAR];
    const currentSoldierTypes = availableTypes.slice(0, n - 1); // e.g. n=3 -> [Inf, Arch]
    
    const remodelExtras: UnitType[] = [];
    if (remodelCount > 0) {
        for (let i=0; i < remodelCount; i++) {
            const randomType = currentSoldierTypes[Math.floor(Math.random() * currentSoldierTypes.length)];
            remodelExtras.push(randomType);
        }
    }

    const soldierTotalCount = totalCells - obstacleCount - commanderCount - remodelExtras.length;
    const countPerSoldier = Math.floor(soldierTotalCount / currentSoldierTypes.length);
    
    const items: GridItem[] = [];
    let idCounter = 0;

    // Add Commander
    items.push({ id: `gen-${idCounter++}`, type: gameState.commanderUnitType, row: 0, col: 0 });

    // Add Obstacles
    for (let i = 0; i < obstacleCount; i++) {
      items.push({ id: `gen-${idCounter++}`, type: UnitType.OBSTACLE, row: 0, col: 0 });
    }

    // Add Remodel Extra Soldiers
    remodelExtras.forEach(type => {
       items.push({ id: `gen-${idCounter++}`, type: type, row: 0, col: 0 });
    });

    // Add Standard Soldiers
    currentSoldierTypes.forEach(type => {
      for (let i = 0; i < countPerSoldier; i++) {
        items.push({ id: `gen-${idCounter++}`, type: type, row: 0, col: 0 });
      }
    });

    // Fill remainder
    while(items.length < totalCells) {
       items.push({ id: `gen-${idCounter++}`, type: currentSoldierTypes[0], row: 0, col: 0 });
    }

    // Shuffle initial positions
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    // Assign coords
    items.forEach((item, index) => {
      item.row = Math.floor(index / n);
      item.col = index % n;
    });

    return items;
};

/**
 * Randomly shuffles soldiers/obstacles on the grid.
 */
export const shuffleSoldiers = (currentGrid: GridItem[], gameState: GameState, forceAll = false): GridItem[] => {
    const includeObstacles = forceAll || gameState.scavengerLevel > 0;
    const movableItems = currentGrid.filter(item => 
        isSoldier(item.type) || (includeObstacles && item.type === UnitType.OBSTACLE)
    );
    const movableSlots = movableItems.map(s => ({ row: s.row, col: s.col }));
    
    for (let i = movableSlots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [movableSlots[i], movableSlots[j]] = [movableSlots[j], movableSlots[i]];
    }

    // Map to new positions and CLEAR isNew flag to prevent re-animation
    return currentGrid.map(item => {
       const movedIdx = movableItems.findIndex(m => m.id === item.id);
       if (movedIdx !== -1) {
           return { 
               ...item, 
               row: movableSlots[movedIdx].row, 
               col: movableSlots[movedIdx].col, 
               isNew: false 
           };
       }
       return { ...item, isNew: false };
    });
};

/**
 * Replaces matched items with new random units.
 */
export const replaceMatchedItems = (currentGrid: GridItem[], matches: Set<string>, gameState: GameState): GridItem[] => {
    const availableTypes = [UnitType.INFANTRY, UnitType.ARCHER, UnitType.SHIELD, UnitType.SPEAR];
    const currentSoldierTypes = availableTypes.slice(0, gameState.gridSize - 1);

    return currentGrid.map(item => {
      if (matches.has(item.id)) {
        const newType = currentSoldierTypes[Math.floor(Math.random() * currentSoldierTypes.length)];
        return {
           ...item,
           id: `gen-${Date.now()}-${Math.random()}`,
           type: newType,
           isMatched: false,
           isNew: true // Only newly spawned items get the flag
        };
      }
      // Explicitly clear isNew for survivors to prevent stale animations
      return { ...item, isNew: false };
    });
};

/**
 * Core Match-3 Algorithm.
 */
export const getMatches = (currentGrid: GridItem[], gridSize: number, scavengerLevel: number) => {
    const n = gridSize;
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
            
            if (type === UnitType.OBSTACLE && scavengerLevel === 0) {
                return;
            }
            
            // Logic: We return the matches, the Caller handles scoring
            buffer.forEach(m => matchedIds.add(m.id));

            if (isSoldier(type)) {
                let count = 1;
                if (buffer.length === 4) count = 2;
                if (buffer.length >= 5) count = 4;
                for (let k = 0; k < count; k++) typesToSummon.push(type);
            }
            if (type === UnitType.OBSTACLE && scavengerLevel > 0) {
                const availableSoldiers = [UnitType.INFANTRY, UnitType.ARCHER, UnitType.SHIELD, UnitType.SPEAR];
                for(let k=0; k < scavengerLevel; k++) {
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
    
    // 3. Diagonals
    for (let k = -(n - 1); k <= (n - 1); k++) {
        const diag: GridItem[] = [];
        for (let r = 0; r < n; r++) {
            const c = r - k;
            if (c >= 0 && c < n && matrix[r][c]) diag.push(matrix[r][c]!);
        }
        if (diag.length >= 3) checkLine(diag);
    }

    // 4. Anti-Diagonals
    for (let k = 0; k <= 2 * (n - 1); k++) {
        const diag: GridItem[] = [];
        for (let r = 0; r < n; r++) {
            const c = k - r;
            if (c >= 0 && c < n && matrix[r][c]) diag.push(matrix[r][c]!);
        }
        if (diag.length >= 3) checkLine(diag);
    }

    return { matches: matchedIds, types: typesToSummon, obstacleSummons };
};
