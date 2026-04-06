// Foundational constants, tablejson-derived catalogs, and progression data.
const GAME_WIDTH = 390;
const GAME_HEIGHT = 844;
const SCENE_RESTAURANT = "restaurant";
const SCENE_FARM = "farm";
const SCENE_INTERVIEW = "interview";
const WORLD_WIDTH = 900;
const WORLD_CENTER_X = WORLD_WIDTH * 0.5;
const GAME_WORLD_MAX_CAMERA_X = Math.max(0, WORLD_WIDTH - GAME_WIDTH);
const INITIAL_CAMERA_X = Math.max(0, Math.min(GAME_WORLD_MAX_CAMERA_X, WORLD_CENTER_X - GAME_WIDTH * 0.5));
const CAMERA_DRAG_THRESHOLD = 8;
const FIXED_DT = 1 / 60;
const TABLE_DATA = window.TABLEJSON_DATA || {};
const GUEST_PERSONA_CATALOG = Array.isArray(window.GUEST_PERSONAS) ? window.GUEST_PERSONAS : [];
const GUEST_ICON_LIBRARY = window.GUEST_ICON_LIBRARY || {};
const RECIPE_ICON_LIBRARY = window.RECIPE_ICON_LIBRARY || {};
const GENERAL_SETTINGS = TABLE_DATA.generalSettings || {};
const RECIPE_SETTINGS = TABLE_DATA.recipeSettings || {};
const REMODELING_FACILITY_ROWS = Array.isArray(TABLE_DATA.remodelingFacilities) ? TABLE_DATA.remodelingFacilities : [];
const TABLE_POSITIONS = [
  { x: WORLD_CENTER_X - 72, y: 450 },
  { x: WORLD_CENTER_X + 72, y: 450 },
  { x: WORLD_CENTER_X - 72, y: 590 },
  { x: WORLD_CENTER_X + 72, y: 590 },
  { x: WORLD_CENTER_X - 210, y: 450 },
  { x: WORLD_CENTER_X + 210, y: 450 },
  { x: WORLD_CENTER_X - 210, y: 590 },
  { x: WORLD_CENTER_X + 210, y: 590 },
];
const STOVE_POSITIONS = [
  { x: WORLD_CENTER_X - 52, y: 246 },
  { x: WORLD_CENTER_X + 52, y: 246 },
  { x: WORLD_CENTER_X - 156, y: 252 },
  { x: WORLD_CENTER_X + 156, y: 252 },
];
const TREE_POSITIONS = [
  { x: 28, y: 116, r: 38 },
  { x: 72, y: 68, r: 34 },
  { x: 128, y: 96, r: 40 },
  { x: 170, y: 54, r: 32 },
  { x: 224, y: 88, r: 34 },
  { x: 282, y: 60, r: 44 },
  { x: 352, y: 114, r: 40 },
  { x: 342, y: 220, r: 46 },
  { x: 52, y: 244, r: 44 },
  { x: 20, y: 346, r: 40 },
  { x: 370, y: 356, r: 38 },
  { x: 338, y: 708, r: 36 },
  { x: 54, y: 716, r: 36 },
  { x: 32, y: 802, r: 40 },
  { x: 362, y: 808, r: 42 },
];
const ENTRANCE_POSITION = { x: WORLD_CENTER_X, y: 704 };
const CUSTOMER_COLORS = [
  "#ffd54f",
  "#ff9e7a",
  "#94d66d",
  "#f29bd0",
  "#8ecdf6",
  "#f6c14f",
  "#ef7c6d",
  "#ffffff",
];
const CUSTOMER_ENTRY_POINT = { x: WORLD_CENTER_X, y: 872 };
const CUSTOMER_EXIT_POINT = { x: WORLD_CENTER_X, y: 888 };
const RECIPE_ID_BY_NAME = {
  샐러드: "salad",
  샌드위치: "sandwich",
  핫도그: "hotdog",
  수프: "soup",
  오믈렛: "omelet",
  꼬치구이: "skewers",
  김밥: "kimbap",
  피자: "pizza",
  볶음밥: "friedrice",
  생선구이: "grilledfish",
  햄버거: "burger",
  웨지감자: "wedges",
  비빔밥: "bibimbap",
  딤섬: "dimsum",
  파스타: "pasta",
  타코: "taco",
  라멘: "ramen",
  볶음면: "friednoodles",
  돈까스: "tonkatsu",
  카레: "curry",
  치킨: "chicken",
  뇨끼: "gnocchi",
  초밥: "sushi",
  불고기: "bulgogi",
  스테이크: "steak",
};
const RECIPE_EMOJI_BY_NAME = {
  샐러드: "🥗",
  샌드위치: "🥪",
  핫도그: "🌭",
  수프: "🍲",
  오믈렛: "🍳",
  꼬치구이: "🍢",
  김밥: "🍙",
  피자: "🍕",
  볶음밥: "🍚",
  생선구이: "🐟",
  햄버거: "🍔",
  웨지감자: "🍟",
  비빔밥: "🥘",
  딤섬: "🥟",
  파스타: "🍝",
  타코: "🌮",
  라멘: "🍜",
  볶음면: "🥡",
  돈까스: "🍛",
  카레: "🍛",
  치킨: "🍗",
  뇨끼: "🥔",
  초밥: "🍣",
  불고기: "🥩",
  스테이크: "🥩",
};
const RECIPE_ACCENT_BY_STAT_TYPE = {
  1: "#de8f58",
  2: "#7ebc69",
  3: "#6da7d6",
  4: "#d47aa0",
};
const RECIPE_ACCENT_BY_GRADE = {
  1: "#d9b56d",
  2: "#cf7f53",
  3: "#8f78df",
};
const RECIPE_RARITY_BY_GRADE = {
  1: "basic",
  2: "rare",
  3: "epic",
};
const TABLE_RECIPE_PRICE_STEP = Number(RECIPE_SETTINGS.RecipePriceUp ?? 0.18);
const TABLE_PROMOTION_TOUCH_COUNT = Number(GENERAL_SETTINGS.PromotionTouchCount ?? 4);
const TABLE_INITIAL_ACORNS = Number(GENERAL_SETTINGS.AccountFirstAcorn ?? 260);
const TABLE_COOK_TIME_MINIMUM = Number(GENERAL_SETTINGS.CookTimeMinimum ?? 1.5);
const TABLE_BASE_KITCHEN_LIKES = Number(GENERAL_SETTINGS.KitchenLikeGain ?? 1);
const TABLE_RECIPE_GACHA_COST = Number(GENERAL_SETTINGS.RecipeGachaItemRequired ?? 1);
const TABLE_STUDY_LEVEL_MAX = Math.max(1000, Number(GENERAL_SETTINGS.StudyLevelMax ?? 300));
const FACILITY_TYPE_TABLE = 1;
const FACILITY_TYPE_STOVE = 2;
const FACILITY_TYPE_TIPBOX = 3;
const FACILITY_TYPE_ENTRANCE = 4;
const FACILITY_TYPE_STAGE = 5;
const FACILITY_TYPE_FRIDGE = 6;
const FACILITY_TYPE_SINK = 7;
const FACILITY_TYPE_COUNTERTOP = 8;
const FACILITY_TYPE_KITCHENWARE = 9;
const FACILITY_TYPE_LIGHTING = 10;
const FACILITY_TYPE_FENCE = 11;
const FACILITY_KIND_BY_TYPE = {
  [FACILITY_TYPE_TABLE]: "table",
  [FACILITY_TYPE_STOVE]: "stove",
  [FACILITY_TYPE_TIPBOX]: "tipbox",
  [FACILITY_TYPE_ENTRANCE]: "entrance",
  [FACILITY_TYPE_STAGE]: "stage",
  [FACILITY_TYPE_FRIDGE]: "fridge",
  [FACILITY_TYPE_SINK]: "sink",
  [FACILITY_TYPE_COUNTERTOP]: "countertop",
  [FACILITY_TYPE_KITCHENWARE]: "kitchenware",
  [FACILITY_TYPE_LIGHTING]: "lighting",
  [FACILITY_TYPE_FENCE]: "fence",
};
const FACILITY_ICON_FILENAME_BY_KIND = {
  table: "Icon_Facility_Table_Wood.png",
  stove: "Icon_Facility_Stove_Wood.png",
  tipbox: "Icon_Facility_TipBox_Wood.png",
  entrance: "Icon_Facility_Entrance_Wood.png",
  stage: "Icon_Facility_Stage_Wood.png",
  fridge: "Icon_Facility_Fridge_Wood.png",
  sink: "Icon_Facility_Sink_Wood.png",
  countertop: "Icon_Facility_CounterTop_Wood.png",
  kitchenware: "Icon_Facility_Kitchenware_Wood.png",
  lighting: "Icon_Facility_Lighting_Wood.png",
  fence: "Icon_Facility_Fence_Wood.png",
};
const FACILITY_AMBIENCE_GAIN_BY_KIND = {
  tipbox: 1,
  entrance: 1,
  stage: 2,
  fridge: 1,
  sink: 1,
  countertop: 1,
  kitchenware: 1,
  lighting: 2,
  fence: 1,
};
const FARM_COLS = 4;
const FARM_ROWS = 5;
const FARM_CELL_SIZE = 74;
const FARM_CELL_GAP_X = 12;
const FARM_CELL_GAP_Y = 18;
const FARM_BOARD_ORIGIN_X = 24;
const FARM_BOARD_ORIGIN_Y = 176;
const FARM_MAX_CHARGES = 30;
const FARM_STARTING_CHARGES = 30;
const FARM_CHARGE_INTERVAL = 300;
const FARM_DRAG_THRESHOLD = 10;
const FARM_BASE_ITEM_IDS = ["seed", "calf"];
const FARM_REWARD_META = {
  flour: { id: "flour", name: "\uBC00\uAC00\uB8E8", icon: "\uD83C\uDF3E", accent: "#ceb16f" },
  milk: { id: "milk", name: "\uC6B0\uC720", icon: "\uD83E\uDD5B", accent: "#d8e6ef" },
  cheese: { id: "cheese", name: "\uCE58\uC988", icon: "\uD83E\uDDC0", accent: "#efc86f" },
  butter: { id: "butter", name: "\uBC84\uD130", icon: "\uD83E\uDDC8", accent: "#f0d37f" },
  arugula: { id: "arugula", name: "\uB8E8\uAF34\uB77C", icon: "\uD83E\uDD6C", accent: "#82b767" },
  oliveoil: { id: "oliveoil", name: "\uC62C\uB9AC\uBE0C\uC624\uC77C", icon: "\uD83E\uDED2", accent: "#9eac67" },
  truffle: { id: "truffle", name: "\uD2B8\uB7EC\uD50C", icon: "\uD83C\uDF44", accent: "#8f6d56" },
};
const FARM_ITEM_META = {
  seed: {
    id: "seed",
    name: "\uC528\uC557",
    family: "garden",
    tier: 1,
    nextId: "sprout",
    accent: "#8c6a3b",
  },
  sprout: {
    id: "sprout",
    name: "\uC0C8\uC2F9",
    family: "garden",
    tier: 2,
    nextId: "flower",
    accent: "#7bb85c",
  },
  flower: {
    id: "flower",
    name: "\uAF43",
    family: "garden",
    tier: 3,
    nextId: "herb",
    accent: "#e8d99b",
  },
  herb: {
    id: "herb",
    name: "\uBC14\uAD6C\uB2C8",
    family: "garden",
    tier: 4,
    nextId: null,
    final: true,
    accent: "#6b9d58",
  },
  calf: {
    id: "calf",
    name: "\uC1A1\uC544\uC9C0",
    family: "dairy",
    tier: 1,
    nextId: "cow",
    accent: "#c98868",
  },
  cow: {
    id: "cow",
    name: "\uC18C",
    family: "dairy",
    tier: 2,
    nextId: "milkCow",
    accent: "#a88865",
  },
  milkCow: {
    id: "milkCow",
    name: "\uC816\uC18C",
    family: "dairy",
    tier: 3,
    nextId: "milkCan",
    accent: "#d9dfeb",
  },
  milkCan: {
    id: "milkCan",
    name: "\uC6B0\uC720\uD1B5",
    family: "dairy",
    tier: 4,
    nextId: null,
    final: true,
    accent: "#d7dee5",
  },
};
const FARM_REWARD_POOLS_BY_FAMILY = {
  garden: [
    { rewardId: "flour", unlockLevel: 1, baseWeight: 110, growthPerLevel: 4 },
    { rewardId: "oliveoil", unlockLevel: 5, baseWeight: 46, growthPerLevel: 4 },
    { rewardId: "arugula", unlockLevel: 7, baseWeight: 20, growthPerLevel: 3 },
    { rewardId: "truffle", unlockLevel: 10, baseWeight: 4, growthPerLevel: 1 },
  ],
  dairy: [
    { rewardId: "cheese", unlockLevel: 1, baseWeight: 110, growthPerLevel: 4 },
    { rewardId: "milk", unlockLevel: 5, baseWeight: 46, growthPerLevel: 4 },
    { rewardId: "butter", unlockLevel: 7, baseWeight: 20, growthPerLevel: 3 },
    { rewardId: "truffle", unlockLevel: 10, baseWeight: 4, growthPerLevel: 1 },
  ],
};
const FARM_CELL_POSITIONS = Array.from({ length: FARM_ROWS * FARM_COLS }, (_, index) => {
  const col = index % FARM_COLS;
  const row = Math.floor(index / FARM_COLS);
  return {
    index,
    col,
    row,
    x: FARM_BOARD_ORIGIN_X + col * (FARM_CELL_SIZE + FARM_CELL_GAP_X),
    y: FARM_BOARD_ORIGIN_Y + row * (FARM_CELL_SIZE + FARM_CELL_GAP_Y),
  };
});
const RECIPE_ICON_ENTRY_BY_ID = new Map(
  (Array.isArray(RECIPE_ICON_LIBRARY.entries) ? RECIPE_ICON_LIBRARY.entries : []).map((entry) => [entry.recipeId, entry])
);
const RECIPE_UNLOCK_RULES_BY_ID = {
  // --- 초반 5개까지만 빠르게 ---
  salad: { type: "none" },                           // 시작 메뉴
  sandwich: { type: "study", value: 4 },             // 공부 Lv4
  hotdog: { type: "served", value: 60 },             // 서빙 60회
  soup: { type: "farmLevel", value: 3 },             // 농장 Lv3
  omelet: { type: "followers", value: 180 },         // 팔로워 180

  // --- 이후는 의도적으로 간격 확대 ---
  skewers: { type: "study", value: 28 },             // 공부 Lv28
  kimbap: { type: "rank", value: 3 },                // 랭크 3
  pizza: { type: "specialSatisfied", value: 6 },     // 특수손님 만족 6회
  friedrice: { type: "expansion", value: 6 },        // 확장 6단계
  grilledfish: { type: "study", value: 40 },         // 공부 Lv40
  burger: { type: "rank", value: 4 },                // 랭크 4
  wedges: { type: "served", value: 160 },            // 서빙 160회

  // --- 중후반 ---
  bibimbap: { type: "followers", value: 260 },       // 팔로워 260
  dimsum: { type: "specialSatisfied", value: 10 },   // 특수손님 만족 10회
  pasta: { type: "expansion", value: 8 },            // 확장 8단계
  taco: { type: "rank", value: 5 },                  // 랭크 5
  ramen: { type: "study", value: 55 },               // 공부 Lv55
  friednoodles: { type: "followers", value: 420 },   // 팔로워 420

  // --- 후반 ---
  tonkatsu: { type: "specialSatisfied", value: 14 }, // 특수손님 만족 14회
  curry: { type: "expansion", value: 10 },           // 확장 10단계
  chicken: { type: "rank", value: 7 },               // 랭크 7
  gnocchi: { type: "study", value: 70 },             // 공부 Lv70
  sushi: { type: "followers", value: 650 },          // 팔로워 650
  bulgogi: { type: "specialSatisfied", value: 20 },  // 특수손님 만족 20회
  steak: { type: "rank", value: 9 },                 // 랭크 9 (최종)
};
const RECIPE_INGREDIENT_PROFILE_BY_ID = {
  salad: { primary: "arugula", secondary: "oliveoil", special: "truffle" },
  sandwich: { primary: "flour", secondary: "cheese", special: "butter" },
  hotdog: { primary: "flour", secondary: "cheese", special: "butter" },
  soup: { primary: "milk", secondary: "cheese", special: "truffle" },
  omelet: { primary: "milk", secondary: "butter", special: "cheese" },
  skewers: { primary: "oliveoil", secondary: "butter", special: "truffle" },
  kimbap: { primary: "flour", secondary: "oliveoil", special: "arugula" },
  pizza: { primary: "flour", secondary: "cheese", special: "truffle" },
  friedrice: { primary: "butter", secondary: "oliveoil", special: "truffle" },
  grilledfish: { primary: "oliveoil", secondary: "butter", special: "truffle" },
  burger: { primary: "flour", secondary: "cheese", special: "butter" },
  wedges: { primary: "butter", secondary: "oliveoil", special: "cheese" },
  bibimbap: { primary: "arugula", secondary: "oliveoil", special: "truffle" },
  dimsum: { primary: "flour", secondary: "butter", special: "cheese" },
  pasta: { primary: "flour", secondary: "cheese", special: "oliveoil" },
  taco: { primary: "flour", secondary: "cheese", special: "oliveoil" },
  ramen: { primary: "flour", secondary: "butter", special: "truffle" },
  friednoodles: { primary: "flour", secondary: "oliveoil", special: "butter" },
  tonkatsu: { primary: "butter", secondary: "flour", special: "truffle" },
  curry: { primary: "milk", secondary: "butter", special: "truffle" },
  chicken: { primary: "butter", secondary: "oliveoil", special: "truffle" },
  gnocchi: { primary: "milk", secondary: "butter", special: "cheese" },
  sushi: { primary: "oliveoil", secondary: "arugula", special: "truffle" },
  bulgogi: { primary: "butter", secondary: "oliveoil", special: "truffle" },
  steak: { primary: "butter", secondary: "oliveoil", special: "truffle" },
};
const EARLY_RECIPE_IDS = new Set(["salad", "sandwich", "hotdog", "soup", "omelet", "skewers"]);
const EARLY_RECIPE_CRAFT_TUNING_BY_ID = {
  salad: { primary: 2, secondary: 1 },
  sandwich: { primary: 3, secondary: 1 },
  hotdog: { primary: 3, secondary: 1 },
  soup: { primary: 2, secondary: 1 },
  omelet: { primary: 2, secondary: 1 },
  skewers: { primary: 3, secondary: 2 },
};
const RECIPE_VARIANT_PREFIX_BY_INGREDIENT = {
  flour: "수제",
  milk: "크림",
  cheese: "치즈",
  butter: "버터",
  arugula: "루꼴라",
  oliveoil: "허브",
  truffle: "트러플",
};
const RECIPE_PROGRESS_MILESTONES = [3, 6, 10];

function groupBy(entries, key) {
  return (Array.isArray(entries) ? entries : []).reduce((acc, entry) => {
    const bucket = entry?.[key];
    if (bucket === undefined || bucket === null) {
      return acc;
    }
    if (!acc.has(bucket)) {
      acc.set(bucket, []);
    }
    acc.get(bucket).push(entry);
    return acc;
  }, new Map());
}

function getMapMaxKey(map, fallback = 0) {
  if (!(map instanceof Map) || map.size === 0) {
    return fallback;
  }
  return Math.max(...map.keys());
}

function buildLevelValueMap(entries, keyField = "level", valueField = "levelCost") {
  return new Map(
    (Array.isArray(entries) ? entries : []).map((entry) => [Number(entry[keyField]), Number(entry[valueField])])
  );
}

function buildRecipeId(recipeRow) {
  return RECIPE_ID_BY_NAME[recipeRow.recipeName] || `recipe-${recipeRow.id}`;
}

function buildRecipeIconLabel(recipeName) {
  return recipeName.length <= 2 ? recipeName : recipeName.slice(0, 2);
}

function getRecipeIngredientProfile(recipeId) {
  return (
    RECIPE_INGREDIENT_PROFILE_BY_ID[recipeId] || {
      primary: "flour",
      secondary: "cheese",
      special: "truffle",
    }
  );
}

function getRecipeUnlockRule(recipeId, grade, index) {
  return (
    RECIPE_UNLOCK_RULES_BY_ID[recipeId] || {
      type: grade >= 3 ? "rank" : grade === 2 ? "study" : "served",
      value: Math.max(1, index + 1),
    }
  );
}

function buildRecipeCraftCost(recipeId, grade) {
  const profile = getRecipeIngredientProfile(recipeId);
  if (recipeId === "sandwich") {
    return {
      [profile.secondary]: 1,
    };
  }
  if (EARLY_RECIPE_IDS.has(recipeId)) {
    const tuning = EARLY_RECIPE_CRAFT_TUNING_BY_ID[recipeId] || { primary: 3, secondary: 1 };
    return {
      [profile.primary]: tuning.primary,
      [profile.secondary]: tuning.secondary,
    };
  }
  const cost = {
    [profile.primary]: 4 + grade * 2,
    [profile.secondary]: 3 + grade,
  };
  if (grade >= 2) {
    cost[profile.special] = grade - 1;
  }
  return cost;
}

function buildRecipeCatalog(entries) {
  return (Array.isArray(entries) ? entries : []).map((entry, index) => {
    const recipeId = buildRecipeId(entry);
    const grade = Number(entry.recipeGrade || 1);
    return {
      tableId: entry.id,
      id: recipeId,
      name: entry.recipeName,
      emoji: RECIPE_EMOJI_BY_NAME[entry.recipeName] || "🍽️",
      minRankIndex: 0,
      rarity: RECIPE_RARITY_BY_GRADE[grade] || "basic",
      grade,
      basePrice: Number(entry.foodPrice || 0),
      baseCook: Number(entry.cookTime || 1),
      weight: Number(entry.gachaWeight || 1),
      iconLabel: buildRecipeIconLabel(entry.recipeName),
      iconPath: RECIPE_ICON_ENTRY_BY_ID.get(recipeId)?.path || null,
      iconSource: RECIPE_ICON_ENTRY_BY_ID.get(recipeId)?.source || null,
      accent:
        RECIPE_ACCENT_BY_STAT_TYPE[entry.statType] ||
        RECIPE_ACCENT_BY_GRADE[grade] ||
        "#d7b26c",
      statType: Number(entry.statType || 0),
      unlockRule: getRecipeUnlockRule(recipeId, grade, index),
      ingredientProfile: getRecipeIngredientProfile(recipeId),
      craftCost: buildRecipeCraftCost(recipeId, grade),
    };
  });
}

function buildStaffCatalog(entries, levelRowsByStaffId) {
  const roleMetaByType = {
    2: {
      id: "chef",
      roleTitle: "요리사",
      icon: "🍳",
      description: "요리 속도를 끌어올리고 메뉴 판매가를 높인다.",
    },
    3: {
      id: "server",
      roleTitle: "서버",
      icon: "🛎️",
      description: "주문 아이콘을 대신 눌러 접수해주는 자동화 직원.",
    },
    4: {
      id: "promoter",
      roleTitle: "홍보직원",
      icon: "📣",
      description: "일정 주기마다 새 손님을 한 명씩 불러온다.",
    },
  };

  return (Array.isArray(entries) ? entries : []).reduce((acc, entry) => {
    const meta = roleMetaByType[entry.staffType];
    if (!meta) {
      return acc;
    }
    const levelRows = levelRowsByStaffId.get(entry.id) || [];
    acc[meta.id] = {
      id: meta.id,
      tableId: entry.id,
      title: entry.staffName,
      roleTitle: meta.roleTitle,
      icon: meta.icon,
      baseCost: Number(entry.staffPrice || 0),
      maxLevel: Math.max(0, ...levelRows.map((row) => Number(row.staffLevel || 0))),
      description: meta.description,
      unlockConditionType: Number(entry.unlockConditionType || 0),
      unlockConditionValue: Number(entry.unlockConditionValue || 0),
    };
    return acc;
  }, {});
}

function buildLegacyExpansionSequence() {
  return [
    {
      id: "table-2",
      kind: "table",
      slotIndex: 2,
      title: "2번 테이블",
      description: "한 번에 받을 수 있는 손님 수가 1명 늘어난다.",
      cost: 160,
      apply(state) {
        addTable(state);
      },
    },
    {
      id: "stove-2",
      kind: "stove",
      slotIndex: 2,
      title: "2번 화구",
      description: "동시에 조리할 수 있는 주문이 늘어난다.",
      cost: 230,
      apply(state) {
        addStove(state);
      },
    },
    {
      id: "table-3",
      kind: "table",
      slotIndex: 3,
      title: "3번 테이블",
      description: "중반 처리량을 버텨줄 좌석을 하나 더 만든다.",
      cost: 360,
      apply(state) {
        addTable(state);
      },
    },
    {
      id: "stove-3",
      kind: "stove",
      slotIndex: 3,
      title: "3번 화구",
      description: "대기 주문이 줄고 귀한 레시피도 안정적으로 소화한다.",
      cost: 520,
      apply(state) {
        addStove(state);
      },
    },
  ];
}

function getFacilityKind(facilityType) {
  return FACILITY_KIND_BY_TYPE[Number(facilityType)] || null;
}

function buildFacilityExpansionDescription(kind, slotIndex, facilityName) {
  if (kind === "table") {
    return `식탁이 ${slotIndex}개가 되어 한 번에 받을 수 있는 손님이 더 늘어난다.`;
  }
  if (kind === "stove") {
    return `화구가 ${slotIndex}개가 되어 동시에 처리할 수 있는 주문이 더 늘어난다.`;
  }
  if (kind === "tipbox") {
    return "팁과 장식 요소가 더해져 식당 분위기가 조금 좋아진다.";
  }
  if (kind === "entrance") {
    return "식당 입구가 정돈되어 가게의 첫인상이 한층 좋아진다.";
  }
  if (kind === "stage") {
    return "무대 연출이 더해져 식당의 존재감과 분위기가 크게 살아난다.";
  }
  if (kind === "fridge") {
    return "주방 설비가 늘어나 식당 완성도와 분위기가 조금 더 좋아진다.";
  }
  if (kind === "sink") {
    return "주방 동선이 정돈되어 식당의 완성도와 분위기가 올라간다.";
  }
  if (kind === "countertop") {
    return "도마 테이블이 추가되어 주방의 완성도와 분위기가 좋아진다.";
  }
  if (kind === "kitchenware") {
    return "조리도구함이 채워져 주방 분위기와 운영 감각이 조금 더 살아난다.";
  }
  if (kind === "lighting") {
    return "조명이 바뀌어 식당 분위기가 확실하게 더 좋아진다.";
  }
  if (kind === "fence") {
    return "울타리가 더해져 식당 외관과 완성도가 한층 좋아진다.";
  }
  return `${facilityName || "새 시설"}을(를) 들여 식당의 분위기와 완성도를 높인다.`;
}

function getFacilityExpansionIconPath(kind) {
  const filename = FACILITY_ICON_FILENAME_BY_KIND[kind];
  return filename ? `assets/facility-icons/${filename}` : "";
}

function applyFacilityExpansion(state, kind) {
  if (kind === "table") {
    addTable(state);
    return;
  }
  if (kind === "stove") {
    addStove(state);
    return;
  }
  const ambienceGain = Number(FACILITY_AMBIENCE_GAIN_BY_KIND[kind] || 0);
  if (ambienceGain > 0) {
    state.restaurant.ambience = Number(state.restaurant.ambience || 0) + ambienceGain;
  }
}

function buildFacilityExpansionSequence(rows) {
  const relevantRows = (Array.isArray(rows) ? rows : [])
    .filter((row) => Boolean(getFacilityKind(row.facilityType)))
    .sort((left, right) => Number(left.sequence || 0) - Number(right.sequence || 0));

  if (relevantRows.length === 0) {
    return {
      initialTableCount: 2,
      initialStoveCount: 1,
      sequence: buildLegacyExpansionSequence(),
    };
  }

  const seenByKind = {};
  const sequence = [];

  for (const row of relevantRows) {
    const kind = getFacilityKind(row.facilityType);
    if (!kind) {
      continue;
    }

    const slotIndex = Number(seenByKind[kind] || 0) + 1;
    seenByKind[kind] = slotIndex;
    if ((kind === "table" || kind === "stove") && slotIndex === 1) {
      continue;
    }

    sequence.push({
      id: `facility-${row.id}`,
      tableId: Number(row.id || 0),
      sequence: Number(row.sequence || 0),
      kind,
      slotIndex,
      title: row.facilityName || `${slotIndex}번 시설`,
      description: buildFacilityExpansionDescription(kind, slotIndex, row.facilityName),
      cost: Number(row.facilityPrice || 0),
      iconPath: getFacilityExpansionIconPath(kind),
      apply(state) {
        applyFacilityExpansion(state, kind);
      },
    });
  }

  return {
    initialTableCount: Math.max(1, Math.min(TABLE_POSITIONS.length, Number(seenByKind.table || 0) > 0 ? 1 : 2)),
    initialStoveCount: Math.max(1, Math.min(STOVE_POSITIONS.length, Number(seenByKind.stove || 0) > 0 ? 1 : 1)),
    sequence: sequence.length > 0 ? sequence : buildLegacyExpansionSequence(),
  };
}

const RECIPE_CATALOG = buildRecipeCatalog(TABLE_DATA.recipes);
const RECIPE_BY_ID = new Map(RECIPE_CATALOG.map((recipe) => [recipe.id, recipe]));
const RECIPE_GRADE_WEIGHTS = new Map(
  (Array.isArray(TABLE_DATA.recipeGacha) ? TABLE_DATA.recipeGacha : []).map((entry) => [
    Number(entry.recipeGrade),
    Number(entry.recipeGachaWeight || 0),
  ])
);
const RECIPE_ENHANCE_COST_BY_LEVEL = buildLevelValueMap(TABLE_DATA.recipeLevels);
const RECIPE_MAX_LEVEL = Math.max(10, getMapMaxKey(RECIPE_ENHANCE_COST_BY_LEVEL, 10));
const STUDY_COST_BY_LEVEL = buildLevelValueMap(TABLE_DATA.studyLevels);
const STUDY_MAX_LEVEL = Math.max(TABLE_STUDY_LEVEL_MAX, getMapMaxKey(STUDY_COST_BY_LEVEL, TABLE_STUDY_LEVEL_MAX));
const STAFF_LEVEL_ROWS_BY_TABLE_ID = groupBy(TABLE_DATA.staffLevelUp, "staffId");
const STAFF_LEVEL_ROW_BY_KEY = new Map(
  (Array.isArray(TABLE_DATA.staffLevelUp) ? TABLE_DATA.staffLevelUp : []).map((entry) => [
    `${entry.staffId}:${entry.staffLevel}`,
    entry,
  ])
);
const STAFF_CATALOG = buildStaffCatalog(TABLE_DATA.staff, STAFF_LEVEL_ROWS_BY_TABLE_ID);
const STAFF_SLOT_META = {
  chef: {
    id: "chef",
    title: "주방",
    roleTitle: "요리사 자리",
    icon: "🍳",
    description: "요리능력이 높을수록 조리 속도와 판매가가 좋아진다.",
    statKey: "cooking",
    statLabel: "요리능력",
    hireLabel: "주방에 배치",
  },
  server: {
    id: "server",
    title: "홀",
    roleTitle: "서빙 자리",
    icon: "🛎️",
    description: "접대능력이 높을수록 손님 주문을 더 빠르게 대신 받아준다.",
    statKey: "service",
    statLabel: "접대능력",
    hireLabel: "홀에 배치",
  },
  promoter: {
    id: "promoter",
    title: "홍보",
    roleTitle: "홍보 자리",
    icon: "📣",
    description: "홍보능력이 높을수록 손님을 더 자주 데려온다.",
    statKey: "promotion",
    statLabel: "홍보능력",
    hireLabel: "홍보에 배치",
  },
  farmer: {
    id: "farmer",
    title: "농장",
    roleTitle: "농장 자리",
    icon: "🌾",
    description: "성실함이 높을수록 농장에 기본 재료를 자동으로 더 자주 뿌려준다.",
    statKey: "diligence",
    statLabel: "성실함",
    hireLabel: "농장에 배치",
  },
};
const STAFF_ORDER = ["chef", "server", "promoter", "farmer"];
const STAFF_INTERVIEW_START_TICKETS = 3;
const STAFF_INTERVIEW_MAX_TICKETS = 3;
const STAFF_INTERVIEW_TICKET_RECHARGE_SECONDS = 180;
const STAFF_INTERVIEW_START_LEVEL = 1;
const STAFF_INTERVIEW_EXP_PER_SESSION = 1;
const STAFF_INTERVIEW_CANDIDATE_COUNT = 3;
const STAFF_INTERVIEW_NAME_PREFIXES = [
  "말랑",
  "반짝",
  "수줍",
  "달달",
  "또또",
  "통통",
  "꼼꼼",
  "번뜩",
  "느긋",
  "차분",
  "찰떡",
  "포근",
];
const STAFF_INTERVIEW_NAME_SUFFIXES = [
  "삐약",
  "콩알",
  "깃털",
  "노랑",
  "도도",
  "찌니",
  "몽실",
  "또리",
  "하니",
  "둥이",
  "호두",
  "마루",
];
const STAFF_INTERVIEW_TAGS = [
  "센스 있음",
  "손 빠름",
  "붙임성 좋음",
  "성실함",
  "아이디어 많음",
  "깔끔함",
  "차분함",
  "근성 있음",
  "말 잘함",
  "집중력 좋음",
];
const STAFF_INTERVIEW_ROLE_FLAVORS = {
  cooking: "주방에서 손맛이 사는 스타일",
  service: "손님 응대가 부드러운 스타일",
  promotion: "입소문을 크게 만드는 스타일",
  diligence: "꾸준히 일감을 챙기는 스타일",
};
const STAFF_WORK_LINES = {
  chef:     ["주방은 맡겨요~", "더 맛있게 만들어볼게요!", "불 조절이 핵심이죠", "열심히 하겠습니다!", "오늘도 파이팅!"],
  server:   ["어서오세요~", "금방 가져다드릴게요!", "맛있게 드세요~", "불편한 건 없으신가요?", "바로 달려갈게요!"],
  promoter: ["꼭 한번 와보세요!", "맛집이에요 정말~", "오늘 특별 메뉴 있어요!", "이쪽으로 오세요~", "후기 남겨주세요!"],
  farmer:   ["잘 자라렴~", "싱싱하게 키울게요!", "열심히 돌볼게요!", "오늘도 풍년 기원!", "물도 잘 줬다~"],
};
const INTERVIEW_PROTAGONIST_LINES_ENTER = [
  "오늘은 어떤 인재가 올까~",
  "좋은 직원 구하기 어렵네..",
  "긴장되는군..!",
  "면접관 모드 ON!",
  "잘 뽑아봐야지!",
];
const INTERVIEW_PROTAGONIST_LINES_START = [
  "어서오세요! 잘 부탁드려요~",
  "반갑습니다, 편하게 봐주세요!",
  "오~ 오늘 후보들 기대되는걸?",
  "자, 누가 제일 잘하나 보자!",
];
const INTERVIEW_PROTAGONIST_LINES_HIRED = [
  "잘 부탁해요!",
  "기대할게요~!",
  "함께 열심히 해봐요!",
  "잘 오셨어요!",
];
const INTERVIEW_CANDIDATE_GREETING = {
  cooking:   ["요리라면 자신 있어요!", "맛으로 승부할게요!", "주방은 제 집 같죠~", "손맛 하나는 최고예요!"],
  service:   ["손님 응대 자신 있어요!", "미소는 기본이죠!", "편하게 모실게요~", "항상 친절하게요!"],
  promotion: ["입소문은 제가 책임져요!", "홍보라면 맡겨요~", "손님 왕창 모아올게요!", "마케팅 감각 있거든요!"],
  diligence: ["성실함 하나는요!", "꾸준히 하겠습니다!", "믿고 맡겨주세요~", "열심히가 특기예요!"],
};
const INTERVIEW_CANDIDATE_FOCUS_LINES = {
  cooking: [
    "주방 맡겨주시면 바로 보여드릴게요!",
    "불 앞에 세워주시면 템포 자신 있거든요!",
    "맛으로 증명해볼게요!",
  ],
  service: [
    "손님 표정 먼저 보는 편이거든요!",
    "응대는 제가 편하게 해드릴게요!",
    "홀 분위기 금방 살릴 수 있어요!",
  ],
  promotion: [
    "손님 모으는 건 자신 있거든요!",
    "입소문 크게 내볼게요!",
    "가게 이름 확실히 알릴 수 있어요!",
  ],
  diligence: [
    "꾸준한 일은 제가 제일 잘하거든요!",
    "묵묵하게 맡은 일 다 해낼게요!",
    "성실함 하나는 자신 있어요!",
  ],
};
const INTERVIEW_CANDIDATE_SELECTED_LINES = {
  cooking: [
    "주방에서 바로 결과 보여드릴게요!",
    "맛있게 만들 자신 있거든요!",
    "좋아요, 칼같이 해볼게요!",
  ],
  service: [
    "손님들 편하게 모셔볼게요!",
    "홀은 제가 부드럽게 풀어볼게요!",
    "응대는 안심하고 맡겨주세요!",
  ],
  promotion: [
    "손님 줄 세워볼게요!",
    "홍보 쪽은 제가 확실히 챙길게요!",
    "좋아요, 소문 제대로 내보죠!",
  ],
  diligence: [
    "꾸준하게 끝까지 해볼게요!",
    "비는 시간 없이 챙겨볼게요!",
    "성실하게 바로 들어가겠습니다!",
  ],
};
const FACILITY_EXPANSION_CONFIG = buildFacilityExpansionSequence(REMODELING_FACILITY_ROWS);
const INITIAL_TABLE_COUNT = FACILITY_EXPANSION_CONFIG.initialTableCount;
const INITIAL_STOVE_COUNT = FACILITY_EXPANSION_CONFIG.initialStoveCount;
const SKILL_CATALOG = [
  {
    id: "price_boost",
    title: "장사 감각",
    description: "모든 판매 수익 +5%",
    maxLevel: null,
    weight: 1,
    apply(state) {
      state.study.skillBonuses.price += 0.05;
    },
  },
  {
    id: "cook_boost",
    title: "불쇼 장인",
    description: "모든 조리 시간 -6%",
    maxLevel: null,
    weight: 1,
    apply(state) {
      state.study.skillBonuses.cook += 0.06;
    },
  },
  {
    id: "eat_boost",
    title: "한 입 컷",
    description: "손님 식사 시간 -6%",
    maxLevel: null,
    weight: 1,
    apply(state) {
      state.study.skillBonuses.eat += 0.06;
    },
  },
  {
    id: "acorn_grant",
    title: "도토리 주머니",
    description: "공부 레벨 비례 도토리 획득",
    maxLevel: null,
    weight: 0.8,
    repeatable: true,
    showLevel: false,
    apply(state) {
      const saladPrice = Math.max(1, Number(getRecipe("salad")?.basePrice || 60));
      const studyLevel = Math.max(1, Number(state.study?.level || 1));
      state.resources.acorns += saladPrice * studyLevel * 5;
    },
  },
  {
    id: "interview_ticket",
    title: "면접 교섭권",
    description: "면접권 1장 획득",
    maxLevel: null,
    weight: 0.8,
    requiresFeature: "interview",
    repeatable: true,
    showLevel: false,
    apply(state) {
      const interview = state.staffs?.interview;
      if (!interview) {
        return;
      }
      interview.tickets = Math.min(STAFF_INTERVIEW_MAX_TICKETS, Number(interview.tickets || 0) + 1);
      if (interview.tickets >= STAFF_INTERVIEW_MAX_TICKETS) {
        interview.ticketNextChargeAt = 0;
      } else if (!interview.ticketNextChargeAt) {
        interview.ticketNextChargeAt = Number(state.clock || 0) + STAFF_INTERVIEW_TICKET_RECHARGE_SECONDS;
      }
    },
  },
  {
    id: "special_guest_boost",
    title: "특별 손님 레이더",
    description: "특별 손님 방문 확률 +2%",
    maxLevel: null,
    weight: 0.5,
    requiresFeature: "specialGuests",
    rarity: "rare",
    apply(state) {
      state.study.skillBonuses.specialGuestChance += 0.02;
    },
  },
  {
    id: "farm_bonus",
    title: "풍년의 손",
    description: "농장 보너스 확률 +3%",
    maxLevel: null,
    weight: 0.5,
    requiresFeature: "farm",
    rarity: "rare",
    apply(state) {
      state.study.skillBonuses.farmBonusChance += 0.03;
    },
  },
];
const EXPANSION_SEQUENCE = FACILITY_EXPANSION_CONFIG.sequence;
const NORMAL_CUSTOMER_COLOR = "#ffd54f";
const NORMAL_CUSTOMER_NAME = "평범한 삐약";
const SPECIAL_CUSTOMER_CHANCE = 0.07;
const SPECIAL_CUSTOMER_FIRST_GUARANTEE_SERVED = 15;
const SOCIAL_HANDLE = "@노란요리사";
const SOCIAL_CAPTURE_COOLDOWN = 90;
const SATISFACTION_TIERS = [
  {
    id: "happy",
    minScore: 6.2,
    label: "만족",
    emoji: "😋",
    bubbleText: "만족!",
    imageTier: "great",
    serviceLikeBonus: 1,
    socialLikes: 28,
    socialFollowers: 4,
    bubbleFill: "rgba(255, 246, 219, 0.96)",
    bubbleInk: "#6f5630",
  },
  {
    id: "okay",
    minScore: -Infinity,
    label: "무난",
    emoji: "🙂",
    bubbleText: "괜찮다!",
    imageTier: "warm",
    serviceLikeBonus: 0,
    socialLikes: 18,
    socialFollowers: 2,
    bubbleFill: "rgba(245, 242, 234, 0.96)",
    bubbleInk: "#59614f",
  },
];
const CUSTOMER_BADGES = [
  "🌼",
  "🎀",
  "🍀",
  "⭐",
  "📚",
  "🎒",
  "🏕️",
  "🍽️",
  "☔",
  "📷",
  "🏃",
  "🌇",
  "✨",
  "🧪",
  "🎤",
  "🪧",
  "💗",
  "🎻",
  "🏮",
  "🌊",
  "🎉",
  "🧩",
  "🔒",
  "🌶️",
  "🌙",
  "👑",
  "🏅",
  "📱",
  "🎬",
  "🍴",
];
const NORMAL_CHICK_ICON_PATH = "Icon/Chick/Icon_Chick_001.png";
const SPECIAL_CHICK_ICON_PATHS = [
  "Icon/Chick/Icon_Chick_002.png",
  "Icon/Chick/Icon_Chick_003.png",
  "Icon/Chick/Icon_Chick_004.png",
  "Icon/Chick/Icon_Chick_005.png",
  "Icon/Chick/Icon_Chick_006.png",
  "Icon/Chick/Icon_Chick_007.png",
];
const PROTAGONIST_CHICK_ICON_PATH = "Icon/Chick/Icon_Chick_099.png";
const STOVE_FACILITY_ICON_PATH = "Icon/Facility/Icon_Facility_Stove_Wood.png";
const TABLE_FACILITY_ICON_PATH = "Icon/Facility/Icon_Facility_Table_Wood.png";
const ACORN_CURRENCY_ICON_PATH = "icon/currency/Icon_Currency_001.png";
const spriteImageCache = new Map();
function makeCustomerUnlockCondition(index, primaryRecipeId) {
  if (index < 8) {
    return { type: "recipe", recipeId: primaryRecipeId };
  }
  if (index < 16) {
    return { type: "recipeLevel", recipeId: primaryRecipeId, value: 2 };
  }
  if (index < 24) {
    return { type: "recipeLevel", recipeId: primaryRecipeId, value: 4 };
  }
  return { type: "recipeLevel", recipeId: primaryRecipeId, value: 6 };
}
const GUEST_ICON_ENTRY_BY_ID = new Map(
  (Array.isArray(GUEST_ICON_LIBRARY.entries) ? GUEST_ICON_LIBRARY.entries : []).map((entry) => [entry.guestId, entry])
);
const SPECIAL_GUEST_UNLOCK_RECIPES = RECIPE_CATALOG.filter((recipe) => recipe.id !== "salad");
const CUSTOMER_PROFILES = GUEST_PERSONA_CATALOG.map((persona, index) => {
  const primaryRecipe = RECIPE_CATALOG[index % RECIPE_CATALOG.length];
  const secondaryRecipe = RECIPE_CATALOG[(index + 3) % RECIPE_CATALOG.length];
  const unlockRecipe = SPECIAL_GUEST_UNLOCK_RECIPES[index % SPECIAL_GUEST_UNLOCK_RECIPES.length] || primaryRecipe;
  const iconEntry = GUEST_ICON_ENTRY_BY_ID.get(persona.id);
  return {
    id: persona.id || `guest-${index + 1}`,
    kind: "special",
    name: persona.name,
    title: persona.title,
    bio: persona.bio,
    visualPrompt: persona.visualPrompt,
    minRankIndex: 0,
    color: CUSTOMER_COLORS[index % CUSTOMER_COLORS.length],
    badge: persona.badge || CUSTOMER_BADGES[index % CUSTOMER_BADGES.length],
    accent: persona.accent || primaryRecipe.accent,
    iconPath: iconEntry?.path || SPECIAL_CHICK_ICON_PATHS[index % SPECIAL_CHICK_ICON_PATHS.length],
    iconSource: iconEntry?.source || (iconEntry?.path ? "library" : "builtin"),
    preferredRecipes: [primaryRecipe.id, secondaryRecipe.id],
    unlockCondition: makeCustomerUnlockCondition(index, unlockRecipe.id),
  };
});
const CUSTOMER_PATRON_LEVELS = [
  {
    level: 1,
    visitsRequired: 1,
    title: "눈도장",
    followerReward: 8,
  },
  {
    level: 2,
    visitsRequired: 3,
    title: "단골",
    followerReward: 12,
    ingredientBundle: {
      primary: 4,
      secondary: 2,
    },
  },
  {
    level: 3,
    visitsRequired: 5,
    title: "찐단골",
    followerReward: 18,
    ingredientBundle: {
      secondary: 3,
      special: 1,
    },
    recipeUnlock: true,
  },
];
const RANK_TIERS = [
  {
    id: "stage-1",
    title: "막 개업한 레스토랑 1",
    copy: "막 문을 연 작은 식당. 첫 손님을 받으며 가게의 기본을 익혀 나간다.",
    reward: null,
  },
  {
    id: "stage-2",
    title: "막 개업한 레스토랑 2",
    copy: "기본 영업이 자리를 잡아가는 단계. 공부와 준비가 조금씩 익숙해진다.",
    reward: null,
    requirements: [
      { type: "metric", metric: "servedCount", target: 5 },
      { type: "metric", metric: "promotionActions", target: 30 },
      { type: "metric", metric: "studyLevel", target: 3 },
    ],
  },
  {
    id: "stage-3",
    title: "메뉴를 갖춘 레스토랑 1",
    copy: "메뉴판과 재료 준비가 본격적으로 갖춰지기 시작하는 단계.",
    reward: null,
    requirements: [
      { type: "metric", metric: "servedCount", target: 12 },
      { type: "metric", metric: "expansionStage", target: 1 },
      { type: "metric", metric: "recipeRegistrations", target: 1 },
      { type: "metric", metric: "farmGenerations", target: 8 },
      { type: "metric", metric: "farmHarvests", target: 2 },
      { type: "metric", metric: "recipeServed:sandwich", target: 1 },
    ],
  },
  {
    id: "stage-4",
    title: "메뉴를 갖춘 레스토랑 2",
    copy: "주력 메뉴를 다듬고 가게 흐름을 정리해 나가는 단계.",
    reward: null,
    requirements: [
      { type: "metric", metric: "expansionStage", target: 3 },
      { type: "metric", metric: "promotionActions", target: 100 },
      { type: "metric", metric: "servedCount", target: 20 },
      { type: "metric", metric: "recipeLevel:sandwich", target: 2 },
      { type: "metric", metric: "studyLevel", target: 7 },
    ],
  },
  {
    id: "stage-5",
    title: "가게다운 레스토랑 1",
    copy: "가게 규모와 동선이 한층 정돈되며 운영의 틀이 잡히기 시작한다.",
    reward: null,
    requirements: [
      { type: "metric", metric: "ownPosts", target: 3 },
      { type: "metric", metric: "expansionStage", target: 5 },
      { type: "metric", metric: "servedCount", target: 35 },
      { type: "metric", metric: "promotionActions", target: 120 },
      { type: "metric", metric: "followers", target: 10 },
    ],
  },
  {
    id: "stage-6",
    title: "가게다운 레스토랑 2",
    copy: "SNS와 운영 흐름이 더해지며 식당다운 운영 체계가 갖춰진다.",
    reward: null,
    requirements: [
      { type: "metric", metric: "followers", target: 20 },
      { type: "metric", metric: "expansionStage", target: 6 },
      { type: "metric", metric: "servedCount", target: 70 },
      { type: "metric", metric: "satisfiedCustomers", target: 12 },
      { type: "metric", metric: "studyLevel", target: 12 },
    ],
  },
  {
    id: "stage-7",
    title: "가게다운 레스토랑 3",
    copy: "기본 시스템들이 서로 맞물리며 운영 리듬이 안정되는 단계.",
    reward: null,
    requirements: [
      { type: "metric", metric: "interviewSessions", target: 1 },
      { type: "metric", metric: "studyLevel", target: 16 },
      { type: "metric", metric: "highestRecipeLevel", target: 2 },
      { type: "metric", metric: "servedCount", target: 95 },
      { type: "metric", metric: "expansionStage", target: 7 },
      { type: "metric", metric: "recipeRegistrations", target: 6 },
    ],
  },
  {
    id: "stage-8",
    title: "동네 인기 레스토랑 1",
    copy: "가게의 이름이 근처 손님들에게 조금씩 알려지기 시작한다.",
    reward: null,
    requirements: [
      { type: "metric", metric: "farmGenerations", target: 20 },
      { type: "metric", metric: "farmHarvests", target: 12 },
      { type: "metric", metric: "servedCount", target: 130 },
      { type: "metric", metric: "expansionStage", target: 8 },
      { type: "metric", metric: "satisfiedCustomers", target: 18 },
    ],
  },
  {
    id: "stage-9",
    title: "동네 인기 레스토랑 2",
    copy: "단골과 새로운 손님이 함께 늘어나며 운영 선택지가 중요해진다.",
    reward: null,
    requirements: [
      { type: "metric", metric: "recipeRegistrations", target: 8 },
      { type: "metric", metric: "highestRecipeLevel", target: 3 },
      { type: "metric", metric: "servedCount", target: 160 },
      { type: "metric", metric: "expansionStage", target: 9 },
      { type: "metric", metric: "ownPosts", target: 6 },
    ],
  },
  {
    id: "stage-10",
    title: "동네 인기 레스토랑 3",
    copy: "특별한 손님과 입소문이 맞물리며 한 동네의 주목을 받기 시작한다.",
    reward: null,
    requirements: [
      { type: "metric", metric: "specialDiscovered", target: 3 },
      { type: "metric", metric: "specialSatisfied", target: 3 },
      { type: "metric", metric: "followers", target: 60 },
      { type: "metric", metric: "servedCount", target: 180 },
      { type: "metric", metric: "expansionStage", target: 10 },
    ],
  },
  {
    id: "stage-11",
    title: "동네 인기 레스토랑 4",
    copy: "공간과 서비스가 더 정돈되며 동네 안에서 존재감이 뚜렷해진다.",
    reward: null,
    requirements: [
      { type: "metric", metric: "servedCount", target: 200 },
      { type: "metric", metric: "expansionStage", target: 11 },
      { type: "metric", metric: "specialSatisfied", target: 4 },
    ],
  },
  {
    id: "stage-12",
    title: "동네 맛집 1",
    copy: "이제는 동네 사람들이 먼저 떠올리는 맛집의 초입에 들어선다.",
    reward: null,
    requirements: [
      { type: "metric", metric: "studyLevel", target: 24 },
      { type: "metric", metric: "highestRecipeLevel", target: 4 },
      { type: "metric", metric: "satisfiedCustomers", target: 28 },
      { type: "metric", metric: "servedCount", target: 220 },
    ],
  },
  {
    id: "stage-13",
    title: "동네 맛집 2",
    copy: "화제성과 실력이 함께 쌓이며 맛집다운 인상을 굳혀 가는 단계.",
    reward: null,
    requirements: [
      { type: "metric", metric: "promotionActions", target: 220 },
      { type: "metric", metric: "ownPosts", target: 10 },
      { type: "metric", metric: "followers", target: 120 },
      { type: "metric", metric: "servedCount", target: 240 },
    ],
  },
  {
    id: "stage-14",
    title: "동네 맛집 3",
    copy: "디테일과 팀 운영이 살아나며 완성도가 한층 또렷해진다.",
    reward: null,
    requirements: [
      { type: "metric", metric: "staffHires", target: 1 },
      { type: "metric", metric: "servedCount", target: 280 },
      { type: "metric", metric: "specialSatisfied", target: 5 },
    ],
  },
  {
    id: "stage-15",
    title: "동네 맛집 4",
    copy: "재료와 메뉴의 수준이 올라가며 한 접시의 무게가 달라지는 단계.",
    reward: null,
    requirements: [
      { type: "metric", metric: "farmHarvests", target: 25 },
      { type: "metric", metric: "servedCount", target: 320 },
      { type: "metric", metric: "studyLevel", target: 36 },
      { type: "metric", metric: "highestRecipeLevel", target: 5 },
    ],
  },
  {
    id: "stage-16",
    title: "동네 맛집 5",
    copy: "동네를 넘어 더 넓은 관심을 받기 직전의 탄탄한 맛집 단계.",
    reward: null,
    requirements: [
      { type: "metric", metric: "specialDiscovered", target: 5 },
      { type: "metric", metric: "specialSatisfied", target: 7 },
      { type: "metric", metric: "ownPosts", target: 14 },
      { type: "metric", metric: "servedCount", target: 400 },
    ],
  },
  {
    id: "stage-17",
    title: "지역 인기 맛집 1",
    copy: "가게 이름이 동네를 넘어 지역 안에서 통하기 시작하는 단계.",
    reward: null,
    requirements: [
      { type: "metric", metric: "servedCount", target: 360 },
      { type: "metric", metric: "highestRecipeLevel", target: 6 },
      { type: "metric", metric: "followers", target: 180 },
    ],
  },
  {
    id: "stage-18",
    title: "지역 인기 맛집 2",
    copy: "연구와 숙련이 쌓이며 지역권 손님들의 기대를 받는 단계.",
    reward: null,
    requirements: [
      { type: "metric", metric: "studyLevel", target: 55 },
      { type: "metric", metric: "highestRecipeLevel", target: 7 },
      { type: "metric", metric: "interviewSessions", target: 4 },
      { type: "metric", metric: "servedCount", target: 420 },
    ],
  },
  {
    id: "stage-19",
    title: "지역 인기 맛집 3",
    copy: "이름만으로도 손님을 끌어들이는 지역 인기 맛집으로 자리 잡는다.",
    reward: null,
    requirements: [
      { type: "metric", metric: "followers", target: 260 },
      { type: "metric", metric: "servedCount", target: 470 },
      { type: "metric", metric: "satisfiedCustomers", target: 40 },
      { type: "metric", metric: "ownPosts", target: 18 },
    ],
  },
  {
    id: "stage-20",
    title: "지역 인기 맛집 4",
    copy: "모든 운영 축이 완성형에 가까워진, 지역 최상위권 인기 맛집 단계.",
    reward: null,
    requirements: [
      { type: "metric", metric: "studyLevel", target: 80 },
      { type: "metric", metric: "servedCount", target: 650 },
      { type: "metric", metric: "specialSatisfied", target: 10 },
      { type: "metric", metric: "staffHires", target: 4 },
    ],
  },
];

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const MAX_CANVAS_RENDER_SCALE = 2;
let canvasRenderScale = 1;

function getCanvasRenderScale() {
  return canvasRenderScale;
}

function configureCanvasResolution() {
  const deviceScale = Math.max(1, Math.min(MAX_CANVAS_RENDER_SCALE, window.devicePixelRatio || 1));
  canvasRenderScale = deviceScale;

  const pixelWidth = Math.round(GAME_WIDTH * canvasRenderScale);
  const pixelHeight = Math.round(GAME_HEIGHT * canvasRenderScale);

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  ctx.setTransform(canvasRenderScale, 0, 0, canvasRenderScale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) {
    ctx.imageSmoothingQuality = "high";
  }
}
