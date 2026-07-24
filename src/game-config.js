(function () {
"use strict";

const GAME_W = 480;
const GAME_H = 900;
const FIXED_DT = 1 / 60;
const SAVE_KEY = "chick-bistro-planning-prototype-v2";

const RECIPE_NAMES = [
  "샐러드", "샌드위치", "핫도그", "수프", "꼬치구이", "김밥", "피자", "볶음밥", "햄버거", "웨지감자",
  "비빔밥", "딤섬", "파스타", "타코", "라멘", "돈까스", "카레", "초밥", "불고기", "스테이크",
  "스마일 계란후라이", "병아리 오므라이스", "만화 모양 고기", "꼬끼오 도시락", "병아리 오니기리",
  "둥지 당근 라페", "병아리 앙쿠르트 수프", "폭탄 계란찜", "해바라기 씨앗 파이", "회전 회오리 감자",
  "눈사람 유부초밥", "도토리묵", "황제 버거", "과일 가족 모임", "찜질방 대표 음식", "비 오는 날엔 스튜",
  "몰래 먹는 야식", "바쁘다 바빠 아침", "눈 오는 날 국물 요리", "구름빵",
];

const RECIPE_ICON_SLUGS = [
  "salad", "sandwich", "hotdog", "soup", "grilledskewers", "kimbap", "pizza", "friedrice", "hamburger", "potatowedges",
  "bibimbap", "dimsum", "pasta", "taco", "ramen", "porkcutlet", "curry", "sushi", "bulgogi", "steak",
  "smilefried", "omelet", "cartoonbeef", "chicklunchbox", "onigiri", "carrotsalad", "encroutesoup", "steamedeggs",
  "sunflowerpie", "tornadopotato", "yubuchobap", "dotorimuk", "burgerking", "fruitbasket", "saunaset",
  "pajeonmakgeolli", "chickcoke", "toast", "hotpottea", "cloudbread",
];

const THEME_NAMES = {
  1: "돌 테마",
  2: "나무 테마",
  3: "초록 줄무늬 테마",
  4: "블루화이트 테마",
  5: "그린핑크 테마",
  6: "캠핑 테마",
  7: "블루 땡땡이 테마",
  8: "이태리 테마",
  9: "벚꽃 테마",
  10: "식빵 테마",
  11: "병아리 테마",
  12: "옛날 사무실 테마",
  13: "연금술 테마",
  14: "목욕탕 테마",
  15: "우주 점성술 테마",
};

const THEME_SLUGS = {
  1: "stone", 2: "wood", 3: "greenstripe", 4: "bluewhite", 5: "greenpink", 6: "camping",
  7: "bluepolkadots", 8: "italy", 9: "cherryblossom", 10: "loafbread", 11: "chickhouse",
  12: "retrooffice", 13: "alchemical", 14: "bathhouse", 15: "astrology",
};

const THEME_CHICK_THRESHOLDS = [0.3, 0.7, 1];

const GUEST_GRADES = [
  { id: 1, name: "첫 방문", minVisits: 1, primaryCount: 1, secondaryCount: 0, rareCount: 0 },
  { id: 2, name: "낯익은 손님", minVisits: 20, primaryCount: 2, secondaryCount: 0, rareCount: 0 },
  { id: 3, name: "단골", minVisits: 80, primaryCount: 2, secondaryCount: 1, rareCount: 0 },
  { id: 4, name: "VIP", minVisits: 250, primaryCount: 3, secondaryCount: 1, rareCount: 0 },
  { id: 5, name: "최고의 단골", minVisits: 700, primaryCount: 3, secondaryCount: 1, rareCount: 1 },
];

const CAFE_CAKE_MILESTONES = [0.3, 0.7, 1];
const CAFE_THEME_PRICE_RATE = 0.25;
const CAFE_THEME_MIN_PRICE = 25;
const BASE_CAKE_INGREDIENTS = [
  { id: "cake_sheet_basic", type: "sheet", name: "기본 스펀지 시트", emoji: "🍰" },
  { id: "cake_cream_fresh", type: "cream", name: "생크림", emoji: "🧁" },
  { id: "cake_topping_strawberry", type: "topping", name: "딸기 토핑", emoji: "🍓" },
];
const LEGACY_CAFE_THEME_CAKE_REWARDS = {
  1: [
    { id: "cake_sheet_plain", type: "sheet", name: "담백한 시트", emoji: "🍰" },
    { id: "cake_cream_milk", type: "cream", name: "우유 크림", emoji: "🥛" },
    { id: "cake_topping_eggshell", type: "topping", name: "알껍질 토핑", emoji: "🥚" },
  ],
  2: [
    { id: "cake_sheet_walnut", type: "sheet", name: "호두 시트", emoji: "🌰" },
    { id: "cake_cream_maple", type: "cream", name: "메이플 크림", emoji: "🍯" },
    { id: "cake_topping_acorn", type: "topping", name: "도토리 토핑", emoji: "🌰" },
  ],
  3: [
    { id: "cake_sheet_matcha", type: "sheet", name: "말차 시트", emoji: "🍵" },
    { id: "cake_cream_herb", type: "cream", name: "허브 크림", emoji: "🌿" },
    { id: "cake_topping_leaf", type: "topping", name: "나뭇잎 토핑", emoji: "🍃" },
  ],
  4: [
    { id: "cake_sheet_yogurt", type: "sheet", name: "요거트 시트", emoji: "🥛" },
    { id: "cake_cream_blueberry", type: "cream", name: "블루베리 크림", emoji: "🫐" },
    { id: "cake_topping_cloud", type: "topping", name: "구름 토핑", emoji: "☁️" },
  ],
  5: [
    { id: "cake_sheet_pistachio", type: "sheet", name: "피스타치오 시트", emoji: "🌰" },
    { id: "cake_cream_strawberry", type: "cream", name: "딸기 크림", emoji: "🍓" },
    { id: "cake_topping_flower", type: "topping", name: "꽃 토핑", emoji: "🌸" },
  ],
  6: [
    { id: "cake_sheet_sweetpotato", type: "sheet", name: "고구마 시트", emoji: "🍠" },
    { id: "cake_cream_roasted", type: "cream", name: "구운 크림", emoji: "🔥" },
    { id: "cake_topping_marshmallow", type: "topping", name: "마시멜로 토핑", emoji: "☁️" },
  ],
  7: [
    { id: "cake_sheet_cookie", type: "sheet", name: "쿠키 시트", emoji: "🍪" },
    { id: "cake_cream_soda", type: "cream", name: "소다 크림", emoji: "🥤" },
    { id: "cake_topping_polkadot", type: "topping", name: "땡땡이 캔디", emoji: "🍬" },
  ],
  8: [
    { id: "cake_sheet_coffee", type: "sheet", name: "커피 시트", emoji: "☕" },
    { id: "cake_cream_mascarpone", type: "cream", name: "마스카포네 크림", emoji: "🧀" },
    { id: "cake_topping_cocoa", type: "topping", name: "코코아 토핑", emoji: "🍫" },
  ],
  9: [
    { id: "cake_sheet_cherry", type: "sheet", name: "체리 시트", emoji: "🍒" },
    { id: "cake_cream_cherryblossom", type: "cream", name: "벚꽃 크림", emoji: "🌸" },
    { id: "cake_topping_petals", type: "topping", name: "꽃잎 토핑", emoji: "🌸" },
  ],
  10: [
    { id: "cake_sheet_brioche", type: "sheet", name: "브리오슈 시트", emoji: "🍞" },
    { id: "cake_cream_butter", type: "cream", name: "버터 크림", emoji: "🧈" },
    { id: "cake_topping_toast", type: "topping", name: "토스트 토핑", emoji: "🍞" },
  ],
  11: [
    { id: "cake_sheet_egg", type: "sheet", name: "달걀 시트", emoji: "🥚" },
    { id: "cake_cream_custard", type: "cream", name: "커스터드 크림", emoji: "🍮" },
    { id: "cake_topping_chick", type: "topping", name: "병아리 토핑", emoji: "🐥" },
  ],
  12: [
    { id: "cake_sheet_mocha", type: "sheet", name: "모카 시트", emoji: "☕" },
    { id: "cake_cream_condensedmilk", type: "cream", name: "연유 크림", emoji: "🥛" },
    { id: "cake_topping_document", type: "topping", name: "서류 토핑", emoji: "📄" },
  ],
  13: [
    { id: "cake_sheet_blackcocoa", type: "sheet", name: "블랙코코아 시트", emoji: "🍫" },
    { id: "cake_cream_purple", type: "cream", name: "보라빛 크림", emoji: "🫐" },
    { id: "cake_topping_potion", type: "topping", name: "포션 토핑", emoji: "🧪" },
  ],
  14: [
    { id: "cake_sheet_banana", type: "sheet", name: "바나나 시트", emoji: "🍌" },
    { id: "cake_cream_bathmilk", type: "cream", name: "목욕 우유 크림", emoji: "🥛" },
    { id: "cake_topping_bathbasket", type: "topping", name: "목욕 바구니 토핑", emoji: "🧺" },
  ],
  15: [
    { id: "cake_sheet_chocolate", type: "sheet", name: "초콜릿 시트", emoji: "🍫" },
    { id: "cake_cream_galaxy", type: "cream", name: "은하수 크림", emoji: "🌌" },
    { id: "cake_topping_star", type: "topping", name: "별 토핑", emoji: "⭐" },
  ],
};

const CAFE_THEME_NAMES = {
  101: "통나무 카페",
  102: "모던 카페",
};

const CAFE_THEME_CAKE_REWARDS = {
  101: [
    { id: "cake_sheet_walnut", type: "sheet", name: "호두 시트", emoji: "🌰" },
    { id: "cake_cream_maple", type: "cream", name: "메이플 크림", emoji: "🍯" },
    { id: "cake_topping_acorn", type: "topping", name: "도토리 토핑", emoji: "🌰" },
  ],
  102: [
    { id: "cake_sheet_vanilla", type: "sheet", name: "바닐라 시트", emoji: "🍰" },
    { id: "cake_cream_espresso", type: "cream", name: "에스프레소 크림", emoji: "☕" },
    { id: "cake_topping_chocolate", type: "topping", name: "초콜릿 토핑", emoji: "🍫" },
  ],
};

const GAME_INGREDIENTS = {
  lettuce: { id: 30001, name: "양상추", emoji: "🥬" }, tomato: { id: 30002, name: "토마토", emoji: "🍅" },
  bread: { id: 30003, name: "빵", emoji: "🍞" }, cheese: { id: 30004, name: "치즈", emoji: "🧀" },
  egg: { id: 30005, name: "달걀", emoji: "🥚" }, sausage: { id: 30006, name: "소시지", emoji: "🌭" },
  potato: { id: 30007, name: "감자", emoji: "🥔" }, meat: { id: 30008, name: "고기", emoji: "🥩" },
  rice: { id: 30009, name: "쌀", emoji: "🍚" }, oil: { id: 30010, name: "식용유", emoji: "🫗" },
  flour: { id: 30011, name: "밀가루", emoji: "🌾" }, noodles: { id: 30012, name: "면", emoji: "🍜" },
  tortilla: { id: 30013, name: "또띠아", emoji: "🫓" }, broth: { id: 30014, name: "육수", emoji: "🥣" },
  breadcrumbs: { id: 30015, name: "빵가루", emoji: "🍞" }, curry: { id: 30016, name: "카레가루", emoji: "🍛" },
  fish: { id: 30017, name: "생선", emoji: "🐟" }, soy: { id: 30018, name: "간장", emoji: "🫙" },
  truffle: { id: 30019, name: "트러플", emoji: "🍄" }, butter: { id: 30020, name: "버터", emoji: "🧈" },
  milk: { id: 30021, name: "우유", emoji: "🥛" }, pepper: { id: 30022, name: "후추", emoji: "🧂" },
  mixedVeg: { id: 30023, name: "모둠 채소", emoji: "🥕" }, seaweed: { id: 30024, name: "김", emoji: "🌿" },
  carrot: { id: 30025, name: "당근", emoji: "🥕" }, cream: { id: 30026, name: "생크림", emoji: "🥛" },
  garlic: { id: 30027, name: "마늘", emoji: "🧄" }, seed: { id: 30028, name: "해바라기씨", emoji: "🌻" },
  salt: { id: 30029, name: "소금", emoji: "🧂" }, tofu: { id: 30030, name: "두부", emoji: "🧈" },
  acorn: { id: 30031, name: "도토리", emoji: "🌰" }, pickle: { id: 30032, name: "피클", emoji: "🥒" },
  fruit: { id: 30033, name: "과일", emoji: "🍎" }, onion: { id: 30034, name: "양파", emoji: "🧅" },
  chili: { id: 30035, name: "고추", emoji: "🌶️" }, jam: { id: 30036, name: "잼", emoji: "🍓" },
  cabbage: { id: 30037, name: "양배추", emoji: "🥬" }, yeast: { id: 30038, name: "이스트", emoji: "🍞" },
};

const RECIPE_INGREDIENT_KEYS = [
  ["lettuce", "tomato", "mixedVeg"], ["bread", "cheese", "egg"], ["sausage", "bread", "onion"], ["milk", "potato", "onion"],
  ["meat", "onion", "pepper"], ["rice", "seaweed", "carrot"], ["tomato", "cheese", "flour"], ["oil", "rice", "egg"],
  ["cheese", "bread", "meat"], ["potato", "oil", "salt"], ["egg", "rice", "mixedVeg"], ["flour", "meat", "cabbage"],
  ["noodles", "tomato", "cheese"], ["tortilla", "meat", "tomato"], ["broth", "noodles", "egg"], ["breadcrumbs", "meat", "flour"],
  ["curry", "potato", "onion"], ["fish", "rice", "seaweed"], ["soy", "meat", "garlic"], ["truffle", "meat", "butter"],
  ["butter", "egg", "salt"], ["milk", "egg", "butter"], ["pepper", "meat", "oil"], ["mixedVeg", "rice", "egg"],
  ["seaweed", "rice", "fish"], ["carrot", "lettuce", "tomato"], ["cream", "milk", "flour"], ["garlic", "egg", "milk"],
  ["seed", "flour", "butter"], ["salt", "potato", "oil"], ["tofu", "rice", "soy"], ["acorn", "salt", "tofu"],
  ["pickle", "bread", "meat"], ["fruit", "milk", "cream"], ["egg", "salt", "milk"], ["onion", "meat", "potato"],
  ["chili", "noodles", "cheese"], ["jam", "bread", "egg"], ["cabbage", "broth", "meat"], ["yeast", "flour", "egg"],
];

const PRIMARY_ROUTE_OVERRIDES = {
  1: { customerId: 3, commonId: 1001, customerName: "기본 병아리", recipeId: 1, baseRecipeId: 1, recipeName: "샐러드" },
  6: { customerId: 4, commonId: 1020, customerName: "카우보이 병아리", recipeId: 10, baseRecipeId: 10, recipeName: "웨지감자" },
  8: { customerId: 5, commonId: 1003, customerName: "공룡 병아리", recipeId: 7, baseRecipeId: 7, recipeName: "피자" },
};

const STONE_COMPLETION_BONUS = {
  customerId: 10013,
  commonId: 1002,
  customerName: "알껍질 병아리",
  recipeId: 2,
  baseRecipeId: 2,
  recipeName: "샌드위치",
};

function shortThemeName(themeId) {
  return (THEME_NAMES[themeId] || `테마 ${themeId}`).replace(/ 테마$/, "");
}

const CORE_PROGRESSION = Object.keys(THEME_NAMES).flatMap((themeIdText) => {
  const themeId = Number(themeIdText);
  return THEME_CHICK_THRESHOLDS.map((threshold, slot) => {
    const globalIndex = (themeId - 1) * 3 + slot;
    const override = themeId === 1 && slot === 2 ? STONE_COMPLETION_BONUS : slot === 0 ? PRIMARY_ROUTE_OVERRIDES[themeId] : null;
    const baseRecipeId = override?.baseRecipeId || globalIndex % RECIPE_NAMES.length + 1;
    const ingredientTypeCount = globalIndex < 12 ? 1 : globalIndex < 39 ? 2 : 3;
    const rewardIngredientKeys = [...RECIPE_INGREDIENT_KEYS[baseRecipeId - 1]];
    if (baseRecipeId === 12) rewardIngredientKeys[2] = "breadcrumbs";
    const rewardIngredients = rewardIngredientKeys.map((key) => GAME_INGREDIENTS[key]);
    const ingredientRequirements = rewardIngredients.slice(0, ingredientTypeCount);
    const dropIngredient = rewardIngredients[0];
    const commonIndex = globalIndex % 45 + 1;
    return {
      themeId,
      slot,
      threshold,
      customerId: override?.customerId || 10000 + themeId * 10 + slot + 1,
      customerName: override?.customerName || `${THEME_NAMES[themeId]} 병아리 ${slot + 1}`,
      commonId: override?.commonId || 1000 + commonIndex,
      ingredientId: dropIngredient.id,
      ingredientName: dropIngredient.name,
      ingredientEmoji: dropIngredient.emoji,
      rewardIngredients,
      ingredientRequirements,
      recipeId: override?.recipeId || 10000 + globalIndex,
      baseRecipeId: override?.baseRecipeId || baseRecipeId,
      recipeName: override?.recipeName || `${shortThemeName(themeId)} ${RECIPE_NAMES[baseRecipeId - 1]}`,
      ingredientCount: 2,
      dropChance: 1,
    };
  });
});

function themeChickMilestones(themeId) {
  return CORE_PROGRESSION.filter((entry) => entry.themeId === Number(themeId));
}

function allThemeChickMilestones() {
  return Object.keys(THEME_NAMES).flatMap((themeId) => themeChickMilestones(Number(themeId)));
}

const REGION_UNLOCKS = [
  { id: 1, name: "신규 지역", recipeCount: 3 },
];

function recipeName(id) { return RECIPE_NAMES[id - 1] || `메뉴 ${id}`; }
function recipeIcon(id) {
  const slug = RECIPE_ICON_SLUGS[id - 1] || "salad";
  return `assets/ui/recipe/icon_recipe_${slug}.png`;
}

const FACILITY_META = {
  1: { key: "table", name: "테이블", description: "손님 두 마리가 앉아 주문하고 식사할 수 있어요.", icon: "assets/ui/facility/icon_facility_1_table_stone.png" },
  2: { key: "stove", name: "조리기구", description: "받은 주문을 데이터의 조리 시간만큼 자동으로 요리해요.", icon: "assets/ui/facility/icon_facility_1_stove_stone.png" },
  3: { key: "tipbox", name: "팁박스", description: "손님이 남긴 팁을 모아 한 번에 받을 수 있어요.", icon: "assets/ui/facility/icon_facility_1_tipbox_stone.png" },
  4: { key: "entrance", name: "출입구", description: "손님이 들어오고 나가는 레스토랑의 입구예요.", icon: "assets/ui/facility/icon_facility_1_entrance_stone.png" },
  5: { key: "stage", name: "무대", description: "공연팀이 수익 버프 공연을 진행하는 공간이에요.", icon: "assets/ui/facility/icon_facility_1_stage_stone.png" },
  6: { key: "fridge", name: "냉장고", description: "레시피 연구 연출에 사용하는 주방 설비예요.", icon: "assets/ui/facility/icon_facility_1_fridge_stone.png" },
  7: { key: "sink", name: "싱크대", description: "레시피 연구 연출에 사용하는 주방 설비예요.", icon: "assets/ui/facility/icon_facility_1_sink_stone.png" },
  8: { key: "countertop", name: "도마 테이블", description: "요리사가 레시피를 연구하는 중심 설비예요.", icon: "assets/ui/facility/icon_facility_1_countertop_stone.png" },
  9: { key: "kitchenware", name: "조리도구함", description: "주방 공간을 채우는 장식 설비예요.", icon: "assets/ui/facility/icon_facility_1_kitchenware_stone.png" },
  10: { key: "lighting", name: "조명", description: "주방의 분위기를 밝혀 주는 장식 설비예요.", icon: "assets/ui/facility/icon_facility_1_lighting_stone.png" },
  11: { key: "fence", name: "울타리", description: "레스토랑의 외곽 공간을 구분하는 설비예요.", icon: "assets/ui/facility/icon_facility_1_fence_stone.png" },
  12: { key: "tree", name: "나무", description: "식당 외곽을 꾸미는 테마 장식이에요.", icon: "assets/ui/facility/icon_facility_1_tree_stone.png" },
  13: { key: "base", name: "바닥", description: "식당 전체의 바닥 테마예요.", icon: "assets/ui/facility/icon_facility_1_base_stone.png" },
  14: { key: "mailbox", name: "우체통", description: "확인하지 않은 우편을 알려 주는 설비예요.", icon: "assets/ui/facility/icon_facility_1_mailbox_none.png" },
  15: { key: "cafetable", name: "카페 테이블", description: "손님 두 마리가 음료를 마실 수 있는 카페 좌석이에요.", icon: "assets/ui/facility2/icon_facility_2_cafetable_log.png" },
  16: { key: "swing", name: "그네", description: "주문을 기다리는 손님이 잠시 이용하는 카페 놀이 시설이에요.", icon: "assets/ui/facility2/icon_facility_2_swing_log.png" },
  17: { key: "cafecounter", name: "카페 카운터", description: "손님의 음료 주문을 받고 준비하는 핵심 설비예요.", icon: "assets/ui/facility2/icon_facility_2_cafecounter_log.png" },
  18: { key: "cakeshelf", name: "케이크 진열대", description: "카페의 케이크와 디저트를 진열하는 설비예요.", icon: "assets/ui/facility2/icon_facility_2_cakeshelf_log.png" },
  19: { key: "trayreturn", name: "반납대", description: "손님이 사용한 컵과 트레이를 반납하는 설비예요.", icon: "assets/ui/facility2/icon_facility_2_trayreturn_log.png" },
  20: { key: "cafedeco", name: "카페 장식", description: "카페 공간의 분위기를 채우는 전용 장식이에요.", icon: "assets/ui/facility2/icon_facility_2_cafedeco_log.png" },
  21: { key: "exit", name: "카페 출구", description: "음료를 받은 손님이 카페를 나가는 출구예요.", icon: "assets/ui/facility2/icon_facility_2_exit_log.png" },
};

function themeFacilityIcon(row) {
  const key = FACILITY_META[row.facilityType]?.key || "table";
  const slug = THEME_SLUGS[row.facilityTheme] || "stone";
  return `assets/ui/facility/icon_facility_1_${key}_${slug}.png`;
}

function cafeThemeFacilityIcon(row) {
  const key = FACILITY_META[row.facilityType]?.key || "cafetable";
  const slug = Number(row.facilityTheme) === 102 ? "modern" : "log";
  return `assets/ui/facility2/icon_facility_2_${key}_${slug}.png`;
}

const TABLE_POSITIONS = [{ x: 240, y: 430 }, { x: 135, y: 550 }, { x: 345, y: 550 }, { x: 240, y: 670 }];
const STOVE_POSITIONS = [{ x: 145, y: 270 }, { x: 215, y: 270 }, { x: 285, y: 270 }, { x: 355, y: 270 }];

function facilityPlacement(row) {
  if (row.facilityType === 1) return { ...TABLE_POSITIONS[row.facilityGroup - 1], w: 118, h: 94 };
  if (row.facilityType === 2) return { ...STOVE_POSITIONS[row.facilityGroup - 1], w: 76, h: 76 };
  if (row.facilityType === 3) return { x: 425, y: 455, w: 72, h: 76 };
  if (row.facilityType === 4) return { x: 240, y: 830, w: 128, h: 120 };
  if (row.facilityType === 5) return { x: 70, y: 405, w: 100, h: 84 };
  if (row.facilityType === 6) return { x: 370, y: 174, w: 78, h: 94 };
  if (row.facilityType === 7) return { x: 274, y: 174, w: 78, h: 82 };
  if (row.facilityType === 8) return { x: 178, y: 174, w: 78, h: 82 };
  if (row.facilityType === 9) return { x: 82, y: 174, w: 78, h: 82 };
  if (row.facilityType === 10) return { x: row.facilityGroup === 2 ? 430 : 400, y: 112, w: 68, h: 82 };
  if (row.facilityType === 11) return { x: row.facilityGroup === 2 ? 418 : 62, y: 815, w: 118, h: 42 };
  if (row.facilityType === 14) return { x: 425, y: 770, w: 62, h: 72 };
  return { x: 240, y: 450, w: 80, h: 80 };
}

const CAFE_TABLE_POSITIONS = [{ x: 155, y: 470 }, { x: 325, y: 470 }, { x: 240, y: 620 }];

function cafeFacilityPlacement(row) {
  if (row.facilityType === 15) return { ...CAFE_TABLE_POSITIONS[row.facilityGroup - 1], w: 104, h: 88 };
  if (row.facilityType === 16) return { x: 80, y: 650, w: 82, h: 82 };
  if (row.facilityType === 17) return { x: 240, y: 245, w: 118, h: 92 };
  if (row.facilityType === 18) return { x: 355, y: 285, w: 82, h: 82 };
  if (row.facilityType === 19) return { x: 105, y: 300, w: 82, h: 82 };
  if (row.facilityType === 20) return { x: 395, y: 675, w: 76, h: 76 };
  if (row.facilityType === 21) return { x: 240, y: 820, w: 96, h: 88 };
  if (row.facilityType === 11) return { x: row.facilityGroup === 2 ? 414 : 66, y: 792, w: 100, h: 42 };
  if (row.facilityType === 10) return { x: row.facilityGroup === 2 ? 404 : 76, y: 145, w: 62, h: 76 };
  return { x: 240, y: 450, w: 80, h: 80 };
}

function seatPositions(tableRow) {
  const p = facilityPlacement(tableRow);
  return [
    { id: `${tableRow.id}-left`, tableId: tableRow.id, x: p.x - 52, y: p.y + 2, payX: p.x - 48, payY: p.y + 57 },
    { id: `${tableRow.id}-right`, tableId: tableRow.id, x: p.x + 52, y: p.y + 2, payX: p.x + 48, payY: p.y + 57 },
  ];
}

window.CHICK_CONFIG = {
  GAME_W,
  GAME_H,
  FIXED_DT,
  SAVE_KEY,
  FACILITY_META,
  facilityPlacement,
  cafeFacilityPlacement,
  seatPositions,
  recipeName,
  recipeIcon,
  THEME_NAMES,
  CORE_PROGRESSION,
  GAME_INGREDIENTS,
  THEME_CHICK_THRESHOLDS,
  GUEST_GRADES,
  CAFE_CAKE_MILESTONES,
  CAFE_THEME_PRICE_RATE,
  CAFE_THEME_MIN_PRICE,
  BASE_CAKE_INGREDIENTS,
  CAFE_THEME_NAMES,
  CAFE_THEME_CAKE_REWARDS,
  themeChickMilestones,
  allThemeChickMilestones,
  REGION_UNLOCKS,
  themeFacilityIcon,
  cafeThemeFacilityIcon,
};
})();
