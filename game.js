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
  THEME_CHICK_PURCHASE_REQUIREMENTS,
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
  gems: document.querySelector("#gem-count"),
  promoButton: document.querySelector("#promotion-btn"),
  specialPromoButton: document.querySelector("#special-promotion-btn"),
  specialPromoLabel: document.querySelector("#special-promotion-label"),
  specialPromoPanel: document.querySelector("#special-promotion-panel"),
  specialPromoClose: document.querySelector("#special-promotion-close"),
  specialPromoSearch: document.querySelector("#special-promotion-search"),
  specialPromoList: document.querySelector("#special-promotion-list"),
  specialPromoDetail: document.querySelector("#special-promotion-detail"),
  resetButton: document.querySelector("#reset-btn"),
  debugToggleButton: document.querySelector("#debug-toggle-btn"),
  debugPanel: document.querySelector("#debug-panel"),
  debugCloseButton: document.querySelector("#debug-close-btn"),
  debugInstallAllButton: document.querySelector("#debug-install-all-btn"),
  debugResourceType: document.querySelector("#debug-resource-type"),
  debugResourceAmount: document.querySelector("#debug-resource-amount"),
  debugAddResourceButton: document.querySelector("#debug-add-resource-btn"),
  debugIngredientType: document.querySelector("#debug-ingredient-type"),
  debugIngredientAmount: document.querySelector("#debug-ingredient-amount"),
  debugAddIngredientButton: document.querySelector("#debug-add-ingredient-btn"),
  debugSpecialType: document.querySelector("#debug-special-type"),
  debugSpawnSpecialButton: document.querySelector("#debug-spawn-special-btn"),
  dropBoostBadge: document.querySelector("#drop-boost-badge"),
  dropBoostTime: document.querySelector("#drop-boost-time"),
  specialVisitorPanel: document.querySelector("#special-visitor-panel"),
  specialVisitorIcon: document.querySelector("#special-visitor-icon"),
  specialVisitorTitle: document.querySelector("#special-visitor-title"),
  specialVisitorMessage: document.querySelector("#special-visitor-message"),
  specialVisitorContent: document.querySelector("#special-visitor-content"),
  specialVisitorClose: document.querySelector("#special-visitor-close"),
  areaPrevButton: document.querySelector("#area-prev-btn"),
  areaNextButton: document.querySelector("#area-next-btn"),
  contestButton: document.querySelector("#contest-button"),
  bottomControls: document.querySelector("#bottom-controls"),
  offlineRewardPanel: document.querySelector("#offline-reward-panel"),
  offlineRewardTime: document.querySelector("#offline-reward-time"),
  offlineRewardAmount: document.querySelector("#offline-reward-amount"),
  offlineRewardClaim: document.querySelector("#offline-reward-claim"),
  tipboxPanel: document.querySelector("#tipbox-panel"),
  tipboxClose: document.querySelector("#tipbox-close"),
  tipboxAmount: document.querySelector("#tipbox-amount"),
  tipboxCapacity: document.querySelector("#tipbox-capacity"),
  tipboxGaugeFill: document.querySelector("#tipbox-gauge-fill"),
  tipboxCollect: document.querySelector("#tipbox-collect"),
  tipboxExpand: document.querySelector("#tipbox-expand"),
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
  chefDialogue: document.querySelector("#chef-dialogue"),
  chefDialogueText: document.querySelector("#chef-dialogue-text"),
  recipeDot: document.querySelector("#recipe-dot"),
  collectionDot: document.querySelector("#collection-dot"),
  toast: document.querySelector("#toast"),
  guestToast: document.querySelector("#guest-toast"),
  recipeNavLabel: document.querySelector("#recipe-nav-label"),
  themeNavLabel: document.querySelector("#theme-nav-label"),
};

let tables;
let state;
let lastFrame = performance.now();
let deterministicStepping = false;
let toastTimer = 0;
let guestToastTimer = 0;
let guestToastQueue = [];
const imageCache = new Map();
const DRAG_SCROLL_THRESHOLD = 6;
let dragScrollGesture = null;
let suppressedDragClick = null;
let mixingDropIndex = -1;
let recipeReveal = null;
let recipeRevealTimer = 0;
let recipeResearch = null;
let specialPromotionDetailIngredientId = null;
let knowhowMapScroll = { left: 30, top: 0 };
let themeMenuScrollTop = 0;
const CHEF_HOME_POSITION = Object.freeze({ x: 400, y: 330 });
const CHEF_STATION_OFFSET_Y = 74;
const CHEF_MOVE_SPEED = 520;
let chefPosition = { ...CHEF_HOME_POSITION };
const RECIPE_RESEARCH_DURATION = 2.4;
const THEME_COMPLETION_MENU_PRICE_BONUS = .2;
const SINK_WATER_COOLDOWN_SECONDS = 8;
const CHICK_ICON_MAX_INDEX = 108;
const WEIRD_DISH_ICON = "assets/ui/recipe/icon_recipe_weird.png";
const STARTER_CHICKPEA = Object.values(GAME_INGREDIENTS).find((ingredient) => ingredient.name === "병아리콩");
const STARTER_INGREDIENTS = Object.freeze({
  [STARTER_CHICKPEA.id]: 1,
  [GAME_INGREDIENTS.water.id]: 1,
});
const BOWL_CAPACITY_INITIAL = 2;
const BOWL_CAPACITY_MAX = Math.max(BOWL_CAPACITY_INITIAL, ...RECIPE_PROGRESSION.map((route) => Number(route.ingredientCount
  || route.ingredientRequirements?.length || 0)));
const BOWL_CAPACITY_EXPANSION_AMOUNT = 1;
const BOWL_CAPACITY_EXPANSION_GEM_COST = 10;
const SPECIAL_PROMOTION_RECIPE_REQUIREMENT = 5;
const SPECIAL_PROMOTION_DURATION = 60;
const SPECIAL_PROMOTION_COOLDOWN = 30;
const SPECIAL_VISITOR_INTERVAL = 120;
const SPECIAL_VISITOR_WAIT_DURATION = 30;
const WIND_FAIRY_DURATION = 60;
const FUTURE_TRADE_CHANCE = 0.15;
const MERCHANT_THEME_BASE_PRICES = Object.freeze([120, 300, 1200]);
const MERCHANT_LATE_THEME_MULTIPLIER = 2;
const MERCHANT_STAGE_PRICE_STEP = 0.08;
const COOKING_TIME_BASE_SECONDS = 2;
const COOKING_PRICE_PER_SECOND = 20;
const COOKING_TIME_MIN_SECONDS = 4;
const COOKING_TIME_MAX_SECONDS = 24;
const COOKING_TIME_STEP_SECONDS = 0.5;
const BUFFET_RECIPE_REQUIREMENT = 8;
const BUFFET_MAX_STAND_COUNT = 8;
const BUFFET_STAND_UNLOCK_REQUIREMENTS = Object.freeze([8, 8, 8, 8, 12, 16, 20, 24]);
const BUFFET_TICK_SECONDS = 60;
const BUFFET_RECIPE_YIELD_RATE = 0.10;
const BUFFET_RECIPE_COLLECTION_BONUS = 0.01;
const BUFFET_OFFLINE_CAP_SECONDS = 2 * 60 * 60;
const BUFFET_VISIT_CHANCE = Object.freeze({ normal: 0.50, satisfied: 0.80 });
const BUFFET_PURCHASE_CHANCE = Object.freeze({ normal: 0.25, satisfied: 0.55 });
const BUFFET_PURCHASE_RATE = 0.25;
const BUFFET_CASHBOX_POSITION = Object.freeze({ x: 240, y: 715, w: 104, h: 86 });
const CONTEST_RECIPE_REQUIREMENT = 6;
const CONTEST_EXTRA_ENTRY_GEM_COST = 10;
const CONTEST_JUDGING_DURATION = 2.8;
const TIPBOX_INITIAL_CAPACITY = 500;
const TIPBOX_EXPANSION_AMOUNT = 500;
const TIPBOX_EXPANSION_GEM_COST = 10;
const KNOWHOW_XP_BASE = 100;
const KNOWHOW_XP_GROWTH = 25;
const KNOWHOW_RESEARCH_XP = 20;
const KNOWHOW_SERVICE_XP = 1;
const KNOWHOW_SKILL_DEFINITIONS = Object.freeze([
  { id: "restaurant_basics", name: "식당 노하우", icon: "📒", maxLevel: 1, costs: [], x: 240, y: 52, prerequisites: [], effect: () => "요리하며 식당 운영 경험을 쌓아요" },

  { id: "auto_collect_1", name: "도토리 정산 I", icon: "🪙", maxLevel: 1, costs: [1], x: 80, y: 170, prerequisites: [{ id: "restaurant_basics", level: 1 }], effect: () => "30초마다 테이블 도토리 1개 자동 회수" },
  { id: "auto_payment_2", name: "도토리 정산 II", icon: "🪙", maxLevel: 1, costs: [1], x: 80, y: 285, prerequisites: [{ id: "auto_collect_1", level: 1 }], effect: () => "자동 도토리 정산 20초" },
  { id: "auto_payment_3", name: "도토리 정산 III", icon: "💰", maxLevel: 1, costs: [2], x: 80, y: 400, prerequisites: [{ id: "auto_payment_2", level: 1 }], effect: () => "자동 도토리 정산 10초" },
  { id: "auto_collect_2", name: "재료 정리 I", icon: "🧺", maxLevel: 1, costs: [1], x: 80, y: 515, prerequisites: [{ id: "auto_payment_3", level: 1 }], effect: () => "30초마다 필드 재료 1개 자동 획득" },
  { id: "auto_ingredient_2", name: "재료 정리 II", icon: "🧺", maxLevel: 1, costs: [1], x: 80, y: 630, prerequisites: [{ id: "auto_collect_2", level: 1 }], effect: () => "자동 재료 획득 20초" },
  { id: "auto_ingredient_3", name: "재료 정리 III", icon: "✨", maxLevel: 1, costs: [2], x: 80, y: 745, prerequisites: [{ id: "auto_ingredient_2", level: 1 }], effect: () => "자동 재료 획득 10초" },
  { id: "auto_collect_3", name: "뷔페 정산 I", icon: "🍽️", maxLevel: 1, costs: [2], x: 80, y: 860, prerequisites: [{ id: "auto_ingredient_3", level: 1 }], effect: () => "60초마다 뷔페 계산대 자동 정산" },
  { id: "auto_buffet_2", name: "뷔페 정산 II", icon: "🍽️", maxLevel: 1, costs: [1], x: 80, y: 975, prerequisites: [{ id: "auto_collect_3", level: 1 }], effect: () => "자동 뷔페 정산 40초" },
  { id: "auto_buffet_3", name: "뷔페 정산 III", icon: "🥂", maxLevel: 1, costs: [2], x: 80, y: 1090, prerequisites: [{ id: "auto_buffet_2", level: 1 }], effect: () => "자동 뷔페 정산 20초" },
  { id: "auto_order_1", name: "주문 메모", icon: "📝", maxLevel: 1, costs: [1], x: 80, y: 1205, prerequisites: [{ id: "auto_buffet_3", level: 1 }], effect: () => "5초 기다린 주문을 자동 접수" },
  { id: "auto_order_2", name: "주문 감각", icon: "🙋", maxLevel: 1, costs: [2], x: 80, y: 1320, prerequisites: [{ id: "auto_order_1", level: 1 }], effect: () => "자동 주문 대기 2초" },
  { id: "auto_order_3", name: "즉석 주문", icon: "⚡", maxLevel: 1, costs: [2], x: 80, y: 1435, prerequisites: [{ id: "auto_order_2", level: 1 }], effect: () => "자동 주문 대기 1초" },
  { id: "auto_calm_1", name: "기분 살피기", icon: "💬", maxLevel: 1, costs: [1], x: 80, y: 1550, prerequisites: [{ id: "auto_order_3", level: 1 }], effect: () => "실망한 손님을 5초 후 자동으로 달래기" },
  { id: "auto_calm_2", name: "빠른 위로", icon: "💗", maxLevel: 1, costs: [2], x: 80, y: 1665, prerequisites: [{ id: "auto_calm_1", level: 1 }], effect: () => "자동 달래기 대기 2초" },
  { id: "auto_calm_3", name: "마음 읽기", icon: "💞", maxLevel: 1, costs: [2], x: 80, y: 1780, prerequisites: [{ id: "auto_calm_2", level: 1 }], effect: () => "자동 달래기 대기 1초" },
  { id: "auto_promotion_1", name: "꾸준한 홍보 I", icon: "📣", maxLevel: 1, costs: [2], x: 80, y: 1895, prerequisites: [{ id: "auto_calm_3", level: 1 }], effect: () => "30초마다 손님 1명 자동 홍보" },
  { id: "auto_promotion_2", name: "꾸준한 홍보 II", icon: "📣", maxLevel: 1, costs: [2], x: 80, y: 2010, prerequisites: [{ id: "auto_promotion_1", level: 1 }], effect: () => "자동 홍보 20초" },
  { id: "auto_promotion_3", name: "소문난 식당", icon: "📢", maxLevel: 1, costs: [3], x: 80, y: 2125, prerequisites: [{ id: "auto_promotion_2", level: 1 }], effect: () => "자동 홍보 10초" },

  { id: "drop_bonus_1", name: "반가운 인사", icon: "🐣", maxLevel: 1, costs: [1], x: 240, y: 170, prerequisites: [{ id: "restaurant_basics", level: 1 }], effect: () => "재료 드랍 확률 +2%p" },
  { id: "drop_bonus_2", name: "익숙한 얼굴", icon: "🤝", maxLevel: 1, costs: [1], x: 240, y: 285, prerequisites: [{ id: "drop_bonus_1", level: 1 }], effect: () => "재료 드랍 확률 +2%p" },
  { id: "drop_bonus_3", name: "단골의 선물", icon: "🍃", maxLevel: 1, costs: [2], x: 240, y: 400, prerequisites: [{ id: "drop_bonus_2", level: 1 }], effect: () => "재료 드랍 확률 +3%p" },
  { id: "double_drop_1", name: "한 줌 더 I", icon: "➕", maxLevel: 1, costs: [1], x: 240, y: 515, prerequisites: [{ id: "drop_bonus_3", level: 1 }], effect: () => "재료 1개 추가 드랍 확률 +0.5%p" },
  { id: "double_drop_2", name: "한 줌 더 II", icon: "➕", maxLevel: 1, costs: [1], x: 240, y: 630, prerequisites: [{ id: "double_drop_1", level: 1 }], effect: () => "재료 1개 추가 드랍 확률 +0.5%p" },
  { id: "double_drop_3", name: "한 줌 더 III", icon: "➕", maxLevel: 1, costs: [1], x: 240, y: 745, prerequisites: [{ id: "double_drop_2", level: 1 }], effect: () => "재료 1개 추가 드랍 확률 +0.5%p" },
  { id: "double_drop_4", name: "한 줌 더 IV", icon: "➕", maxLevel: 1, costs: [1], x: 240, y: 860, prerequisites: [{ id: "double_drop_3", level: 1 }], effect: () => "재료 1개 추가 드랍 확률 +0.5%p" },
  { id: "double_drop_5", name: "한 줌 더 V", icon: "✚", maxLevel: 1, costs: [1], x: 240, y: 975, prerequisites: [{ id: "double_drop_4", level: 1 }], effect: () => "재료 1개 추가 드랍 확률 +0.5%p" },
  { id: "double_drop_6", name: "두 손 가득 I", icon: "✚", maxLevel: 1, costs: [1], x: 240, y: 1090, prerequisites: [{ id: "double_drop_5", level: 1 }], effect: () => "재료 1개 추가 드랍 확률 +0.5%p" },
  { id: "double_drop_7", name: "두 손 가득 II", icon: "✚", maxLevel: 1, costs: [1], x: 240, y: 1205, prerequisites: [{ id: "double_drop_6", level: 1 }], effect: () => "재료 1개 추가 드랍 확률 +0.5%p" },
  { id: "double_drop_8", name: "두 손 가득 III", icon: "✚", maxLevel: 1, costs: [1], x: 240, y: 1320, prerequisites: [{ id: "double_drop_7", level: 1 }], effect: () => "재료 1개 추가 드랍 확률 +0.5%p" },
  { id: "double_drop_9", name: "두 손 가득 IV", icon: "✚", maxLevel: 1, costs: [1], x: 240, y: 1435, prerequisites: [{ id: "double_drop_8", level: 1 }], effect: () => "재료 1개 추가 드랍 확률 +0.5%p" },
  { id: "double_drop_10", name: "풍성한 선물", icon: "🎁", maxLevel: 1, costs: [2], x: 240, y: 1550, prerequisites: [{ id: "double_drop_9", level: 1 }], effect: () => "재료 1개 추가 드랍 확률 +0.5%p" },
  { id: "storage_bonus_1", name: "알뜰한 정리", icon: "🧊", maxLevel: 1, costs: [1], x: 240, y: 1665, prerequisites: [{ id: "double_drop_10", level: 1 }], effect: () => "냉장고 용량 +5칸" },
  { id: "storage_bonus_2", name: "넉넉한 보관", icon: "📦", maxLevel: 1, costs: [2], x: 240, y: 1780, prerequisites: [{ id: "storage_bonus_1", level: 1 }], effect: () => "냉장고 용량 +5칸" },
  { id: "merchant_discount_1", name: "상인과 안면", icon: "💬", maxLevel: 1, costs: [2], x: 240, y: 1895, prerequisites: [{ id: "storage_bonus_2", level: 1 }], effect: () => "재료 상인 가격 -10%" },
  { id: "merchant_discount_2", name: "흥정 요령", icon: "🪙", maxLevel: 1, costs: [2], x: 240, y: 2010, prerequisites: [{ id: "merchant_discount_1", level: 1 }], effect: () => "재료 상인 가격 추가 -10%" },

  { id: "cooking_speed_1", name: "손풀기", icon: "🥄", maxLevel: 1, costs: [1], x: 400, y: 170, prerequisites: [{ id: "restaurant_basics", level: 1 }], effect: () => "손님 음식 조리 시간 -3%" },
  { id: "cooking_speed_2", name: "빠른 손놀림", icon: "⏱️", maxLevel: 1, costs: [1], x: 400, y: 285, prerequisites: [{ id: "cooking_speed_1", level: 1 }], effect: () => "손님 음식 조리 시간 추가 -4%" },
  { id: "cooking_speed_3", name: "숙련된 요리", icon: "🍳", maxLevel: 1, costs: [2], x: 400, y: 400, prerequisites: [{ id: "cooking_speed_2", level: 1 }], effect: () => "손님 음식 조리 시간 추가 -5%" },
  { id: "research_speed_1", name: "연구 노트", icon: "📖", maxLevel: 1, costs: [1], x: 400, y: 515, prerequisites: [{ id: "cooking_speed_3", level: 1 }], effect: () => "요리 연구 시간 -10%" },
  { id: "research_speed_2", name: "실험 정리", icon: "🥣", maxLevel: 1, costs: [1], x: 400, y: 630, prerequisites: [{ id: "research_speed_1", level: 1 }], effect: () => "요리 연구 시간 추가 -10%" },
  { id: "research_speed_3", name: "요리 직감", icon: "💡", maxLevel: 1, costs: [2], x: 400, y: 745, prerequisites: [{ id: "research_speed_2", level: 1 }], effect: () => "요리 연구 시간 추가 -10%" },
  { id: "offline_bonus_1", name: "밤샘 준비", icon: "🌙", maxLevel: 1, costs: [2], x: 400, y: 860, prerequisites: [{ id: "research_speed_3", level: 1 }], effect: () => "뷔페 오프라인 보상 상한 +1시간" },
  { id: "offline_bonus_2", name: "든든한 준비", icon: "🛌", maxLevel: 1, costs: [2], x: 400, y: 975, prerequisites: [{ id: "offline_bonus_1", level: 1 }], effect: () => "뷔페 오프라인 보상 상한 +1시간" },
  { id: "contest_prize_1", name: "대회 경험", icon: "🎖️", maxLevel: 1, costs: [2], x: 400, y: 1090, prerequisites: [{ id: "offline_bonus_2", level: 1 }], effect: () => "요리 대회 상금 +10%" },
  { id: "contest_prize_2", name: "승부 요령", icon: "🏆", maxLevel: 1, costs: [2], x: 400, y: 1205, prerequisites: [{ id: "contest_prize_1", level: 1 }], effect: () => "요리 대회 상금 추가 +10%" },
  { id: "buffet_income_1", name: "진열 감각", icon: "🍽️", maxLevel: 1, costs: [2], x: 400, y: 1320, prerequisites: [{ id: "contest_prize_2", level: 1 }], effect: () => "야외 뷔페 분당 수익 +10%" },
  { id: "buffet_income_2", name: "인기 진열", icon: "🥂", maxLevel: 1, costs: [2], x: 400, y: 1435, prerequisites: [{ id: "buffet_income_1", level: 1 }], effect: () => "야외 뷔페 분당 수익 추가 +10%" },
]);
const KNOWHOW_BALANCED_BRANCHES = Object.freeze([
  Object.freeze([
    "auto_collect_1", "auto_collect_2", "auto_promotion_1", "auto_order_1",
    "auto_payment_2", "auto_ingredient_2", "auto_calm_1", "auto_promotion_2",
    "auto_order_2", "auto_payment_3", "auto_ingredient_3", "auto_calm_2",
    "auto_promotion_3", "auto_order_3", "auto_calm_3", "auto_collect_3",
    "auto_buffet_2", "auto_buffet_3",
  ]),
  Object.freeze([
    "drop_bonus_1", "double_drop_1", "storage_bonus_1", "drop_bonus_2",
    "double_drop_2", "merchant_discount_1", "drop_bonus_3", "double_drop_3",
    "storage_bonus_2", "double_drop_4", "merchant_discount_2", "double_drop_5",
    "double_drop_6", "double_drop_7", "double_drop_8", "double_drop_9", "double_drop_10",
  ]),
  Object.freeze([
    "cooking_speed_1", "research_speed_1", "offline_bonus_1", "cooking_speed_2",
    "contest_prize_1", "research_speed_2", "buffet_income_1", "cooking_speed_3",
    "offline_bonus_2", "research_speed_3", "contest_prize_2", "buffet_income_2",
  ]),
]);
const KNOWHOW_BALANCED_LAYOUT = new Map(KNOWHOW_BALANCED_BRANCHES.flatMap((branch) => branch.map((id, index) => [
  id,
  {
    y: 170 + index * 115,
    prerequisites: [{ id: index === 0 ? "restaurant_basics" : branch[index - 1], level: 1 }],
  },
])));
const KNOWHOW_SKILLS = Object.freeze(KNOWHOW_SKILL_DEFINITIONS.map((skill) => Object.freeze({
  ...skill,
  ...(KNOWHOW_BALANCED_LAYOUT.get(skill.id) || {}),
})));
const CONTEST_JUDGE_PREFERENCES = Object.freeze({
  fresh: { name: "새싹 심사위원", icon: "🥬", hint: "싱그러운 채소가 좋아요", ingredientKeys: ["leaf", "lettuce", "tomato", "mixedVeg", "carrot", "cabbage", "cucumber", "broccoli", "avocado"] },
  rich: { name: "고소미 심사위원", icon: "🧀", hint: "고소하고 부드러운 맛!", ingredientKeys: ["cheese", "egg", "butter", "milk", "cream", "seed", "tofu", "corn"] },
  hearty: { name: "든든이 심사위원", icon: "🍚", hint: "배부른 주재료가 최고예요", ingredientKeys: ["bread", "potato", "rice", "flour", "noodles", "tortilla", "pasta", "acorn"] },
  savory: { name: "감칠맛 심사위원", icon: "🥩", hint: "진한 고기와 해산물 취향", ingredientKeys: ["meat", "beef", "pork", "lamb", "fish", "sausage", "ham", "broth", "soy"] },
  aroma: { name: "향긋이 심사위원", icon: "🌿", hint: "향신 재료를 찾아요", ingredientKeys: ["garlic", "onion", "pepper", "curry", "chili", "parsley", "basil", "rosemary", "truffle"] },
  sweet: { name: "달콤이 심사위원", icon: "🍓", hint: "달콤한 과일이 좋아요", ingredientKeys: ["fruit", "berry", "sugar", "jam", "cherry", "banana", "strawberry", "apple", "mulberry"] },
  tangy: { name: "새콤이 심사위원", icon: "🍅", hint: "새콤하고 톡 쏘는 맛!", ingredientKeys: ["tomato", "pickle", "ketchup", "vinegar", "olive", "soda"] },
});
const CONTEST_TIERS = Object.freeze([
  { id: 1, name: "동네 새싹 요리대회", shortName: "새싹 대회", recipeRequirement: 6, previousTierId: null, firstPlaceScore: 62, prizes: [800, 400, 200], judges: ["fresh", "hearty", "rich"] },
  { id: 2, name: "숲속 요리축제", shortName: "숲속 축제", recipeRequirement: 12, previousTierId: 1, firstPlaceScore: 66, prizes: [5000, 2500, 1200], judges: ["savory", "fresh", "aroma"] },
  { id: 3, name: "왕국 미식대회", shortName: "왕국 대회", recipeRequirement: 20, previousTierId: 2, firstPlaceScore: 70, prizes: [25000, 12000, 6000], judges: ["rich", "savory", "tangy"] },
  { id: 4, name: "별빛 그랑프리", shortName: "그랑프리", recipeRequirement: 32, previousTierId: 3, firstPlaceScore: 74, prizes: [120000, 60000, 30000], judges: ["sweet", "aroma", "rich"] },
]);
const SPECIAL_VISITOR_TYPES = Object.freeze({
  thief: { name: "도둑 병아리", icon: "assets/ui/chick/icon_chick_007.png", marker: "!" },
  merchant: { name: "재료 상인", icon: "assets/ui/chick/icon_chick_rich.png", marker: "₩" },
  fairy: { name: "바람의 요정", icon: "assets/ui/chick/icon_chick_038.png", marker: "✦" },
  trader: { name: "재료 교환상", icon: "assets/ui/chick/icon_chick_015.png", marker: "↔" },
});
const TUTORIAL_DIALOGUES = Object.freeze({
  welcome: "빈 식당에 설비를 하나씩 설치해 볼까요?",
  "recipe-locked": "도마 테이블을 설치하면 요리 연구를 시작할 수 있어요!",
  "recipe-unlocked": "도마 테이블 설치 완료! 이제 새로운 요리를 연구해 봐요.",
  "fridge-next": "다음은 냉장고예요. 설치하면 손님들이 재료를 떨어뜨릴 거예요!",
  "drops-unlocked": "냉장고 설치 완료! 이제 손님에게서 재료를 얻을 수 있어요.",
  "special-promotion-unlocked": "요리 5개 발견! 이제 특별 홍보로 원하는 재료의 손님을 초대할 수 있어요.",
  "contest-unlocked": "요리가 6개나 됐어요! 심사위원 취향에 맞춰 요리 대회에 출품해 볼까요?",
  "buffet-unlocked": "요리가 8개나 됐어요! 손님들이 여러 요리를 구경할 수 있는 야외 뷔페를 열어 볼까요?",
});

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
    version: 23,
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
      opened: tables.restaurantThemes.filter((row) => Number(row.facilityTheme) === 1).map((row) => row.id),
      activeByFacility: Object.fromEntries(tables.restaurantThemes
        .filter((row) => Number(row.facilityTheme) === 1)
        .map((row) => [row.facilityType, row.id])),
      unlockedThemeIds: [1],
    },
    crafting: {
      ingredients: { ...STARTER_INGREDIENTS },
      starterIngredientsGranted: true,
      history: [],
      selected: [],
      hints: {},
      storageCapacity: INGREDIENT_STORAGE_INITIAL_CAPACITY,
      bowlCapacity: BOWL_CAPACITY_INITIAL,
    },
    facilityInteractions: {
      sinkWater: { readyAt: 0, attempts: 0, collected: 0 },
    },
    specialActors: [],
    specialLastSpawn: {},
    specialVisitor: { nextAt: SPECIAL_VISITOR_INTERVAL, sequence: 1, dropBoostRemaining: 0, lastType: null, lastUpdatedAt: Date.now() },
    buffet: {
      stands: Array(BUFFET_MAX_STAND_COUNT).fill(null),
      cashbox: 0,
      passiveElapsed: 0,
      offlinePending: 0,
      offlineSeconds: 0,
      lastUpdatedAt: Date.now(),
      visitorSequence: 1,
      visitors: [],
    },
    contest: {
      dayKey: localDateKey(),
      entriesToday: 0,
      selectedTierId: 1,
      selectedRecipeId: 1,
      selectedIngredientId: GAME_INGREDIENTS.leaf.id,
      firstPlaceTierIds: [],
      judging: null,
      result: null,
      history: [],
    },
    knowhow: {
      xp: 0,
      points: 0,
      earnedPoints: 0,
      totalXp: 0,
      selectedSkillId: "auto_collect_1",
      skills: { restaurant_basics: 1 },
      automation: { paymentElapsed: 0, ingredientElapsed: 0, buffetElapsed: 0, orderElapsed: 0, calmElapsed: 0, promotionElapsed: 0 },
    },
    missions: {
      dayKey: new Date().toISOString().slice(0, 10),
      dailyProgress: { 1001: 1 },
      dailyClaimed: [],
      dailyBonusClaimed: false,
      mainGroup: 1,
      mainProgress: {},
      mainClaimed: [],
    },
    promotion: { progress: 0, queued: 0, totalClicks: 0, queueTargets: [] },
    specialPromotion: { ingredientId: null, remaining: 0, cooldown: 0, lastUpdatedAt: Date.now() },
    guests: [],
    guestSequence: 1,
    orders: [],
    cooking: [],
    payments: [],
    ingredientDrops: [],
    dropSequence: 1,
    tipbox: 0,
    tipboxCapacity: TIPBOX_INITIAL_CAPACITY,
    metrics: { visitors: 0, orders: 0, served: 0, collected: 0, angryLeaves: 0, ingredientDropAttempts: 0, ingredientDropMisses: 0, ingredientsFound: 0, giftBundles: 0, giftItems: 0, bonusIngredientDrops: 0, recipesCrafted: 0, recipeResearchAttempts: 0, failedRecipeResearches: 0, specialVisitors: 0, merchantPurchases: 0, fairyBuffs: 0, trades: 0, futureTrades: 0, buffetVisitors: 0, buffetPurchases: 0, buffetRevenue: 0, buffetClaims: 0, buffetOfflineRevenue: 0, contestEntries: 0, contestFirstPlaces: 0, contestPrizeMoney: 0, knowhowXpEarned: 0, knowhowPointsEarned: 0, knowhowUpgrades: 0, autoCollected: 0, autoPayments: 0, autoIngredients: 0, autoBuffetClaims: 0, autoOrders: 0, autoCalms: 0, autoPromotions: 0, tipboxExpansions: 0 },
    ui: {
      selectedInstallId: null,
      screen: "restaurant",
      tab: "craft",
      themeId: 1,
      themePartId: null,
      collectionCustomerId: 3,
      lastResearch: null,
      area: "restaurant",
      buffetStandIndex: 0,
      recipeIngredientPickerOpen: false,
    },
    tutorial: { activeId: "welcome", seen: [] },
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!parsed) return null;
    const defaults = createInitialState();
    if (![2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].includes(parsed.version)) return null;
    const ownedRecipes = Object.fromEntries(Object.entries(parsed.ownedRecipes || defaults.ownedRecipes).map(([id, value]) => [id,
      typeof value === "object" ? value : { level: Number(value) || 1, stack: 0, codexClaimed: false }]));
    const availableThemePartIds = new Set(tables.restaurantThemes.map((row) => Number(row.id)));
    const openedThemes = [...new Set([
      ...defaults.themes.opened,
      ...(parsed.themes?.opened || []),
    ])].filter((id) => availableThemePartIds.has(Number(id)));
    const activeByFacility = Object.fromEntries(Object.entries({
      ...defaults.themes.activeByFacility,
      ...parsed.themes?.activeByFacility,
    }).map(([facilityType, partId]) => [facilityType,
      availableThemePartIds.has(Number(partId)) ? partId : defaults.themes.activeByFacility[facilityType]])
      .filter(([, partId]) => partId != null));
    const savedUnlockedThemeIds = parsed.themes?.unlockedThemeIds || [...new Set(openedThemes.map((id) =>
      tables.restaurantThemes.find((row) => row.id === Number(id))?.facilityTheme).filter(Boolean))];
    const unlockedThemeIds = [...new Set([1, ...savedUnlockedThemeIds.map(Number)])]
      .filter((themeId) => Object.hasOwn(THEME_NAMES, themeId));
    const migratedInstalled = [...new Set((parsed.installed || []).map(Number))];
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
    const savedTutorial = parsed.tutorial
      ? { activeId: parsed.tutorial.activeId || null, seen: [...new Set(parsed.tutorial.seen || [])] }
      : { activeId: null, seen: ["welcome"] };
    const savedIngredients = { ...(parsed.crafting?.ingredients || {}) };
    const shouldReplaceLegacyStarter = Number(parsed.version) < 23
      && Object.keys(ownedRecipes).length <= 1
      && Number(parsed.totalResearchCount || 0) === 0
      && Number(metrics.recipeResearchAttempts || 0) === 0
      && Number(metrics.ingredientsFound || 0) === 0;
    if (shouldReplaceLegacyStarter) {
      Object.keys(savedIngredients).forEach((ingredientId) => delete savedIngredients[ingredientId]);
      Object.assign(savedIngredients, STARTER_INGREDIENTS);
    }
    const shouldGrantStarterIngredients = !shouldReplaceLegacyStarter
      && parsed.crafting?.starterIngredientsGranted !== true
      && Object.keys(ownedRecipes).length <= 1;
    if (shouldGrantStarterIngredients) {
      Object.entries(STARTER_INGREDIENTS).forEach(([ingredientId, amount]) => {
        savedIngredients[ingredientId] = Number(savedIngredients[ingredientId] || 0) + Number(amount);
      });
    }
    const normalizedIngredients = normalizeIngredientInventory(savedIngredients);
    const storedIngredientTotal = Object.values(normalizedIngredients).reduce((sum, amount) => sum + Number(amount || 0), 0);
    const migratedStorageCapacity = Math.max(
      INGREDIENT_STORAGE_INITIAL_CAPACITY,
      Math.floor(Number(parsed.crafting?.storageCapacity || 0)),
      Math.ceil(storedIngredientTotal / INGREDIENT_STORAGE_EXPANSION_AMOUNT) * INGREDIENT_STORAGE_EXPANSION_AMOUNT,
    );
    const legacyBowlCapacity = Math.min(BOWL_CAPACITY_MAX,
      BOWL_CAPACITY_INITIAL + Math.floor(Object.keys(ownedRecipes).filter((id) => getRecipe(Number(id))).length / 2));
    const savedBowlCapacity = Number(parsed.crafting?.bowlCapacity);
    const migratedBowlCapacity = Math.max(BOWL_CAPACITY_INITIAL, Math.min(BOWL_CAPACITY_MAX,
      Number.isFinite(savedBowlCapacity) && savedBowlCapacity > 0
        ? Math.floor(savedBowlCapacity)
        : Number(parsed.version) < 12 ? legacyBowlCapacity : BOWL_CAPACITY_INITIAL));
    const savedSpecialPromotion = { ...defaults.specialPromotion, ...parsed.specialPromotion };
    let specialRemaining = Math.max(0, Number(savedSpecialPromotion.remaining || 0));
    let specialCooldown = Math.max(0, Number(savedSpecialPromotion.cooldown || 0));
    let elapsedRealSeconds = Math.max(0, (Date.now() - Number(savedSpecialPromotion.lastUpdatedAt || Date.now())) / 1000);
    if (specialRemaining > 0) {
      const activeElapsed = Math.min(specialRemaining, elapsedRealSeconds);
      specialRemaining -= activeElapsed;
      elapsedRealSeconds -= activeElapsed;
      if (specialRemaining <= 0) specialCooldown = SPECIAL_PROMOTION_COOLDOWN;
    }
    if (specialRemaining <= 0 && elapsedRealSeconds > 0) specialCooldown = Math.max(0, specialCooldown - elapsedRealSeconds);
    const savedSpecialVisitor = { ...defaults.specialVisitor, ...parsed.specialVisitor };
    const specialVisitorElapsed = Math.max(0,
      (Date.now() - Number(savedSpecialVisitor.lastUpdatedAt || Date.now())) / 1000);
    savedSpecialVisitor.dropBoostRemaining = Math.max(0,
      Number(savedSpecialVisitor.dropBoostRemaining || 0) - specialVisitorElapsed);
    savedSpecialVisitor.nextAt = Math.max(0, Number(savedSpecialVisitor.nextAt || SPECIAL_VISITOR_INTERVAL));
    savedSpecialVisitor.sequence = Math.max(1, Math.floor(Number(savedSpecialVisitor.sequence || 1)));
    savedSpecialVisitor.lastUpdatedAt = Date.now();
    const savedPromotion = { ...defaults.promotion, ...parsed.promotion };
    const savedKnowhow = normalizeKnowhow(parsed.knowhow, defaults.knowhow, parsed.metrics);
    const savedQueueTargets = Array.isArray(parsed.promotion?.queueTargets)
      ? parsed.promotion.queueTargets.map((id) => Number(id) || null)
      : [];
    while (savedQueueTargets.length < Number(savedPromotion.queued || 0)) savedQueueTargets.unshift(null);
    savedQueueTargets.splice(Number(savedPromotion.queued || 0));
    const migratedCooking = (parsed.cooking || []).map((task) => {
      const recipe = getRecipe(task.recipeId);
      const owned = ownedRecipes[task.recipeId] || { level: 1 };
      const duration = recipe ? recipeCookingDuration(recipe, owned.level, savedKnowhow) : Number(task.duration || COOKING_TIME_MIN_SECONDS);
      const previousProgress = Number(task.duration) > 0
        ? Math.max(0, Math.min(1, Number(task.elapsed || 0) / Number(task.duration)))
        : 0;
      return { ...task, duration, elapsed: previousProgress * duration };
    });
    const savedBuffet = { ...defaults.buffet, ...parsed.buffet };
    const buffetStands = (Array.isArray(savedBuffet.stands) ? savedBuffet.stands : [])
      .slice(0, BUFFET_MAX_STAND_COUNT)
      .map((recipeId) => recipeId && getRecipe(Number(recipeId)) && ownedRecipes[recipeId] ? Number(recipeId) : null);
    while (buffetStands.length < BUFFET_MAX_STAND_COUNT) buffetStands.push(null);
    const buffetUnlockedInSave = Object.keys(ownedRecipes).filter((id) => getRecipe(Number(id))).length >= BUFFET_RECIPE_REQUIREMENT
      && savedTutorial.seen.includes("buffet-unlocked");
    const buffetRealElapsed = buffetUnlockedInSave
      ? Math.min(buffetOfflineCapSeconds(savedKnowhow), Math.max(0, (Date.now() - Number(savedBuffet.lastUpdatedAt || Date.now())) / 1000))
      : 0;
    const buffetTotalElapsed = Math.max(0, Number(savedBuffet.passiveElapsed || 0)) + buffetRealElapsed;
    const buffetOfflineTicks = Math.floor(buffetTotalElapsed / BUFFET_TICK_SECONDS);
    const buffetOfflineEarned = buffetOfflineTicks * buffetYieldFromSnapshot(buffetStands, ownedRecipes, savedKnowhow);
    const savedContest = { ...defaults.contest, ...parsed.contest };
    const contestTierIds = new Set(CONTEST_TIERS.map((tier) => tier.id));
    const contestRecipeIds = new Set(Object.keys(ownedRecipes).map(Number));
    const contestIngredientIds = new Set(Object.keys(normalizedIngredients).map(Number));
    return {
      ...defaults,
      ...restaurantSave,
      version: 23,
      installed: [...new Set(migratedInstalled)].sort((a, b) => a - b),
      resources: { ...defaults.resources, ...parsed.resources },
      tipbox: Math.max(0, Math.floor(Number(parsed.tipbox || 0))),
      tipboxCapacity: Math.max(TIPBOX_INITIAL_CAPACITY, Math.floor(Number(parsed.tipboxCapacity || 0)), Math.ceil(Math.max(0, Number(parsed.tipbox || 0)) / TIPBOX_EXPANSION_AMOUNT) * TIPBOX_EXPANSION_AMOUNT),
      ownedRecipes,
      collections: { ...defaults.collections, ...parsed.collections },
      missions: { ...defaults.missions, ...parsed.missions },
      metrics,
      promotion: {
        ...savedPromotion,
        queueTargets: savedQueueTargets,
      },
      specialPromotion: {
        ingredientId: specialRemaining > 0 ? Number(savedSpecialPromotion.ingredientId) || null : null,
        remaining: specialRemaining,
        cooldown: specialCooldown,
        lastUpdatedAt: Date.now(),
      },
      cooking: migratedCooking,
      buffet: {
        ...savedBuffet,
        stands: buffetStands,
        cashbox: Math.max(0, Math.floor(Number(savedBuffet.cashbox || 0))),
        passiveElapsed: buffetTotalElapsed % BUFFET_TICK_SECONDS,
        offlinePending: Math.max(0, Math.floor(Number(savedBuffet.offlinePending || 0))) + buffetOfflineEarned,
        offlineSeconds: Math.max(0, Number(savedBuffet.offlineSeconds || 0)) + buffetOfflineTicks * BUFFET_TICK_SECONDS,
        lastUpdatedAt: Date.now(),
        visitorSequence: Math.max(1, Math.floor(Number(savedBuffet.visitorSequence || 1))),
        visitors: Array.isArray(savedBuffet.visitors) ? savedBuffet.visitors : [],
      },
      contest: {
        ...savedContest,
        dayKey: typeof savedContest.dayKey === "string" ? savedContest.dayKey : defaults.contest.dayKey,
        entriesToday: Math.max(0, Math.floor(Number(savedContest.entriesToday || 0))),
        selectedTierId: contestTierIds.has(Number(savedContest.selectedTierId)) ? Number(savedContest.selectedTierId) : 1,
        selectedRecipeId: contestRecipeIds.has(Number(savedContest.selectedRecipeId)) ? Number(savedContest.selectedRecipeId) : Number(Object.keys(ownedRecipes)[0] || 1),
        selectedIngredientId: contestIngredientIds.has(Number(savedContest.selectedIngredientId)) ? Number(savedContest.selectedIngredientId) : Number(Object.keys(normalizedIngredients)[0] || GAME_INGREDIENTS.leaf.id),
        firstPlaceTierIds: [...new Set((savedContest.firstPlaceTierIds || []).map(Number).filter((id) => contestTierIds.has(id)))],
        judging: savedContest.judging && contestTierIds.has(Number(savedContest.judging.tierId))
          ? { ...savedContest.judging, elapsed: Math.max(0, Number(savedContest.judging.elapsed || 0)), duration: CONTEST_JUDGING_DURATION }
          : null,
        result: savedContest.result || null,
        history: Array.isArray(savedContest.history) ? savedContest.history.slice(0, 12) : [],
      },
      knowhow: savedKnowhow,
      specialVisitor: savedSpecialVisitor,
      ui: { ...defaults.ui, ...savedUi, selectedInstallId: null, screen: "restaurant", tab: "craft", area: buffetUnlockedInSave && savedUi.area === "buffet" ? "buffet" : "restaurant" },
      tutorial: savedTutorial,
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
        starterIngredientsGranted: true,
        history: parsed.crafting?.history || [],
        selected: (parsed.crafting?.selected || []).map(Number).filter((id) => ingredientData(id)).slice(0, migratedBowlCapacity),
        storageCapacity: migratedStorageCapacity,
        bowlCapacity: migratedBowlCapacity,
        hints: Object.fromEntries(Object.entries(parsed.crafting?.hints || {})
          .map(([recipeId, ingredientIds]) => [Number(recipeId), (Array.isArray(ingredientIds) ? ingredientIds : [])
            .map(Number).filter((ingredientId) => ingredientData(ingredientId))])
          .filter(([recipeId]) => progressionForRecipe(recipeId))),
      },
      facilityInteractions: {
        ...defaults.facilityInteractions,
        ...parsed.facilityInteractions,
        sinkWater: {
          ...defaults.facilityInteractions.sinkWater,
          ...parsed.facilityInteractions?.sinkWater,
          readyAt: Math.max(0, Number(parsed.facilityInteractions?.sinkWater?.readyAt || 0)),
          attempts: Math.max(0, Math.floor(Number(parsed.facilityInteractions?.sinkWater?.attempts || 0))),
          collected: Math.max(0, Math.floor(Number(parsed.facilityInteractions?.sinkWater?.collected || 0))),
        },
      },
      specialActors: (parsed.specialActors || []).map((actor) => ({
        ...actor,
        id: actor.id || `legacy-special-${actor.specialId || 1}`,
        type: actor.type || (Number(actor.specialId) === 1 ? "thief" : "merchant"),
        state: actor.state === "interacting" ? "waiting" : actor.state,
        timer: actor.state === "interacting" ? 0 : Number(actor.timer || 0),
        offers: Array.isArray(actor.offers) ? actor.offers.map((offer) => {
          const unitPrice = merchantIngredientUnitPrice(offer.ingredientId, savedKnowhow);
          return { ...offer, unitPrice, price: unitPrice * Math.max(1, Number(offer.quantity || 1)) };
        }) : actor.offers,
      })),
      specialLastSpawn: parsed.specialLastSpawn || {},
      ingredientDrops: parsed.ingredientDrops || [],
      dropSequence: Number(parsed.dropSequence || 1),
    };
  } catch (error) {
    console.error("저장 데이터를 불러오지 못했습니다.", error);
    return null;
  }
}

function saveState() {
  try {
    if (state?.specialPromotion) state.specialPromotion.lastUpdatedAt = Date.now();
    if (state?.specialVisitor) state.specialVisitor.lastUpdatedAt = Date.now();
    if (state?.buffet) state.buffet.lastUpdatedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch { /* storage is optional */ }
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

function localDateKey(date = new Date()) {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 10);
}

function knowhowSkill(id) {
  return KNOWHOW_SKILLS.find((skill) => skill.id === id) || KNOWHOW_SKILLS[0];
}

function knowhowSkillLevel(id, source = state?.knowhow) {
  return Math.max(0, Math.floor(Number(source?.skills?.[id] || 0)));
}

function normalizeKnowhow(saved, fallback, savedMetrics = {}) {
  const source = { ...fallback, ...(saved || {}) };
  const validIds = new Set(KNOWHOW_SKILLS.map((skill) => skill.id));
  const skills = { restaurant_basics: 1 };
  Object.entries(source.skills || {}).forEach(([id, level]) => {
    const skill = knowhowSkill(id);
    if (validIds.has(id)) skills[id] = Math.max(0, Math.min(skill.maxLevel, Math.floor(Number(level || 0))));
  });
  const legacyChains = {
    auto_collect: ["auto_collect_1", "auto_collect_2", "auto_collect_3"],
    auto_order: ["auto_order_1", "auto_order_2"],
    auto_promotion: ["auto_promotion_1"],
    drop_bonus: ["drop_bonus_1", "drop_bonus_2", "drop_bonus_3"],
    cooking_speed: ["cooking_speed_1", "cooking_speed_2", "cooking_speed_3"],
    research_speed: ["research_speed_1", "research_speed_2", "research_speed_3"],
    offline_bonus: ["offline_bonus_1", "offline_bonus_2"],
    contest_prize: ["contest_prize_1", "contest_prize_2"],
  };
  Object.entries(legacyChains).forEach(([legacyId, chain]) => {
    const legacyLevel = Math.max(0, Math.floor(Number(source.skills?.[legacyId] || 0)));
    chain.slice(0, legacyLevel).forEach((id) => { skills[id] = 1; });
  });
  const unlockLegacyPrerequisites = (ids) => ids.forEach((id) => { skills[id] = 1; });
  if (Number(source.skills?.auto_order || 0) > 0) unlockLegacyPrerequisites(["auto_collect_1", "auto_collect_2", "auto_collect_3"]);
  if (Number(source.skills?.auto_promotion || 0) > 0) unlockLegacyPrerequisites(["auto_collect_1", "auto_collect_2", "auto_collect_3", "auto_order_1", "auto_order_2", "auto_calm_1", "auto_calm_2"]);
  if (Number(source.skills?.research_speed || 0) > 0) unlockLegacyPrerequisites(["cooking_speed_1", "cooking_speed_2", "cooking_speed_3"]);
  if (Number(source.skills?.offline_bonus || 0) > 0) unlockLegacyPrerequisites(["cooking_speed_1", "cooking_speed_2", "cooking_speed_3", "research_speed_1", "research_speed_2", "research_speed_3"]);
  if (Number(source.skills?.contest_prize || 0) > 0) unlockLegacyPrerequisites(["cooking_speed_1", "cooking_speed_2", "cooking_speed_3", "research_speed_1", "research_speed_2", "research_speed_3", "offline_bonus_1", "offline_bonus_2"]);
  skills.restaurant_basics = 1;
  let earnedPoints = Math.max(0, Math.floor(Number(source.earnedPoints ?? savedMetrics.knowhowPointsEarned ?? 0)));
  let points = Math.max(0, Math.floor(Number(source.points || 0)));
  let xp = Math.max(0, Math.floor(Number(source.xp || 0)));
  while (xp >= KNOWHOW_XP_BASE + earnedPoints * KNOWHOW_XP_GROWTH) {
    xp -= KNOWHOW_XP_BASE + earnedPoints * KNOWHOW_XP_GROWTH;
    earnedPoints += 1;
    points += 1;
  }
  return {
    xp,
    points,
    earnedPoints,
    totalXp: Math.max(0, Math.floor(Number(source.totalXp || 0))),
    selectedSkillId: validIds.has(source.selectedSkillId) ? source.selectedSkillId : "auto_collect_1",
    skills,
    automation: {
      paymentElapsed: Math.max(0, Number(source.automation?.paymentElapsed ?? source.automation?.collectElapsed ?? 0)),
      ingredientElapsed: Math.max(0, Number(source.automation?.ingredientElapsed ?? source.automation?.collectElapsed ?? 0)),
      buffetElapsed: Math.max(0, Number(source.automation?.buffetElapsed || 0)),
      orderElapsed: Math.max(0, Number(source.automation?.orderElapsed || 0)),
      calmElapsed: Math.max(0, Number(source.automation?.calmElapsed || 0)),
      promotionElapsed: Math.max(0, Number(source.automation?.promotionElapsed || 0)),
    },
  };
}

function knowhowXpRequirement(source = state?.knowhow) {
  return KNOWHOW_XP_BASE + Math.max(0, Number(source?.earnedPoints || 0)) * KNOWHOW_XP_GROWTH;
}

function knowhowOwned(id, source = state?.knowhow) {
  return knowhowSkillLevel(id, source) > 0;
}

function knowhowAutoPaymentInterval(source = state?.knowhow) {
  if (knowhowOwned("auto_payment_3", source)) return 10;
  if (knowhowOwned("auto_payment_2", source)) return 20;
  return knowhowOwned("auto_collect_1", source) ? 30 : null;
}

function knowhowAutoIngredientInterval(source = state?.knowhow) {
  if (knowhowOwned("auto_ingredient_3", source)) return 10;
  if (knowhowOwned("auto_ingredient_2", source)) return 20;
  return knowhowOwned("auto_collect_2", source) ? 30 : null;
}

function knowhowAutoBuffetInterval(source = state?.knowhow) {
  if (knowhowOwned("auto_buffet_3", source)) return 20;
  if (knowhowOwned("auto_buffet_2", source)) return 40;
  return knowhowOwned("auto_collect_3", source) ? 60 : null;
}

function knowhowAutoOrderDelay(source = state?.knowhow) {
  if (knowhowOwned("auto_order_3", source)) return 1;
  if (knowhowOwned("auto_order_2", source)) return 2;
  if (knowhowOwned("auto_order_1", source)) return 5;
  return null;
}

function knowhowAutoPromotionInterval(source = state?.knowhow) {
  if (knowhowOwned("auto_promotion_3", source)) return 10;
  if (knowhowOwned("auto_promotion_2", source)) return 20;
  return knowhowOwned("auto_promotion_1", source) ? 30 : null;
}

function knowhowAutoCalmDelay(source = state?.knowhow) {
  if (knowhowOwned("auto_calm_3", source)) return 1;
  if (knowhowOwned("auto_calm_2", source)) return 2;
  if (knowhowOwned("auto_calm_1", source)) return 5;
  return null;
}

function knowhowDropBonus(source = state?.knowhow) {
  return (knowhowOwned("drop_bonus_1", source) ? .02 : 0)
    + (knowhowOwned("drop_bonus_2", source) ? .02 : 0)
    + (knowhowOwned("drop_bonus_3", source) ? .03 : 0);
}

function knowhowBonusIngredientChance(source = state?.knowhow) {
  const count = Array.from({ length: 10 }, (_, index) => `double_drop_${index + 1}`)
    .filter((id) => knowhowOwned(id, source)).length;
  return count * .005;
}

function knowhowStorageBonus(source = state?.knowhow) {
  return (knowhowOwned("storage_bonus_1", source) ? 5 : 0) + (knowhowOwned("storage_bonus_2", source) ? 5 : 0);
}

function knowhowMerchantDiscount(source = state?.knowhow) {
  return (knowhowOwned("merchant_discount_1", source) ? .1 : 0) + (knowhowOwned("merchant_discount_2", source) ? .1 : 0);
}

function knowhowCookingReduction(source = state?.knowhow) {
  return (knowhowOwned("cooking_speed_1", source) ? .03 : 0)
    + (knowhowOwned("cooking_speed_2", source) ? .04 : 0)
    + (knowhowOwned("cooking_speed_3", source) ? .05 : 0);
}

function knowhowResearchReduction(source = state?.knowhow) {
  return ["research_speed_1", "research_speed_2", "research_speed_3"]
    .reduce((sum, id) => sum + (knowhowOwned(id, source) ? .1 : 0), 0);
}

function knowhowBuffetIncomeMultiplier(source = state?.knowhow) {
  return 1 + ["buffet_income_1", "buffet_income_2"]
    .reduce((sum, id) => sum + (knowhowOwned(id, source) ? .1 : 0), 0);
}

function knowhowPrerequisitesMet(skill) {
  return skill.prerequisites.every((requirement) => knowhowSkillLevel(requirement.id) >= requirement.level);
}

function knowhowPrerequisiteText(skill) {
  if (!skill.prerequisites.length) return "기본 노하우";
  return skill.prerequisites.map((requirement) => knowhowSkill(requirement.id).name).join(" · ");
}

function knowhowUpgradeCost(skill) {
  return Number(skill.costs[knowhowSkillLevel(skill.id)] || 0);
}

function grantKnowhowXp(amount) {
  const gained = Math.max(0, Math.floor(Number(amount || 0)));
  if (!gained) return 0;
  state.knowhow.xp += gained;
  state.knowhow.totalXp += gained;
  state.metrics.knowhowXpEarned += gained;
  let pointsGained = 0;
  while (state.knowhow.xp >= knowhowXpRequirement()) {
    state.knowhow.xp -= knowhowXpRequirement();
    state.knowhow.points += 1;
    state.knowhow.earnedPoints += 1;
    pointsGained += 1;
  }
  if (pointsGained) {
    state.metrics.knowhowPointsEarned += pointsGained;
    showToast(`식당 노하우 포인트 +${pointsGained}`, 3);
    if (!dom.menuScreen.hidden && state.ui.screen === "knowhow") renderMenu();
  }
  return pointsGained;
}

function upgradeKnowhowSkill(id) {
  const skill = knowhowSkill(id);
  const current = knowhowSkillLevel(skill.id);
  const cost = knowhowUpgradeCost(skill);
  if (skill.id === "restaurant_basics" || current >= skill.maxLevel || !knowhowPrerequisitesMet(skill) || state.knowhow.points < cost) return false;
  state.knowhow.points -= cost;
  state.knowhow.skills[skill.id] = current + 1;
  state.knowhow.selectedSkillId = skill.id;
  state.metrics.knowhowUpgrades += 1;
  showToast(`${skill.icon} ${skill.name} 습득!`, 2.8);
  saveState();
  updateHud();
  renderMenu();
  return true;
}

function buffetOfflineCapSeconds(source = state?.knowhow) {
  const bonusHours = ["offline_bonus_1", "offline_bonus_2"].filter((id) => knowhowOwned(id, source)).length;
  return BUFFET_OFFLINE_CAP_SECONDS + bonusHours * 60 * 60;
}

function contestPrizeMultiplier(source = state?.knowhow) {
  const bonusLevels = ["contest_prize_1", "contest_prize_2"].filter((id) => knowhowOwned(id, source)).length;
  return 1 + bonusLevels * .1;
}

function recipeLevelPrice(recipe, owned) {
  return Number(recipe?.foodPrice || 0)
    * (1 + Math.max(0, Number(owned?.level || 1) - 1) * RECIPE_LEVEL_PRICE_BONUS);
}

function completedThemeIds() {
  return Object.keys(THEME_NAMES).map(Number).filter((themeId) => {
    const progress = themeChickProgress(themeId);
    return progress.total > 0 && progress.opened >= progress.total;
  });
}

function restaurantPriceUpMultiplier() {
  const opened = new Set((state.themes.opened || []).map(Number));
  const partBonus = tables.restaurantThemes.reduce((sum, row) => (
    opened.has(Number(row.id)) ? sum + Number(row.abilityValue || 0) : sum
  ), 0);
  const completionBonus = completedThemeIds().length * THEME_COMPLETION_MENU_PRICE_BONUS;
  return 1 + Math.max(0, partBonus + completionBonus);
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

function buffetPopularityMultiplierForCount(recipeCount) {
  return 1 + Math.max(0, Number(recipeCount || 0) - BUFFET_RECIPE_REQUIREMENT) * BUFFET_RECIPE_COLLECTION_BONUS;
}

function buffetStandCapacityForCount(recipeCount) {
  return BUFFET_STAND_UNLOCK_REQUIREMENTS.filter((requirement) => Number(recipeCount || 0) >= requirement).length;
}

function buffetStandCapacity() {
  return buffetStandCapacityForCount(unlockedRecipeCount());
}

function nextBuffetStandRequirement(recipeCount = unlockedRecipeCount()) {
  return BUFFET_STAND_UNLOCK_REQUIREMENTS.find((requirement, index) => index >= buffetStandCapacityForCount(recipeCount)) || null;
}

function buffetStandPositions(capacity = buffetStandCapacity()) {
  const count = Math.max(0, Math.min(BUFFET_MAX_STAND_COUNT, Number(capacity) || 0));
  let rowCounts;
  let rowYs;
  let width;
  let height;
  if (count <= 4) {
    rowCounts = [Math.min(2, count), Math.max(0, count - 2)];
    rowYs = [335, 505];
    width = 124;
    height = 94;
  } else if (count <= 6) {
    rowCounts = [3, count - 3];
    rowYs = [315, 485];
    width = 104;
    height = 80;
  } else {
    rowCounts = [3, 3, count - 6];
    rowYs = [275, 425, 575];
    width = 96;
    height = 72;
  }
  const xsForCount = (rowCount) => rowCount === 1 ? [240] : rowCount === 2 ? [145, 335] : [92, 240, 388];
  return rowCounts.flatMap((rowCount, rowIndex) => xsForCount(rowCount).map((x) => ({
    x,
    y: rowYs[rowIndex],
    w: width,
    h: height,
  })));
}

function buffetRecipeYield(recipeId, ownedRecipes = state?.ownedRecipes || {}) {
  const recipe = getRecipe(recipeId);
  const owned = ownedRecipes[Number(recipeId)] || ownedRecipes[String(recipeId)];
  if (!recipe || !owned) return 0;
  return Math.max(1, Math.round(recipeLevelPrice(recipe, owned) * BUFFET_RECIPE_YIELD_RATE));
}

function buffetYieldFromSnapshot(stands, ownedRecipes, knowhow = state?.knowhow) {
  const recipeCount = Object.keys(ownedRecipes || {}).filter((id) => getRecipe(Number(id))).length;
  const capacity = buffetStandCapacityForCount(recipeCount);
  const standYield = (stands || []).slice(0, capacity)
    .reduce((sum, recipeId) => sum + buffetRecipeYield(recipeId, ownedRecipes), 0);
  return Math.max(0, Math.round(standYield * buffetPopularityMultiplierForCount(recipeCount) * knowhowBuffetIncomeMultiplier(knowhow)));
}

function buffetPerMinute() {
  return buffetYieldFromSnapshot(state.buffet.stands, state.ownedRecipes);
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
  const rows = tables.restaurantThemes.filter((row) => row.facilityTheme === Number(themeId)
    && Number(row.purchaseType) === 1);
  if (Number(themeId) === 1) {
    const relevantTypes = new Set(rows.map((row) => Number(row.facilityType)));
    const installedTypes = new Set(installedRows()
      .map((row) => Number(row.facilityType))
      .filter((facilityType) => relevantTypes.has(facilityType)));
    return {
      opened: installedTypes.size,
      total: relevantTypes.size,
      ratio: relevantTypes.size ? installedTypes.size / relevantTypes.size : 0,
      basis: "installed-facility-types",
    };
  }
  const opened = rows.filter((row) => state.themes.opened.includes(row.id)).length;
  return {
    opened,
    total: rows.length,
    ratio: rows.length ? opened / rows.length : 0,
    basis: "owned-theme-part-types",
  };
}

function unlockedThemeChicks(themeId) {
  const milestones = themeChickMilestones(themeId);
  const { opened } = themeChickProgress(themeId);
  return milestones.filter((milestone) => opened >= Number(milestone.purchaseRequirement || 0));
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
  const baseCapacity = Math.max(INGREDIENT_STORAGE_INITIAL_CAPACITY, Number(state.crafting.storageCapacity || 0));
  const skillBonus = knowhowStorageBonus();
  const capacity = baseCapacity + skillBonus;
  return {
    usedSlots: totalItems,
    slotLimit: capacity,
    totalItems,
    totalLimit: capacity,
    capacity,
    baseCapacity,
    knowhowBonus: skillBonus,
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
  const profile = route?.rewardIngredients || route?.ingredientRequirements || [];
  return profile.slice(0, 2).map((ingredient, index) => ({
    ingredientId: ingredient.id,
    name: ingredient.name,
    emoji: ingredient.emoji,
    count: 1,
    slot: index === 0 ? "base" : "special",
    weight: profile.length === 1 ? 1 : index === 0 ? INGREDIENT_SLOT_WEIGHTS.base : INGREDIENT_SLOT_WEIGHTS.special,
    random: Boolean(ingredient.random),
  }));
}

function unlockedRecipeCount() {
  return Object.keys(state.ownedRecipes).filter((id) => recipeData(id)).length;
}

function recipeCombinationCapacity() {
  return Math.max(BOWL_CAPACITY_INITIAL, Math.min(BOWL_CAPACITY_MAX,
    Math.floor(Number(state.crafting.bowlCapacity) || BOWL_CAPACITY_INITIAL)));
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

function isThemePartAvailable(row) {
  return isThemeFacilityAvailable(row?.facilityType);
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
  if (!isThemePartAvailable(row) || row.purchaseType === 2) return;
  const key = RESOURCE_BY_ITEM[row.itemId];
  if (!key || state.resources[key] < row.facilityPrice) return;
  const chicksBefore = unlockedThemeChicks(row.facilityTheme).length;
  state.resources[key] -= row.facilityPrice;
  state.themes.opened.push(row.id);
  state.themes.activeByFacility[row.facilityType] = row.id;
  state.ui.themePartId = null;
  checkAndGrantAllCollect(row.facilityTheme);
  if (isThemeUnlocked(row.facilityTheme) && !state.themes.unlockedThemeIds.includes(row.facilityTheme)) {
    state.themes.unlockedThemeIds.push(row.facilityTheme);
  }
  dispatchAchievement(11, 1, 0, themeId);
  dispatchAchievement(10);
  const purchaseProgress = themeChickProgress(row.facilityTheme);
  const newlyUnlocked = unlockedThemeChicks(row.facilityTheme).slice(chicksBefore);
  showToast(newlyUnlocked.length
    ? `${THEME_NAMES[row.facilityTheme]} 파츠 ${purchaseProgress.opened}종 보유! ${newlyUnlocked.map((chick) => chick.customerName).join(", ")} 등장.`
    : `${FACILITY_META[row.facilityType]?.name || "설비"} 파츠 구매·적용 · ${purchaseProgress.opened}/${purchaseProgress.total}종`, 3);
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

function isRecipeSystemUnlocked() {
  return installedRows(8).length > 0;
}

function isIngredientDropUnlocked() {
  return installedRows(6).length > 0;
}

function isSpecialPromotionUnlocked() {
  return unlockedRecipeCount() >= SPECIAL_PROMOTION_RECIPE_REQUIREMENT
    && state.tutorial?.seen?.includes("special-promotion-unlocked");
}

function isBuffetUnlocked() {
  return unlockedRecipeCount() >= BUFFET_RECIPE_REQUIREMENT
    && state.tutorial?.seen?.includes("buffet-unlocked");
}

function isContestUnlocked() {
  return unlockedRecipeCount() >= CONTEST_RECIPE_REQUIREMENT
    && state.tutorial?.seen?.includes("contest-unlocked");
}

function ensureSpecialPromotionTutorial() {
  if (unlockedRecipeCount() < SPECIAL_PROMOTION_RECIPE_REQUIREMENT
    || state.tutorial?.seen?.includes("special-promotion-unlocked")
    || state.tutorial?.activeId) return false;
  state.tutorial.activeId = "special-promotion-unlocked";
  return true;
}

function ensureBuffetTutorial() {
  if (unlockedRecipeCount() < BUFFET_RECIPE_REQUIREMENT
    || state.tutorial?.seen?.includes("buffet-unlocked")
    || state.tutorial?.activeId) return false;
  state.tutorial.activeId = "buffet-unlocked";
  return true;
}

function ensureContestTutorial() {
  if (unlockedRecipeCount() < CONTEST_RECIPE_REQUIREMENT
    || state.tutorial?.seen?.includes("contest-unlocked")
    || state.tutorial?.activeId) return false;
  state.tutorial.activeId = "contest-unlocked";
  return true;
}

function ensureProgressionTutorial() {
  return ensureSpecialPromotionTutorial() || ensureContestTutorial() || ensureBuffetTutorial();
}

function showTutorialDialogue(dialogueId) {
  if (!TUTORIAL_DIALOGUES[dialogueId]) return false;
  state.tutorial ||= { activeId: null, seen: [] };
  state.tutorial.activeId = dialogueId;
  saveState();
  updateTutorialDialogue();
  return true;
}

function advanceTutorialDialogue() {
  const dialogueId = state.tutorial?.activeId;
  if (!dialogueId) return;
  state.tutorial.seen = [...new Set([...(state.tutorial.seen || []), dialogueId])];
  state.tutorial.activeId = dialogueId === "recipe-unlocked" && !isIngredientDropUnlocked()
    ? "fridge-next"
    : null;
  ensureProgressionTutorial();
  saveState();
  updateTutorialDialogue();
  updateHud();
}

function updateTutorialDialogue() {
  const dialogueId = state?.tutorial?.activeId;
  const text = TUTORIAL_DIALOGUES[dialogueId];
  dom.chefDialogue.hidden = !text || !dom.menuScreen.hidden || !dom.installPanel.hidden
    || !dom.specialPromoPanel.hidden || !dom.offlineRewardPanel.hidden;
  dom.chefDialogueText.textContent = text || "";
}

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
  const route = progressionForRecipe(numericId);
  if (!route) return row || null;
  const base = row || tables.recipes.get(Number(route.baseRecipeId));
  if (!base) return null;
  const configuredPrice = Number(route.foodPrice ?? base.foodPrice);
  const foodPrice = route.hasPrototypePriceOverride
    ? configuredPrice
    : Math.max(configuredPrice, Number(route.minimumFoodPrice || 0));
  return { ...base, id: numericId, foodPrice };
}

function baseRecipeCookingDuration(recipe) {
  const price = Math.max(0, Number(recipe?.foodPrice || 0));
  const rawDuration = COOKING_TIME_BASE_SECONDS + price / COOKING_PRICE_PER_SECOND;
  const steppedDuration = Math.round(rawDuration / COOKING_TIME_STEP_SECONDS) * COOKING_TIME_STEP_SECONDS;
  return Math.max(COOKING_TIME_MIN_SECONDS, Math.min(COOKING_TIME_MAX_SECONDS, steppedDuration));
}

function recipeCookingDuration(recipe, level = 1, knowhow = state?.knowhow) {
  const reductions = {
    1: Number(tables.recipeSetting.MenuCoolDownNormal || 0),
    2: Number(tables.recipeSetting.MenuCoolDownFancy || 0),
    3: Number(tables.recipeSetting.MenuCoolDownSpecial || 0),
  };
  const levelReduction = Math.max(0, Number(level || 1) - 1) * (reductions[recipe?.recipeGrade] || 0);
  const knowhowReduction = knowhowCookingReduction(knowhow);
  return Math.max(Number(tables.recipeSetting.CookTimeLimit || 2), baseRecipeCookingDuration(recipe) * Math.max(0, 1 - levelReduction) * (1 - knowhowReduction));
}

function formatCookingDuration(seconds) {
  const duration = Math.round(Number(seconds || 0) * 10) / 10;
  return Number.isInteger(duration) ? `${duration}초` : `${duration.toFixed(1)}초`;
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
  dom.toast.className = "toast";
  delete dom.toast.dataset.variant;
  dom.toast.textContent = message;
  dom.toast.hidden = false;
  toastTimer = seconds;
}

function displayFirstGuestToast(guest, seconds = 4) {
  const customerName = guest.customerName || progressionForCustomer(guest.customerId)?.customerName || "새로운 병아리";
  dom.guestToast.innerHTML = `<img class="new-guest-toast-icon" src="${guestIcon(guest)}" alt="" />
    <span class="new-guest-toast-copy"><small>새로운 손님 첫 방문!</small><strong>${customerName}</strong><em>손님 도감에 등록됐어요</em></span>
    <b class="new-guest-toast-badge">NEW</b>`;
  dom.guestToast.hidden = false;
  guestToastTimer = seconds;
}

function showFirstGuestToast(guest) {
  if (!dom.guestToast.hidden && guestToastTimer > 0) {
    guestToastQueue.push(guest);
    return;
  }
  displayFirstGuestToast(guest);
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
    dom.recipeReveal.innerHTML = `<section class="recipe-upgrade-card" role="dialog" aria-modal="true" aria-label="요리 레벨업">
      <span class="recipe-upgrade-kicker">요리 레벨업</span>
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
    <section class="recipe-reveal-card ${isWeird ? "is-weird" : ""}" role="dialog" aria-modal="true" aria-label="${isWeird ? "요리 연구 실패" : "새 요리 발견"}">
      <span class="recipe-reveal-kicker">${isWeird ? "연구 실패!" : "새 요리 발견!"}</span>
      <div class="recipe-reveal-dish"><span class="recipe-reveal-glow"></span><img src="${isWeird ? WEIRD_DISH_ICON : routeRecipeIcon(recipeId)}" alt="" /></div>
      <h3>${isWeird ? "괴식" : routeRecipeName(recipeId)}</h3>
      <p>${isWeird ? "사용한 재료는 사라졌어요" : recipeReveal.automatic ? "자동 연구가 새 조합을 찾았어요" : "보울 속 재료가 새로운 요리가 됐어요"}</p>
      ${recipeReveal.buffetStandUnlocked ? `<strong class="recipe-reveal-buffet">🍽️ 뷔페 진열대 +${recipeReveal.buffetStandUnlocked} · 총 ${recipeReveal.buffetStandCapacity}칸</strong>` : ""}
      <button type="button" data-action="dismiss-recipe-reveal">${isWeird ? "치우기" : "짜잔!"}</button>
    </section>`;
  dom.recipeReveal.hidden = false;
}

function dismissRecipeReveal() {
  const pendingProgressionDialogue = state?.tutorial?.activeId;
  const shouldSurfaceProgressionTutorial = ["special-promotion-unlocked", "contest-unlocked", "buffet-unlocked"].includes(pendingProgressionDialogue)
    && !state.tutorial?.seen?.includes(pendingProgressionDialogue);
  recipeReveal = null;
  if (recipeRevealTimer) window.clearTimeout(recipeRevealTimer);
  recipeRevealTimer = 0;
  renderRecipeReveal();
  if (shouldSurfaceProgressionTutorial && !dom.menuScreen.hidden) {
    state.ui.screen = "restaurant";
    dom.menuScreen.hidden = true;
    setActiveNav("");
    saveState();
  }
  updateTutorialDialogue();
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
  updateTutorialDialogue();
  render();
}

function openInstallPanel(row) {
  if (!row || isInstalled(row.id)) return;
  if (!dom.menuScreen.hidden) closeMenu();
  const meta = FACILITY_META[row.facilityType] || FACILITY_META[1];
  state.ui.selectedInstallId = row.id;
  dom.installIcon.src = meta.icon;
  dom.installName.textContent = row.facilityGroup > 1 ? `${meta.name} ${row.facilityGroup}` : meta.name;
  dom.installDescription.textContent = meta.description;
  dom.installCost.textContent = formatNumber(row.facilityPrice);
  dom.installConfirm.disabled = state.resources.acorns < row.facilityPrice;
  dom.installPanel.hidden = false;
  updateTutorialDialogue();
  render();
}

function confirmInstall() {
  const row = tables.installs.find((item) => item.id === Number(state.ui.selectedInstallId));
  if (!row || isInstalled(row.id)) return closeInstallPanel();
  if (state.resources.acorns < row.facilityPrice) {
    showToast("도토리가 부족해요.");
    return;
  }
  const chicksBefore = unlockedThemeChicks(1).length;
  state.resources.acorns -= Number(row.facilityPrice);
  state.installed.push(row.id);
  state.installed.sort((a, b) => a - b);
  if (Number(row.facilityType) === 7) {
    state.facilityInteractions.sinkWater.readyAt = state.clock + SINK_WATER_COOLDOWN_SECONDS;
  }
  dispatchAchievement(12, 1, 0, row.id);
  if (Number(row.facilityType) === 8) state.tutorial.activeId = "recipe-unlocked";
  if (Number(row.facilityType) === 6) state.tutorial.activeId = "drops-unlocked";
  const newlyUnlocked = unlockedThemeChicks(1).slice(chicksBefore);
  closeInstallPanel();
  const meta = FACILITY_META[row.facilityType] || FACILITY_META[1];
  if (newlyUnlocked.length) {
    showToast(`설비 설치 진척! ${newlyUnlocked.map((chick) => chick.customerName).join(", ")} 등장.`, 3);
  } else if (![6, 8].includes(Number(row.facilityType))) {
    showToast(`${row.facilityGroup > 1 ? `${meta.name} ${row.facilityGroup}` : meta.name} 설치 완료!`);
  }
  saveState();
  updateHud();
}

function promotionThreshold() { return 1; }

function formatPromotionTimer(seconds) {
  const total = Math.max(0, Math.ceil(Number(seconds) || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function specialPromotionChoices() {
  const choices = new Map();
  allUnlockedThemeChicks().forEach((chick) => {
    const visits = Number(state.collections.customers[chick.customerId]?.count || 0);
    guestRewardItems(chick, visits).forEach((reward) => {
      if (reward.random) return;
      const current = choices.get(reward.ingredientId) || {
        ingredientId: reward.ingredientId,
        name: reward.name,
        emoji: reward.emoji,
        guests: [],
      };
      if (!current.guests.some((guest) => guest.customerId === chick.customerId)) current.guests.push(chick);
      choices.set(reward.ingredientId, current);
    });
  });
  return [...choices.values()].sort((a, b) => a.name.localeCompare(b.name, "ko") || a.ingredientId - b.ingredientId);
}

const SPECIAL_PROMOTION_SLOT_META = Object.freeze([
  { key: "base", label: "기본 재료", requiredVisits: Number(GUEST_GRADES[0]?.minVisits || 1), weight: INGREDIENT_SLOT_WEIGHTS.base },
  { key: "special", label: "특별 재료", requiredVisits: Number(GUEST_GRADES[0]?.minVisits || 1), weight: INGREDIENT_SLOT_WEIGHTS.special },
]);

function specialPromotionIngredientSources(ingredientId) {
  const numericId = Number(ingredientId);
  return allUnlockedThemeChicks().flatMap((chick) => {
    const rewards = guestRewardItems(chick, Number(state.collections.customers[chick.customerId]?.count || 0));
    const slotIndex = rewards.findIndex((reward) => Number(reward.ingredientId) === numericId);
    if (slotIndex < 0 || slotIndex >= SPECIAL_PROMOTION_SLOT_META.length) return [];
    const visits = Number(state.collections.customers[chick.customerId]?.count || 0);
    const slot = SPECIAL_PROMOTION_SLOT_META[slotIndex];
    const reward = rewards[slotIndex];
    const eligible = Boolean(reward);
    return [{
      customerId: chick.customerId,
      customerName: chick.customerName,
      commonId: chick.commonId,
      icon: guestIcon(chick),
      slot: slot.key,
      slotLabel: slot.label,
      weight: Number(reward?.weight ?? slot.weight),
      visits,
      requiredVisits: slot.requiredVisits,
      eligible,
    }];
  }).sort((a, b) => Number(b.eligible) - Number(a.eligible)
    || a.requiredVisits - b.requiredVisits
    || a.customerName.localeCompare(b.customerName, "ko"));
}

function closeSpecialPromotionDetail() {
  specialPromotionDetailIngredientId = null;
  dom.specialPromoDetail.hidden = true;
  dom.specialPromoDetail.innerHTML = "";
}

function openSpecialPromotionDetail(ingredientId) {
  const choice = specialPromotionChoices().find((item) => item.ingredientId === Number(ingredientId));
  if (!choice) return;
  specialPromotionDetailIngredientId = choice.ingredientId;
  const sources = specialPromotionIngredientSources(choice.ingredientId);
  dom.specialPromoDetail.innerHTML = `<div class="special-promotion-detail-card" role="dialog" aria-modal="true" aria-label="${choice.name} 드랍 손님">
    <button type="button" class="special-promotion-detail-close" data-action="close-special-promotion-detail" aria-label="닫기">×</button>
    <div class="special-promotion-detail-title"><span>${choice.emoji}</span><div><small>재료 출처</small><strong>${choice.name}</strong><em>보유 ${ingredientAmount(choice.ingredientId)}개</em></div></div>
    <p class="special-promotion-detail-rule">재료 드랍 ${Math.round(GUEST_INGREDIENT_DROP_CHANCE * 100)}% · 아래 비율은 드랍 성공 시</p>
    <div class="special-promotion-source-list">${sources.map((source) => `<article class="special-promotion-source ${source.eligible ? "is-ready" : "is-locked"}">
      <img src="${source.icon}" alt="" />
      <div><strong>${source.customerName}</strong><span>${source.slotLabel} · ${Math.round(source.weight * 100)}%</span></div>
      <small>${source.eligible ? "획득 가능" : `${source.requiredVisits}회 방문 시`}</small>
    </article>`).join("") || `<p class="special-promotion-empty">해금된 손님 중 드랍하는 손님이 없어요.</p>`}</div>
    <button type="button" class="special-promotion-detail-confirm" data-action="confirm-special-promotion" data-ingredient-id="${choice.ingredientId}">이 재료로 홍보</button>
  </div>`;
  dom.specialPromoDetail.hidden = false;
}

function renderSpecialPromotionChoices(query = dom.specialPromoSearch.value) {
  const normalizedQuery = String(query || "").trim().toLocaleLowerCase("ko");
  const choices = specialPromotionChoices().filter((choice) => !normalizedQuery
    || choice.name.toLocaleLowerCase("ko").includes(normalizedQuery)
    || choice.guests.some((guest) => guest.customerName.toLocaleLowerCase("ko").includes(normalizedQuery)));
  dom.specialPromoList.innerHTML = choices.length ? choices.map((choice) => `<button type="button" class="special-promotion-choice" data-ingredient-id="${choice.ingredientId}" title="${choice.guests.map((guest) => guest.customerName).join(", ")}"><span>${choice.emoji}</span><strong>${choice.name}</strong><small>손님 ${choice.guests.length}종</small></button>`).join("")
    : `<p class="special-promotion-empty">찾을 수 있는 재료가 없어요.</p>`;
}

function closeSpecialPromotionPanel() {
  closeSpecialPromotionDetail();
  dom.specialPromoPanel.hidden = true;
  dom.specialPromoSearch.value = "";
  updateTutorialDialogue();
}

function openSpecialPromotionPanel() {
  if (!isSpecialPromotionUnlocked() || state.specialPromotion.remaining > 0 || state.specialPromotion.cooldown > 0) return;
  if (!dom.installPanel.hidden) closeInstallPanel();
  closeMenu();
  dom.specialPromoPanel.hidden = false;
  dom.specialPromoSearch.value = "";
  closeSpecialPromotionDetail();
  renderSpecialPromotionChoices();
  updateTutorialDialogue();
  requestAnimationFrame(() => dom.specialPromoSearch.focus());
}

function startSpecialPromotion(ingredientId) {
  if (!isSpecialPromotionUnlocked() || state.specialPromotion.remaining > 0 || state.specialPromotion.cooldown > 0) return false;
  const choice = specialPromotionChoices().find((item) => item.ingredientId === Number(ingredientId));
  if (!choice?.guests.length) return false;
  state.specialPromotion.ingredientId = choice.ingredientId;
  state.specialPromotion.remaining = SPECIAL_PROMOTION_DURATION;
  state.specialPromotion.cooldown = 0;
  const openSeatCount = availableSeats().length;
  const invitationCount = Math.max(3, openSeatCount);
  state.promotion.queued += invitationCount;
  state.promotion.queueTargets ||= [];
  state.promotion.queueTargets.push(...Array.from({ length: invitationCount }, () => choice.ingredientId));
  closeSpecialPromotionPanel();
  for (let index = 0; index < openSeatCount; index += 1) trySpawnQueuedGuest();
  showToast(`${choice.emoji} ${choice.name} 특별 홍보 시작!`, 3);
  saveState();
  updateHud();
  render();
  return true;
}

function updateSpecialPromotion(dt) {
  const beforeRemaining = Math.ceil(state.specialPromotion.remaining);
  const beforeCooldown = Math.ceil(state.specialPromotion.cooldown);
  let elapsed = Math.max(0, Number(dt) || 0);
  if (state.specialPromotion.remaining > 0) {
    const activeElapsed = Math.min(state.specialPromotion.remaining, elapsed);
    state.specialPromotion.remaining = Math.max(0, state.specialPromotion.remaining - activeElapsed);
    elapsed -= activeElapsed;
    if (state.specialPromotion.remaining <= .0001) {
      state.specialPromotion.remaining = 0;
      state.specialPromotion.ingredientId = null;
      state.specialPromotion.cooldown = SPECIAL_PROMOTION_COOLDOWN;
    }
  }
  if (state.specialPromotion.remaining <= 0 && elapsed > 0) {
    state.specialPromotion.cooldown = Math.max(0, state.specialPromotion.cooldown - elapsed);
    if (state.specialPromotion.cooldown <= .0001) state.specialPromotion.cooldown = 0;
  }
  if (beforeRemaining !== Math.ceil(state.specialPromotion.remaining)
    || beforeCooldown !== Math.ceil(state.specialPromotion.cooldown)) saveState();
}

function promote() {
  if (!coreReady()) return;
  dispatchAchievement(3);
  state.promotion.totalClicks += 1;
  state.promotion.progress = 0;
  state.promotion.queued += 1;
  state.promotion.queueTargets ||= [];
  state.promotion.queueTargets.push(state.specialPromotion.remaining > 0 ? state.specialPromotion.ingredientId : null);
  trySpawnQueuedGuest();
  saveState();
  updateHud();
  render();
}

function chooseCustomer(targetIngredientId = state.specialPromotion.remaining > 0 ? state.specialPromotion.ingredientId : null) {
  const normalCustomers = allUnlockedThemeChicks().map((chick) => ({
    id: chick.customerId,
    assetType: 105,
    assetId: chick.commonId,
    customerAppearWeight: 100,
    chickMilestone: chick,
  }));
  const targetedCustomerIds = targetIngredientId
    ? new Set((specialPromotionChoices().find((choice) => choice.ingredientId === Number(targetIngredientId))?.guests || [])
      .map((chick) => chick.customerId))
    : null;
  const targetedCustomers = targetedCustomerIds
    ? normalCustomers.filter((customer) => targetedCustomerIds.has(customer.id))
    : [];
  const eligible = targetedCustomerIds?.size ? targetedCustomers : normalCustomers;
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
  state.promotion.queueTargets ||= [];
  const queuedTarget = state.specialPromotion.remaining > 0
    ? state.specialPromotion.ingredientId
    : state.promotion.queueTargets[0] || null;
  const customer = chooseCustomer(queuedTarget);
  if (customer?.assetType === 107) {
    spawnSpecialCustomer(customer.assetId);
    state.promotion.queued -= 1;
    if (state.promotion.queueTargets.length) state.promotion.queueTargets.shift();
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
  if (state.promotion.queueTargets.length) state.promotion.queueTargets.shift();
  state.metrics.visitors += 1;
  const isFirstVisit = !state.collections.customers[customer.id];
  registerCollection(customer.id, "customers");
  guest.visitNumber = Number(state.collections.customers[customer.id]?.count || 1);
  dispatchAchievement(14);
  if (isFirstVisit) showFirstGuestToast(guest);
}

function shuffleWithGameRandom(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function obtainableSpecialVisitorIngredients() {
  const choices = specialPromotionChoices().map((choice) => ({
    id: choice.ingredientId,
    name: choice.name,
    emoji: choice.emoji,
  }));
  if (!choices.length) {
    const leaf = ingredientData(GAME_INGREDIENTS.leaf.id);
    return [{ id: leaf.id, name: leaf.ingredientName, emoji: leaf.emoji }];
  }
  return choices;
}

function futureSpecialVisitorIngredients() {
  const obtainable = new Set(obtainableSpecialVisitorIngredients().map((ingredient) => ingredient.id));
  const future = new Map();
  CORE_PROGRESSION.forEach((route) => route.rewardIngredients.forEach((ingredient) => {
    if (!obtainable.has(ingredient.id)) future.set(ingredient.id, { id: ingredient.id, name: ingredient.name, emoji: ingredient.emoji });
  }));
  return [...future.values()];
}

function ingredientMerchantProgressionStage(ingredientId) {
  return CORE_PROGRESSION.reduce((earliestStage, chickRoute) => {
    const rewardIndex = chickRoute.rewardIngredients.findIndex((ingredient) => ingredient.id === Number(ingredientId));
    if (rewardIndex < 0) return earliestStage;
    // Merchant pricing follows the theme/chick acquisition order only. It is
    // intentionally independent from the Excel-authored recipe display order.
    const stage = (chickRoute.themeId - 1) * 9 + chickRoute.slot * 2;
    return Math.min(earliestStage, stage);
  }, Number.POSITIVE_INFINITY);
}

function merchantIngredientUnitPrice(ingredientId, knowhow = state?.knowhow) {
  const rawStage = ingredientMerchantProgressionStage(ingredientId);
  const stage = Number.isFinite(rawStage) ? Math.max(0, rawStage) : 0;
  const themeIndex = Math.floor(stage / 9);
  const withinThemeStage = stage % 9;
  const basePrice = MERCHANT_THEME_BASE_PRICES[themeIndex]
    ?? MERCHANT_THEME_BASE_PRICES[2] * MERCHANT_LATE_THEME_MULTIPLIER ** (themeIndex - 2);
  const originalPrice = Math.max(10, Math.round(basePrice * (1 + withinThemeStage * MERCHANT_STAGE_PRICE_STEP) / 10) * 10);
  return Math.max(10, Math.round(originalPrice * (1 - knowhowMerchantDiscount(knowhow)) / 10) * 10);
}

function buildMerchantOffers() {
  return shuffleWithGameRandom(obtainableSpecialVisitorIngredients()).slice(0, 3).map((ingredient, index) => {
    const quantity = 1 + Math.floor(random() * 2);
    const unitPrice = merchantIngredientUnitPrice(ingredient.id);
    return { id: index + 1, ingredientId: ingredient.id, name: ingredient.name, emoji: ingredient.emoji, quantity, unitPrice, price: quantity * unitPrice, sold: false };
  });
}

function buildTradeOffer() {
  const owned = storedIngredientIds().filter((ingredientId) => ingredientAmount(ingredientId) >= 2);
  const requestId = owned[Math.floor(random() * owned.length)] || GAME_INGREDIENTS.leaf.id;
  const obtainable = obtainableSpecialVisitorIngredients().filter((ingredient) => ingredient.id !== requestId);
  const future = futureSpecialVisitorIngredients();
  const useFuture = future.length > 0 && (random() < FUTURE_TRADE_CHANCE || !obtainable.length);
  const candidates = useFuture ? future : obtainable;
  const reward = candidates[Math.floor(random() * candidates.length)] || ingredientData(requestId);
  const request = ingredientData(requestId);
  return {
    requestIngredientId: requestId,
    requestName: request.ingredientName,
    requestEmoji: request.emoji,
    requestCount: 2,
    rewardIngredientId: reward.id,
    rewardName: reward.name || reward.ingredientName,
    rewardEmoji: reward.emoji,
    rewardCount: 1,
    isFuture: useFuture,
    completed: false,
  };
}

function chooseSpecialVisitorType() {
  const types = Object.keys(SPECIAL_VISITOR_TYPES).filter((type) => type !== state.specialVisitor.lastType);
  return types[Math.floor(random() * types.length)] || "thief";
}

function spawnSpecialVisitor(type = chooseSpecialVisitorType()) {
  if (!SPECIAL_VISITOR_TYPES[type] || state.specialActors.some((actor) => actor.state !== "gone")) return false;
  const actor = {
    id: `special-visitor-${state.specialVisitor.sequence++}`,
    type,
    specialId: type === "thief" ? 1 : null,
    x: 28,
    y: 470,
    targetX: 410,
    targetY: 595,
    state: "approaching",
    timer: 0,
    stolen: 0,
    offers: type === "merchant" ? buildMerchantOffers() : null,
    trade: type === "trader" ? buildTradeOffer() : null,
  };
  state.specialActors.push(actor);
  state.specialVisitor.lastType = type;
  state.specialVisitor.nextAt = state.clock + SPECIAL_VISITOR_INTERVAL;
  state.metrics.specialVisitors += 1;
  if (type === "thief") registerCollection(1, "specialCustomers");
  const messages = {
    thief: "도둑이 팁박스를 노리고 있어요! 눌러서 잡으세요.",
    merchant: "재료 상인이 왔어요! 눌러서 상품을 확인하세요.",
    fairy: "바람의 요정이 찾아왔어요! 눌러서 도움을 받아보세요.",
    trader: "재료 교환상이 왔어요! 눌러서 제안을 확인하세요.",
  };
  showToast(messages[type], 4);
  saveState();
  return true;
}

function spawnSpecialCustomer(specialId) {
  return spawnSpecialVisitor(Number(specialId) === 1 ? "thief" : "merchant");
}

function finishSpecialVisitor(actor, stateName = "caught") {
  actor.state = stateName;
  actor.targetX = 28;
  actor.targetY = 470;
  saveState();
}

function catchSpecial(actor) {
  if (!actor || actor.type !== "thief" || actor.state === "caught") return;
  if (actor.stolen > 0) state.tipbox = Math.min(state.tipboxCapacity, state.tipbox + actor.stolen);
  finishSpecialVisitor(actor, "caught");
  showToast("도둑을 잡고 팁을 지켰어요!");
}

function specialVisitorActorFromPanel() {
  return state.specialActors.find((actor) => actor.id === dom.specialVisitorPanel.dataset.actorId);
}

function closeSpecialVisitorPanel(leave = true) {
  const actor = specialVisitorActorFromPanel();
  dom.specialVisitorPanel.hidden = true;
  dom.specialVisitorPanel.dataset.actorId = "";
  if (leave && actor?.state === "interacting") finishSpecialVisitor(actor, "escaping");
}

function renderSpecialVisitorPanel(actor) {
  const meta = SPECIAL_VISITOR_TYPES[actor.type];
  dom.specialVisitorIcon.src = meta.icon;
  dom.specialVisitorTitle.textContent = meta.name;
  if (actor.type === "thief") {
    dom.specialVisitorMessage.textContent = "팁 상자를 노리고 몰래 들어온 도둑이에요!";
    dom.specialVisitorContent.innerHTML = `<div class="special-visitor-explanation"><span aria-hidden="true">🚨</span><div><strong>팁을 훔쳐 달아나려고 해요</strong><p>지금 잡으면 팁 상자의 도토리를 안전하게 지킬 수 있어요.</p></div></div><button type="button" class="special-trade-button" data-special-action="catch">도둑 잡기</button>`;
  } else if (actor.type === "fairy") {
    dom.specialVisitorMessage.textContent = "바람을 불러 손님들의 재료 선물을 늘려주는 요정이에요!";
    dom.specialVisitorContent.innerHTML = `<div class="special-visitor-explanation is-fairy"><span aria-hidden="true">🍃</span><div><strong>1분간 재료 드랍 확률 2배</strong><p>모든 손님의 재료 드랍 확률이 15%에서 30%로 올라가요.</p></div></div><button type="button" class="special-trade-button" data-special-action="fairy">도움 받기</button>`;
  } else if (actor.type === "merchant") {
    dom.specialVisitorMessage.textContent = "무작위 재료를 판매하는 여행 상인이에요. 오늘의 상품을 골라보세요!";
    dom.specialVisitorContent.innerHTML = actor.offers.map((offer) => `<article class="merchant-offer"><span>${offer.emoji}</span><div><strong>${offer.name} ×${offer.quantity}</strong><small>${offer.sold ? "판매 완료" : `보유 ${ingredientAmount(offer.ingredientId)}개 · 개당 ${formatNumber(offer.unitPrice)}`}</small></div><button type="button" data-special-action="buy" data-offer-id="${offer.id}" ${offer.sold || state.resources.acorns < offer.price ? "disabled" : ""}>🌰 ${formatNumber(offer.price)}</button></article>`).join("");
  } else if (actor.type === "trader") {
    const trade = actor.trade;
    const canTrade = ingredientAmount(trade.requestIngredientId) >= trade.requestCount && !trade.completed;
    dom.specialVisitorMessage.textContent = "재료 2개를 다른 재료 1개로 바꿔주는 교환상이에요!";
    dom.specialVisitorContent.innerHTML = `<div class="special-trade-card"><div class="special-trade-item"><span>${trade.requestEmoji}</span><strong>${trade.requestName} ×${trade.requestCount}</strong><small>보유 ${ingredientAmount(trade.requestIngredientId)}개</small></div><div class="special-trade-arrow">→</div><div class="special-trade-item"><span>${trade.rewardEmoji}</span><strong>${trade.rewardName} ×${trade.rewardCount}</strong><small>${trade.isFuture ? "희귀 제안" : "교환 재료"}</small></div></div>${trade.isFuture ? `<p class="special-trade-rare">아직 평소에는 얻을 수 없는 재료예요!</p>` : ""}<button type="button" class="special-trade-button" data-special-action="trade" ${canTrade ? "" : "disabled"}>교환하기</button>`;
  }
}

function openSpecialVisitorPanel(actor) {
  if (!actor || !SPECIAL_VISITOR_TYPES[actor.type]) return;
  if (!dom.installPanel.hidden) closeInstallPanel();
  closeMenu();
  closeSpecialPromotionPanel();
  toggleDebugPanel(false);
  dom.toast.hidden = true;
  toastTimer = 0;
  actor.state = "interacting";
  actor.timer = 0;
  dom.specialVisitorPanel.dataset.actorId = actor.id;
  renderSpecialVisitorPanel(actor);
  dom.specialVisitorPanel.hidden = false;
  saveState();
}

function buySpecialVisitorOffer(offerId) {
  const actor = specialVisitorActorFromPanel();
  const offer = actor?.offers?.find((item) => item.id === Number(offerId));
  if (!offer || offer.sold) return false;
  if (state.resources.acorns < offer.price) return showToast("도토리가 부족해요.");
  if (ingredientStorageStatus().remaining < offer.quantity) return showToast("냉장고에 자리가 부족해요.");
  state.resources.acorns -= offer.price;
  state.crafting.ingredients[offer.ingredientId] = ingredientAmount(offer.ingredientId) + offer.quantity;
  offer.sold = true;
  state.metrics.merchantPurchases += 1;
  showToast(`${offer.emoji} ${offer.name} ×${offer.quantity} 구매!`);
  saveState();
  updateHud();
  renderSpecialVisitorPanel(actor);
  return true;
}

function acceptSpecialVisitorTrade() {
  const actor = specialVisitorActorFromPanel();
  const trade = actor?.trade;
  if (!trade || trade.completed || ingredientAmount(trade.requestIngredientId) < trade.requestCount) return false;
  const remaining = ingredientAmount(trade.requestIngredientId) - trade.requestCount;
  if (remaining > 0) state.crafting.ingredients[trade.requestIngredientId] = remaining;
  else delete state.crafting.ingredients[trade.requestIngredientId];
  state.crafting.ingredients[trade.rewardIngredientId] = ingredientAmount(trade.rewardIngredientId) + trade.rewardCount;
  trade.completed = true;
  state.metrics.trades += 1;
  if (trade.isFuture) state.metrics.futureTrades += 1;
  showToast(`${trade.rewardEmoji} ${trade.rewardName} ×${trade.rewardCount} 교환 완료!`, 3);
  closeSpecialVisitorPanel(false);
  finishSpecialVisitor(actor, "escaping");
  updateHud();
  return true;
}

function catchSpecialVisitorFromPanel() {
  const actor = specialVisitorActorFromPanel();
  if (!actor || actor.type !== "thief") return false;
  closeSpecialVisitorPanel(false);
  catchSpecial(actor);
  updateHud();
  return true;
}

function acceptWindFairyBlessing() {
  const actor = specialVisitorActorFromPanel();
  if (!actor || actor.type !== "fairy") return false;
  state.specialVisitor.dropBoostRemaining = Math.max(state.specialVisitor.dropBoostRemaining, WIND_FAIRY_DURATION);
  state.metrics.fairyBuffs += 1;
  closeSpecialVisitorPanel(false);
  finishSpecialVisitor(actor, "escaping");
  showToast("재료 드랍 확률이 1분간 2배가 되었어요!", 3);
  updateHud();
  return true;
}

function interactSpecialVisitor(actor) {
  if (!actor || ["escaping", "caught", "gone"].includes(actor.state)) return;
  if (actor.type !== "thief" && actor.state !== "waiting") return;
  openSpecialVisitorPanel(actor);
}

function updateSpecialCustomers(dt) {
  if (state.specialVisitor.dropBoostRemaining > 0) {
    state.specialVisitor.dropBoostRemaining = Math.max(0, state.specialVisitor.dropBoostRemaining - dt);
  }
  if (coreReady() && state.clock >= state.specialVisitor.nextAt && !state.specialActors.length) spawnSpecialVisitor();
  for (const actor of state.specialActors) {
    actor.timer += dt;
    if (actor.state === "approaching" && moveTowards(actor, actor.targetX, actor.targetY, 90, dt)) {
      actor.timer = 0;
      if (actor.type === "thief") {
        actor.stolen = Math.floor(state.tipbox * Number(tables.customerSetting.ThiefTipBoxAmount || .5));
        state.tipbox -= actor.stolen;
        actor.state = "escaping";
        actor.targetX = 28;
        actor.targetY = 470;
      } else {
        actor.state = "waiting";
      }
    } else if (actor.state === "waiting" && actor.timer >= SPECIAL_VISITOR_WAIT_DURATION) {
      actor.state = "escaping";
      actor.targetX = 28;
      actor.targetY = 470;
    } else if ((actor.state === "escaping" || actor.state === "caught") && moveTowards(actor, actor.targetX, actor.targetY, actor.state === "caught" ? 220 : 120, dt)) {
      actor.state = "gone";
    }
  }
  const goneIds = new Set(state.specialActors.filter((actor) => actor.state === "gone").map((actor) => actor.id));
  if (goneIds.has(dom.specialVisitorPanel.dataset.actorId)) closeSpecialVisitorPanel(false);
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
    const duration = recipeCookingDuration(recipe, owned.level);
    state.cooking.push({
      stoveId: stove.id,
      guestId: order.guestId,
      recipeId: order.recipeId,
      elapsed: 0,
      duration,
    });
  }
}

function finishCooking(task) {
  grantKnowhowXp(KNOWHOW_SERVICE_XP);
  const guest = getGuest(task.guestId);
  if (!guest || guest.state !== "waiting_food") return;
  guest.state = "eating";
  guest.stateTime = 0;
}

function commonForGuest(guest) {
  return tables.commonCustomers.get(guest.commonId) || tables.raw.CommonCustomer[0];
}

function canCraftRecipe(recipeId) {
  const route = progressionForRecipe(recipeId);
  const recipe = getRecipe(recipeId);
  const owned = recipeData(recipeId);
  return Boolean(isRecipeSystemUnlocked()
    && route
    && recipe
    && craftIngredientCost(route) <= recipeCombinationCapacity()
    && craftIngredientRequirements(route).every((requirement) => ingredientAmount(requirement.ingredientId) >= requirement.count));
}

function craftIngredientRequirements(route) {
  const ingredients = route?.ingredientRequirements || [];
  if (!ingredients.length) return [];
  const totalCount = Math.max(Number(route.ingredientCount || 1), ingredients.length);
  const baseCount = Math.floor(totalCount / ingredients.length);
  const remainder = totalCount % ingredients.length;
  const grouped = new Map();
  ingredients.forEach((ingredient, index) => {
    const ingredientId = Number(ingredient.id);
    const count = baseCount + (index < remainder ? 1 : 0);
    const existing = grouped.get(ingredientId);
    if (existing) existing.count += count;
    else grouped.set(ingredientId, {
      ingredientId,
      name: ingredient.name,
      emoji: ingredient.emoji,
      count,
    });
  });
  return [...grouped.values()];
}

function craftIngredientCost(route) {
  return craftIngredientRequirements(route).reduce((sum, requirement) => sum + requirement.count, 0);
}

function completeRecipeCraft(recipeId, automatic = false) {
  const route = progressionForRecipe(recipeId);
  if (!route) return false;
  const previousBuffetCapacity = buffetStandCapacity();
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
    const currentBuffetCapacity = buffetStandCapacity();
    if (previousBuffetCapacity > 0 && currentBuffetCapacity > previousBuffetCapacity) {
      recipeReveal.buffetStandUnlocked = currentBuffetCapacity - previousBuffetCapacity;
      recipeReveal.buffetStandCapacity = currentBuffetCapacity;
    }
    ensureProgressionTutorial();
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
    duration: RECIPE_RESEARCH_DURATION * (1 - knowhowResearchReduction()),
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
  grantKnowhowXp(KNOWHOW_RESEARCH_XP);
  if (completed.recipeId != null) {
    completeRecipeCraft(completed.recipeId, completed.automatic);
    return;
  }
  const revealedHints = revealMatchingRecipeHints(completed.ingredientIds, false);
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
  showToast(revealedHints.length
    ? `괴식이 됐지만 ${recipeHintDiscoveryLabel(revealedHints)} 찾았어요.`
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

const RECIPE_HINT_MATCH_THRESHOLDS = Object.freeze({ 2: 1, 3: 2, 4: 2, 5: 3 });

function recipeHintMatchThreshold(ingredientCount) {
  return Number(RECIPE_HINT_MATCH_THRESHOLDS[ingredientCount]
    || Math.max(1, Math.ceil(Number(ingredientCount || 0) / 2)));
}

function recipeHintDiscoveryLabel(revealedHints) {
  if (revealedHints.length === 1) {
    return `${routeRecipeName(revealedHints[0].route.recipeId)} 힌트를`;
  }
  return `${routeRecipeName(revealedHints[0].route.recipeId)} 외 ${revealedHints.length - 1}개 요리 힌트를`;
}

function revealMatchingRecipeHints(selectedIngredients = state.crafting.selected, announce = true) {
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
        threshold: recipeHintMatchThreshold(craftIngredientCost(route)),
      };
    })
    .filter((candidate) => !recipeData(candidate.route.recipeId)
      && craftIngredientCost(candidate.route) === selectedCount
      && candidate.matches.length >= candidate.threshold)
    .sort((a, b) => a.routeIndex - b.routeIndex);
  if (!candidates.length) return [];
  state.crafting.hints ||= {};
  const revealedHints = candidates.flatMap((candidate) => {
    const previousHints = state.crafting.hints[candidate.route.recipeId] || [];
    const mergedHints = mergeRecipeHints(candidate.requirements, previousHints, candidate.matches);
    const newlyRevealedCount = mergedHints.length - previousHints.length;
    if (newlyRevealedCount <= 0) return [];
    state.crafting.hints[candidate.route.recipeId] = mergedHints;
    return [{ ...candidate, newlyRevealedCount, revealedIngredients: mergedHints }];
  });
  if (!revealedHints.length) return [];
  saveState();
  if (announce) {
    renderMenu();
    const newSlotCount = revealedHints.reduce((sum, hint) => sum + hint.newlyRevealedCount, 0);
    showToast(`${recipeHintDiscoveryLabel(revealedHints)} 찾았어요. 새 재료 힌트 ${newSlotCount}칸!`, 3);
  }
  return revealedHints;
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
  if (guest.itemGranted || !isIngredientDropUnlocked()) return;
  const route = progressionForCustomer(guest.customerId);
  const customerName = guest.customerName || route?.customerName || `손님 ${guest.customerId}`;
  const visits = Number(guest.visitNumber || state.collections.customers[guest.customerId]?.count || 1);
  const grade = guestGradeForVisits(visits);
  const items = guestRewardItems(route, visits);
  if (!items.length) return;
  guest.itemGranted = true;
  state.metrics.ingredientDropAttempts += 1;
  if (random() >= currentIngredientDropChance()) {
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
  if (selectedItem.random) {
    const randomPool = [...new Map(allUnlockedThemeChicks()
      .flatMap((chick) => chick.rewardIngredients || [])
      .filter((ingredient) => ingredient && !ingredient.random)
      .map((ingredient) => [Number(ingredient.id), ingredient])).values()];
    const replacement = randomPool[Math.floor(random() * randomPool.length)];
    if (replacement) selectedItem = {
      ...selectedItem,
      ingredientId: replacement.id,
      name: replacement.name,
      emoji: replacement.emoji,
      random: false,
    };
  }
  const bonusIngredient = knowhowBonusIngredientChance() > 0 && random() < knowhowBonusIngredientChance();
  const dropCount = Math.max(1, Number(selectedItem.count || 1)) + (bonusIngredient ? 1 : 0);
  if (bonusIngredient) state.metrics.bonusIngredientDrops += 1;
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

function currentIngredientDropChance() {
  const multiplier = state.specialVisitor?.dropBoostRemaining > 0 ? 2 : 1;
  const baseChance = GUEST_INGREDIENT_DROP_CHANCE + knowhowDropBonus();
  return Math.min(1, baseChance * multiplier);
}

function collectIngredientDrop(drop) {
  const items = Array.isArray(drop.items) && drop.items.length
    ? drop.items
    : [{ ingredientId: drop.ingredientId, count: 1 }];
  const storage = ingredientStorageStatus();
  const incomingCount = items.reduce((sum, item) => sum + Math.max(1, Number(item.count || 1)), 0);
  if (storage.totalItems + incomingCount > storage.capacity) {
    showToast(`냉장고가 가득 찼어요. (${storage.totalItems}/${storage.capacity}칸)`, 3);
    return false;
  }
  for (const item of items) {
    state.crafting.ingredients[item.ingredientId] = ingredientAmount(item.ingredientId) + Number(item.count || 1);
  }
  state.ingredientDrops = state.ingredientDrops.filter((item) => item.id !== drop.id);
  const total = items.reduce((sum, item) => sum + Number(item.count || 1), 0);
  state.metrics.ingredientsFound += total;
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
  if (hasTipbox && mood !== "disappointed") {
    state.tipbox = Math.min(state.tipboxCapacity, state.tipbox + Math.max(1, Math.round(mealPrice * .1)));
  }

  guest.mood = mood;
  const buffetVisitChance = Number(BUFFET_VISIT_CHANCE[mood] || 0);
  guest.buffetQueued = isBuffetUnlocked()
    && state.buffet.stands.some(Boolean)
    && random() < buffetVisitChance;
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
}

function spawnBuffetVisitor(guest) {
  const standPositions = buffetStandPositions();
  const displayed = state.buffet.stands.slice(0, buffetStandCapacity())
    .map((recipeId, standIndex) => ({ recipeId: Number(recipeId), standIndex }))
    .filter((item) => item.recipeId && getRecipe(item.recipeId));
  if (!isBuffetUnlocked() || !displayed.length) return false;
  const choice = displayed[Math.floor(random() * displayed.length)];
  const position = standPositions[choice.standIndex];
  const mood = guest.mood === "satisfied" ? "satisfied" : "normal";
  const willBuy = random() < Number(BUFFET_PURCHASE_CHANCE[mood] || 0);
  const recipe = getRecipe(choice.recipeId);
  const owned = recipeData(choice.recipeId) || { level: 1 };
  const purchaseAmount = Math.max(1, Math.round(recipeLevelPrice(recipe, owned) * BUFFET_PURCHASE_RATE));
  state.buffet.visitors.push({
    id: `buffet-${state.buffet.visitorSequence++}`,
    customerId: guest.customerId,
    commonId: guest.commonId,
    customerName: guest.customerName,
    mood,
    state: "arriving",
    x: 28,
    y: 760,
    targetX: position.x,
    targetY: position.y + 125,
    recipeId: choice.recipeId,
    standIndex: choice.standIndex,
    willBuy,
    purchaseAmount,
    paid: false,
    stateTime: 0,
    bob: Number(guest.bob || 0),
  });
  state.metrics.buffetVisitors += 1;
  return true;
}

function updateBuffetVisitors(dt) {
  for (const visitor of state.buffet.visitors) {
    visitor.bob += dt;
    visitor.stateTime += dt;
    if (visitor.state === "arriving") {
      if (moveTowards(visitor, visitor.targetX, visitor.targetY, 155, dt)) {
        visitor.state = "browsing";
        visitor.stateTime = 0;
      }
    } else if (visitor.state === "browsing" && visitor.stateTime >= 3) {
      if (visitor.willBuy && !visitor.paid) {
        visitor.paid = true;
        state.buffet.cashbox += visitor.purchaseAmount;
        state.metrics.buffetPurchases += 1;
      }
      visitor.state = "leaving";
      visitor.stateTime = 0;
      visitor.targetX = 485;
      visitor.targetY = 760;
      saveState();
    } else if (visitor.state === "leaving") {
      moveTowards(visitor, visitor.targetX, visitor.targetY, 170, dt);
    }
  }
  const before = state.buffet.visitors.length;
  state.buffet.visitors = state.buffet.visitors.filter((visitor) => !(visitor.state === "leaving" && visitor.x >= 480));
  if (state.buffet.visitors.length !== before) saveState();
}

function collectPayment(payment) {
  state.resources.acorns += payment.amount;
  state.metrics.collected += payment.amount;
  state.payments = state.payments.filter((item) => item.id !== payment.id);
  saveState();
  updateHud();
}

function collectTipbox() {
  if (state.tipbox <= 0) return false;
  const amount = state.tipbox;
  state.tipbox = 0;
  state.resources.acorns += amount;
  dispatchAchievement(7);
  showToast(`팁 회수 +${formatNumber(amount)}`, 2.5);
  saveState();
  updateHud();
  closeTipboxPanel();
  render();
  return true;
}

function updateTipboxPanel() {
  if (!dom.tipboxPanel || dom.tipboxPanel.hidden) return;
  const capacity = Math.max(TIPBOX_INITIAL_CAPACITY, Number(state.tipboxCapacity || TIPBOX_INITIAL_CAPACITY));
  dom.tipboxAmount.textContent = formatNumber(state.tipbox);
  dom.tipboxCapacity.textContent = formatNumber(capacity);
  dom.tipboxGaugeFill.style.width = `${Math.min(100, state.tipbox / capacity * 100)}%`;
  dom.tipboxCollect.disabled = state.tipbox <= 0;
  dom.tipboxCollect.textContent = state.tipbox > 0 ? `팁 ${formatNumber(state.tipbox)} 회수하기` : "모인 팁이 없어요";
  dom.tipboxExpand.disabled = state.resources.gems < TIPBOX_EXPANSION_GEM_COST;
}

function openTipboxPanel() {
  dom.tipboxPanel.hidden = false;
  updateTipboxPanel();
}

function closeTipboxPanel() {
  dom.tipboxPanel.hidden = true;
}

function expandTipboxCapacity() {
  if (state.resources.gems < TIPBOX_EXPANSION_GEM_COST) {
    showToast(`보석 ${TIPBOX_EXPANSION_GEM_COST}개가 필요해요.`);
    return false;
  }
  state.resources.gems -= TIPBOX_EXPANSION_GEM_COST;
  state.tipboxCapacity = Math.max(TIPBOX_INITIAL_CAPACITY, Number(state.tipboxCapacity || 0)) + TIPBOX_EXPANSION_AMOUNT;
  state.metrics.tipboxExpansions += 1;
  showToast(`팁박스 용량 ${formatNumber(state.tipboxCapacity)}으로 확장!`, 2.6);
  saveState();
  updateHud();
  updateTipboxPanel();
  return true;
}

function collectBuffetCashbox() {
  const amount = Math.max(0, Math.floor(Number(state.buffet.cashbox || 0)));
  if (!amount) return false;
  state.buffet.cashbox = 0;
  state.resources.acorns += amount;
  state.metrics.buffetRevenue += amount;
  state.metrics.buffetClaims += 1;
  showToast(`야외 뷔페 정산 +${formatNumber(amount)}`, 2.5);
  saveState();
  updateHud();
  render();
  return true;
}

function formatOfflineBuffetTime(seconds) {
  const totalMinutes = Math.max(1, Math.floor(Number(seconds || 0) / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}시간${minutes ? ` ${minutes}분` : ""}` : `${minutes}분`;
}

function showOfflineBuffetReward() {
  const amount = Math.max(0, Math.floor(Number(state.buffet.offlinePending || 0)));
  dom.offlineRewardPanel.hidden = amount <= 0;
  if (amount <= 0) return false;
  dom.offlineRewardAmount.textContent = formatNumber(amount);
  dom.offlineRewardTime.textContent = `${formatOfflineBuffetTime(state.buffet.offlineSeconds)} 동안 모인 도토리`;
  updateTutorialDialogue();
  return true;
}

function claimOfflineBuffetReward() {
  const amount = Math.max(0, Math.floor(Number(state.buffet.offlinePending || 0)));
  if (!amount) {
    dom.offlineRewardPanel.hidden = true;
    return false;
  }
  state.buffet.offlinePending = 0;
  state.buffet.offlineSeconds = 0;
  state.resources.acorns += amount;
  state.metrics.buffetRevenue += amount;
  state.metrics.buffetOfflineRevenue += amount;
  state.metrics.buffetClaims += 1;
  dom.offlineRewardPanel.hidden = true;
  saveState();
  updateHud();
  updateTutorialDialogue();
  render();
  return true;
}

function updateBuffetPassiveIncome(dt) {
  if (!isBuffetUnlocked()) return;
  state.buffet.passiveElapsed += Math.max(0, Number(dt) || 0);
  const ticks = Math.floor(state.buffet.passiveElapsed / BUFFET_TICK_SECONDS);
  if (ticks <= 0) return;
  state.buffet.passiveElapsed %= BUFFET_TICK_SECONDS;
  const earned = ticks * buffetPerMinute();
  if (earned > 0) state.buffet.cashbox += earned;
  saveState();
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

  const departing = state.guests.filter((guest) => guest.state === "leaving" && guest.y >= 896);
  departing.filter((guest) => guest.buffetQueued).forEach(spawnBuffetVisitor);
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

function updateKnowhowAutomation(dt) {
  const automation = state.knowhow.automation;
  const paymentInterval = knowhowAutoPaymentInterval();
  if (paymentInterval) {
    automation.paymentElapsed = Math.min(paymentInterval, automation.paymentElapsed + dt);
    if (automation.paymentElapsed >= paymentInterval && state.payments[0]) {
      collectPayment(state.payments[0]);
      automation.paymentElapsed = 0;
      state.metrics.autoCollected += 1;
      state.metrics.autoPayments += 1;
      saveState();
    }
  }

  const ingredientInterval = knowhowAutoIngredientInterval();
  if (ingredientInterval) {
    automation.ingredientElapsed = Math.min(ingredientInterval, automation.ingredientElapsed + dt);
    if (automation.ingredientElapsed >= ingredientInterval && state.ingredientDrops[0]) {
      const before = state.ingredientDrops.length;
      collectIngredientDrop(state.ingredientDrops[0]);
      if (state.ingredientDrops.length < before) {
        automation.ingredientElapsed = 0;
        state.metrics.autoCollected += 1;
        state.metrics.autoIngredients += 1;
        saveState();
      }
    }
  }

  const buffetInterval = knowhowAutoBuffetInterval();
  if (buffetInterval) {
    automation.buffetElapsed = Math.min(buffetInterval, automation.buffetElapsed + dt);
    if (automation.buffetElapsed >= buffetInterval && state.buffet.cashbox > 0) {
      collectBuffetCashbox();
      automation.buffetElapsed = 0;
      state.metrics.autoBuffetClaims += 1;
      saveState();
    }
  }

  const orderDelay = knowhowAutoOrderDelay();
  if (orderDelay) {
    const delay = orderDelay;
    automation.orderElapsed = Math.min(delay, automation.orderElapsed + dt);
    const waiting = state.guests.find((guest) => guest.state === "awaiting_order" && guest.stateTime >= delay);
    if (waiting && automation.orderElapsed >= delay) {
      state.metrics.autoOrders += 1;
      takeOrder(waiting);
      automation.orderElapsed = 0;
    }
  }

  const calmDelay = knowhowAutoCalmDelay();
  if (calmDelay) {
    automation.calmElapsed = Math.min(calmDelay, automation.calmElapsed + dt);
    const disappointed = state.guests.find((guest) => guest.state === "disappointed" && guest.stateTime >= calmDelay);
    if (disappointed && automation.calmElapsed >= calmDelay) {
      state.metrics.autoCalms += 1;
      calmGuest(disappointed);
      automation.calmElapsed = 0;
      saveState();
    }
  }

  const promotionInterval = knowhowAutoPromotionInterval();
  if (promotionInterval && coreReady()) {
    const interval = promotionInterval;
    automation.promotionElapsed += dt;
    if (automation.promotionElapsed >= interval) {
      automation.promotionElapsed %= interval;
      state.metrics.autoPromotions += 1;
      promote();
    }
  }
}

function update(dt) {
  state.clock += dt;
  updateChefMovement(dt);
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) dom.toast.hidden = true;
  }
  if (guestToastTimer > 0) {
    guestToastTimer -= dt;
    if (guestToastTimer <= 0) {
      const nextGuest = guestToastQueue.shift();
      if (nextGuest) displayFirstGuestToast(nextGuest);
      else dom.guestToast.hidden = true;
    }
  }
  updateSpecialPromotion(dt);
  updateGuests(dt);
  updateBuffetVisitors(dt);
  updateSpecialCustomers(dt);
  updateCooking(dt);
  updateBuffetPassiveIncome(dt);
  updateContestJudging(dt);
  updateRecipeResearch(dt);
  updateKnowhowAutomation(dt);
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
  state.crafting.storageCapacity = storage.baseCapacity + INGREDIENT_STORAGE_EXPANSION_AMOUNT;
  showToast(`냉장고 용량 ${ingredientStorageStatus().capacity}칸으로 확장!`);
  saveState();
  updateHud();
  renderMenu();
  return true;
}

function expandBowlCapacity() {
  const capacity = recipeCombinationCapacity();
  if (capacity >= BOWL_CAPACITY_MAX) return false;
  if (state.resources.gems < BOWL_CAPACITY_EXPANSION_GEM_COST) {
    showToast(`보석 ${BOWL_CAPACITY_EXPANSION_GEM_COST}개가 필요해요.`);
    return false;
  }
  state.resources.gems -= BOWL_CAPACITY_EXPANSION_GEM_COST;
  state.crafting.bowlCapacity = Math.min(BOWL_CAPACITY_MAX, capacity + BOWL_CAPACITY_EXPANSION_AMOUNT);
  showToast(`보울 용량 ${state.crafting.bowlCapacity}칸으로 확장!`);
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
  if (Number(row.facilityType) === 7) {
    const remaining = Math.max(0, state.facilityInteractions.sinkWater.readyAt - state.clock);
    ctx.save();
    ctx.translate(p.x + p.w * .28, p.y - p.h * .34);
    ctx.fillStyle = remaining > 0 ? "rgba(255,250,226,.92)" : "#fff6bd";
    ctx.strokeStyle = remaining > 0 ? "rgba(108,84,58,.56)" : "#467fa1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = remaining > 0 ? "#806d5b" : "#3984b3";
    ctx.font = remaining > 0 ? "900 9px sans-serif" : '15px "Segoe UI Emoji",sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(remaining > 0 ? String(Math.ceil(remaining)) : "💧", 0, 1);
    ctx.restore();
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

function chefMovementTarget() {
  if (!state || !tables || dom.menuScreen.hidden || state.ui.screen !== "recipe") {
    return { ...CHEF_HOME_POSITION, station: "home", facilityType: null };
  }
  const facilityType = state.ui.tab === "ingredients" ? 6 : 8;
  const row = installedRows(facilityType)[0]
    || tables.installs.find((item) => Number(item.facilityType) === facilityType);
  if (!row) return { ...CHEF_HOME_POSITION, station: "home", facilityType: null };
  const placement = facilityPlacement(row);
  return {
    x: placement.x,
    y: placement.y + CHEF_STATION_OFFSET_Y,
    station: facilityType === 6 ? "fridge" : "countertop",
    facilityType,
  };
}

function updateChefMovement(dt) {
  const target = chefMovementTarget();
  const dx = target.x - chefPosition.x;
  const dy = target.y - chefPosition.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= .01) {
    chefPosition.x = target.x;
    chefPosition.y = target.y;
    return;
  }
  const step = Math.min(distance, CHEF_MOVE_SPEED * Math.max(0, dt));
  chefPosition.x += dx / distance * step;
  chefPosition.y += dy / distance * step;
}

function drawChef() {
  const { x, y } = chefPosition;
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
  const index = Math.max(1, Math.min(CHICK_ICON_MAX_INDEX, commonId - 1000));
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
    const meta = SPECIAL_VISITOR_TYPES[actor.type] || SPECIAL_VISITOR_TYPES.thief;
    drawImage(meta.icon, actor.x, actor.y, 68, 68);
    const canInteract = actor.type === "thief"
      ? !["caught", "escaping", "gone"].includes(actor.state)
      : ["waiting", "interacting"].includes(actor.state);
    if (canInteract) {
      ctx.fillStyle = actor.type === "thief" ? "#e63e32" : "#654277";
      ctx.font = "900 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(meta.marker, actor.x, actor.y - 42);
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

function tipboxValueLayout() {
  if (!installedRows(3).length) return null;
  const tipbox = installedRows(3)[0];
  const p = facilityPlacement(tipbox);
  return { x: p.x - 52, y: p.y - 59, w: 104, h: 28 };
}

function drawTipboxValue() {
  if (state.tipbox <= 0) return;
  const badge = tipboxValueLayout();
  if (!badge) return;
  ctx.fillStyle = "rgba(57,39,20,.88)";
  roundRect(badge.x, badge.y, badge.w, badge.h, 14);
  ctx.fill();
  drawImage("assets/ui/currency/icon_currency_001.png", badge.x + 14, badge.y + 14, 23, 23);
  ctx.fillStyle = "white";
  ctx.font = "900 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${formatNumber(state.tipbox)} / ${formatNumber(state.tipboxCapacity)}`, badge.x + 66, badge.y + 18);
}

function drawBuffetDecor() {
  ctx.fillStyle = "rgba(255,244,190,.16)";
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.strokeStyle = "#80502d";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(45, 180);
  ctx.quadraticCurveTo(240, 225, 435, 180);
  ctx.stroke();
  [70, 125, 185, 245, 305, 365, 420].forEach((x, index) => {
    const y = 190 + Math.sin(index * .8) * 15;
    ctx.fillStyle = ["#f7c84e", "#ef7654", "#8fcf78"][index % 3];
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 5);
    ctx.lineTo(x + 10, y - 5);
    ctx.lineTo(x, y + 15);
    ctx.closePath();
    ctx.fill();
  });
  ctx.fillStyle = "rgba(255,249,225,.95)";
  ctx.strokeStyle = "#76502e";
  ctx.lineWidth = 3;
  roundRect(145, 102, 190, 58, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#70431f";
  ctx.font = "1000 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("야외 뷔페", 240, 139);
  ctx.fillStyle = "#a46a30";
  ctx.font = "900 10px sans-serif";
  const capacity = buffetStandCapacity();
  const nextRequirement = nextBuffetStandRequirement();
  ctx.fillText(`진열 ${capacity}/${BUFFET_MAX_STAND_COUNT}${nextRequirement ? ` · 다음 ${nextRequirement}개` : " · 최대 확장"}`, 240, 154);
}

function drawBuffetStand(position, index) {
  const recipeId = state.buffet.stands[index];
  const compact = position.w <= 104;
  const plateSize = compact ? 50 : 62;
  const plateY = position.y - position.h * .46;
  const labelWidth = compact ? 102 : 122;
  const labelTop = position.y + position.h * .45;
  drawShadow(position.x, position.y + position.h * .38, position.w * .38, compact ? 7 : 9);
  drawImage("assets/ui/facility/icon_facility_1_table_wood.png", position.x, position.y, position.w, position.h);
  if (recipeId) {
    drawImage(routeRecipeIcon(recipeId), position.x, plateY, plateSize, plateSize);
    ctx.fillStyle = "rgba(255,250,233,.96)";
    ctx.strokeStyle = "#7b502e";
    ctx.lineWidth = 2;
    roundRect(position.x - labelWidth / 2, labelTop, labelWidth, compact ? 37 : 42, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#68401f";
    ctx.font = `1000 ${compact ? 9 : 10}px sans-serif`;
    ctx.textAlign = "center";
    const name = routeRecipeName(recipeId);
    const nameLimit = compact ? 7 : 9;
    ctx.fillText(name.length > nameLimit ? `${name.slice(0, nameLimit)}…` : name, position.x, labelTop + 15);
    ctx.fillStyle = "#bc6827";
    ctx.font = `900 ${compact ? 8 : 9}px sans-serif`;
    ctx.fillText(`+${formatNumber(buffetRecipeYield(recipeId))}/분`, position.x, labelTop + (compact ? 29 : 32));
  } else {
    ctx.fillStyle = "rgba(255,250,233,.95)";
    ctx.strokeStyle = "#8a623d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(position.x, plateY, compact ? 20 : 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#9b642d";
    ctx.font = `1000 ${compact ? 24 : 28}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("+", position.x, plateY + (compact ? 8 : 10));
    ctx.fillStyle = "rgba(255,250,233,.94)";
    ctx.strokeStyle = "#8a623d";
    roundRect(position.x - labelWidth / 2, labelTop, labelWidth, compact ? 30 : 34, 11);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#8a623d";
    ctx.font = `900 ${compact ? 8 : 9}px sans-serif`;
    ctx.fillText("요리 놓기", position.x, labelTop + (compact ? 19 : 22));
  }
}

function drawBuffetVisitor(visitor) {
  const bob = Math.sin(visitor.bob * 4) * 2;
  drawShadow(visitor.x, visitor.y + 25, 18, 5);
  drawImage(guestIcon(visitor), visitor.x, visitor.y + bob, 61, 61);
  if (visitor.state === "browsing") {
    drawImage(routeRecipeIcon(visitor.recipeId), visitor.x, visitor.y - 42, 34, 34);
  } else if (visitor.paid) {
    ctx.fillStyle = "#f1b32f";
    ctx.font = "1000 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("+🌰", visitor.x, visitor.y - 38);
  }
}

function drawBuffetCashbox() {
  const p = BUFFET_CASHBOX_POSITION;
  drawShadow(p.x, p.y + p.h * .38, 44, 8);
  drawImage("assets/ui/facility/icon_facility_1_countertop_wood.png", p.x, p.y, p.w, p.h);
  ctx.fillStyle = "rgba(255,250,233,.96)";
  ctx.strokeStyle = "#76502e";
  ctx.lineWidth = 2;
  roundRect(p.x - 72, p.y + 43, 144, 47, 15);
  ctx.fill();
  ctx.stroke();
  drawImage("assets/ui/currency/icon_currency_001.png", p.x - 49, p.y + 65, 26, 26);
  ctx.fillStyle = "#68401f";
  ctx.font = "1000 15px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(formatNumber(state.buffet.cashbox), p.x - 31, p.y + 70);
  ctx.fillStyle = "#9b6b3e";
  ctx.font = "900 8px sans-serif";
  ctx.textAlign = "right";
  const remaining = Math.max(0, Math.ceil(BUFFET_TICK_SECONDS - state.buffet.passiveElapsed));
  ctx.fillText(`+${formatNumber(buffetPerMinute())}/분 · ${remaining}초`, p.x + 62, p.y + 70);
}

function drawBuffetChef() {
  const x = 420;
  const y = 210;
  const bob = Math.sin(state.clock * 3.4) * 2;
  drawShadow(x, y + 25, 20, 6);
  drawImage("assets/ui/chick/icon_chick_chef.png", x, y + bob, 66, 66);
}

function drawBuffetArea() {
  drawBackground();
  drawBuffetDecor();
  buffetStandPositions().forEach(drawBuffetStand);
  [...state.buffet.visitors].sort((a, b) => a.y - b.y).forEach(drawBuffetVisitor);
  drawBuffetCashbox();
  drawBuffetChef();
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
  if (state.ui.area === "buffet" && isBuffetUnlocked()) drawBuffetArea();
  else drawWorldArea("restaurant");
}

function currentObjective() {
  if (state.ui.area === "buffet") {
    if (state.buffet.stands.slice(0, buffetStandCapacity()).some((recipeId) => !recipeId)) return "뷔페 진열대에 요리 놓기";
    if (state.buffet.cashbox > 0) return "뷔페 계산대 정산하기";
    return "야외 뷔페 운영 중";
  }
  const required = [10, 1, 2].map((type) => tables.installs.find((row) => row.facilityType === type));
  const missing = required.find((row) => row && !isInstalled(row.id));
  if (missing) return `${FACILITY_META[missing.facilityType].name} 설치하기`;
  if (!isRecipeSystemUnlocked()) return "도마 테이블을 설치해 요리 연구 열기";
  if (!isIngredientDropUnlocked()) return "냉장고를 설치해 재료 드랍 열기";
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
  ensureContestDailyReset();
  dom.acorns.textContent = formatNumber(state.resources.acorns);
  dom.gems.textContent = formatNumber(state.resources.gems);
  if (state.ui.area === "buffet" && !isBuffetUnlocked()) state.ui.area = "restaurant";
  const buffetArea = state.ui.area === "buffet";
  dom.areaPrevButton.hidden = !buffetArea;
  dom.areaNextButton.hidden = buffetArea || !isBuffetUnlocked();
  dom.contestButton.hidden = buffetArea || !isContestUnlocked();
  dom.bottomControls.classList.toggle("is-buffet", buffetArea);
  canvas.setAttribute("aria-label", buffetArea ? "야외 뷔페" : "레스토랑");
  const dropBoostActive = Number(state.specialVisitor?.dropBoostRemaining || 0) > 0;
  dom.dropBoostBadge.hidden = !dropBoostActive;
  if (dropBoostActive) dom.dropBoostTime.textContent = formatPromotionTimer(state.specialVisitor.dropBoostRemaining);
  dom.promoButton.hidden = buffetArea;
  dom.promoButton.disabled = !coreReady();
  const specialPromotionUnlocked = isSpecialPromotionUnlocked();
  const specialPromotionActive = state.specialPromotion.remaining > 0;
  const specialPromotionCoolingDown = !specialPromotionActive && state.specialPromotion.cooldown > 0;
  dom.specialPromoButton.hidden = buffetArea || !specialPromotionUnlocked;
  dom.specialPromoButton.disabled = !coreReady() || specialPromotionActive || specialPromotionCoolingDown;
  dom.specialPromoButton.classList.toggle("is-active", specialPromotionActive);
  dom.specialPromoButton.classList.toggle("is-cooldown", specialPromotionCoolingDown);
  if (specialPromotionActive) {
    const ingredient = ingredientData(state.specialPromotion.ingredientId);
    dom.specialPromoLabel.textContent = `${ingredient?.emoji || "✦"} ${formatPromotionTimer(state.specialPromotion.remaining)}`;
    dom.specialPromoButton.setAttribute("aria-label", `${ingredient?.ingredientName || "재료"} 특별 홍보 ${formatPromotionTimer(state.specialPromotion.remaining)} 남음`);
  } else if (specialPromotionCoolingDown) {
    dom.specialPromoLabel.textContent = `재사용 ${formatPromotionTimer(state.specialPromotion.cooldown)}`;
    dom.specialPromoButton.setAttribute("aria-label", `특별 홍보 재사용까지 ${formatPromotionTimer(state.specialPromotion.cooldown)}`);
  } else {
    dom.specialPromoLabel.textContent = "특별 홍보";
    dom.specialPromoButton.setAttribute("aria-label", "특별 홍보 재료 선택");
  }
  const recipeUnlocked = isRecipeSystemUnlocked();
  const recipeNav = dom.navButtons.find((button) => button.dataset.screen === "recipe");
  recipeNav?.classList.toggle("is-locked", !recipeUnlocked);
  recipeNav?.setAttribute("aria-label", recipeUnlocked ? "요리 연구" : "요리 연구 · 도마 테이블 설치 후 해금");
  recipeNav?.setAttribute("title", recipeUnlocked ? "요리 연구" : "도마 테이블 설치 후 해금");
  dom.recipeDot.hidden = !recipeUnlocked || (!RECIPE_PROGRESSION.some((route) => canCraftRecipe(route.recipeId))
    && !Object.values(state.ownedRecipes).some((owned) => !owned.codexClaimed || owned.stack > 0));
  dom.collectionDot.hidden = !Object.values(state.collections).some((dict) => Object.values(dict).some((entry) => entry.isNew));
  dom.recipeNavLabel.textContent = "요리 연구";
  dom.themeNavLabel.textContent = "테마";
  updateTipboxPanel();
  updateTutorialDialogue();
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

function collectSinkWater() {
  const interaction = state.facilityInteractions.sinkWater;
  const remaining = Math.max(0, interaction.readyAt - state.clock);
  if (remaining > 0) {
    showToast(`💧 ${Math.ceil(remaining)}초 후에 다시 확인해 주세요.`);
    return false;
  }
  if (ingredientStorageStatus().remaining < 1) {
    showToast("냉장고가 가득 찼어요.");
    return false;
  }

  interaction.readyAt = state.clock + SINK_WATER_COOLDOWN_SECONDS;
  interaction.attempts += 1;
  const water = GAME_INGREDIENTS.water;
  state.crafting.ingredients[water.id] = ingredientAmount(water.id) + 1;
  interaction.collected += 1;
  showToast(`${water.emoji} ${water.name} ×1 획득!`, 3);
  saveState();
  updateHud();
  render();
  return true;
}

function handleBuffetTap(point) {
  const standIndex = buffetStandPositions().findIndex((position) => insideBox(point, position, 18));
  if (standIndex >= 0) return openBuffetStandMenu(standIndex);
  if (insideBox(point, BUFFET_CASHBOX_POSITION, 22)) return collectBuffetCashbox();
  return false;
}

function handleCanvasTap(event) {
  if (!dom.menuScreen.hidden && (dom.menuScreen.classList.contains("is-theme-sheet") || dom.menuScreen.classList.contains("is-recipe-sheet"))) {
    closeMenu();
    render();
    return;
  }
  if (!dom.installPanel.hidden || !dom.specialVisitorPanel.hidden || !dom.offlineRewardPanel.hidden || !dom.tipboxPanel.hidden) return;
  const point = pointerPosition(event);
  if (state.ui.area === "buffet") return handleBuffetTap(point);

  const special = state.specialActors.find((actor) => Math.hypot(point.x - actor.x, point.y - actor.y) <= 48);
  if (special) return interactSpecialVisitor(special);

  const ingredientDrop = state.ingredientDrops.find((item) => Math.hypot(point.x - item.x, point.y - item.y) <= 38);
  if (ingredientDrop) return collectIngredientDrop(ingredientDrop);

  const payment = state.payments.find((item) => Math.hypot(point.x - item.x, point.y - item.y) <= 42);
  if (payment) return collectPayment(payment);

  const unhappy = state.guests.find((guest) => guest.state === "disappointed" && Math.hypot(point.x - guest.x, point.y - (guest.y - 40)) <= 58);
  if (unhappy) return calmGuest(unhappy);

  const waiting = state.guests.find((guest) => guest.state === "awaiting_order" && Math.hypot(point.x - guest.x, point.y - (guest.y - 40)) <= 66);
  if (waiting) return takeOrder(waiting);

  const tipbox = installedRows(3)[0];
  if (tipbox && insideBox(point, facilityPlacement(tipbox), 16)) return openTipboxPanel();

  const stage = installedRows(5)[0];
  if (stage && insideBox(point, facilityPlacement(stage), 16)) return openMenu("performance");

  const fridge = installedRows(6)[0];
  if (fridge && insideBox(point, facilityPlacement(fridge), 14)) return openMenu("recipe", "ingredients");

  const countertop = installedRows(8)[0];
  if (countertop && insideBox(point, facilityPlacement(countertop), 14)) return openMenu("recipe", "craft");

  const sink = installedRows(7)[0];
  if (sink && insideBox(point, facilityPlacement(sink), 14)) return collectSinkWater();

  const candidate = installCandidates().find((row) => insideBox(point, facilityPlacement(row), 8));
  if (candidate) return openInstallPanel(candidate);

  render();
}

function setActiveNav(screen) {
  dom.navButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.screen === screen));
}

function closeMenu() {
  dismissRecipeReveal();
  state.ui.themePartId = null;
  state.ui.recipeIngredientPickerOpen = false;
  state.ui.screen = "restaurant";
  dom.menuScreen.hidden = true;
  dom.menuScreen.classList.remove("is-theme-sheet", "is-recipe-sheet");
  setActiveNav("");
  saveState();
  updateTutorialDialogue();
}

function openMenu(screen, preferredTab = null) {
  if ((screen === "missions" && !SYSTEM_ENABLED.missions) || (screen === "staff" && !SYSTEM_ENABLED.staff)) return;
  if (screen === "contest" && !isContestUnlocked()) return;
  if (screen === "recipe" && !isRecipeSystemUnlocked()) {
    showTutorialDialogue("recipe-locked");
    return;
  }
  if (!dom.installPanel.hidden) closeInstallPanel();
  if (state.ui.screen !== screen || dom.menuScreen.hidden) state.ui.themePartId = null;
  state.ui.screen = screen;
  state.ui.recipeIngredientPickerOpen = false;
  state.ui.tab = preferredTab || (screen === "recipe" ? "craft" : screen === "missions" ? "main" : screen === "collection" ? "customers" : screen);
  dom.menuScreen.classList.toggle("is-theme-sheet", screen === "theme");
  dom.menuScreen.classList.toggle("is-recipe-sheet", screen === "recipe");
  dom.menuScreen.hidden = false;
  setActiveNav(screen);
  updateTutorialDialogue();
  renderMenu();
}

function switchWorldArea(area) {
  if (area === "buffet" && !isBuffetUnlocked()) return false;
  const nextArea = area === "buffet" ? "buffet" : "restaurant";
  if (state.ui.area === nextArea) return true;
  state.ui.area = nextArea;
  if (!dom.installPanel.hidden) closeInstallPanel();
  closeSpecialVisitorPanel(false);
  closeSpecialPromotionPanel();
  closeTipboxPanel();
  toggleDebugPanel(false);
  closeMenu();
  updateHud();
  render();
  saveState();
  return true;
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
    return Boolean(recipe);
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
      return Boolean(recipe);
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
  showToast(`${isNew ? "새 요리" : "중복 요리"} · ${routeRecipeName(recipeId)} 획득!`, 3);
  saveState();
  renderMenu();
}

function upgradeRecipe(recipeId) {
  const owned = recipeData(recipeId);
  const recipe = getRecipe(recipeId);
  if (!owned || !recipe || owned.stack <= 0) return;
  owned.stack -= 1;
  owned.level += 1;
  dispatchAchievement(9, 1, 103, recipeId);
  showToast(`${routeRecipeName(recipeId)} Lv.${owned.level} 강화 완료!`);
  saveState();
  renderMenu();
}

function canManualUpgradeRecipe(recipeId) {
  const owned = recipeData(recipeId);
  const recipe = getRecipe(recipeId);
  const route = progressionForRecipe(recipeId);
  return Boolean(owned && recipe && route && !recipeResearch
    && craftIngredientRequirements(route).every((requirement) => ingredientAmount(requirement.ingredientId) >= requirement.count));
}

function manualUpgradeRecipe(recipeId) {
  if (!canManualUpgradeRecipe(recipeId)) return false;
  const ingredientIds = expandedCraftIngredientIds(progressionForRecipe(recipeId));
  if (!consumeResearchIngredients(ingredientIds)) return false;
  state.metrics.recipeResearchAttempts += 1;
  grantKnowhowXp(KNOWHOW_RESEARCH_XP);
  completeRecipeCraft(recipeId, false);
  return true;
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

function openBuffetStandMenu(index) {
  if (!isBuffetUnlocked() || index < 0 || index >= buffetStandCapacity()) return false;
  state.ui.buffetStandIndex = index;
  state.ui.screen = "buffet";
  dom.menuScreen.hidden = false;
  setActiveNav("");
  updateTutorialDialogue();
  renderMenu();
  return true;
}

function placeBuffetRecipe(recipeId) {
  const index = Math.max(0, Math.min(buffetStandCapacity() - 1, Number(state.ui.buffetStandIndex || 0)));
  if (!recipeData(recipeId) || state.buffet.stands.some((placedId, placedIndex) => placedIndex !== index && Number(placedId) === Number(recipeId))) return false;
  state.buffet.stands[index] = Number(recipeId);
  showToast(`${routeRecipeName(recipeId)} 뷔페 진열 완료!`, 2.4);
  closeMenu();
  updateHud();
  render();
  return true;
}

function clearBuffetStand() {
  const index = Math.max(0, Math.min(buffetStandCapacity() - 1, Number(state.ui.buffetStandIndex || 0)));
  if (!state.buffet.stands[index]) return false;
  state.buffet.stands[index] = null;
  closeMenu();
  updateHud();
  render();
  return true;
}

function renderBuffetStandMenu() {
  const capacity = buffetStandCapacity();
  const index = Math.max(0, Math.min(capacity - 1, Number(state.ui.buffetStandIndex || 0)));
  const currentRecipeId = state.buffet.stands[index];
  const popularityBonus = Math.round((buffetPopularityMultiplierForCount(unlockedRecipeCount()) - 1) * 100);
  const nextRequirement = nextBuffetStandRequirement();
  dom.menuKicker.textContent = "야외 뷔페";
  dom.menuTitle.textContent = `진열대 ${index + 1}`;
  dom.menuTabs.innerHTML = "";
  const recipeCards = discoveryOrderedRecipeRoutes().filter((route) => recipeData(route.recipeId)).map((route) => {
    const usedIndex = state.buffet.stands.findIndex((recipeId) => Number(recipeId) === Number(route.recipeId));
    const selectedHere = usedIndex === index;
    const usedElsewhere = usedIndex >= 0 && usedIndex !== index;
    const owned = recipeData(route.recipeId);
    const recipe = getRecipe(route.recipeId);
    return `<article class="buffet-recipe-card"><img src="${routeRecipeIcon(route.recipeId)}" alt="" /><div><strong>${routeRecipeName(route.recipeId)}</strong><small>Lv.${owned.level} · 현재 가격 ${formatNumber(Math.round(recipeLevelPrice(recipe, owned)))}</small><small>뷔페 +${formatNumber(buffetRecipeYield(route.recipeId))}/분</small></div><button type="button" data-action="buffet-place" data-id="${route.recipeId}" ${selectedHere || usedElsewhere ? "disabled" : ""}>${selectedHere ? "진열 중" : usedElsewhere ? "다른 칸" : "진열"}</button></article>`;
  }).join("");
  dom.menuContent.innerHTML = `<section class="buffet-menu-summary"><span>🍽️</span><div><strong>총 +${formatNumber(buffetPerMinute())}/분 · 진열 ${capacity}/${BUFFET_MAX_STAND_COUNT}</strong><small>${nextRequirement ? `요리 ${nextRequirement}개에 다음 진열대` : "모든 진열대 확장 완료"} · 수집 보너스 +${popularityBonus}%</small></div></section>
    ${currentRecipeId ? `<button type="button" class="buffet-clear-button" data-action="buffet-clear">현재 진열 비우기</button>` : ""}
    ${recipeCards}`;
}

function contestTier(tierId) {
  return CONTEST_TIERS.find((tier) => tier.id === Number(tierId)) || CONTEST_TIERS[0];
}

function contestJudgePreference(key) {
  const preference = CONTEST_JUDGE_PREFERENCES[key];
  return {
    ...preference,
    key,
    ingredientIds: (preference?.ingredientKeys || []).map((ingredientKey) => GAME_INGREDIENTS[ingredientKey]?.id).filter(Boolean),
  };
}

function contestTierUnlocked(tier) {
  return unlockedRecipeCount() >= Number(tier.recipeRequirement)
    && (!tier.previousTierId || state.contest.firstPlaceTierIds.includes(tier.previousTierId));
}

function contestTierRequirementText(tier) {
  if (unlockedRecipeCount() < tier.recipeRequirement) return `요리 ${tier.recipeRequirement}개 필요`;
  if (tier.previousTierId && !state.contest.firstPlaceTierIds.includes(tier.previousTierId)) {
    return `${contestTier(tier.previousTierId).shortName} 1등 필요`;
  }
  return "참가 가능";
}

function contestEntryCost() {
  return Number(state.contest.entriesToday || 0) > 0 ? CONTEST_EXTRA_ENTRY_GEM_COST : 0;
}

function ensureContestDailyReset() {
  const dayKey = localDateKey();
  if (state.contest.dayKey === dayKey) return false;
  state.contest.dayKey = dayKey;
  state.contest.entriesToday = 0;
  state.contest.judging = null;
  state.contest.result = null;
  saveState();
  return true;
}

function contestRecipeOptions() {
  return discoveryOrderedRecipeRoutes().filter((route) => recipeData(route.recipeId));
}

function contestIngredientOptions() {
  return storedIngredientIds().map(ingredientData).filter(Boolean);
}

function normalizeContestSelection() {
  const unlockedTiers = CONTEST_TIERS.filter(contestTierUnlocked);
  if (!unlockedTiers.some((tier) => tier.id === Number(state.contest.selectedTierId))) {
    state.contest.selectedTierId = unlockedTiers.at(-1)?.id || 1;
  }
  const recipes = contestRecipeOptions();
  if (!recipes.some((route) => route.recipeId === Number(state.contest.selectedRecipeId))) {
    state.contest.selectedRecipeId = recipes[0]?.recipeId || null;
  }
  const ingredients = contestIngredientOptions();
  if (!ingredients.some((ingredient) => ingredient.id === Number(state.contest.selectedIngredientId))) {
    state.contest.selectedIngredientId = ingredients[0]?.id || null;
  }
}

function startContestEntry() {
  ensureContestDailyReset();
  normalizeContestSelection();
  const tier = contestTier(state.contest.selectedTierId);
  const recipeId = Number(state.contest.selectedRecipeId);
  const ingredientId = Number(state.contest.selectedIngredientId);
  const cost = contestEntryCost();
  if (!contestTierUnlocked(tier) || !recipeData(recipeId) || ingredientAmount(ingredientId) <= 0 || state.contest.judging) return false;
  if (cost > 0 && state.resources.gems < cost) {
    showToast(`추가 참가에는 보석 ${cost}개가 필요해요.`);
    return false;
  }
  if (cost > 0) state.resources.gems -= cost;
  state.crafting.ingredients[ingredientId] = ingredientAmount(ingredientId) - 1;
  state.contest.entriesToday += 1;
  state.contest.result = null;
  state.contest.judging = {
    tierId: tier.id,
    recipeId,
    ingredientId,
    elapsed: 0,
    duration: CONTEST_JUDGING_DURATION,
  };
  state.metrics.contestEntries += 1;
  saveState();
  updateHud();
  renderMenu();
  return true;
}

function finishContestJudging() {
  const judging = state.contest.judging;
  if (!judging) return false;
  const tier = contestTier(judging.tierId);
  const route = progressionForRecipe(judging.recipeId);
  const recipe = getRecipe(judging.recipeId);
  const owned = recipeData(judging.recipeId) || { level: 1 };
  const recipeIngredientIds = new Set((route?.ingredientRequirements || []).map((ingredient) => Number(ingredient.id)));
  const judgeResults = tier.judges.map((key) => {
    const preference = contestJudgePreference(key);
    const recipeMatch = preference.ingredientIds.some((ingredientId) => recipeIngredientIds.has(ingredientId));
    const extraMatch = preference.ingredientIds.includes(Number(judging.ingredientId));
    return {
      key,
      name: preference.name,
      icon: preference.icon,
      recipeMatch,
      extraMatch,
      points: (recipeMatch ? 8 : 0) + (extraMatch ? 14 : 0),
      reaction: extraMatch ? "추가 재료가 완벽해요!" : recipeMatch ? "제 취향이 들어있어요" : "무난한 맛이에요",
    };
  });
  const tasteScore = judgeResults.reduce((sum, judge) => sum + judge.points, 0);
  const levelBonus = Math.min(10, Math.max(0, Number(owned.level || 1) - 1) * 2);
  const prestigeBonus = Math.min(8, Math.floor(recipeLevelPrice(recipe, owned) / 70));
  const luckBonus = Math.floor(random() * 9);
  const score = Math.min(100, 35 + tasteScore + levelBonus + prestigeBonus + luckBonus);
  const rank = score >= tier.firstPlaceScore ? 1 : score >= tier.firstPlaceScore - 14 ? 2 : 3;
  const prize = Math.round(Number(tier.prizes[rank - 1] || 0) * contestPrizeMultiplier());
  state.resources.acorns += prize;
  if (rank === 1 && !state.contest.firstPlaceTierIds.includes(tier.id)) {
    state.contest.firstPlaceTierIds.push(tier.id);
    state.contest.firstPlaceTierIds.sort((a, b) => a - b);
    state.metrics.contestFirstPlaces += 1;
  }
  state.metrics.contestPrizeMoney += prize;
  state.contest.result = {
    tierId: tier.id,
    tierName: tier.name,
    recipeId: judging.recipeId,
    recipeName: routeRecipeName(judging.recipeId),
    ingredientId: judging.ingredientId,
    ingredientName: ingredientData(judging.ingredientId)?.ingredientName || "추가 재료",
    score,
    rank,
    prize,
    tasteScore,
    levelBonus,
    prestigeBonus,
    luckBonus,
    judges: judgeResults,
  };
  state.contest.history.unshift({ ...state.contest.result, dayKey: state.contest.dayKey });
  state.contest.history = state.contest.history.slice(0, 12);
  state.contest.judging = null;
  saveState();
  updateHud();
  if (!dom.menuScreen.hidden && state.ui.screen === "contest") renderMenu();
  return true;
}

function updateContestJudging(dt) {
  if (!state.contest.judging) return;
  state.contest.judging.elapsed += Math.max(0, Number(dt) || 0);
  if (state.contest.judging.elapsed >= state.contest.judging.duration) finishContestJudging();
}

function renderContestMenu() {
  ensureContestDailyReset();
  normalizeContestSelection();
  dom.menuKicker.textContent = "요리사 도전";
  dom.menuTitle.textContent = "요리 대회";
  dom.menuTabs.innerHTML = "";
  if (state.contest.result) {
    const result = state.contest.result;
    const nextTier = CONTEST_TIERS.find((tier) => tier.previousTierId === result.tierId);
    const nextUnlocked = nextTier && contestTierUnlocked(nextTier);
    dom.menuContent.innerHTML = `<section class="contest-result rank-${result.rank}">
      <span class="contest-result-kicker">${result.tierName}</span>
      <div class="contest-rank"><b>${result.rank}</b><span>등</span></div>
      <img src="${routeRecipeIcon(result.recipeId)}" alt="" />
      <h3>${result.recipeName} + ${ingredientData(result.ingredientId)?.emoji || "✦"} ${result.ingredientName}</h3>
      <strong>${result.score}점</strong>
      <div class="contest-result-prize"><img src="assets/ui/currency/icon_currency_001.png" alt="" /><b>+${formatNumber(result.prize)}</b></div>
      <div class="contest-judge-results">${result.judges.map((judge) => `<article class="${judge.extraMatch ? "is-perfect" : judge.recipeMatch ? "is-good" : ""}"><span>${judge.icon}</span><strong>${judge.name}</strong><small>${judge.reaction}</small><b>+${judge.points}</b></article>`).join("")}</div>
      ${result.rank === 1 && nextTier ? `<p>${nextUnlocked ? `${nextTier.name} 참가 자격 획득!` : `다음 목표 · 요리 ${nextTier.recipeRequirement}개`}</p>` : ""}
      <button type="button" class="contest-result-close" data-action="contest-result-close">대회 목록으로</button>
    </section>`;
    return;
  }
  if (state.contest.judging) {
    const judging = state.contest.judging;
    const tier = contestTier(judging.tierId);
    dom.menuContent.innerHTML = `<section class="contest-judging">
      <span>심사 중</span><h3>${tier.name}</h3>
      <div class="contest-entry-dish"><img src="${routeRecipeIcon(judging.recipeId)}" alt="" /><b>+</b><i>${ingredientData(judging.ingredientId)?.emoji || "✦"}</i></div>
      <div class="contest-judging-panel">${tier.judges.map((key, index) => { const judge = contestJudgePreference(key); return `<article style="--judge-delay:${index * .18}s"><span>${judge.icon}</span><strong>${judge.name}</strong><i>•••</i></article>`; }).join("")}</div>
      <div class="contest-judging-bar"><i></i></div><p>심사위원들이 맛을 평가하고 있어요</p>
    </section>`;
    return;
  }

  const tier = contestTier(state.contest.selectedTierId);
  const recipes = contestRecipeOptions();
  const ingredients = contestIngredientOptions();
  const selectedRecipe = Number(state.contest.selectedRecipeId);
  const selectedIngredient = Number(state.contest.selectedIngredientId);
  const entryCost = contestEntryCost();
  const canSubmit = contestTierUnlocked(tier) && selectedRecipe && selectedIngredient
    && ingredientAmount(selectedIngredient) > 0 && (entryCost === 0 || state.resources.gems >= entryCost);
  const tierButtons = CONTEST_TIERS.map((item) => {
    const unlocked = contestTierUnlocked(item);
    const won = state.contest.firstPlaceTierIds.includes(item.id);
    return `<button type="button" class="contest-tier-button ${item.id === tier.id ? "is-active" : ""} ${unlocked ? "" : "is-locked"}" data-action="contest-tier" data-id="${item.id}" ${unlocked ? "" : "disabled"}><span>${won ? "🏆" : unlocked ? "🍽️" : "🔒"}</span><strong>${item.shortName}</strong><small>${won ? "1등 완료" : contestTierRequirementText(item)}</small></button>`;
  }).join("");
  const judgeCards = tier.judges.map((key) => {
    const judge = contestJudgePreference(key);
    return `<article class="contest-judge-card"><span>${judge.icon}</span><strong>${judge.name}</strong><small>${judge.hint}</small></article>`;
  }).join("");
  const recipeCards = recipes.map((route) => {
    const owned = recipeData(route.recipeId);
    return `<button type="button" class="contest-choice-card ${selectedRecipe === route.recipeId ? "is-selected" : ""}" data-action="contest-recipe" data-id="${route.recipeId}"><img src="${routeRecipeIcon(route.recipeId)}" alt="" /><strong>${routeRecipeName(route.recipeId)}</strong><small>Lv.${owned.level}</small></button>`;
  }).join("");
  const ingredientCards = ingredients.map((ingredient) => `<button type="button" class="contest-ingredient-card ${selectedIngredient === ingredient.id ? "is-selected" : ""}" data-action="contest-ingredient" data-id="${ingredient.id}"><span>${ingredient.emoji}</span><strong>${ingredient.ingredientName}</strong><small>×${ingredientAmount(ingredient.id)}</small></button>`).join("");
  dom.menuContent.innerHTML = `<section class="contest-daily-status"><span>${entryCost === 0 ? "오늘의 무료 참가 가능" : `오늘 ${state.contest.entriesToday}회 참가`}</span><strong>${entryCost === 0 ? "무료" : `추가 참가 💎 ${entryCost}`}</strong></section>
    <div class="contest-tier-list">${tierButtons}</div>
    <section class="contest-tier-summary"><div><span>현재 대회</span><strong>${tier.name}</strong><small>1등 기준 ${tier.firstPlaceScore}점 · 상금 ${formatNumber(Math.round(tier.prizes[0] * contestPrizeMultiplier()))}${contestPrizeMultiplier() > 1 ? ` (노하우 +${Math.round((contestPrizeMultiplier() - 1) * 100)}%)` : ""}</small></div><b>${state.contest.firstPlaceTierIds.includes(tier.id) ? "🏆" : ""}</b></section>
    <h3 class="contest-section-title">심사위원 취향</h3><div class="contest-judge-list">${judgeCards}</div>
    <h3 class="contest-section-title">출품할 요리</h3><div class="contest-choice-list">${recipeCards}</div>
    <h3 class="contest-section-title">추가 재료 1개 <small>출품 시 소비</small></h3><div class="contest-ingredient-list">${ingredientCards || `<p class="contest-empty">보유한 재료가 없어요.</p>`}</div>
    <button type="button" class="contest-submit" data-action="contest-submit" ${canSubmit ? "" : "disabled"}>${entryCost === 0 ? "무료로 출품하기" : `보석 ${entryCost}개로 다시 출품`}</button>`;
}

function expandedCraftIngredientIds(route) {
  return craftIngredientRequirements(route)
    .flatMap((requirement) => Array.from({ length: requirement.count }, () => requirement.ingredientId));
}

function discoveryOrderedRecipeRoutes() {
  // `RECIPE_PROGRESSION` is authored in the same top-to-bottom order as
  // `레시피(기획)`. Never re-sort it by unlock state: card numbers and positions
  // must remain stable after discovering or upgrading a recipe.
  return [...RECIPE_PROGRESSION];
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
    const recipe = getRecipe(route.recipeId);
    const currentPrice = Math.round(recipeLevelPrice(recipe, owned));
    const canUpgrade = canManualUpgradeRecipe(route.recipeId);
    const formula = requirements.map((requirement) => {
      const amount = ingredientAmount(requirement.ingredientId);
      return `<span class="${amount >= requirement.count ? "is-ready" : ""}" title="${requirement.name} ${amount}/${requirement.count}">${requirement.emoji}<b>${amount}/${requirement.count}</b></span>`;
    }).join(`<i>+</i>`);
    return `<article class="recipe-catalog-card is-discovered" data-recipe-id="${route.recipeId}">
      <div class="recipe-catalog-icon"><img src="${routeRecipeIcon(route.recipeId)}" alt="" /></div>
      <div class="recipe-catalog-copy"><small>NO.${String(index + 1).padStart(2, "0")} · Lv.${owned.level}</small><strong>${routeRecipeName(route.recipeId)}</strong><small class="recipe-catalog-price">가격 ${formatNumber(currentPrice)} · 다음 +${Math.round(RECIPE_LEVEL_PRICE_BONUS * 100)}%</small><div class="recipe-catalog-formula">${formula}</div></div>
      <div class="recipe-catalog-actions">${!owned.codexClaimed ? `<button type="button" class="is-secondary" data-action="codex" data-id="${route.recipeId}">도감 보상</button>` : ""}<button type="button" data-action="manual-upgrade" data-id="${route.recipeId}" ${canUpgrade ? "" : "disabled"}>${canUpgrade ? "레벨업" : "재료 부족"}</button></div>
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
  const fridgeTab = state.ui.tab === "ingredients";
  dom.menuKicker.textContent = fridgeTab ? "재료 관리" : "도마 테이블";
  dom.menuTitle.textContent = fridgeTab ? "냉장고" : "요리 연구";
  renderTabs([["craft", "연구"], ["ingredients", "냉장고"]]);
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
      return `<span class="bowl-ingredient ${index === mixingDropIndex ? "is-dropping" : ""}" style="--x:${position.x}%;--y:${position.y}%;--r:${position.r}deg"><span>${ingredient.emoji}</span><small>${ingredient.ingredientName}</small></span>`;
    }).join("");
    const remainingPickerCapacity = Math.max(0, capacity - selected.length);
    const selectedPickerItems = Array.from({ length: capacity }, (_, index) => {
      const ingredient = selected[index];
      return ingredient
        ? `<button type="button" data-action="remove-selected-ingredient" data-id="${ingredient.id}" aria-label="${index + 1}번 칸 ${ingredient.ingredientName} 빼기"><span>${ingredient.emoji}</span><strong>${ingredient.ingredientName}</strong><small>${index + 1}</small></button>`
        : `<span class="recipe-picker-empty-slot" aria-hidden="true"><b>${index + 1}</b><small>빈 칸</small></span>`;
    }).join("");
    const ingredientPicker = state.ui.recipeIngredientPickerOpen ? `<div class="recipe-ingredient-modal" role="presentation">
      <button type="button" class="recipe-ingredient-backdrop" data-action="close-ingredient-picker" aria-label="재료 선택 닫기"></button>
      <section class="recipe-ingredient-dialog" role="dialog" aria-modal="true" aria-label="보울에 재료 넣기">
        <header><div><small>최대 ${capacity}개</small><h3>재료 넣기</h3></div><button type="button" data-action="close-ingredient-picker" aria-label="닫기">×</button></header>
        <div class="recipe-picker-capacity" aria-label="보울 용량 ${selected.length}/${capacity}, ${remainingPickerCapacity ? `남은 ${remainingPickerCapacity}칸` : "가득 참"}"><strong>보울 용량</strong><span>${selected.length}/${capacity} · ${remainingPickerCapacity ? `남은 ${remainingPickerCapacity}칸` : "가득 참"}</span></div>
        <div class="recipe-picker-selected" aria-label="선택한 재료 ${selected.length}/${capacity}">${selectedPickerItems}</div>
        <strong class="recipe-picker-label">보유 재료</strong>
        <div class="combination-picker recipe-picker-grid">${visibleIngredients.length ? visibleIngredients.map((ingredient) => {
          const selectedCount = selectedIngredientCount(ingredient.id);
          const available = ingredientAmount(ingredient.id) - selectedCount;
          return `<button type="button" data-action="select-ingredient" data-id="${ingredient.id}" ${available > 0 && selected.length < capacity ? "" : "disabled"}><span>${ingredient.emoji}</span><strong>${ingredient.name}</strong><small>${available}/${ingredientAmount(ingredient.id)}</small></button>`;
        }).join("") : `<p>냉장고에 재료가 없어요.</p>`}</div>
        <button type="button" class="recipe-picker-mix" data-action="discover-combination" ${selected.length >= 2 && !recipeResearch ? "" : "disabled"}><span aria-hidden="true">🥄</span> ${selected.length >= 2 ? `바로 섞기 · ${selected.length}/${capacity}` : `재료를 2개 이상 담아주세요 · ${selected.length}/${capacity}`}</button>
      </section>
    </div>` : "";
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
      <div class="bowl-upgrade-bar">
        <div><strong>보울 확장</strong><small>${capacity}/${BOWL_CAPACITY_MAX}칸</small></div>
        <button type="button" data-action="expand-bowl-capacity" ${capacity >= BOWL_CAPACITY_MAX || state.resources.gems < BOWL_CAPACITY_EXPANSION_GEM_COST ? "disabled" : ""}>${capacity >= BOWL_CAPACITY_MAX ? `<strong>최대 용량</strong>` : `<img src="assets/ui/currency/icon_currency_002.png" alt="보석"/><span>${BOWL_CAPACITY_EXPANSION_GEM_COST}</span><strong>+${BOWL_CAPACITY_EXPANSION_AMOUNT}칸</strong>`}</button>
      </div>
      <button type="button" class="mixing-board" data-action="open-ingredient-picker" aria-label="보울을 열어 재료 넣기">
        <span class="board-grain grain-one" aria-hidden="true"></span><span class="board-grain grain-two" aria-hidden="true"></span>
        <div class="mixing-bowl" aria-label="재료를 담는 보울">
          <div class="mixing-bowl-rim"></div>
          <div class="mixing-bowl-contents">${bowlIngredients || `<span class="empty-bowl-hint">눌러서 재료 넣기</span>`}</div>
          <div class="mixing-bowl-front"><span aria-hidden="true">♨</span></div>
        </div>
        <div class="bowl-capacity" aria-label="보울 용량">${Array.from({ length: capacity }, (_, index) => `<i class="${index < selected.length ? "is-filled" : ""}"></i>`).join("")}</div>
      </button>
      <div class="ingredient-shelf-title"><strong>보울을 눌러 재료 넣기</strong><small>${selected.length}/${capacity}</small></div>
      <button class="research-button auto-research-button" data-action="auto-craft" ${autoUnlocked && !recipeResearch ? "" : "disabled"}>${autoUnlocked ? "자동 요리 연구" : `자동 연구 · 요리 ${unlockedRecipeCount()}/5`}</button>
      ${researchOverlay}
    </section>${ingredientPicker}
    <div class="recipe-discovery-status"><strong>발견 가능한 요리</strong><span>${unlockedRecipeCount()}/${RECIPE_PROGRESSION.length} 발견</span></div>
    <div class="recipe-catalog-grid">${discoveryOrderedRecipeRoutes().map(recipeCatalogCard).join("")}</div>`;
  } else {
    const ingredients = storedIngredientIds()
      .map((id) => ingredientData(id))
      .filter(Boolean)
      .sort((a, b) => a.id - b.id);
    const storage = ingredientStorageStatus();
    const fillRatio = storage.capacity ? Math.min(100, storage.totalItems / storage.capacity * 100) : 0;
    dom.menuContent.innerHTML = `<section class="ingredient-storage-panel">
      <div class="ingredient-inventory-summary"><span>냉장고 용량</span><strong>${formatNumber(storage.totalItems)}/${formatNumber(storage.capacity)}칸</strong></div>
      <div class="ingredient-storage-track"><span style="width:${fillRatio}%"></span></div>
      <div class="ingredient-storage-actions"><small>남은 ${formatNumber(storage.remaining)}칸</small><button type="button" data-action="expand-ingredient-storage" ${state.resources.gems >= storage.expansionGemCost ? "" : "disabled"}><img src="assets/ui/currency/icon_currency_002.png" alt="보석"/><span>${storage.expansionGemCost}</span><strong>+${storage.expansionAmount}칸</strong></button></div>
    </section>
      <div class="ingredient-inventory-grid">${ingredients.length ? ingredients.map((ingredient) => `<article class="ingredient-inventory-item" data-ingredient-id="${ingredient.id}"><span class="ingredient-emoji">${ingredient.emoji}</span><strong>${ingredient.ingredientName}</strong><b>${formatNumber(ingredientAmount(ingredient.id))}개</b></article>`).join("") : `<p class="ingredient-storage-empty">냉장고가 비어 있어요.</p>`}</div>`;
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
    unlockLabel: Number(chick.purchaseRequirement || 0) === 0
      ? "기본 병아리"
      : Number(chick.themeId) === 1
        ? `돌 테마 설비 ${chick.purchaseRequirement}종 설치`
        : `${THEME_NAMES[chick.themeId] || "테마"} 파츠 ${chick.purchaseRequirement}종 보유`,
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
  const dropRows = selectedKnown ? (selected.rewardIngredients || []).map((ingredient, index, rewardIngredients) => {
    const chance = rewardIngredients.length === 1 ? 1 : index === 0 ? INGREDIENT_SLOT_WEIGHTS.base : INGREDIENT_SLOT_WEIGHTS.special;
    const slotName = index === 0 ? "기본" : "특별";
    return `<div class="customer-drop-row is-active">
      <span class="customer-drop-kind">${slotName}<b>${Math.round(chance * 100)}%</b></span>
      <i>${ingredient.emoji}</i><strong>${ingredient.name}</strong>
      <small>처음부터 · 1개</small>
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
    <p>${!stageReady ? "무대를 먼저 설치해 주세요." : current ? `식당 가격 +${Math.round(current.abilityValue * 100)}% · ${Math.ceil(state.performance.remaining)}초 남음` : `다음 공연까지 ${Math.ceil(state.performance.cooldown)}초`}</p>
    <button class="research-button" data-action="start-performance" ${stageReady && !current && state.performance.cooldown <= 0 ? "" : "disabled"}>공연 시작</button></section>
    ${tables.performances.map((row) => `<article class="feature-card ${state.collections.performers[row.id] ? "" : "is-locked"}"><img class="feature-icon" src="assets/ui/performance/icon_performance_${String(row.id).padStart(3, "0")}.png" alt="" /><div class="feature-copy"><strong>${state.collections.performers[row.id] ? `공연팀 ${row.id}` : "???"}</strong><small>가격 +${Math.round(row.abilityValue * 100)}% · ${row.performanceTime}초</small><small>${row.price ? `공연료 도토리 ${row.price}` : "무료 공연"}</small></div></article>`).join("")}`;
}

function themeChickProgressTrack(progress, milestones, progressUnit, requirementVerb) {
  const total = Math.max(1, Number(progress.total || 0));
  const current = Math.max(0, Math.min(total, Number(progress.opened || 0)));
  const milestoneByStep = new Map(milestones.map((chick) => [
    Number(chick.purchaseRequirement || 0) === 0 ? 1 : Number(chick.purchaseRequirement), chick,
  ]));
  const nodePosition = (step) => 5 + ((step - 1) / Math.max(1, total - 1)) * 90;
  const fillPercent = current <= 0 ? 0 : nodePosition(current);
  return `<div class="theme-chick-progress-track" aria-label="${progressUnit} ${current}/${total}종">
    <div class="theme-track-count"><strong>${current}</strong><span>/ ${total}</span></div>
    <div class="theme-step-rail" aria-hidden="true"><i style="width:${fillPercent}%"></i></div>
    <ol class="theme-step-nodes">${Array.from({ length: total }, (_, index) => {
    const step = index + 1;
    const chick = milestoneByStep.get(step);
    const reached = current >= step;
    if (!chick) return `<li class="theme-step-node ${reached ? "is-reached" : "is-future"}" style="left:${nodePosition(step)}%" aria-label="${progressUnit} ${step}종">${step}</li>`;
    const requirement = Number(chick.purchaseRequirement || 0);
    const unlocked = current >= requirement;
    const condition = requirement ? `${progressUnit} ${requirement}종 ${requirementVerb}` : "기본 등장";
    return `<li class="theme-step-node is-chick ${unlocked ? "is-unlocked" : "is-locked"}" style="left:${nodePosition(step)}%" title="${chick.customerName} · ${condition}" aria-label="${chick.customerName} · ${condition} · ${unlocked ? "등장" : "미등장"}"><img src="${guestIcon({ customerId: chick.customerId, commonId: chick.commonId })}" alt=""/></li>`;
  }).join("")}</ol>
  </div>`;
}

function themePartDetailMarkup(row) {
  if (!row) return "";
  const opened = state.themes.opened.includes(row.id);
  const active = state.themes.activeByFacility[row.facilityType] === row.id;
  const available = isThemePartAvailable(row);
  const collectible = row.purchaseType === 2;
  const canBuy = available && !collectible && state.resources.acorns >= row.facilityPrice;
  const facilityName = FACILITY_META[row.facilityType]?.name || `설비 ${row.facilityType}`;
  const currentRevenue = Math.round((restaurantPriceUpMultiplier() - 1) * 100);
  const purchaseRows = tables.restaurantThemes.filter((item) => Number(item.facilityTheme) === Number(row.facilityTheme)
    && Number(item.purchaseType) === 1);
  const completesTheme = !opened && purchaseRows.every((item) => Number(item.id) === Number(row.id)
    || state.themes.opened.includes(item.id));
  const afterRevenue = currentRevenue
    + (opened ? 0 : Math.round(Number(row.abilityValue || 0) * 100))
    + (completesTheme ? Math.round(THEME_COMPLETION_MENU_PRICE_BONUS * 100) : 0);
  let action = "buy-theme";
  let actionLabel = "구매하고 적용";
  let disabled = !canBuy;
  if (opened && active) {
    action = "apply-theme";
    actionLabel = "현재 적용 중";
    disabled = true;
  } else if (opened && available) {
    action = "apply-theme";
    actionLabel = "이 파츠 적용";
    disabled = false;
  } else if (!available) actionLabel = "해당 설비 설치 후 이용";
  else if (collectible && !opened) actionLabel = "테마 전체 수집 보상";
  const status = active ? "적용 중" : opened ? "보유 중" : collectible ? "수집 보상" : "미보유";
  return `<div class="theme-part-modal" role="presentation">
    <button type="button" class="theme-part-backdrop" data-action="theme-part-close" aria-label="파츠 상세 닫기"></button>
    <section class="theme-part-dialog" role="dialog" aria-modal="true" aria-label="${facilityName} 파츠 상세">
      <button type="button" class="theme-part-dialog-close" data-action="theme-part-close">닫기</button>
      <small>${THEME_NAMES[row.facilityTheme] || `테마 ${row.facilityTheme}`}</small>
      <img src="${themeFacilityIcon(row)}" alt=""/>
      <h3>${facilityName}</h3>
      <span class="theme-part-detail-status ${active ? "is-active" : opened ? "is-owned" : ""}">${status}</span>
      <div class="theme-part-income"><span>보유 수익 효과</span><strong>+${Math.round(Number(row.abilityValue || 0) * 100)}%</strong><small>구매 즉시 레스토랑 수익에 영구 누적</small></div>
      <div class="theme-part-revenue-preview"><span>현재 누적 수익 <b>+${currentRevenue}%</b></span>${opened ? "" : `<span>구매 후 <b>+${afterRevenue}%</b></span>`}</div>
      <div class="theme-part-price"><span>가격</span>${collectible ? `<strong>전체 수집 보상</strong>` : `<strong><img src="assets/ui/currency/icon_currency_001.png" alt=""/>${formatNumber(row.facilityPrice)}</strong>`}</div>
      <button type="button" class="theme-part-primary" data-action="${action}" data-id="${row.id}" ${disabled ? "disabled" : ""}>${actionLabel}</button>
    </section>
  </div>`;
}

function renderThemeManagement() {
  const themeIds = [...new Set(tables.restaurantThemes.map((row) => row.facilityTheme))].sort((a, b) => a - b);
  const selectedTheme = themeIds.includes(Number(state.ui.themeId)) ? Number(state.ui.themeId) : themeIds[0];
  state.ui.themeId = selectedTheme;
  const rows = tables.restaurantThemes.filter((row) => row.facilityTheme === selectedTheme);
  const applicableCount = rows.filter((row) => state.themes.opened.includes(row.id)
    && isThemeFacilityAvailable(row.facilityType)
    && state.themes.activeByFacility[row.facilityType] !== row.id).length;
  const milestones = themeChickMilestones(selectedTheme);
  const progress = themeChickProgress(selectedTheme);
  const progressUnit = selectedTheme === 1 ? "설비" : "파츠";
  const requirementVerb = selectedTheme === 1 ? "설치" : "보유";
  const completionAchieved = progress.total > 0 && progress.opened >= progress.total;
  const selectedPart = rows.find((row) => row.id === Number(state.ui.themePartId)) || null;
  const themeBaseName = String(THEME_NAMES[selectedTheme] || `테마 ${selectedTheme}`).replace(/\s*테마$/, "");
  const themeDisplayName = themeBaseName.endsWith("식당") ? themeBaseName : `${themeBaseName} 식당`;

  dom.menuContent.innerHTML = `<div class="theme-management">
    <div class="theme-tabs" aria-label="테마 선택">${themeIds.map((themeId) => {
    const representative = tables.restaurantThemes.find((row) => row.facilityTheme === themeId && row.facilityType === 1)
      || tables.restaurantThemes.find((row) => row.facilityTheme === themeId);
    return `<button type="button" data-action="theme-select" data-id="${themeId}" class="${themeId === selectedTheme ? "is-active" : ""}" aria-label="${THEME_NAMES[themeId] || `테마 ${themeId}`}" title="${THEME_NAMES[themeId] || `테마 ${themeId}`}"><img src="${themeFacilityIcon(representative)}" alt=""/></button>`;
    }).join("")}</div>
    <section class="theme-set-panel">
      <header><strong>${themeDisplayName}</strong></header>
      ${themeChickProgressTrack(progress, milestones, progressUnit, requirementVerb)}
      <div class="theme-completion-effect ${completionAchieved ? "is-complete" : "is-locked"}" aria-label="전체 구매 효과 메뉴 가격 20% 상승 ${completionAchieved ? "적용 중" : "잠김"}">
        <span>전체 구매 효과</span><img src="assets/ui/common/${completionAchieved ? "icon_check.png" : "icon_lock.png"}" alt=""/><strong>메뉴 가격 +20% 상승</strong>
      </div>
      <div class="theme-part-grid">${rows.map((row) => {
    const opened = state.themes.opened.includes(row.id);
    const active = state.themes.activeByFacility[row.facilityType] === row.id;
    const available = isThemePartAvailable(row);
    const collectible = row.purchaseType === 2;
    const statusClass = active ? "is-active" : opened ? "is-owned" : "is-priced";
    const status = active ? "적용 중" : opened ? "보유 중" : collectible ? "수집 보상" : `<img src="assets/ui/currency/icon_currency_001.png" alt=""/>${formatNumber(row.facilityPrice)}`;
    const facilityName = FACILITY_META[row.facilityType]?.name || `설비 ${row.facilityType}`;
    return `<button type="button" class="theme-part-card ${statusClass} ${available || opened ? "" : "is-unavailable"}" data-action="theme-part-detail" data-id="${row.id}" aria-label="${facilityName} · ${active ? "적용 중" : opened ? "보유 중" : `가격 ${formatNumber(row.facilityPrice)}`}"><img class="theme-part-art" src="${themeFacilityIcon(row)}" alt=""/><span>${status}</span></button>`;
  }).join("")}</div>
    </section>
    <footer class="theme-apply-footer"><button type="button" data-action="apply-theme-all" data-id="${selectedTheme}" ${applicableCount ? "" : "disabled"}>보유 파츠 전체 적용</button></footer>
  </div>${themePartDetailMarkup(selectedPart)}`;
  requestAnimationFrame(() => {
    const tabs = dom.menuContent.querySelector(".theme-tabs");
    const selected = tabs?.querySelector(`[data-id="${selectedTheme}"]`);
    if (tabs && selected) tabs.scrollLeft = Math.max(0, selected.offsetLeft - (tabs.clientWidth - selected.clientWidth) / 2);
    dom.menuContent.scrollTop = themeMenuScrollTop;
    if (selectedPart) dom.menuContent.querySelector(".theme-part-dialog-close")?.focus({ preventScroll: true });
  });
}

function renderKnowhowMenu() {
  const previousViewport = dom.menuContent.querySelector(".knowhow-map-viewport");
  if (previousViewport) {
    knowhowMapScroll = { left: previousViewport.scrollLeft, top: previousViewport.scrollTop };
  }
  const selected = knowhowSkill(state.knowhow.selectedSkillId);
  const selectedLevel = knowhowSkillLevel(selected.id);
  const selectedMaxed = selectedLevel >= selected.maxLevel;
  const selectedAvailable = knowhowPrerequisitesMet(selected);
  const selectedCost = knowhowUpgradeCost(selected);
  const pointWord = state.knowhow.points === 1 ? "POINT" : "POINTS";
  const connections = KNOWHOW_SKILLS.flatMap((skill) => skill.prerequisites.map((requirement) => {
    const from = knowhowSkill(requirement.id);
    const active = knowhowSkillLevel(requirement.id) >= requirement.level;
    const middleY = Math.round(from.y + (skill.y - from.y) * .48);
    return `<path d="M ${from.x} ${from.y} V ${middleY} H ${skill.x} V ${skill.y}" class="${active ? "is-active" : ""}" />`;
  })).join("");
  const nodes = KNOWHOW_SKILLS.map((skill) => {
    const level = knowhowSkillLevel(skill.id);
    const available = knowhowPrerequisitesMet(skill);
    const maxed = level >= skill.maxLevel;
    const status = level > 0 ? maxed ? "is-maxed" : "is-owned" : available ? "is-available" : "is-locked";
    return `<button type="button" class="knowhow-node ${status} ${selected.id === skill.id ? "is-selected" : ""}" style="--node-x:${skill.x}px;--node-y:${skill.y}px" data-action="knowhow-select" data-skill-id="${skill.id}"><span>${skill.icon}</span><strong>${skill.name}</strong><small>${skill.id === "restaurant_basics" ? "ROOT" : level ? "습득" : `${skill.costs[0]}P`}</small></button>`;
  }).join("");
  let actionLabel = `포인트 ${selectedCost}개 사용`;
  let actionDisabled = false;
  if (selected.id === "restaurant_basics" || selectedMaxed) { actionLabel = "습득 완료"; actionDisabled = true; }
  else if (!selectedAvailable) { actionLabel = `${knowhowPrerequisiteText(selected)} 필요`; actionDisabled = true; }
  else if (state.knowhow.points < selectedCost) { actionLabel = `포인트 ${selectedCost}개 필요`; actionDisabled = true; }

  dom.menuKicker.textContent = "요리할수록 쌓이는 경험";
  dom.menuTitle.textContent = "식당 노하우";
  dom.menuTabs.innerHTML = "";
  const xpRequirement = knowhowXpRequirement();
  const xpPercent = Math.min(100, state.knowhow.xp / xpRequirement * 100);
  dom.menuContent.innerHTML = `<section class="knowhow-progress-card">
      <img src="assets/ui/chick/icon_chick_chef.png" alt="" />
      <div><span>보유 노하우</span><strong>${state.knowhow.points} ${pointWord}</strong><div class="knowhow-xp-bar"><i style="width:${xpPercent}%"></i></div><small>경험치 ${state.knowhow.xp}/${xpRequirement} · 다음 포인트는 +${KNOWHOW_XP_GROWTH} 필요</small><small>연구 +${KNOWHOW_RESEARCH_XP} · 손님 음식 +${KNOWHOW_SERVICE_XP}</small></div>
    </section>
    <p class="knowhow-guide">노하우를 눌러 효과를 확인하세요. 화면은 드래그로 움직일 수 있어요.</p>
    <div class="knowhow-map-viewport"><div class="knowhow-map">
      <svg viewBox="0 0 480 2200" aria-hidden="true">${connections}</svg>
      <span class="knowhow-branch-label" style="--label-x:80px">자동 운영</span><span class="knowhow-branch-label" style="--label-x:240px">재료 수급</span><span class="knowhow-branch-label" style="--label-x:400px">요리 성장</span>${nodes}
    </div></div>
    <section class="knowhow-detail ${selectedAvailable ? "" : "is-locked"}">
      <span class="knowhow-detail-icon">${selected.icon}</span><div class="knowhow-detail-copy"><small>${selected.id === "restaurant_basics" ? "모든 노하우의 시작" : `${knowhowPrerequisiteText(selected)} 다음`}</small><h3>${selected.name} <b>${selectedMaxed ? "습득 완료" : "미습득"}</b></h3>
      <p>${selected.effect()}</p>${!selectedMaxed && selected.id !== "restaurant_basics" ? `<em>포인트를 사용하면 이 효과가 영구 적용돼요.</em>` : ""}</div>
      <button type="button" data-action="knowhow-upgrade" data-skill-id="${selected.id}" ${actionDisabled ? "disabled" : ""}>${actionLabel}</button>
    </section>`;
  const nextViewport = dom.menuContent.querySelector(".knowhow-map-viewport");
  if (nextViewport) {
    nextViewport.scrollLeft = knowhowMapScroll.left;
    nextViewport.scrollTop = knowhowMapScroll.top;
  }
}

function renderMenu() {
  dom.menuContent.classList.toggle("is-theme-content", state.ui.screen === "theme");
  if (state.ui.screen === "recipe") renderRecipeMenu();
  else if (state.ui.screen === "buffet") renderBuffetStandMenu();
  else if (state.ui.screen === "contest") renderContestMenu();
  else if (state.ui.screen === "missions") renderMissionMenu();
  else if (state.ui.screen === "collection") renderCollectionMenu();
  else if (state.ui.screen === "knowhow") renderKnowhowMenu();
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
  guestToastQueue = [];
  toastTimer = 0;
  guestToastTimer = 0;
  dom.guestToast.hidden = true;
  dom.installPanel.hidden = true;
  dom.offlineRewardPanel.hidden = true;
  dom.specialPromoPanel.hidden = true;
  closeTipboxPanel();
  closeSpecialVisitorPanel(false);
  toggleDebugPanel(false);
  dismissRecipeReveal();
  state = createInitialState();
  chefPosition = { ...CHEF_HOME_POSITION };
  closeMenu();
  showToast("새 식당을 시작합니다.");
  saveState();
  updateHud();
  updateTutorialDialogue();
  render();
}

const DEBUG_RESOURCE_NAMES = Object.freeze({
  acorns: "도토리",
  ideas: "아이디어",
  gems: "보석",
  stickers: "스티커",
});

function toggleDebugPanel(force) {
  const shouldOpen = typeof force === "boolean" ? force : dom.debugPanel.hidden;
  dom.debugPanel.hidden = !shouldOpen;
  dom.debugToggleButton.classList.toggle("is-open", shouldOpen);
  dom.debugToggleButton.setAttribute("aria-expanded", String(shouldOpen));
  if (shouldOpen) {
    closeSpecialPromotionPanel();
    if (!dom.installPanel.hidden) closeInstallPanel();
  }
}

function debugInstallAllFacilities() {
  const before = new Set(state.installed);
  const added = tables.installs.filter((row) => !before.has(row.id));
  state.installed = [...new Set([...state.installed, ...tables.installs.map((row) => row.id)])].sort((a, b) => a - b);
  dom.installPanel.hidden = true;
  state.ui.selectedInstallId = null;
  saveState();
  updateHud();
  render();
  showToast(added.length ? `초기 설비 ${added.length}개를 설치했어요.` : "초기 설비가 이미 모두 설치되어 있어요.", 3);
}

function debugAddResource() {
  const resourceKey = dom.debugResourceType.value;
  const requested = Math.floor(Number(dom.debugResourceAmount.value));
  if (!Object.prototype.hasOwnProperty.call(DEBUG_RESOURCE_NAMES, resourceKey) || !Number.isFinite(requested) || requested <= 0) {
    showToast("추가할 재화 수량을 확인해 주세요.");
    dom.debugResourceAmount.focus();
    return;
  }
  const amount = Math.min(requested, Number.MAX_SAFE_INTEGER - Number(state.resources[resourceKey] || 0));
  if (amount <= 0) {
    showToast("더 이상 재화를 추가할 수 없어요.");
    return;
  }
  state.resources[resourceKey] = Number(state.resources[resourceKey] || 0) + amount;
  saveState();
  updateHud();
  render();
  showToast(`${DEBUG_RESOURCE_NAMES[resourceKey]} ${formatNumber(amount)} 추가!`, 2.5);
}

function populateDebugIngredients() {
  const leaf = GAME_INGREDIENTS.leaf;
  const others = Object.values(GAME_INGREDIENTS).filter((ingredient) => ingredient.id !== leaf.id)
    .sort((a, b) => a.id - b.id);
  dom.debugIngredientType.innerHTML = `<optgroup label="자주 쓰는 재료"><option value="${leaf.id}">${leaf.emoji} ${leaf.name}</option></optgroup><optgroup label="전체 재료">${others
    .map((ingredient) => `<option value="${ingredient.id}">${ingredient.emoji} ${ingredient.name}</option>`)
    .join("")}</optgroup>`;
  dom.debugIngredientType.value = String(leaf.id);
}

function debugAddIngredient() {
  const ingredientId = Number(dom.debugIngredientType.value);
  const ingredient = ingredientData(ingredientId);
  const requested = Math.floor(Number(dom.debugIngredientAmount.value));
  if (!ingredient || !Number.isFinite(requested) || requested <= 0) {
    showToast("추가할 재료와 수량을 확인해 주세요.");
    dom.debugIngredientAmount.focus();
    return false;
  }
  const amount = Math.min(requested, Number.MAX_SAFE_INTEGER - ingredientAmount(ingredientId));
  if (amount <= 0) return false;
  const nextTotal = ingredientStorageStatus().totalItems + amount;
  state.crafting.storageCapacity = Math.max(Number(state.crafting.storageCapacity || 0), nextTotal);
  state.crafting.ingredients[ingredientId] = ingredientAmount(ingredientId) + amount;
  saveState();
  updateHud();
  if (!dom.menuScreen.hidden && state.ui.screen === "recipe") renderMenu();
  showToast(`${ingredient.emoji} ${ingredient.ingredientName} ${formatNumber(amount)}개 추가!`, 2.5);
  return true;
}

function debugSpawnSpecialVisitor() {
  closeSpecialVisitorPanel(false);
  state.specialActors = [];
  const type = dom.debugSpecialType.value;
  if (spawnSpecialVisitor(type)) {
    toggleDebugPanel(false);
    render();
  }
}

function frame(now) {
  const elapsed = Math.min(.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (!deterministicStepping) update(elapsed);
  render();
  requestAnimationFrame(frame);
}

function renderGameToText() {
  const inspectedThemeId = Number(state.ui.themeId || 1);
  const inspectedThemeRows = tables.restaurantThemes.filter((row) => row.facilityTheme === inspectedThemeId);
  const inspectedThemeProgress = themeChickProgress(inspectedThemeId);
  const candidates = installCandidates().map((row) => {
    const position = facilityPlacement(row);
    return {
      id: row.id,
      facilityType: row.facilityType,
      facilityGroup: row.facilityGroup,
      name: FACILITY_META[row.facilityType]?.name,
      cost: row.facilityPrice,
      x: position.x,
      y: position.y,
      position,
    };
  });
  const chefTarget = chefMovementTarget();
  const stationPositions = Object.fromEntries([[6, "fridge"], [7, "sink"], [8, "countertop"]].map(([facilityType, key]) => {
    const row = tables.installs.find((item) => Number(item.facilityType) === facilityType);
    return [key, row ? facilityPlacement(row) : null];
  }));
  return JSON.stringify({
    coordinateSystem: "canvas 480x900; origin top-left; x right; y down",
    mode: state.ui.area,
    menuContext: state.ui.area,
    visibleRecipeType: "restaurant",
    visibleThemeType: "restaurant",
    objective: currentObjective(),
    resources: state.resources,
    assetLibrary: {
      unityUiSpritesSynced: true,
      chickIconRange: [1, CHICK_ICON_MAX_INDEX],
      latestChickIcons: [104, 105, 106, 107, 108].map((index) => `assets/ui/chick/icon_chick_${String(index).padStart(3, "0")}.png`),
    },
    debug: {
      panelVisible: !dom.debugPanel.hidden,
      installedFacilities: tables.installs.filter((row) => isInstalled(row.id)).length,
      totalInstallFacilities: tables.installs.length,
      supportedResources: Object.keys(DEBUG_RESOURCE_NAMES),
      supportedIngredients: Object.values(GAME_INGREDIENTS).map((ingredient) => ({ id: ingredient.id, name: ingredient.name })),
    },
    installedFacilityIds: state.installed,
    installCandidates: candidates,
    installationSystem: {
      mode: "individual-field-installation",
      separateInstallPanel: true,
      selectedInstallId: Number(state.ui.selectedInstallId) || null,
      candidates,
      stoneParts: tables.restaurantThemes.filter((row) => Number(row.facilityTheme) === 1).map((row) => ({
        id: row.id,
        facilityType: row.facilityType,
        name: FACILITY_META[row.facilityType]?.name,
        cost: row.facilityPrice,
        owned: state.themes.opened.includes(row.id),
        installedIds: tables.installs.filter((item) => Number(item.facilityType) === Number(row.facilityType))
          .map((item) => item.id).filter((id) => isInstalled(id)),
      })),
    },
    facilityInteractions: {
      sinkWater: {
        installed: installedRows(7).length > 0,
        ingredientId: GAME_INGREDIENTS.water.id,
        ingredientName: GAME_INGREDIENTS.water.name,
        acquisition: "guaranteed-after-timer",
        chance: 1,
        cooldownSeconds: SINK_WATER_COOLDOWN_SECONDS,
        remainingCooldown: Number(Math.max(0, state.facilityInteractions.sinkWater.readyAt - state.clock).toFixed(2)),
        ready: state.facilityInteractions.sinkWater.readyAt <= state.clock,
        attempts: state.facilityInteractions.sinkWater.attempts,
        collected: state.facilityInteractions.sinkWater.collected,
        placement: stationPositions.sink,
      },
      countertop: {
        installed: installedRows(8).length > 0,
        tapAction: "open-recipe-crafting-sheet",
        placement: stationPositions.countertop,
      },
      fridge: {
        installed: installedRows(6).length > 0,
        tapAction: "open-recipe-fridge-tab",
        placement: stationPositions.fridge,
      },
    },
    chef: {
      position: { x: Number(chefPosition.x.toFixed(1)), y: Number(chefPosition.y.toFixed(1)) },
      target: { x: chefTarget.x, y: chefTarget.y },
      station: chefTarget.station,
      moving: Math.hypot(chefTarget.x - chefPosition.x, chefTarget.y - chefPosition.y) > 1,
      home: { ...CHEF_HOME_POSITION },
      behavior: "move-to-countertop-or-fridge-and-return-home-on-close",
    },
    tutorial: {
      activeId: state.tutorial?.activeId || null,
      text: TUTORIAL_DIALOGUES[state.tutorial?.activeId] || null,
      seen: [...(state.tutorial?.seen || [])],
    },
    toast: {
      visible: !dom.toast.hidden,
      text: dom.toast.hidden ? null : dom.toast.textContent,
      variant: dom.toast.hidden ? null : dom.toast.dataset.variant || "default",
      routineEventsSilent: ["guest-arrival", "order-taken", "food-delivered", "ingredient-collected", "payment-collected", "tip-collected"],
    },
    newGuestAlert: {
      visible: !dom.guestToast.hidden,
      text: dom.guestToast.hidden ? null : dom.guestToast.textContent,
      queued: guestToastQueue.length,
      presentation: "separate-upper-right-card",
    },
    mealDurationSeconds: GUEST_MEAL_DURATION_SECONDS,
    bottomNavigation: ["theme", "recipe", "collection", "knowhow"],
    knowhow: {
      name: "식당 노하우",
      xp: state.knowhow.xp,
      xpPerPoint: knowhowXpRequirement(),
      xpCurve: { base: KNOWHOW_XP_BASE, growthPerEarnedPoint: KNOWHOW_XP_GROWTH, earnedPoints: state.knowhow.earnedPoints },
      points: state.knowhow.points,
      totalXp: state.knowhow.totalXp,
      xpRewards: { recipeResearchSuccessOrFailure: KNOWHOW_RESEARCH_XP, guestMealCooking: KNOWHOW_SERVICE_XP },
      selectedSkillId: state.knowhow.selectedSkillId,
      graphPresentation: "connected-mind-map",
      progressionPattern: "balanced-interleaved-categories",
      branchSequences: KNOWHOW_BALANCED_BRANCHES.map((branch) => [...branch]),
      effects: {
        ingredientDropChance: currentIngredientDropChance(),
        bonusIngredientChance: knowhowBonusIngredientChance(),
        cookingSpeedReduction: knowhowCookingReduction(),
        researchSpeedReduction: knowhowResearchReduction(),
        storageBonus: knowhowStorageBonus(),
        merchantDiscount: knowhowMerchantDiscount(),
        buffetIncomeMultiplier: knowhowBuffetIncomeMultiplier(),
        buffetOfflineCapSeconds: buffetOfflineCapSeconds(),
        contestPrizeMultiplier: contestPrizeMultiplier(),
      },
      automation: {
        paymentInterval: knowhowAutoPaymentInterval(),
        ingredientInterval: knowhowAutoIngredientInterval(),
        buffetInterval: knowhowAutoBuffetInterval(),
        orderDelay: knowhowAutoOrderDelay(),
        calmDelay: knowhowAutoCalmDelay(),
        promotionInterval: knowhowAutoPromotionInterval(),
        tipboxExcluded: true,
      },
      nodes: KNOWHOW_SKILLS.map((skill) => ({
        id: skill.id,
        name: skill.name,
        level: knowhowSkillLevel(skill.id),
        maxLevel: skill.maxLevel,
        cost: knowhowUpgradeCost(skill),
        prerequisitesMet: knowhowPrerequisitesMet(skill),
        prerequisites: skill.prerequisites,
        effect: skill.effect(knowhowSkillLevel(skill.id)),
        x: skill.x,
        y: skill.y,
      })),
    },
    promotion: { ...state.promotion, threshold: promotionThreshold(), enabled: coreReady() },
    specialPromotion: {
      unlocked: isSpecialPromotionUnlocked(),
      recipeRequirement: SPECIAL_PROMOTION_RECIPE_REQUIREMENT,
      tutorialSeen: state.tutorial?.seen?.includes("special-promotion-unlocked") || false,
      ingredientId: state.specialPromotion.ingredientId,
      ingredientName: ingredientData(state.specialPromotion.ingredientId)?.ingredientName || null,
      remaining: Number(state.specialPromotion.remaining.toFixed(2)),
      cooldown: Number(state.specialPromotion.cooldown.toFixed(2)),
      duration: SPECIAL_PROMOTION_DURATION,
      cooldownDuration: SPECIAL_PROMOTION_COOLDOWN,
      availableIngredients: specialPromotionChoices().map((choice) => ({
        ingredientId: choice.ingredientId,
        name: choice.name,
        guestIds: choice.guests.map((guest) => guest.customerId),
        guestNames: choice.guests.map((guest) => guest.customerName),
      })),
      detail: specialPromotionDetailIngredientId ? {
        ingredientId: specialPromotionDetailIngredientId,
        name: ingredientData(specialPromotionDetailIngredientId)?.ingredientName || null,
        sources: specialPromotionIngredientSources(specialPromotionDetailIngredientId),
      } : null,
      panelVisible: !dom.specialPromoPanel.hidden,
      filterRule: "unlocked-guests-and-currently-unlocked-reward-slots-only",
    },
    buffet: {
      unlocked: isBuffetUnlocked(),
      recipeRequirement: BUFFET_RECIPE_REQUIREMENT,
      area: state.ui.area,
      standCount: buffetStandCapacity(),
      maxStandCount: BUFFET_MAX_STAND_COUNT,
      standUnlockRequirements: [...BUFFET_STAND_UNLOCK_REQUIREMENTS],
      nextStandRecipeRequirement: nextBuffetStandRequirement(),
      stands: state.buffet.stands.slice(0, buffetStandCapacity()).map((recipeId, standIndex) => {
        const position = buffetStandPositions()[standIndex];
        return {
          standIndex,
          recipeId: recipeId ? Number(recipeId) : null,
          recipeName: recipeId ? routeRecipeName(recipeId) : null,
          yieldPerMinute: recipeId ? buffetRecipeYield(recipeId) : 0,
          x: position.x,
          y: position.y,
        };
      }),
      perMinute: buffetPerMinute(),
      collectionBonusPercent: Math.round((buffetPopularityMultiplierForCount(unlockedRecipeCount()) - 1) * 100),
      nextIncomeIn: Number(Math.max(0, BUFFET_TICK_SECONDS - state.buffet.passiveElapsed).toFixed(2)),
      cashbox: Math.max(0, Math.floor(Number(state.buffet.cashbox || 0))),
      offlineCapSeconds: buffetOfflineCapSeconds(),
      offlinePending: Math.max(0, Math.floor(Number(state.buffet.offlinePending || 0))),
      offlinePanelVisible: !dom.offlineRewardPanel.hidden,
      visitorRule: {
        visitChance: { ...BUFFET_VISIT_CHANCE },
        purchaseChance: { ...BUFFET_PURCHASE_CHANCE },
        purchaseRate: BUFFET_PURCHASE_RATE,
      },
      visitors: state.buffet.visitors.map((visitor) => ({
        id: visitor.id,
        customerId: visitor.customerId,
        customerName: visitor.customerName,
        state: visitor.state,
        recipeId: visitor.recipeId,
        recipeName: routeRecipeName(visitor.recipeId),
        willBuy: Boolean(visitor.willBuy),
        paid: Boolean(visitor.paid),
        purchaseAmount: Number(visitor.purchaseAmount || 0),
        x: Math.round(visitor.x),
        y: Math.round(visitor.y),
      })),
    },
    contest: {
      unlocked: isContestUnlocked(),
      recipeRequirement: CONTEST_RECIPE_REQUIREMENT,
      freeEntriesPerDay: 1,
      extraEntryGemCost: CONTEST_EXTRA_ENTRY_GEM_COST,
      dayKey: state.contest.dayKey,
      entriesToday: state.contest.entriesToday,
      nextEntryCost: contestEntryCost(),
      firstPlaceTierIds: [...state.contest.firstPlaceTierIds],
      selectedTierId: state.contest.selectedTierId,
      selectedRecipeId: state.contest.selectedRecipeId,
      selectedIngredientId: state.contest.selectedIngredientId,
      tiers: CONTEST_TIERS.map((tier) => ({
        id: tier.id,
        name: tier.name,
        recipeRequirement: tier.recipeRequirement,
        previousTierId: tier.previousTierId,
        unlocked: contestTierUnlocked(tier),
        requirementText: contestTierRequirementText(tier),
        firstPlaceScore: tier.firstPlaceScore,
        prizes: tier.prizes.map((prize) => Math.round(prize * contestPrizeMultiplier())),
        judges: tier.judges.map((key) => {
          const judge = contestJudgePreference(key);
          return { key, name: judge.name, hint: judge.hint };
        }),
      })),
      judging: state.contest.judging ? {
        ...state.contest.judging,
        progress: Number(Math.min(1, state.contest.judging.elapsed / state.contest.judging.duration).toFixed(3)),
      } : null,
      result: state.contest.result,
      availableRecipeIds: contestRecipeOptions().map((route) => route.recipeId),
      availableIngredients: contestIngredientOptions().map((ingredient) => ({ id: ingredient.id, name: ingredient.ingredientName, count: ingredientAmount(ingredient.id) })),
    },
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
      buffetQueued: Boolean(guest.buffetQueued),
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
    tipboxSystem: {
      amount: state.tipbox,
      capacity: state.tipboxCapacity,
      initialCapacity: TIPBOX_INITIAL_CAPACITY,
      expansionAmount: TIPBOX_EXPANSION_AMOUNT,
      expansionGemCost: TIPBOX_EXPANSION_GEM_COST,
      panelVisible: !dom.tipboxPanel.hidden,
      autoCollectExcluded: true,
      fieldBadge: tipboxValueLayout() ? {
        ...tipboxValueLayout(),
        text: `${formatNumber(state.tipbox)} / ${formatNumber(state.tipboxCapacity)}`,
        placement: "attached-above-tipbox",
      } : null,
    },
    tipRule: { basis: "final-meal-price", rate: .1, eligibleGuests: "all-except-disappointed", cappedByTipboxCapacity: true },
    metrics: state.metrics,
    currentScreen: state.ui.screen,
    themeManagement: state.ui.screen === "theme" ? {
      selectedThemeId: inspectedThemeId,
      selectedPartId: Number(state.ui.themePartId) || null,
      presentation: "bottom-half-sheet",
      sheetStartPercent: 52,
      restaurantVisibleAbove: true,
      outsideTapDismiss: true,
      defaultCardContent: "price-or-owned-or-active-only",
      incomeVisibility: state.ui.themePartId ? "detail-popup" : "hidden",
      completionEffect: {
        menuPriceBonusPercent: Math.round(THEME_COMPLETION_MENU_PRICE_BONUS * 100),
        achieved: inspectedThemeProgress.total > 0 && inspectedThemeProgress.opened >= inspectedThemeProgress.total,
        completedThemeIds: completedThemeIds(),
      },
      openedCount: inspectedThemeRows.filter((row) => state.themes.opened.includes(row.id)).length,
      totalCount: inspectedThemeRows.length,
      parts: inspectedThemeRows.map((row) => ({
        id: row.id,
        facilityType: row.facilityType,
        status: state.themes.activeByFacility[row.facilityType] === row.id
          ? "active"
          : state.themes.opened.includes(row.id) ? "owned" : "priced",
        price: row.facilityPrice,
        incomePercent: Math.round(Number(row.abilityValue || 0) * 100),
      })),
    } : null,
    recipes: {
      systemUnlocked: isRecipeSystemUnlocked(),
      unlockFacility: "도마 테이블",
      displayName: "요리 연구",
      presentation: "bottom-sheet",
      sheetStartPercent: 38,
      sheetHeightPercent: 62,
      restaurantVisibleAbove: true,
      outsideTapDismiss: true,
      owned: Object.keys(state.ownedRecipes).length,
      combinationCapacity: recipeCombinationCapacity(),
      combinationCapacityGrowth: "gem-upgrade-only",
      combinationCapacityInitial: BOWL_CAPACITY_INITIAL,
      combinationCapacityMax: BOWL_CAPACITY_MAX,
      combinationCapacityExpansion: { gems: BOWL_CAPACITY_EXPANSION_GEM_COST, amount: BOWL_CAPACITY_EXPANSION_AMOUNT },
      selectedIngredients: [...state.crafting.selected],
      ingredientPickerOpen: Boolean(state.ui.recipeIngredientPickerOpen),
      ingredientSelection: "tap-bowl-popup-mix-inside",
      outsideMixButton: false,
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
      catalogPresentation: "merged-discovery-and-manual-upgrade",
      tabs: ["craft", "ingredients"],
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
        buffetStandUnlocked: Number(recipeReveal.buffetStandUnlocked || 0),
        buffetStandCapacity: Number(recipeReveal.buffetStandCapacity || 0),
      } : null,
      hintRule: {
        sameRecipeSizeOnly: true,
        matchUnit: "ingredient-slots",
        thresholds: { ...RECIPE_HINT_MATCH_THRESHOLDS },
        revealAllQualifyingRecipes: true,
        repeatRequiresNewMatchedSlot: true,
      },
      starterIngredients: Object.fromEntries(Object.entries(STARTER_INGREDIENTS).map(([ingredientId, count]) => [ingredientId, {
        name: ingredientData(Number(ingredientId))?.ingredientName,
        count,
      }])),
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
      cookingTimeRule: {
        formula: "clamp(roundToHalfSecond(2+basePrice/20),4,24)*recipeLevelSpeedReduction*knowhowSpeedReduction",
        baseSeconds: COOKING_TIME_BASE_SECONDS,
        pricePerSecond: COOKING_PRICE_PER_SECOND,
        minimumSeconds: COOKING_TIME_MIN_SECONDS,
        maximumSeconds: COOKING_TIME_MAX_SECONDS,
        stepSeconds: COOKING_TIME_STEP_SECONDS,
        knowhowReduction: knowhowCookingReduction(),
      },
      recipeLevelPriceBonus: RECIPE_LEVEL_PRICE_BONUS,
      levelLimit: null,
      levelGrowthRule: "unlimited-while-ingredients-available",
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
      cookingTimes: Object.fromEntries(Object.entries(state.ownedRecipes).map(([id, owned]) => {
        const recipe = getRecipe(Number(id));
        return [id, {
          basePrice: Number(recipe.foodPrice),
          baseDuration: baseRecipeCookingDuration(recipe),
          level: Number(owned.level || 1),
          currentDuration: Number(recipeCookingDuration(recipe, owned.level).toFixed(2)),
        }];
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
          slot: index === 0 ? "base" : "special",
          ingredientId: ingredient.id,
          name: ingredient.name,
        })),
        recipeId: chick.recipeId,
        recipeName: chick.recipeName,
        recipeIngredients: chick.ingredientRequirements.map((ingredient) => ({ ingredientId: ingredient.id, name: ingredient.name })),
      })),
      themeChickMilestoneRule: "stone-installed-facility-types;other-owned-theme-part-types",
      themeChickPurchaseRequirements: THEME_CHICK_PURCHASE_REQUIREMENTS,
      themePartPrices: Object.fromEntries(Object.keys(THEME_NAMES).map((themeId) => {
        const prices = tables.restaurantThemes
          .filter((row) => Number(row.facilityTheme) === Number(themeId) && Number(row.purchaseType) !== 2)
          .map((row) => Number(row.facilityPrice || 0));
        return [themeId, { min: Math.min(...prices), max: Math.max(...prices) }];
      })),
      guestGrades: GUEST_GRADES,
      themeChickProgress: Object.fromEntries(Object.keys(THEME_NAMES).map((themeId) => {
        const progress = themeChickProgress(Number(themeId));
        return [themeId, {
          ...progress,
          requirements: themeChickMilestones(Number(themeId)).map((chick) => ({
            customerId: chick.customerId,
            customerName: chick.customerName,
            purchaseCount: chick.purchaseRequirement,
            ownedTypeCount: chick.purchaseRequirement,
          })),
          unlocked: unlockedThemeChicks(Number(themeId)).map((chick) => chick.customerId),
        }];
      })),
      ingredientDropChances: Object.fromEntries(CORE_PROGRESSION.map((route) => [route.ingredientId, GUEST_INGREDIENT_DROP_CHANCE])),
      ingredientDropRule: {
        unlocked: isIngredientDropUnlocked(),
        unlockFacility: "냉장고",
        overallChance: GUEST_INGREDIENT_DROP_CHANCE + knowhowDropBonus(),
        currentChance: currentIngredientDropChance(),
        activeMultiplier: state.specialVisitor.dropBoostRemaining > 0 ? 2 : 1,
        knowhowBonusPercentagePoints: Math.round(knowhowDropBonus() * 100),
        bonusIngredientChance: knowhowBonusIngredientChance(),
        ingredientTypesOnSuccess: 1,
        visitIndependent: true,
        slotChances: { ...INGREDIENT_SLOT_WEIGHTS },
        countsOnSuccess: { base: 1, special: 1 },
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
    specialVisitor: {
      interval: SPECIAL_VISITOR_INTERVAL,
      nextIn: Number(Math.max(0, state.specialVisitor.nextAt - state.clock).toFixed(2)),
      lastType: state.specialVisitor.lastType,
      dropBoostRemaining: Number(state.specialVisitor.dropBoostRemaining.toFixed(2)),
      dropMultiplier: state.specialVisitor.dropBoostRemaining > 0 ? 2 : 1,
      futureTradeChance: FUTURE_TRADE_CHANCE,
      panelVisible: !dom.specialVisitorPanel.hidden,
      panelActorId: dom.specialVisitorPanel.dataset.actorId || null,
      panelTitle: dom.specialVisitorPanel.hidden ? null : dom.specialVisitorTitle.textContent,
      panelMessage: dom.specialVisitorPanel.hidden ? null : dom.specialVisitorMessage.textContent,
      merchantPricing: {
        theme1Base: MERCHANT_THEME_BASE_PRICES[0],
        theme2Base: MERCHANT_THEME_BASE_PRICES[1],
        theme3Base: MERCHANT_THEME_BASE_PRICES[2],
        laterThemeMultiplier: MERCHANT_LATE_THEME_MULTIPLIER,
        withinThemeStep: MERCHANT_STAGE_PRICE_STEP,
      },
    },
    specialCustomers: state.specialActors.map((actor) => ({
      id: actor.id,
      type: actor.type,
      name: SPECIAL_VISITOR_TYPES[actor.type]?.name || "특수 손님",
      state: actor.state,
      canInteract: actor.type === "thief"
        ? !["caught", "escaping", "gone"].includes(actor.state)
        : actor.state === "waiting",
      x: Math.round(actor.x),
      y: Math.round(actor.y),
      stolen: actor.stolen,
      offers: actor.offers || null,
      trade: actor.trade || null,
    })),
  });
}

async function init() {
  try {
    tables = await loadTables();
    state = loadState() || createInitialState();
    populateDebugIngredients();
    if (ensureProgressionTutorial()) saveState();
    state.ui.screen = "restaurant";
    dom.menuScreen.hidden = true;
    setActiveNav("");
    updateHud();
    updateTutorialDialogue();
    render();
    showOfflineBuffetReward();
    requestAnimationFrame(frame);
  } catch (error) {
    console.error(error);
    showToast(error.message, 60);
  }
}

canvas.addEventListener("pointerdown", handleCanvasTap);
dom.areaPrevButton.addEventListener("click", () => switchWorldArea("restaurant"));
dom.areaNextButton.addEventListener("click", () => switchWorldArea("buffet"));
dom.contestButton.addEventListener("click", () => openMenu("contest"));
dom.offlineRewardClaim.addEventListener("click", claimOfflineBuffetReward);
dom.tipboxClose.addEventListener("click", closeTipboxPanel);
dom.tipboxCollect.addEventListener("click", collectTipbox);
dom.tipboxExpand.addEventListener("click", expandTipboxCapacity);
dom.promoButton.addEventListener("click", promote);
dom.specialPromoButton.addEventListener("click", openSpecialPromotionPanel);
dom.specialPromoClose.addEventListener("click", closeSpecialPromotionPanel);
dom.specialPromoSearch.addEventListener("input", () => {
  closeSpecialPromotionDetail();
  renderSpecialPromotionChoices();
});
dom.specialPromoList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ingredient-id]");
  if (button) openSpecialPromotionDetail(Number(button.dataset.ingredientId));
});
dom.specialPromoDetail.addEventListener("click", (event) => {
  if (event.target === dom.specialPromoDetail || event.target.closest('[data-action="close-special-promotion-detail"]')) {
    closeSpecialPromotionDetail();
    return;
  }
  const confirm = event.target.closest('[data-action="confirm-special-promotion"]');
  if (confirm) startSpecialPromotion(Number(confirm.dataset.ingredientId));
});
dom.resetButton.addEventListener("click", resetGame);
dom.debugToggleButton.addEventListener("click", () => toggleDebugPanel());
dom.debugCloseButton.addEventListener("click", () => toggleDebugPanel(false));
dom.debugInstallAllButton.addEventListener("click", debugInstallAllFacilities);
dom.debugAddResourceButton.addEventListener("click", debugAddResource);
dom.debugAddIngredientButton.addEventListener("click", debugAddIngredient);
dom.debugSpawnSpecialButton.addEventListener("click", debugSpawnSpecialVisitor);
dom.debugResourceAmount.addEventListener("keydown", (event) => {
  if (event.key === "Enter") debugAddResource();
});
dom.debugIngredientAmount.addEventListener("keydown", (event) => {
  if (event.key === "Enter") debugAddIngredient();
});
dom.installClose.addEventListener("click", closeInstallPanel);
dom.installConfirm.addEventListener("click", confirmInstall);
dom.specialVisitorClose.addEventListener("click", () => closeSpecialVisitorPanel(true));
dom.specialVisitorContent.addEventListener("click", (event) => {
  const button = event.target.closest("[data-special-action]");
  if (!button || button.disabled) return;
  if (button.dataset.specialAction === "buy") buySpecialVisitorOffer(Number(button.dataset.offerId));
  if (button.dataset.specialAction === "trade") acceptSpecialVisitorTrade();
  if (button.dataset.specialAction === "catch") catchSpecialVisitorFromPanel();
  if (button.dataset.specialAction === "fairy") acceptWindFairyBlessing();
});
dom.menuClose.addEventListener("click", closeMenu);
dom.chefDialogue.addEventListener("click", advanceTutorialDialogue);
dom.navButtons.forEach((button) => button.addEventListener("click", () => openMenu(button.dataset.screen)));
dom.menuTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tab]");
  if (!button) return;
  state.ui.tab = button.dataset.tab;
  state.ui.recipeIngredientPickerOpen = false;
  renderMenu();
});
dom.menuContent.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === "knowhow-select") {
    state.knowhow.selectedSkillId = button.dataset.skillId;
    saveState();
    renderMenu();
  }
  if (button.dataset.action === "knowhow-upgrade") upgradeKnowhowSkill(button.dataset.skillId);
  if (button.dataset.action === "research") doResearch();
  if (button.dataset.action === "open-ingredient-picker") {
    state.ui.recipeIngredientPickerOpen = true;
    renderMenu();
  }
  if (button.dataset.action === "close-ingredient-picker") {
    state.ui.recipeIngredientPickerOpen = false;
    saveState();
    renderMenu();
  }
  if (button.dataset.action === "select-ingredient") addSelectedIngredient(id);
  if (button.dataset.action === "remove-selected-ingredient") removeSelectedIngredient(id);
  if (button.dataset.action === "clear-combination") { state.crafting.selected = []; mixingDropIndex = -1; saveState(); renderMenu(); }
  if (button.dataset.action === "discover-combination") {
    state.ui.recipeIngredientPickerOpen = false;
    discoverSelectedCombination();
  }
  if (button.dataset.action === "auto-craft") {
    if (!tryAutoCraft()) showToast(unlockedRecipeCount() < 5
      ? "요리 5개 발견 후 자동 연구가 열려요."
      : "자동 연구에는 재료가 2개 이상 필요해요.");
    renderMenu();
  }
  if (button.dataset.action === "codex") claimCodexReward(id);
  if (button.dataset.action === "manual-upgrade") manualUpgradeRecipe(id);
  if (button.dataset.action === "claim-mission") claimMission(button.dataset.kind, id);
  if (button.dataset.action === "daily-bonus") claimDailyBonus();
  if (button.dataset.action === "hire-staff") hireStaff(id);
  if (button.dataset.action === "attach-sticker") attachStaffSticker(id);
  if (button.dataset.action === "level-staff") levelUpStaff(id);
  if (button.dataset.action === "start-performance") startPerformance();
  if (button.dataset.action === "theme-part-detail") {
    themeMenuScrollTop = dom.menuContent.scrollTop;
    state.ui.themePartId = id;
    renderMenu();
  }
  if (button.dataset.action === "theme-part-close") {
    const partId = Number(state.ui.themePartId);
    state.ui.themePartId = null;
    renderMenu();
    requestAnimationFrame(() => dom.menuContent.querySelector(`[data-action="theme-part-detail"][data-id="${partId}"]`)?.focus({ preventScroll: true }));
  }
  if (button.dataset.action === "buy-theme") buyTheme(id);
  if (button.dataset.action === "apply-theme") applyTheme(id);
  if (button.dataset.action === "apply-theme-all") applyThemeAll(id);
  if (button.dataset.action === "theme-select") {
    state.ui.themeId = id;
    state.ui.themePartId = null;
    themeMenuScrollTop = 0;
    renderMenu();
  }
  if (button.dataset.action === "expand-ingredient-storage") expandIngredientStorage();
  if (button.dataset.action === "expand-bowl-capacity") expandBowlCapacity();
  if (button.dataset.action === "theme-filter") { state.ui.themeFacilityType = id; renderMenu(); }
  if (button.dataset.action === "select-customer") { state.ui.collectionCustomerId = id; saveState(); renderMenu(); }
  if (button.dataset.action === "buffet-place") placeBuffetRecipe(id);
  if (button.dataset.action === "buffet-clear") clearBuffetStand();
  if (button.dataset.action === "contest-tier") { state.contest.selectedTierId = id; state.contest.result = null; saveState(); renderMenu(); }
  if (button.dataset.action === "contest-recipe") { state.contest.selectedRecipeId = id; saveState(); renderMenu(); }
  if (button.dataset.action === "contest-ingredient") { state.contest.selectedIngredientId = id; saveState(); renderMenu(); }
  if (button.dataset.action === "contest-submit") startContestEntry();
  if (button.dataset.action === "contest-result-close") { state.contest.result = null; saveState(); renderMenu(); }
});
dom.recipeReveal.addEventListener("click", (event) => {
  if (event.target === dom.recipeReveal || event.target.closest('[data-action="dismiss-recipe-reveal"]')) dismissRecipeReveal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.ui.screen === "recipe" && state.ui.recipeIngredientPickerOpen) {
    state.ui.recipeIngredientPickerOpen = false;
    renderMenu();
    return;
  }
  if (event.key === "Escape" && state.ui.screen === "theme" && state.ui.themePartId) {
    const partId = Number(state.ui.themePartId);
    state.ui.themePartId = null;
    renderMenu();
    requestAnimationFrame(() => dom.menuContent.querySelector(`[data-action="theme-part-detail"][data-id="${partId}"]`)?.focus({ preventScroll: true }));
    return;
  }
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
