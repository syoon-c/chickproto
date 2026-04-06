// Core gameplay systems: recipes, restaurant loop, rank, social, and customer flow.

function getCurrentRankTier(targetState = state) {
  return RANK_TIERS[targetState.rank.tierIndex] || RANK_TIERS[0];
}

function getNextRankTier(targetState = state) {
  return RANK_TIERS[targetState.rank.tierIndex + 1] || null;
}

function getRankTitle(rankIndex) {
  return RANK_TIERS[rankIndex]?.title || "미정";
}

const RANK_RECIPE_UNLOCKS_BY_TIER = {
  1: ["sandwich"],
  2: ["hotdog", "soup"],
  3: ["omelet", "skewers"],
  4: ["kimbap", "pizza"],
  5: ["friedrice", "grilledfish"],
  6: ["burger", "wedges"],
  7: ["bibimbap"],
  8: ["dimsum"],
  9: ["pasta"],
  10: ["taco"],
  11: ["ramen"],
  12: ["friednoodles"],
  13: ["tonkatsu"],
  14: ["curry"],
  15: ["chicken"],
  16: ["gnocchi"],
  17: ["sushi"],
  18: ["bulgogi"],
  19: ["steak"],
};

const RANK_FEATURE_UNLOCK_TIER = {
  study: 0,
  recipe: 1,
  outing: 1,
  farm: 1,
  expansion: 1,
  sns: 3,
  specialGuests: 4,
  codex: 4,
  staff: 5,
  interview: 5,
};

const RANK_RESET_METRICS = new Set([
  "servedCount",
  "promotionActions",
  "ownPosts",
  "farmGenerations",
  "farmHarvests",
]);

const MENU_LAUNCH_BONUS_DURATION_BY_RARITY = {
  basic: 180,
  rare: 300,
  epic: 600,
};

const MENU_LAUNCH_BONUS_SALES_MULTIPLIER = 2;
const MENU_LAUNCH_BONUS_CUSTOMER_INTERVAL = 1.2;

function isRankFeatureUnlocked(featureId, targetState = state) {
  const requiredTier = RANK_FEATURE_UNLOCK_TIER[featureId];
  if (requiredTier === undefined) {
    return true;
  }
  return targetState.rank.tierIndex >= requiredTier;
}

function getRecipeRankUnlockTier(recipeId) {
  for (const [tierIndex, recipeIds] of Object.entries(RANK_RECIPE_UNLOCKS_BY_TIER)) {
    if (recipeIds.includes(recipeId)) {
      return Number(tierIndex);
    }
  }
  return null;
}

function getRecipeRegistrationsCount(targetState = state) {
  return Math.max(0, getOwnedRecipeCount(targetState) - 1);
}

function ensureRankProgressBaselines(targetState = state) {
  if (!isPlainObject(targetState.rank)) {
    targetState.rank = { tierIndex: 0, readyNoticeTier: -1 };
  }
  if (!isPlainObject(targetState.rank.progressBaselines)) {
    targetState.rank.progressBaselines = {
      served: 0,
      promotionActions: 0,
      ownPosts: 0,
      recipeRegistrations: 0,
      farmGenerations: 0,
      farmHarvests: 0,
      recipeServedCounts: {},
    };
  }
  if (!isPlainObject(targetState.rank.progressBaselines.recipeServedCounts)) {
    targetState.rank.progressBaselines.recipeServedCounts = {};
  }
  return targetState.rank.progressBaselines;
}

function captureRankProgressBaselines(targetState = state) {
  const baselines = ensureRankProgressBaselines(targetState);
  baselines.served = Number(targetState.metrics?.served || 0);
  baselines.promotionActions = Number(targetState.metrics?.promotionActions || 0);
  baselines.ownPosts = Number(targetState.social?.ownPostCount || 0);
  baselines.recipeRegistrations = getRecipeRegistrationsCount(targetState);
  baselines.farmGenerations = Number(targetState.farm?.generatedCount || 0);
  baselines.farmHarvests = Number(targetState.farm?.harvests || 0);
  baselines.recipeServedCounts = {
    ...(isPlainObject(targetState.metrics?.recipeServedCounts) ? targetState.metrics.recipeServedCounts : {}),
  };
  return baselines;
}

function getRankResetMetricValue(metricId, targetState = state) {
  const baselines = ensureRankProgressBaselines(targetState);
  if (metricId === "servedCount") {
    return Math.max(0, Number(targetState.metrics?.served || 0) - Number(baselines.served || 0));
  }
  if (metricId === "promotionActions") {
    return Math.max(
      0,
      Number(targetState.metrics?.promotionActions || 0) - Number(baselines.promotionActions || 0)
    );
  }
  if (metricId === "ownPosts") {
    return Math.max(0, Number(targetState.social?.ownPostCount || 0) - Number(baselines.ownPosts || 0));
  }
  if (metricId === "recipeRegistrations") {
    return Math.max(0, getRecipeRegistrationsCount(targetState) - Number(baselines.recipeRegistrations || 0));
  }
  if (metricId === "farmGenerations") {
    return Math.max(
      0,
      Number(targetState.farm?.generatedCount || 0) - Number(baselines.farmGenerations || 0)
    );
  }
  if (metricId === "farmHarvests") {
    return Math.max(0, Number(targetState.farm?.harvests || 0) - Number(baselines.farmHarvests || 0));
  }
  return 0;
}

function getRecipeServedMetricRecipeId(metricId) {
  if (typeof metricId !== "string" || !metricId.startsWith("recipeServed:")) {
    return null;
  }
  return metricId.slice("recipeServed:".length) || null;
}

function getRecipeLevelMetricRecipeId(metricId) {
  if (typeof metricId !== "string" || !metricId.startsWith("recipeLevel:")) {
    return null;
  }
  return metricId.slice("recipeLevel:".length) || null;
}

function isRecipeUnlocked(recipe, targetState = state) {
  if (!recipe) {
    return false;
  }
  if (targetState.recipes?.manualUnlocks?.[recipe.id]) {
    return true;
  }
  const rankUnlockTier = getRecipeRankUnlockTier(recipe.id);
  if (rankUnlockTier !== null) {
    return targetState.rank.tierIndex >= rankUnlockTier;
  }
  const rule = recipe.unlockRule || { type: "none" };
  if (rule.type === "none") {
    return true;
  }
  if (rule.type === "study") {
    return targetState.study.level >= rule.value;
  }
  if (rule.type === "rank") {
    return targetState.rank.tierIndex >= rule.value;
  }
  if (rule.type === "served") {
    return targetState.metrics.served >= rule.value;
  }
  if (rule.type === "expansion") {
    return targetState.restaurant.expansionIndex >= rule.value;
  }
  if (rule.type === "followers") {
    return targetState.social.followers >= rule.value;
  }
  if (rule.type === "specialSatisfied") {
    return getSpecialSatisfiedCount(targetState) >= rule.value;
  }
  if (rule.type === "farmLevel") {
    return targetState.farm.level >= rule.value;
  }
  return false;
}

function getUnlockedRecipes(targetState = state) {
  return RECIPE_CATALOG.filter((recipe) => isRecipeUnlocked(recipe, targetState));
}

function getLockedRecipes(targetState = state) {
  return RECIPE_CATALOG.filter((recipe) => !isRecipeUnlocked(recipe, targetState));
}

function getRecipeVariantPrefix(recipe, level) {
  if (!recipe) {
    return "";
  }
  if (level >= (RECIPE_PROGRESS_MILESTONES?.[2] || 10)) {
    return RECIPE_VARIANT_PREFIX_BY_INGREDIENT?.[recipe.ingredientProfile?.special] || "시그니처";
  }
  if (level >= (RECIPE_PROGRESS_MILESTONES?.[1] || 6)) {
    return RECIPE_VARIANT_PREFIX_BY_INGREDIENT?.[recipe.ingredientProfile?.secondary] || "특제";
  }
  if (level >= (RECIPE_PROGRESS_MILESTONES?.[0] || 3)) {
    return "특제";
  }
  return "";
}

function getRecipeStageLabel(level) {
  if (level >= (RECIPE_PROGRESS_MILESTONES?.[2] || 10)) {
    return "궁극";
  }
  if (level >= (RECIPE_PROGRESS_MILESTONES?.[1] || 6)) {
    return "시그니처";
  }
  if (level >= (RECIPE_PROGRESS_MILESTONES?.[0] || 3)) {
    return "특제";
  }
  return "기본";
}

function getRecipeCurrentLevel(recipeId, targetState = state) {
  return Math.max(1, Number(targetState.recipes?.owned?.[recipeId]?.level || 1));
}

function getRecipeNameByLevel(recipeId, level = 1) {
  const recipe = getRecipe(recipeId);
  if (!recipe) {
    return "알 수 없는 메뉴";
  }
  const prefix = getRecipeVariantPrefix(recipe, level);
  return prefix ? `${prefix} ${recipe.name}` : recipe.name;
}

function getRecipeDisplayName(recipeId, level = null) {
  return `${getRecipe(recipeId)?.emoji || "🍽️"} ${getRecipeNameByLevel(
    recipeId,
    level ?? getRecipeCurrentLevel(recipeId)
  )}`;
}

function getIngredientAmount(rewardId, targetState = state) {
  return Math.max(0, Number(targetState.farm?.inventory?.[rewardId] || 0));
}

function getIngredientTotalCount(targetState = state) {
  return Object.values(targetState.farm?.inventory || {}).reduce((sum, count) => sum + Number(count || 0), 0);
}

function normalizeIngredientCost(cost) {
  return Object.entries(cost || {}).reduce((acc, [rewardId, amount]) => {
    const normalizedAmount = Math.max(0, Number(amount || 0));
    if (normalizedAmount > 0) {
      acc[rewardId] = normalizedAmount;
    }
    return acc;
  }, {});
}

function hasIngredientCost(cost, targetState = state) {
  return Object.entries(normalizeIngredientCost(cost)).every(
    ([rewardId, amount]) => getIngredientAmount(rewardId, targetState) >= amount
  );
}

function consumeIngredientCost(cost, targetState = state) {
  const normalized = normalizeIngredientCost(cost);
  if (!hasIngredientCost(normalized, targetState)) {
    return false;
  }
  for (const [rewardId, amount] of Object.entries(normalized)) {
    targetState.farm.inventory[rewardId] = Math.max(0, getIngredientAmount(rewardId, targetState) - amount);
    if (targetState.farm.inventory[rewardId] <= 0) {
      delete targetState.farm.inventory[rewardId];
    }
  }
  return true;
}

function getRecipeCraftCost(recipeId) {
  return normalizeIngredientCost(getRecipe(recipeId)?.craftCost || {});
}

function hasRecipeUnlockBeenAnnounced(recipeId, targetState = state) {
  return Boolean(targetState.recipes?.announcedUnlocks?.[recipeId]);
}

function markRecipeUnlockAnnounced(recipeId, targetState = state) {
  if (!recipeId) {
    return;
  }
  if (!isPlainObject(targetState.recipes?.announcedUnlocks)) {
    targetState.recipes.announcedUnlocks = {};
  }
  targetState.recipes.announcedUnlocks[recipeId] = true;
}

function getRecipeUpgradeCost(recipeId, level = getRecipeCurrentLevel(recipeId)) {
  const recipe = getRecipe(recipeId);
  if (!recipe || level >= RECIPE_MAX_LEVEL) {
    return null;
  }

  const nextLevel = level + 1;
  const { primary, secondary, special } = recipe.ingredientProfile || {};
  if (recipeId === "sandwich" && nextLevel === 2) {
    return normalizeIngredientCost({
      [primary]: 2,
      [secondary]: 1,
    });
  }
  if (EARLY_RECIPE_IDS?.has(recipeId)) {
    const earlyCost = {};
    earlyCost[primary] = 1 + nextLevel;
    earlyCost[secondary] = Math.max(1, Math.ceil(nextLevel / 2));
    if (nextLevel >= 4) {
      earlyCost[special] = Math.max(1, Math.ceil((nextLevel - 3) / 2));
    }
    if (nextLevel >= 8) {
      earlyCost[primary] += 1;
      earlyCost[secondary] += 1;
    }
    return normalizeIngredientCost(earlyCost);
  }
  const cost = {};
  cost[primary] = 3 + recipe.grade * 2 + nextLevel;
  cost[secondary] = 2 + recipe.grade + Math.ceil(nextLevel * 0.7);
  if (nextLevel >= 3) {
    cost[special] = Math.max(1, Math.ceil((nextLevel - 2) / 2));
  }
  if (nextLevel >= 6) {
    cost[special] += recipe.grade - 1;
  }
  if (nextLevel >= 9) {
    cost[primary] += 3;
    cost[secondary] += 2;
  }
  return normalizeIngredientCost(cost);
}

function describeRecipeUnlock(recipe) {
  const rankUnlockTier = getRecipeRankUnlockTier(recipe?.id);
  if (rankUnlockTier !== null) {
    return `${getRankTitle(rankUnlockTier)} 승급`;
  }
  const rule = recipe?.unlockRule || { type: "none" };
  if (rule.type === "none") {
    return "초기부터 연구 가능";
  }
  if (rule.type === "study") {
    return `공부 Lv.${formatNumber(rule.value)} 달성`;
  }
  if (rule.type === "rank") {
    return `${getRankTitle(rule.value)} 달성`;
  }
  if (rule.type === "served") {
    return `누적 서빙 ${formatNumber(rule.value)}회`;
  }
  if (rule.type === "expansion") {
    return `확장 ${formatNumber(rule.value)}단계`;
  }
  if (rule.type === "followers") {
    return `팔로워 ${formatNumber(rule.value)}명`;
  }
  if (rule.type === "specialSatisfied") {
    return `특별 손님 만족 ${formatNumber(rule.value)}명`;
  }
  if (rule.type === "farmLevel") {
    return `농장 Lv.${formatNumber(rule.value)} 달성`;
  }
  return "추가 연구 필요";
}

function getUnlockedProfilesByRank(targetState = state) {
  if (!isRankFeatureUnlocked("specialGuests", targetState)) {
    return [];
  }
  return CUSTOMER_PROFILES.filter(
    (profile) => targetState.rank.tierIndex >= (profile.minRankIndex || 0)
  );
}

function getMenuLaunchBonus(targetState = state) {
  const bonus = targetState.restaurant?.menuLaunchBonus;
  if (!isPlainObject(bonus) || !bonus.recipeId) {
    return null;
  }
  return bonus;
}

function isMenuLaunchBonusActive(targetState = state) {
  const bonus = getMenuLaunchBonus(targetState);
  return Boolean(bonus && Number(bonus.expiresAt || 0) > Number(targetState.clock || 0));
}

function getMenuLaunchBonusRemainingSeconds(targetState = state) {
  const bonus = getMenuLaunchBonus(targetState);
  if (!bonus) {
    return 0;
  }
  return Math.max(0, Number(bonus.expiresAt || 0) - Number(targetState.clock || 0));
}

function clearMenuLaunchBonus(targetState = state) {
  if (targetState.restaurant) {
    targetState.restaurant.menuLaunchBonus = null;
  }
}

function getMenuLaunchBonusCustomerBurstSize(targetState = state) {
  const bonus = getMenuLaunchBonus(targetState);
  if (!bonus) {
    return 0;
  }
  if (bonus.rarity === "epic") {
    return 3;
  }
  if (bonus.rarity === "rare") {
    return 2;
  }
  return 2;
}

function triggerMenuLaunchBonus(recipe, targetState = state) {
  if (!recipe || !targetState.restaurant) {
    return null;
  }
  const rarity = recipe.rarity || "basic";
  const duration = MENU_LAUNCH_BONUS_DURATION_BY_RARITY[rarity] || MENU_LAUNCH_BONUS_DURATION_BY_RARITY.basic;
  targetState.restaurant.menuLaunchBonus = {
    recipeId: recipe.id,
    rarity,
    startedAt: Number(targetState.clock || 0),
    expiresAt: Number(targetState.clock || 0) + duration,
    duration,
    nextGuestAt: Number(targetState.clock || 0),
  };
  pushTopNotice({
    type: "menu-launch",
    icon: "🎉",
    copy: `신메뉴 등록 보너스! ${recipe.name}`,
  });
  pushLog(`${recipe.emoji} ${recipe.name} 신메뉴 등록 보너스 시작! ${formatDuration(duration)} 동안 손님 붐 · 수익 x2`);
  return targetState.restaurant.menuLaunchBonus;
}

function updateMenuLaunchBonus(targetState = state) {
  const bonus = getMenuLaunchBonus(targetState);
  if (!bonus) {
    return false;
  }
  if (Number(bonus.expiresAt || 0) <= Number(targetState.clock || 0)) {
    clearMenuLaunchBonus(targetState);
    pushLog("신메뉴 등록 보너스가 끝났다.");
    refreshAllUI();
    return true;
  }
  if (targetState.mode !== "playing") {
    return false;
  }
  let spawned = false;
  while (Number(bonus.nextGuestAt || 0) <= Number(targetState.clock || 0)) {
    const burstSize = getMenuLaunchBonusCustomerBurstSize(targetState);
    for (let index = 0; index < burstSize; index += 1) {
      if (queueCustomer(targetState)) {
        spawned = true;
      }
    }
    bonus.nextGuestAt += MENU_LAUNCH_BONUS_CUSTOMER_INTERVAL;
  }
  return spawned;
}

function getCurrentExpansionStage(targetState = state) {
  return Math.max(0, Number(targetState.restaurant?.expansionIndex || 0));
}

function getExpansionStageCapForRank(targetState = state) {
  const maxExpansionStage = Math.max(0, EXPANSION_SEQUENCE.length);
  if (!isRankFeatureUnlocked("expansion", targetState)) {
    return 0;
  }
  return maxExpansionStage;
}

function canBuyMoreExpansionsForRank(targetState = state) {
  if (!isRankFeatureUnlocked("expansion", targetState)) {
    return false;
  }
  return targetState.restaurant.expansionIndex < EXPANSION_SEQUENCE.length;
}

function getFirstSpecialGuestProfile() {
  return CUSTOMER_PROFILES[0] || null;
}

function summarizeUnlockNames(labels, suffix, maxVisible = 2) {
  if (labels.length === 0) {
    return "";
  }
  if (labels.length <= maxVisible) {
    return labels.join(", ");
  }
  return `${labels.slice(0, maxVisible).join(", ")} 외 ${labels.length - maxVisible}${suffix}`;
}

function getRankUnlockPayload(fromTierIndex, toTierIndex) {
  const fromState = { ...state, rank: { ...state.rank, tierIndex: fromTierIndex } };
  const toState = { ...state, rank: { ...state.rank, tierIndex: toTierIndex } };
  const nextGuests = [];
  const crossedSpecialGuestUnlock =
    !isRankFeatureUnlocked("specialGuests", fromState) && isRankFeatureUnlocked("specialGuests", toState);
  if (crossedSpecialGuestUnlock) {
    const firstGuest = getFirstSpecialGuestProfile();
    if (firstGuest) {
      nextGuests.push(firstGuest);
    }
  }
  const nextRecipes = (RANK_RECIPE_UNLOCKS_BY_TIER[toTierIndex] || [])
    .map((recipeId) => getRecipe(recipeId))
    .filter(Boolean);
  const chips = [];

  if (nextRecipes.length > 0) {
    chips.push(
      `🍳 새 레시피: ${summarizeUnlockNames(
        nextRecipes.map((recipe) => recipe.name),
        "종"
      )}`
    );
  }

  return {
    recipes: nextRecipes,
    guests: nextGuests,
    chips,
  };
}

function getSpecialServedCount(targetState = state) {
  return CUSTOMER_PROFILES.reduce((sum, profile) => sum + getCodexEntry(targetState, profile.id).servedCount, 0);
}

function getSpecialSatisfiedCount(targetState = state) {
  return CUSTOMER_PROFILES.reduce(
    (sum, profile) => sum + getCodexEntry(targetState, profile.id).satisfiedServedCount,
    0
  );
}

function getSpecialDiscoveredCount(targetState = state) {
  return CUSTOMER_PROFILES.reduce(
    (sum, profile) => sum + (getCodexEntry(targetState, profile.id).seen ? 1 : 0),
    0
  );
}

function getOwnedRecipeCount(targetState = state) {
  return Object.keys(targetState.recipes.owned).length;
}

function getHighestRecipeLevel(targetState = state) {
  const levels = Object.values(targetState.recipes.owned).map((owned) => owned.level);
  return levels.length > 0 ? Math.max(...levels) : 0;
}

function getTotalStaffLevels(targetState = state) {
  return STAFF_ORDER.reduce((sum, staffId) => sum + (targetState.staffs[staffId]?.level || 0), 0);
}

function getDecorScore(targetState = state) {
  const purchased = targetState.restaurant.purchased.length * 28;
  const ambience = targetState.restaurant.ambience * 72;
  const tableBonus = Math.max(0, targetState.restaurant.tables.length - INITIAL_TABLE_COUNT) * 26;
  const stoveBonus = Math.max(0, targetState.restaurant.stoves.length - INITIAL_STOVE_COUNT) * 32;
  return purchased + ambience + tableBonus + stoveBonus;
}

function getRankMetricValue(metricId, targetState = state) {
  if (RANK_RESET_METRICS.has(metricId)) {
    return getRankResetMetricValue(metricId, targetState);
  }
  if (metricId === "taggedPosts") {
    return targetState.social.taggedPosts.length;
  }
  if (metricId === "studyLevel") {
    return targetState.study.level;
  }
  if (metricId === "satisfiedCustomers") {
    const counts = targetState.metrics?.satisfactionCounts || {};
    return Number(counts.delighted || 0) + Number(counts.happy || 0);
  }
  if (metricId === "followers") {
    return targetState.social.followers;
  }
  if (metricId === "ownedRecipes") {
    return getOwnedRecipeCount(targetState);
  }
  if (metricId === "recipeRegistrations") {
    return getRecipeRegistrationsCount(targetState);
  }
  if (metricId === "highestRecipeLevel") {
    return getHighestRecipeLevel(targetState);
  }
  if (metricId === "interviewSessions") {
    return Number(targetState.metrics?.interviewSessions || 0);
  }
  if (metricId === "staffHires") {
    return Number(targetState.metrics?.staffHires || 0);
  }
  if (metricId === "staffLevels") {
    return getTotalStaffLevels(targetState);
  }
  if (metricId === "expansionCount") {
    return targetState.restaurant.expansionIndex;
  }
  if (metricId === "expansionStage") {
    return getCurrentExpansionStage(targetState);
  }
  if (metricId === "decorScore") {
    return getDecorScore(targetState);
  }
  if (metricId === "specialServed") {
    return getSpecialServedCount(targetState);
  }
  if (metricId === "specialSatisfied") {
    return getSpecialSatisfiedCount(targetState);
  }
  if (metricId === "specialDiscovered") {
    return getSpecialDiscoveredCount(targetState);
  }
  const recipeServedId = getRecipeServedMetricRecipeId(metricId);
  if (recipeServedId) {
    const baselines = ensureRankProgressBaselines(targetState);
    const current = Number(targetState.metrics?.recipeServedCounts?.[recipeServedId] || 0);
    const baseline = Number(baselines.recipeServedCounts?.[recipeServedId] || 0);
    return Math.max(0, current - baseline);
  }
  const recipeLevelId = getRecipeLevelMetricRecipeId(metricId);
  if (recipeLevelId) {
    return Number(targetState.recipes?.owned?.[recipeLevelId]?.level || 0);
  }
  return 0;
}

function getRankMetricLabel(metricId, target) {
  if (metricId === "servedCount") {
    return `누적 서빙 ${formatNumber(target)}회 달성`;
  }
  if (metricId === "promotionActions") {
    return `홍보 버튼 ${formatNumber(target)}회 달성`;
  }
  if (metricId === "taggedPosts") {
    return `태그된 게시물 ${formatNumber(target)}개 달성`;
  }
  if (metricId === "ownPosts") {
    return `SNS 업로드 ${formatNumber(target)}회 달성`;
  }
  if (metricId === "studyLevel") {
    return `공부 레벨 ${formatNumber(target)} 달성`;
  }
  if (metricId === "satisfiedCustomers") {
    return `손님 만족 ${formatNumber(target)}회 달성`;
  }
  if (metricId === "followers") {
    return `팔로워 ${formatNumber(target)}명 달성`;
  }
  if (metricId === "ownedRecipes") {
    return `보유 레시피 ${formatNumber(target)}종`;
  }
  if (metricId === "recipeRegistrations") {
    return `레시피 등록 ${formatNumber(target)}회 달성`;
  }
  if (metricId === "highestRecipeLevel") {
    return `최고 레시피 레벨 ${formatNumber(target)} 달성`;
  }
  if (metricId === "interviewSessions") {
    return `면접 보기 ${formatNumber(target)}회 달성`;
  }
  if (metricId === "staffHires") {
    return `직원 고용 ${formatNumber(target)}회 달성`;
  }
  if (metricId === "staffLevels") {
    return `직원 총 레벨 ${formatNumber(target)} 달성`;
  }
  if (metricId === "expansionCount" || metricId === "expansionStage") {
    return `확장 ${formatNumber(target)}단계 달성`;
  }
  if (metricId === "decorScore") {
    return `인테리어 점수 ${formatNumber(target)} 달성`;
  }
  if (metricId === "farmGenerations") {
    return `농장 생성 성공 ${formatNumber(target)}회 달성`;
  }
  if (metricId === "farmHarvests") {
    return `재료 수확 ${formatNumber(target)}회 달성`;
  }
  if (metricId === "specialServed") {
    return `특수 손님 ${formatNumber(target)}명 응대`;
  }
  if (metricId === "specialSatisfied") {
    return `특수 손님 ${formatNumber(target)}명 만족`;
  }
  if (metricId === "specialDiscovered") {
    return `특수 손님 ${formatNumber(target)}명 발견`;
  }
  const recipeServedId = getRecipeServedMetricRecipeId(metricId);
  if (recipeServedId) {
    const recipe = getRecipe(recipeServedId);
    return `${recipe?.name || "특정 메뉴"} ${formatNumber(target)}회 판매 달성`;
  }
  const recipeLevelId = getRecipeLevelMetricRecipeId(metricId);
  if (recipeLevelId) {
    return `${getRecipeDisplayName(recipeLevelId)} 레벨 ${formatNumber(target)} 달성`;
  }
  return "추가 목표 달성";
}

function getRankMetricIcon(metricId) {
  if (metricId === "servedCount") {
    return "🍽️";
  }
  if (metricId === "promotionActions") {
    return "📣";
  }
  if (metricId === "taggedPosts" || metricId === "ownPosts") {
    return "📱";
  }
  if (metricId === "studyLevel") {
    return "📚";
  }
  if (metricId === "satisfiedCustomers") {
    return "😊";
  }
  if (metricId === "followers") {
    return "🐥";
  }
  if (metricId === "ownedRecipes" || metricId === "highestRecipeLevel") {
    return "🍳";
  }
  if (metricId === "recipeRegistrations") {
    return "📝";
  }
  if (metricId === "interviewSessions") {
    return "🪪";
  }
  if (metricId === "staffHires") {
    return "🧑‍🍳";
  }
  if (metricId === "staffLevels") {
    return "🧑‍🍳";
  }
  if (metricId === "expansionCount" || metricId === "expansionStage") {
    return "🏕️";
  }
  if (metricId === "decorScore") {
    return "🪑";
  }
  if (metricId === "farmGenerations" || metricId === "farmHarvests") {
    return "🌾";
  }
  if (metricId === "specialServed" || metricId === "specialSatisfied" || metricId === "specialDiscovered") {
    return "🐥";
  }
  if (getRecipeServedMetricRecipeId(metricId)) {
    return "🥪";
  }
  return "✨";
}

function getRankChoiceLabel(count) {
  return `아래 중 ${formatNumber(count)}개 달성`;
}

function evaluateRankRequirement(requirement, targetState = state) {
  if (requirement.type === "choice") {
    const options = requirement.options.map((option) => evaluateRankRequirement(option, targetState));
    const completedCount = options.filter((option) => option.complete).length;
    return {
      ...requirement,
      icon: "✨",
      label: getRankChoiceLabel(requirement.count),
      options,
      completedCount,
      complete: completedCount >= requirement.count,
      progressText: `${completedCount} / ${requirement.count} 선택 달성`,
      progressRatio: Math.min(1, completedCount / requirement.count),
    };
  }

  const current = getRankMetricValue(requirement.metric, targetState);
  return {
    ...requirement,
    icon: getRankMetricIcon(requirement.metric),
    label: getRankMetricLabel(requirement.metric, requirement.target),
    current,
    complete: current >= requirement.target,
    progressText: `${formatNumber(current)} / ${formatNumber(requirement.target)}`,
    progressRatio: Math.min(1, current / requirement.target),
  };
}

function getRankPromotionStatus(targetState = state) {
  const currentTier = getCurrentRankTier(targetState);
  const nextTier = getNextRankTier(targetState);
  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      requirementResults: [],
      completedCount: 0,
      totalCount: 0,
      eligible: false,
      isMax: true,
    };
  }

  const requirementResults = (nextTier.requirements || []).map((requirement) =>
    evaluateRankRequirement(requirement, targetState)
  );
  const completedCount = requirementResults.filter((result) => result.complete).length;
  return {
    currentTier,
    nextTier,
    requirementResults,
    completedCount,
    totalCount: requirementResults.length,
    eligible: requirementResults.every((result) => result.complete),
    isMax: false,
  };
}

function collectRankMetricRequirements(requirements, metricId, scopeLabel = "필수 목표", matches = []) {
  for (const requirement of requirements || []) {
    if (requirement.type === "choice") {
      collectRankMetricRequirements(requirement.options, metricId, "선택 목표", matches);
      continue;
    }
    if (requirement.metric === metricId) {
      matches.push({ ...requirement, scopeLabel });
    }
  }
  return matches;
}

function getHudSpecialSatisfiedGoal(rankStatus) {
  if (!rankStatus || rankStatus.isMax) {
    return null;
  }
  const matches = collectRankMetricRequirements(rankStatus.requirementResults, "specialSatisfied");
  if (!matches.length) {
    return null;
  }
  return matches.find((goal) => !goal.complete) || matches[0];
}

function getRankRewardChips(reward) {
  if (!reward) {
    return [];
  }
  const chips = [];
  if (reward.acorns) {
    chips.push(`🌰 도토리 ${formatNumber(reward.acorns)}`);
  }
  if (reward.likes) {
    chips.push(`💛 좋아요 ${formatNumber(reward.likes)}`);
  }
  return chips;
}


function getCustomerProfile(profileId) {
  return CUSTOMER_PROFILES.find((profile) => profile.id === profileId) || null;
}

function getCustomerIconPath(profileId) {
  return getCustomerProfile(profileId)?.iconPath || NORMAL_CHICK_ICON_PATH;
}

function getSpriteImage(src) {
  if (!src) {
    return null;
  }
  if (!spriteImageCache.has(src)) {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    spriteImageCache.set(src, image);
  }
  return spriteImageCache.get(src);
}

function getChickImage(src) {
  return getSpriteImage(src);
}

function getFacilityImage(src) {
  return getSpriteImage(src);
}

function getCurrencyImage(src) {
  return getSpriteImage(src);
}

function getRecipeImage(src) {
  return getSpriteImage(src);
}

function primeChickIconCache() {
  const iconPaths = [
    NORMAL_CHICK_ICON_PATH,
    PROTAGONIST_CHICK_ICON_PATH,
    STOVE_FACILITY_ICON_PATH,
    TABLE_FACILITY_ICON_PATH,
    ACORN_CURRENCY_ICON_PATH,
    ...RECIPE_CATALOG.map((recipe) => recipe.iconPath).filter(Boolean),
    ...CUSTOMER_PROFILES.map((profile) => profile.iconPath).filter(Boolean),
  ];
  for (const path of iconPaths) {
    getSpriteImage(path);
  }
}

function getGuestVisualPath(profileId, seen = true, unlocked = false) {
  if (seen) {
    return getCustomerIconPath(profileId);
  }
  if (unlocked) {
    return NORMAL_CHICK_ICON_PATH;
  }
  return null;
}

function getChickSpriteMarkup(src, alt, className) {
  if (!src) {
    return "";
  }
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="${escapeHtml(className)}" />`;
}

function getCodexEntry(targetState, profileId) {
  if (!isPlainObject(targetState.codex)) {
    targetState.codex = { entries: {} };
  }
  if (!isPlainObject(targetState.codex.entries)) {
    targetState.codex.entries = {};
  }
  if (!targetState.codex.entries[profileId]) {
    targetState.codex.entries[profileId] = {
      seen: false,
      servedCount: 0,
      satisfiedServedCount: 0,
      claimedPatronLevels: [],
    };
  }
  if (typeof targetState.codex.entries[profileId].satisfiedServedCount !== "number") {
    targetState.codex.entries[profileId].satisfiedServedCount = 0;
  }
  if (!Array.isArray(targetState.codex.entries[profileId].claimedPatronLevels)) {
    targetState.codex.entries[profileId].claimedPatronLevels = [];
  }
  return targetState.codex.entries[profileId];
}

function getCustomerPatronTierForLevel(level) {
  return CUSTOMER_PATRON_LEVELS.find((tier) => tier.level === level) || null;
}

function getCustomerPatronLevel(entryOrProfileId, targetState = state) {
  const entry =
    typeof entryOrProfileId === "string"
      ? getCodexEntry(targetState, entryOrProfileId)
      : entryOrProfileId || { servedCount: 0 };
  let level = 0;
  for (const tier of CUSTOMER_PATRON_LEVELS) {
    if (Number(entry.servedCount || 0) >= tier.visitsRequired) {
      level = tier.level;
    }
  }
  return level;
}

function getCustomerPatronTitle(entryOrProfileId, targetState = state) {
  const level = getCustomerPatronLevel(entryOrProfileId, targetState);
  return getCustomerPatronTierForLevel(level)?.title || "첫 만남";
}

function getCustomerNextPatronTier(entryOrProfileId, targetState = state) {
  const level = getCustomerPatronLevel(entryOrProfileId, targetState);
  return CUSTOMER_PATRON_LEVELS.find((tier) => tier.level > level) || null;
}

function getCustomerPatronProgress(entryOrProfileId, targetState = state) {
  const entry =
    typeof entryOrProfileId === "string"
      ? getCodexEntry(targetState, entryOrProfileId)
      : entryOrProfileId || { servedCount: 0 };
  const level = getCustomerPatronLevel(entry, targetState);
  const nextTier = getCustomerNextPatronTier(entry, targetState);
  const currentTier = getCustomerPatronTierForLevel(level);
  const currentVisits = Number(entry.servedCount || 0);
  const baseVisits = currentTier?.visitsRequired || 0;
  return {
    level,
    currentVisits,
    nextTier,
    currentTier,
    progress: Math.max(0, currentVisits - baseVisits),
    required: nextTier ? Math.max(0, nextTier.visitsRequired - baseVisits) : 0,
    remaining: nextTier ? Math.max(0, nextTier.visitsRequired - currentVisits) : 0,
  };
}

function hasClaimedCustomerPatronLevel(entry, level) {
  return Array.isArray(entry?.claimedPatronLevels) && entry.claimedPatronLevels.includes(level);
}

function markCustomerPatronLevelClaimed(entry, level) {
  if (!Array.isArray(entry.claimedPatronLevels)) {
    entry.claimedPatronLevels = [];
  }
  if (!entry.claimedPatronLevels.includes(level)) {
    entry.claimedPatronLevels.push(level);
    entry.claimedPatronLevels.sort((left, right) => left - right);
  }
}

function addFollowerReward(amount, targetState = state) {
  const normalizedAmount = Math.max(0, Number(amount || 0));
  if (normalizedAmount <= 0) {
    return 0;
  }
  targetState.social.followerPoints = Math.max(
    0,
    Number(targetState.social.followerPoints || 0) + normalizedAmount
  );
  targetState.social.followers = Math.max(0, Math.floor(targetState.social.followerPoints));
  return normalizedAmount;
}

function addIngredientRewards(rewards, targetState = state) {
  const normalized = normalizeIngredientCost(rewards);
  for (const [rewardId, amount] of Object.entries(normalized)) {
    targetState.farm.inventory[rewardId] = getIngredientAmount(rewardId, targetState) + amount;
  }
  return normalized;
}

function getCustomerPatronRewardPlan(profile, level, targetState = state) {
  const tier = getCustomerPatronTierForLevel(level);
  if (!profile || !tier) {
    return null;
  }

  const preferredRecipe = getRecipe(profile.preferredRecipes?.[0]) || null;
  const ingredientProfile = preferredRecipe?.ingredientProfile || {};
  const ingredientRewards = {};
  const chips = [];
  let recipeUnlockId = null;

  if (Number(tier.followerReward || 0) > 0) {
    chips.push(`🐥 팔로워 +${formatNumber(tier.followerReward)}`);
  }

  if (tier.ingredientBundle) {
    const bundle = tier.ingredientBundle;
    if (bundle.primary && ingredientProfile.primary) {
      ingredientRewards[ingredientProfile.primary] = (ingredientRewards[ingredientProfile.primary] || 0) + bundle.primary;
    }
    if (bundle.secondary && ingredientProfile.secondary) {
      ingredientRewards[ingredientProfile.secondary] =
        (ingredientRewards[ingredientProfile.secondary] || 0) + bundle.secondary;
    }
    if (bundle.special && ingredientProfile.special) {
      ingredientRewards[ingredientProfile.special] = (ingredientRewards[ingredientProfile.special] || 0) + bundle.special;
    }
  }

  if (tier.recipeUnlock && preferredRecipe && !isRecipeUnlocked(preferredRecipe, targetState)) {
    recipeUnlockId = preferredRecipe.id;
    chips.push(`📘 ${preferredRecipe.name} 레시피`);
  } else if (Object.keys(ingredientRewards).length === 0 && preferredRecipe) {
    ingredientRewards[ingredientProfile.primary || "flour"] =
      (ingredientRewards[ingredientProfile.primary || "flour"] || 0) + 5;
    ingredientRewards[ingredientProfile.secondary || "cheese"] =
      (ingredientRewards[ingredientProfile.secondary || "cheese"] || 0) + 3;
  }

  for (const [rewardId, amount] of Object.entries(ingredientRewards)) {
    const rewardMeta = FARM_REWARD_META[rewardId];
    chips.push(`${rewardMeta?.emoji || "🧺"} ${rewardMeta?.name || rewardId} +${formatNumber(amount)}`);
  }

  return {
    level,
    tierTitle: tier.title,
    followerGain: Number(tier.followerReward || 0),
    ingredientRewards,
    recipeUnlockId,
    chips,
  };
}

function queueCustomerPatronCelebration(payload) {
  if (!payload) {
    return;
  }
  const duplicateOpen =
    state.ui.patronCelebration?.profileId === payload.profileId &&
    state.ui.patronCelebration?.level === payload.level;
  const duplicateQueued = state.ui.patronCelebrationQueue.some(
    (entry) => entry.profileId === payload.profileId && entry.level === payload.level
  );
  if (duplicateOpen || duplicateQueued) {
    return;
  }
  state.ui.patronCelebrationQueue.push(payload);
}

function grantCustomerPatronRewards(targetState, profileId) {
  const profile = getCustomerProfile(profileId);
  if (!profile) {
    return [];
  }

  const entry = getCodexEntry(targetState, profileId);
  const currentLevel = getCustomerPatronLevel(entry, targetState);
  const payloads = [];

  for (const tier of CUSTOMER_PATRON_LEVELS) {
    if (tier.level > currentLevel || hasClaimedCustomerPatronLevel(entry, tier.level)) {
      continue;
    }
    markCustomerPatronLevelClaimed(entry, tier.level);
  }

  return payloads;
}

function getCustomerPatronNextRewardText(profile, targetState = state) {
  if (!profile) {
    return "다음 단계: 아직 정해지지 않았다.";
  }
  const entry = getCodexEntry(targetState, profile.id);
  const nextTier = getCustomerNextPatronTier(entry, targetState);
  if (!nextTier) {
    return "다음 단계: 최고 단골 단계에 도달했다.";
  }
  return `다음 단계: ${nextTier.title} (${formatNumber(nextTier.visitsRequired)}회 방문)`;
}

function isCustomerUnlocked(profile, targetState = state) {
  if (targetState.rank.tierIndex < (profile.minRankIndex || 0)) {
    return false;
  }
  const rule = profile.unlockCondition;
  if (!rule) {
    return true;
  }
  if (rule.type === "none") {
    return true;
  }
  if (rule.type === "metric") {
    return getRankMetricValue(rule.metric, targetState) >= (rule.value || 0);
  }
  if (rule.type === "served") {
    return targetState.metrics.served >= rule.value;
  }
  if (rule.type === "likes") {
    return false;
  }
  if (rule.type === "study") {
    return targetState.study.level >= rule.value;
  }
  if (rule.type === "recipe") {
    return Boolean(targetState.recipes.owned[rule.recipeId]);
  }
  if (rule.type === "recipeLevel") {
    return Boolean(targetState.recipes.owned[rule.recipeId]) && getRecipeCurrentLevel(rule.recipeId, targetState) >= (rule.value || 1);
  }
  if (rule.type === "expansion") {
    return targetState.restaurant.expansionIndex >= rule.value;
  }
  if (rule.type === "staff") {
    return (targetState.staffs[rule.staffId]?.level || 0) >= (rule.value || 1);
  }
  return false;
}

function describeUnlockCondition(rule) {
  if (rule.type === "none") {
    return "";
  }
  if (rule.type === "metric") {
    return describeCustomerMetricCondition(rule);
  }
  if (rule.type === "served") {
    return `누적 서빙 ${rule.value}회`;
  }
  if (rule.type === "likes") {
    return `좋아요 ${formatNumber(rule.value)}개`;
  }
  if (rule.type === "study") {
    return `공부 레벨 ${rule.value}`;
  }
  if (rule.type === "recipe") {
    return `${getRecipe(rule.recipeId)?.name || "특정 레시피"} 메뉴 등록`;
  }
  if (rule.type === "recipeLevel") {
    return `${getRecipe(rule.recipeId)?.name || "특정 레시피"} 레벨 ${formatNumber(rule.value || 1)} 달성`;
  }
  if (rule.type === "expansion") {
    return `확장 ${rule.value}단계 달성`;
  }
  if (rule.type === "staff") {
    return `${getStaffDef(rule.staffId)?.title || "직원"} 고용`;
  }
  return "조건 미상";
}

function describeCustomerMetricCondition(rule) {
  if (rule.metric === "followers") {
    return `팔로워 ${formatNumber(rule.value)}명`;
  }
  if (rule.metric === "studyLevel") {
    return `공부 레벨 ${formatNumber(rule.value)}`;
  }
  if (rule.metric === "ownPosts") {
    return `내 피드 ${formatNumber(rule.value)}개 업로드`;
  }
  if (rule.metric === "taggedPosts") {
    return `태그된 게시물 ${formatNumber(rule.value)}개`;
  }
  if (rule.metric === "specialSatisfied") {
    return `특별 손님 ${formatNumber(rule.value)}명 만족`;
  }
  return `누적 서빙 ${formatNumber(rule.value)}회`;
}

function describeCustomerUnlock(profile) {
  const pieces = [];
  if ((profile.minRankIndex || 0) > 0) {
    pieces.push(`${getRankTitle(profile.minRankIndex)} 이상`);
  }
  const conditionText = describeUnlockCondition(profile.unlockCondition);
  if (conditionText) {
    pieces.push(conditionText);
  }
  return pieces.length > 0 ? pieces.join(" / ") : "초기부터 등장";
}

function getCodexCounts(targetState = state) {
  let discovered = 0;
  let served = 0;

  for (const profile of CUSTOMER_PROFILES) {
    const entry = getCodexEntry(targetState, profile.id);
    if (entry.seen) {
      discovered += 1;
    }
    if (entry.servedCount > 0) {
      served += 1;
    }
  }

  return { discovered, served };
}

function registerCustomerSeen(targetState, profileId) {
  if (!profileId) {
    return false;
  }
  const entry = getCodexEntry(targetState, profileId);
  const isFirstSeen = !entry.seen;
  entry.seen = true;
  return isFirstSeen;
}

function registerCustomerServed(targetState, profileId) {
  if (!profileId) {
    return;
  }
  const entry = getCodexEntry(targetState, profileId);
  entry.seen = true;
  entry.servedCount += 1;
}

function registerCustomerSatisfied(targetState, profileId) {
  if (!profileId) {
    return;
  }
  const entry = getCodexEntry(targetState, profileId);
  entry.seen = true;
  entry.satisfiedServedCount += 1;
}

function getEligibleSpecialCustomerProfiles(targetState) {
  if (!isRankFeatureUnlocked("specialGuests", targetState)) {
    return [];
  }
  if (getCodexCounts(targetState).discovered === 0) {
    const firstGuest = getFirstSpecialGuestProfile();
    return firstGuest ? [firstGuest] : [];
  }
  return CUSTOMER_PROFILES.filter((profile) => isCustomerUnlocked(profile, targetState));
}

function pickCustomerProfile(targetState) {
  const eligible = getEligibleSpecialCustomerProfiles(targetState);
  if (eligible.length === 0) {
    return CUSTOMER_PROFILES[0];
  }
  if (getCodexCounts(targetState).discovered === 0) {
    return eligible.find((profile) => profile.id === getFirstSpecialGuestProfile()?.id) || eligible[0];
  }

  const weighted = eligible.flatMap((profile) => {
    const entry = getCodexEntry(targetState, profile.id);
    return entry.seen ? [profile] : [profile, profile];
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
}

function getSpecialCustomerSpawnChance(targetState = state) {
  const rankBonus = Math.min(0.05, targetState.rank.tierIndex * 0.006);
  const skillBonus = Math.max(0, Number(targetState.study?.skillBonuses?.specialGuestChance || 0));
  return Math.min(0.28, SPECIAL_CUSTOMER_CHANCE + rankBonus + skillBonus);
}

function pickCustomerBlueprint(targetState) {
  return {
    kind: "normal",
  };
}

function pickRecipeForCustomer(customer) {
  const ownedIds = Object.keys(state.recipes.owned);
  if (ownedIds.length === 0) {
    return RECIPE_CATALOG[0].id;
  }

  const preferred = (customer.preferredRecipes || []).filter((recipeId) => ownedIds.includes(recipeId));
  if (preferred.length > 0 && Math.random() < 0.76) {
    return preferred[Math.floor(Math.random() * preferred.length)];
  }
  return ownedIds[Math.floor(Math.random() * ownedIds.length)];
}

function addTable(targetState) {
  const index = targetState.restaurant.tables.length;
  const pos = TABLE_POSITIONS[index];
  if (!pos) {
    return;
  }

  targetState.restaurant.tables.push({
    id: `table-${index + 1}`,
    x: pos.x,
    y: pos.y,
    customer: null,
  });
}

function addStove(targetState) {
  const index = targetState.restaurant.stoves.length;
  const pos = STOVE_POSITIONS[index];
  if (!pos) {
    return;
  }

  targetState.restaurant.stoves.push({
    id: `stove-${index + 1}`,
    x: pos.x,
    y: pos.y,
    order: null,
    progress: 0,
    total: 0,
    assignedAt: 0,
  });
}

function createCustomer(targetState, blueprint) {
  const customerId = targetState.customerSeq++;
  if (blueprint.kind === "special") {
    const profile = blueprint.profile;
    return {
      id: customerId,
      kind: "special",
      profileId: profile.id,
      name: profile.name,
      preferredRecipes: [...profile.preferredRecipes],
      color: profile.color,
      badge: profile.badge,
      accent: profile.accent,
      mood: 0.7 + (customerId % 3) * 0.1,
      recipeId: null,
      state: "queued",
      eatTimer: 0,
      speech: "",
      tableId: null,
      createdAt: targetState.clock,
      tableAssignedAt: null,
      seatedAt: null,
      orderAcceptedAt: null,
      mealStartedAt: null,
      satisfaction: null,
      feedbackTimer: 0,
      x: CUSTOMER_ENTRY_POINT.x + ((customerId % 3) - 1) * 8,
      y: CUSTOMER_ENTRY_POINT.y + (customerId % 2) * 10,
      targetX: CUSTOMER_ENTRY_POINT.x,
      targetY: CUSTOMER_ENTRY_POINT.y,
      moveSpeed: 90 + (customerId % 3) * 8,
    };
  }

  return {
    id: customerId,
    kind: "normal",
    profileId: null,
    name: NORMAL_CUSTOMER_NAME,
    preferredRecipes: [],
    color: NORMAL_CUSTOMER_COLOR,
    badge: null,
    accent: null,
    mood: 0.7 + (customerId % 3) * 0.1,
    recipeId: null,
    state: "queued",
    eatTimer: 0,
    speech: "",
    tableId: null,
    createdAt: targetState.clock,
    tableAssignedAt: null,
    seatedAt: null,
    orderAcceptedAt: null,
    mealStartedAt: null,
    satisfaction: null,
    feedbackTimer: 0,
    x: CUSTOMER_ENTRY_POINT.x + ((customerId % 3) - 1) * 8,
    y: CUSTOMER_ENTRY_POINT.y + (customerId % 2) * 10,
    targetX: CUSTOMER_ENTRY_POINT.x,
    targetY: CUSTOMER_ENTRY_POINT.y,
    moveSpeed: 90 + (customerId % 3) * 8,
  };
}

function getQueueSlotPosition(index) {
  return {
    x: ENTRANCE_POSITION.x + Math.sin(index * 0.7) * 6,
    y: 742 + index * 24,
  };
}

function getTableSeatPosition(table) {
  return {
    x: table.x,
    y: table.y + 40,
  };
}

function setCustomerTarget(customer, x, y) {
  customer.targetX = x;
  customer.targetY = y;
}

function moveCustomerTowardTarget(customer, dt) {
  const dx = customer.targetX - customer.x;
  const dy = customer.targetY - customer.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= 0.1) {
    customer.x = customer.targetX;
    customer.y = customer.targetY;
    return true;
  }

  const step = customer.moveSpeed * dt;
  if (distance <= step) {
    customer.x = customer.targetX;
    customer.y = customer.targetY;
    return true;
  }

  customer.x += (dx / distance) * step;
  customer.y += (dy / distance) * step;
  return false;
}

function updateQueueTargets(targetState = state) {
  targetState.restaurant.queue.forEach((customer, index) => {
    const slot = getQueueSlotPosition(index);
    setCustomerTarget(customer, slot.x, slot.y);
  });
}

function getOrderBubbleRect(customer) {
  return {
    x: customer.x - 48,
    y: customer.y - 68,
    width: 96,
    height: 40,
  };
}

function syncStartOverlay() {
  if (!dom.startOverlay) {
    return;
  }
  const shouldOpen = state.mode !== "playing";
  if (!shouldOpen && dom.startOverlay.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  dom.startOverlay.classList.toggle("is-open", shouldOpen);
  dom.startOverlay.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  dom.startOverlay.style.opacity = shouldOpen ? "1" : "0";
  dom.startOverlay.style.pointerEvents = shouldOpen ? "auto" : "none";
}

function enterFarmScene() {
  if (state.mode !== "playing") {
    return;
  }
  closePanels();
  state.scene = SCENE_FARM;
  state.farm.lastRewardText = "같은 재료 3개를 이어 붙이면 다음 단계로 진화한다.";
  refreshAllUI();
  persistStateNow();
}

function enterInterviewScene(targetStaffId = null) {
  if (state.mode !== "playing") {
    return;
  }
  closePanels();
  state.scene = SCENE_INTERVIEW;
  if (targetStaffId && getStaffDef(targetStaffId)) {
    state.staffs.interview.targetStaffId = targetStaffId;
  } else if (!state.staffs.interview.selectedCandidateId && (state.staffs.interview.candidates || []).length === 0) {
    state.staffs.interview.targetStaffId = null;
  }
  setStaffBubble("protagonist", pickRandom(INTERVIEW_PROTAGONIST_LINES_ENTER), 4.0);
  refreshAllUI();
  persistStateNow();
}

function returnToRestaurantScene() {
  state.scene = SCENE_RESTAURANT;
  closePanels();
  refreshAllUI();
  persistStateNow();
}

function getInterviewTicketRechargeRemaining(targetState = state) {
  const interview = targetState.staffs?.interview;
  if (!interview || interview.tickets >= STAFF_INTERVIEW_MAX_TICKETS) {
    return 0;
  }
  return Math.max(0, Math.ceil((interview.ticketNextChargeAt || 0) - targetState.clock));
}

function updateInterviewTicketRecharge(targetState = state) {
  const interview = targetState.staffs?.interview;
  if (!interview) {
    return false;
  }
  if (interview.tickets >= STAFF_INTERVIEW_MAX_TICKETS) {
    interview.ticketNextChargeAt = 0;
    return false;
  }
  if (!interview.ticketNextChargeAt) {
    interview.ticketNextChargeAt = targetState.clock + STAFF_INTERVIEW_TICKET_RECHARGE_SECONDS;
  }
  let charged = false;
  while (interview.tickets < STAFF_INTERVIEW_MAX_TICKETS && interview.ticketNextChargeAt <= targetState.clock) {
    interview.tickets += 1;
    charged = true;
    if (interview.tickets >= STAFF_INTERVIEW_MAX_TICKETS) {
      interview.ticketNextChargeAt = 0;
      break;
    }
    interview.ticketNextChargeAt += STAFF_INTERVIEW_TICKET_RECHARGE_SECONDS;
  }
  return charged;
}

function startGame() {
  state.mode = "playing";
  state.scene = SCENE_RESTAURANT;
  syncStartOverlay();
  setChefLine("opening", null, {
    force: true,
    duration: 3.1,
    nextDelay: 6.1,
  });
  pushLog("첫 영업을 시작했다. 홍보로 손님을 모아보자.");
  refreshAllUI();
  persistStateNow();
}

function resetGame(options = {}) {
  if (options.clearSave) {
    clearPersistedState();
  }
  state = createInitialState();
  dom.skillModal?.classList.remove("is-open");
  dom.skillModal?.setAttribute("aria-hidden", "true");
  closeRecipeDetail();
  closeRankCelebration(true);
  closeSpecialGuestAlert(true);
  syncStartOverlay();
  closePanels();
  setChefLine("opening", null, {
    force: true,
    duration: 3.1,
    nextDelay: 6.1,
  });
  refreshAllUI();
  persistStateNow();
  if (options.reload) {
    window.location.reload();
  }
}

function handleResetData() {
  const confirmed = window.confirm("저장된 진행 데이터를 모두 지우고 처음부터 다시 시작할까?");
  if (!confirmed) {
    return;
  }
  resetGame({ clearSave: true, reload: true });
}

function queueSpecialGuestAlert(profileId) {
  const profile = getCustomerProfile(profileId);
  if (!profile) {
    return;
  }
  pushTopNotice({
    type: "guest",
    icon: "🐥",
    copy: `${profile.name} 특별 손님이 등장했습니다`,
  });
}

function openNextSpecialGuestAlert() {
  closeSpecialGuestAlert(true);
}

function closeSpecialGuestAlert(forceClose = false) {
  state.ui.specialGuestAlert = null;
  if (forceClose) {
    state.ui.specialGuestQueue = [];
  }
  dom.specialGuestModal?.classList.remove("is-open");
  dom.specialGuestModal?.setAttribute("aria-hidden", "true");
}

function queueCustomer(targetState) {
  if (targetState.restaurant.queue.length >= 8) {
    return false;
  }

  const blueprint = pickCustomerBlueprint(targetState);
  const customer = createCustomer(targetState, blueprint);
  targetState.restaurant.queue.push(customer);
  updateQueueTargets(targetState);

  if (customer.kind === "special") {
    const isFirstSeen = registerCustomerSeen(targetState, customer.profileId);
    if (targetState.mode === "playing") {
      pushLog(`특별 손님 등장: ${customer.name}`);
      if (isFirstSeen) {
        pushLog(`도감에 ${customer.name} 정보가 추가됐다.`);
        queueSpecialGuestAlert(customer.profileId);
      }
    }
  }
  return true;
}

function getPromotionThreshold() {
  const bonus = state.study.skillBonuses.promotion || 0;
  return Math.max(state.restaurant.promoFloor, state.restaurant.promoBase + bonus);
}

function handlePromotion() {
  if (state.mode !== "playing") {
    return;
  }

  const threshold = getPromotionThreshold();
  state.restaurant.promotionProgress += 1;
  state.metrics.promotionActions = Number(state.metrics.promotionActions || 0) + 1;

  if (state.restaurant.promotionProgress >= threshold) {
    state.restaurant.promotionProgress = 0;
    const added = queueCustomer(state);
    if (added) {
      pushLog("홍보가 먹혔다. 새로운 손님이 줄을 섰다.");
    } else {
      pushLog("홍보는 성공했지만, 대기 줄이 이미 가득 찼다.");
    }
  } else {
    pushLog("홍보 중... 입소문이 조금씩 퍼지고 있다.");
  }

  refreshAllUI();
}

function update(dt) {
  if (state.mode !== "playing") {
    return;
  }

  state.clock += dt;
  pruneExpiredTopNotices();
  updateFarmRecharge();
  updateInterviewTicketRecharge();
  updateMenuLaunchBonus();

  if (state.scene === SCENE_FARM) {
    updateFarmerStaff(dt);
    if (state.clock - lastPersistClock >= AUTO_SAVE_INTERVAL_SECONDS) {
      persistStateNow();
    }
    return;
  }

  if (state.scene === SCENE_INTERVIEW) {
    if (state.clock - lastPersistClock >= AUTO_SAVE_INTERVAL_SECONDS) {
      persistStateNow();
    }
    return;
  }

  updatePromoterStaff(dt);
  seatCustomers();
  updateCustomerMovement(dt);
  updateQueueTargets();
  updateServerStaff(dt);
  assignOrdersToStoves();
  updateChefActor(dt);
  updateStoves(dt);
  updateTables(dt);

  if (state.clock - lastPersistClock >= AUTO_SAVE_INTERVAL_SECONDS) {
    persistStateNow();
  }
}

function seatCustomers() {
  let freeTable = state.restaurant.tables.find((table) => table.customer === null);

  while (freeTable && state.restaurant.queue.length > 0) {
    const customer = state.restaurant.queue.shift();
    updateQueueTargets();
    customer.recipeId = pickRecipeForCustomer(customer);
    customer.state = "walking_to_table";
    customer.speech = "";
    customer.tableId = freeTable.id;
    customer.tableAssignedAt = state.clock;
    customer.seatedAt = null;
    customer.orderAcceptedAt = null;
    customer.mealStartedAt = null;
    customer.satisfaction = null;
    customer.feedbackTimer = 0;
    const seat = getTableSeatPosition(freeTable);
    setCustomerTarget(customer, seat.x, seat.y);
    freeTable.customer = customer;
    freeTable = state.restaurant.tables.find((table) => table.customer === null);
  }
}

function updateCustomerMovement(dt) {
  for (const customer of state.restaurant.queue) {
    moveCustomerTowardTarget(customer, dt);
  }

  for (const table of state.restaurant.tables) {
    if (!table.customer) {
      continue;
    }

    const arrived = moveCustomerTowardTarget(table.customer, dt);
    if (arrived && table.customer.state === "walking_to_table") {
      table.customer.state = "awaiting_order";
      table.customer.seatedAt = state.clock;
      pushLog(`${getRecipeNameByLevel(table.customer.recipeId)} 주문 아이콘이 떴다. 터치해서 접수하자.`);
    }
  }

  const survivors = [];
  for (const customer of state.restaurant.departingCustomers) {
    customer.feedbackTimer = Math.max(0, (customer.feedbackTimer || 0) - dt);
    const arrived = moveCustomerTowardTarget(customer, dt);
    if (!arrived) {
      survivors.push(customer);
      continue;
    }
  }
  state.restaurant.departingCustomers = survivors;
}

function acceptOrder(tableId, source = "player") {
  const table = getTableById(tableId);
  if (!table || !table.customer || table.customer.state !== "awaiting_order") {
    return false;
  }

  table.customer.state = "order_queued";
  table.customer.speech = "접수 완료";
  table.customer.orderAcceptedAt = state.clock;
  state.restaurant.pendingOrders.push({
    tableId,
    customerId: table.customer.id,
    recipeId: table.customer.recipeId,
  });
  if (source === "server") {
    pushLog(`서버가 ${getRecipeNameByLevel(table.customer.recipeId)} 주문을 대신 접수했다.`);
  } else {
    pushLog(`${getRecipeNameByLevel(table.customer.recipeId)} 주문을 접수했다.`);
  }
  refreshAllUI();
  return true;
}

function getChefPriceMultiplierForStat(statValue) {
  return 1 + Math.max(0, statValue) * 0.025;
}

function getChefCookMultiplierForStat(statValue) {
  return Math.max(0.56, 1 - Math.max(0, statValue) * 0.045);
}

function getPromoterCooldownForStat(statValue) {
  return Math.max(6, 18 - Math.max(0, statValue) * 1.1);
}

function getPromoterExtraCustomerChanceForStat(statValue) {
  return Math.max(0, Math.min(0.42, (Math.max(0, statValue) - 4) * 0.07));
}

function getServerMoveSpeedForStat(statValue) {
  return 92 + Math.max(0, statValue) * 14;
}

function getServerSatisfactionSupportForStat(statValue) {
  return Math.max(0, Math.min(1.05, Math.max(0, statValue) * 0.085));
}

function getFarmerCooldownForStat(statValue) {
  return Math.max(4.2, 15 - Math.max(0, statValue) * 1.05);
}

function getFarmerExtraSpawnChanceForStat(statValue) {
  return Math.max(0, Math.min(0.5, (Math.max(0, statValue) - 3) * 0.08));
}

function getStaffEffectPreview(staffId, candidate, targetState = state) {
  const def = getStaffDef(staffId);
  const resolvedCandidate = candidate === undefined ? getAssignedStaffCandidate(staffId, targetState) : candidate;
  const statValue = def && resolvedCandidate ? getStaffCandidateStat(resolvedCandidate, def.statKey) : 0;

  if (!def || !resolvedCandidate) {
    return {
      statValue: 0,
      summaryShort: `${def?.title || "직원"} 자리가 비어 있다.`,
      summaryLong: `${def?.title || "직원"} 자리가 비어 있다. 면접에서 후보를 데려와 배치해보자.`,
      metricPrimary: "-",
      metricSecondary: null,
    };
  }

  if (staffId === "chef") {
    const priceBonus = Math.round((getChefPriceMultiplierForStat(statValue) - 1) * 100);
    const cookCut = Math.round((1 - getChefCookMultiplierForStat(statValue)) * 100);
    return {
      statValue,
      summaryShort: `조리 ${cookCut}% 단축 · 판매가 ${priceBonus}% 상승`,
      summaryLong: `요리 ${statValue}. 조리 시간을 ${cookCut}% 줄이고 판매가를 ${priceBonus}% 올린다.`,
      metricPrimary: `⏱️ ${cookCut}%`,
      metricSecondary: `💰 +${priceBonus}%`,
    };
  }

  if (staffId === "server") {
    const speed = Math.round(getServerMoveSpeedForStat(statValue));
    const support = getServerSatisfactionSupportForStat(statValue);
    return {
      statValue,
      summaryShort: `이동 ${speed} · 주문 자동 접수 · 만족 +${support.toFixed(1)}`,
      summaryLong: `접대 ${statValue}. 이동 속도 ${speed}로 주문을 자동 접수하고 만족도 점수에 +${support.toFixed(
        1
      )} 보너스를 준다.`,
      metricPrimary: `🏃 ${speed}`,
      metricSecondary: `💗 +${support.toFixed(1)}`,
    };
  }

  if (staffId === "promoter") {
    const cooldown = getPromoterCooldownForStat(statValue);
    const extraChance = Math.round(getPromoterExtraCustomerChanceForStat(statValue) * 100);
    return {
      statValue,
      summaryShort: `${cooldown.toFixed(1)}초마다 손님 1명${extraChance > 0 ? ` · 추가 ${extraChance}%` : ""}`,
      summaryLong: `홍보 ${statValue}. ${cooldown.toFixed(
        1
      )}초마다 손님을 1명 데려오고${extraChance > 0 ? `, ${extraChance}% 확률로 1명을 더 데려온다` : ""}.`,
      metricPrimary: `📣 ${cooldown.toFixed(1)}초`,
      metricSecondary: extraChance > 0 ? `➕ ${extraChance}%` : null,
    };
  }

  if (staffId === "farmer") {
    const cooldown = getFarmerCooldownForStat(statValue);
    const extraChance = Math.round(getFarmerExtraSpawnChanceForStat(statValue) * 100);
    return {
      statValue,
      summaryShort: `${cooldown.toFixed(1)}초마다 자동 파종${extraChance > 0 ? ` · 추가 씨앗 ${extraChance}%` : ""}`,
      summaryLong: `성실 ${statValue}. ${cooldown.toFixed(
        1
      )}초마다 농장에 자동으로 기초 재료를 뿌리고${extraChance > 0 ? `, ${extraChance}% 확률로 1개를 더 뿌린다` : ""}.`,
      metricPrimary: `🌾 ${cooldown.toFixed(1)}초`,
      metricSecondary: extraChance > 0 ? `➕ ${extraChance}%` : null,
    };
  }

  return {
    statValue,
    summaryShort: `${def.title} 자리에 맞는 능력을 발휘한다.`,
    summaryLong: `${def.title} 자리에 맞는 능력을 발휘한다.`,
    metricPrimary: "-",
    metricSecondary: null,
  };
}

function getCandidateSlotComparison(candidate, staffId, targetState = state) {
  const currentCandidate = getAssignedStaffCandidate(staffId, targetState);
  const currentEffect = getStaffEffectPreview(staffId, currentCandidate, targetState);
  const nextEffect = getStaffEffectPreview(staffId, candidate, targetState);
  const diff = nextEffect.statValue - currentEffect.statValue;
  return {
    staffId,
    currentCandidate,
    currentEffect,
    nextEffect,
    diff,
    diffLabel: diff > 0 ? `▲+${diff}` : diff < 0 ? `▼${diff}` : "=",
    diffClass: diff > 0 ? "diff-up" : diff < 0 ? "diff-down" : "diff-same",
  };
}

function getChefPriceMultiplier() {
  return getChefPriceMultiplierForStat(getStaffRelevantStat("chef"));
}

function getChefCookMultiplier() {
  return getChefCookMultiplierForStat(getStaffRelevantStat("chef"));
}

function getPromoterCooldown() {
  return getPromoterCooldownForStat(getStaffRelevantStat("promoter"));
}

function getServerMoveSpeed() {
  return getServerMoveSpeedForStat(getStaffRelevantStat("server"));
}

function getFarmerCooldown() {
  return getFarmerCooldownForStat(getStaffRelevantStat("farmer"));
}

function getServerTargetPosition(table) {
  return {
    x: table.x < WORLD_WIDTH * 0.5 ? table.x + 52 : table.x - 52,
    y: table.y + 28,
  };
}

function getStoveById(stoveId, targetState = state) {
  return targetState.restaurant.stoves.find((stove) => stove.id === stoveId) || null;
}

function getChefHomePosition(targetState = state) {
  const stoves = Array.isArray(targetState?.restaurant?.stoves) ? targetState.restaurant.stoves : [];
  if (stoves.length === 0) {
    return { ...CHEF_HOME_FALLBACK_POSITION };
  }
  const avgX = stoves.reduce((sum, stove) => sum + stove.x, 0) / stoves.length;
  const topY = Math.min(...stoves.map((stove) => stove.y));
  return {
    x: avgX,
    y: topY - 38,
  };
}

function getChefTargetPositionForStove(stove) {
  return {
    x: stove.x,
    y: stove.y - 38,
  };
}

function fillChefLineTemplate(template, recipeId = null) {
  const recipeName = recipeId ? getRecipe(recipeId)?.name || "이 메뉴" : "지금 메뉴";
  return template.replaceAll("{recipe}", recipeName);
}

function pickRandom(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return "";
  }
  return list[Math.floor(Math.random() * list.length)] || "";
}

function hasRestaurantTraffic(targetState = state) {
  const queueCount = Array.isArray(targetState.restaurant?.queue) ? targetState.restaurant.queue.length : 0;
  const seatedCount = Array.isArray(targetState.restaurant?.tables)
    ? targetState.restaurant.tables.filter((table) => Boolean(table.customer)).length
    : 0;
  const pendingCount = Array.isArray(targetState.restaurant?.pendingOrders)
    ? targetState.restaurant.pendingOrders.length
    : 0;
  const departingCount = Array.isArray(targetState.restaurant?.departingCustomers)
    ? targetState.restaurant.departingCustomers.length
    : 0;
  return queueCount + seatedCount + pendingCount + departingCount > 0;
}

function getChefIdleKind(targetState = state) {
  return hasRestaurantTraffic(targetState) ? "idle" : "idleEmpty";
}

function pickChefLine(kind, recipeId = null) {
  if (kind === "cook" && recipeId) {
    const recipePool = CHEF_RECIPE_COOK_LINES[recipeId];
    if (recipePool?.length) {
      return pickRandom(recipePool);
    }
  }
  const pool = CHEF_LINE_POOLS[kind] || CHEF_LINE_POOLS.idle;
  return fillChefLineTemplate(pickRandom(pool), recipeId);
}

function setChefLine(kind, recipeId = null, options = {}) {
  const actor = state.chefActor;
  const now = state.clock;
  const minGap = options.force ? 0.4 : options.minGap ?? 1.4;
  if (!options.force && now < actor.nextTalkAt - minGap) {
    return;
  }
  actor.line = pickChefLine(kind, recipeId);
  actor.lineUntil = now + (options.duration ?? 2.5);
  actor.nextTalkAt = now + (options.nextDelay ?? (kind === "idle" || kind === "idleEmpty" ? 7.2 : 5.1));
}

function getChefActiveStoves(targetState = state) {
  return targetState.restaurant.stoves.filter((stove) => Boolean(stove.order));
}

function getChefFocusStove(actor, activeStoves) {
  if (activeStoves.length === 0) {
    return null;
  }
  if (activeStoves.length === 1) {
    actor.busySwitchAt = state.clock + 0.9;
    return activeStoves[0];
  }

  const currentIndex = activeStoves.findIndex((stove) => stove.id === actor.stoveId);
  if (currentIndex >= 0 && state.clock < actor.busySwitchAt) {
    return activeStoves[currentIndex];
  }

  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % activeStoves.length : 0;
  actor.busySwitchAt = state.clock + 0.7;
  return activeStoves[nextIndex];
}

function getProtagonistWanderPositions() {
  return [
    { x: WORLD_CENTER_X - 130, y: 480 },
    { x: WORLD_CENTER_X + 130, y: 480 },
    { x: WORLD_CENTER_X, y: 520 },
    { x: WORLD_CENTER_X - 130, y: 600 },
    { x: WORLD_CENTER_X + 130, y: 600 },
    { x: WORLD_CENTER_X, y: 650 },
  ];
}

function updateChefActor(dt) {
  const actor = state.chefActor;
  const activeStoves = getChefActiveStoves();
  actor.activeCount = activeStoves.length;

  if (actor.lineUntil <= state.clock) {
    actor.line = "";
  }

  // 요리사 스태프가 있으면 주인공은 홀을 돌아다님
  if (getStaffLevel("chef") > 0) {
    const wanderPositions = getProtagonistWanderPositions();
    actor.stoveId = null;
    actor.mode = "wander";
    if (state.clock >= actor.wanderNextAt) {
      actor.wanderTargetIdx = Math.floor(Math.random() * wanderPositions.length);
      actor.wanderNextAt = state.clock + 3.5 + Math.random() * 3;
    }
    const wanderTarget = wanderPositions[actor.wanderTargetIdx ?? 0];
    actor.targetX = wanderTarget.x;
    actor.targetY = wanderTarget.y;
    actor.stirPhase += dt * 3;
    const mover = { x: actor.x, y: actor.y, targetX: actor.targetX, targetY: actor.targetY, moveSpeed: 72 };
    moveCustomerTowardTarget(mover, dt);
    actor.x = mover.x;
    actor.y = mover.y;
    return;
  }

  let target = getChefHomePosition();
  if (activeStoves.length > 0) {
    const focusStove = getChefFocusStove(actor, activeStoves);
    actor.stoveId = focusStove?.id || null;
    actor.mode = activeStoves.length > 1 ? "rush" : "cooking";
    target = focusStove ? getChefTargetPositionForStove(focusStove) : getChefHomePosition();

    if (state.clock >= actor.nextTalkAt) {
      setChefLine(activeStoves.length > 1 ? "rush" : "cook", focusStove?.order?.recipeId || null, {
        duration: 2.6,
        nextDelay: activeStoves.length > 1 ? 4.8 : 5.2,
      });
    }
  } else {
    actor.stoveId = null;
    actor.mode = "idle";
    if (state.clock >= actor.nextTalkAt) {
      setChefLine(getChefIdleKind(), null, {
        duration: 2.6,
        nextDelay: 7.4,
      });
    }
  }

  actor.targetX = target.x;
  actor.targetY = target.y;
  actor.stirPhase += dt * (activeStoves.length > 1 ? 16 : activeStoves.length === 1 ? 10 : 3);

  const mover = {
    x: actor.x,
    y: actor.y,
    targetX: actor.targetX,
    targetY: actor.targetY,
    moveSpeed: actor.moveSpeed + (activeStoves.length > 1 ? 22 : 0),
  };
  moveCustomerTowardTarget(mover, dt);
  actor.x = mover.x;
  actor.y = mover.y;
}

function isChefWorkingOnStove(stove) {
  const actor = state.chefActor;
  if (!stove?.order || actor.stoveId !== stove.id) {
    return false;
  }
  const target = getChefTargetPositionForStove(stove);
  return Math.hypot(actor.x - target.x, actor.y - target.y) < 26;
}

function getStaffUpgradeCost(staffId) {
  const staff = state.staffs[staffId];
  const def = getStaffDef(staffId);
  if (!staff || !def) {
    return null;
  }
  if (staff.level <= 0) {
    return def.baseCost;
  }
  const nextLevelRow = getStaffLevelRow(staffId, staff.level + 1);
  return nextLevelRow ? Number(nextLevelRow.levelUpPrice || 0) : null;
}

function hireOrUpgradeStaff(staffId) {
  const def = getStaffDef(staffId);
  const staff = state.staffs[staffId];
  if (!def || !staff) {
    return;
  }

  if (staff.level >= def.maxLevel) {
    pushLog(`${def.title}은(는) 이미 최대 레벨이다.`);
    return;
  }

  const cost = getStaffUpgradeCost(staffId);
  if (cost === null) {
    pushLog(`${def.title}은(는) 이미 최대 레벨이다.`);
    return;
  }
  if (state.resources.acorns < cost) {
    pushLog(`도토리가 부족해서 ${def.title}을(를) 고용할 수 없다.`);
    return;
  }

  state.resources.acorns -= cost;
  staff.level += 1;

  if (staffId === "server" && staff.level === 1) {
    const home = getServerHomePosition();
    staff.x = home.x;
    staff.y = home.y;
    staff.targetX = home.x;
    staff.targetY = home.y;
    staff.tableId = null;
    staff.mode = "idle";
  }

  if (staffId === "promoter") {
    staff.timer = Math.min(staff.timer || getPromoterCooldown(), 2.2);
  }

  pushLog(`${def.title} 레벨이 ${staff.level}이 되었다.`);
  refreshAllUI();
}

function updatePromoterStaff(dt) {
  const promoter = state.staffs.promoter;
  if (promoter.level <= 0) {
    return;
  }

  promoter.timer -= dt;
  if (promoter.timer > 0) {
    return;
  }

  promoter.timer = getPromoterCooldown();
  setStaffBubble("promoter", pickRandom(STAFF_WORK_LINES.promoter));
  let addedCount = 0;
  if (queueCustomer(state)) {
    addedCount += 1;
  }
  const extraChance = getPromoterExtraCustomerChanceForStat(getStaffRelevantStat("promoter"));
  if (extraChance > 0 && Math.random() < extraChance && queueCustomer(state)) {
    addedCount += 1;
  }
  if (addedCount > 0) {
    pushLog(`홍보직원이 새 손님 ${addedCount}명을 데려왔다.`);
  }
}

function updateFarmerStaff(dt) {
  const farmer = state.staffs.farmer;
  if (farmer.level <= 0 || state.scene !== SCENE_FARM) {
    return;
  }
  if (getEmptyFarmCellIndexes().length === 0) {
    return;
  }

  farmer.timer -= dt;
  if (farmer.timer > 0) {
    return;
  }

  farmer.timer = getFarmerCooldown();
  setStaffBubble("farmer", pickRandom(STAFF_WORK_LINES.farmer));
  const candidate = getAssignedStaffCandidate("farmer");
  let spawnedCount = 0;
  const spawned = spawnFarmBaseItem(state, {
    consumeCharge: false,
    note: `${candidate?.name || "농장 직원"}이(가) 밭에 기초 재료를 뿌려뒀다.`,
  });
  if (spawned) {
    spawnedCount += 1;
  }
  const extraChance = getFarmerExtraSpawnChanceForStat(getStaffRelevantStat("farmer"));
  if (extraChance > 0 && Math.random() < extraChance) {
    const extraSpawned = spawnFarmBaseItem(state, {
      consumeCharge: false,
      note: `${candidate?.name || "농장 직원"}이(가) 재료를 하나 더 챙겨뒀다.`,
    });
    if (extraSpawned) {
      spawnedCount += 1;
    }
  }
  if (spawnedCount > 0) {
    renderDynamicUI();
  }
}

function updateServerStaff(dt) {
  const server = state.staffs.server;
  if (server.level <= 0) {
    return;
  }

  const home = getServerHomePosition();

  if (server.mode === "idle") {
    const targetTable = state.restaurant.tables.find(
      (table) => table.customer?.state === "awaiting_order"
    );
    if (targetTable) {
      const target = getServerTargetPosition(targetTable);
      server.tableId = targetTable.id;
      server.targetX = target.x;
      server.targetY = target.y;
      server.mode = "moving_to_table";
      setStaffBubble("server", pickRandom(STAFF_WORK_LINES.server));
    } else {
      server.targetX = home.x;
      server.targetY = home.y;
    }
  }

  const fakeServer = {
    x: server.x,
    y: server.y,
    targetX: server.targetX,
    targetY: server.targetY,
    moveSpeed: getServerMoveSpeed(),
  };
  const arrived = moveCustomerTowardTarget(fakeServer, dt);
  server.x = fakeServer.x;
  server.y = fakeServer.y;

  if (!arrived) {
    return;
  }

  if (server.mode === "moving_to_table") {
    const table = getTableById(server.tableId);
    if (table?.customer?.state === "awaiting_order") {
      acceptOrder(server.tableId, "server");
    }
    server.tableId = null;
    server.targetX = home.x;
    server.targetY = home.y;
    server.mode = "returning";
    return;
  }

  if (server.mode === "returning") {
    server.mode = "idle";
  }
}

function assignOrdersToStoves() {
  for (const stove of state.restaurant.stoves) {
    if (stove.order || state.restaurant.pendingOrders.length === 0) {
      continue;
    }

    const order = state.restaurant.pendingOrders.shift();
    stove.order = order;
    stove.progress = 0;
    stove.total = getRecipeCookTime(order.recipeId);
    stove.assignedAt = state.clock;

    const table = getTableById(order.tableId);
    if (table && table.customer) {
      table.customer.state = "cooking";
      table.customer.speech = "조리 중";
    }

    state.chefActor.stoveId = stove.id;
    state.chefActor.busySwitchAt = state.clock + (getChefActiveStoves().length > 1 ? 0.45 : 0.9);
    setChefLine(getChefActiveStoves().length > 1 ? "rush" : "start", order.recipeId, {
      force: true,
      duration: 2.4,
      nextDelay: 4.2,
    });
  }
}

function updateStoves(dt) {
  for (const stove of state.restaurant.stoves) {
    if (!stove.order) {
      continue;
    }

    stove.progress += dt;
    if (stove.progress < stove.total) {
      continue;
    }

    const table = getTableById(stove.order.tableId);
    if (table && table.customer) {
      table.customer.state = "eating";
      table.customer.speech = "맛있다!";
      table.customer.eatTimer = getEatDuration();
      table.customer.mealStartedAt = state.clock;
    }

    setChefLine("finish", stove.order.recipeId, {
      force: true,
      duration: 2.1,
      nextDelay: 4.1,
    });

    stove.order = null;
    stove.progress = 0;
    stove.total = 0;
    stove.assignedAt = 0;
  }
}

function updateTables(dt) {
  for (const table of state.restaurant.tables) {
    if (!table.customer || table.customer.state !== "eating") {
      continue;
    }

    table.customer.eatTimer -= dt;
    if (table.customer.eatTimer > 0) {
      continue;
    }

    const satisfaction = evaluateCustomerSatisfaction(table.customer);
    const payout = getRecipePayout(table.customer.recipeId);
    state.resources.acorns += payout;
    showToast(`🌰 +${formatNumber(payout)}`, {
      anchorRect: {
        x: table.x - 38,
        y: table.y - 28,
        width: 76,
        height: 24,
      },
    });
    state.metrics.served += 1;
    if (!isPlainObject(state.metrics.recipeServedCounts)) {
      state.metrics.recipeServedCounts = {};
    }
    const servedRecipeId = table.customer.recipeId;
    state.metrics.recipeServedCounts[servedRecipeId] = Number(state.metrics.recipeServedCounts[servedRecipeId] || 0) + 1;
    state.metrics.earnedFromService += payout;
    state.metrics.satisfactionCounts[satisfaction.id] += 1;
    state.metrics.latestSatisfaction = {
      tierId: satisfaction.id,
      label: satisfaction.label,
      emoji: satisfaction.emoji,
      score: Number(satisfaction.score.toFixed(1)),
      customerName: table.customer.name,
      recipeName: getRecipeNameByLevel(table.customer.recipeId),
    };
    pushLog(
      `${getRecipeNameByLevel(table.customer.recipeId)} 판매 완료. ${satisfaction.label} (${satisfaction.summaryText}) · 도토리 +${payout}`
    );
    const departingCustomer = table.customer;
    departingCustomer.satisfaction = satisfaction;
    departingCustomer.feedbackTimer = 2.2;
    createTaggedPostForCustomer(departingCustomer, satisfaction);
    registerCustomerServed(state, departingCustomer.profileId);
    const patronRewards = grantCustomerPatronRewards(state, departingCustomer.profileId);
    if (isPositiveSatisfaction(satisfaction)) {
      registerCustomerSatisfied(state, departingCustomer.profileId);
    }
    for (const reward of patronRewards) {
      if (reward.recipeUnlockId) {
        const recipe = getRecipe(reward.recipeUnlockId);
        pushLog(
          `${reward.profileName}이(가) 단골 Lv.${reward.level}이 되며 ${recipe?.emoji || "📘"} ${
            recipe?.name || "새 레시피"
          }를 알려줬다.`
        );
      } else {
        pushLog(
          `${reward.profileName}이(가) 단골 Lv.${reward.level}이 되었다. 보상을 챙겨보거덩요.`
        );
      }
      queueCustomerPatronCelebration(reward);
    }
    if (patronRewards.length > 0 && typeof persistStateNow === "function") {
      persistStateNow();
    }
    departingCustomer.state = "leaving";
    departingCustomer.speech = satisfaction.label;
    departingCustomer.tableId = null;
    setCustomerTarget(
      departingCustomer,
      CUSTOMER_EXIT_POINT.x + ((departingCustomer.id % 3) - 1) * 18,
      CUSTOMER_EXIT_POINT.y + (departingCustomer.id % 2) * 12
    );
    state.restaurant.departingCustomers.push(departingCustomer);
    table.customer = null;
    refreshAllUI();
  }
}

function getEatDuration() {
  return Math.max(1.6, 3.2 * (1 - state.study.skillBonuses.eat));
}

function getSatisfactionTier(score) {
  return SATISFACTION_TIERS.find((tier) => score >= tier.minScore) || SATISFACTION_TIERS[SATISFACTION_TIERS.length - 1];
}

function addSatisfactionFactor(factors, value, label, kind = "positive") {
  if (Math.abs(value) < 0.05) {
    return;
  }
  factors.push({ value, label, kind });
}

function describeSatisfactionBit(label, kind = "positive") {
  const positive = {
    "선호 메뉴": "취향 메뉴를 제대로 만났다",
    "레시피 완성도": "요리 완성도가 좋았다",
    "공부 효과": "운영이 안정적으로 느껴졌다",
    "분위기": "숲속 분위기가 좋았다",
    "요리사 지원": "주방 템포가 안정적이었다",
    "빠른 서빙": "생각보다 금방 나왔다",
  };
  const negative = {
    "입장 대기": "줄이 조금 길었다",
    "주문 대기": "음식이 나오기까지 기다림이 있었다",
  };
  return (kind === "negative" ? negative : positive)[label] || label;
}

function buildSatisfactionSummary(positives, negatives) {
  if (negatives.length > 0 && positives.length > 0) {
    return `${positives[0].label}은 좋았지만 ${negatives[0].label}이 조금 아쉬움`;
  }
  if (negatives.length > 0) {
    return `${negatives[0].label}이 길어 만족도가 내려감`;
  }
  if (positives.length > 1) {
    return `${positives[0].label}, ${positives[1].label} 모두 좋았음`;
  }
  if (positives.length > 0) {
    return `${positives[0].label} 덕분에 기분 좋게 식사함`;
  }
  return "무난하게 식사를 마침";
}

function buildDepartureBubbleText(customer, tier, positives, negatives) {
  const recipeName = getRecipeNameByLevel(customer.recipeId) || "오늘 메뉴";
  const pool = {
    happy: [
      "꽤 만족했어!",
      "기분 좋게 먹었다!",
      `${recipeName} 괜찮네!`,
      "다음에도 들를래!",
      "오늘 한 끼 좋았어!",
    ],
    okay: [
      "무난하게 잘 먹었어.",
      "생각보다 괜찮네.",
      `${recipeName} 나쁘지 않네.`,
      "편하게 한 끼 했다.",
      "다음엔 딴 메뉴 먹어볼래.",
    ],
  }[tier.id]?.slice() || ["잘 먹고 간다."];

  if (customer.preferredRecipes.includes(customer.recipeId)) {
    pool.push(`${recipeName} 취향저격!`);
  }

  const strongestPositive = positives[0]?.label || "";
  if (strongestPositive === "빠른 서빙") {
    pool.push("생각보다 금방 나왔네!");
  } else if (strongestPositive === "분위기") {
    pool.push("여기 분위기 진짜 좋다.");
  } else if (strongestPositive === "선호 메뉴") {
    pool.push("내 취향 제대로 찾았네!");
  }

  let picked = pool[Math.floor(Math.random() * pool.length)];
  const previous = LAST_DEPARTURE_BUBBLE_BY_TIER.get(tier.id);
  if (pool.length > 1 && previous === picked) {
    const candidates = pool.filter((entry) => entry !== previous);
    picked = candidates[Math.floor(Math.random() * candidates.length)] || picked;
  }
  LAST_DEPARTURE_BUBBLE_BY_TIER.set(tier.id, picked);
  return picked;
}

function isPositiveSatisfaction(satisfaction) {
  return Boolean(satisfaction && satisfaction.id === "happy");
}

function evaluateCustomerSatisfaction(customer) {
  const recipe = getRecipe(customer.recipeId);
  const owned = state.recipes.owned[customer.recipeId] || { level: 1 };
  const queueWait = Math.max(
    0,
    (customer.tableAssignedAt ?? customer.seatedAt ?? state.clock) - (customer.createdAt ?? state.clock)
  );
  const serviceWait = Math.max(
    0,
    (customer.mealStartedAt ?? state.clock) - (customer.seatedAt ?? state.clock)
  );
  const factors = [];

  addSatisfactionFactor(factors, 4.2, "기본 만족");
  if (customer.preferredRecipes.includes(customer.recipeId)) {
    addSatisfactionFactor(factors, 2.6, "선호 메뉴");
  }

  addSatisfactionFactor(factors, Math.min(2.1, (owned.level - 1) * 0.45), "레시피 완성도");
  addSatisfactionFactor(factors, Math.min(1.8, state.restaurant.ambience * 0.7), "분위기");
  addSatisfactionFactor(factors, Math.min(1.4, getStaffLevel("chef") * 0.45), "요리사 지원");
  addSatisfactionFactor(
    factors,
    getServerSatisfactionSupportForStat(getStaffRelevantStat("server")),
    "홀 응대 지원"
  );
  addSatisfactionFactor(
    factors,
    Math.max(0, Math.min(1.2, (6.5 - serviceWait) * 0.35)),
    "빠른 서빙"
  );
  addSatisfactionFactor(
    factors,
    -Math.max(0, Math.min(2.4, (queueWait - 5.5) * 0.22)),
    "입장 대기",
    "negative"
  );
  addSatisfactionFactor(
    factors,
    -Math.max(0, Math.min(3.2, (serviceWait - 7.5) * 0.24)),
    "주문 대기",
    "negative"
  );

  const score = factors.reduce((sum, factor) => sum + factor.value, 0);
  const tier = getSatisfactionTier(score);
  const positives = factors
    .filter((factor) => factor.value > 0.05 && factor.label !== "기본 만족")
    .sort((left, right) => right.value - left.value)
    .slice(0, 2);
  const negatives = factors
    .filter((factor) => factor.value < -0.05)
    .sort((left, right) => left.value - right.value)
    .slice(0, 2)
    .map((factor) => ({ ...factor, value: Math.abs(factor.value) }));

  return {
    id: tier.id,
    label: tier.label,
    emoji: tier.emoji,
    bubbleText: buildDepartureBubbleText(customer, tier, positives, negatives),
    imageTier: tier.imageTier,
    serviceLikeBonus: tier.serviceLikeBonus,
    socialLikes: tier.socialLikes,
    bubbleFill: tier.bubbleFill,
    bubbleInk: tier.bubbleInk,
    score,
    queueWait,
    serviceWait,
    positives,
    negatives,
    summaryText: buildSatisfactionSummary(positives, negatives),
    highlightText:
      positives[0]?.label
        ? describeSatisfactionBit(positives[0].label)
        : "편하게 한 끼 하고 왔다",
    concernText:
      negatives[0]?.label
        ? describeSatisfactionBit(negatives[0].label, "negative")
        : "크게 아쉬운 점은 없었다",
  };
}

function getStudyCost(level = state.study.level) {
  if (level >= STUDY_MAX_LEVEL) {
    return null;
  }
  const studyCount = Math.max(0, Number(level || 0));
  return Math.floor(
    30 *
      Math.pow(studyCount + 1, 1.8) *
      Math.pow(2, Math.floor(studyCount / 10))
  );
}

function hasRemainingStudySkills(targetState = state) {
  return SKILL_CATALOG.some((skill) => {
    const current = Number(targetState.study?.skillLevels?.[skill.id] || 0);
    return skill.maxLevel === null || current < skill.maxLevel;
  });
}

function isStudySkillFeatureUnlocked(skill, targetState = state) {
  if (!skill?.requiresFeature) {
    return true;
  }
  return isRankFeatureUnlocked(skill.requiresFeature, targetState);
}

function getDraftableStudySkills(targetState = state) {
  return SKILL_CATALOG.filter((skill) => {
    const current = Number(targetState.study?.skillLevels?.[skill.id] || 0);
    const hasRoom = skill.maxLevel === null || current < skill.maxLevel;
    return hasRoom && isStudySkillFeatureUnlocked(skill, targetState);
  });
}

function hasDraftableStudySkills(targetState = state) {
  return getDraftableStudySkills(targetState).length > 0;
}

function hasLockedStudySkills(targetState = state) {
  return SKILL_CATALOG.some((skill) => {
    const current = Number(targetState.study?.skillLevels?.[skill.id] || 0);
    const hasRoom = skill.maxLevel === null || current < skill.maxLevel;
    return hasRoom && !isStudySkillFeatureUnlocked(skill, targetState);
  });
}

function getStudySkillWeight(skill) {
  if (!skill) {
    return 0;
  }
  return Math.max(0, Number(skill.weight ?? 1));
}

function pickWeightedStudySkills(pool, count) {
  const picks = [];
  const remaining = [...pool];
  while (picks.length < count && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, skill) => sum + getStudySkillWeight(skill), 0);
    if (totalWeight <= 0) {
      picks.push(...remaining.slice(0, count - picks.length));
      break;
    }
    let cursor = Math.random() * totalWeight;
    let chosenIndex = 0;
    for (let index = 0; index < remaining.length; index += 1) {
      cursor -= getStudySkillWeight(remaining[index]);
      if (cursor <= 0) {
        chosenIndex = index;
        break;
      }
    }
    picks.push(remaining.splice(chosenIndex, 1)[0]);
  }
  return picks;
}

function handleStudyUpgrade() {
  if (state.mode !== "playing") {
    return;
  }

  if (state.ui.skillDraft.length > 0) {
    pushLog("먼저 이번 스킬 카드를 골라야 다음 공부를 진행할 수 있다.");
    return;
  }

  const cost = getStudyCost();
  if (cost === null) {
    pushLog("공부는 현재 준비된 최대 레벨에 도달했다.");
    return;
  }
  if (state.resources.acorns < cost) {
    pushLog("도토리가 부족해서 공부를 진행할 수 없다.");
    return;
  }

  state.resources.acorns -= cost;
  state.study.level += 1;
  pushLog(`공부 횟수가 ${state.study.level}회가 되었다.`);

  if (hasDraftableStudySkills()) {
    draftSkills();
  }

  refreshAllUI();
}

function draftSkills() {
  const available = getDraftableStudySkills();

  if (available.length === 0) {
    state.ui.skillDraft = [];
    dom.skillModal?.classList.remove("is-open");
    dom.skillModal?.setAttribute("aria-hidden", "true");
    pushLog(
      hasLockedStudySkills()
        ? "새 공부 스킬은 다음 콘텐츠 해금 후 다시 열린다."
        : "준비된 공부 스킬을 모두 익혔다."
    );
    return;
  }

  state.ui.skillDraft = pickWeightedStudySkills(available, Math.min(3, available.length));
  dom.skillModal?.classList.add("is-open");
  dom.skillModal?.setAttribute("aria-hidden", "false");
  renderSkillOptions();
  pushLog("새로운 요리 스킬 선택지가 열렸다.");
}

function chooseSkill(skillId) {
  const skill = SKILL_CATALOG.find((entry) => entry.id === skillId);
  if (!skill) {
    return;
  }

  const nextLevel = Number(state.study.skillLevels[skill.id] || 0) + 1;
  state.study.skillLevels[skill.id] = nextLevel;
  skill.apply(state, nextLevel);
  state.ui.skillDraft = [];
  dom.skillModal?.classList.remove("is-open");
  dom.skillModal?.setAttribute("aria-hidden", "true");
  pushLog(`${skill.title} 스킬을 배워 운영 방향을 강화했다.`);
  refreshAllUI();
}

function grantRecipeOwnership(targetState, recipeId, options = {}) {
  if (!recipeId) {
    return;
  }
  const currentLevel = Math.max(1, Number(options.level || 1));
  targetState.recipes.owned[recipeId] = {
    level: currentLevel,
  };
  if (!targetState.recipes.selectedId) {
    targetState.recipes.selectedId = recipeId;
  }
}

function craftRecipe(recipeId) {
  if (state.mode !== "playing") {
    return;
  }
  const recipe = getRecipe(recipeId);
  if (!recipe) {
    return;
  }
  if (!isRecipeUnlocked(recipe)) {
    pushLog(`${recipe.name} 레시피는 아직 해금되지 않았거덩요.`);
    return;
  }
  if (state.recipes.owned[recipeId]) {
    pushLog(`${getRecipeDisplayName(recipeId)}는 이미 메뉴에 올라가 있거덩요.`);
    return;
  }
  const cost = getRecipeCraftCost(recipeId);
  if (!hasIngredientCost(cost)) {
    pushLog(`${recipe.name} 제작 재료가 부족하거덩요.`);
    return;
  }
  consumeIngredientCost(cost);
  grantRecipeOwnership(state, recipeId, { level: 1 });
  triggerMenuLaunchBonus(recipe, state);
  closeRecipeDetail();
  appendNewUnlocks([recipeId], [], { showRecipeNotice: false });
  queueRecipeCelebration(buildRecipeCelebrationPayload("craft", recipe.id, { level: 1 }));
  pushLog(`${recipe.emoji} ${recipe.name} 완성. 이제 메뉴로 판매할 수 있다!`);
  refreshAllUI();
}

function enhanceRecipe(recipeId) {
  const owned = state.recipes.owned[recipeId];
  const recipe = getRecipe(recipeId);
  if (!owned || !recipe) {
    return;
  }

  const cost = getRecipeUpgradeCost(recipeId, owned.level);
  if (!cost) {
    pushLog(`${getRecipeDisplayName(recipeId, owned.level)}는 이미 최고 단계거덩요.`);
    return;
  }
  if (!hasIngredientCost(cost)) {
    pushLog(`${getRecipeDisplayName(recipeId, owned.level)} 진화 재료가 아직 모자라거덩요.`);
    return;
  }

  consumeIngredientCost(cost);
  owned.level += 1;
  pushLog(`${recipe.emoji} ${getRecipeDisplayName(recipeId, owned.level)} 완성. 메뉴가 더 강해졌다!`);
  refreshAllUI();
}

function buyNextExpansion() {
  if (!canBuyMoreExpansionsForRank()) {
    pushLog("지금 구매할 수 있는 확장이 없다.");
    return;
  }
  const offer = getNextExpansion();
  if (!offer) {
    pushLog("현재 준비된 확장을 모두 구매했다.");
    return;
  }

  if (state.resources.acorns < offer.cost) {
    pushLog("도토리가 부족해서 확장을 구매할 수 없다.");
    return;
  }

  state.resources.acorns -= offer.cost;
  state.restaurant.expansionIndex += 1;
  state.restaurant.purchased.push(offer.title);
  offer.apply(state);
  pushLog(`${offer.title} 완료. 식당 구조가 한 단계 확장됐다.`);
  refreshAllUI();
}

function getNextExpansion() {
  return EXPANSION_SEQUENCE[state.restaurant.expansionIndex] || null;
}

function getTableById(tableId) {
  return state.restaurant.tables.find((table) => table.id === tableId) || null;
}

function getRecipe(recipeId) {
  return RECIPE_BY_ID.get(recipeId) || null;
}

function getCustomerProfileBadge(profileId) {
  return getCustomerProfile(profileId)?.badge || "🐥";
}

function getCustomerAccent(profileId) {
  return getCustomerProfile(profileId)?.accent || "#f6d96a";
}

function getOwnedRecipes() {
  return Object.entries(state.recipes.owned)
    .map(([recipeId, owned]) => ({ recipe: getRecipe(recipeId), owned }))
    .filter((entry) => Boolean(entry.recipe))
    .sort((left, right) => {
      if (right.owned.level !== left.owned.level) {
        return right.owned.level - left.owned.level;
      }
      const rarityOrder = { basic: 0, rare: 1, epic: 2 };
      if (rarityOrder[left.recipe.rarity] !== rarityOrder[right.recipe.rarity]) {
        return rarityOrder[left.recipe.rarity] - rarityOrder[right.recipe.rarity];
      }
      return left.recipe.basePrice - right.recipe.basePrice;
    });
}

function getTotalOwnedRecipeLevel() {
  return Math.max(
    1,
    getOwnedRecipes().reduce((sum, entry) => sum + Math.max(0, Number(entry.owned?.level || 0)), 0)
  );
}

function getRegisteredMenuSalesMultiplier() {
  return getTotalOwnedRecipeLevel();
}

function pickRandomOwnedRecipe() {
  const ownedIds = Object.keys(state.recipes.owned);
  if (ownedIds.length === 0) {
    return RECIPE_CATALOG[0]?.id || null;
  }
  return ownedIds[Math.floor(Math.random() * ownedIds.length)];
}

function getStudyPriceMultiplier() {
  return 1 + state.study.skillBonuses.price;
}

function getCookSpeedMultiplier() {
  const skillBonus = 1 - state.study.skillBonuses.cook;
  return Math.max(0.55, skillBonus);
}

function getRecipePayout(recipeId) {
  const recipe = getRecipe(recipeId);
  const owned = state.recipes.owned[recipeId] || { level: 1 };
  const levelBonus = 1 + (owned.level - 1) * TABLE_RECIPE_PRICE_STEP;
  const launchBonusMultiplier = isMenuLaunchBonusActive() ? MENU_LAUNCH_BONUS_SALES_MULTIPLIER : 1;
  return Math.round(
    recipe.basePrice *
      levelBonus *
      getStudyPriceMultiplier() *
      getChefPriceMultiplier() *
      getRegisteredMenuSalesMultiplier() *
      launchBonusMultiplier
  );
}

function getRecipeCookTime(recipeId) {
  const recipe = getRecipe(recipeId);
  const owned = state.recipes.owned[recipeId] || { level: 1 };
  const levelBonus = 1 - (owned.level - 1) * 0.04;
  return Math.max(
    TABLE_COOK_TIME_MINIMUM,
    recipe.baseCook * levelBonus * getCookSpeedMultiplier() * getChefCookMultiplier()
  );
}

function pushLog(message) {
  state.ui.logs.unshift(message);
  state.ui.logs = state.ui.logs.slice(0, 4);
}

function createFeedId(prefix) {
  const id = `${prefix}-${state.social.feedSeq}`;
  state.social.feedSeq += 1;
  return id;
}

function formatSocialTime(createdAt) {
  const elapsed = Math.max(0, state.clock - createdAt);
  if (elapsed < 60) {
    return "방금";
  }
  if (elapsed < 3600) {
    return `${Math.floor(elapsed / 60)}분 전`;
  }
  return `${Math.floor(elapsed / 3600)}시간 전`;
}

function makeHashtag(label) {
  return label.startsWith("#") ? label : `#${label}`;
}

function getSeenSpecialProfiles() {
  return CUSTOMER_PROFILES.filter((profile) => getCodexEntry(state, profile.id).seen);
}

function getRandomSpecialProfiles(limit = 2) {
  return [...getSeenSpecialProfiles()]
    .sort(() => Math.random() - 0.5)
    .slice(0, limit);
}

function getRecipeTag(recipe) {
  return makeHashtag(recipe.name.replaceAll(" ", ""));
}

function makeGuestHandle(profile) {
  return `@${profile.name.replaceAll(" ", "")}`;
}

function getSocialAudienceBaseline(targetState = state) {
  const followers = Math.max(0, Number(targetState.social?.followers || 0));
  return 10 + Math.floor(Math.sqrt(followers) * 4) + targetState.rank.tierIndex * 3;
}

function getRecipeSocialPrestige(recipe) {
  if (!recipe) {
    return 0;
  }
  if (recipe.rarity === "epic") {
    return 8;
  }
  if (recipe.rarity === "rare") {
    return 5;
  }
  return 3;
}

function getGuestSocialInfluence(profile) {
  if (!profile) {
    return 1;
  }
  return 1.1 + (profile.minRankIndex || 0) * 0.35;
}

function calculateOwnPostMetrics(recipe, comments = []) {
  const audience = getSocialAudienceBaseline();
  const commentCount = Array.isArray(comments) ? comments.length : 0;
  const reactions = Math.round(
    10 +
      audience * 0.55 +
      getRecipeSocialPrestige(recipe) +
      state.restaurant.ambience * 2 +
      Math.min(18, state.metrics.served * 0.35) +
      commentCount * 4 +
      getOwnedRecipes().length * 0.8
  );
  return {
    likes: Math.max(8, reactions),
    followerGain: Math.max(1, 1 + Math.floor(reactions / 22) + Math.floor(commentCount / 2) + Math.floor(audience / 45)),
  };
}

function calculateTaggedReviewMetrics(profile, recipe, satisfaction) {
  const audience = getSocialAudienceBaseline();
  const influence = getGuestSocialInfluence(profile);
  const preferredBonus = profile?.preferredRecipes?.includes(recipe?.id) ? 6 : 0;
  const reactions = Math.round(
    satisfaction.socialLikes +
      audience * 0.35 +
      influence * 6 +
      preferredBonus +
      state.restaurant.ambience * 1.5 +
      getRecipeSocialPrestige(recipe)
  );
  return {
    likes: Math.max(6, reactions),
    followerGain: Math.max(
      1,
      satisfaction.socialFollowers + Math.floor(reactions / 28) + Math.floor(influence)
    ),
  };
}

function calculateUnlockTeaserMetrics(profile, recipe) {
  const audience = getSocialAudienceBaseline();
  const influence = getGuestSocialInfluence(profile);
  const preferredBonus = profile?.preferredRecipes?.includes(recipe?.id) ? 4 : 0;
  const reactions = Math.round(
    10 +
      audience * 0.45 +
      influence * 5 +
      state.rank.tierIndex * 2 +
      getRecipeSocialPrestige(recipe) +
      preferredBonus
  );
  return {
    likes: Math.max(6, reactions),
    followerGain: Math.max(1, 1 + Math.floor(reactions / 32) + Math.floor(influence / 1.5)),
  };
}

function createLocalSocialImage({ recipe, guestBadge, title, subtitle, tone = "warm" }) {
  const artCanvas = document.createElement("canvas");
  artCanvas.width = 512;
  artCanvas.height = 512;
  const art = artCanvas.getContext("2d");

  const gradient = art.createLinearGradient(0, 0, 512, 512);
  if (tone === "night") {
    gradient.addColorStop(0, "#18382a");
    gradient.addColorStop(0.5, "#355f43");
    gradient.addColorStop(1, recipe?.accent || "#db9151");
  } else {
    gradient.addColorStop(0, recipe?.accent || "#db9151");
    gradient.addColorStop(0.55, "#f2d69d");
    gradient.addColorStop(1, "#f8f0dc");
  }
  art.fillStyle = gradient;
  art.fillRect(0, 0, 512, 512);

  for (let index = 0; index < 14; index += 1) {
    art.fillStyle = `rgba(255,255,255,${0.05 + (index % 3) * 0.02})`;
    art.beginPath();
    art.arc(
      48 + (index % 5) * 100 + (index % 2) * 12,
      52 + Math.floor(index / 5) * 112 + (index % 3) * 8,
      18 + (index % 4) * 6,
      0,
      Math.PI * 2
    );
    art.fill();
  }

  art.fillStyle = "rgba(32, 41, 33, 0.16)";
  art.beginPath();
  art.ellipse(256, 316, 146, 46, 0, 0, Math.PI * 2);
  art.fill();

  art.fillStyle = "#fef8ea";
  art.beginPath();
  art.arc(256, 266, 142, 0, Math.PI * 2);
  art.fill();

  art.fillStyle = "#f4ead4";
  art.beginPath();
  art.arc(256, 266, 112, 0, Math.PI * 2);
  art.fill();

  art.fillStyle = recipe?.accent || "#db9151";
  art.beginPath();
  art.arc(256, 266, 86, 0, Math.PI * 2);
  art.fill();

  art.fillStyle = "#fffaf0";
  art.font =
    '900 118px "Avenir Next", "Pretendard Variable", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  art.textAlign = "center";
  art.textBaseline = "middle";
  art.fillText(recipe?.emoji || "🍽️", 256, 262);

  art.fillStyle = "rgba(20, 31, 23, 0.58)";
  roundRect(art, 42, 382, 428, 92, 26);
  art.fill();

  art.fillStyle = "#fff6e6";
  art.font = '800 26px "Avenir Next", "Pretendard Variable", sans-serif';
  art.textAlign = "left";
  art.fillText(title, 70, 420);
  art.font = '600 18px "Avenir Next", "Pretendard Variable", sans-serif';
  art.fillText(subtitle, 70, 452);

  art.fillStyle = "rgba(255, 250, 236, 0.95)";
  roundRect(art, 380, 48, 84, 84, 24);
  art.fill();
  art.fillStyle = recipe?.accent || "#db9151";
  art.font =
    '900 42px "Avenir Next", "Pretendard Variable", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  art.textAlign = "center";
  art.textBaseline = "middle";
  art.fillText(guestBadge || "📷", 422, 90);

  return artCanvas.toDataURL("image/png");
}

function buildOwnPostCaption(recipe) {
  const tableCount = state.restaurant.tables.length;
  const stoveCount = state.restaurant.stoves.length;
  const lines = [
    `${recipe.emoji} ${recipe.name} 라인업 다시 정리 완료. 오늘도 숲속 주방 오픈!`,
    `${tableCount}개 테이블과 ${stoveCount}개 화구로 밤 장사 세팅 끝 🌿`,
    `노을 지나고 조명 켜지는 타이밍이 제일 예쁜 것 같음. 오늘의 대표 메뉴는 ${recipe.name}.`,
  ];
  return lines[state.social.ownPosts.length % lines.length];
}

function buildOwnPostComments(recipe) {
  const guests = getRandomSpecialProfiles(2);
  const comments = guests.map((profile, index) => {
    const samples = [
      `${recipe.emoji} ${recipe.name} 냄새만 봐도 또 가고 싶다...`,
      "사진 구도 왜 이렇게 귀엽냐 ㅋㅋ 다음엔 내가 첫 손님 할래",
      "밤 조명 켜진 분위기 완전 내 취향이야",
    ];
    return {
      guestId: profile.id,
      guestName: profile.name,
      badge: profile.badge,
      text: samples[(state.social.ownPosts.length + index) % samples.length],
    };
  });
  return comments;
}

function captureCurrentScene() {
  try {
    return canvas.toDataURL("image/png");
  } catch (error) {
    const recipe = getRecipe(pickRandomOwnedRecipe());
    return createLocalSocialImage({
      recipe,
      guestBadge: "📸",
      title: "오늘의 숲속 식당",
      subtitle: "현재 장면을 캡처하지 못해 기본 카드로 대체됨",
      tone: "night",
    });
  }
}

function handleCaptureSocialPost() {
  if (state.mode !== "playing") {
    return;
  }

  const remaining = Math.max(0, state.social.nextCaptureAt - state.clock);
  if (remaining > 0) {
    pushLog(`다음 피드 업로드까지 ${Math.ceil(remaining)}초 남았다.`);
    refreshAllUI();
    return;
  }

  const recipe = getRecipe(pickRandomOwnedRecipe());
  const comments = buildOwnPostComments(recipe);
  const metrics = calculateOwnPostMetrics(recipe, comments);
  const post = {
    id: createFeedId("my"),
    type: "my",
    authorName: "노란 요리사",
    authorBadge: "🐣",
    handle: SOCIAL_HANDLE,
    createdAt: state.clock,
    caption: buildOwnPostCaption(recipe),
    hashtags: [makeHashtag("노란요리사"), makeHashtag("숲속식당"), getRecipeTag(recipe)],
    likes: metrics.likes,
    comments,
    imageData: captureCurrentScene(),
    recipeId: recipe.id,
    followerGain: metrics.followerGain,
    rewardClaimed: false,
    isNew: true,
    claimedAt: null,
  };

  state.social.ownPosts.unshift(post);
  state.social.ownPosts = state.social.ownPosts.slice(0, 12);
  state.social.ownPostCount = (state.social.ownPostCount || 0) + 1;
  state.social.nextCaptureAt = state.clock + state.social.captureCooldown;
  pushLog("병스타그램에 새 피드를 올렸다. 확인하면 팔로워가 붙기 시작한다.");
  refreshAllUI();
}

function buildTaggedReview(profile, recipe, satisfaction) {
  const options = {
    happy: [
      `${recipe.emoji} ${recipe.name} 꽤 만족. ${satisfaction.highlightText}.`,
      `숲속 캠핑 식당 감성 기대 이상. ${recipe.name} 메뉴 추천!`,
      `${SOCIAL_HANDLE} 덕분에 오늘 저녁 성공. 메뉴도 분위기도 둘 다 합격.`,
    ],
    okay: [
      `${recipe.emoji} ${recipe.name} 무난하게 즐기고 왔다. ${satisfaction.highlightText}.`,
      `조용히 다녀오기 좋았던 숲속 식당. 오늘은 ${recipe.name}로 한 끼 해결.`,
      `${SOCIAL_HANDLE} 덕분에 편하게 쉬다 왔다. 다음엔 다른 메뉴도 먹어볼 듯.`,
    ],
  };
  const captionPool = options[satisfaction.id] || options.okay;
  const caption = captionPool[Math.floor(Math.random() * captionPool.length)];
  const ratingLabel = satisfaction.label;
  const hashtags = [
    makeHashtag("병스타그램"),
    makeHashtag("숲속맛집"),
    getRecipeTag(recipe),
    makeHashtag(
      satisfaction.id === "happy"
        ? "병아리추천"
        : "힐링한끼"
    ),
  ];
  return { caption, hashtags, ratingLabel };
}

function pickRecipeForUnlockPost(profile) {
  const ownedRecipeIds = Object.keys(state.recipes.owned);
  const preferredId = (profile.preferredRecipes || []).find((recipeId) => ownedRecipeIds.includes(recipeId));
  return getRecipe(preferredId || ownedRecipeIds[0] || "salad");
}

function buildUnlockGuestPost(profile, recipe, tierTitle) {
  const captions = [
    `${SOCIAL_HANDLE} 이번에 ${tierTitle} 올라갔다길래 바로 저장. ${recipe.emoji} ${recipe.name} 먹으러 조만간 가볼 예정.`,
    `${recipe.emoji} ${recipe.name} 좋아하는 병아리로서 ${SOCIAL_HANDLE} 새 등급 소식은 못 참지. 첫 방문 각 잡는 중.`,
    `${tierTitle} 달성 소문 듣고 ${SOCIAL_HANDLE} 팔로우 완료. 다음 쉬는 날 ${recipe.name} 먹으러 가야겠다.`,
  ];
  return {
    caption: captions[state.social.taggedPosts.length % captions.length],
    hashtags: [
      makeHashtag("병스타그램"),
      makeHashtag("방문예정"),
      makeHashtag(tierTitle.replaceAll(" ", "")),
      getRecipeTag(recipe),
    ],
    ratingLabel: "방문 예고",
  };
}

function refreshSocialLibraryState() {
  const entries = getSocialLibraryEntries();
  state.social.library.entriesLoaded = entries.length;
  state.social.library.availableRecipes = new Set(entries.map((entry) => entry.recipeId)).size;
  state.social.library.sourceSummary = summarizeLibrarySources(entries);
}

function getPreferredSocialVariants(tier, context = "review") {
  if (context === "unlock") {
    return ["selfie", "table", "hero"];
  }
  if (tier === "viral") {
    return ["hero", "selfie", "table"];
  }
  if (tier === "great") {
    return ["selfie", "table", "hero"];
  }
  return ["table", "selfie", "hero"];
}

function pickWeightedLibraryEntry(entries, preferredVariants = []) {
  if (!entries || entries.length === 0) {
    return null;
  }

  const weighted = entries.map((entry) => {
    const qualityWeight = entry.source === "gemini" ? 4 : entry.source === "seed" ? 1.5 : 1;
    const preferredIndex = preferredVariants.indexOf(entry.variant);
    const variantWeight =
      preferredIndex === 0 ? 3.2 : preferredIndex === 1 ? 2.1 : preferredIndex === 2 ? 1.4 : 1;
    return {
      entry,
      weight: qualityWeight * variantWeight,
    };
  });

  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) {
      return item.entry;
    }
  }
  return weighted[weighted.length - 1].entry;
}

function pickLibraryImageEntry(recipeId, tier, options = {}) {
  const entries = getSocialLibraryEntries();
  if (entries.length === 0) {
    return null;
  }
  const preferredVariants = Array.isArray(options.preferredVariants) ? options.preferredVariants : [];

  const exactTier = entries.filter((entry) => entry.recipeId === recipeId && entry.tier === tier);
  if (exactTier.length > 0) {
    return pickWeightedLibraryEntry(exactTier, preferredVariants);
  }

  const exactRecipe = entries.filter((entry) => entry.recipeId === recipeId);
  if (exactRecipe.length > 0) {
    return pickWeightedLibraryEntry(exactRecipe, preferredVariants);
  }

  const exactMood = entries.filter((entry) => entry.tier === tier);
  if (exactMood.length > 0) {
    return pickWeightedLibraryEntry(exactMood, preferredVariants);
  }

  return pickWeightedLibraryEntry(entries, preferredVariants);
}

function resolveTaggedPostImage(profile, recipe, review, tier, options = {}) {
  const preferredVariants = options.preferredVariants || getPreferredSocialVariants(tier, options.context || "review");
  const entry = pickLibraryImageEntry(recipe.id, tier, { preferredVariants });
  if (entry) {
    return {
      imageData: entry.path,
      imageStatus: "library",
      libraryEntryId: entry.id,
      librarySource: entry.source || "seed",
    };
  }

  return {
    imageData: createLocalSocialImage({
      recipe,
      guestBadge: profile.badge,
      title: `${profile.name}의 리뷰`,
      subtitle: `${recipe.name} • ${review.ratingLabel}`,
      tone: "night",
    }),
    imageStatus: "fallback",
    libraryEntryId: null,
    librarySource: "fallback",
  };
}

function createTaggedPostForCustomer(customer, satisfaction = evaluateCustomerSatisfaction(customer)) {
  return;
}

function createUnlockGuestPosts(guests, tier) {
  if (!guests || guests.length === 0) {
    return;
  }

  let totalFollowerGain = 0;
  for (const profile of guests) {
    const recipe = pickRecipeForUnlockPost(profile);
    if (!recipe) {
      continue;
    }
    const teaser = buildUnlockGuestPost(profile, recipe, tier.title);
    const metrics = calculateUnlockTeaserMetrics(profile, recipe);
    const image = resolveTaggedPostImage(profile, recipe, teaser, "warm", {
      context: "unlock",
      preferredVariants: ["selfie", "table", "hero"],
    });
    const post = {
      id: createFeedId("tag"),
      type: "tagged",
      taggedKind: "unlock",
      guestId: profile.id,
      guestName: profile.name,
      guestBadge: profile.badge,
      authorName: profile.name,
      handle: makeGuestHandle(profile),
      taggedHandle: SOCIAL_HANDLE,
      createdAt: state.clock,
      caption: teaser.caption,
      hashtags: teaser.hashtags,
      likes: metrics.likes,
      comments: [],
      recipeId: recipe.id,
      recipeName: recipe.name,
      recipeEmoji: recipe.emoji,
      ratingLabel: teaser.ratingLabel,
      imageData: image.imageData,
      imageStatus: image.imageStatus,
      libraryEntryId: image.libraryEntryId,
      librarySource: image.librarySource,
      followerGain: metrics.followerGain,
      rewardClaimed: false,
      isNew: true,
      claimedAt: null,
    };
    state.social.taggedPosts.unshift(post);
    totalFollowerGain += post.followerGain || 0;
  }

  state.social.taggedPosts = state.social.taggedPosts.slice(0, 18);
  pushLog(`새로 열린 특별 손님들이 ${SOCIAL_HANDLE} 방문 예고 글을 남겼다. 확인하면 팔로워 +${totalFollowerGain}`);
}
