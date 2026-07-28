const { loadTables } = window.ChickData;
const {
  GAME_W,
  GAME_H,
  FIXED_DT,
  SAVE_KEY,
  GUEST_MEAL_DURATION_SECONDS,
  FACILITY_META,
  facilityPlacement,
  cafeFacilityPlacement,
  seatPositions,
  recipeIcon,
  recipeName,
  THEME_NAMES,
  CORE_PROGRESSION,
  GAME_INGREDIENTS,
  THEME_CHICK_THRESHOLDS,
  GUEST_GRADES,
  GUEST_INGREDIENT_DROP_CHANCE,
  CAFE_CAKE_MILESTONES,
  CAFE_THEME_PRICE_RATE,
  CAFE_THEME_MIN_PRICE,
  BASE_CAKE_INGREDIENTS,
  CAFE_THEME_NAMES,
  CAFE_THEME_CAKE_REWARDS,
  CAKE_BASE_PRICE,
  CAKE_SECOND_CRAFT_IDEA_COST,
  CAKE_SECOND_CRAFT_GEM_COST,
  CAKE_RECIPES,
  themeChickMilestones,
  allThemeChickMilestones,
  REGION_UNLOCKS,
  themeFacilityIcon,
  cafeThemeFacilityIcon,
} = window.CHICK_CONFIG;

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const dom = {
  acorns: document.querySelector("#acorn-count"),
  ideas: document.querySelector("#idea-count"),
  gems: document.querySelector("#gem-count"),
  promoButton: document.querySelector("#promotion-btn"),
  resetButton: document.querySelector("#reset-btn"),
  collectionButton: document.querySelector("#collection-btn"),
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
  menuClose: document.querySelector("#menu-close-btn"),
  navButtons: [...document.querySelectorAll(".nav-button")],
  recipeDot: document.querySelector("#recipe-dot"),
  missionDot: document.querySelector("#mission-dot"),
  collectionDot: document.querySelector("#collection-dot"),
  toast: document.querySelector("#toast"),
  worldAreaSwitch: document.querySelector("#world-area-switch"),
  worldAreaButtons: [...document.querySelectorAll("[data-world-area]")],
  worldAreaName: document.querySelector("#world-area-name"),
  cafeLockBadge: document.querySelector("#cafe-lock-badge"),
  cafeExpandButton: document.querySelector("#cafe-expand-btn"),
  cafeInstallTargets: document.querySelector("#cafe-install-targets"),
  cakeWorkshopButton: document.querySelector("#cake-workshop-btn"),
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
const CAFE_ORDER_DURATION_SECONDS = 1.2;
const CAFE_CONTINUE_VISIT_CHANCE = .8;
let dragScrollGesture = null;
let suppressedDragClick = null;
let cafeInstallTargetSignature = "";

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
  const firstThemePart = tables.restaurantThemes.find((row) => row.facilityTheme === 6 && row.facilityType === 1);
  return Math.max(Number(tables.general.AccountFirstAcorn ?? 100), coreInstallCost + Number(firstThemePart?.facilityPrice || 0));
}

function initialCakeWorkshop() {
  return {
    dayKey: new Date().toISOString().slice(0, 10),
    freeCraftsUsed: 0,
    totalCrafted: 0,
    discoveredRecipeIds: [],
    selectedSheet: "cake_sheet_basic",
    selectedCream: "cake_cream_fresh",
    selectedTopping: "cake_topping_strawberry",
    toppingPlacements: [],
    limitedSale: null,
    lastResult: null,
  };
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
    cafeThemes: {
      opened: [],
      activeThemeId: 101,
      cakeIngredients: BASE_CAKE_INGREDIENTS.map((ingredient) => ingredient.id),
    },
    cafeArea: { unlocked: false, expansionConfirmed: false },
    cakeWorkshop: initialCakeWorkshop(),
    crafting: { autoEnabled: false, ingredients: {}, history: [] },
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
    cafeGuests: [],
    cafeGuestSequence: 1,
    cafeQueue: [],
    cafePayments: [],
    cafeVisit: { timer: 0, total: 0 },
    orders: [],
    cooking: [],
    payments: [],
    ingredientDrops: [],
    dropSequence: 1,
    tipbox: 0,
    metrics: { visitors: 0, orders: 0, served: 0, collected: 0, angryLeaves: 0, cafeVisitors: 0, cafeContinuedVisitors: 0, cafeServed: 0, cafeCollected: 0, ingredientDropAttempts: 0, ingredientDropMisses: 0, ingredientsFound: 0, giftBundles: 0, giftItems: 0, recipesCrafted: 0 },
    ui: {
      selectedInstallId: null,
      screen: "restaurant",
      tab: "craft",
      themeId: 1,
      cafeThemeId: 101,
      themeArea: "restaurant",
      worldArea: "restaurant",
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
    const availableCakeIngredientIds = new Set([
      ...BASE_CAKE_INGREDIENTS,
      ...Object.values(CAFE_THEME_CAKE_REWARDS).flat(),
    ].map((ingredient) => ingredient.id));
    const availableCafeThemePartIds = new Set(Object.keys(CAFE_THEME_NAMES).flatMap((themeId) =>
      tables.cafeInstalls.map((row) => Number(themeId) * 1000 + Number(row.id))));
    const openedCafeThemes = (parsed.cafeThemes?.opened || [])
      .map(Number)
      .filter((id) => availableCafeThemePartIds.has(id));
    const cakeIngredients = [...new Set([
      ...BASE_CAKE_INGREDIENTS.map((ingredient) => ingredient.id),
      ...(parsed.cafeThemes?.cakeIngredients || []),
      ...earnedCafeCakeIngredients(openedCafeThemes).map((ingredient) => ingredient.id),
    ])].filter((id) => availableCakeIngredientIds.has(id));
    const parsedCakeWorkshop = { ...initialCakeWorkshop(), ...parsed.cakeWorkshop };
    const availableIngredient = (id, type, fallback) => {
      const ingredient = cakeIngredientData(id);
      return ingredient?.type === type && cakeIngredients.includes(id) ? id : fallback;
    };
    const cakeWorkshop = {
      ...parsedCakeWorkshop,
      dayKey: typeof parsedCakeWorkshop.dayKey === "string" ? parsedCakeWorkshop.dayKey : new Date().toISOString().slice(0, 10),
      freeCraftsUsed: Math.max(0, Number(parsedCakeWorkshop.freeCraftsUsed) || 0),
      totalCrafted: Math.max(0, Number(parsedCakeWorkshop.totalCrafted) || 0),
      discoveredRecipeIds: [...new Set(parsedCakeWorkshop.discoveredRecipeIds || [])]
        .filter((id) => CAKE_RECIPES.some((recipe) => recipe.id === id)),
      selectedSheet: availableIngredient(parsedCakeWorkshop.selectedSheet, "sheet", "cake_sheet_basic"),
      selectedCream: availableIngredient(parsedCakeWorkshop.selectedCream, "cream", "cake_cream_fresh"),
      selectedTopping: availableIngredient(parsedCakeWorkshop.selectedTopping, "topping", "cake_topping_strawberry"),
      toppingPlacements: (parsedCakeWorkshop.toppingPlacements || []).slice(0, 12).map((placement) => ({
        x: Math.min(.9, Math.max(.1, Number(placement.x) || .5)),
        y: Math.min(.82, Math.max(.12, Number(placement.y) || .45)),
        rotation: Number(placement.rotation) || 0,
      })),
      limitedSale: parsedCakeWorkshop.limitedSale && Number(parsedCakeWorkshop.limitedSale.remaining) > 0
        ? {
          ...parsedCakeWorkshop.limitedSale,
          remaining: Math.max(0, Number(parsedCakeWorkshop.limitedSale.remaining) || 0),
          unitPrice: Math.max(1, Number(parsedCakeWorkshop.limitedSale.unitPrice) || CAKE_BASE_PRICE),
        }
        : null,
      lastResult: parsedCakeWorkshop.lastResult || null,
    };
    return {
      ...defaults,
      ...parsed,
      version: 9,
      resources: { ...defaults.resources, ...parsed.resources },
      ownedRecipes,
      collections: { ...defaults.collections, ...parsed.collections },
      missions: { ...defaults.missions, ...parsed.missions },
      metrics: { ...defaults.metrics, ...parsed.metrics },
      ui: { ...defaults.ui, ...parsed.ui, screen: "restaurant", tab: "craft", worldArea: "restaurant" },
      staff: parsed.staff || {},
      performance: { ...defaults.performance, ...parsed.performance },
      themes: {
        ...defaults.themes,
        ...parsed.themes,
        opened: openedThemes,
        unlockedThemeIds,
        activeByFacility,
      },
      cafeThemes: {
        ...defaults.cafeThemes,
        ...parsed.cafeThemes,
        opened: openedCafeThemes,
        activeThemeId: Object.hasOwn(CAFE_THEME_NAMES, Number(parsed.cafeThemes?.activeThemeId))
          ? Number(parsed.cafeThemes.activeThemeId)
          : defaults.cafeThemes.activeThemeId,
        cakeIngredients,
      },
      cafeArea: {
        ...defaults.cafeArea,
        ...parsed.cafeArea,
        unlocked: Number(parsed.version) >= 9 && Boolean(parsed.cafeArea?.expansionConfirmed),
        expansionConfirmed: Number(parsed.version) >= 9 && Boolean(parsed.cafeArea?.expansionConfirmed),
      },
      cakeWorkshop,
      crafting: {
        ...defaults.crafting,
        ...parsed.crafting,
        ingredients: { ...defaults.crafting.ingredients, ...parsed.crafting?.ingredients },
        history: parsed.crafting?.history || [],
      },
      specialActors: parsed.specialActors || [],
      specialLastSpawn: parsed.specialLastSpawn || {},
      cafeGuests: parsed.cafeGuests || [],
      cafeGuestSequence: Number(parsed.cafeGuestSequence || 1),
      cafeQueue: parsed.cafeQueue || [],
      cafePayments: parsed.cafePayments || [],
      cafeVisit: { ...defaults.cafeVisit, ...parsed.cafeVisit },
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

function progressionForCustomer(customerId) {
  return CORE_PROGRESSION.find((entry) => entry.customerId === Number(customerId));
}

function progressionForRecipe(recipeId) {
  return CORE_PROGRESSION.find((entry) => entry.recipeId === Number(recipeId));
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
  if (Number(themeId) === 1) return ratio >= 1 ? [milestones[0], milestones[2]] : milestones.slice(0, 1);
  return milestones.filter((milestone) => ratio + Number.EPSILON >= milestone.threshold);
}

function allUnlockedThemeChicks() {
  return Object.keys(THEME_NAMES).flatMap((themeId) => unlockedThemeChicks(Number(themeId)));
}

function cafeThemeRows(themeId) {
  const cafeThemeId = Number(themeId);
  if (!Object.hasOwn(CAFE_THEME_NAMES, cafeThemeId)) return [];
  return tables.cafeInstalls.map((row) => ({
    ...row,
    id: cafeThemeId * 1000 + Number(row.id),
    installId: Number(row.id),
    facilityTheme: cafeThemeId,
    purchaseType: 1,
    itemId: 101,
  }));
}

function cafeThemePartPrice(row) {
  return Math.max(CAFE_THEME_MIN_PRICE, Math.ceil(Number(row?.facilityPrice || 0) * CAFE_THEME_PRICE_RATE));
}

function cafeThemeProgress(themeId, openedIds = state?.cafeThemes?.opened || []) {
  const rows = cafeThemeRows(themeId);
  const opened = rows.filter((row) => openedIds.includes(row.id)).length;
  return {
    opened,
    total: rows.length,
    ratio: rows.length ? opened / rows.length : 0,
  };
}

function earnedCafeCakeIngredients(openedIds) {
  return Object.keys(CAFE_THEME_NAMES).flatMap((themeIdText) => {
    const themeId = Number(themeIdText);
    const progress = cafeThemeProgress(themeId, openedIds);
    const rewards = CAFE_THEME_CAKE_REWARDS[themeId] || [];
    return rewards.filter((reward, index) => progress.ratio + Number.EPSILON >= CAFE_CAKE_MILESTONES[index]);
  });
}

function cakeIngredientData(id) {
  return [...BASE_CAKE_INGREDIENTS, ...Object.values(CAFE_THEME_CAKE_REWARDS).flat()]
    .find((ingredient) => ingredient.id === id) || null;
}

function ensureCakeDailyReset() {
  const dayKey = new Date().toISOString().slice(0, 10);
  if (state.cakeWorkshop.dayKey === dayKey) return;
  state.cakeWorkshop.dayKey = dayKey;
  state.cakeWorkshop.freeCraftsUsed = 0;
}

function unlockedCakeIngredients(type) {
  return state.cafeThemes.cakeIngredients.map(cakeIngredientData)
    .filter((ingredient) => ingredient?.type === type);
}

function selectedCakeRecipe() {
  return CAKE_RECIPES.find((recipe) =>
    recipe.sheetId === state.cakeWorkshop.selectedSheet
    && recipe.creamId === state.cakeWorkshop.selectedCream
    && recipe.toppingId === state.cakeWorkshop.selectedTopping) || null;
}

function cakeUnitPrice(recipe = selectedCakeRecipe()) {
  return Math.max(1, Math.round(CAKE_BASE_PRICE * Number(recipe?.priceMultiplier || 1.5)));
}

function selectCakePart(kind, id) {
  const property = { sheet: "selectedSheet", cream: "selectedCream", topping: "selectedTopping" }[kind];
  const ingredient = cakeIngredientData(id);
  if (!property || ingredient?.type !== kind || !state.cafeThemes.cakeIngredients.includes(id)) return;
  state.cakeWorkshop[property] = id;
  if (kind === "topping") state.cakeWorkshop.toppingPlacements = [];
  state.cakeWorkshop.lastResult = null;
  saveState();
  renderMenu();
}

function finishCake(currency) {
  if (!state.cafeArea.unlocked || !cafeBakingFacilityInstalled()) {
    return showToast("카페에 케이크 진열대를 먼저 설치해 주세요.");
  }
  ensureCakeDailyReset();
  if (!state.cakeWorkshop.toppingPlacements.length) {
    return showToast("케이크 위를 눌러 토핑을 하나 이상 올려 주세요.");
  }
  const free = state.cakeWorkshop.freeCraftsUsed < 1;
  if (!free) {
    if (currency === "gems") {
      if (state.resources.gems < CAKE_SECOND_CRAFT_GEM_COST) return showToast("보석이 부족해요.");
      state.resources.gems -= CAKE_SECOND_CRAFT_GEM_COST;
    } else {
      if (state.resources.ideas < CAKE_SECOND_CRAFT_IDEA_COST) return showToast("아이디어가 부족해요.");
      state.resources.ideas -= CAKE_SECOND_CRAFT_IDEA_COST;
    }
  } else {
    state.cakeWorkshop.freeCraftsUsed += 1;
  }

  const recipe = selectedCakeRecipe();
  const newlyDiscovered = Boolean(recipe && !state.cakeWorkshop.discoveredRecipeIds.includes(recipe.id));
  if (newlyDiscovered) state.cakeWorkshop.discoveredRecipeIds.push(recipe.id);
  const name = recipe?.name || "나만의 커스텀 케이크";
  const saleCount = Number(recipe?.saleCount || 3);
  const unitPrice = cakeUnitPrice(recipe);
  state.cakeWorkshop.totalCrafted += 1;
  state.cakeWorkshop.lastResult = {
    recipeId: recipe?.id || null,
    name,
    newlyDiscovered,
    comboBonus: Boolean(recipe),
    unitPrice,
    saleCount,
  };
  state.cakeWorkshop.limitedSale = {
    recipeId: recipe?.id || null,
    name,
    comboBonus: Boolean(recipe),
    unitPrice,
    remaining: saleCount,
    selection: {
      sheetId: state.cakeWorkshop.selectedSheet,
      creamId: state.cakeWorkshop.selectedCream,
      toppingId: state.cakeWorkshop.selectedTopping,
    },
  };
  saveState();
  updateHud();
  renderMenu();
  dom.menuContent.scrollTop = 0;
  render();
  showToast(newlyDiscovered ? `신규 레시피 발견 · ${name}` : `${name} ${saleCount}조각을 진열했어요.`, 3);
}

function sellLimitedCake(guest) {
  const sale = state.cakeWorkshop.limitedSale;
  if (!sale || sale.remaining <= 0) return 0;
  sale.remaining -= 1;
  guest.cakePurchase = sale.name;
  const amount = Math.max(1, Number(sale.unitPrice) || CAKE_BASE_PRICE);
  if (sale.remaining <= 0) state.cakeWorkshop.limitedSale = null;
  return amount;
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
    slot: index === 0 ? "primary" : index === 1 ? "secondary" : "rare",
  })).filter((item) => item.count > 0);
}

function unlockedRecipeCount() {
  // Cake combinations live in cakeWorkshop and never count toward restaurant region unlocks.
  return Object.keys(state.ownedRecipes).filter((id) => recipeData(id)).length;
}

function unlockedRegions() {
  const count = unlockedRecipeCount();
  return REGION_UNLOCKS.filter((region) => count >= region.recipeCount);
}

function cafeRegion() {
  return REGION_UNLOCKS.find((region) => region.area === "cafe") || REGION_UNLOCKS[0];
}

function cafeExpansionAvailable() {
  const region = cafeRegion();
  return Boolean(region && unlockedRegions().some((unlocked) => unlocked.id === region.id));
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

function checkAndGrantCafeAllCollect(themeId) {
  return cafeThemeProgress(themeId).ratio >= 1;
}

function buyCafeTheme(partId) {
  const row = Object.keys(CAFE_THEME_NAMES).flatMap((themeId) => cafeThemeRows(Number(themeId)))
    .find((item) => item.id === Number(partId));
  if (!row || state.cafeThemes.opened.includes(partId) || row.purchaseType === 2) return;
  const serviceReadyBefore = cafeServiceReady();
  const key = RESOURCE_BY_ITEM[row.itemId];
  const price = cafeThemePartPrice(row);
  if (!key || state.resources[key] < price) return;
  const ownedBefore = new Set(state.cafeThemes.cakeIngredients);
  state.resources[key] -= price;
  state.cafeThemes.opened.push(row.id);
  state.cafeThemes.activeThemeId = row.facilityTheme;
  checkAndGrantCafeAllCollect(row.facilityTheme);
  const earned = earnedCafeCakeIngredients(state.cafeThemes.opened);
  const newlyUnlocked = earned.filter((ingredient) => !ownedBefore.has(ingredient.id));
  state.cafeThemes.cakeIngredients = [...new Set([
    ...state.cafeThemes.cakeIngredients,
    ...earned.map((ingredient) => ingredient.id),
  ])];
  dispatchAchievement(11, 1, 0, partId);
  const progress = cafeThemeProgress(row.facilityTheme);
  const serviceStarted = !serviceReadyBefore && cafeServiceReady();
  showToast(serviceStarted
    ? "카페 영업 시작!"
    : newlyUnlocked.length
      ? `${CAFE_THEME_NAMES[row.facilityTheme]} 수집! ${newlyUnlocked.map((ingredient) => `${ingredient.emoji} ${ingredient.name}`).join(", ")} 획득.`
      : `${CAFE_THEME_NAMES[row.facilityTheme]} 파츠 · ${progress.opened}/${progress.total}`, 3);
  saveState();
  updateHud();
  if (!dom.menuScreen.hidden) renderMenu();
  render();
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

function activeCafeThemeId() {
  const selected = Number(state.cafeThemes.activeThemeId || state.ui.cafeThemeId || 101);
  return Object.hasOwn(CAFE_THEME_NAMES, selected) ? selected : 101;
}

function cafeInstalledRows(themeId = activeCafeThemeId()) {
  return cafeThemeRows(themeId).filter((row) => state.cafeThemes.opened.includes(row.id));
}

function cafeBakingFacilityInstalled() {
  return cafeInstalledRows().some((row) => row.facilityType === 18);
}

function cafeInstallCandidates(themeId = activeCafeThemeId()) {
  return cafeThemeRows(themeId).filter((row) => !state.cafeThemes.opened.includes(row.id)).slice(0, 3);
}

function cafeServiceReady() {
  const installed = cafeInstalledRows();
  return state.cafeArea.unlocked
    && installed.some((row) => row.facilityType === 15)
    && installed.some((row) => row.facilityType === 17);
}

function cafeSeatPositions(tableRow) {
  const p = cafeFacilityPlacement(tableRow);
  return [
    { id: `cafe-${tableRow.id}-left`, tableId: tableRow.id, x: p.x - 42, y: p.y + 2, payX: p.x - 40, payY: p.y + 53 },
    { id: `cafe-${tableRow.id}-right`, tableId: tableRow.id, x: p.x + 42, y: p.y + 2, payX: p.x + 40, payY: p.y + 53 },
  ];
}

function availableCafeSeats() {
  const occupied = new Set(state.cafeGuests
    .filter((guest) => guest.seatId && guest.state !== "leaving")
    .map((guest) => guest.seatId));
  return cafeInstalledRows()
    .filter((row) => row.facilityType === 15)
    .flatMap(cafeSeatPositions)
    .filter((seat) => !occupied.has(seat.id));
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
  return base ? { ...base, id: numericId } : null;
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

function closeInstallPanel() {
  state.ui.selectedInstallId = null;
  dom.installPanel.hidden = true;
  updateCafeInstallTargets();
  render();
}

function openInstallPanel(row) {
  const meta = FACILITY_META[row.facilityType] || FACILITY_META[1];
  const cafePart = Number(row.areaType) === 2;
  const price = cafePart ? cafeThemePartPrice(row) : Number(row.facilityPrice);
  state.ui.selectedInstallId = row.id;
  dom.installIcon.src = cafePart ? cafeThemeFacilityIcon(row) : meta.icon;
  dom.installName.textContent = row.facilityGroup > 1 ? `${meta.name} ${row.facilityGroup}` : meta.name;
  dom.installDescription.textContent = meta.description;
  dom.installCost.textContent = formatNumber(price);
  dom.installConfirm.disabled = state.resources.acorns < price;
  dom.installPanel.hidden = false;
  updateCafeInstallTargets();
}

function confirmInstall() {
  const row = tables.installs.find((item) => item.id === state.ui.selectedInstallId)
    || Object.keys(CAFE_THEME_NAMES).flatMap((themeId) => cafeThemeRows(Number(themeId)))
      .find((item) => item.id === state.ui.selectedInstallId);
  if (Number(row?.areaType) === 2) {
    if (state.cafeThemes.opened.includes(row.id)) return closeInstallPanel();
    if (state.resources.acorns < cafeThemePartPrice(row)) {
      showToast("도토리가 부족해요.");
      return;
    }
    buyCafeTheme(row.id);
    closeInstallPanel();
    return;
  }
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

function markRestaurantGuestForCafe(guest) {
  if (!cafeServiceReady() || random() >= CAFE_CONTINUE_VISIT_CHANCE) return false;
  guest.continueToCafe = true;
  return true;
}

function queueRestaurantGuestForCafe(guest) {
  state.cafeQueue.push({
    sourceRestaurantGuestId: guest.id,
    customerId: guest.customerId,
    commonId: guest.commonId,
    customerName: guest.customerName,
  });
  state.metrics.cafeContinuedVisitors += 1;
  trySpawnCafeQueuedGuests();
}

function spawnCafeGuest(queuedGuest) {
  if (!cafeServiceReady() || !queuedGuest) return false;
  const seat = availableCafeSeats()[0];
  if (!seat) return false;
  const counter = cafeInstalledRows().find((row) => row.facilityType === 17);
  const counterPosition = counter ? cafeFacilityPlacement(counter) : { x: 240, y: 245 };
  const exit = cafeInstalledRows().find((row) => row.facilityType === 21);
  const exitPosition = exit ? cafeFacilityPlacement(exit) : { x: 240, y: 860 };
  state.cafeGuests.push({
    id: state.cafeGuestSequence++,
    sourceRestaurantGuestId: queuedGuest.sourceRestaurantGuestId,
    customerId: queuedGuest.customerId,
    commonId: queuedGuest.commonId,
    customerName: queuedGuest.customerName,
    state: "arriving_counter",
    seatId: seat.id,
    tableId: seat.tableId,
    x: exitPosition.x,
    y: 890,
    targetX: counterPosition.x,
    targetY: counterPosition.y + 55,
    stateTime: 0,
    bob: random() * 10,
    orderKind: state.cakeWorkshop.limitedSale ? "cake" : "drink",
    cakePurchase: null,
  });
  state.cafeVisit.total += 1;
  state.metrics.cafeVisitors += 1;
  if (state.ui.worldArea === "cafe") showToast(`${queuedGuest.customerName || "병아리 손님"}이 카페에 들어왔어요!`);
  return true;
}

function trySpawnCafeQueuedGuests() {
  let changed = false;
  while (state.cafeQueue.length && availableCafeSeats().length) {
    const queuedGuest = state.cafeQueue.shift();
    if (!spawnCafeGuest(queuedGuest)) {
      state.cafeQueue.unshift(queuedGuest);
      break;
    }
    changed = true;
  }
  if (changed) saveState();
}

function addCafePayment(guest, amount) {
  const table = cafeInstalledRows().find((row) => row.id === guest.tableId);
  const seat = table ? cafeSeatPositions(table).find((item) => item.id === guest.seatId) : null;
  state.cafePayments.push({
    id: `cafe-pay-${guest.id}`,
    guestId: guest.id,
    x: seat?.payX ?? guest.x,
    y: seat?.payY ?? guest.y + 48,
    amount,
  });
}

function collectCafePayment(payment) {
  state.resources.acorns += Number(payment.amount || 0);
  state.metrics.cafeCollected += Number(payment.amount || 0);
  state.metrics.collected += Number(payment.amount || 0);
  state.cafePayments = state.cafePayments.filter((item) => item.id !== payment.id);
  showToast(`카페 매출 도토리 ${formatNumber(payment.amount)} 획득!`);
  saveState();
  updateHud();
  render();
}

function updateCafeGuests(dt) {
  trySpawnCafeQueuedGuests();

  for (const guest of state.cafeGuests) {
    guest.bob += dt;
    guest.stateTime += dt;
    if (guest.state === "arriving_counter") {
      if (moveTowards(guest, guest.targetX, guest.targetY, 165, dt)) {
        guest.state = "ordering";
        guest.stateTime = 0;
      }
    } else if (guest.state === "ordering" && guest.stateTime >= CAFE_ORDER_DURATION_SECONDS) {
      const table = cafeInstalledRows().find((row) => row.id === guest.tableId);
      const seat = table ? cafeSeatPositions(table).find((item) => item.id === guest.seatId) : null;
      if (!seat) {
        guest.state = "leaving";
        guest.targetX = 240;
        guest.targetY = 900;
      } else {
        guest.state = "seating";
        guest.targetX = seat.x;
        guest.targetY = seat.y;
        guest.stateTime = 0;
      }
    } else if (guest.state === "seating") {
      if (moveTowards(guest, guest.targetX, guest.targetY, 145, dt)) {
        guest.state = "enjoying";
        guest.stateTime = 0;
        guest.orderKind = state.cakeWorkshop.limitedSale ? "cake" : "drink";
      }
    } else if (guest.state === "enjoying" && guest.stateTime >= GUEST_MEAL_DURATION_SECONDS) {
      const cakeAmount = sellLimitedCake(guest);
      const amount = 25 + cakeAmount;
      addCafePayment(guest, amount);
      state.metrics.cafeServed += 1;
      guest.state = "returning_tray";
      guest.stateTime = 0;
      guest.mood = "satisfied";
      const tray = cafeInstalledRows().find((row) => row.facilityType === 19);
      const trayPosition = tray ? cafeFacilityPlacement(tray) : { x: 240, y: 780 };
      guest.targetX = trayPosition.x;
      guest.targetY = trayPosition.y + 35;
      saveState();
    } else if (guest.state === "returning_tray") {
      if (moveTowards(guest, guest.targetX, guest.targetY, 145, dt)) {
        const exit = cafeInstalledRows().find((row) => row.facilityType === 21);
        const exitPosition = exit ? cafeFacilityPlacement(exit) : { x: 240, y: 850 };
        guest.state = "leaving";
        guest.seatId = null;
        guest.targetX = exitPosition.x;
        guest.targetY = 905;
      }
    } else if (guest.state === "leaving") {
      moveTowards(guest, guest.targetX, guest.targetY, 165, dt);
    }
  }

  const before = state.cafeGuests.length;
  state.cafeGuests = state.cafeGuests.filter((guest) => !(guest.state === "leaving" && guest.y >= 900));
  if (state.cafeGuests.length !== before) {
    trySpawnCafeQueuedGuests();
    saveState();
  }
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
    && isProgressionRouteUnlocked(route)
    && (!owned || owned.level < Number(recipe.maxLevel || 20))
    && craftIngredientRequirements(route).every((requirement) => ingredientAmount(requirement.ingredientId) >= requirement.count));
}

function craftIngredientRequirements(route) {
  const ingredients = route?.ingredientRequirements || [];
  if (!ingredients.length) return [];
  const owned = recipeData(route.recipeId);
  const totalCount = Math.max(Number(route.ingredientCount || 1), ingredients.length) + Number(owned?.level || 0);
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

function craftRecipe(recipeId, automatic = false) {
  const route = progressionForRecipe(recipeId);
  if (!route || !canCraftRecipe(recipeId)) return false;
  const regionsBefore = unlockedRegions().length;
  const existing = recipeData(route.recipeId);
  const ingredientRequirements = craftIngredientRequirements(route);
  for (const requirement of ingredientRequirements) {
    state.crafting.ingredients[requirement.ingredientId] -= requirement.count;
  }
  if (existing) existing.level += 1;
  else state.ownedRecipes[route.recipeId] = { level: 1, stack: 0, codexClaimed: false };
  const level = recipeData(route.recipeId).level;
  state.crafting.history.unshift({ recipeId: route.recipeId, automatic, level, at: Math.round(state.clock) });
  state.crafting.history = state.crafting.history.slice(0, 12);
  state.metrics.recipesCrafted += 1;
  if (existing) dispatchAchievement(9, 1, 103, route.recipeId);
  const newlyUnlockedRegion = unlockedRegions()[regionsBefore];
  showToast(newlyUnlockedRegion
    ? `${routeRecipeName(route.recipeId)} 제작! ${newlyUnlockedRegion.name} 해금!`
    : existing
      ? `${routeRecipeName(route.recipeId)} Lv.${level}! 판매 가격 +5%`
      : `${automatic ? "자동 선택 제작" : "수동 제작"} · ${routeRecipeName(route.recipeId)} 완성!`, 3);
  saveState();
  updateHud();
  if (!dom.menuScreen.hidden && state.ui.screen === "recipe") renderMenu();
  return true;
}

function tryAutoCraft() {
  const route = CORE_PROGRESSION.find((entry) => canCraftRecipe(entry.recipeId));
  return route ? craftRecipe(route.recipeId, true) : false;
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
  const selectedItem = items.length > 1
    ? items[Math.floor(random() * items.length)]
    : items[0];
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

  const multiplier = mood === "satisfied" ? Number(tables.customerSetting.FoodPriceSatisfactionMultiple || 1.5) : 1;
  const owned = recipeData(guest.recipeId) || { level: 1 };
  const performanceBonus = Number(activePerformance()?.abilityValue || 0);
  const themeBonus = Object.values(state.themes.activeByFacility || {}).reduce((sum, id) => {
    const row = tables.restaurantThemes.find((item) => item.id === Number(id));
    return sum + Number(row?.abilityValue || 0);
  }, 0);
  const recipeCollectionBonus = Math.max(0, unlockedRecipeCount() - 1) * .05;
  const upgradedPrice = Number(recipe?.foodPrice || 1)
    * (1 + Math.max(0, owned.level - 1) * .05)
    * (1 + performanceBonus + themeBonus + recipeCollectionBonus);
  const mealPrice = Math.max(1, Math.round(upgradedPrice * multiplier));
  addPayment(guest, mealPrice);
  grantGuestIngredient(guest);
  markRestaurantGuestForCafe(guest);

  const hasTipbox = installedRows(3).length > 0;
  if (hasTipbox && (mood === "satisfied" || random() < Number(common.tipProbability || 0))) {
    state.tipbox += Math.max(1, Math.round(Number(recipe?.foodPrice || 1) * Number(common.tipRatio || 0)));
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
      const recipe = getRecipe(guest.recipeId);
      addPayment(guest, Math.max(1, Math.round(Number(recipe?.foodPrice || 1))));
      grantGuestIngredient(guest);
      markRestaurantGuestForCafe(guest);
      guest.state = "leaving";
      guest.targetX = 240;
      guest.targetY = 900;
      state.metrics.served += 1;
    } else if (guest.state === "leaving") {
      moveTowards(guest, guest.targetX, guest.targetY, guest.mood === "angry" ? 230 : 155, dt);
    }
  }

  state.guests
    .filter((guest) => guest.state === "leaving" && guest.y >= 896 && guest.continueToCafe)
    .forEach(queueRestaurantGuestForCafe);
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
  updateCafeGuests(dt);
  updateSpecialCustomers(dt);
  updateCooking(dt);
  updateStaff(dt);
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

function drawCafeBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, GAME_H);
  gradient.addColorStop(0, "#dce9b5");
  gradient.addColorStop(1, "#8db673");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  ctx.fillStyle = "rgba(87,122,65,.42)";
  for (const [x, y, r] of [[28, 180, 68], [458, 210, 82], [25, 730, 85], [458, 710, 92]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#ecd7a3";
  ctx.strokeStyle = "#8f6c44";
  ctx.lineWidth = 4;
  roundRect(35, 135, 410, 700, 34);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(135,94,53,.16)";
  ctx.lineWidth = 2;
  for (let y = 178; y < 820; y += 44) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(440, y);
    ctx.stroke();
  }
}

function drawCafeLockedScene() {
  const region = cafeRegion();
  const recipeCount = unlockedRecipeCount();
  const expansionAvailable = cafeExpansionAvailable();
  ctx.save();
  ctx.font = "58px 'Segoe UI Emoji', sans-serif";
  ctx.textAlign = "center";
  for (const [x, y] of [[95, 260], [180, 225], [285, 245], [385, 275], [125, 390], [245, 360], [365, 410], [95, 560], [225, 520], [370, 570], [155, 690], [320, 685]]) {
    ctx.fillText("🌲", x, y);
  }
  ctx.fillStyle = "rgba(62,44,27,.82)";
  roundRect(115, 320, 250, 94, 20);
  ctx.fill();
  ctx.fillStyle = "#fff7d4";
  ctx.font = "900 23px sans-serif";
  ctx.fillText("카페 확장 예정지", 240, 357);
  ctx.font = "800 12px sans-serif";
  ctx.fillText(expansionAvailable
    ? "신규 지역 해금 완료 · 나무를 걷어내세요"
    : `레시피 ${recipeCount}/${region?.recipeCount || 3} · 신규 지역을 먼저 해금하세요`, 240, 383);
  ctx.restore();
}

function drawCafeFacility(row) {
  const p = cafeFacilityPlacement(row);
  if (row.facilityType !== 10 && row.facilityType !== 11) drawShadow(p.x, p.y + p.h * .38, p.w * .34, 7);
  if (!drawImage(cafeThemeFacilityIcon(row), p.x, p.y, p.w, p.h)) {
    ctx.fillStyle = "#ae8d65";
    roundRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 13);
    ctx.fill();
  }
  if (row.facilityType === 18) {
    ctx.fillStyle = "rgba(91,55,25,.9)";
    roundRect(p.x - 43, p.y - p.h / 2 - 25, 86, 24, 12);
    ctx.fill();
    ctx.fillStyle = "#fff8dc";
    ctx.textAlign = "center";
    ctx.font = "900 11px sans-serif";
    ctx.fillText("🎂 만들기", p.x, p.y - p.h / 2 - 9);
  }
}

function drawCafeProgress() {
  const themeId = activeCafeThemeId();
  ctx.fillStyle = "rgba(255,249,225,.94)";
  ctx.strokeStyle = "rgba(100,67,34,.62)";
  ctx.lineWidth = 2;
  roundRect(174, 150, 132, 34, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#61401f";
  ctx.textAlign = "center";
  ctx.font = "900 13px sans-serif";
  ctx.fillText(CAFE_THEME_NAMES[themeId], 240, 172);
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
  const p = row.placementOverride || (Number(row.areaType) === 2 ? cafeFacilityPlacement(row) : facilityPlacement(row));
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
  ctx.fillText(formatNumber(row.facilityPrice), p.x + 10, p.y + 43);
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

function drawCafeGuest(guest) {
  const bob = Math.sin(guest.bob * 4) * 2;
  drawShadow(guest.x, guest.y + 25, 18, 5);
  drawImage(guestIcon(guest), guest.x, guest.y + bob, 61, 61);
  if (guest.state === "ordering") {
    drawSpeechBubble(guest.x, guest.y - 55, 52, 46);
    ctx.font = "25px 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(guest.orderKind === "cake" ? "🍰" : "☕", guest.x, guest.y - 48);
  } else if (guest.state === "enjoying") {
    ctx.font = "27px 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(guest.orderKind === "cake" ? "🍰" : "☕", guest.x, guest.y - 39);
  } else if (guest.state === "returning_tray") {
    ctx.font = "22px 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("☕", guest.x, guest.y - 37);
  } else if (guest.mood === "satisfied") {
    ctx.fillStyle = "#d94b4b";
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

function drawPayments() {
  for (const payment of state.payments) {
    const visible = Math.min(4, payment.models);
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
}

function drawCafePayments() {
  for (const payment of state.cafePayments) {
    drawImage("assets/ui/currency/icon_currency_001.png", payment.x, payment.y, 38, 38);
    ctx.fillStyle = "rgba(57,39,20,.88)";
    roundRect(payment.x - 31, payment.y + 17, 62, 22, 11);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "900 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(formatNumber(payment.amount), payment.x, payment.y + 32);
  }
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
  if (area === "cafe") {
    drawBackground();
    if (!state.cafeArea.unlocked) {
      drawCafeLockedScene();
      return;
    }
    drawCafeProgress();
    cafeInstalledRows().sort((a, b) => cafeFacilityPlacement(a).y - cafeFacilityPlacement(b).y).forEach(drawCafeFacility);
    [...state.cafeGuests].sort((a, b) => a.y - b.y).forEach(drawCafeGuest);
    drawCafePayments();
    return;
  }
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
  drawWorldArea(state.ui.worldArea);
}

function currentObjective() {
  if (state.ui.worldArea === "cafe" && !state.cafeArea.unlocked) {
    const region = cafeRegion();
    return cafeExpansionAvailable()
      ? "카페 구역 확장하기"
      : `레시피 ${unlockedRecipeCount()}/${region?.recipeCount || 3}개 해금하기`;
  }
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
  const cafeWorld = state.ui.worldArea === "cafe";
  dom.acorns.textContent = formatNumber(state.resources.acorns);
  dom.ideas.textContent = formatNumber(state.resources.ideas);
  dom.gems.textContent = formatNumber(state.resources.gems);
  dom.promoButton.hidden = cafeWorld;
  dom.promoButton.disabled = cafeWorld || !coreReady();
  dom.missionDot.hidden = !hasMissionReward();
  dom.recipeDot.hidden = cafeWorld || (!CORE_PROGRESSION.some((route) => canCraftRecipe(route.recipeId))
    && !Object.values(state.ownedRecipes).some((owned) => !owned.codexClaimed || owned.stack > 0));
  dom.collectionDot.hidden = !Object.values(state.collections).some((dict) => Object.values(dict).some((entry) => entry.isNew));
  dom.recipeNavLabel.textContent = cafeWorld ? "케이크" : "레시피";
  dom.themeNavLabel.textContent = cafeWorld ? "카페 테마" : "테마";
  const region = cafeRegion();
  const recipeCount = unlockedRecipeCount();
  const expansionAvailable = cafeExpansionAvailable();
  dom.worldAreaButtons.forEach((button) => {
    const targetArea = button.dataset.worldArea;
    button.hidden = targetArea === state.ui.worldArea;
    if (button.dataset.worldArea === "cafe") {
      button.disabled = !state.cafeArea.unlocked && !expansionAvailable;
      button.title = button.disabled
        ? `레스토랑 레시피 ${recipeCount}/${region?.recipeCount || 3} 발견`
        : "";
    }
  });
  dom.worldAreaName.textContent = cafeWorld ? "카페" : "레스토랑";
  dom.cafeLockBadge.textContent = state.cafeArea.unlocked
    ? ""
    : expansionAvailable ? "확장" : `${recipeCount}/${region?.recipeCount || 3}`;
  dom.cafeExpandButton.hidden = !cafeWorld || state.cafeArea.unlocked;
  dom.cafeExpandButton.disabled = !expansionAvailable;
  dom.cakeWorkshopButton.hidden = !cafeWorld || !state.cafeArea.unlocked || !cafeBakingFacilityInstalled();
  updateCafeInstallTargets();
}

function updateCafeInstallTargets() {
  if (state.ui.worldArea !== "cafe" || !state.cafeArea.unlocked || state.ui.selectedInstallId) {
    if (cafeInstallTargetSignature) dom.cafeInstallTargets.innerHTML = "";
    cafeInstallTargetSignature = "";
    dom.cafeInstallTargets.hidden = true;
    return;
  }
  const rows = cafeInstallCandidates();
  const nextSignature = `${activeCafeThemeId()}:${rows.map((row) => row.id).join(",")}`;
  if (cafeInstallTargetSignature === nextSignature && !dom.cafeInstallTargets.hidden) return;
  cafeInstallTargetSignature = nextSignature;
  dom.cafeInstallTargets.hidden = false;
  dom.cafeInstallTargets.innerHTML = rows.map((row) => {
    const p = cafeFacilityPlacement(row);
    const meta = FACILITY_META[row.facilityType] || FACILITY_META[15];
    return `<button type="button" data-cafe-install="${row.id}" aria-label="${meta.name}${row.facilityGroup > 1 ? ` ${row.facilityGroup}` : ""} 설치 · 도토리 ${cafeThemePartPrice(row)}" style="left:${(p.x / GAME_W) * 100}%;top:${(p.y / GAME_H) * 100}%"><span>+</span><small>🌰 ${cafeThemePartPrice(row)}</small></button>`;
  }).join("");
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

  if (state.ui.worldArea === "cafe") {
    if (!state.cafeArea.unlocked) return;
    const payment = state.cafePayments.find((item) => Math.hypot(point.x - item.x, point.y - item.y) <= 42);
    if (payment) return collectCafePayment(payment);
    const bakingFacility = cafeInstalledRows().find((row) =>
      row.facilityType === 18 && insideBox(point, cafeFacilityPlacement(row), 14));
    if (bakingFacility) return openMenu("cake");
    const candidate = cafeInstallCandidates().find((row) => insideBox(point, cafeFacilityPlacement(row), 10));
    if (candidate) openInstallPanel(candidate);
    render();
    return;
  }

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

  const candidate = installCandidates().find((row) => insideBox(point, facilityPlacement(row), 8));
  if (candidate) openInstallPanel(candidate);
  render();
}

function setActiveNav(screen) {
  dom.navButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.screen === screen));
}

function closeMenu() {
  state.ui.screen = "restaurant";
  dom.menuScreen.hidden = true;
  setActiveNav("");
  saveState();
}

function setWorldArea(area) {
  if (!["restaurant", "cafe"].includes(area)) return;
  if (area === "cafe" && !state.cafeArea.unlocked && !cafeExpansionAvailable()) {
    const region = cafeRegion();
    const remaining = Math.max(0, Number(region?.recipeCount || 3) - unlockedRecipeCount());
    showToast(`레스토랑 레시피를 ${remaining}개 더 발견하면 카페 확장이 열려요.`);
    return;
  }
  state.ui.worldArea = area;
  state.ui.themeArea = area;
  state.ui.screen = "restaurant";
  state.ui.selectedInstallId = null;
  dom.menuScreen.hidden = true;
  dom.installPanel.hidden = true;
  setActiveNav("");
  saveState();
  updateHud();
  render();
}

function expandCafeArea() {
  if (state.cafeArea.unlocked) return;
  const region = cafeRegion();
  if (!cafeExpansionAvailable()) {
    const remaining = Math.max(0, Number(region?.recipeCount || 3) - unlockedRecipeCount());
    return showToast(`레스토랑 레시피를 ${remaining}개 더 발견하면 카페 지역을 확장할 수 있어요.`);
  }
  const expansion = tables.areaExpansions.find((row) => Number(row.id) === 2);
  const price = Number(expansion?.areaPrice || 0);
  if (state.resources.acorns < price) return showToast("카페 확장에 필요한 도토리가 부족해요.");
  state.resources.acorns -= price;
  state.cafeArea.unlocked = true;
  state.cafeArea.expansionConfirmed = true;
  state.cafeThemes.activeThemeId = 101;
  state.ui.cafeThemeId = 101;
  showToast("신규 지역 해금 보상으로 카페 구역이 열렸습니다!");
  saveState();
  updateHud();
  render();
}

function openMenu(screen) {
  const resolvedScreen = screen === "recipe" && state.ui.worldArea === "cafe" ? "cake" : screen;
  if (screen === "theme") state.ui.themeArea = state.ui.worldArea;
  state.ui.screen = resolvedScreen;
  state.ui.tab = resolvedScreen === "recipe" ? "craft" : resolvedScreen === "missions" ? "main" : resolvedScreen === "collection" ? "customers" : resolvedScreen;
  dom.menuScreen.hidden = false;
  setActiveNav(resolvedScreen === "cake" ? "recipe" : screen);
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
  const currentPrice = owned ? Math.round(Number(recipe.foodPrice) * (1 + Math.max(0, owned.level - 1) * .05)) : Number(recipe.foodPrice);
  return `<article class="feature-card ${locked ? "is-locked" : ""}">
    <img class="feature-icon" src="${routeRecipeIcon(recipe.id)}" alt="" />
    <div class="feature-copy"><strong>${locked ? "???" : routeRecipeName(recipe.id)}</strong>
    <small class="grade">${grade} · ${locked ? "미획득" : `Lv.${owned.level}/${recipe.maxLevel}`}</small>
    <small>${locked ? "병아리가 준 아이템으로 제작할 수 있어요" : `중복 제작 시 Lv.UP · 현재 가격 ${formatNumber(currentPrice)}`}</small></div>${action}</article>`;
}

function craftingRouteCard(route) {
  const routeUnlocked = isProgressionRouteUnlocked(route);
  const owned = recipeData(route.recipeId);
  const recipe = getRecipe(route.recipeId);
  const requirements = craftIngredientRequirements(route);
  const requirementText = requirements.map((requirement) => `${requirement.emoji} ${requirement.name} ${ingredientAmount(requirement.ingredientId)}/${requirement.count}`).join(" + ");
  const canCraft = canCraftRecipe(route.recipeId);
  return `<article class="feature-card crafting-card ${routeUnlocked ? "" : "is-locked"}">
    <div class="craft-chain" aria-hidden="true"><img src="${guestIcon({ customerId: route.customerId, commonId: route.commonId })}" alt=""/><span>${requirements.map((requirement) => requirement.emoji).join("+")}</span><b>→</b><img src="${routeRecipeIcon(route.recipeId)}" alt=""/></div>
    <div class="feature-copy"><strong>${routeUnlocked ? routeRecipeName(route.recipeId) : "새 테마에서 발견"}</strong>
    <small>${THEME_NAMES[route.themeId]} · ${route.customerName}</small>
    <small>${requirementText} · ${owned ? `현재 Lv.${owned.level} · 총 ${craftIngredientCost(route)}개` : `${requirements.length}종 조합`}</small></div>
    <button class="card-action" data-action="craft-recipe" data-id="${route.recipeId}" ${canCraft ? "" : "disabled"}>${owned ? owned.level >= Number(recipe?.maxLevel || 20) ? "최고 레벨" : `Lv.${owned.level + 1} 제작` : routeUnlocked ? "수동 제작" : "병아리 필요"}</button></article>`;
}

function renderRecipeMenu() {
  dom.menuKicker.textContent = "아이템 주방";
  dom.menuTitle.textContent = "레시피";
  renderTabs([["craft", "아이템 제작"], ["owned", `보유 ${unlockedRecipeCount()}`], ["regions", "지역 해금"]]);
  if (state.ui.tab === "craft") {
    const visibleRoutes = CORE_PROGRESSION.filter(isProgressionRouteUnlocked);
    const visibleIngredients = [...new Map(visibleRoutes.flatMap((route) => route.ingredientRequirements).map((ingredient) => [ingredient.id, ingredient])).values()];
    dom.menuContent.innerHTML = `<section class="research-box"><h3>병아리 아이템으로 레시피 만들기</h3>
      <p>초반 음식은 재료 1종, 중반은 2종, 후반은 3종을 조합합니다. 같은 레시피를 다시 만들면 레벨과 판매 가격이 5%씩 오르고, 다음 제작의 총 재료 수도 1개씩 늘어납니다.</p>
      <div class="ingredient-strip">${visibleIngredients.map((ingredient) => `<span>${ingredient.emoji}<b>${ingredient.name}</b> ${ingredientAmount(ingredient.id)}</span>`).join("")}</div>
      <button class="research-button" data-action="auto-craft">남은 재료로 자동 선택 제작</button></section>
      ${visibleRoutes.map(craftingRouteCard).join("")}`;
  } else if (state.ui.tab === "owned") {
    const owned = Object.keys(state.ownedRecipes).map((id) => getRecipe(Number(id))).filter(Boolean);
    dom.menuContent.innerHTML = `<p class="section-note">해금 레시피 ${owned.length}개 · 레시피 1개가 늘 때마다 전체 음식 수익이 5% 증가합니다.</p>${owned.map(recipeCard).join("")}`;
  } else {
    const count = unlockedRecipeCount();
    dom.menuContent.innerHTML = `<p class="section-note">레시피를 3개 해금하면 카페 지역 확장 권한이 열립니다. 달성 후 상단의 카페 화면에서 무료로 확장할 수 있습니다.</p>
      ${REGION_UNLOCKS.map((region) => { const opened = count >= region.recipeCount; return `<article class="feature-card ${opened ? "" : "is-locked"}"><div class="feature-icon region-icon"><img class="region-frame" src="assets/ui/common/bg_frame_expansion_01.png" alt="" /><img class="region-status" src="assets/ui/common/${opened ? "icon_check" : "icon_lock"}.png" alt="" /></div><div class="feature-copy"><strong>${region.name}</strong><small>필요 레시피 ${region.recipeCount}개</small><div class="progress-track"><span style="width:${Math.min(100, count / region.recipeCount * 100)}%"></span></div><small>${count}/${region.recipeCount}${opened ? " · 카페 확장 가능" : ""}</small></div></article>`; }).join("")}`;
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
      : chick.themeId === 1 ? "설비 전체 설치"
        : `테마 파츠 ${Math.round(chick.threshold * 100)}%`,
    available: allUnlockedThemeChicks().some((unlocked) => unlocked.customerId === chick.customerId),
  }));
  if (category === "specialCustomers") rows = tables.specialCustomers.map((item) => ({ id: item.id, name: item.specialCustomerType === 1 ? "도둑" : "투자자", icon: "assets/ui/chick/icon_chick_007.png" }));
  if (category === "performers") rows = tables.performances.map((item) => ({ id: item.id, name: `공연팀 ${item.id}`, icon: "assets/ui/chick/icon_chick_006.png" }));
  dom.menuContent.innerHTML = `<p class="section-note">${category === "customers" ? "테마에서 등장 조건을 달성한 병아리의 외형·선물 재료·연결 레시피를 확인합니다." : "처음 만난 대상은 NEW로 기록되며, 방문·공연 횟수가 누적됩니다."}</p><div class="collection-grid ${category === "customers" ? "customer-detail-grid" : ""}">${rows.map((item) => {
    const entry = dict[item.id];
    const known = category === "customers" ? item.available || Boolean(entry) : Boolean(entry);
    const grade = entry && category === "customers" ? guestGradeForVisits(entry.count) : null;
    const nextGrade = entry && category === "customers" ? nextGuestGradeForVisits(entry.count) : null;
    const rewardText = known && category === "customers"
      ? (item.rewardIngredients || []).map((ingredient, index) => {
        const countKey = index === 0 ? "primaryCount" : index === 1 ? "secondaryCount" : "rareCount";
        const stages = GUEST_GRADES
          .filter((stage, stageIndex) => Number(stage[countKey] || 0) > 0
            && (stageIndex === 0 || Number(GUEST_GRADES[stageIndex - 1][countKey] || 0) !== Number(stage[countKey] || 0)))
          .map((stage) => `${stage.minVisits}회×${stage[countKey]}`)
          .join("→");
        return `${index === 0 ? "주" : index === 1 ? "보조" : "희귀"} ${ingredient.emoji} ${ingredient.name}(${stages})`;
      }).join(" · ")
      : "";
    const progressText = grade
      ? `${grade.name} · ${entry.count}회${nextGrade ? ` / 다음 ${nextGrade.minVisits}회` : " · 최고 등급"}`
      : entry ? `${entry.count}회 만남` : known ? "등장 가능 · 아직 방문 전" : "미등록";
    const customerDetails = known && category === "customers"
      ? `<small class="collection-source">${item.themeName} · ${item.unlockLabel}</small>
        <small class="collection-reward">선물 · ${rewardText}</small>
        <small class="collection-recipe">연결 레시피 · ${item.recipeName}</small>`
      : "";
    return `<div class="collection-cell ${known ? "" : "locked"}">${entry?.isNew ? `<span class="new-badge">NEW</span>` : ""}<img src="${item.icon}" alt="" /><strong>${known ? item.name : "???"}</strong><small>${progressText}</small>${customerDetails}</div>`;
  }).join("")}</div>`;
  saveState();
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
  dom.menuContent.innerHTML = `<p class="section-note">보유 스티커 ${state.resources.stickers} · 매일 보유량이 ${Number(tables.general.StaffStickerDaily || 5)}개가 되도록 충전됩니다.</p>${cards}`;
}

function renderPerformanceManagement() {
  const current = activePerformance();
  const stageReady = installedRows(5).length > 0;
  dom.menuContent.innerHTML = `<section class="research-box"><h3>${current ? `공연팀 ${current.id} 공연 중` : "공연 무대"}</h3>
    <p>${!stageReady ? "무대 시설을 먼저 설치해 주세요." : current ? `식당 가격 +${Math.round(current.abilityValue * 100)}% · ${Math.ceil(state.performance.remaining)}초 남음` : `다음 공연까지 ${Math.ceil(state.performance.cooldown)}초`}<br>공연 시작 시 할 일과 공연팀 도감이 함께 갱신됩니다.</p>
    <button class="research-button" data-action="start-performance" ${stageReady && !current && state.performance.cooldown <= 0 ? "" : "disabled"}>공연 시작</button></section>
    ${tables.performances.map((row) => `<article class="feature-card ${state.collections.performers[row.id] ? "" : "is-locked"}"><img class="feature-icon" src="assets/ui/performance/icon_performance_${String(row.id).padStart(3, "0")}.png" alt="" /><div class="feature-copy"><strong>${state.collections.performers[row.id] ? `공연팀 ${row.id}` : "???"}</strong><small>가격 +${Math.round(row.abilityValue * 100)}% · ${row.performanceTime}초</small><small>${row.price ? `공연료 도토리 ${row.price}` : "무료 공연"}</small></div></article>`).join("")}`;
}

function themeAreaSwitchHtml() {
  const area = state.ui.themeArea === "cafe" ? "cafe" : "restaurant";
  return `<div class="theme-area-switch" aria-label="테마 구역 선택">
    <button type="button" data-action="theme-area" data-area="restaurant" class="${area === "restaurant" ? "is-active" : ""}">레스토랑 테마</button>
    <button type="button" data-action="theme-area" data-area="cafe" class="${area === "cafe" ? "is-active" : ""}">카페 테마</button>
  </div>`;
}

function renderCafeThemeManagement() {
  const themeIds = Object.keys(CAFE_THEME_NAMES).map(Number);
  const selectedTheme = themeIds.includes(Number(state.ui.cafeThemeId))
    ? Number(state.ui.cafeThemeId)
    : themeIds[0];
  state.ui.cafeThemeId = selectedTheme;
  state.cafeThemes.activeThemeId = selectedTheme;
  const rows = cafeThemeRows(selectedTheme);
  const progress = cafeThemeProgress(selectedTheme);
  const rewards = CAFE_THEME_CAKE_REWARDS[selectedTheme] || [];
  const ingredientIds = new Set(state.cafeThemes.cakeIngredients);
  const ownedIngredients = state.cafeThemes.cakeIngredients.map(cakeIngredientData).filter(Boolean);
  const typeNames = { sheet: "시트", cream: "크림", topping: "토핑" };
  const rewardCards = rewards.map((reward, index) => {
    const unlocked = ingredientIds.has(reward.id);
    const requiredCount = Math.ceil(progress.total * CAFE_CAKE_MILESTONES[index]);
    return `<div class="cake-reward-chip ${unlocked ? "is-unlocked" : "is-locked"}">
      <span>${reward.emoji}</span><div><b>${Math.round(CAFE_CAKE_MILESTONES[index] * 100)}% · ${typeNames[reward.type]}</b>
      <small>${unlocked ? reward.name : `${requiredCount}개 보유 시 해금`}</small></div>
    </div>`;
  }).join("");
  const inventory = ownedIngredients.map((ingredient) =>
    `<span class="cake-ingredient-chip"><i>${ingredient.emoji}</i><b>${ingredient.name}</b><small>${typeNames[ingredient.type]}</small></span>`).join("");

  dom.menuContent.innerHTML = `<div class="theme-tabs" aria-label="카페 테마 선택">${themeIds.map((themeId) => {
    const representative = cafeThemeRows(themeId).find((row) => row.facilityType === 15) || cafeThemeRows(themeId)[0];
    return `<button type="button" data-action="theme-select" data-id="${themeId}" class="${themeId === selectedTheme ? "is-active" : ""}"><img src="${cafeThemeFacilityIcon(representative)}" alt=""/><span>${CAFE_THEME_NAMES[themeId]}</span></button>`;
  }).join("")}</div>
    <section class="theme-summary"><div><strong>${CAFE_THEME_NAMES[selectedTheme]}</strong>
      <span>파츠 보유 ${progress.opened}/${progress.total} · 케이크 재료 ${ownedIngredients.length}종</span>
      <small>30% 시트 · 70% 크림 · 100% 시그니처 토핑을 영구 획득합니다.</small></div></section>
    <div class="cake-reward-milestones">${rewardCards}</div>
    <section class="cake-inventory"><h3>보유 케이크 재료</h3><div>${inventory}</div></section>
    <p class="section-note">해금한 재료는 다른 테마와 자유롭게 조합할 수 있습니다. 카페에 케이크 진열대를 설치한 뒤 설비를 누르면 제작을 시작합니다.</p>
    ${rows.map((row) => {
    const opened = state.cafeThemes.opened.includes(row.id);
    const price = cafeThemePartPrice(row);
    const canBuy = state.cafeArea.unlocked && !opened && state.resources.acorns >= price;
    let label = `${formatNumber(price)} 구매`;
    if (!state.cafeArea.unlocked) label = "카페 확장 필요";
    if (opened) label = "보유 중";
    return `<article class="feature-card ${state.cafeArea.unlocked ? "" : "is-locked"}"><img class="feature-icon" src="${cafeThemeFacilityIcon(row)}" alt=""/>
      <div class="feature-copy"><strong>${FACILITY_META[row.facilityType]?.name || `설비 ${row.facilityType}`}</strong>
      <small>${CAFE_THEME_NAMES[selectedTheme]} 파츠${row.facilityGroup > 1 ? ` ${row.facilityGroup}` : ""}</small><small>${opened ? "보유 중" : `테스트 가격 · 도토리 ${formatNumber(price)}`}</small></div>
      <button class="card-action" data-action="buy-cafe-theme" data-id="${row.id}" ${canBuy ? "" : "disabled"}>${label}</button></article>`;
  }).join("")}`;
  requestAnimationFrame(() => {
    const tabs = dom.menuContent.querySelector(".theme-tabs");
    const selected = tabs?.querySelector(`[data-id="${selectedTheme}"]`);
    if (tabs && selected) tabs.scrollLeft = Math.max(0, selected.offsetLeft - (tabs.clientWidth - selected.clientWidth) / 2);
  });
}

function renderThemeManagement() {
  if (state.ui.worldArea === "cafe") return renderCafeThemeManagement();
  const themeIds = [...new Set(tables.restaurantThemes.map((row) => row.facilityTheme))].sort((a, b) => a - b);
  const selectedTheme = themeIds.includes(Number(state.ui.themeId)) ? Number(state.ui.themeId) : themeIds[0];
  state.ui.themeId = selectedTheme;
  const rows = tables.restaurantThemes.filter((row) => row.facilityTheme === selectedTheme);
  const openedCount = rows.filter((row) => state.themes.opened.includes(row.id)).length;
  const applicableCount = rows.filter((row) => state.themes.opened.includes(row.id)
    && isThemeFacilityAvailable(row.facilityType)
    && state.themes.activeByFacility[row.facilityType] !== row.id).length;
  const totalBonus = state.themes.opened.reduce((sum, id) => {
    const row = tables.restaurantThemes.find((item) => item.id === Number(id));
    return sum + Number(row?.abilityValue || 0);
  }, 0);
  const milestones = themeChickMilestones(selectedTheme);
  const unlockedChicks = unlockedThemeChicks(selectedTheme);
  const progress = themeChickProgress(selectedTheme);
  const milestoneCards = (selectedTheme === 1 ? [milestones[0], milestones[2]] : milestones).map((chick) => {
    const requiredCount = Math.ceil(progress.total * chick.threshold);
    const unlocked = unlockedChicks.some((item) => item.customerId === chick.customerId);
    const milestoneLabel = selectedTheme === 1 && chick.slot === 0 ? "기본" : `${Math.round(chick.threshold * 100)}%`;
    const lockedLabel = selectedTheme === 1 ? `${requiredCount}개 설비 설치 시 등장` : `${requiredCount}개 보유 시 등장`;
    return `<div class="theme-chick-chip ${unlocked ? "is-unlocked" : "is-locked"}"><span class="theme-chick-mystery" aria-hidden="true">${unlocked ? "🐣" : "?"}</span><div><b>${milestoneLabel}</b><small>${unlocked ? "새로운 병아리 등장 완료" : "새로운 병아리 등장"}</small><em>${unlocked ? "상세 정보는 도감에서 확인" : lockedLabel}</em></div></div>`;
  }).join("");

  dom.menuContent.innerHTML = `<div class="theme-tabs" aria-label="테마 선택">${themeIds.map((themeId) => {
    const representative = tables.restaurantThemes.find((row) => row.facilityTheme === themeId && row.facilityType === 1)
      || tables.restaurantThemes.find((row) => row.facilityTheme === themeId);
    return `<button type="button" data-action="theme-select" data-id="${themeId}" class="${themeId === selectedTheme ? "is-active" : ""}"><img src="${themeFacilityIcon(representative)}" alt=""/><span>${THEME_NAMES[themeId] || `테마 ${themeId}`}</span></button>`;
  }).join("")}</div>
    <section class="theme-summary"><div><strong>${THEME_NAMES[selectedTheme] || `테마 ${selectedTheme}`}</strong><span>${selectedTheme === 1 ? `설비 설치 ${progress.opened}/${progress.total}` : `보유 ${openedCount}/${rows.length}`} · 누적 식당 수익 +${Math.round(totalBonus * 100)}%</span><small>${selectedTheme === 1 ? "설비를 모두 설치하면 새로운 병아리가 등장합니다." : "파츠 보유율 30% · 70% · 100%에서 새로운 병아리가 등장합니다."}</small></div><button class="card-action" data-action="apply-theme-all" data-id="${selectedTheme}" ${applicableCount ? "" : "disabled"}>보유 파츠 전체 적용</button></section>
    <div class="theme-chick-milestones">${milestoneCards}</div>
    <p class="section-note">유니티와 동일하게 선택한 테마의 설비 파츠를 종류별로 구매하고 적용합니다. 아직 설치하지 않은 설비 파츠는 잠겨 있습니다.</p>
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
    return `<article class="feature-card ${available ? "" : "is-locked"}"><img class="feature-icon" src="${themeFacilityIcon(row)}" alt=""/><div class="feature-copy"><strong>${FACILITY_META[row.facilityType]?.name || `설비 ${row.facilityType}`}</strong><small>${THEME_NAMES[selectedTheme]} 파츠</small><small>식당 수익 +${Math.round(row.abilityValue * 100)}% · ${opened ? "보유 중" : available ? RESOURCE_NAMES[row.itemId] || "재화" : "미설치"}</small></div><button class="card-action" data-action="${action}" data-id="${row.id}" ${disabled ? "disabled" : ""}>${label}</button></article>`;
  }).join("")}`;
  requestAnimationFrame(() => {
    const tabs = dom.menuContent.querySelector(".theme-tabs");
    const selected = tabs?.querySelector(`[data-id="${selectedTheme}"]`);
    if (tabs && selected) tabs.scrollLeft = Math.max(0, selected.offsetLeft - (tabs.clientWidth - selected.clientWidth) / 2);
  });
}

function cakeIngredientSelector(type, title, selectedId) {
  return `<section class="cake-part-group"><div class="cake-part-heading"><strong>${title}</strong><small>${unlockedCakeIngredients(type).length}종 해금</small></div>
    <div class="cake-part-options">${unlockedCakeIngredients(type).map((ingredient) =>
    `<button type="button" data-action="select-cake-part" data-kind="${type}" data-part-id="${ingredient.id}" class="${ingredient.id === selectedId ? "is-active" : ""}">
      <i>${ingredient.emoji}</i><span>${ingredient.name}</span></button>`).join("")}</div></section>`;
}

function cakePreviewColors() {
  const sheet = {
    cake_sheet_basic: "#efbd6d",
    cake_sheet_walnut: "#a96840",
    cake_sheet_vanilla: "#f3d490",
  }[state.cakeWorkshop.selectedSheet] || "#d39b63";
  const cream = {
    cake_cream_fresh: "#fff7e8",
    cake_cream_maple: "#eeb95e",
    cake_cream_espresso: "#77513b",
  }[state.cakeWorkshop.selectedCream] || "#f4d6af";
  return { sheet, cream };
}

function renderCakeWorkshop() {
  ensureCakeDailyReset();
  dom.menuKicker.textContent = "카페 레시피";
  dom.menuTitle.textContent = "수제 케이크";
  dom.menuTabs.innerHTML = "";
  const workshop = state.cakeWorkshop;
  const codex = CAKE_RECIPES.map((item) => {
    const discovered = workshop.discoveredRecipeIds.includes(item.id);
    const combination = discovered
      ? [item.sheetId, item.creamId, item.toppingId].map(cakeIngredientData).filter(Boolean)
        .map((ingredient) => `<span>${ingredient.emoji} ${ingredient.name}</span>`).join("")
      : `<span>시트 ???</span><span>크림 ???</span><span>토핑 ???</span>`;
    return `<article class="cake-codex-card ${discovered ? "" : "is-locked"}"><b>${discovered ? "🎂" : "?"}</b><div><strong>${discovered ? item.name : "아직 모르는 조합"}</strong><small>${combination}</small></div></article>`;
  }).join("");
  if (!cafeBakingFacilityInstalled()) {
    dom.menuContent.innerHTML = `<section class="cake-workshop-lock"><span>🎂</span><strong>케이크 진열대를 먼저 설치해 주세요</strong>
      <p>케이크는 카페의 <b>케이크 진열대</b>에서 만듭니다.<br>카페 테마에서 진열대 파츠를 구매하면 이 화면에 제작대가 열립니다.</p>
      <button type="button" data-action="go-cafe-theme">카페 테마에서 진열대 찾기</button></section>
      <section class="cake-codex"><div class="cake-part-heading"><strong>카페 케이크 레시피</strong><small>${workshop.discoveredRecipeIds.length}/${CAKE_RECIPES.length}</small></div>${codex}</section>`;
    return;
  }
  const sheet = cakeIngredientData(workshop.selectedSheet);
  const cream = cakeIngredientData(workshop.selectedCream);
  const topping = cakeIngredientData(workshop.selectedTopping);
  const recipe = selectedCakeRecipe();
  const recipeKnown = recipe && workshop.discoveredRecipeIds.includes(recipe.id);
  const colors = cakePreviewColors();
  const toppingHtml = workshop.toppingPlacements.map((placement, index) =>
    `<span class="placed-cake-topping" style="left:${placement.x * 100}%;top:${placement.y * 100}%;transform:translate(-50%,-50%) rotate(${placement.rotation}deg)" aria-hidden="true">${topping?.emoji || "🍓"}<small>${index + 1}</small></span>`).join("");
  const result = workshop.lastResult
    ? `<section class="cake-result ${workshop.lastResult.comboBonus ? "is-combo" : ""}">
      <span>${workshop.lastResult.newlyDiscovered ? "✨ 신규 레시피 발견" : workshop.lastResult.comboBonus ? "레시피 조합 완성" : "커스텀 케이크 완성"}</span>
      <strong>${workshop.lastResult.name}</strong>
      <small>조각당 🌰 ${formatNumber(workshop.lastResult.unitPrice)} · ${workshop.lastResult.saleCount}조각 한정 판매</small>
    </section>`
    : "";
  const sale = workshop.limitedSale
    ? `<section class="cake-sale-status"><span>진열 중</span><div><strong>${workshop.limitedSale.name}</strong><small>남은 수량 ${workshop.limitedSale.remaining}조각 · 손님이 식사 후 우선 구매</small></div><b>🌰 ${formatNumber(workshop.limitedSale.unitPrice)}</b></section>`
    : "";
  const craftButtons = workshop.freeCraftsUsed < 1
    ? `<button class="cake-finish-button" data-action="finish-cake" data-currency="free">오늘의 무료 제작으로 완성하기</button>`
    : `<div class="cake-paid-actions">
      <button class="cake-finish-button" data-action="finish-cake" data-currency="ideas" ${state.resources.ideas >= CAKE_SECOND_CRAFT_IDEA_COST ? "" : "disabled"}>💡 ${CAKE_SECOND_CRAFT_IDEA_COST}로 완성</button>
      <button class="cake-finish-button secondary" data-action="finish-cake" data-currency="gems" ${state.resources.gems >= CAKE_SECOND_CRAFT_GEM_COST ? "" : "disabled"}>💎 ${CAKE_SECOND_CRAFT_GEM_COST}로 완성</button>
    </div>`;
  dom.menuContent.innerHTML = `<p class="section-note cake-intro">테마 파츠 보유율로 해금한 재료를 고르고 케이크를 꾸며 주세요. 맛 조합은 시트·크림·대표 토핑으로 판정하며, 배치와 개수는 자유입니다.</p>
    ${sale}${result}
    ${cakeIngredientSelector("sheet", "1. 시트 맛", workshop.selectedSheet)}
    ${cakeIngredientSelector("cream", "2. 크림 맛", workshop.selectedCream)}
    ${cakeIngredientSelector("topping", "3. 대표 토핑", workshop.selectedTopping)}
    <section class="cake-decoration">
      <div class="cake-decoration-heading"><div><strong>4. 토핑 꾸미기</strong><small>케이크 위를 눌러 ${topping?.name || "토핑"}을 놓으세요.</small></div>
        <div><button type="button" data-action="undo-cake-topping" ${workshop.toppingPlacements.length ? "" : "disabled"}>하나 취소</button><button type="button" data-action="clear-cake-toppings" ${workshop.toppingPlacements.length ? "" : "disabled"}>초기화</button></div></div>
      <button type="button" class="cake-preview" data-action="place-cake-topping" aria-label="토핑 놓기" style="--cake-sheet:${colors.sheet};--cake-cream:${colors.cream}">
        <span class="cake-layer cake-layer-bottom"></span><span class="cake-layer cake-layer-middle"></span><span class="cake-layer cake-layer-top"></span>
        ${toppingHtml}
      </button>
      <div class="cake-combination"><span>${sheet?.emoji} ${sheet?.name}</span><b>+</b><span>${cream?.emoji} ${cream?.name}</span><b>+</b><span>${topping?.emoji} ${topping?.name}</span></div>
      <p>${recipeKnown ? `등록 조합 · <strong>${recipe.name}</strong> · 수익 보너스 적용` : recipe ? "아직 발견하지 않은 조합입니다." : "등록되지 않은 조합도 커스텀 케이크로 완성할 수 있습니다."}</p>
      ${craftButtons}
    </section>
    <section class="cake-codex"><div class="cake-part-heading"><strong>발견한 케이크 레시피</strong><small>${workshop.discoveredRecipeIds.length}/${CAKE_RECIPES.length}</small></div>${codex}</section>`;
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
  } else if (state.ui.screen === "cake") {
    renderCakeWorkshop();
  }
}

function resetGame() {
  if (!window.confirm("현재 진행을 지우고 처음부터 다시 시작할까요?")) return;
  localStorage.removeItem(SAVE_KEY);
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
  const cafeMode = state.ui.worldArea === "cafe";
  const candidateRows = cafeMode
    ? state.cafeArea.unlocked ? cafeInstallCandidates() : []
    : installCandidates();
  const candidates = candidateRows.map((row) => ({
    id: row.id,
    name: FACILITY_META[row.facilityType]?.name,
    cost: cafeMode ? cafeThemePartPrice(row) : row.facilityPrice,
    ...(cafeMode ? cafeFacilityPlacement(row) : facilityPlacement(row)),
  }));
  return JSON.stringify({
    coordinateSystem: "canvas 480x900; origin top-left; x right; y down",
    mode: cafeMode ? "cafe" : "restaurant",
    worldNavigation: {
      areas: ["restaurant", "cafe"],
      current: cafeMode ? "cafe" : "restaurant",
      previous: cafeMode ? "restaurant" : null,
      next: cafeMode ? null : "cafe",
      methods: ["edge-arrow"],
      cafeAccessible: state.cafeArea.unlocked || cafeExpansionAvailable(),
    },
    menuContext: cafeMode ? "cafe" : "restaurant",
    visibleRecipeType: cafeMode ? "cake" : "restaurant",
    visibleThemeType: cafeMode ? "cafe" : "restaurant",
    objective: currentObjective(),
    resources: state.resources,
    installedFacilityIds: state.installed,
    installCandidates: candidates,
    cafeArea: {
      unlocked: state.cafeArea.unlocked,
      expansionConfirmed: state.cafeArea.expansionConfirmed,
      expansionAvailable: cafeExpansionAvailable(),
      requiredRecipeCount: cafeRegion()?.recipeCount || 3,
      unlockedRecipeCount: unlockedRecipeCount(),
      discoveredRestaurantRecipeCount: unlockedRecipeCount(),
      activeThemeId: activeCafeThemeId(),
      activeThemeName: CAFE_THEME_NAMES[activeCafeThemeId()],
      installedPartIds: cafeInstalledRows().map((row) => row.id),
      bakingFacilityInstalled: cafeBakingFacilityInstalled(),
      serviceReady: cafeServiceReady(),
      continuedVisitChance: CAFE_CONTINUE_VISIT_CHANCE,
      queuedVisitors: state.cafeQueue.length,
      totalVisitors: state.cafeVisit.total,
    },
    cafeGuests: state.cafeGuests.map((guest) => ({
      id: guest.id,
      sourceRestaurantGuestId: guest.sourceRestaurantGuestId,
      customerId: guest.customerId,
      customerName: guest.customerName,
      icon: guestIcon(guest),
      state: guest.state,
      x: Math.round(guest.x),
      y: Math.round(guest.y),
      orderKind: guest.orderKind,
      cakePurchase: guest.cakePurchase,
      enjoyRemaining: guest.state === "enjoying"
        ? Number(Math.max(0, GUEST_MEAL_DURATION_SECONDS - guest.stateTime).toFixed(1))
        : null,
    })),
    cafePayments: state.cafePayments.map((payment) => ({
      id: payment.id,
      x: Math.round(payment.x),
      y: Math.round(payment.y),
      amount: payment.amount,
    })),
    cakeWorkshop: {
      freeCraftAvailable: state.cakeWorkshop.freeCraftsUsed < 1,
      totalCrafted: state.cakeWorkshop.totalCrafted,
      selections: {
        sheetId: state.cakeWorkshop.selectedSheet,
        creamId: state.cakeWorkshop.selectedCream,
        toppingId: state.cakeWorkshop.selectedTopping,
      },
      toppingCount: state.cakeWorkshop.toppingPlacements.length,
      matchedRecipe: selectedCakeRecipe()?.id || null,
      discoveredRecipeIds: [...state.cakeWorkshop.discoveredRecipeIds],
      limitedSale: state.cakeWorkshop.limitedSale ? { ...state.cakeWorkshop.limitedSale } : null,
    },
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
      cakePurchase: guest.cakePurchase || null,
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
    metrics: state.metrics,
    currentScreen: state.ui.screen,
    recipes: {
      owned: Object.keys(state.ownedRecipes).length,
      globalRevenueBonus: Math.max(0, unlockedRecipeCount() - 1) * .05,
      craftable: CORE_PROGRESSION.filter((route) => canCraftRecipe(route.recipeId)).map((route) => route.recipeId),
      craftCosts: Object.fromEntries(CORE_PROGRESSION.filter(isProgressionRouteUnlocked).map((route) => [route.recipeId, craftIngredientCost(route)])),
      craftRequirements: Object.fromEntries(CORE_PROGRESSION.filter(isProgressionRouteUnlocked).map((route) => [route.recipeId,
        craftIngredientRequirements(route).map((requirement) => ({ ingredientId: requirement.ingredientId, name: requirement.name, count: requirement.count }))])),
      levels: Object.fromEntries(Object.entries(state.ownedRecipes).map(([id, owned]) => [id, owned.level])),
      prices: Object.fromEntries(Object.entries(state.ownedRecipes).map(([id, owned]) => {
        const recipe = getRecipe(Number(id));
        return [id, Math.round(Number(recipe?.foodPrice || 0) * (1 + Math.max(0, owned.level - 1) * .05))];
      })),
    },
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
          slot: index === 0 ? "primary" : index === 1 ? "secondary" : "rare",
          ingredientId: ingredient.id,
          name: ingredient.name,
        })),
        recipeId: chick.recipeId,
        recipeName: chick.recipeName,
        recipeIngredients: chick.ingredientRequirements.map((ingredient) => ({ ingredientId: ingredient.id, name: ingredient.name })),
      })),
      themeChickThresholds: THEME_CHICK_THRESHOLDS,
      guestGrades: GUEST_GRADES,
      cafeCakeMilestones: CAFE_CAKE_MILESTONES,
      cafeThemes: Object.fromEntries(Object.keys(CAFE_THEME_NAMES).map((themeId) => {
        const progress = cafeThemeProgress(Number(themeId));
        return [themeId, {
          ...progress,
          rewards: (CAFE_THEME_CAKE_REWARDS[themeId] || []).map((reward, index) => ({
            ...reward,
            threshold: CAFE_CAKE_MILESTONES[index],
            unlocked: state.cafeThemes.cakeIngredients.includes(reward.id),
          })),
        }];
      })),
      cakeIngredients: state.cafeThemes.cakeIngredients.map(cakeIngredientData).filter(Boolean),
      themeChickProgress: Object.fromEntries(Object.keys(THEME_NAMES).map((themeId) => {
        const progress = themeChickProgress(Number(themeId));
        return [themeId, { ...progress, unlocked: unlockedThemeChicks(Number(themeId)).map((chick) => chick.customerId) }];
      })),
      ingredientDropChances: Object.fromEntries(CORE_PROGRESSION.map((route) => [route.ingredientId, GUEST_INGREDIENT_DROP_CHANCE])),
      ingredientDropRule: {
        overallChance: GUEST_INGREDIENT_DROP_CHANCE,
        ingredientTypesOnSuccess: 1,
        grades: GUEST_GRADES.map((grade) => ({
          minVisits: grade.minVisits,
          primaryCount: grade.primaryCount,
          secondaryCount: grade.secondaryCount,
          rareCount: grade.rareCount,
        })),
      },
      ingredients: { ...state.crafting.ingredients },
      autoCraft: "click-to-craft-one",
      craftedRecipes: state.crafting.history.map((entry) => entry.recipeId),
      unlockedRegions: unlockedRegions().map((region) => region.id),
    },
    missions: {
      mainGroup: state.missions.mainGroup,
      rewardReady: hasMissionReward(),
      dailyClaimed: state.missions.dailyClaimed.length,
    },
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
dom.collectionButton.addEventListener("click", () => openMenu("collection"));
dom.installClose.addEventListener("click", closeInstallPanel);
dom.installConfirm.addEventListener("click", confirmInstall);
dom.menuClose.addEventListener("click", closeMenu);
dom.navButtons.forEach((button) => button.addEventListener("click", () => openMenu(button.dataset.screen)));
dom.worldAreaButtons.forEach((button) =>
  button.addEventListener("click", () => setWorldArea(button.dataset.worldArea)));
dom.cafeExpandButton.addEventListener("click", expandCafeArea);
dom.cakeWorkshopButton.addEventListener("click", () => openMenu("cake"));
dom.cafeInstallTargets.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cafe-install]");
  if (!button) return;
  const row = cafeThemeRows(activeCafeThemeId()).find((item) => item.id === Number(button.dataset.cafeInstall));
  if (row) openInstallPanel(row);
});
dom.menuTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tab]");
  if (!button) return;
  state.ui.tab = button.dataset.tab;
  renderMenu();
});
dom.menuContent.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  if (button.dataset.action === "go-cafe-theme") {
    openMenu("theme");
    return;
  }
  if (button.dataset.action === "select-cake-part") {
    selectCakePart(button.dataset.kind, button.dataset.partId);
    return;
  }
  if (button.dataset.action === "place-cake-topping") {
    if (state.cakeWorkshop.toppingPlacements.length >= 12) {
      showToast("토핑은 최대 12개까지 올릴 수 있어요.");
      return;
    }
    const rect = button.getBoundingClientRect();
    const x = Math.min(.88, Math.max(.12, (event.clientX - rect.left) / rect.width));
    const y = Math.min(.78, Math.max(.14, (event.clientY - rect.top) / rect.height));
    state.cakeWorkshop.toppingPlacements.push({
      x,
      y,
      rotation: (state.cakeWorkshop.toppingPlacements.length * 37) % 50 - 25,
    });
    state.cakeWorkshop.lastResult = null;
    saveState();
    renderMenu();
    return;
  }
  if (button.dataset.action === "undo-cake-topping") {
    state.cakeWorkshop.toppingPlacements.pop();
    state.cakeWorkshop.lastResult = null;
    saveState();
    renderMenu();
    return;
  }
  if (button.dataset.action === "clear-cake-toppings") {
    state.cakeWorkshop.toppingPlacements = [];
    state.cakeWorkshop.lastResult = null;
    saveState();
    renderMenu();
    return;
  }
  if (button.dataset.action === "finish-cake") {
    finishCake(button.dataset.currency);
    return;
  }
  const id = Number(button.dataset.id);
  if (button.dataset.action === "research") doResearch();
  if (button.dataset.action === "craft-recipe") craftRecipe(id, false);
  if (button.dataset.action === "auto-craft") {
    if (!tryAutoCraft()) showToast("현재 재료로 제작할 수 있는 레시피가 없어요.");
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
  if (button.dataset.action === "buy-cafe-theme") buyCafeTheme(id);
  if (button.dataset.action === "apply-theme") applyTheme(id);
  if (button.dataset.action === "apply-theme-all") applyThemeAll(id);
  if (button.dataset.action === "theme-area") { state.ui.themeArea = button.dataset.area; renderMenu(); }
  if (button.dataset.action === "theme-select") {
    if (state.ui.worldArea === "cafe") {
      state.ui.cafeThemeId = id;
      state.cafeThemes.activeThemeId = id;
      saveState();
      updateHud();
      render();
    } else state.ui.themeId = id;
    renderMenu();
  }
  if (button.dataset.action === "theme-filter") { state.ui.themeFacilityType = id; renderMenu(); }
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
