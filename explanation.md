# Block Commander 项目详解

**Block Commander** 是一款基于 React 和 TypeScript 开发的垂直视角策略网页游戏。它创新地将 **三消解谜 (Match-3 Puzzle)** 与 **自走棋战斗 (Auto-Battler)** 结合在一起，玩家需要通过消除方块来积攒兵力，并在随后自动进行的战斗中指挥军团击败敌人。

---

## 🎮 第一部分：玩法与机制 (Gameplay & Mechanics)

### 1. 游戏目标 (Objective)
玩家需要率领自己的军团通过 **7 个连续关卡**。
*   **Level 4 (Mini-Boss)**：遭遇百夫长 (Centurion) 指挥官，难度激增。
*   **Level 7 (Final Boss)**：遭遇先锋与督军双指挥官，最终决战。
*   若在任何一场战斗中全军覆没，游戏结束（Roguelike 机制，需重头开始）。

### 2. 核心循环 (Core Loop)
游戏由以下四个主要阶段构成循环：

1.  **地图阶段 (Map Phase)**：展示当前进度，关卡预览。
2.  **解谜阶段 (Puzzle Phase)**：
    *   **资源**：玩家拥有有限的“步数 (Steps)”。
    *   **操作**：玩家控制一名“指挥官”单位在网格上移动。移动时会与目标方块交换位置，这消耗 1 点步数。
    *   **消除**：当 3 个或更多相同的士兵图标连成一线（横、竖、斜）时，触发消除。
    *   **召唤**：被消除的士兵会进入“召唤队列 (Summon Queue)”。
    *   **策略**：你可以选择快速消除，或者花费步数调整位置以达成 4消、5消（获得更多兵力）。
3.  **战斗阶段 (Battle Phase)**：
    *   **入场**：召唤队列中的士兵与指挥官进入战场。
    *   **自动战斗**：所有单位根据预设的 AI 逻辑自动索敌、移动和攻击。
        *   *步兵 (Infantry)*：近战，快速接近。
        *   *弓手 (Archer)*：远程，保持距离。
        *   *盾兵 (Shield)*：高防，移动缓慢。
        *   *矛兵 (Spear)*：具备冲锋技能，造成高额伤害。
    *   **羁绊 (Synergy)**：指挥官拥有光环技能，例如“督军”会给所有“步兵”增加狂暴 Buff。
4.  **奖励阶段 (Reward Phase)**：
    *   若战斗胜利，根据表现获得宝石 (Gems)。
    *   进入商店界面，购买随机生成的奖励（新单位、属性升级、被动技能）。
    *   **幸存者机制**：战斗中存活的士兵会保留至下一关（有数量上限），这是滚雪球积累优势的关键。

---

## 📂 第二部分：项目结构与代码详解 (Project Structure)

本项目采用扁平化的组件结构，核心逻辑通过 Hook 分离。

### 1. 根目录核心文件

*   **`App.tsx` (状态机)**
    *   **作用**：游戏的“大脑”。管理全局 `GameState`，控制阶段流转 (`Phase.MENU` -> `Phase.PUZZLE` -> `Phase.BATTLE` 等)。
    *   **关键逻辑**：
        *   `handleBattleEnd`: 处理战斗胜负，计算宝石奖励，触发奖励屏幕或游戏结束。
        *   `applyRewardsAndRestoreArmy`: 关卡转换时的复杂状态计算。

*   **`types.ts`**
    *   定义了所有核心类型：`UnitType` (单位枚举), `GameState`, `BattleEntity` (战斗实体接口), `RewardDef` 等。

*   **`constants.ts`**
    *   游戏数值配置：关卡数 (`LEVELS_PER_RUN`), 计分规则, 初始资源配置。

### 2. 战斗模块 (`components/battle/`)

这是游戏最复杂的部分，实现了实时战斗循环。

*   **`useBattleLoop.ts` (核心循环)**
    *   **作用**：基于 `requestAnimationFrame` 的游戏主循环。
    *   **关键方法**：
        *   `loop(time)`: 每帧调用，驱动所有实体的 `tick()` 方法。
        *   `runAllyInspection(inspector, recipient)`: **双向检查机制**。当新单位入场时，它会检查场上已有单位是否能提供 Buff，同时场上单位也会检查它。这确保了后入场的指挥官（来自奖励）能正确给老兵加 Buff。
*   **`BattleZone.tsx`**
    *   **作用**：战斗场景的渲染层。处理单位的 DOM 渲染、血条、特效 (`VisualEffect`) 和弹道 (`Projectile`)。
*   **`battleUtils.ts`**
    *   **作用**：纯函数工具库。包含 距离计算 (`isInRange`)、伤害公式、移动插值算法。

### 3. 单位模块 (`components/units/`)

采用面向对象 (OOP) 设计模式来管理战斗实体。

*   **`BaseUnit.ts` (基类)**
    *   **作用**：所有单位的父类。
    *   **关键方法**：
        *   `tick()`: 每帧执行的 AI 逻辑（状态更新 -> 索敌 -> 移动/攻击）。
        *   `recalculateStats()`: 核心数值计算。基础数值 + 升级加成 + Buff加成 + 难度系数。
        *   `addBuff(buffId)`: 添加 Buff 并**立即**重算属性，智能处理血量上限增加时的回血逻辑。
*   **`CommanderUnit.ts` (继承类)**
    *   **作用**：指挥官逻辑。重写了 `onAllySpawned`，实现了“光环”逻辑（例如检测到新生成的 Archer，就给它加 `ELF_RANGE` Buff）。
*   **`UnitFactory.ts`**
    *   **作用**：工厂模式，根据 `UnitType` 字符串实例化对应的 Unit 类。

### 4. 解谜模块 (`components/puzzle/`)

*   **`usePuzzleLogic.ts`**
    *   **作用**：处理网格状态 (`grid`)、步数扣除、键盘/鼠标交互。
*   **`puzzleUtils.ts`**
    *   **作用**：包含三消算法。
    *   **关键方法**：
        *   `getMatches()`: 扫描网格的行、列、对角线，寻找 3 个以上连续相同的 ID。
        *   `generateInitialGrid()`: 生成包含指挥官、障碍物和士兵的随机网格。

### 5. 奖励与成长模块 (`components/rewards/`)

*   **`rewardUtils.ts`**
    *   **作用**：处理 Roguelike 商店逻辑。
    *   **关键方法**：
        *   `generateRewardOptions()`: **无放回加权随机算法**。生成 3-5 个奖励选项。包含“保底机制 (Pity System)”，确保第 3/6 关如果运气不好必定出现高稀有度奖励。
*   **`armyLogic.ts`**
    *   **作用**：处理过关时的兵力保留。
    *   **关键方法**：
        *   `restoreSurvivors()`: 计算哪些士兵能进入下一关。执行 `MAX_PER_UNIT_COUNT` 限制，防止兵力无限滚雪球。
*   **`rewardConfig.ts`**
    *   **作用**：定义所有奖励项（ID, 图标, 权重, 效果说明）。

### 6. 地图与配置 (`components/map/`)

*   **`levelConfig.ts`**
    *   **作用**：配置每一关的敌人配置（指挥官类型、士兵数量、数值倍率）。

---

## 🚀 快速上手指南

如果你想修改游戏：

1.  **修改数值**：去 `components/units/unitConfig.ts` 修改 `UNIT_STATS`（攻击、血量）。
2.  **修改关卡**：去 `components/map/levelConfig.ts` 调整每一关的敌人。
3.  **新增奖励**：
    *   在 `components/rewards/rewardConfig.ts` 定义新 ID 和属性。
    *   在 `components/rewards/rewardUtils.ts` 的 `applyRewardEffect` 中实现效果。
4.  **调整战斗逻辑**：
    *   AI 行为：修改 `BaseUnit.ts` 的 `updateBehavior`。
    *   Buff 逻辑：修改 `CommanderUnit.ts` 或 `unitConfig.ts` 中的 `BUFF_CONFIG`。

祝你在代码的世界里指挥若定！
