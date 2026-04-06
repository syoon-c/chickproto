// Farm board spawning, merge, and harvest rules.

function getFarmExpTarget(level = state.farm.level) {
  const safeLevel = Math.max(1, Number(level || 1));
  return 4 + safeLevel * 2;
}

function getFarmMaxCharges(level = state.farm.level) {
  const safeLevel = Math.max(1, Number(level || 1));
  if (safeLevel >= 8) {
    return 50;
  }
  if (safeLevel >= 3) {
    return 40;
  }
  return 30;
}

function syncFarmChargeCapacity(targetState = state) {
  const maxCharges = getFarmMaxCharges(targetState.farm.level);
  targetState.farm.maxCharges = maxCharges;
  targetState.farm.charges = Math.min(maxCharges, Math.max(0, Number(targetState.farm.charges || 0)));
  return maxCharges;
}

function rollFarmSpawnKind() {
  const family = Math.random() > 0.5 ? "garden" : "dairy";
  const tiers = family === "garden" ? ["seed", "sprout", "flower"] : ["calf", "cow", "milkCow"];
  const roll = Math.random();
  const chanceTier2 = 0.05;
  const chanceTier3 = 0.03;

  if (roll < chanceTier3) {
    return tiers[2];
  }
  if (roll < chanceTier3 + chanceTier2) {
    return tiers[1];
  }
  return tiers[0];
}

function createFarmItem(kind, farmState) {
  return {
    id: `farm-item-${farmState.itemSeq++}`,
    kind,
  };
}

function createInitialFarmState() {
  const farm = {
    level: 1,
    exp: 0,
    charges: FARM_STARTING_CHARGES,
    maxCharges: FARM_MAX_CHARGES,
    nextChargeAt: 0,
    itemSeq: 1,
    generatedCount: 0,
    harvests: 0,
    inventory: {},
    board: Array.from({ length: FARM_ROWS * FARM_COLS }, () => null),
    lastRewardText: "같은 재료 3개를 모아 최종 단계 보상을 열어보자.",
  };
  syncFarmChargeCapacity({ farm });
  seedFarmBoard(farm);
  return farm;
}

function seedFarmBoard(farmState) {
  const seedLayout = [
    [0, "milkCow"],
    [1, "milkCow"],
    [2, "cow"],
    [3, "cow"],
    [4, "calf"],
    [5, "calf"],
    [8, "flower"],
    [9, "flower"],
    [10, "sprout"],
    [11, "sprout"],
    [12, "seed"],
    [13, "seed"],
  ];
  for (const [index, kind] of seedLayout) {
    farmState.board[index] = createFarmItem(kind, farmState);
  }
}

function getFarmCellRect(index) {
  const cell = FARM_CELL_POSITIONS[index];
  if (!cell) {
    return null;
  }
  return {
    x: cell.x,
    y: cell.y,
    width: FARM_CELL_SIZE,
    height: FARM_CELL_SIZE,
  };
}

function getFarmCellIndexAt(viewportX, viewportY) {
  return FARM_CELL_POSITIONS.findIndex(
    (cell) =>
      viewportX >= cell.x &&
      viewportX <= cell.x + FARM_CELL_SIZE &&
      viewportY >= cell.y &&
      viewportY <= cell.y + FARM_CELL_SIZE
  );
}

function getEmptyFarmCellIndexes(targetState = state) {
  return targetState.farm.board.reduce((acc, item, index) => {
    if (!item) {
      acc.push(index);
    }
    return acc;
  }, []);
}

function addFarmExp(amount, targetState = state) {
  const gain = Math.max(0, Number(amount || 0));
  if (gain <= 0) {
    return 0;
  }

  targetState.farm.exp = Math.max(0, Number(targetState.farm.exp || 0)) + gain;
  let levelUps = 0;

  while (targetState.farm.exp >= getFarmExpTarget(targetState.farm.level)) {
    targetState.farm.exp -= getFarmExpTarget(targetState.farm.level);
    targetState.farm.level += 1;
    levelUps += 1;
  }

  syncFarmChargeCapacity(targetState);

  if (levelUps > 0) {
    targetState.farm.lastRewardText = `농장 Lv.${targetState.farm.level} 달성! 더 다양한 재료가 열리기 시작했다.`;
    if (targetState === state) {
      showToast(`농장 Lv.${targetState.farm.level}!`);
    }
  }

  return levelUps;
}

function ensureFarmChargeTimer(targetState = state) {
  syncFarmChargeCapacity(targetState);
  if (targetState.farm.charges >= targetState.farm.maxCharges) {
    targetState.farm.nextChargeAt = 0;
    return;
  }
  if (targetState.farm.nextChargeAt <= 0) {
    targetState.farm.nextChargeAt = targetState.clock + FARM_CHARGE_INTERVAL;
  }
}

function updateFarmRecharge() {
  ensureFarmChargeTimer(state);
  while (
    state.farm.charges < state.farm.maxCharges &&
    state.farm.nextChargeAt > 0 &&
    state.clock >= state.farm.nextChargeAt
  ) {
    state.farm.charges = Math.min(state.farm.maxCharges, state.farm.charges + 5);
    if (state.farm.charges >= state.farm.maxCharges) {
      state.farm.nextChargeAt = 0;
      break;
    }
    state.farm.nextChargeAt += FARM_CHARGE_INTERVAL;
  }
}

function spawnFarmBaseItem(targetState = state, options = {}) {
  const empties = getEmptyFarmCellIndexes(targetState);
  const shouldConsumeCharge = options.consumeCharge !== false;
  if (empties.length === 0 || (shouldConsumeCharge && targetState.farm.charges <= 0)) {
    return false;
  }

  const spawnIndex = empties[Math.floor(Math.random() * empties.length)];
  const kind = options.kind || rollFarmSpawnKind();
  targetState.farm.board[spawnIndex] = createFarmItem(kind, targetState.farm);
  if (shouldConsumeCharge) {
    targetState.farm.charges -= 1;
    ensureFarmChargeTimer(targetState);
    addFarmExp(1, targetState);
    targetState.farm.generatedCount = Math.max(0, Number(targetState.farm.generatedCount || 0)) + 1;
    targetState.farm.lastRewardText = `${FARM_ITEM_META[kind].name}이(가) 밭에 놓였다. 같은 재료를 모아보자.`;
  } else {
    targetState.farm.lastRewardText = options.note || `직원이 ${FARM_ITEM_META[kind].name}을(를) 밭에 챙겨뒀다.`;
  }
  return { index: spawnIndex, kind };
}

function getFarmNeighborIndexes(index) {
  const row = Math.floor(index / FARM_COLS);
  const col = index % FARM_COLS;
  const neighbors = [];
  if (row > 0) neighbors.push(index - FARM_COLS);
  if (row < FARM_ROWS - 1) neighbors.push(index + FARM_COLS);
  if (col > 0) neighbors.push(index - 1);
  if (col < FARM_COLS - 1) neighbors.push(index + 1);
  return neighbors;
}

function findFarmCluster(startIndex, board = state.farm.board) {
  const startItem = board[startIndex];
  if (!startItem) {
    return [];
  }
  const queue = [startIndex];
  const visited = new Set([startIndex]);
  const cluster = [];

  while (queue.length > 0) {
    const current = queue.shift();
    cluster.push(current);
    for (const neighbor of getFarmNeighborIndexes(current)) {
      if (visited.has(neighbor)) {
        continue;
      }
      const neighborItem = board[neighbor];
      if (!neighborItem || neighborItem.kind !== startItem.kind) {
        continue;
      }
      visited.add(neighbor);
      queue.push(neighbor);
    }
  }

  return cluster;
}

function resolveFarmMergeAt(sourceIndex, targetIndex, targetState = state) {
  if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0) {
    return false;
  }

  const sourceItem = targetState.farm.board[sourceIndex];
  const targetItem = targetState.farm.board[targetIndex];
  if (!sourceItem || !targetItem) {
    return false;
  }

  const nextId = FARM_ITEM_META[targetItem.kind]?.nextId;
  if (sourceItem.kind !== targetItem.kind || !nextId) {
    return false;
  }

  targetState.farm.board[sourceIndex] = null;
  const cluster = findFarmCluster(targetIndex, targetState.farm.board);
  const totalCount = cluster.length + 1;

  if (totalCount < 3) {
    targetState.farm.board[sourceIndex] = sourceItem;
    return false;
  }

  const upgradeCount = totalCount === 5 ? 2 : Math.floor(totalCount / 3);
  const remainderCount = totalCount === 5 ? 0 : totalCount % 3;
  const upgradeLocations = [targetIndex];
  if (upgradeCount > 1) {
    const available = cluster.filter((index) => index !== targetIndex);
    for (let i = 0; i < upgradeCount - 1; i += 1) {
      if (available[i] !== undefined) {
        upgradeLocations.push(available[i]);
      }
    }
  }

  for (const cellIndex of cluster) {
    targetState.farm.board[cellIndex] = null;
  }
  for (const cellIndex of upgradeLocations) {
    targetState.farm.board[cellIndex] = createFarmItem(nextId, targetState.farm);
  }

  if (remainderCount > 0) {
    const allInvolved = [sourceIndex, ...cluster];
    const usedSet = new Set(upgradeLocations);
    const freeSlots = allInvolved.filter((index) => !usedSet.has(index));
    for (let i = 0; i < remainderCount; i += 1) {
      if (freeSlots[i] !== undefined) {
        targetState.farm.board[freeSlots[i]] = createFarmItem(sourceItem.kind, targetState.farm);
      }
    }
  }

  targetState.farm.lastRewardText = `${FARM_ITEM_META[sourceItem.kind].name} ${totalCount}개가 합쳐져 ${FARM_ITEM_META[nextId].name}이(가) 됐다.`;
  showToast(`${FARM_ITEM_META[nextId].name} 생성`);
  return true;
}

function moveFarmItem(sourceIndex, targetIndex, targetState = state) {
  if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0) {
    return false;
  }

  const sourceItem = targetState.farm.board[sourceIndex];
  if (!sourceItem) {
    return false;
  }

  const targetItem = targetState.farm.board[targetIndex];
  if (!targetItem) {
    targetState.farm.board[targetIndex] = sourceItem;
    targetState.farm.board[sourceIndex] = null;
    targetState.farm.lastRewardText = `${FARM_ITEM_META[sourceItem.kind].name} 위치를 옮겼다.`;
    return true;
  }

  if (resolveFarmMergeAt(sourceIndex, targetIndex, targetState)) {
    return true;
  }

  targetState.farm.board[targetIndex] = sourceItem;
  targetState.farm.board[sourceIndex] = targetItem;
  targetState.farm.lastRewardText = `${FARM_ITEM_META[sourceItem.kind].name} 위치를 옮겼다.`;
  return true;
}

function isStarterSandwichFarmGuidanceActive(targetState = state) {
  return false;
}

function getStarterSandwichFarmReward(finalKind, targetState = state) {
  if (!isStarterSandwichFarmGuidanceActive(targetState)) {
    return null;
  }
  const family = FARM_ITEM_META[finalKind]?.family;
  if (family === "garden") {
    return {
      rewardId: "flour",
      amount: 5 + Math.floor(Math.random() * 4),
    };
  }
  if (family === "dairy") {
    return {
      rewardId: "cheese",
      amount: 2 + Math.floor(Math.random() * 3),
    };
  }
  return null;
}

function getFarmGuaranteedReward(finalKind) {
  const family = FARM_ITEM_META[finalKind]?.family;
  return family ? FARM_REWARD_POOLS_BY_FAMILY[family] || null : null;
}

function getFarmRewardRollCount(level = state.farm.level) {
  const safeLevel = Math.max(1, Number(level || 1));
  const levelForCurve = Math.min(safeLevel, 10);
  const minCount = 3 + Math.floor(((levelForCurve - 1) * 3) / 9);
  const maxCount = Math.min(7, minCount + (levelForCurve >= 3 ? 1 : 0));
  return {
    minCount,
    maxCount,
  };
}

function getFarmRewardPool(finalKind, targetState = state) {
  const family = FARM_ITEM_META[finalKind]?.family;
  if (!family) {
    return [];
  }
  const level = Math.max(1, Number(targetState.farm?.level || 1));
  return (FARM_REWARD_POOLS_BY_FAMILY[family] || [])
    .filter((entry) => level >= entry.unlockLevel)
    .map((entry) => ({
      ...entry,
      weight: entry.baseWeight + Math.max(0, level - entry.unlockLevel) * entry.growthPerLevel,
    }));
}

function rollFarmRewardUnits(finalKind, targetState = state) {
  const pool = getFarmRewardPool(finalKind, targetState);
  if (pool.length === 0) {
    return null;
  }
  const level = Math.max(1, Number(targetState.farm?.level || 1));
  const { minCount, maxCount } = getFarmRewardRollCount(level);
  const drawCount = minCount + Math.floor(Math.random() * Math.max(1, maxCount - minCount + 1));
  const rewards = {};
  for (let i = 0; i < drawCount; i += 1) {
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = Math.random() * totalWeight;
    let chosen = pool[0];
    for (const entry of pool) {
      cursor -= entry.weight;
      if (cursor <= 0) {
        chosen = entry;
        break;
      }
    }
    rewards[chosen.rewardId] = (rewards[chosen.rewardId] || 0) + 1;
  }
  return rewards;
}

function rollFarmReward(finalKind, targetState = state) {
  const starterReward = getStarterSandwichFarmReward(finalKind, targetState);
  if (starterReward) {
    return {
      [starterReward.rewardId]: starterReward.amount,
    };
  }
  return rollFarmRewardUnits(finalKind, targetState);
}

function getFarmHarvestBonusChance(targetState = state) {
  return Math.max(0, Number(targetState.study?.skillBonuses?.farmBonusChance || 0));
}

function collectFarmFinal(index, targetState = state) {
  const item = targetState.farm.board[index];
  if (!item) {
    return false;
  }

  const meta = FARM_ITEM_META[item.kind];
  const isHarvestable = Boolean(meta?.final) || meta?.tier >= 4;
  if (!isHarvestable) {
    return false;
  }

  const rewards = rollFarmReward(item.kind, targetState);
  const rewardEntries = Object.entries(rewards || {}).filter(([, amount]) => Number(amount) > 0);
  if (rewardEntries.length === 0) {
    return false;
  }

  const bonusTriggered = Math.random() < getFarmHarvestBonusChance(targetState);
  const finalRewardEntries = rewardEntries.map(([rewardId, amount]) => [
    rewardId,
    bonusTriggered ? Number(amount) * 2 : Number(amount),
  ]);

  targetState.farm.board[index] = null;
  for (const [rewardId, amount] of finalRewardEntries) {
    targetState.farm.inventory[rewardId] = (targetState.farm.inventory[rewardId] || 0) + amount;
  }
  targetState.farm.harvests += 1;
  const rewardLines = finalRewardEntries.map(([rewardId, amount]) => {
    const rewardMeta = FARM_REWARD_META[rewardId];
    return `${rewardMeta.icon} ${rewardMeta.name} ${formatNumber(amount)}개`;
  });
  targetState.farm.lastRewardText = bonusTriggered
    ? `보너스! x2 · ${rewardLines.join(" + ")} 획득!`
    : `${rewardLines.join(" + ")} 획득!`;
  showToast(bonusTriggered ? `보너스! x2 · ${rewardLines.join(" + ")}` : rewardLines.join(" + "), {
    anchorRect: getFarmCellRect(index),
  });
  return true;
}
