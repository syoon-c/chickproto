(function () {
"use strict";

const GAME_W = 480;
const GAME_H = 900;
const FIXED_DT = 1 / 60;
const SAVE_KEY = "chick-bistro-planning-prototype-v2";
const GUEST_MEAL_DURATION_SECONDS = 7;

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
  { id: 2, name: "단골", minVisits: 40, primaryCount: 1, secondaryCount: 1, rareCount: 0 },
  { id: 3, name: "최고의 단골", minVisits: 300, primaryCount: 1, secondaryCount: 1, rareCount: 1 },
];
const GUEST_INGREDIENT_DROP_CHANCE = 0.15;
const INGREDIENT_SLOT_WEIGHTS = Object.freeze({ primary: 0.5, secondary: 0.3, special: 0.2 });
const INGREDIENT_STORAGE_INITIAL_CAPACITY = 20;
const INGREDIENT_STORAGE_EXPANSION_AMOUNT = 5;
const INGREDIENT_STORAGE_EXPANSION_GEM_COST = 10;
const RECIPE_LEVEL_PRICE_BONUS = 0.10;

const GREEN_STRIPE_THEME_PRICE_MULTIPLIER = 10;
const RESTAURANT_THEME_PRICE_MULTIPLIER = 2;

function restaurantThemePartPrice(themeId, woodPartPrice) {
  const numericThemeId = Number(themeId);
  const woodPrice = Number(woodPartPrice || 0);
  if (numericThemeId <= 1) return 0;
  if (numericThemeId === 2) return Math.round(woodPrice);
  const greenStripePrice = woodPrice * GREEN_STRIPE_THEME_PRICE_MULTIPLIER;
  return Math.round(greenStripePrice * RESTAURANT_THEME_PRICE_MULTIPLIER ** (numericThemeId - 3));
}

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
  leaf: { id: 30039, name: "나뭇잎", emoji: "🍃" }, berry: { id: 30040, name: "산딸기", emoji: "🫐" },
  fern: { id: 30041, name: "고사리", emoji: "🌿" }, insect: { id: 30042, name: "식용 벌레", emoji: "🐛" },
  corn: { id: 30043, name: "옥수수", emoji: "🌽" }, cucumber: { id: 30044, name: "오이", emoji: "🥒" },
  broccoli: { id: 30045, name: "브로콜리", emoji: "🥦" }, avocado: { id: 30046, name: "아보카도", emoji: "🥑" },
  sugar: { id: 30047, name: "설탕", emoji: "🧂" }, beef: { id: 30048, name: "소고기", emoji: "🥩" },
  pork: { id: 30049, name: "돼지고기", emoji: "🥓" }, lamb: { id: 30050, name: "양고기", emoji: "🍖" },
  parsley: { id: 30051, name: "파슬리", emoji: "🌿" }, basil: { id: 30052, name: "바질", emoji: "🌿" },
  paprika: { id: 30053, name: "파프리카", emoji: "🫑" }, rosemary: { id: 30054, name: "로즈마리", emoji: "🌿" },
  mushroom: { id: 30055, name: "버섯", emoji: "🍄" }, eggplant: { id: 30056, name: "가지", emoji: "🍆" },
  zucchini: { id: 30057, name: "애호박", emoji: "🥒" }, pumpkin: { id: 30058, name: "호박", emoji: "🎃" },
  pasta: { id: 30059, name: "파스타면", emoji: "🍝" }, olive: { id: 30060, name: "올리브", emoji: "🫒" },
  cherry: { id: 30061, name: "체리", emoji: "🍒" }, banana: { id: 30062, name: "바나나", emoji: "🍌" },
  strawberry: { id: 30063, name: "딸기", emoji: "🍓" }, apple: { id: 30064, name: "사과", emoji: "🍎" },
  bakingPowder: { id: 30065, name: "베이킹파우더", emoji: "🥄" }, bean: { id: 30066, name: "콩", emoji: "🫘" },
  water: { id: 30067, name: "물", emoji: "💧" }, vinegar: { id: 30068, name: "식초", emoji: "🫗" },
  ginseng: { id: 30069, name: "인삼", emoji: "🫚" }, mandrake: { id: 30070, name: "만드라고라", emoji: "🌱" },
  mulberry: { id: 30071, name: "오디", emoji: "🫐" }, dragonFruit: { id: 30072, name: "용과", emoji: "🐉" },
  rambutan: { id: 30073, name: "람부탄", emoji: "🔴" }, starFruit: { id: 30074, name: "스타프루트", emoji: "⭐" },
  ham: { id: 30075, name: "햄", emoji: "🥓" }, ketchup: { id: 30076, name: "케첩", emoji: "🍅" },
  cannedCorn: { id: 30077, name: "통조림 옥수수", emoji: "🥫" }, soda: { id: 30078, name: "탄산음료", emoji: "🥤" },
};

// 첫 테마는 ABC/DEF/GHI, 이후 테마는 기존 재료와 신규 3개만 교차 배치한다.
const THEME_NEW_INGREDIENT_KEYS = {
  1: ["leaf", "lettuce", "tomato", "mushroom", "flour", "meat", "bread", "egg", "butter"],
  2: ["rice", "oil", "mixedVeg"],
  3: ["potato", "cheese", "sausage"],
  4: ["broth", "noodles", "seaweed"],
  5: ["tortilla", "beef", "chili"],
  6: ["breadcrumbs", "pork", "cabbage"],
  7: ["pasta", "garlic", "paprika"],
  8: ["fish", "soy", "vinegar"],
  9: ["carrot", "sugar", "avocado"],
  10: ["milk", "cream", "seed"],
  11: ["tofu", "acorn", "corn"],
  12: ["ham", "ketchup", "fruit"],
  13: ["curry", "onion", "water"],
  14: ["strawberry", "apple", "truffle"],
  15: ["pepper", "rosemary", "salt"],
};

// 사용 레시피가 많은 재료를 후속 병아리의 주·보조 재료로 다시 공급한다.
// 각 배열은 slot0의 3종, slot1의 보조 1종, slot2의 주·보조 2종 순서다.
const THEME_REPEAT_INGREDIENT_KEYS = {
  2: ["egg", "butter", "meat", "bread", "tomato", "flour"],
  3: ["oil", "mixedVeg", "rice", "egg", "tomato", "butter"],
  4: ["cheese", "rice", "egg", "bread", "mushroom", "mixedVeg"],
  5: ["broth", "egg", "rice", "noodles", "sausage", "seaweed"],
  6: ["beef", "chili", "butter", "flour", "oil", "rice"],
  7: ["pork", "cabbage", "bread", "egg", "potato", "beef"],
  8: ["garlic", "butter", "bread", "egg", "rice", "tomato"],
  9: ["vinegar", "soy", "lettuce", "flour", "mixedVeg", "bread"],
  10: ["avocado", "broth", "leaf", "egg", "cheese", "butter"],
  11: ["cream", "seed", "milk", "egg", "oil", "tomato"],
  12: ["corn", "milk", "rice", "bread", "flour", "beef"],
  13: ["fruit", "ketchup", "acorn", "paprika", "rice", "egg"],
  14: ["onion", "water", "broth", "rice", "butter", "cream"],
  15: ["truffle", "apple", "leaf", "meat", "onion", "pork"],
};

// 레시피는 테마가 아니라 재료 조합만으로 이해할 수 있도록 직접 정의한다.
const GAME_RECIPE_CATALOG = [
  { name: RECIPE_NAMES[0], keys: ["leaf"], count: 2, iconRecipeId: 1 },
  // 원본 아이콘 레시피(360원)의 가격은 초반 2재료 요리와 맞지 않아 프로토타입용으로 분리한다.
  { name: "버섯전", keys: ["flour", "mushroom"], iconRecipeId: 36, foodPrice: 38 },
  { name: RECIPE_NAMES[1], keys: ["bread", "leaf"], iconRecipeId: 2 },
  { name: RECIPE_NAMES[2], keys: ["bread", "sausage", "ketchup"], iconRecipeId: 3 },
  { name: RECIPE_NAMES[3], keys: ["broth", "mixedVeg"], iconRecipeId: 4 },
  { name: RECIPE_NAMES[4], keys: ["meat", "onion", "paprika"], iconRecipeId: 5 },
  { name: RECIPE_NAMES[5], keys: ["rice", "seaweed", "mixedVeg", "egg"], iconRecipeId: 6 },
  { name: RECIPE_NAMES[6], keys: ["flour", "tomato", "cheese", "oil"], iconRecipeId: 7 },
  { name: RECIPE_NAMES[7], keys: ["rice", "oil", "mixedVeg", "egg"], iconRecipeId: 8 },
  { name: RECIPE_NAMES[8], keys: ["bread", "beef", "cheese", "tomato", "onion"], iconRecipeId: 9 },
  { name: RECIPE_NAMES[9], keys: ["potato", "oil"], iconRecipeId: 10 },
  { name: RECIPE_NAMES[10], keys: ["rice", "mixedVeg", "egg", "beef", "soy"], iconRecipeId: 11 },
  { name: RECIPE_NAMES[11], keys: ["flour", "pork", "cabbage"], iconRecipeId: 12 },
  { name: RECIPE_NAMES[12], keys: ["pasta", "tomato", "garlic", "oil"], iconRecipeId: 13 },
  { name: RECIPE_NAMES[13], keys: ["tortilla", "beef", "tomato", "cheese", "chili"], iconRecipeId: 14 },
  { name: RECIPE_NAMES[14], keys: ["noodles", "broth", "egg", "pork", "seaweed"], iconRecipeId: 15 },
  { name: RECIPE_NAMES[15], keys: ["pork", "breadcrumbs", "oil", "cabbage"], iconRecipeId: 16 },
  { name: RECIPE_NAMES[16], keys: ["rice", "curry", "onion", "meat"], iconRecipeId: 17 },
  { name: RECIPE_NAMES[17], keys: ["rice", "fish", "vinegar", "avocado"], iconRecipeId: 18 },
  { name: RECIPE_NAMES[18], keys: ["beef", "soy", "onion", "rice"], iconRecipeId: 19 },
  { name: RECIPE_NAMES[19], keys: ["beef", "rosemary", "butter", "garlic", "pepper"], iconRecipeId: 20 },
  { name: RECIPE_NAMES[20], keys: ["egg", "oil"], iconRecipeId: 21 },
  { name: RECIPE_NAMES[21], keys: ["egg", "rice", "ketchup"], iconRecipeId: 22 },
  { name: RECIPE_NAMES[22], keys: ["meat", "pepper", "butter"], iconRecipeId: 23 },
  { name: RECIPE_NAMES[23], keys: ["rice", "sausage", "mixedVeg"], iconRecipeId: 24 },
  { name: RECIPE_NAMES[24], keys: ["rice", "seaweed"], iconRecipeId: 25 },
  { name: RECIPE_NAMES[25], keys: ["carrot", "vinegar", "sugar"], iconRecipeId: 26 },
  { name: RECIPE_NAMES[26], keys: ["flour", "mushroom", "cream"], iconRecipeId: 27 },
  { name: RECIPE_NAMES[27], keys: ["egg", "broth"], iconRecipeId: 28 },
  { name: RECIPE_NAMES[28], keys: ["seed", "flour", "butter"], iconRecipeId: 29 },
  { name: RECIPE_NAMES[29], keys: ["potato", "oil", "salt"], iconRecipeId: 30 },
  { name: RECIPE_NAMES[30], keys: ["rice", "tofu", "vinegar"], iconRecipeId: 31 },
  { name: RECIPE_NAMES[31], keys: ["acorn", "water"], iconRecipeId: 32 },
  { name: RECIPE_NAMES[32], keys: ["bread", "beef", "truffle", "cheese", "onion"], iconRecipeId: 33 },
  { name: RECIPE_NAMES[33], keys: ["fruit", "strawberry", "apple", "cream"], iconRecipeId: 34 },
  { name: RECIPE_NAMES[34], keys: ["egg", "rice", "water"], iconRecipeId: 35 },
  { name: RECIPE_NAMES[35], keys: ["meat", "potato", "broth", "onion", "carrot"], iconRecipeId: 36 },
  { name: RECIPE_NAMES[36], keys: ["noodles", "egg", "chili"], iconRecipeId: 37 },
  { name: RECIPE_NAMES[37], keys: ["bread", "egg", "milk"], iconRecipeId: 38 },
  { name: RECIPE_NAMES[38], keys: ["broth", "tofu", "pepper"], iconRecipeId: 39 },
  { name: RECIPE_NAMES[39], keys: ["flour", "egg", "milk", "cream"], iconRecipeId: 40 },
  { name: "콘수프", keys: ["corn", "milk", "butter"], iconRecipeId: 4 },
  { name: "햄 샌드위치", keys: ["bread", "ham", "cheese"], iconRecipeId: 2 },
  { name: "트러플 크림 파스타", keys: ["pasta", "truffle", "cream", "garlic", "butter"], iconRecipeId: 13 },
  { name: "아보카도 샐러드", keys: ["avocado", "lettuce", "tomato", "oil"], iconRecipeId: 1 },
];

function themeRewardIngredientKeys(themeId, slot) {
  if (Number(themeId) === 3) {
    return [
      ["leaf", "oil", "rice"],
      ["potato", "leaf", "cheese"],
      ["tomato", "leaf", "sausage"],
    ][Number(slot)];
  }
  const current = THEME_NEW_INGREDIENT_KEYS[themeId];
  if (themeId === 1) return current.slice(slot * 3, slot * 3 + 3);
  const repeated = THEME_REPEAT_INGREDIENT_KEYS[themeId];
  if (slot === 0) return repeated.slice(0, 3);
  if (slot === 1) return [current[0], repeated[3], current[1]];
  return [repeated[4], repeated[5], current[2]];
}

const THEME_CHICK_PROFILES = {
  1: [[1001, "기본 병아리"], [1003, "공룡 병아리"], [1002, "알껍질 병아리"]],
  2: [[1004, "도토리 병아리"], [1022, "난쟁이 병아리"], [1040, "광부 병아리"]],
  3: [[1012, "아보카도 병아리"], [1031, "양배추 병아리"], [1017, "선인장 병아리"]],
  4: [[1006, "눈사람 병아리"], [1032, "간호사 병아리"], [1044, "졸업생 병아리"]],
  5: [[1018, "닭 병아리"], [1027, "핫도그 병아리"], [1026, "프라이팬 병아리"]],
  6: [[1020, "카우보이 병아리"], [1039, "바이킹 병아리"], [1014, "캠프파이어 병아리"]],
  7: [[1034, "잠옷 병아리"], [1029, "건물주 병아리"], [1045, "유치원생 병아리"]],
  8: [[1035, "빨간 재킷 병아리"], [1028, "왕 병아리"], [1042, "미용실 병아리"]],
  9: [[1023, "꽃 병아리"], [1024, "화분 병아리"], [1005, "사과 병아리"]],
  10: [[1016, "식빵 병아리"], [1015, "상자 병아리"], [1013, "바나나 병아리"]],
  11: [[1033, "오니기리 병아리"], [1021, "튀김 병아리"], [1030, "근육 병아리"]],
  12: [[1008, "자동차 병아리"], [1019, "콜라 병아리"], [1025, "감자튀김 병아리"]],
  13: [[1043, "마법사 병아리"], [1038, "유니콘 병아리"], [1009, "키위 병아리"]],
  14: [[1036, "사우나 병아리"], [1007, "여름 병아리"], [1041, "라멘 장인 병아리"]],
  15: [[1010, "외계인 병아리"], [1011, "우주비행사 병아리"], [1037, "초밥 병아리"]],
};

const CORE_PROGRESSION = Object.keys(THEME_NAMES).flatMap((themeIdText) => {
  const themeId = Number(themeIdText);
  return THEME_CHICK_THRESHOLDS.map((threshold, slot) => {
    const globalIndex = (themeId - 1) * 3 + slot;
    const catalogRecipe = GAME_RECIPE_CATALOG[globalIndex];
    const profile = THEME_CHICK_PROFILES[themeId][slot];
    const rewardIngredients = themeRewardIngredientKeys(themeId, slot).map((key) => GAME_INGREDIENTS[key]);
    const dropIngredient = rewardIngredients[0];
    const ingredientRequirements = catalogRecipe.keys.map((key) => GAME_INGREDIENTS[key]);
    const isBase = themeId === 1 && slot === 0;
    const isStoneCompletion = themeId === 1 && slot === 2;
    return {
      themeId,
      slot,
      threshold,
      customerId: isBase ? 3 : 10000 + themeId * 10 + slot + 1,
      customerName: profile[1],
      commonId: profile[0],
      ingredientId: dropIngredient.id,
      ingredientName: dropIngredient.name,
      ingredientEmoji: dropIngredient.emoji,
      rewardIngredients,
      ingredientRequirements,
      recipeId: isBase ? 1 : isStoneCompletion ? 2 : 10000 + globalIndex,
      baseRecipeId: catalogRecipe.iconRecipeId,
      recipeName: catalogRecipe.name,
      foodPrice: catalogRecipe.foodPrice,
      ingredientCount: Number(catalogRecipe.count || catalogRecipe.keys.length),
      dropChance: GUEST_INGREDIENT_DROP_CHANCE,
    };
  });
});

// 병아리 해금과 무관하게 초반 재료를 조합해 발견하는 저가 레시피다.
const EARLY_RECIPE_CATALOG = [
  { recipeId: 20001, recipeName: "버터 토스트", keys: ["bread", "butter"], baseRecipeId: 38, foodPrice: 35 },
  { recipeId: 20002, recipeName: "토마토 샌드위치", keys: ["bread", "tomato"], baseRecipeId: 2, foodPrice: 40 },
  { recipeId: 20003, recipeName: "달걀 샌드위치", keys: ["bread", "egg"], baseRecipeId: 2, foodPrice: 42 },
  { recipeId: 20004, recipeName: "토마토 달걀볶음", keys: ["tomato", "egg"], baseRecipeId: 21, foodPrice: 38 },
  { recipeId: 20005, recipeName: "버터빵", keys: ["flour", "egg", "butter"], baseRecipeId: 40, foodPrice: 50 },
  { recipeId: 20006, recipeName: "마늘 버섯볶음", keys: ["garlic", "mushroom", "oil"], baseRecipeId: 8, foodPrice: 58 },
  { recipeId: 20007, recipeName: "양배추 돼지고기볶음", keys: ["cabbage", "pork", "soy"], baseRecipeId: 19, foodPrice: 64 },
  { recipeId: 20008, recipeName: "콘치즈", keys: ["corn", "cheese", "butter"], baseRecipeId: 7, foodPrice: 62 },
  { recipeId: 20009, recipeName: "씨앗 샐러드", keys: ["leaf", "seed"], baseRecipeId: 1, foodPrice: 48 },
  { recipeId: 20010, recipeName: "당근 크림수프", keys: ["carrot", "broth", "cream"], baseRecipeId: 4, foodPrice: 66 },
  { recipeId: 20011, recipeName: "아보카도 에그", keys: ["avocado", "egg"], baseRecipeId: 21, foodPrice: 56 },
  { recipeId: 20012, recipeName: "과일 우유", keys: ["fruit", "milk"], baseRecipeId: 34, foodPrice: 52 },
  { recipeId: 20013, recipeName: "매콤 치즈 감자", keys: ["potato", "chili", "cheese"], baseRecipeId: 10, foodPrice: 60 },
  { recipeId: 20014, recipeName: "새싹 샐러드", keys: ["leaf", "lettuce"], baseRecipeId: 1, foodPrice: 32 },
  { recipeId: 20015, recipeName: "양상추 샌드위치", keys: ["bread", "lettuce"], baseRecipeId: 2, foodPrice: 36 },
  { recipeId: 20016, recipeName: "버섯 토스트", keys: ["bread", "mushroom"], baseRecipeId: 38, foodPrice: 38 },
  { recipeId: 20017, recipeName: "달걀밥", keys: ["rice", "egg"], baseRecipeId: 22, foodPrice: 40 },
  { recipeId: 20018, recipeName: "버터 라이스", keys: ["rice", "butter"], baseRecipeId: 8, foodPrice: 38 },
  { recipeId: 20019, recipeName: "토마토 리조또", keys: ["rice", "tomato", "butter"], baseRecipeId: 8, foodPrice: 50 },
];

const EARLY_RECIPE_PROGRESSION = EARLY_RECIPE_CATALOG.map((recipe) => ({
  themeId: 0,
  slot: -1,
  threshold: 0,
  isEarlyRecipe: true,
  recipeId: recipe.recipeId,
  baseRecipeId: recipe.baseRecipeId,
  recipeName: recipe.recipeName,
  foodPrice: recipe.foodPrice,
  ingredientCount: recipe.keys.length,
  ingredientRequirements: recipe.keys.map((key) => GAME_INGREDIENTS[key]),
}));

const RECIPE_PROGRESSION = [...CORE_PROGRESSION, ...EARLY_RECIPE_PROGRESSION];

function themeChickMilestones(themeId) {
  return CORE_PROGRESSION.filter((entry) => entry.themeId === Number(themeId));
}

function allThemeChickMilestones() {
  return Object.keys(THEME_NAMES).flatMap((themeId) => themeChickMilestones(Number(themeId)));
}

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
  6: { key: "fridge", name: "냉장고", description: "터치하면 보유한 재료를 확인할 수 있어요.", icon: "assets/ui/facility/icon_facility_1_fridge_stone.png" },
  7: { key: "sink", name: "싱크대", description: "레시피 연구 연출에 사용하는 주방 설비예요.", icon: "assets/ui/facility/icon_facility_1_sink_stone.png" },
  8: { key: "countertop", name: "도마 테이블", description: "요리사가 레시피를 연구하는 중심 설비예요.", icon: "assets/ui/facility/icon_facility_1_countertop_stone.png" },
  9: { key: "kitchenware", name: "조리도구함", description: "주방 공간을 채우는 장식 설비예요.", icon: "assets/ui/facility/icon_facility_1_kitchenware_stone.png" },
  10: { key: "lighting", name: "조명", description: "주방의 분위기를 밝혀 주는 장식 설비예요.", icon: "assets/ui/facility/icon_facility_1_lighting_stone.png" },
  11: { key: "fence", name: "울타리", description: "레스토랑의 외곽 공간을 구분하는 설비예요.", icon: "assets/ui/facility/icon_facility_1_fence_stone.png" },
  12: { key: "tree", name: "나무", description: "식당 외곽을 꾸미는 테마 장식이에요.", icon: "assets/ui/facility/icon_facility_1_tree_stone.png" },
  13: { key: "base", name: "바닥", description: "식당 전체의 바닥 테마예요.", icon: "assets/ui/facility/icon_facility_1_base_stone.png" },
  14: { key: "mailbox", name: "우체통", description: "확인하지 않은 우편을 알려 주는 설비예요.", icon: "assets/ui/facility/icon_facility_1_mailbox_none.png" },
};

function themeFacilityIcon(row) {
  const key = FACILITY_META[row.facilityType]?.key || "table";
  const slug = THEME_SLUGS[row.facilityTheme] || "stone";
  return `assets/ui/facility/icon_facility_1_${key}_${slug}.png`;
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
  GUEST_MEAL_DURATION_SECONDS,
  FACILITY_META,
  facilityPlacement,
  seatPositions,
  recipeName,
  recipeIcon,
  RECIPE_NAMES,
  THEME_NAMES,
  CORE_PROGRESSION,
  RECIPE_PROGRESSION,
  EARLY_RECIPE_CATALOG,
  GAME_RECIPE_CATALOG,
  GAME_INGREDIENTS,
  THEME_CHICK_THRESHOLDS,
  GUEST_GRADES,
  GUEST_INGREDIENT_DROP_CHANCE,
  INGREDIENT_SLOT_WEIGHTS,
  INGREDIENT_STORAGE_INITIAL_CAPACITY,
  INGREDIENT_STORAGE_EXPANSION_AMOUNT,
  INGREDIENT_STORAGE_EXPANSION_GEM_COST,
  RECIPE_LEVEL_PRICE_BONUS,
  GREEN_STRIPE_THEME_PRICE_MULTIPLIER,
  RESTAURANT_THEME_PRICE_MULTIPLIER,
  restaurantThemePartPrice,
  themeChickMilestones,
  allThemeChickMilestones,
  themeFacilityIcon,
};
})();
