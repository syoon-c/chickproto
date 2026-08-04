const { loadTables } = window.ChickData;
const {
  GAME_W,
  GAME_H,
  FIXED_DT,
  SAVE_KEY,
  GUEST_MEAL_DURATION_SECONDS,
  FACILITY_META,
  facilityPlacement,
  seatPositions,
  recipeIcon,
  recipeName,
  THEME_NAMES,
  CORE_PROGRESSION,
  RECIPE_PROGRESSION,
  GAME_INGREDIENTS,
  THEME_CHICK_THRESHOLDS,
  GUEST_GRADES,
  GUEST_INGREDIENT_DROP_CHANCE,
  INGREDIENT_SLOT_WEIGHTS,
  INGREDIENT_STORAGE_INITIAL_CAPACITY,
  INGREDIENT_STORAGE_EXPANSION_AMOUNT,
  INGREDIENT_STORAGE_EXPANSION_GEM_COST,
  RECIPE_LEVEL_PRICE_BONUS,
  themeChickMilestones,
  allThemeChickMilestones,
  themeFacilityIcon,
} = window.CHICK_CONFIG;

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
// 임시 비활성 시스템입니다. 저장 데이터와 구현은 보존하므로 이후 그대로 복구할 수 있습니다.
const SYSTEM_ENABLED = Object.freeze({ missions: false, staff: false });
const dom = {
  acorns: document.querySelector("#acorn-count"),
  ideas: document.querySelector("#idea-count"),
  gems: document.querySelector("#gem-count"),
  promoButton: document.querySelector("#promotion-btn"),
  resetButton: document.querySelector("#reset-btn"),
  installPanel: document.querySelector("#install-panel"),
  installClose: document.querySelector("#install-close-btn"),
  installIcon: document.querySelector("#install-icon"),
  installName: document.querySelector("#install-name"),
  installDescription: document.querySelector("#install-description"),
  installCost: document.querySelector("#install-cost"),
  installConfirm: document.querySelector("#install-confirm-btn"),
  menuScreen: document.querySelector("#menu-screen"),
  menuTitle: document.querySelector("#menu-title"),
  menuKicker: document.querySelector("#menu-kicker"),
  menuTabs: document.querySelector("#menu-tabs"),
  menuContent: document.querySelector("#menu-content"),
  recipeReveal: document.querySelector("#recipe-reveal"),
  menuClose: document.querySelector("#menu-close-btn"),
  navButtons: [...document.querySelectorAll(".nav-button")],
  recipeDot: document.querySelector("#recipe-dot"),
  collectionDot: document.querySelector("#collection-dot"),
  toast: document.querySelector("#toast"),
  recipeNavLabel: document.querySelector("#recipe-nav-label"),
  themeNavLabel: document.querySelector("#theme-nav-label"),
};

let tables;
let state;
let lastFrame = performance.now();
let deterministicStepping = false;
let toastTimer = 0;
const imageCache = new Map();
const DRAG_SCROLL_THRESHOLD = 6;
let dragScrollGesture = null;
let suppressedDragClick = null;
let mixingDropIndex = -1;
let recipeReveal = null;
let recipeRevealTimer = 0;
let recipeResearch = null;
const RECIPE_RESEARCH_DURATION = 2.4;
const WEIRD_DISH_ICON = "assets/ui/recipe/icon_recipe_weird.png";

function scrollableAncestors(target) {
  const result = { x: null, y: null };
  let element = target instanceof Element ? target : null;
  while (element && element !== document.body) {
    const style = getComputedStyle(element);
    const scrollsX = /(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1;
    const scrollsY = /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
    if (!result.x && scrollsX) result.x = element;
    if (!result.y && scrollsY) result.y = element;
    if (result.x && result.y) break;
    element = element.parentElement;
  }
  return result;
}

function beginDragScroll(event) {
  if (!event.isPrimary || event.pointerType !== "mouse" || event.button !== 0) return;
  if (!(event.target instanceof Element) || event.target.closest("input, textarea, select, [contenteditable='true']")) return;
  const scrollers = scrollableAncestors(event.target);
  if (!scrollers.x && !scrollers.y) return;
  dragScrollGesture = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    xScroller: scrollers.x,
    yScroller: scrollers.y,
    startScrollLeft: scrollers.x?.scrollLeft || 0,
    startScrollTop: scrollers.y?.scrollTop || 0,
    axis: null,
    scroller: null,
    moved: false,
  };
}

function moveDragScroll(event) {
  const gesture = dragScrollGesture;
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  const deltaX = event.clientX - gesture.startX;
  const deltaY = event.clientY - gesture.startY;
  if (!gesture.axis) {
    if (Math.hypot(deltaX, deltaY) < DRAG_SCROLL_THRESHOLD) return;
    const wantsX = Math.abs(deltaX) > Math.abs(deltaY);
    gesture.axis = wantsX && gesture.xScroller ? "x" : !wantsX && gesture.yScroller ? "y" : gesture.xScroller ? "x" : "y";
    gesture.scroller = gesture.axis === "x" ? gesture.xScroller : gesture.yScroller;
    gesture.moved = true;
    gesture.scroller.classList.add("is-drag-scrolling");
    try { gesture.scroller.setPointerCapture(event.pointerId); } catch {}
  }
  if (gesture.axis === "x") gesture.scroller.scrollLeft = gesture.startScrollLeft - deltaX;
  else gesture.scroller.scrollTop = gesture.startScrollTop - deltaY;
  event.preventDefault();
}

function endDragScroll(event) {
  const gesture = dragScrollGesture;
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  if (gesture.moved) {
    suppressedDragClick = { scroller: gesture.scroller, until: performance.now() + 350 };
    event.preventDefault();
  }
  gesture.scroller?.classList.remove("is-drag-scrolling");
  try { gesture.scroller?.releasePointerCapture(event.pointerId); } catch {}
  dragScrollGesture = null;
}

document.addEventListener("pointerdown", beginDragScroll, true);
window.addEventListener("pointermove", moveDragScroll, { capture: true, passive: false });
window.addEventListener("pointerup", endDragScroll, true);
window.addEventListener("pointercancel", endDragScroll, true);
document.addEventListener("click", (event) => {
  if (!suppressedDragClick) return;
  const shouldSuppress = performance.now() <= suppressedDragClick.until
    && event.target instanceof Node
    && suppressedDragClick.scroller.contains(event.target);
  suppressedDragClick = null;
  if (!shouldSuppress) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

function initialAcorns() {
  const coreInstallCost = [10, 1, 2].reduce((sum, type) => {
    const row = tables.installs.find((item) => item.facilityType === type);
    return sum + Number(row?.facilityPrice || 0);
  }, 0);
  return Math.max(150, Number(tables.general.AccountFirstAcorn ?? 100), coreInstallCost);
}

function createInitialState() {
  return {
    version: 9,
    clock: 0,
    rng: 20260714,
    resources: {
      acorns: initialAcorns(),
      gems: 0,
      ideas: 0,
      stickers: Number(tables.general.StaffStickerDaily || 5),
    },
    installed: [],
    ownedRecipes: { 1: { level: 1, stack: 0, codexClaimed: false } },
    totalResearchCount: 0,
    collections: { customers: {}, specialCustomers: {}, performers: {} },
    staff: {},
    staffDayKey: new Date().toISOString().slice(0, 10),
    performance: { cooldown: Number(tables.general.PerformanceCoolTime || 5), activeId: 0, remaining: 0 },
    themes: {
      opened: tables.restaurantThemes.filter((row) => row.facilityTheme === 1).map((row) => row.id),
      activeByFacility: Object.fromEntries(tables.restaurantThemes.filter((row) => row.facilityTheme === 1).map((row) => [row.facilityType, row.id])),
      unlockedThemeIds: [1],
    },
    crafting: { ingredients: {}, history: [], selected: [], hints: {}, storageCapacity: INGREDIENT_STORAGE_INITIAL_CAPACITY },
    specialActors: [],
    specialLastSpawn: {},
    missions: {
      dayKey: new Date().toISOString().slice(0, 10),
      dailyProgress: { 1001: 1 },
      dailyClaimed: [],
      dailyBonusClaimed: false,
      mainGroup: 1,
      mainProgress: {},
      mainClaimed: [],
    },
    promotion: { progress: 0, queued: 0, totalClicks: 0 },
    guests: [],
    guestSequence: 1,
    orders: [],
    cooking: [],
    payments: [],
    ingredientDrops: [],
    dropSequence: 1,
    tipbox: 0,
    metrics: { visitors: 0, orders: 0, served: 0, collected: 0, angryLeaves: 0, ingredientDropAttempts: 0, ingredientDropMisses: 0, ingredientsFound: 0, giftBundles: 0, giftItems: 0, recipesCrafted: 0, recipeResearchAttempts: 0, failedRecipeResearches: 0 },
    ui: {
      selectedInstallId: null,
      screen: "restaurant",
      tab: "craft",
      themeId: 1,
      collectionCustomerId: 3,
      lastResearch: null,
    },
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!parsed) return null;
    const defaults = createInitialState();
    if (![2, 3, 4, 5, 6, 7, 8, 9].includes(parsed.version)) return null;
    const ownedRecipes = Object.fromEntries(Object.entries(parsed.ownedRecipes || defaults.ownedRecipes).map(([id, value]) => [id,
      typeof value === "object" ? value : { level: Number(value) || 1, stack: 0, codexClaimed: false }]));
    const availableThemePartIds = new Set(tables.restaurantThemes.map((row) => Number(row.id)));
    const openedThemes = (parsed.themes?.opened || defaults.themes.opened)
      .filter((id) => availableThemePartIds.has(Number(id)));
    const activeByFacility = Object.fromEntries(Object.entries({
      ...defaults.themes.activeByFacility,
      ...parsed.themes?.activeByFacility,
    }).map(([facilityType, partId]) => [facilityType,
      availableThemePartIds.has(Number(partId)) ? partId : defaults.themes.activeByFacility[facilityType]])
      .filter(([, partId]) => partId != null));
    const unlockedThemeIds = (parsed.themes?.unlockedThemeIds || [...new Set(openedThemes.map((id) =>
      tables.restaurantThemes.find((row) => row.id === Number(id))?.facilityTheme).filter(Boolean))])
      .map(Number)
      .filter((themeId) => Object.hasOwn(THEME_NAMES, themeId));
    const {
      cafeThemes: _cafeThemes,
      cafeArea: _cafeArea,
      cakeWorkshop: _cakeWorkshop,
      cafeGuests: _cafeGuests,
      cafeGuestSequence: _cafeGuestSequence,
      cafeQueue: _cafeQueue,
      cafePayments: _cafePayments,
      cafeVisit: _cafeVisit,
      ...restaurantSave
    } = parsed;
    const {
      cafeThemeId: _cafeThemeId,
      worldArea: _worldArea,
      themeArea: _themeArea,
      ...savedUi
    } = parsed.ui || {};
    const metrics = Object.fromEntries(Object.keys(defaults.metrics)
      .map((key) => [key, Number(parsed.metrics?.[key] ?? defaults.metrics[key])]));
    const normalizedIngredients = normalizeIngredientInventory({ ...defaults.crafting.ingredients, ...parsed.crafting?.ingredients });
    const storedIngredientTotal = Object.values(normalizedIngredients).reduce((sum, amount) => sum + Number(amount || 0), 0);
    const migratedStorageCapacity = Math.max(
      INGREDIENT_STORAGE_INITIAL_CAPACITY,
      Math.floor(Number(parsed.crafting?.storageCapacity || 0)),
      Math.ceil(storedIngredientTotal / INGREDIENT_STORAGE_EXPANSION_AMOUNT) * INGREDIENT_STORAGE_EXPANSION_AMOUNT,
    );
    return {
      ...defaults,
      ...restaurantSave,
      version: 9,
      resources: { ...defaults.resources, ...parsed.resources },
      ownedRecipes,
      collections: { ...defaults.collections, ...parsed.collections },
      missions: { ...defaults.missions, ...parsed.missions },
      metrics,
      ui: { ...defaults.ui, ...savedUi, screen: "restaurant", tab: "craft" },
      staff: parsed.staff || {},
      performance: { ...defaults.performance, ...parsed.performance },
      themes: {
        ...defaults.themes,
        ...parsed.themes,
        opened: openedThemes,
        unlockedThemeIds,
        activeByFacility,
      },
      crafting: {
        ...defaults.crafting,
        ...parsed.crafting,
        ingredients: normalizedIngredients,
        history: parsed.crafting?.history || [],
        selected: (parsed.crafting?.selected || []).map(Number).filter((id) => ingredientData(id)),
        storageCapacity: migratedStorageCapacity,
        hints: Object.fromEntries(Object.entries(parsed.crafting?.hints || {})
          .map(([recipeId, ingredientIds]) => [Number(recipeId), (Array.isArray(ingredientIds) ? ingredientIds : [])
            .map(Number).filter((ingredientId) => ingredientData(ingredientId))])
          .filter(([recipeId]) => progressionForRecipe(recipeId))),
      },
      specialActors: parsed.specialActors || [],
      specialLastSpawn: parsed.specialLastSpawn || {},
      ingredientDrops: parsed.ingredientDrops || [],
      dropSequence: Number(parsed.dropSequence || 1),
    };
  } catch {
    return null;
  }
}

function saveState() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* storage is optional */ }
}

function random() {
  state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
  return state.rng / 4294967296;
}

function formatNumber(value) {
  const amount = Math.max(0, Number(value) || 0);
  if (amount < 1000) return Math.floor(amount).toLocaleString("ko-KR");
  let unitIndex = 0;
  let scaled = amount;
  while (scaled >= 1000) {
    scaled /= 1000;
    unitIndex += 1;
  }
  const first = String.fromCharCode(96 + ((unitIndex - 1) % 26) + 1);
  const repeats = Math.floor((unitIndex - 1) / 26) + 1;
  return `${Number(scaled.toFixed(2))}${first.repeat(repeats)}`;
}

const ACTION_LABELS = {
  1: "게임에 접속하기", 2: "주문 받기", 3: "홍보하기", 4: "아이템 획득하기",
  6: "공연 진행하기", 7: "팁 수령하기",
  10: "테마 변경하기", 11: "테마 구매하기", 12: "시설 설치하기", 13: "오늘의 할 일 완료하기", 14: "손님 방문하기",
};
const RESOURCE_BY_ITEM = { 101: "acorns", 102: "gems", 103: "ideas", 104: "stickers" };
const RESOURCE_NAMES = { 101: "도토리", 102: "보석", 103: "아이디어", 104: "스티커", 201: "1시간 도토리 교환권", 202: "3시간 도토리 교환권" };

function recipeData(id) {
  return state.ownedRecipes[Number(id)] || state.ownedRecipes[String(id)] || null;
}

function recipeLevelPrice(recipe, owned) {
  return Number(recipe?.foodPrice || 0)
    * (1 + Math.max(0, Number(owned?.level || 1) - 1) * RECIPE_LEVEL_PRICE_BONUS);
}

function restaurantPriceUpMultiplier() {
  const opened = new Set((state.themes.opened || []).map(Number));
  const bonus = tables.restaurantThemes.reduce((sum, row) => (
    opened.has(Number(row.id)) ? sum + Number(row.abilityValue || 0) : sum
  ), 0);
  return 1 + Math.max(0, bonus);
}

function satisfactionPriceMultiplier(mood) {
  return mood === "satisfied"
    ? Number(tables.customerSetting.FoodPriceSatisfactionMultiple || 1.5)
    : 1;
}

function performancePriceMultiplier() {
  return 1 + Math.max(0, Number(activePerformance()?.abilityValue || 0));
}

function restaurantMealPrice(recipeId, mood = "normal") {
  const recipe = getRecipe(recipeId);
  const owned = recipeData(recipeId) || { level: 1 };
  return Math.max(1, Math.round(
    recipeLevelPrice(recipe, owned)
      * restaurantPriceUpMultiplier()
      * satisfactionPriceMultiplier(mood)
      * performancePriceMultiplier()
  ));
}

function progressionForCustomer(customerId) {
  return CORE_PROGRESSION.find((entry) => entry.customerId === Number(customerId));
}

function progressionForRecipe(recipeId) {
  return RECIPE_PROGRESSION.find((entry) => entry.recipeId === Number(recipeId));
}

function progressionForIngredient(ingredientId) {
  return CORE_PROGRESSION.find((entry) => entry.ingredientId === Number(ingredientId));
}

function isThemeUnlocked(themeId) {
  const rows = tables.restaurantThemes.filter((row) => row.facilityTheme === Number(themeId));
  return rows.length > 0 && rows.every((row) => state.themes.opened.includes(row.id));
}

function themeChickProgress(themeId) {
  if (Number(themeId) === 1) {
    const stoneFacilityTypes = new Set(tables.restaurantThemes
      .filter((row) => Number(row.facilityTheme) === 1)
      .map((row) => Number(row.facilityType)));
    const requiredInstalls = tables.installs.filter((row) => stoneFacilityTypes.has(Number(row.facilityType)));
    const opened = requiredInstalls.filter((row) => isInstalled(row.id)).length;
    return {
      opened,
      total: requiredInstalls.length,
      ratio: requiredInstalls.length ? opened / requiredInstalls.length : 0,
    };
  }
  const rows = tables.restaurantThemes.filter((row) => row.facilityTheme === Number(themeId));
  const opened = rows.filter((row) => state.themes.opened.includes(row.id)).length;
  return {
    opened,
    total: rows.length,
    ratio: rows.length ? opened / rows.length : 0,
  };
}

function unlockedThemeChicks(themeId) {
  const milestones = themeChickMilestones(themeId);
  const { ratio } = themeChickProgress(themeId);
  if (Number(themeId) === 1) {
    return milestones.filter((milestone) => milestone.slot === 0 || ratio + Number.EPSILON >= milestone.threshold);
  }
  return milestones.filter((milestone) => ratio + Number.EPSILON >= milestone.threshold);
}

function allUnlockedThemeChicks() {
  return Object.keys(THEME_NAMES).flatMap((themeId) => unlockedThemeChicks(Number(themeId)));
}

function isProgressionRouteUnlocked(route) {
  return Boolean(route && unlockedThemeChicks(route.themeId).some((chick) => chick.customerId === route.customerId));
}

function chickMilestoneForCustomer(customerId) {
  return allThemeChickMilestones().find((milestone) => milestone.customerId === Number(customerId));
}

function ingredientData(ingredientId) {
  const custom = Object.values(GAME_INGREDIENTS).find((ingredient) => ingredient.id === Number(ingredientId));
  return custom ? { id: custom.id, ingredientName: custom.name, emoji: custom.emoji } : null;
}

function ingredientAmount(ingredientId) {
  return Number(state.crafting.ingredients[ingredientId] || 0);
}

function normalizeIngredientInventory(source = {}) {
  return Object.fromEntries(Object.entries(source)
    .map(([id, amount]) => [Number(id), Math.max(0, Math.floor(Number(amount) || 0))])
    .filter(([id, amount]) => amount > 0 && ingredientData(id))
    .sort((a, b) => a[0] - b[0]));
}

function storedIngredientIds() {
  return Object.keys(state.crafting.ingredients).map(Number).filter((id) => ingredientAmount(id) > 0 && ingredientData(id));
}

function ingredientStorageStatus() {
  const ids = storedIngredientIds();
  const totalItems = ids.reduce((sum, id) => sum + ingredientAmount(id), 0);
  const capacity = Math.max(INGREDIENT_STORAGE_INITIAL_CAPACITY, Number(state.crafting.storageCapacity || 0));
  return {
    usedSlots: totalItems,
    slotLimit: capacity,
    totalItems,
    totalLimit: capacity,
    capacity,
    remaining: Math.max(0, capacity - totalItems),
    expansionAmount: INGREDIENT_STORAGE_EXPANSION_AMOUNT,
    expansionGemCost: INGREDIENT_STORAGE_EXPANSION_GEM_COST,
    ingredientTypes: ids.length,
  };
}

function guestGradeForVisits(visits) {
  const count = Math.max(0, Number(visits) || 0);
  return [...GUEST_GRADES].reverse().find((grade) => count >= grade.minVisits) || GUEST_GRADES[0];
}

function nextGuestGradeForVisits(visits) {
  const current = guestGradeForVisits(visits);
  return GUEST_GRADES.find((grade) => grade.minVisits > current.minVisits) || null;
}

function guestRewardItems(route, visits) {
  const grade = guestGradeForVisits(visits);
  const profile = route?.rewardIngredients || route?.ingredientRequirements || [];
  const counts = [grade.primaryCount, grade.secondaryCount, grade.rareCount];
  return profile.slice(0, 3).map((ingredient, index) => ({
    ingredientId: ingredient.id,
    name: ingredient.name,
    emoji: ingredient.emoji,
    count: Number(counts[index] || 0),
    slot: index === 0 ? "primary" : index === 1 ? "secondary" : "special",
    weight: index === 0 ? INGREDIENT_SLOT_WEIGHTS.primary : index === 1 ? INGREDIENT_SLOT_WEIGHTS.secondary : INGREDIENT_SLOT_WEIGHTS.special,
  })).filter((item) => item.count > 0);
}

function unlockedRecipeCount() {
  return Object.keys(state.ownedRecipes).filter((id) => recipeData(id)).length;
}

function recipeCombinationCapacity() {
  const maximumRecipeSize = Math.max(2, ...RECIPE_PROGRESSION.map((route) => Number(route.ingredientCount
    || route.ingredientRequirements?.length || 0)));
  return Math.min(maximumRecipeSize, 2 + Math.floor(unlockedRecipeCount() / 2));
}

function rewardRows(rewardId) { return tables.rewards.get(Number(rewardId)) || []; }

function rewardText(rewardId) {
  return rewardRows(rewardId).map((row) => `${RESOURCE_NAMES[row.assetId] || `아이템 ${row.assetId}`} ${formatNumber(row.assetCount)}`).join(" · ");
}

function grantReward(rewardId) {
  const rows = rewardRows(rewardId);
  rows.forEach((row) => {
    const key = RESOURCE_BY_ITEM[row.assetId];
    if (key) state.resources[key] = (state.resources[key] || 0) + Number(row.assetCount || 0);
    else {
      state.inventory ||= {};
      state.inventory[row.assetId] = (state.inventory[row.assetId] || 0) + Number(row.assetCount || 0);
    }
    dispatchAchievement(4, Number(row.assetCount || 0), Number(row.assetType || 0), Number(row.assetId || 0));
  });
  return rewardText(rewardId);
}

function matchesCondition(mission, targetAssetType, targetId) {
  const conditions = mission.conditions || [];
  if (!conditions.length) return true;
  if (mission.actionType === 12) return Number(targetId) === Number(conditions[0]);
  if (mission.actionType === 4) return Number(targetAssetType) === Number(conditions[0]) && Number(targetId) === Number(conditions[1]);
  return true;
}

function dispatchAchievement(actionType, count = 1, targetAssetType = 0, targetId = 0) {
  if (!SYSTEM_ENABLED.missions) return;
  ensureDailyReset();
  for (const mission of tables.repeatMissions) {
    if (mission.repeatType !== 1 || state.missions.dailyClaimed.includes(mission.id)) continue;
    if (mission.actionType !== actionType || !matchesCondition(mission, targetAssetType, targetId)) continue;
    state.missions.dailyProgress[mission.id] = Math.min(mission.count,
      Number(state.missions.dailyProgress[mission.id] || 0) + count);
  }
  for (const mission of tables.mainMissions.filter((row) => row.missionGroup === state.missions.mainGroup)) {
    if (state.missions.mainClaimed.includes(mission.id) || mission.actionType !== actionType) continue;
    if (!matchesCondition(mission, targetAssetType, targetId)) continue;
    state.missions.mainProgress[mission.id] = Math.min(mission.count,
      Number(state.missions.mainProgress[mission.id] || 0) + count);
  }
  saveState();
  updateHud();
  if (!dom.menuScreen.hidden && state.ui.screen === "missions") renderMenu();
}

function ensureDailyReset() {
  const dayKey = new Date().toISOString().slice(0, 10);
  if (state.missions.dayKey === dayKey) return;
  state.missions.dayKey = dayKey;
  state.missions.dailyProgress = { 1001: 1 };
  state.missions.dailyClaimed = [];
  state.missions.dailyBonusClaimed = false;
}

function missionProgress(mission, main = false) {
  if (main && mission.actionType === 12 && mission.conditions?.length) {
    return isInstalled(Number(mission.conditions[0])) ? mission.count : Number(state.missions.mainProgress[mission.id] || 0);
  }
  return Number((main ? state.missions.mainProgress : state.missions.dailyProgress)[mission.id] || 0);
}

function missionDescription(mission) {
  if (mission.actionType === 12 && mission.conditions?.length) {
    const row = tables.installs.find((item) => item.id === Number(mission.conditions[0]));
    const name = row ? `${FACILITY_META[row.facilityType]?.name || "시설"}${row.facilityGroup > 1 ? ` ${row.facilityGroup}` : ""}` : "시설";
    return `${name} 설치하기`;
  }
  if (mission.actionType === 4 && mission.conditions?.[1]) return `${RESOURCE_NAMES[mission.conditions[1]] || "아이템"} ${formatNumber(mission.count)} 획득하기`;
  return `${ACTION_LABELS[mission.actionType] || "목표 달성하기"} ${formatNumber(mission.count)}회`;
}

function hasMissionReward() {
  const daily = tables.repeatMissions.some((m) => !state.missions.dailyClaimed.includes(m.id) && missionProgress(m) >= m.count);
  const main = tables.mainMissions.some((m) => m.missionGroup === state.missions.mainGroup
    && !state.missions.mainClaimed.includes(m.id) && missionProgress(m, true) >= m.count);
  return daily || main;
}

function registerCollection(id, category = "customers") {
  const dict = state.collections[category];
  if (!dict[id]) dict[id] = { count: 0, firstSeen: Date.now(), isNew: true };
  dict[id].count += 1;
}

function ensureStaffDaily() {
  const dayKey = new Date().toISOString().slice(0, 10);
  if (state.staffDayKey === dayKey) return;
  state.staffDayKey = dayKey;
  const max = Number(tables.general.StaffStickerDaily || 5);
  state.resources.stickers = Math.max(state.resources.stickers || 0, max);
}

function staffLevelRow(staffId, level = null) {
  const current = state.staff[staffId];
  return tables.staffLevels.find((row) => row.staffId === staffId && row.staffLevel === (level || current?.level || 1));
}

function nextStaffLevelRow(staffId) {
  const current = state.staff[staffId];
  return current ? staffLevelRow(staffId, current.level + 1) : null;
}

function hireStaff(staffId) {
  const row = tables.staff.find((item) => item.id === staffId);
  if (!row || state.staff[staffId] || state.resources.acorns < row.staffPrice) return;
  state.resources.acorns -= row.staffPrice;
  state.staff[staffId] = { level: 1, attached: 0, mode: "active", timer: 0, actionTimer: 0 };
  dispatchAchievement(4, 1, 104, staffId);
  showToast(`${row.staffName} 고용 완료!`);
  saveState(); updateHud(); renderMenu();
}

function attachStaffSticker(staffId) {
  const staff = state.staff[staffId];
  const next = nextStaffLevelRow(staffId);
  if (!staff || !next || state.resources.stickers < 1 || staff.attached >= next.sticker) return;
  staff.attached += 1;
  state.resources.stickers -= 1;
  saveState(); renderMenu();
}

function levelUpStaff(staffId) {
  const staff = state.staff[staffId];
  const next = nextStaffLevelRow(staffId);
  if (!staff || !next || staff.attached < next.sticker || state.resources.acorns < next.levelUpPrice) return;
  state.resources.acorns -= next.levelUpPrice;
  staff.level += 1;
  staff.attached = 0;
  showToast(`${tables.staff.find((row) => row.id === staffId)?.staffName} Lv.${staff.level}!`);
  saveState(); updateHud(); renderMenu();
}

function updateStaff(dt) {
  if (!SYSTEM_ENABLED.staff) return;
  ensureStaffDaily();
  for (const [idText, staff] of Object.entries(state.staff)) {
    const id = Number(idText);
    const table = tables.staff.find((row) => row.id === id);
    const level = staffLevelRow(id);
    if (!table || !level) continue;
    staff.timer += dt;
    const duration = staff.mode === "active" ? level.activeTime : level.breakTime;
    if (staff.timer >= duration) {
      staff.mode = staff.mode === "active" ? "break" : "active";
      staff.timer = 0;
      staff.actionTimer = 0;
    }
    if (staff.mode !== "active") continue;
    if (table.staffType === 2) {
      for (const task of state.cooking) task.elapsed += dt * Number(level.abilityValue || 0);
    } else if (table.staffType === 3) {
      staff.actionTimer += dt;
      if (staff.actionTimer >= 1) {
        staff.actionTimer = 0;
        const waiting = state.guests.find((guest) => guest.state === "awaiting_order");
        if (waiting) takeOrder(waiting);
      }
    } else if (table.staffType === 4) {
      staff.actionTimer += dt;
      const interval = level.abilityValue > 0 ? level.activeTime / level.abilityValue : level.activeTime;
      if (staff.actionTimer >= interval) {
        staff.actionTimer = 0;
        state.promotion.queued += 1;
        trySpawnQueuedGuest();
      }
    }
  }
}

function activePerformance() {
  return state.performance.activeId ? tables.performances.find((row) => row.id === state.performance.activeId) : null;
}

function startPerformance() {
  if (installedRows(5).length === 0 || state.performance.cooldown > 0 || state.performance.activeId) return;
  const candidates = tables.performances.filter((row) => state.resources.acorns >= row.price);
  if (!candidates.length) return;
  const total = candidates.reduce((sum, row) => sum + row.performerAppearWeight, 0);
  let roll = random() * total;
  let picked = candidates[0];
  for (const row of candidates) { roll -= row.performerAppearWeight; if (roll < 0) { picked = row; break; } }
  state.resources.acorns -= picked.price;
  state.performance.activeId = picked.id;
  state.performance.remaining = picked.performanceTime;
  registerCollection(picked.id, "performers");
  dispatchAchievement(6);
  showToast(`공연팀 ${picked.id} 공연 시작!`, 3);
  saveState(); updateHud(); renderMenu();
}

function updatePerformance(dt) {
  if (installedRows(5).length === 0) return;
  const before = Math.ceil(state.performance.activeId ? state.performance.remaining : state.performance.cooldown);
  if (state.performance.activeId) {
    state.performance.remaining = Math.max(0, state.performance.remaining - dt);
    if (state.performance.remaining <= 0) {
      state.performance.activeId = 0;
      state.performance.cooldown = Number(tables.general.PerformanceCoolTime || 5);
    }
  } else state.performance.cooldown = Math.max(0, state.performance.cooldown - dt);
  const after = Math.ceil(state.performance.activeId ? state.performance.remaining : state.performance.cooldown);
  if (before !== after && !dom.menuScreen.hidden && state.ui.screen === "performance") renderMenu();
}

function isThemeFacilityAvailable(facilityType) {
  const installRows = tables.installs.filter((row) => row.facilityType === Number(facilityType));
  return installRows.length === 0 || installRows.some((row) => isInstalled(row.id));
}

function checkAndGrantAllCollect(themeId) {
  const rows = tables.restaurantThemes.filter((row) => row.facilityTheme === Number(themeId));
  const currencyRows = rows.filter((row) => row.purchaseType === 1);
  if (!currencyRows.every((row) => state.themes.opened.includes(row.id))) return;
  for (const row of rows.filter((item) => item.purchaseType === 2)) {
    if (!state.themes.opened.includes(row.id)) state.themes.opened.push(row.id);
  }
}

function buyTheme(themeId) {
  const row = tables.restaurantThemes.find((item) => item.id === themeId);
  if (!row || state.themes.opened.includes(themeId)) return;
  if (!isThemeFacilityAvailable(row.facilityType) || row.purchaseType === 2) return;
  const key = RESOURCE_BY_ITEM[row.itemId];
  if (!key || state.resources[key] < row.facilityPrice) return;
  const chicksBefore = unlockedThemeChicks(row.facilityTheme).length;
  state.resources[key] -= row.facilityPrice;
  state.themes.opened.push(row.id);
  state.themes.activeByFacility[row.facilityType] = row.id;
  checkAndGrantAllCollect(row.facilityTheme);
  if (isThemeUnlocked(row.facilityTheme) && !state.themes.unlockedThemeIds.includes(row.facilityTheme)) {
    state.themes.unlockedThemeIds.push(row.facilityTheme);
  }
  dispatchAchievement(11, 1, 0, themeId);
  dispatchAchievement(10);
  const themeRows = tables.restaurantThemes.filter((item) => item.facilityTheme === row.facilityTheme);
  const openedCount = themeRows.filter((item) => state.themes.opened.includes(item.id)).length;
  const newlyUnlocked = unlockedThemeChicks(row.facilityTheme).slice(chicksBefore);
  showToast(newlyUnlocked.length
    ? `${THEME_NAMES[row.facilityTheme]} 진행! ${newlyUnlocked.map((chick) => chick.customerName).join(", ")} 등장.`
    : `${FACILITY_META[row.facilityType]?.name || "설비"} 파츠 구매·적용 · ${openedCount}/${themeRows.length}`, 3);
  saveState(); updateHud(); renderMenu();
  render();
}

function applyTheme(themeId) {
  const row = tables.restaurantThemes.find((item) => item.id === themeId);
  if (!row || !state.themes.opened.includes(themeId)) return;
  state.themes.activeByFacility[row.facilityType] = row.id;
  dispatchAchievement(10);
  showToast(`${FACILITY_META[row.facilityType]?.name || "설비"}에 ${THEME_NAMES[row.facilityTheme] || "테마"} 적용!`);
  saveState(); renderMenu(); render();
}

function applyThemeAll(themeId) {
  const rows = tables.restaurantThemes.filter((row) => row.facilityTheme === Number(themeId));
  let changed = 0;
  for (const row of rows) {
    if (!state.themes.opened.includes(row.id) || !isThemeFacilityAvailable(row.facilityType)) continue;
    if (state.themes.activeByFacility[row.facilityType] === row.id) continue;
    state.themes.activeByFacility[row.facilityType] = row.id;
    changed += 1;
  }
  if (!changed) return;
  dispatchAchievement(10);
  showToast(`보유한 ${THEME_NAMES[themeId] || "테마"} 파츠 ${changed}개 전체 적용!`);
  saveState(); renderMenu(); render();
}

function installedRows(type = null) {
  const ids = new Set(state.installed);
  return tables.installs.filter((row) => ids.has(row.id) && (type === null || row.facilityType === type));
}

function isInstalled(rowId) { return state.installed.includes(rowId); }

function installCandidates() {
  return tables.installs.filter((row) => !isInstalled(row.id)).slice(0, 2);
}

function coreReady() {
  return installedRows(1).length > 0 && installedRows(2).length > 0;
}

function availableSeats() {
  const occupied = new Set(state.guests.filter((guest) => guest.seatId && guest.state !== "leaving").map((guest) => guest.seatId));
  return installedRows(1).flatMap(seatPositions).filter((seat) => !occupied.has(seat.id));
}

function getRecipe(id) {
  const numericId = Number(id);
  const row = tables.recipes.get(numericId);
  if (row) return row;
  const route = progressionForRecipe(numericId);
  const base = route ? tables.recipes.get(Number(route.baseRecipeId)) : null;
  return base ? { ...base, id: numericId, foodPrice: Number(route.foodPrice || base.foodPrice) } : null;
}

function routeRecipeName(id) {
  return progressionForRecipe(id)?.recipeName || recipeName(id);
}

function routeRecipeIcon(id) {
  const route = progressionForRecipe(id);
  return recipeIcon(route?.baseRecipeId || id);
}
function getGuest(id) { return state.guests.find((guest) => guest.id === id); }

function showToast(message, seconds = 2.4) {
  dom.toast.textContent = message;
  dom.toast.hidden = false;
  toastTimer = seconds;
}

function renderRecipeReveal() {
  if (!recipeReveal || state.ui.screen !== "recipe") {
    dom.recipeReveal.hidden = true;
    dom.recipeReveal.innerHTML = "";
    dom.recipeReveal.classList.remove("is-upgrade");
    return;
  }
  const recipeId = recipeReveal.recipeId;
  const isUpgrade = recipeReveal.result === "upgrade";
  const isWeird = recipeReveal.result === "failure";
  dom.recipeReveal.classList.toggle("is-upgrade", isUpgrade);
  if (isUpgrade) {
    dom.recipeReveal.innerHTML = `<section class="recipe-upgrade-card" role="dialog" aria-modal="true" aria-label="레시피 레벨업">
      <span class="recipe-upgrade-kicker">레시피 레벨업</span>
      <div class="recipe-upgrade-icon"><img src="${routeRecipeIcon(recipeId)}" alt="" /><b aria-hidden="true">↑</b></div>
      <h3>${routeRecipeName(recipeId)}</h3>
      <div class="recipe-upgrade-level"><span>Lv.${recipeReveal.previousLevel}</span><i>→</i><strong>Lv.${recipeReveal.newLevel}</strong></div>
      <section class="recipe-upgrade-price">
        <small>판매 가격</small>
        <div><del>${formatNumber(recipeReveal.previousPrice)}</del><i>→</i><strong>${formatNumber(recipeReveal.newPrice)}</strong></div>
        <b>+${formatNumber(recipeReveal.priceIncrease)}원 상승</b>
      </section>
      <p>이제 한 접시마다 ${formatNumber(recipeReveal.priceIncrease)}원 더 받아요.</p>
      <button type="button" data-action="dismiss-recipe-reveal">확인</button>
    </section>`;
    dom.recipeReveal.hidden = false;
    return;
  }
  dom.recipeReveal.innerHTML = `<div class="recipe-reveal-rays" aria-hidden="true"></div>
    <div class="recipe-reveal-sparkles" aria-hidden="true"><i>✦</i><i>✧</i><i>★</i><i>✦</i><i>✧</i><i>★</i></div>
    <section class="recipe-reveal-card ${isWeird ? "is-weird" : ""}" role="dialog" aria-modal="true" aria-label="${isWeird ? "요리 연구 실패" : "새 레시피 발견"}">
      <span class="recipe-reveal-kicker">${isWeird ? "연구 실패!" : "새 레시피 발견!"}</span>
      <div class="recipe-reveal-dish"><span class="recipe-reveal-glow"></span><img src="${isWeird ? WEIRD_DISH_ICON : routeRecipeIcon(recipeId)}" alt="" /></div>
      <h3>${isWeird ? "괴식" : routeRecipeName(recipeId)}</h3>
      <p>${isWeird ? "사용한 재료는 사라졌어요" : recipeReveal.automatic ? "자동 연구가 새 조합을 찾았어요" : "보울 속 재료가 새로운 요리가 됐어요"}</p>
      <button type="button" data-action="dismiss-recipe-reveal">${isWeird ? "치우기" : "짜잔!"}</button>
    </section>`;
  dom.recipeReveal.hidden = false;
}

function dismissRecipeReveal() {
  recipeReveal = null;
  if (recipeRevealTimer) window.clearTimeout(recipeRevealTimer);
  recipeRevealTimer = 0;
  renderRecipeReveal();
}

function startRecipeReveal(recipeId, automatic) {
  recipeReveal = { recipeId: Number(recipeId), automatic: Boolean(automatic), result: "success" };
  if (recipeRevealTimer) window.clearTimeout(recipeRevealTimer);
  recipeRevealTimer = window.setTimeout(dismissRecipeReveal, 3600);
}

function startRecipeUpgradeReveal(recipeId, automatic, previousLevel, newLevel, previousPrice, newPrice) {
  recipeReveal = {
    recipeId: Number(recipeId),
    automatic: Boolean(automatic),
    result: "upgrade",
    previousLevel: Number(previousLevel),
    newLevel: Number(newLevel),
    previousPrice: Number(previousPrice),
    newPrice: Number(newPrice),
    priceIncrease: Math.max(0, Number(newPrice) - Number(previousPrice)),
  };
  if (recipeRevealTimer) window.clearTimeout(recipeRevealTimer);
  recipeRevealTimer = window.setTimeout(dismissRecipeReveal, 3800);
}

function startWeirdDishReveal(automatic) {
  recipeReveal = { recipeId: null, automatic: Boolean(automatic), result: "failure" };
  if (recipeRevealTimer) window.clearTimeout(recipeRevealTimer);
  recipeRevealTimer = window.setTimeout(dismissRecipeReveal, 4200);
}

function closeInstallPanel() {
  state.ui.selectedInstallId = null;
  dom.installPanel.hidden = true;
  render();
}

function openInstallPanel(row) {
  const meta = FACILITY_META[row.facilityType] || FACILITY_META[1];
  state.ui.selectedInstallId = row.id;
  dom.installIcon.src = meta.icon;
  dom.installName.textContent = row.facilityGroup > 1 ? `${meta.name} ${row.facilityGroup}` : meta.name;
  dom.installDescription.textContent = meta.description;
  dom.installCost.textContent = formatNumber(row.facilityPrice);
  dom.installConfirm.disabled = state.resources.acorns < row.facilityPrice;
  dom.installPanel.hidden = false;
}

function confirmInstall() {
  const row = tables.installs.find((item) => item.id === state.ui.selectedInstallId);
  if (!row || isInstalled(row.id)) return closeInstallPanel();
  if (state.resources.acorns < row.facilityPrice) {
    showToast("도토리가 부족해요.");
    return;
  }
  state.resources.acorns -= row.facilityPrice;
  state.installed.push(row.id);
  state.installed.sort((a, b) => a - b);
  dispatchAchievement(12, 1, 0, row.id);
  closeInstallPanel();
  const meta = FACILITY_META[row.facilityType] || FACILITY_META[1];
  showToast(`${meta.name} 설치 완료!`);
  saveState();
  updateHud();
}

function promotionThreshold() { return 1; }

function promote() {
  if (!coreReady()) return;
  dispatchAchievement(3);
  state.promotion.totalClicks += 1;
  state.promotion.progress = 0;
  state.promotion.queued += 1;
  trySpawnQueuedGuest();
  saveState();
  updateHud();
  render();
}

function chooseCustomer() {
  const specialCustomers = tables.customers.filter((row) => {
    const unlocked = row.unlockConditionType === 0
      || (row.unlockConditionType === 1 && isInstalled(row.unlockConditionValue));
    if (!unlocked || row.assetType !== 107 || row.customerAppearWeight <= 0) return false;
    const sp = tables.specialCustomers.find((item) => item.id === row.assetId);
    const last = Number(state.specialLastSpawn[row.assetId] || -Infinity);
    return !state.specialActors.some((actor) => actor.specialId === row.assetId)
      && state.clock - last >= Number(sp?.appearCoolTime || 0);
  });
  const normalCustomers = allUnlockedThemeChicks().map((chick) => ({
    id: chick.customerId,
    assetType: 105,
    assetId: chick.commonId,
    customerAppearWeight: 100,
    chickMilestone: chick,
  }));
  const eligible = [...normalCustomers, ...specialCustomers];
  if (!eligible.length) {
    const chick = themeChickMilestones(1)[0];
    return { id: chick.customerId, assetType: 105, assetId: chick.commonId, customerAppearWeight: 100, chickMilestone: chick };
  }
  const total = eligible.reduce((sum, row) => sum + Math.max(0, row.customerAppearWeight), 0) || eligible.length;
  let roll = random() * total;
  for (const row of eligible) {
    roll -= Math.max(0, row.customerAppearWeight) || 1;
    if (roll <= 0) return row;
  }
  return eligible[0];
}

function chooseRecipe(common) {
  const owned = Object.keys(state.ownedRecipes).map(Number).filter((id) => getRecipe(id));
  const favorites = (common?.recipeIds || []).filter((id) => owned.includes(id));
  if (favorites.length && random() < Number(common.favoriteProbability || 0)) {
    return favorites[Math.floor(random() * favorites.length)];
  }
  return owned[Math.floor(random() * owned.length)] || 1;
}

function trySpawnQueuedGuest() {
  if (state.promotion.queued <= 0) return;
  const customer = chooseCustomer();
  if (customer?.assetType === 107) {
    spawnSpecialCustomer(customer.assetId);
    state.promotion.queued -= 1;
    return;
  }
  const seat = availableSeats()[0];
  if (!seat) {
    showToast("빈자리가 생기면 손님이 들어와요.");
    return;
  }
  const common = tables.commonCustomers.get(customer.assetId) || tables.raw.CommonCustomer[0];
  const recipeId = chooseRecipe(common);
  const guest = {
    id: state.guestSequence++,
    customerId: customer.id,
    commonId: customer.assetId,
    customerName: customer.chickMilestone?.customerName,
    ingredientId: customer.chickMilestone?.ingredientId,
    ingredientEmoji: customer.chickMilestone?.ingredientEmoji,
    rewardIngredients: customer.chickMilestone?.rewardIngredients,
    themeId: customer.chickMilestone?.themeId,
    chickSlot: customer.chickMilestone?.slot,
    state: "arriving",
    seatId: seat.id,
    tableId: seat.tableId,
    x: 240,
    y: 880,
    targetX: seat.x,
    targetY: seat.y,
    recipeId,
    wait: 0,
    stateTime: 0,
    mood: "normal",
    bob: random() * 10,
  };
  state.guests.push(guest);
  state.promotion.queued -= 1;
  state.metrics.visitors += 1;
  registerCollection(customer.id, "customers");
  guest.visitNumber = Number(state.collections.customers[customer.id]?.count || 1);
  dispatchAchievement(14);
  showToast("손님이 레스토랑에 찾아왔어요!");
}

function spawnSpecialCustomer(specialId) {
  state.specialLastSpawn[specialId] = state.clock;
  state.specialActors.push({ specialId, x: 28, y: 470, targetX: 410, targetY: 595, state: "approaching", timer: 0, stolen: 0 });
  registerCollection(specialId, "specialCustomers");
  showToast(specialId === 1 ? "도둑이 팁박스를 노리고 있어요! 눌러서 잡으세요." : "특별 손님이 찾아왔어요!", 4);
}

function catchSpecial(actor) {
  if (!actor || actor.state === "caught") return;
  if (actor.stolen > 0) state.tipbox += actor.stolen;
  actor.state = "caught";
  actor.targetX = 28;
  actor.targetY = 470;
  showToast(actor.specialId === 1 ? "도둑을 잡고 팁을 지켰어요!" : "특별 손님을 만났어요!");
  saveState();
}

function updateSpecialCustomers(dt) {
  for (const actor of state.specialActors) {
    actor.timer += dt;
    if (actor.state === "approaching" && moveTowards(actor, actor.targetX, actor.targetY, 90, dt)) {
      if (actor.specialId === 1) {
        actor.stolen = Math.floor(state.tipbox * Number(tables.customerSetting.ThiefTipBoxAmount || .5));
        state.tipbox -= actor.stolen;
      }
      actor.state = "escaping";
      actor.targetX = 28;
      actor.targetY = 470;
    } else if ((actor.state === "escaping" || actor.state === "caught") && moveTowards(actor, actor.targetX, actor.targetY, actor.state === "caught" ? 220 : 120, dt)) {
      actor.state = "gone";
    }
  }
  state.specialActors = state.specialActors.filter((actor) => actor.state !== "gone");
}

function moveTowards(entity, x, y, speed, dt) {
  const dx = x - entity.x;
  const dy = y - entity.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= speed * dt || distance < 0.5) {
    entity.x = x;
    entity.y = y;
    return true;
  }
  entity.x += (dx / distance) * speed * dt;
  entity.y += (dy / distance) * speed * dt;
  return false;
}

function takeOrder(guest) {
  if (!guest || guest.state !== "awaiting_order") return;
  guest.state = "waiting_food";
  guest.stateTime = 0;
  state.orders.push({ guestId: guest.id, recipeId: guest.recipeId, orderedAt: state.clock });
  state.metrics.orders += 1;
  dispatchAchievement(2);
  showToast(`${routeRecipeName(guest.recipeId)} 주문을 받았어요.`);
  startCookingIfPossible();
  saveState();
}

function startCookingIfPossible() {
  const stoves = installedRows(2);
  const busy = new Set(state.cooking.map((task) => task.stoveId));
  for (const stove of stoves) {
    if (busy.has(stove.id) || state.orders.length === 0) continue;
    const order = state.orders.shift();
    const guest = getGuest(order.guestId);
    if (!guest || guest.state !== "waiting_food") continue;
    const recipe = getRecipe(order.recipeId);
    const owned = recipeData(order.recipeId) || { level: 1 };
    const reductions = { 1: Number(tables.recipeSetting.MenuCoolDownNormal || 0), 2: Number(tables.recipeSetting.MenuCoolDownFancy || 0), 3: Number(tables.recipeSetting.MenuCoolDownSpecial || 0) };
    const duration = Number(recipe?.cookTime || 4) * (1 - Math.max(0, owned.level - 1) * (reductions[recipe?.recipeGrade] || 0));
    state.cooking.push({
      stoveId: stove.id,
      guestId: order.guestId,
      recipeId: order.recipeId,
      elapsed: 0,
      duration: Math.max(Number(tables.recipeSetting.CookTimeLimit || 2), duration),
    });
  }
}

function finishCooking(task) {
  const guest = getGuest(task.guestId);
  if (!guest || guest.state !== "waiting_food") return;
  guest.state = "eating";
  guest.stateTime = 0;
  showToast(`${routeRecipeName(task.recipeId)} 완성! 음식이 전달됐어요.`);
}

function commonForGuest(guest) {
  return tables.commonCustomers.get(guest.commonId) || tables.raw.CommonCustomer[0];
}

function canCraftRecipe(recipeId) {
  const route = progressionForRecipe(recipeId);
  const recipe = getRecipe(recipeId);
  const owned = recipeData(recipeId);
  return Boolean(route
    && recipe
    && (!owned || owned.level < Number(recipe.maxLevel || 20))
    && craftIngredientCost(route) <= recipeCombinationCapacity()
    && craftIngredientRequirements(route).every((requirement) => ingredientAmount(requirement.ingredientId) >= requirement.count));
}

function craftIngredientRequirements(route) {
  const ingredients = route?.ingredientRequirements || [];
  if (!ingredients.length) return [];
  const totalCount = Math.max(Number(route.ingredientCount || 1), ingredients.length);
  const baseCount = Math.floor(totalCount / ingredients.length);
  const remainder = totalCount % ingredients.length;
  return ingredients.map((ingredient, index) => ({
    ingredientId: ingredient.id,
    name: ingredient.name,
    emoji: ingredient.emoji,
    count: baseCount + (index < remainder ? 1 : 0),
  }));
}

function craftIngredientCost(route) {
  return craftIngredientRequirements(route).reduce((sum, requirement) => sum + requirement.count, 0);
}

function completeRecipeCraft(recipeId, automatic = false) {
  const route = progressionForRecipe(recipeId);
  if (!route) return false;
  const existing = recipeData(route.recipeId);
  const recipe = getRecipe(route.recipeId);
  const previousLevel = Number(existing?.level || 0);
  const previousPrice = existing ? Math.round(recipeLevelPrice(recipe, existing)) : 0;
  if (existing) existing.level += 1;
  else state.ownedRecipes[route.recipeId] = { level: 1, stack: 0, codexClaimed: false };
  state.crafting.selected = [];
  const level = recipeData(route.recipeId).level;
  state.crafting.history.unshift({ recipeId: route.recipeId, automatic, level, at: Math.round(state.clock) });
  state.crafting.history = state.crafting.history.slice(0, 12);
  state.metrics.recipesCrafted += 1;
  if (existing) {
    const newPrice = Math.round(recipeLevelPrice(recipe, existing));
    dispatchAchievement(9, 1, 103, route.recipeId);
    startRecipeUpgradeReveal(route.recipeId, automatic, previousLevel, level, previousPrice, newPrice);
  } else {
    startRecipeReveal(route.recipeId, automatic);
    showToast(`${automatic ? "자동 요리 연구" : "새 조합 발견"} · ${routeRecipeName(route.recipeId)} 완성!`, 3);
  }
  saveState();
  updateHud();
  if (!dom.menuScreen.hidden && state.ui.screen === "recipe") renderMenu();
  return true;
}

function consumeResearchIngredients(ingredientIds) {
  const required = new Map();
  ingredientIds.forEach((ingredientId) => {
    const id = Number(ingredientId);
    required.set(id, Number(required.get(id) || 0) + 1);
  });
  if ([...required].some(([ingredientId, count]) => ingredientAmount(ingredientId) < count)) return false;
  required.forEach((count, ingredientId) => {
    state.crafting.ingredients[ingredientId] = ingredientAmount(ingredientId) - count;
  });
  return true;
}

function startRecipeResearch(recipeId, automatic, ingredientIds) {
  if (recipeResearch) return false;
  const route = recipeId == null ? null : progressionForRecipe(recipeId);
  if (recipeId != null && (!route || !canCraftRecipe(recipeId))) return false;
  const consumedIngredients = ingredientIds.map(Number).filter((id) => ingredientData(id));
  if (consumedIngredients.length < 2 || !consumeResearchIngredients(consumedIngredients)) return false;
  state.crafting.selected = [];
  mixingDropIndex = -1;
  state.metrics.recipeResearchAttempts += 1;
  recipeResearch = {
    recipeId: route?.recipeId || null,
    automatic: Boolean(automatic),
    ingredientIds: consumedIngredients,
    elapsed: 0,
    duration: RECIPE_RESEARCH_DURATION,
  };
  saveState();
  updateHud();
  if (!dom.menuScreen.hidden && state.ui.screen === "recipe") renderMenu();
  return true;
}

function finishRecipeResearch() {
  if (!recipeResearch) return;
  const completed = recipeResearch;
  recipeResearch = null;
  if (completed.recipeId != null) {
    completeRecipeCraft(completed.recipeId, completed.automatic);
    return;
  }
  const hintedRecipe = revealClosestRecipeHint(completed.ingredientIds, false);
  state.metrics.failedRecipeResearches += 1;
  state.crafting.history.unshift({
    recipeId: 0,
    automatic: completed.automatic,
    failed: true,
    ingredientIds: completed.ingredientIds,
    at: Math.round(state.clock),
  });
  state.crafting.history = state.crafting.history.slice(0, 12);
  startWeirdDishReveal(completed.automatic);
  showToast(hintedRecipe
    ? `괴식이 됐지만 ${routeRecipeName(hintedRecipe.route.recipeId)} 힌트를 찾았어요.`
    : "괴식이 됐어요. 사용한 재료는 사라졌습니다.", 3);
  saveState();
  updateHud();
  if (!dom.menuScreen.hidden && state.ui.screen === "recipe") renderMenu();
}

function updateRecipeResearch(dt) {
  if (!recipeResearch) return;
  recipeResearch.elapsed = Math.min(recipeResearch.duration, recipeResearch.elapsed + dt);
  const progress = Math.min(1, recipeResearch.elapsed / recipeResearch.duration);
  const progressBar = dom.menuContent.querySelector(".recipe-research-progress span");
  const progressLabel = dom.menuContent.querySelector(".recipe-research-percent");
  if (progressBar) progressBar.style.width = `${Math.round(progress * 100)}%`;
  if (progressLabel) progressLabel.textContent = `${Math.round(progress * 100)}%`;
  if (progress >= 1) finishRecipeResearch();
}

function recipeInventoryPressure(route) {
  return craftIngredientRequirements(route)
    .reduce((sum, requirement) => sum + ingredientAmount(requirement.ingredientId), 0);
}

function compareAutoResearchRoutes(a, b) {
  const aOwned = recipeData(a.recipeId);
  const bOwned = recipeData(b.recipeId);
  if (Boolean(aOwned) !== Boolean(bOwned)) return aOwned ? 1 : -1;
  const levelDifference = Number(aOwned?.level || 0) - Number(bOwned?.level || 0);
  if (levelDifference) return levelDifference;
  return recipeInventoryPressure(b) - recipeInventoryPressure(a) || a.recipeId - b.recipeId;
}

function randomAutoResearchIngredients() {
  const pool = storedIngredientIds().flatMap((ingredientId) => Array.from({
    length: ingredientAmount(ingredientId),
  }, () => ingredientId));
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[randomIndex]] = [pool[randomIndex], pool[index]];
  }
  return pool.slice(0, Math.min(recipeCombinationCapacity(), pool.length));
}

function tryAutoCraft() {
  if (unlockedRecipeCount() < 5) return false;
  const route = RECIPE_PROGRESSION
    .filter((entry) => canCraftRecipe(entry.recipeId))
    .sort(compareAutoResearchRoutes)[0];
  if (route) return startRecipeResearch(route.recipeId, true, expandedCraftIngredientIds(route));
  const randomIngredients = randomAutoResearchIngredients();
  return randomIngredients.length >= 2 && startRecipeResearch(null, true, randomIngredients);
}

function selectedIngredientCount(ingredientId) {
  return state.crafting.selected.filter((id) => Number(id) === Number(ingredientId)).length;
}

function addSelectedIngredient(ingredientId) {
  if (state.crafting.selected.length >= recipeCombinationCapacity()) return showToast("조합 용량이 가득 찼어요.");
  if (selectedIngredientCount(ingredientId) >= ingredientAmount(ingredientId)) return showToast("보유 재료가 부족해요.");
  state.crafting.selected.push(Number(ingredientId));
  mixingDropIndex = state.crafting.selected.length - 1;
  saveState();
  renderMenu();
  window.requestAnimationFrame(() => { mixingDropIndex = -1; });
}

function removeSelectedIngredient(ingredientId) {
  const index = state.crafting.selected.lastIndexOf(Number(ingredientId));
  if (index >= 0) state.crafting.selected.splice(index, 1);
  mixingDropIndex = -1;
  saveState();
  renderMenu();
}

function requirementsMatchSelection(requirements) {
  if (requirements.reduce((sum, item) => sum + item.count, 0) !== state.crafting.selected.length) return false;
  return requirements.every((item) => selectedIngredientCount(item.ingredientId) === item.count);
}

function matchingSelectedIngredients(requirements, selectedIngredients = state.crafting.selected) {
  const remaining = new Map();
  selectedIngredients.forEach((ingredientId) => {
    remaining.set(Number(ingredientId), Number(remaining.get(Number(ingredientId)) || 0) + 1);
  });
  return requirements.flatMap((requirement) => {
    const matchedCount = Math.min(Number(requirement.count || 0), Number(remaining.get(requirement.ingredientId) || 0));
    remaining.set(requirement.ingredientId, Number(remaining.get(requirement.ingredientId) || 0) - matchedCount);
    return Array.from({ length: matchedCount }, () => requirement.ingredientId);
  });
}

function mergeRecipeHints(requirements, previousHints, newHints) {
  const maximumCounts = new Map();
  [previousHints, newHints].forEach((ingredientIds) => {
    const counts = new Map();
    ingredientIds.forEach((ingredientId) => counts.set(Number(ingredientId), Number(counts.get(Number(ingredientId)) || 0) + 1));
    counts.forEach((count, ingredientId) => maximumCounts.set(ingredientId,
      Math.max(Number(maximumCounts.get(ingredientId) || 0), count)));
  });
  return requirements.flatMap((requirement) => Array.from({
    length: Math.min(Number(requirement.count || 0), Number(maximumCounts.get(requirement.ingredientId) || 0)),
  }, () => requirement.ingredientId));
}

function revealClosestRecipeHint(selectedIngredients = state.crafting.selected, announce = true) {
  const selectedCount = selectedIngredients.length;
  const candidates = discoveryOrderedRecipeRoutes()
    .map((route, routeIndex) => {
      const requirements = craftIngredientRequirements(route);
      const matches = matchingSelectedIngredients(requirements, selectedIngredients);
      return {
        route,
        routeIndex,
        requirements,
        matches,
        previousHintCount: Number(state.crafting.hints?.[route.recipeId]?.length || 0),
      };
    })
    .filter((candidate) => !recipeData(candidate.route.recipeId)
      && craftIngredientCost(candidate.route) === selectedCount
      && candidate.matches.length >= 1)
    .sort((a, b) => b.matches.length - a.matches.length
      || b.previousHintCount - a.previousHintCount
      || a.routeIndex - b.routeIndex);
  const closest = candidates[0];
  if (!closest) return false;
  state.crafting.hints ||= {};
  state.crafting.hints[closest.route.recipeId] = mergeRecipeHints(
    closest.requirements,
    state.crafting.hints[closest.route.recipeId] || [],
    closest.matches,
  );
  saveState();
  if (announce) {
    renderMenu();
    showToast(`${routeRecipeName(closest.route.recipeId)} 힌트 발견! 맞은 재료 ${closest.matches.length}개를 찾았어요.`, 3);
  }
  return closest;
}

function discoverSelectedCombination() {
  if (recipeResearch) return false;
  if (state.crafting.selected.length < 2) return showToast("재료를 2개 이상 넣어 주세요.");
  const selectedIngredients = [...state.crafting.selected];
  const route = RECIPE_PROGRESSION
    .filter((entry) => requirementsMatchSelection(craftIngredientRequirements(entry)))
    .sort((a, b) => {
      const aOwned = recipeData(a.recipeId);
      const bOwned = recipeData(b.recipeId);
      if (Boolean(aOwned) !== Boolean(bOwned)) return aOwned ? 1 : -1;
      return Number(aOwned?.level || 0) - Number(bOwned?.level || 0) || a.recipeId - b.recipeId;
    })[0];
  return startRecipeResearch(route?.recipeId || null, false, selectedIngredients);
}

function grantGuestIngredient(guest) {
  if (guest.itemGranted) return;
  const route = progressionForCustomer(guest.customerId);
  const customerName = guest.customerName || route?.customerName || `손님 ${guest.customerId}`;
  const visits = Number(guest.visitNumber || state.collections.customers[guest.customerId]?.count || 1);
  const grade = guestGradeForVisits(visits);
  const items = guestRewardItems(route, visits);
  if (!items.length) return;
  guest.itemGranted = true;
  state.metrics.ingredientDropAttempts += 1;
  if (random() >= GUEST_INGREDIENT_DROP_CHANCE) {
    state.metrics.ingredientDropMisses += 1;
    saveState();
    return;
  }
  const totalWeight = items.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  let itemRoll = random() * totalWeight;
  let selectedItem = items[0];
  for (const item of items) {
    itemRoll -= Number(item.weight || 0);
    if (itemRoll <= 0) { selectedItem = item; break; }
  }
  const dropCount = Math.max(1, Number(selectedItem.count || 1));
  const droppedItems = [{ ...selectedItem, count: dropCount }];
  const table = tables.installs.find((row) => row.id === guest.tableId);
  const seat = table ? seatPositions(table).find((item) => item.id === guest.seatId) : null;
  const tablePosition = table ? facilityPlacement(table) : { x: guest.x };
  const side = Number(seat?.x ?? guest.x) < tablePosition.x ? -1 : 1;
  state.ingredientDrops.push({
    id: `ingredient-${state.dropSequence++}`,
    ingredientId: selectedItem.ingredientId,
    emoji: selectedItem.emoji,
    items: droppedItems,
    totalCount: dropCount,
    gradeId: grade.id,
    gradeName: grade.name,
    ingredientSlot: selectedItem.slot,
    x: Math.max(32, Math.min(GAME_W - 32, Number(seat?.x ?? guest.x) + side * 18)),
    y: Math.max(90, Math.min(GAME_H - 70, Number(seat?.y ?? guest.y) - 58)),
  });
  state.metrics.giftBundles += 1;
  state.metrics.giftItems += dropCount;
  showToast(`${customerName}이 ${selectedItem.emoji} ${selectedItem.name}${dropCount > 1 ? ` ×${dropCount}` : ""}을 떨어뜨렸어요!`);
  saveState();
}

function collectIngredientDrop(drop) {
  const items = Array.isArray(drop.items) && drop.items.length
    ? drop.items
    : [{ ingredientId: drop.ingredientId, count: 1 }];
  const storage = ingredientStorageStatus();
  const incomingCount = items.reduce((sum, item) => sum + Math.max(1, Number(item.count || 1)), 0);
  if (storage.totalItems + incomingCount > storage.capacity) {
    showToast(`재료 보관함이 가득 찼어요. (${storage.totalItems}/${storage.capacity}칸)`, 3);
    return false;
  }
  for (const item of items) {
    state.crafting.ingredients[item.ingredientId] = ingredientAmount(item.ingredientId) + Number(item.count || 1);
  }
  state.ingredientDrops = state.ingredientDrops.filter((item) => item.id !== drop.id);
  const total = items.reduce((sum, item) => sum + Number(item.count || 1), 0);
  state.metrics.ingredientsFound += total;
  const summary = items.map((item) => {
    const ingredient = ingredientData(item.ingredientId);
    return `${ingredient?.ingredientName || "재료"} ×${Number(item.count || 1)}`;
  }).join(" · ");
  showToast(`${summary} 획득!`, 3);
  saveState();
  updateHud();
  render();
}

function resolveMeal(guest, forcedSatisfied = false) {
  const recipe = getRecipe(guest.recipeId);
  const common = commonForGuest(guest);
  const favorite = (common.recipeIds || []).includes(guest.recipeId);
  const specialRecipe = Number(recipe?.recipeGrade) === 3;
  let mood = guest.mood;
  if (forcedSatisfied || favorite || specialRecipe) mood = "satisfied";
  else if (mood === "normal" && random() < Number(common.disappointProbability || 0)) mood = "disappointed";

  if (mood === "disappointed" && !forcedSatisfied) {
    guest.state = "disappointed";
    guest.mood = "disappointed";
    guest.stateTime = 0;
    showToast("손님의 불만 말풍선을 눌러 달래 주세요.", 3);
    return;
  }

  const mealPrice = restaurantMealPrice(guest.recipeId, mood);
  addPayment(guest, mealPrice);
  grantGuestIngredient(guest);

  const hasTipbox = installedRows(3).length > 0;
  if (hasTipbox && (mood === "satisfied" || random() < Number(common.tipProbability || 0))) {
    state.tipbox += Math.max(1, Math.round(mealPrice * .1));
  }

  guest.mood = mood;
  guest.state = "leaving";
  guest.targetX = 240;
  guest.targetY = 900;
  guest.stateTime = 0;
  state.metrics.served += 1;
  saveState();
}

function addPayment(guest, amount) {
  const table = tables.installs.find((row) => row.id === guest.tableId);
  const seat = table ? seatPositions(table).find((item) => item.id === guest.seatId) : null;
  const x = seat?.payX ?? guest.x;
  const y = seat?.payY ?? guest.y + 50;
  const existing = state.payments.find((payment) => payment.seatId === guest.seatId);
  if (existing) {
    existing.amount += amount;
    existing.models = Math.min(20, existing.models + 1);
  } else {
    state.payments.push({ id: `pay-${guest.id}`, seatId: guest.seatId, x, y, amount, models: 1 });
  }
}

function calmGuest(guest) {
  if (guest.state !== "disappointed") return;
  guest.mood = "satisfied";
  resolveMeal(guest, true);
  showToast("손님이 기분을 풀었어요!", 2);
}

function collectPayment(payment) {
  state.resources.acorns += payment.amount;
  state.metrics.collected += payment.amount;
  state.payments = state.payments.filter((item) => item.id !== payment.id);
  showToast(`도토리 ${formatNumber(payment.amount)} 획득!`);
  saveState();
  updateHud();
}

function collectTipbox() {
  if (state.tipbox <= 0) return;
  const amount = state.tipbox;
  state.tipbox = 0;
  state.resources.acorns += amount;
  dispatchAchievement(7);
  showToast(`팁 ${formatNumber(amount)} 획득!`);
  saveState();
  updateHud();
}

function updateGuests(dt) {
  for (const guest of state.guests) {
    guest.bob += dt;
    guest.stateTime += dt;
    if (guest.state === "arriving") {
      if (moveTowards(guest, guest.targetX, guest.targetY, 165, dt)) {
        guest.state = "awaiting_order";
        guest.stateTime = 0;
        guest.wait = 0;
      }
    } else if (guest.state === "awaiting_order") {
      const common = commonForGuest(guest);
      guest.wait += dt;
      const angryStart = Number(common.waitingTime || 60);
      const angryDuration = Number(tables.customerSetting.AngryTime || 10);
      if (guest.wait >= angryStart + angryDuration) {
        guest.state = "leaving";
        guest.mood = "angry";
        guest.targetX = 240;
        guest.targetY = 900;
        state.metrics.angryLeaves += 1;
        showToast("주문을 기다리던 손님이 화가 나서 떠났어요.");
      }
    } else if (guest.state === "eating" && guest.stateTime >= GUEST_MEAL_DURATION_SECONDS) {
      resolveMeal(guest);
    } else if (guest.state === "disappointed" && guest.stateTime >= 6) {
      guest.mood = "disappointed";
      addPayment(guest, restaurantMealPrice(guest.recipeId, "disappointed"));
      grantGuestIngredient(guest);
      guest.state = "leaving";
      guest.targetX = 240;
      guest.targetY = 900;
      state.metrics.served += 1;
    } else if (guest.state === "leaving") {
      moveTowards(guest, guest.targetX, guest.targetY, guest.mood === "angry" ? 230 : 155, dt);
    }
  }

  const before = state.guests.length;
  state.guests = state.guests.filter((guest) => !(guest.state === "leaving" && guest.y >= 896));
  if (state.guests.length !== before) {
    trySpawnQueuedGuest();
    saveState();
  }
}

function updateCooking(dt) {
  for (const task of state.cooking) task.elapsed += dt;
  const completed = state.cooking.filter((task) => task.elapsed >= task.duration);
  if (completed.length) {
    completed.forEach(finishCooking);
    const completeIds = new Set(completed.map((task) => `${task.stoveId}-${task.guestId}`));
    state.cooking = state.cooking.filter((task) => !completeIds.has(`${task.stoveId}-${task.guestId}`));
    startCookingIfPossible();
    saveState();
  }
}

function update(dt) {
  state.clock += dt;
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) dom.toast.hidden = true;
  }
  updateGuests(dt);
  updateSpecialCustomers(dt);
  updateCooking(dt);
  updateRecipeResearch(dt);
  if (SYSTEM_ENABLED.staff) updateStaff(dt);
  updatePerformance(dt);
  startCookingIfPossible();
  updateHud();
}

function getImage(src) {
  if (!imageCache.has(src)) {
    const image = new Image();
    image.onload = render;
    image.src = src;
    imageCache.set(src, image);
  }
  return imageCache.get(src);
}

function drawImage(src, x, y, width, height, alpha = 1) {
  const image = getImage(src);
  if (!image.complete || !image.naturalWidth) return false;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
  ctx.restore();
  return true;
}

function expandIngredientStorage() {
  const storage = ingredientStorageStatus();
  if (state.resources.gems < INGREDIENT_STORAGE_EXPANSION_GEM_COST) {
    showToast(`보석 ${INGREDIENT_STORAGE_EXPANSION_GEM_COST}개가 필요해요.`);
    return false;
  }
  state.resources.gems -= INGREDIENT_STORAGE_EXPANSION_GEM_COST;
  state.crafting.storageCapacity = storage.capacity + INGREDIENT_STORAGE_EXPANSION_AMOUNT;
  showToast(`재료 보관함 ${state.crafting.storageCapacity}칸으로 확장!`);
  saveState();
  updateHud();
  renderMenu();
  return true;
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawBackground() {
  const background = getImage("assets/BG.png");
  if (background.complete && background.naturalWidth) {
    const scale = Math.max(GAME_W / background.naturalWidth, GAME_H / background.naturalHeight);
    const width = background.naturalWidth * scale;
    const height = background.naturalHeight * scale;
    ctx.drawImage(background, (GAME_W - width) / 2, (GAME_H - height) / 2, width, height);
  } else {
    ctx.fillStyle = "#9aaf67";
    ctx.fillRect(0, 0, GAME_W, GAME_H);
  }
}

function drawShadow(x, y, rx, ry) {
  ctx.fillStyle = "rgba(44,35,19,.24)";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFacility(row) {
  const meta = FACILITY_META[row.facilityType] || FACILITY_META[1];
  const p = facilityPlacement(row);
  const activeThemeId = state.themes.activeByFacility[row.facilityType];
  const activeTheme = tables.restaurantThemes.find((item) => item.id === Number(activeThemeId));
  const icon = activeTheme ? themeFacilityIcon(activeTheme) : meta.icon;
  if (row.facilityType !== 10 && row.facilityType !== 11) drawShadow(p.x, p.y + p.h * .38, p.w * .33, 7);
  if (!drawImage(icon, p.x, p.y, p.w, p.h)) {
    ctx.fillStyle = "#a77a46";
    roundRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 14);
    ctx.fill();
  }
}

function drawInstallZone(row) {
  const p = row.placementOverride || facilityPlacement(row);
  const price = Number(row.facilityPrice);
  const pulse = .72 + Math.sin(state.clock * 3 + row.id) * .18;
  ctx.save();
  ctx.fillStyle = `rgba(255,247,214,${.88 + pulse * .08})`;
  ctx.strokeStyle = "rgba(105,67,31,.78)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 23, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#9c632a";
  ctx.font = "900 27px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("+", p.x, p.y - 1);
  ctx.fillStyle = "rgba(61,43,24,.88)";
  roundRect(p.x - 37, p.y + 27, 74, 25, 13);
  ctx.fill();
  drawImage("assets/ui/currency/icon_currency_001.png", p.x - 23, p.y + 39, 20, 20);
  ctx.fillStyle = "#fff8df";
  ctx.font = "900 12px sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(formatNumber(price), p.x + 10, p.y + 43);
  ctx.restore();
}

function drawChef() {
  const x = 400;
  const y = 330;
  const bob = Math.sin(state.clock * 3.4) * 2;
  drawShadow(x, y + 31, 25, 7);
  drawImage("assets/ui/chick/icon_chick_chef.png", x, y + bob, 82, 82);
}

function drawStoveProgress() {
  for (const task of state.cooking) {
    const stove = tables.installs.find((row) => row.id === task.stoveId);
    if (!stove) continue;
    const p = facilityPlacement(stove);
    const ratio = Math.min(1, task.elapsed / task.duration);
    drawImage(routeRecipeIcon(task.recipeId), p.x, p.y - 36, 34, 34);
    ctx.fillStyle = "rgba(55,37,20,.72)";
    roundRect(p.x - 31, p.y + 38, 62, 10, 5);
    ctx.fill();
    const gradient = ctx.createLinearGradient(p.x - 29, 0, p.x + 29, 0);
    gradient.addColorStop(0, "#ffe86b");
    gradient.addColorStop(1, "#ff8b36");
    ctx.fillStyle = gradient;
    roundRect(p.x - 29, p.y + 40, 58 * ratio, 6, 3);
    ctx.fill();
  }
}

function guestIcon(guest) {
  const customer = tables.customers.find((row) => row.id === Number(guest.customerId));
  const commonId = Number(guest.commonId || (customer?.assetType === 105 ? customer.assetId : 1001));
  const index = Math.max(1, Math.min(45, commonId - 1000));
  return `assets/ui/chick/icon_chick_${String(index).padStart(3, "0")}.png`;
}

function drawSpeechBubble(x, y, width = 64, height = 58) {
  ctx.fillStyle = "rgba(66,45,24,.2)";
  roundRect(x - width / 2 + 2, y - height / 2 + 4, width, height, 15);
  ctx.fill();
  ctx.fillStyle = "#fffaf0";
  ctx.strokeStyle = "#8c6337";
  ctx.lineWidth = 2;
  roundRect(x - width / 2, y - height / 2, width, height, 15);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 7, y + height / 2 - 2);
  ctx.lineTo(x, y + height / 2 + 9);
  ctx.lineTo(x + 7, y + height / 2 - 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawGuest(guest) {
  const bob = Math.sin(guest.bob * 4) * 2;
  drawShadow(guest.x, guest.y + 25, 18, 5);
  if (guest.state === "awaiting_order") {
    const common = commonForGuest(guest);
    const angryStart = Number(common.waitingTime || 60);
    const angryDuration = Number(tables.customerSetting.AngryTime || 10);
    const anger = Math.max(0, Math.min(1, (guest.wait - angryStart) / angryDuration));
    if (anger > 0) {
      ctx.fillStyle = `rgba(224,54,38,${anger * .42})`;
      ctx.beginPath();
      ctx.arc(guest.x, guest.y, 31, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  drawImage(guestIcon(guest), guest.x, guest.y + bob, 61, 61);

  if (guest.state === "awaiting_order") {
    const bx = guest.x;
    const by = guest.y - 58;
    drawSpeechBubble(bx, by);
    drawImage(routeRecipeIcon(guest.recipeId), bx, by - 2, 40, 40);
  } else if (guest.state === "waiting_food") {
    ctx.font = "900 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("…", guest.x, guest.y - 40);
  } else if (guest.state === "eating") {
    drawImage(routeRecipeIcon(guest.recipeId), guest.x, guest.y - 42, 34, 34);
  } else if (guest.state === "disappointed") {
    drawSpeechBubble(guest.x, guest.y - 58, 58, 52);
    drawImage("assets/ui/common/icon_feel_angry.png", guest.x, guest.y - 50, 30, 30);
  } else if (guest.mood === "satisfied") {
    ctx.font = "900 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("♥", guest.x, guest.y - 38);
  }
}

function drawSpecialCustomers() {
  for (const actor of state.specialActors) {
    drawShadow(actor.x, actor.y + 26, 20, 6);
    const icon = actor.specialId === 2 ? "assets/ui/chick/icon_chick_rich.png" : "assets/ui/chick/icon_chick_007.png";
    drawImage(icon, actor.x, actor.y, 68, 68);
    if (actor.specialId === 1 && actor.state !== "caught") {
      ctx.fillStyle = "#e63e32";
      ctx.font = "900 22px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("!", actor.x, actor.y - 42);
    }
  }
}

function drawPaymentPile(payment) {
  const visible = Math.min(4, Number(payment.models || 1));
  for (let i = 0; i < visible; i += 1) {
    const angle = (i / Math.max(1, visible)) * Math.PI * 2;
    drawImage("assets/ui/currency/icon_currency_001.png", payment.x + Math.cos(angle) * 11, payment.y + Math.sin(angle) * 5, 29, 29);
  }
  ctx.fillStyle = "rgba(57,39,20,.88)";
  roundRect(payment.x - 31, payment.y + 17, 62, 22, 11);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = "900 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(formatNumber(payment.amount), payment.x, payment.y + 32);
}

function drawPayments() {
  for (const payment of state.payments) drawPaymentPile(payment);
}

function drawIngredientDrops() {
  state.ingredientDrops.forEach((drop, index) => {
    const bob = Math.sin(state.clock * 3.2 + index) * 3;
    drawShadow(drop.x, drop.y + 16, 22, 8);
    ctx.fillStyle = "rgba(255,250,231,.96)";
    ctx.strokeStyle = "#80532f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(drop.x, drop.y + bob, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = "26px 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(drop.emoji || "🥛", drop.x, drop.y + bob + 1);
    const totalCount = Number(drop.totalCount || drop.items?.reduce((sum, item) => sum + Number(item.count || 1), 0) || 1);
    if (totalCount > 1) {
      ctx.fillStyle = "#e0523f";
      ctx.beginPath();
      ctx.arc(drop.x + 19, drop.y + bob - 17, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "900 11px sans-serif";
      ctx.fillText(`×${totalCount}`, drop.x + 19, drop.y + bob - 17);
    }
    ctx.textBaseline = "alphabetic";
  });
}

function drawTipboxValue() {
  if (!installedRows(3).length || state.tipbox <= 0) return;
  const tipbox = installedRows(3)[0];
  const p = facilityPlacement(tipbox);
  ctx.fillStyle = "rgba(57,39,20,.88)";
  roundRect(p.x - 37, p.y - 59, 74, 28, 14);
  ctx.fill();
  drawImage("assets/ui/currency/icon_currency_001.png", p.x - 23, p.y - 45, 23, 23);
  ctx.fillStyle = "white";
  ctx.font = "900 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(formatNumber(state.tipbox), p.x + 11, p.y - 41);
}

function drawWorldArea(area) {
  drawBackground();

  const installed = installedRows().sort((a, b) => facilityPlacement(a).y - facilityPlacement(b).y);
  installed.forEach(drawFacility);
  if (!state.ui.selectedInstallId) installCandidates().forEach(drawInstallZone);
  drawChef();
  drawStoveProgress();
  [...state.guests].sort((a, b) => a.y - b.y).forEach(drawGuest);
  drawSpecialCustomers();
  drawIngredientDrops();
  drawPayments();
  drawTipboxValue();
}

function render() {
  if (!tables || !state) return;
  ctx.clearRect(0, 0, GAME_W, GAME_H);
  drawWorldArea("restaurant");
}

function currentObjective() {
  const required = [10, 1, 2].map((type) => tables.installs.find((row) => row.facilityType === type));
  const missing = required.find((row) => row && !isInstalled(row.id));
  if (missing) return `${FACILITY_META[missing.facilityType].name} 설치하기`;
  if (state.ingredientDrops.length) return "필드의 병아리 아이템을 눌러 수집하기";
  if (state.payments.length) return "테이블의 도토리를 눌러 회수하기";
  const disappointed = state.guests.find((guest) => guest.state === "disappointed");
  if (disappointed) return "불만 말풍선을 눌러 손님 달래기";
  const order = state.guests.find((guest) => guest.state === "awaiting_order");
  if (order) return "손님의 주문 말풍선 누르기";
  if (state.cooking.length) return "조리기구에서 자동 요리 중";
  if (state.guests.some((guest) => guest.state === "eating")) return "손님이 식사하는 중";
  if (state.promotion.queued > 0) return "빈자리가 생기면 손님 입장";
  return "홍보 게이지를 채워 손님 부르기";
}

function updateHud() {
  if (!state) return;
  ensureDailyReset();
  dom.acorns.textContent = formatNumber(state.resources.acorns);
  dom.ideas.textContent = formatNumber(state.resources.ideas);
  dom.gems.textContent = formatNumber(state.resources.gems);
  dom.promoButton.hidden = false;
  dom.promoButton.disabled = !coreReady();
  dom.recipeDot.hidden = !RECIPE_PROGRESSION.some((route) => canCraftRecipe(route.recipeId))
    && !Object.values(state.ownedRecipes).some((owned) => !owned.codexClaimed || owned.stack > 0);
  dom.collectionDot.hidden = !Object.values(state.collections).some((dict) => Object.values(dict).some((entry) => entry.isNew));
  dom.recipeNavLabel.textContent = "레시피";
  dom.themeNavLabel.textContent = "테마";
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (GAME_W / rect.width),
    y: (event.clientY - rect.top) * (GAME_H / rect.height),
  };
}

function insideBox(point, box, padding = 0) {
  return point.x >= box.x - box.w / 2 - padding && point.x <= box.x + box.w / 2 + padding
    && point.y >= box.y - box.h / 2 - padding && point.y <= box.y + box.h / 2 + padding;
}

function handleCanvasTap(event) {
  if (!dom.installPanel.hidden) return;
  const point = pointerPosition(event);

  const special = state.specialActors.find((actor) => Math.hypot(point.x - actor.x, point.y - actor.y) <= 48);
  if (special) return catchSpecial(special);

  const ingredientDrop = state.ingredientDrops.find((item) => Math.hypot(point.x - item.x, point.y - item.y) <= 38);
  if (ingredientDrop) return collectIngredientDrop(ingredientDrop);

  const payment = state.payments.find((item) => Math.hypot(point.x - item.x, point.y - item.y) <= 42);
  if (payment) return collectPayment(payment);

  const tipbox = installedRows(3)[0];
  if (tipbox && state.tipbox > 0 && insideBox(point, facilityPlacement(tipbox), 16)) return collectTipbox();

  const unhappy = state.guests.find((guest) => guest.state === "disappointed" && Math.hypot(point.x - guest.x, point.y - (guest.y - 40)) <= 58);
  if (unhappy) return calmGuest(unhappy);

  const waiting = state.guests.find((guest) => guest.state === "awaiting_order" && Math.hypot(point.x - guest.x, point.y - (guest.y - 40)) <= 66);
  if (waiting) return takeOrder(waiting);

  const stage = installedRows(5)[0];
  if (stage && insideBox(point, facilityPlacement(stage), 16)) return openMenu("performance");

  const fridge = installedRows(6)[0];
  if (fridge && insideBox(point, facilityPlacement(fridge), 14)) return openMenu("recipe", "ingredients");

  const candidate = installCandidates().find((row) => insideBox(point, facilityPlacement(row), 8));
  if (candidate) openInstallPanel(candidate);
  render();
}

function setActiveNav(screen) {
  dom.navButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.screen === screen));
}

function closeMenu() {
  dismissRecipeReveal();
  state.ui.screen = "restaurant";
  dom.menuScreen.hidden = true;
  setActiveNav("");
  saveState();
}

function openMenu(screen, preferredTab = null) {
  if ((screen === "missions" && !SYSTEM_ENABLED.missions) || (screen === "staff" && !SYSTEM_ENABLED.staff)) return;
  state.ui.screen = screen;
  state.ui.tab = preferredTab || (screen === "recipe" ? "craft" : screen === "missions" ? "main" : screen === "collection" ? "customers" : screen);
  dom.menuScreen.hidden = false;
  setActiveNav(screen);
  renderMenu();
}

function renderTabs(items) {
  dom.menuTabs.innerHTML = items.map(([id, label]) => `<button type="button" data-tab="${id}" class="${state.ui.tab === id ? "is-active" : ""}">${label}</button>`).join("");
}

function researchRequirement() {
  const missing = [8, 7, 6].filter((type) => installedRows(type).length === 0).map((type) => FACILITY_META[type].name);
  if (missing.length) return `${missing.join(" · ")} 설치 필요`;
  const cost = Number(tables.recipeSetting.ResearchCost || 5);
  if (state.resources.ideas < cost) return `아이디어 ${cost - state.resources.ideas} 부족`;
  return "연구 준비 완료";
}

function canResearch() {
  const hasTarget = tables.recipeResearch.some((entry) => {
    const recipe = getRecipe(entry.recipeId);
    const owned = recipeData(entry.recipeId);
    return recipe && (!owned || owned.level < recipe.maxLevel);
  });
  return hasTarget && [8, 7, 6].every((type) => installedRows(type).length > 0)
    && state.resources.ideas >= Number(tables.recipeSetting.ResearchCost || 5);
}

function doResearch() {
  if (!canResearch()) return showToast(researchRequirement());
  const cost = Number(tables.recipeSetting.ResearchCost || 5);
  state.resources.ideas -= cost;
  const pity = [...tables.recipeResearch]
    .filter((row) => state.totalResearchCount + 1 >= row.pityCount && !recipeData(row.recipeId))
    .sort((a, b) => a.pityCount - b.pityCount || a.id - b.id)[0];
  let recipeId = pity?.recipeId;
  if (!recipeId) {
    const candidates = tables.recipeResearch.filter((row) => {
      const recipe = getRecipe(row.recipeId);
      const owned = recipeData(row.recipeId);
      return recipe && (!owned || owned.level < recipe.maxLevel);
    });
    const total = candidates.reduce((sum, row) => sum + row.recipeWeight, 0);
    let roll = random() * total;
    recipeId = candidates[0]?.recipeId;
    for (const row of candidates) {
      roll -= row.recipeWeight;
      if (roll < 0) { recipeId = row.recipeId; break; }
    }
  }
  if (!recipeId) { state.resources.ideas += cost; return; }
  const existing = recipeData(recipeId);
  const isNew = !existing;
  if (existing) existing.stack += 1;
  else state.ownedRecipes[recipeId] = { level: 1, stack: 0, codexClaimed: false };
  state.totalResearchCount += 1;
  state.ui.lastResearch = { recipeId, isNew };
  dispatchAchievement(8);
  showToast(`${isNew ? "새 레시피" : "중복 레시피"} · ${routeRecipeName(recipeId)} 획득!`, 3);
  saveState();
  renderMenu();
}

function upgradeRecipe(recipeId) {
  const owned = recipeData(recipeId);
  const recipe = getRecipe(recipeId);
  if (!owned || !recipe || owned.stack <= 0 || owned.level >= recipe.maxLevel) return;
  owned.stack -= 1;
  owned.level += 1;
  dispatchAchievement(9, 1, 103, recipeId);
  showToast(`${routeRecipeName(recipeId)} Lv.${owned.level} 강화 완료!`);
  saveState();
  renderMenu();
}

function claimCodexReward(recipeId) {
  const owned = recipeData(recipeId);
  const recipe = getRecipe(recipeId);
  if (!owned || !recipe || owned.codexClaimed) return;
  owned.codexClaimed = true;
  const result = grantReward(recipe.rewardId);
  showToast(`도감 보상 · ${result}`);
  saveState();
  updateHud();
  renderMenu();
}

function recipeCard(recipe) {
  const owned = recipeData(recipe.id);
  const locked = !owned;
  const grade = ["", "평범", "멋진", "특별한"][recipe.recipeGrade] || "레시피";
  let action = "";
  if (owned && !owned.codexClaimed) action = `<button class="card-action" data-action="codex" data-id="${recipe.id}">도감 보상</button>`;
  const currentPrice = owned ? Math.round(recipeLevelPrice(recipe, owned)) : Number(recipe.foodPrice);
  return `<article class="feature-card ${locked ? "is-locked" : ""}">
    <img class="feature-icon" src="${routeRecipeIcon(recipe.id)}" alt="" />
    <div class="feature-copy"><strong>${locked ? "???" : routeRecipeName(recipe.id)}</strong>
    <small class="grade">${grade} · ${locked ? "미획득" : `Lv.${owned.level}/${recipe.maxLevel}`}</small>
    <small>${locked ? "보유 재료 조합으로 발견할 수 있어요" : `Lv.UP당 가격 +${Math.round(RECIPE_LEVEL_PRICE_BONUS * 100)}% · 현재 가격 ${formatNumber(currentPrice)}`}</small></div>${action}</article>`;
}

function expandedCraftIngredientIds(route) {
  return craftIngredientRequirements(route)
    .flatMap((requirement) => Array.from({ length: requirement.count }, () => requirement.ingredientId));
}

function ingredientDiscoveryStage(ingredientId) {
  const visitStageOffsets = [0, 1, 4];
  return CORE_PROGRESSION.reduce((earliestStage, chickRoute) => {
    const rewardIndex = chickRoute.rewardIngredients.findIndex((ingredient) => ingredient.id === Number(ingredientId));
    if (rewardIndex < 0) return earliestStage;
    const stage = (chickRoute.themeId - 1) * 9 + chickRoute.slot * 2 + visitStageOffsets[rewardIndex];
    return Math.min(earliestStage, stage);
  }, Number.POSITIVE_INFINITY);
}

function recipeDiscoveryRank(route) {
  const ingredientStages = craftIngredientRequirements(route).map((requirement) => ingredientDiscoveryStage(requirement.ingredientId));
  return {
    stage: Math.max(...ingredientStages),
    stageSum: ingredientStages.reduce((sum, stage) => sum + stage, 0),
    ingredientCost: craftIngredientCost(route),
  };
}

function discoveryOrderedRecipeRoutes() {
  return RECIPE_PROGRESSION
    .map((route, originalIndex) => ({ route, originalIndex, rank: recipeDiscoveryRank(route) }))
    .sort((a, b) => a.rank.stage - b.rank.stage
      || a.rank.stageSum - b.rank.stageSum
      || a.rank.ingredientCost - b.rank.ingredientCost
      || a.originalIndex - b.originalIndex)
    .map((entry) => entry.route);
}

const INGREDIENT_DISCOVERY_CLUES = new Map([
  [[30001, 30024, 30037, 30039], "초록색 채소"],
  [[30002, 30023, 30025, 30035, 30043, 30046, 30053], "알록달록한 채소"],
  [[30007, 30027, 30034], "땅에서 자라는 채소"],
  [[30003, 30009, 30011, 30012, 30013, 30015, 30059], "든든한 곡물 재료"],
  [[30005], "동그란 단백질 재료"],
  [[30006, 30008, 30017, 30048, 30049, 30075], "감칠맛 나는 단백질"],
  [[30004, 30020, 30021, 30026], "고소한 유제품"],
  [[30010, 30016, 30018, 30022, 30029, 30047, 30068, 30076], "맛을 더하는 양념"],
  [[30014, 30067], "촉촉한 국물 재료"],
  [[30019, 30055], "향긋한 버섯 재료"],
  [[30028, 30031], "고소한 씨앗 재료"],
  [[30030], "부드러운 콩 재료"],
  [[30033, 30063, 30064], "달콤한 과일"],
  [[30054], "향긋한 허브"],
].flatMap(([ingredientIds, clue]) => ingredientIds.map((ingredientId) => [ingredientId, clue])));

function ingredientDiscoveryClue(ingredientId) {
  return INGREDIENT_DISCOVERY_CLUES.get(Number(ingredientId)) || "다른 맛의 재료";
}

function clueWithSubjectParticle(clue) {
  const lastCharacter = clue.at(-1) || "";
  const code = lastCharacter.charCodeAt(0);
  const hasFinalConsonant = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
  return `${clue}${hasFinalConsonant ? "이" : "가"}`;
}

function recipeCatalogCard(route, index) {
  const owned = recipeData(route.recipeId);
  const requirements = craftIngredientRequirements(route);
  if (owned) {
    const formula = requirements.map((requirement) => `<span title="${requirement.name}">${requirement.emoji}${requirement.count > 1 ? `<b>×${requirement.count}</b>` : ""}</span>`).join(`<i>+</i>`);
    return `<article class="recipe-catalog-card is-discovered" data-recipe-id="${route.recipeId}">
      <div class="recipe-catalog-icon"><img src="${routeRecipeIcon(route.recipeId)}" alt="" /></div>
      <div class="recipe-catalog-copy"><small>NO.${String(index + 1).padStart(2, "0")} · Lv.${owned.level}</small><strong>${routeRecipeName(route.recipeId)}</strong><div class="recipe-catalog-formula">${formula}</div></div>
    </article>`;
  }
  const hintCounts = new Map();
  (state.crafting.hints?.[route.recipeId] || []).forEach((ingredientId) => {
    hintCounts.set(Number(ingredientId), Number(hintCounts.get(Number(ingredientId)) || 0) + 1);
  });
  const hasHint = Number(state.crafting.hints?.[route.recipeId]?.length || 0) > 0;
  const missingClues = [];
  const hintSlots = expandedCraftIngredientIds(route).map((ingredientId) => {
    const ingredient = ingredientData(ingredientId);
    const revealed = Number(hintCounts.get(ingredientId) || 0) > 0;
    if (revealed) hintCounts.set(ingredientId, Number(hintCounts.get(ingredientId)) - 1);
    if (revealed) return `<span class="recipe-hint-slot is-revealed" title="${ingredient.ingredientName}"><b>${ingredient.emoji}</b><small>${ingredient.ingredientName}</small></span>`;
    const clue = ingredientDiscoveryClue(ingredientId);
    if (hasHint) missingClues.push(clue);
    return hasHint
      ? `<span class="recipe-hint-slot is-clue" title="${clue}"><b>?</b><small>${clue}</small></span>`
      : `<span class="recipe-hint-slot"><b>?</b></span>`;
  }).join("");
  const clueSentences = [...new Set(missingClues)]
    .map((clue) => `<span>${clueWithSubjectParticle(clue)} 더 필요할 것 같아요</span>`).join("");
  return `<article class="recipe-catalog-card is-mystery ${hasHint ? "has-hint" : ""}" data-recipe-id="${route.recipeId}">
    <div class="recipe-catalog-icon mystery-icon">?</div>
    <div class="recipe-catalog-copy"><small>NO.${String(index + 1).padStart(2, "0")} · ${craftIngredientCost(route)}재료</small><strong>${hasHint ? routeRecipeName(route.recipeId) : "???"}</strong><div class="recipe-hint-slots">${hintSlots}</div>${hasHint ? `<div class="recipe-clue-copy">${clueSentences}</div>` : ""}</div>
  </article>`;
}

function renderRecipeMenu() {
  dom.menuKicker.textContent = "아이템 주방";
  dom.menuTitle.textContent = "레시피";
  renderTabs([["craft", "제작"], ["owned", `레시피 ${unlockedRecipeCount()}`], ["ingredients", "재료 보관함"]]);
  if (state.ui.tab === "craft") {
    const visibleIngredients = Object.values(GAME_INGREDIENTS)
      .filter((ingredient) => ingredientAmount(ingredient.id) > 0 || selectedIngredientCount(ingredient.id) > 0);
    const capacity = recipeCombinationCapacity();
    const selected = state.crafting.selected.map((id) => ingredientData(id)).filter(Boolean);
    const bowlPositions = [
      { x: 34, y: 45, r: -9 }, { x: 52, y: 34, r: 7 }, { x: 68, y: 49, r: -4 },
      { x: 43, y: 59, r: 5 }, { x: 59, y: 61, r: -7 }, { x: 76, y: 37, r: 8 },
    ];
    const bowlIngredients = selected.map((ingredient, index) => {
      const position = bowlPositions[index % bowlPositions.length];
      return `<button type="button" class="bowl-ingredient ${index === mixingDropIndex ? "is-dropping" : ""}" style="--x:${position.x}%;--y:${position.y}%;--r:${position.r}deg" data-action="remove-selected-ingredient" data-id="${ingredient.id}" aria-label="${ingredient.ingredientName} 빼기"><span>${ingredient.emoji}</span><small>${ingredient.ingredientName}</small></button>`;
    }).join("");
    const autoUnlocked = unlockedRecipeCount() >= 5;
    const researchProgress = recipeResearch
      ? Math.round(Math.min(1, recipeResearch.elapsed / recipeResearch.duration) * 100)
      : 0;
    const researchOverlay = recipeResearch ? `<div class="recipe-research-overlay" role="status" aria-live="polite">
      <div class="recipe-research-animation" aria-hidden="true"><span class="research-bowl">🥣</span><span class="research-spoon">🥄</span><i>✦</i><i>✧</i><i>✦</i></div>
      <strong>요리 연구 중...</strong>
      <div class="recipe-research-ingredients">${recipeResearch.ingredientIds.map((ingredientId) => `<span title="${ingredientData(ingredientId)?.ingredientName || "재료"}">${ingredientData(ingredientId)?.emoji || "?"}</span>`).join("")}</div>
      <div class="recipe-research-progress" aria-label="연구 진행률"><span style="width:${researchProgress}%"></span></div>
      <small class="recipe-research-percent">${researchProgress}%</small>
    </div>` : "";
    dom.menuContent.innerHTML = `<section class="combination-lab">
      <div class="combination-heading"><div><h3>요리 연구</h3><small>보울 용량 ${selected.length}/${capacity}</small></div><button type="button" data-action="clear-combination" ${selected.length ? "" : "disabled"}>비우기</button></div>
      <div class="mixing-board">
        <span class="board-grain grain-one" aria-hidden="true"></span><span class="board-grain grain-two" aria-hidden="true"></span>
        <div class="mixing-bowl" aria-label="재료를 담는 보울">
          <div class="mixing-bowl-rim"></div>
          <div class="mixing-bowl-contents">${bowlIngredients || `<span class="empty-bowl-hint">재료를 넣어주세요</span>`}</div>
          <div class="mixing-bowl-front"><span aria-hidden="true">♨</span></div>
        </div>
        <div class="bowl-capacity" aria-label="보울 용량">${Array.from({ length: capacity }, (_, index) => `<i class="${index < selected.length ? "is-filled" : ""}"></i>`).join("")}</div>
      </div>
      <div class="ingredient-shelf-title"><strong>재료 넣기</strong><small>재료를 누르면 보울에 담겨요</small></div>
      <div class="combination-picker">${visibleIngredients.length ? visibleIngredients.map((ingredient) => {
        const selectedCount = selectedIngredientCount(ingredient.id);
        const available = ingredientAmount(ingredient.id) - selectedCount;
        return `<button type="button" data-action="select-ingredient" data-id="${ingredient.id}" ${available > 0 && selected.length < capacity ? "" : "disabled"}><span>${ingredient.emoji}</span><strong>${ingredient.name}</strong><small>${available}/${ingredientAmount(ingredient.id)}</small></button>`;
      }).join("") : `<p>보관함에 재료가 없어요.</p>`}</div>
      <button class="research-button combination-discover" data-action="discover-combination" ${selected.length >= 2 ? "" : "disabled"}><span aria-hidden="true">🥄</span> 보울 섞기</button>
      <button class="research-button auto-research-button" data-action="auto-craft" ${autoUnlocked && !recipeResearch ? "" : "disabled"}>${autoUnlocked ? "자동 요리 연구" : `자동 연구 · 레시피 ${unlockedRecipeCount()}/5`}</button>
      ${researchOverlay}
    </section>
    <div class="recipe-discovery-status"><strong>레시피 목록</strong><span>${unlockedRecipeCount()}/${RECIPE_PROGRESSION.length} 발견</span></div>
    <div class="recipe-catalog-grid">${discoveryOrderedRecipeRoutes().map(recipeCatalogCard).join("")}</div>`;
  } else if (state.ui.tab === "owned") {
    const owned = Object.keys(state.ownedRecipes).map((id) => getRecipe(Number(id))).filter(Boolean);
    dom.menuContent.innerHTML = `<p class="section-note">발견한 레시피 ${owned.length}</p>${owned.map(recipeCard).join("")}`;
  } else {
    const ingredients = storedIngredientIds()
      .map((id) => ingredientData(id))
      .filter(Boolean)
      .sort((a, b) => a.id - b.id);
    const storage = ingredientStorageStatus();
    const fillRatio = storage.capacity ? Math.min(100, storage.totalItems / storage.capacity * 100) : 0;
    dom.menuContent.innerHTML = `<section class="ingredient-storage-panel">
      <div class="ingredient-inventory-summary"><span>보관 용량</span><strong>${formatNumber(storage.totalItems)}/${formatNumber(storage.capacity)}칸</strong></div>
      <div class="ingredient-storage-track"><span style="width:${fillRatio}%"></span></div>
      <div class="ingredient-storage-actions"><small>남은 ${formatNumber(storage.remaining)}칸</small><button type="button" data-action="expand-ingredient-storage" ${state.resources.gems >= storage.expansionGemCost ? "" : "disabled"}><img src="assets/ui/currency/icon_currency_002.png" alt="보석"/><span>${storage.expansionGemCost}</span><strong>+${storage.expansionAmount}칸</strong></button></div>
    </section>
      <div class="ingredient-inventory-grid">${ingredients.length ? ingredients.map((ingredient) => `<article class="ingredient-inventory-item" data-ingredient-id="${ingredient.id}"><span class="ingredient-emoji">${ingredient.emoji}</span><strong>${ingredient.ingredientName}</strong><b>${formatNumber(ingredientAmount(ingredient.id))}개</b></article>`).join("") : `<p class="ingredient-storage-empty">보관 중인 재료가 없어요.</p>`}</div>`;
  }
}

function claimMission(kind, missionId) {
  const main = kind === "main";
  const mission = (main ? tables.mainMissions : tables.repeatMissions).find((row) => row.id === missionId);
  if (!mission || missionProgress(mission, main) < mission.count) return;
  const claimed = main ? state.missions.mainClaimed : state.missions.dailyClaimed;
  if (claimed.includes(missionId)) return;
  claimed.push(missionId);
  const result = grantReward(mission.rewardId);
  if (!main) dispatchAchievement(13);
  if (main) {
    const groupRows = tables.mainMissions.filter((row) => row.missionGroup === state.missions.mainGroup);
    if (groupRows.every((row) => state.missions.mainClaimed.includes(row.id))) state.missions.mainGroup += 1;
  }
  showToast(`보상 수령 · ${result}`);
  saveState();
  updateHud();
  renderMenu();
}

function missionCard(mission, main) {
  const progress = Math.min(mission.count, missionProgress(mission, main));
  const claimed = (main ? state.missions.mainClaimed : state.missions.dailyClaimed).includes(mission.id);
  const ready = !claimed && progress >= mission.count;
  const missionIndex = main ? Number(mission.iconIndex || 1) : Number(mission.id) - 1000;
  const missionType = main ? "mainmission" : "repeatmission";
  const missionIcon = `assets/ui/mission/icon_${missionType}_${String(Math.max(1, missionIndex)).padStart(3, "0")}.png`;
  return `<article class="feature-card ${claimed ? "is-claimed" : ""}"><img class="feature-icon" src="${missionIcon}" alt="" />
    <div class="feature-copy"><strong>${missionDescription(mission)}</strong><small>${rewardText(mission.rewardId)}</small>
    <div class="progress-track"><span style="width:${Math.min(100, progress / mission.count * 100)}%"></span></div><small>${formatNumber(progress)} / ${formatNumber(mission.count)}</small></div>
    <button class="card-action" data-action="claim-mission" data-kind="${main ? "main" : "daily"}" data-id="${mission.id}" ${ready ? "" : "disabled"}>${claimed ? "완료" : "받기"}</button></article>`;
}

function renderMissionMenu() {
  dom.menuKicker.textContent = "성장 목표";
  dom.menuTitle.textContent = "할 일";
  renderTabs([["main", "메인 임무"], ["daily", "오늘의 할 일"]]);
  if (state.ui.tab === "main") {
    const rows = tables.mainMissions.filter((row) => row.missionGroup === state.missions.mainGroup);
    dom.menuContent.innerHTML = `<div class="mission-group-title"><h3>메인 임무 ${state.missions.mainGroup}단계</h3><small>단계별 순차 진행</small></div>${rows.map((m) => missionCard(m, true)).join("") || `<p class="section-note">모든 메인 임무를 완료했습니다.</p>`}`;
  } else {
    ensureDailyReset();
    const rows = tables.repeatMissions.filter((row) => row.repeatType === 1 && row.group === 0);
    const allClaimed = rows.every((row) => state.missions.dailyClaimed.includes(row.id));
    dom.menuContent.innerHTML = `<div class="mission-group-title"><h3>오늘의 할 일</h3><small>${state.missions.dailyClaimed.length}/${rows.length} 완료</small></div>
      ${rows.map((m) => missionCard(m, false)).join("")}
      <button class="bonus-button" data-action="daily-bonus" ${allClaimed && !state.missions.dailyBonusClaimed ? "" : "disabled"}>${state.missions.dailyBonusClaimed ? "오늘의 완주 보상 수령 완료" : `전체 완료 보상 · ${rewardText(Number(tables.general.DailyMissionRewardId || 101))}`}</button>`;
  }
}

function claimDailyBonus() {
  const rows = tables.repeatMissions.filter((row) => row.repeatType === 1 && row.group === 0);
  if (state.missions.dailyBonusClaimed || !rows.every((row) => state.missions.dailyClaimed.includes(row.id))) return;
  state.missions.dailyBonusClaimed = true;
  const result = grantReward(Number(tables.general.DailyMissionRewardId || 101));
  showToast(`오늘의 완주 보상 · ${result}`, 3);
  saveState(); updateHud(); renderMenu();
}

function renderCollectionMenu() {
  dom.menuKicker.textContent = "만남의 기록";
  dom.menuTitle.textContent = "도감";
  renderTabs([["customers", "손님"], ["specialCustomers", "특별 손님"], ["performers", "공연팀"]]);
  const category = state.ui.tab;
  const dict = state.collections[category];
  Object.values(dict).forEach((entry) => { entry.isNew = false; });
  let rows = [];
  if (category === "customers") rows = allThemeChickMilestones().map((chick) => ({
    id: chick.customerId,
    name: chick.customerName,
    icon: guestIcon({ customerId: chick.customerId, commonId: chick.commonId }),
    rewardIngredients: chick.rewardIngredients,
    recipeName: chick.recipeName,
    themeName: THEME_NAMES[chick.themeId] || `테마 ${chick.themeId}`,
    unlockLabel: chick.themeId === 1 && chick.slot === 0 ? "기본 병아리"
      : chick.themeId === 1 && chick.slot === 1 ? `돌 테마 설비 ${Math.round(chick.threshold * 100)}%`
        : chick.themeId === 1 ? "돌 테마 설비 100%"
        : `테마 파츠 ${Math.round(chick.threshold * 100)}%`,
    available: allUnlockedThemeChicks().some((unlocked) => unlocked.customerId === chick.customerId),
  }));
  if (category === "specialCustomers") rows = tables.specialCustomers.map((item) => ({ id: item.id, name: item.specialCustomerType === 1 ? "도둑" : "투자자", icon: "assets/ui/chick/icon_chick_007.png" }));
  if (category === "performers") rows = tables.performances.map((item) => ({ id: item.id, name: `공연팀 ${item.id}`, icon: "assets/ui/chick/icon_chick_006.png" }));
  if (category !== "customers") {
    dom.menuContent.innerHTML = `<div class="collection-grid">${rows.map((item) => {
      const entry = dict[item.id];
      const known = Boolean(entry);
      return `<div class="collection-cell ${known ? "" : "locked"}"><img src="${item.icon}" alt="" /><strong>${known ? item.name : "???"}</strong><small>${entry ? `${entry.count}회 만남` : "미등록"}</small></div>`;
    }).join("")}</div>`;
    saveState();
    return;
  }

  const knownRows = rows.filter((item) => item.available || Boolean(dict[item.id]));
  const selected = rows.find((item) => item.id === Number(state.ui.collectionCustomerId)) || knownRows[0] || rows[0];
  state.ui.collectionCustomerId = selected.id;
  const selectedEntry = dict[selected.id];
  const selectedKnown = selected.available || Boolean(selectedEntry);
  const visits = Number(selectedEntry?.count || 0);
  const grade = visits ? guestGradeForVisits(visits) : null;
  const nextGrade = visits ? nextGuestGradeForVisits(visits) : GUEST_GRADES[0];
  const regularVisitGoal = GUEST_GRADES[1].minVisits;
  const bestVisitGoal = GUEST_GRADES[2].minVisits;
  const gradeProgress = visits >= bestVisitGoal ? 100 : visits >= regularVisitGoal
    ? 50 + (visits - regularVisitGoal) / (bestVisitGoal - regularVisitGoal) * 50
    : Math.max(0, (visits - 1) / (regularVisitGoal - 1) * 50);
  const dropRows = selectedKnown ? (selected.rewardIngredients || []).map((ingredient, index) => {
    const countKey = index === 0 ? "primaryCount" : index === 1 ? "secondaryCount" : "rareCount";
    const firstStage = GUEST_GRADES.find((stage) => Number(stage[countKey] || 0) > 0);
    const currentCount = Number(grade?.[countKey] || 0);
    const chance = index === 0 ? INGREDIENT_SLOT_WEIGHTS.primary : index === 1 ? INGREDIENT_SLOT_WEIGHTS.secondary : INGREDIENT_SLOT_WEIGHTS.special;
    const slotName = index === 0 ? "주재료" : index === 1 ? "부재료" : "특별";
    return `<div class="customer-drop-row ${currentCount ? "is-active" : ""}">
      <span class="customer-drop-kind">${slotName}<b>${Math.round(chance * 100)}%</b></span>
      <i>${ingredient.emoji}</i><strong>${ingredient.name}</strong>
      <small>${firstStage.minVisits === 1 ? "첫 방문" : `${firstStage.minVisits}회`} · ${currentCount ? `현재 ${currentCount}개` : "잠김"}</small>
    </div>`;
  }).join("") : "";
  const gradeSteps = GUEST_GRADES.map((stage) => `<div class="customer-grade-step ${visits >= stage.minVisits ? "is-reached" : ""}">
    <i></i><strong>${stage.name}</strong><small>${stage.minVisits === 1 ? "첫 방문" : `${stage.minVisits}회`}</small>
  </div>`).join("");

  dom.menuContent.innerHTML = `<section class="collection-overview"><strong>손님 ${knownRows.length}/${rows.length}</strong><span>만난 손님 ${Object.keys(dict).length}</span></section>
    <div class="customer-roster" aria-label="손님 목록">${rows.map((item) => {
    const entry = dict[item.id];
    const known = item.available || Boolean(entry);
    const itemGrade = entry ? guestGradeForVisits(entry.count) : null;
    return `<button type="button" class="customer-roster-card ${known ? "" : "is-locked"} ${item.id === selected.id ? "is-selected" : ""}" data-action="select-customer" data-id="${item.id}" aria-label="${known ? item.name : "미등록 손님"}">
      <img src="${item.icon}" alt=""/><span>${known ? item.name : "???"}</span>${itemGrade ? `<b>${itemGrade.id}</b>` : ""}
    </button>`;
  }).join("")}</div>
    <article class="customer-profile ${selectedKnown ? "" : "is-locked"}">
      <header><div class="customer-profile-portrait">${selectedKnown ? `<img src="${selected.icon}" alt=""/>` : `<span>?</span>`}</div>
        <div><small>${selectedKnown ? selected.themeName : "미등록"}</small><h3>${selectedKnown ? selected.name : "아직 만나지 못한 손님"}</h3><p>${selectedKnown ? selected.unlockLabel : "테마에서 등장 조건을 확인하세요."}</p></div>
        ${selectedKnown ? `<b class="customer-visit-badge">${visits}회</b>` : ""}
      </header>
      ${selectedKnown ? `<section class="customer-grade-panel"><div class="customer-grade-heading"><strong>${grade?.name || "방문 전"}</strong><span>${nextGrade ? `다음 ${nextGrade.minVisits}회` : "최고 단계"}</span></div>
        <div class="customer-grade-line"><span style="width:${Math.min(100, gradeProgress)}%"></span></div><div class="customer-grade-steps">${gradeSteps}</div></section>
        <section class="customer-drop-list"><h4>드랍 재료</h4>${dropRows}</section>` : ""}
    </article>`;
  saveState();
  requestAnimationFrame(() => {
    const roster = dom.menuContent.querySelector(".customer-roster");
    const active = roster?.querySelector(".is-selected");
    if (roster && active) roster.scrollLeft = Math.max(0, active.offsetLeft - (roster.clientWidth - active.clientWidth) / 2);
  });
}

function staffDescription(table, level) {
  if (table.staffType === 2) return `${level.activeTime}초 동안 조리 속도 +${Math.round(level.abilityValue * 100)}%`;
  if (table.staffType === 3) return `${level.activeTime}초 동안 주문을 하나씩 자동 처리`;
  return `${level.activeTime / Math.max(1, level.abilityValue)}초마다 손님 1명 소환`;
}

function renderStaffManagement() {
  const cards = tables.staff.map((table) => {
    const owned = state.staff[table.id];
    const level = staffLevelRow(table.id, owned?.level || 1);
    const next = owned ? nextStaffLevelRow(table.id) : null;
    let action = `<button class="card-action" data-action="hire-staff" data-id="${table.id}" ${state.resources.acorns >= table.staffPrice ? "" : "disabled"}>${formatNumber(table.staffPrice)} 고용</button>`;
    let extra = "";
    if (owned) {
      action = next ? `<button class="card-action" data-action="level-staff" data-id="${table.id}" ${owned.attached >= next.sticker && state.resources.acorns >= next.levelUpPrice ? "" : "disabled"}>Lv.UP</button>` : `<button class="card-action" disabled>최고 레벨</button>`;
      extra = next ? `<button class="card-action" data-action="attach-sticker" data-id="${table.id}" ${owned.attached < next.sticker && state.resources.stickers > 0 ? "" : "disabled"}>스티커 ${owned.attached}/${next.sticker}</button>` : "";
    }
    return `<article class="feature-card"><img class="feature-icon" src="assets/ui/staff/icon_staff_${String(table.id).padStart(3, "0")}.png" alt="" />
      <div class="feature-copy"><strong>${table.staffName}${owned ? ` · Lv.${owned.level}` : ""}</strong><small>${staffDescription(table, level)}</small><small>휴식 ${level.breakTime}초${owned ? ` · 현재 ${owned.mode === "active" ? "근무 중" : "휴식 중"}` : ""}</small>${extra}</div>${action}</article>`;
  }).join("");
  dom.menuContent.innerHTML = `<p class="section-note">스티커 ${state.resources.stickers}/${Number(tables.general.StaffStickerDaily || 5)}</p>${cards}`;
}

function renderPerformanceManagement() {
  const current = activePerformance();
  const stageReady = installedRows(5).length > 0;
  dom.menuContent.innerHTML = `<section class="research-box"><h3>${current ? `공연팀 ${current.id} 공연 중` : "공연 무대"}</h3>
    <p>${!stageReady ? "무대 시설을 먼저 설치해 주세요." : current ? `식당 가격 +${Math.round(current.abilityValue * 100)}% · ${Math.ceil(state.performance.remaining)}초 남음` : `다음 공연까지 ${Math.ceil(state.performance.cooldown)}초`}</p>
    <button class="research-button" data-action="start-performance" ${stageReady && !current && state.performance.cooldown <= 0 ? "" : "disabled"}>공연 시작</button></section>
    ${tables.performances.map((row) => `<article class="feature-card ${state.collections.performers[row.id] ? "" : "is-locked"}"><img class="feature-icon" src="assets/ui/performance/icon_performance_${String(row.id).padStart(3, "0")}.png" alt="" /><div class="feature-copy"><strong>${state.collections.performers[row.id] ? `공연팀 ${row.id}` : "???"}</strong><small>가격 +${Math.round(row.abilityValue * 100)}% · ${row.performanceTime}초</small><small>${row.price ? `공연료 도토리 ${row.price}` : "무료 공연"}</small></div></article>`).join("")}`;
}

function themeProgressGauge(ratio, milestones) {
  const percent = Math.max(0, Math.min(100, Number(ratio || 0) * 100));
  return `<div class="theme-progress-gauge" aria-label="구매 진척도 ${Math.round(percent)}%">
    <div class="progress-track"><span style="width:${percent}%"></span></div>
    <div class="theme-progress-markers">${milestones.map((milestone) =>
      `<span style="left:${Math.max(0, Math.min(100, milestone.threshold * 100))}%;transform:${milestone.threshold <= 0 ? "translateX(0)" : milestone.threshold >= 1 ? "translateX(-100%)" : "translateX(-50%)"}">${milestone.label}</span>`).join("")}</div>
  </div>`;
}

function renderThemeManagement() {
  const themeIds = [...new Set(tables.restaurantThemes.map((row) => row.facilityTheme))].sort((a, b) => a - b);
  const selectedTheme = themeIds.includes(Number(state.ui.themeId)) ? Number(state.ui.themeId) : themeIds[0];
  state.ui.themeId = selectedTheme;
  const rows = tables.restaurantThemes.filter((row) => row.facilityTheme === selectedTheme);
  const openedCount = rows.filter((row) => state.themes.opened.includes(row.id)).length;
  const applicableCount = rows.filter((row) => state.themes.opened.includes(row.id)
    && isThemeFacilityAvailable(row.facilityType)
    && state.themes.activeByFacility[row.facilityType] !== row.id).length;
  const milestones = themeChickMilestones(selectedTheme);
  const unlockedChicks = unlockedThemeChicks(selectedTheme);
  const progress = themeChickProgress(selectedTheme);
  const milestoneCards = milestones.map((chick) => {
    const requiredCount = Math.ceil(progress.total * chick.threshold);
    const unlocked = unlockedChicks.some((item) => item.customerId === chick.customerId);
    const milestoneLabel = selectedTheme === 1 && chick.slot === 0 ? "기본" : `${Math.round(chick.threshold * 100)}%`;
    return `<div class="theme-chick-chip ${unlocked ? "is-unlocked" : "is-locked"}"><span class="theme-chick-mystery" aria-hidden="true">🐣</span><div><b>${chick.customerName}</b><small>${milestoneLabel} · ${unlocked ? "등장" : "잠김"}</small><em>${unlocked ? "등장 완료" : `${progress.opened}/${requiredCount}`}</em></div></div>`;
  }).join("");
  const gaugeMilestones = selectedTheme === 1
    ? milestones.map((chick) => ({ threshold: chick.slot === 0 ? 0 : chick.threshold, label: chick.slot === 0 ? "기본" : `${Math.round(chick.threshold * 100)}%` }))
    : milestones.map((chick) => ({ threshold: chick.threshold, label: `${Math.round(chick.threshold * 100)}%` }));
  const gauge = themeProgressGauge(progress.ratio, gaugeMilestones);

  dom.menuContent.innerHTML = `<div class="theme-tabs" aria-label="테마 선택">${themeIds.map((themeId) => {
    const representative = tables.restaurantThemes.find((row) => row.facilityTheme === themeId && row.facilityType === 1)
      || tables.restaurantThemes.find((row) => row.facilityTheme === themeId);
    return `<button type="button" data-action="theme-select" data-id="${themeId}" class="${themeId === selectedTheme ? "is-active" : ""}"><img src="${themeFacilityIcon(representative)}" alt=""/><span>${THEME_NAMES[themeId] || `테마 ${themeId}`}</span></button>`;
  }).join("")}</div>
    <section class="theme-summary"><div><strong>${THEME_NAMES[selectedTheme] || `테마 ${selectedTheme}`}</strong><span>진척도 ${progress.opened}/${progress.total}</span>${gauge}</div><button class="card-action" data-action="apply-theme-all" data-id="${selectedTheme}" ${applicableCount ? "" : "disabled"}>전체 적용</button></section>
    <div class="theme-chick-milestones">${milestoneCards}</div>
    ${rows.map((row) => {
    const opened = state.themes.opened.includes(row.id);
    const active = state.themes.activeByFacility[row.facilityType] === row.id;
    const available = isThemeFacilityAvailable(row.facilityType);
    const collectible = row.purchaseType === 2;
    const canBuy = available && !collectible && state.resources.acorns >= row.facilityPrice;
    let label = `${formatNumber(row.facilityPrice)} 구매`;
    let action = "buy-theme";
    let disabled = !canBuy;
    if (!available) label = "설비 필요";
    else if (collectible && !opened) label = "전체 수집 보상";
    if (opened) { action = "apply-theme"; label = active ? "적용 중" : "적용"; disabled = active; }
    return `<article class="feature-card ${available ? "" : "is-locked"}"><img class="feature-icon" src="${themeFacilityIcon(row)}" alt=""/><div class="feature-copy"><strong>${FACILITY_META[row.facilityType]?.name || `설비 ${row.facilityType}`}</strong><small>${THEME_NAMES[selectedTheme]} · 수익 +${Math.round(row.abilityValue * 100)}%</small></div><button class="card-action" data-action="${action}" data-id="${row.id}" ${disabled ? "disabled" : ""}>${label}</button></article>`;
  }).join("")}`;
  requestAnimationFrame(() => {
    const tabs = dom.menuContent.querySelector(".theme-tabs");
    const selected = tabs?.querySelector(`[data-id="${selectedTheme}"]`);
    if (tabs && selected) tabs.scrollLeft = Math.max(0, selected.offsetLeft - (tabs.clientWidth - selected.clientWidth) / 2);
  });
}

function renderMenu() {
  if (state.ui.screen === "recipe") renderRecipeMenu();
  else if (state.ui.screen === "missions") renderMissionMenu();
  else if (state.ui.screen === "collection") renderCollectionMenu();
  else if (state.ui.screen === "staff") {
    dom.menuKicker.textContent = "레스토랑 관리";
    dom.menuTitle.textContent = "직원";
    dom.menuTabs.innerHTML = "";
    renderStaffManagement();
  } else if (state.ui.screen === "theme") {
    dom.menuKicker.textContent = "시설 꾸미기";
    dom.menuTitle.textContent = "테마";
    dom.menuTabs.innerHTML = "";
    renderThemeManagement();
  } else if (state.ui.screen === "performance") {
    dom.menuKicker.textContent = "무대";
    dom.menuTitle.textContent = "공연";
    dom.menuTabs.innerHTML = "";
    renderPerformanceManagement();
  }
  renderRecipeReveal();
}

function resetGame() {
  if (!window.confirm("현재 진행을 지우고 처음부터 다시 시작할까요?")) return;
  localStorage.removeItem(SAVE_KEY);
  recipeResearch = null;
  dismissRecipeReveal();
  state = createInitialState();
  dom.installPanel.hidden = true;
  closeMenu();
  showToast("새 식당을 시작합니다.");
  saveState();
  updateHud();
  render();
}

function frame(now) {
  const elapsed = Math.min(.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (!deterministicStepping) update(elapsed);
  render();
  requestAnimationFrame(frame);
}

function renderGameToText() {
  const candidates = installCandidates().map((row) => ({
    id: row.id,
    name: FACILITY_META[row.facilityType]?.name,
    cost: row.facilityPrice,
    ...facilityPlacement(row),
  }));
  return JSON.stringify({
    coordinateSystem: "canvas 480x900; origin top-left; x right; y down",
    mode: "restaurant",
    menuContext: "restaurant",
    visibleRecipeType: "restaurant",
    visibleThemeType: "restaurant",
    objective: currentObjective(),
    resources: state.resources,
    installedFacilityIds: state.installed,
    installCandidates: candidates,
    mealDurationSeconds: GUEST_MEAL_DURATION_SECONDS,
    promotion: { ...state.promotion, threshold: promotionThreshold(), enabled: coreReady() },
    guests: state.guests.map((guest) => ({
      id: guest.id,
      customerId: guest.customerId,
      customerName: guest.customerName || progressionForCustomer(guest.customerId)?.customerName || `손님 ${guest.customerId}`,
      icon: guestIcon(guest),
      state: guest.state,
      x: Math.round(guest.x),
      y: Math.round(guest.y),
      recipeId: guest.recipeId,
      recipeName: routeRecipeName(guest.recipeId),
      wait: Number(guest.wait.toFixed(1)),
      mealDuration: GUEST_MEAL_DURATION_SECONDS,
      mealElapsed: guest.state === "eating" ? Number(guest.stateTime.toFixed(1)) : null,
      mealRemaining: guest.state === "eating"
        ? Number(Math.max(0, GUEST_MEAL_DURATION_SECONDS - guest.stateTime).toFixed(1))
        : null,
      mood: guest.mood,
      dropIngredient: guest.ingredientId || progressionForCustomer(guest.customerId)?.ingredientId || null,
      guestGrade: guestGradeForVisits(guest.visitNumber || state.collections.customers[guest.customerId]?.count || 1).name,
      visits: Number(guest.visitNumber || state.collections.customers[guest.customerId]?.count || 1),
      rewardItems: (progressionForCustomer(guest.customerId)?.rewardIngredients || []).map((ingredient) => ({ ingredientId: ingredient.id, name: ingredient.name })),
      themeId: guest.themeId || chickMilestoneForCustomer(guest.customerId)?.themeId || null,
      chickSlot: Number.isInteger(guest.chickSlot) ? guest.chickSlot : chickMilestoneForCustomer(guest.customerId)?.slot ?? null,
    })),
    ordersQueued: state.orders.length,
    cooking: state.cooking.map((task) => ({
      guestId: task.guestId,
      recipe: routeRecipeName(task.recipeId),
      elapsed: Number(task.elapsed.toFixed(1)),
      duration: task.duration,
    })),
    payments: state.payments.map((payment) => ({ x: payment.x, y: payment.y, amount: payment.amount })),
    ingredientDrops: state.ingredientDrops.map((drop) => ({
      id: drop.id,
      ingredientId: drop.ingredientId,
      emoji: drop.emoji,
      grade: drop.gradeName || null,
      slot: drop.ingredientSlot || null,
      totalCount: Number(drop.totalCount || 1),
      items: (drop.items || [{ ingredientId: drop.ingredientId, count: 1 }]).map((item) => ({
        ingredientId: item.ingredientId,
        name: ingredientData(item.ingredientId)?.ingredientName || "재료",
        count: Number(item.count || 1),
      })),
      x: Math.round(drop.x),
      y: Math.round(drop.y),
    })),
    tipbox: state.tipbox,
    tipRule: { basis: "final-meal-price", rate: .1 },
    metrics: state.metrics,
    currentScreen: state.ui.screen,
    recipes: {
      owned: Object.keys(state.ownedRecipes).length,
      combinationCapacity: recipeCombinationCapacity(),
      selectedIngredients: [...state.crafting.selected],
      mixingPresentation: "cutting-board-and-bowl",
      research: recipeResearch ? {
        recipeId: recipeResearch.recipeId,
        automatic: recipeResearch.automatic,
        ingredientIds: [...recipeResearch.ingredientIds],
        elapsed: Number(recipeResearch.elapsed.toFixed(2)),
        duration: recipeResearch.duration,
        progress: Number(Math.min(1, recipeResearch.elapsed / recipeResearch.duration).toFixed(3)),
      } : null,
      catalogTotal: RECIPE_PROGRESSION.length,
      catalogSort: "earliest-ingredient-discovery-stage",
      catalogOrder: discoveryOrderedRecipeRoutes().map((route) => route.recipeId),
      reveal: recipeReveal ? {
        recipeId: recipeReveal.recipeId,
        recipeName: recipeReveal.result === "failure" ? "괴식" : routeRecipeName(recipeReveal.recipeId),
        result: recipeReveal.result,
        automatic: recipeReveal.automatic,
        previousLevel: recipeReveal.previousLevel,
        newLevel: recipeReveal.newLevel,
        previousPrice: recipeReveal.previousPrice,
        newPrice: recipeReveal.newPrice,
        priceIncrease: recipeReveal.priceIncrease,
      } : null,
      hintRule: "same-size-at-least-one-correct-reveals-name-and-missing-clues",
      mysteryRecipeCount: RECIPE_PROGRESSION.filter((route) => !recipeData(route.recipeId)).length,
      hintedRecipes: Object.fromEntries(Object.entries(state.crafting.hints || {})
        .filter(([recipeId, ingredientIds]) => !recipeData(Number(recipeId)) && ingredientIds.length)
        .map(([recipeId, ingredientIds]) => {
          const numericRecipeId = Number(recipeId);
          const revealedCounts = new Map();
          ingredientIds.forEach((ingredientId) => revealedCounts.set(Number(ingredientId),
            Number(revealedCounts.get(Number(ingredientId)) || 0) + 1));
          const missingIngredientIds = expandedCraftIngredientIds(progressionForRecipe(numericRecipeId))
            .filter((ingredientId) => {
              const count = Number(revealedCounts.get(ingredientId) || 0);
              if (!count) return true;
              revealedCounts.set(ingredientId, count - 1);
              return false;
            });
          return [recipeId, {
            recipeName: routeRecipeName(numericRecipeId),
            revealedIngredients: ingredientIds.map((ingredientId) => ingredientData(ingredientId)?.ingredientName).filter(Boolean),
            missingClues: [...new Set(missingIngredientIds.map(ingredientDiscoveryClue))],
            revealedCount: ingredientIds.length,
            totalCount: craftIngredientCost(progressionForRecipe(numericRecipeId)),
          }];
        })),
      autoResearchUnlocked: unlockedRecipeCount() >= 5,
      autoResearchTarget: unlockedRecipeCount() < 5 ? null : RECIPE_PROGRESSION
        .filter((route) => canCraftRecipe(route.recipeId))
        .sort(compareAutoResearchRoutes)[0]?.recipeId || null,
      autoResearchPriority: "new-first-lowest-level-then-highest-inventory-pressure",
      autoResearchWhenNoRecipe: "random-ingredients-up-to-bowl-capacity-then-weird-dish",
      salePriceFormula: "recipeLevelPrice*restaurantPriceUp*satisfaction*performanceBuff",
      salePriceMultipliers: {
        restaurantPriceUp: restaurantPriceUpMultiplier(),
        satisfactionNormal: satisfactionPriceMultiplier("normal"),
        satisfactionHappy: satisfactionPriceMultiplier("satisfied"),
        performanceBuff: performancePriceMultiplier(),
      },
      recipeLevelPriceBonus: RECIPE_LEVEL_PRICE_BONUS,
      craftable: RECIPE_PROGRESSION.filter((route) => canCraftRecipe(route.recipeId)).map((route) => route.recipeId),
      searchScope: "all-recipes-by-owned-ingredients",
      craftCosts: Object.fromEntries(RECIPE_PROGRESSION.map((route) => [route.recipeId, craftIngredientCost(route)])),
      upgradeIngredientCostRule: "fixed-per-recipe",
      craftRequirements: Object.fromEntries(RECIPE_PROGRESSION.map((route) => [route.recipeId,
        craftIngredientRequirements(route).map((requirement) => ({ ingredientId: requirement.ingredientId, name: requirement.name, count: requirement.count }))])),
      levels: Object.fromEntries(Object.entries(state.ownedRecipes).map(([id, owned]) => [id, owned.level])),
      prices: Object.fromEntries(Object.entries(state.ownedRecipes).map(([id, owned]) => {
        const recipe = getRecipe(Number(id));
        return [id, Math.round(recipeLevelPrice(recipe, owned))];
      })),
    },
    ingredientStorage: ingredientStorageStatus(),
    progression: {
      unlockedThemes: [...new Set(CORE_PROGRESSION.filter((route) => isThemeUnlocked(route.themeId)).map((route) => route.themeId))],
      activeThemeParts: { ...state.themes.activeByFacility },
      unlockedCustomers: allUnlockedThemeChicks().map((chick) => chick.customerId),
      unlockedChickRoutes: allUnlockedThemeChicks().map((chick) => ({
        themeId: chick.themeId,
        slot: chick.slot,
        customerId: chick.customerId,
        customerName: chick.customerName,
        ingredientId: chick.ingredientId,
        ingredientName: chick.ingredientName,
        rewardItems: chick.rewardIngredients.map((ingredient, index) => ({
          slot: index === 0 ? "primary" : index === 1 ? "secondary" : "special",
          ingredientId: ingredient.id,
          name: ingredient.name,
        })),
        recipeId: chick.recipeId,
        recipeName: chick.recipeName,
        recipeIngredients: chick.ingredientRequirements.map((ingredient) => ({ ingredientId: ingredient.id, name: ingredient.name })),
      })),
      themeChickThresholds: THEME_CHICK_THRESHOLDS,
      themePartPrices: Object.fromEntries(Object.keys(THEME_NAMES).map((themeId) => {
        const prices = tables.restaurantThemes
          .filter((row) => Number(row.facilityTheme) === Number(themeId) && Number(row.purchaseType) !== 2)
          .map((row) => Number(row.facilityPrice || 0));
        return [themeId, { min: Math.min(...prices), max: Math.max(...prices) }];
      })),
      guestGrades: GUEST_GRADES,
      themeChickProgress: Object.fromEntries(Object.keys(THEME_NAMES).map((themeId) => {
        const progress = themeChickProgress(Number(themeId));
        return [themeId, { ...progress, unlocked: unlockedThemeChicks(Number(themeId)).map((chick) => chick.customerId) }];
      })),
      ingredientDropChances: Object.fromEntries(CORE_PROGRESSION.map((route) => [route.ingredientId, GUEST_INGREDIENT_DROP_CHANCE])),
      ingredientDropRule: {
        overallChance: GUEST_INGREDIENT_DROP_CHANCE,
        ingredientTypesOnSuccess: 1,
        slotChances: { ...INGREDIENT_SLOT_WEIGHTS },
        grades: GUEST_GRADES.map((grade) => ({
          minVisits: grade.minVisits,
          primaryCount: grade.primaryCount,
          secondaryCount: grade.secondaryCount,
          rareCount: grade.rareCount,
        })),
      },
      ingredients: { ...state.crafting.ingredients },
      autoCraft: unlockedRecipeCount() >= 5 ? "new-first-then-lowest-level" : "locked-until-5-recipes",
      craftedRecipes: state.crafting.history.map((entry) => entry.recipeId),
    },
    activeSystems: { missions: SYSTEM_ENABLED.missions, staff: SYSTEM_ENABLED.staff },
    currentTab: state.ui.tab,
    collection: {
      customers: Object.keys(state.collections.customers).length,
      specialCustomers: Object.keys(state.collections.specialCustomers).length,
      performers: Object.keys(state.collections.performers).length,
      customerGrades: Object.fromEntries(Object.entries(state.collections.customers).map(([customerId, entry]) => {
        const grade = guestGradeForVisits(entry.count);
        const next = nextGuestGradeForVisits(entry.count);
        return [customerId, { visits: entry.count, gradeId: grade.id, gradeName: grade.name, nextAt: next?.minVisits || null }];
      })),
    },
    specialCustomers: state.specialActors.map((actor) => ({ id: actor.specialId, state: actor.state, x: Math.round(actor.x), y: Math.round(actor.y), stolen: actor.stolen })),
    selectedInstallId: state.ui.selectedInstallId,
  });
}

async function init() {
  try {
    tables = await loadTables();
    state = loadState() || createInitialState();
    state.ui.screen = "restaurant";
    dom.menuScreen.hidden = true;
    setActiveNav("");
    updateHud();
    render();
    requestAnimationFrame(frame);
  } catch (error) {
    console.error(error);
    showToast(error.message, 60);
  }
}

canvas.addEventListener("pointerdown", handleCanvasTap);
dom.promoButton.addEventListener("click", promote);
dom.resetButton.addEventListener("click", resetGame);
dom.installClose.addEventListener("click", closeInstallPanel);
dom.installConfirm.addEventListener("click", confirmInstall);
dom.menuClose.addEventListener("click", closeMenu);
dom.navButtons.forEach((button) => button.addEventListener("click", () => openMenu(button.dataset.screen)));
dom.menuTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tab]");
  if (!button) return;
  state.ui.tab = button.dataset.tab;
  renderMenu();
});
dom.menuContent.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === "research") doResearch();
  if (button.dataset.action === "select-ingredient") addSelectedIngredient(id);
  if (button.dataset.action === "remove-selected-ingredient") removeSelectedIngredient(id);
  if (button.dataset.action === "clear-combination") { state.crafting.selected = []; mixingDropIndex = -1; saveState(); renderMenu(); }
  if (button.dataset.action === "discover-combination") discoverSelectedCombination();
  if (button.dataset.action === "auto-craft") {
    if (!tryAutoCraft()) showToast(unlockedRecipeCount() < 5
      ? "레시피 5개 발견 후 자동 연구가 열려요."
      : "자동 연구에는 재료가 2개 이상 필요해요.");
    renderMenu();
  }
  if (button.dataset.action === "codex") claimCodexReward(id);
  if (button.dataset.action === "claim-mission") claimMission(button.dataset.kind, id);
  if (button.dataset.action === "daily-bonus") claimDailyBonus();
  if (button.dataset.action === "hire-staff") hireStaff(id);
  if (button.dataset.action === "attach-sticker") attachStaffSticker(id);
  if (button.dataset.action === "level-staff") levelUpStaff(id);
  if (button.dataset.action === "start-performance") startPerformance();
  if (button.dataset.action === "buy-theme") buyTheme(id);
  if (button.dataset.action === "apply-theme") applyTheme(id);
  if (button.dataset.action === "apply-theme-all") applyThemeAll(id);
  if (button.dataset.action === "theme-select") {
    state.ui.themeId = id;
    renderMenu();
  }
  if (button.dataset.action === "expand-ingredient-storage") expandIngredientStorage();
  if (button.dataset.action === "theme-filter") { state.ui.themeFacilityType = id; renderMenu(); }
  if (button.dataset.action === "select-customer") { state.ui.collectionCustomerId = id; saveState(); renderMenu(); }
});
dom.recipeReveal.addEventListener("click", (event) => {
  if (event.target === dom.recipeReveal || event.target.closest('[data-action="dismiss-recipe-reveal"]')) dismissRecipeReveal();
});
document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "f") {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.querySelector(".game-frame").requestFullscreen();
  }
});

window.render_game_to_text = renderGameToText;
window.advanceTime = (milliseconds) => {
  deterministicStepping = true;
  const steps = Math.max(1, Math.round(milliseconds / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) update(FIXED_DT);
  render();
  return renderGameToText();
};

init();
