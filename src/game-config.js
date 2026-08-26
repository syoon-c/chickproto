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
  6: "벚꽃 테마",
  7: "한식당 테마",
  8: "채소밭 테마",
  9: "블루 땡땡이 테마",
  10: "병아리 테마",
  11: "식빵 테마",
  12: "이태리 테마",
  13: "캠핑 테마",
  14: "패스트푸드 테마",
  15: "양반집 테마",
  16: "톨게이트 테마",
  17: "옛날 사무실 테마",
  18: "목욕탕 테마",
  19: "학교 테마",
  20: "오락실 테마",
  21: "버섯 늪 테마",
  22: "해적선 테마",
  23: "바닷속 테마",
  24: "연금술 테마",
  25: "우주 점성술 테마",
  26: "무덤 테마",
};

const THEME_SLUGS = {
  1: "stone", 2: "wood", 3: "greenstripe", 4: "bluewhite", 5: "greenpink",
  6: "cherryblossom", 7: "krestaurant", 8: "vegetable", 9: "bluepolkadots",
  10: "chickhouse", 11: "loafbread", 12: "italy", 13: "camping", 14: "chickdonalds",
  15: "yangbanhouse", 16: "tallgate", 17: "retrooffice", 18: "bathhouse",
  19: "elementaryschool", 20: "arcade", 21: "mushroomswamp", 22: "pirateship",
  23: "underthesea", 24: "alchemical", 25: "astrology", 26: "cemetery",
};

const THEME_CHICK_PURCHASE_REQUIREMENTS = Object.freeze({
  stone: [0, 8, 11],
  standard: [4, 8, 11],
});

const GUEST_GRADES = [
  { id: 1, name: "첫 방문", minVisits: 1 },
  { id: 2, name: "단골", minVisits: 40 },
  { id: 3, name: "최고의 단골", minVisits: 150 },
];
const GUEST_INGREDIENT_DROP_CHANCE = 0.15;
const INGREDIENT_SLOT_WEIGHTS = Object.freeze({ base: 0.7, special: 0.3 });
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
  egg: { id: 30005, name: "계란", emoji: "🥚" }, sausage: { id: 30006, name: "소세지", emoji: "🌭" },
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
  garlic: { id: 30027, name: "마늘", emoji: "🧄" }, seed: { id: 30028, name: "씨앗", emoji: "🌻" },
  salt: { id: 30029, name: "소금", emoji: "🧂" }, tofu: { id: 30030, name: "두부", emoji: "🧈" },
  acorn: { id: 30031, name: "도토리", emoji: "🌰" }, pickle: { id: 30032, name: "피클", emoji: "🥒" },
  fruit: { id: 30033, name: "과일", emoji: "🍎" }, onion: { id: 30034, name: "양파", emoji: "🧅" },
  chili: { id: 30035, name: "고추", emoji: "🌶️" }, jam: { id: 30036, name: "잼", emoji: "🍓" },
  cabbage: { id: 30037, name: "양배추", emoji: "🥬" }, yeast: { id: 30038, name: "이스트", emoji: "🍞" },
  leaf: { id: 30039, name: "나뭇잎", emoji: "🍃" }, berry: { id: 30040, name: "산딸기", emoji: "🫐" },
  fern: { id: 30041, name: "고사리", emoji: "🌿" }, insect: { id: 30042, name: "벌레", emoji: "🐛" },
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
  rambutan: { id: 30073, name: "람부탄", emoji: "🔴" }, starFruit: { id: 30074, name: "스타후르츠", emoji: "⭐" },
  ham: { id: 30075, name: "햄", emoji: "🥓" }, ketchup: { id: 30076, name: "케첩", emoji: "🍅" },
  cannedCorn: { id: 30077, name: "통조림 옥수수", emoji: "🥫" }, soda: { id: 30078, name: "탄산", emoji: "🥤" },
};

// `테마-병아리.xlsx`의 기획 시트에서 실제로 사용하는 재료 명칭이다.
// 기존 저장 데이터와 코드가 참조하는 영문 키/ID는 유지하고, 없는 재료만 고정 순서로 추가한다.
const PLANNING_INGREDIENT_NAMES = [
  "계란", "감자", "밀가루", "버섯", "설탕", "식용유", "고추", "꿀", "당근", "도토리",
  "딸기", "마늘", "민트", "버터", "빵", "새우", "생크림", "소금", "쌀", "알로에",
  "양파", "오이", "옥수수", "우유", "치즈", "토마토", "파", "후추", "가쓰오부시", "가지",
  "간장", "검은 쿠키", "고구마", "고기", "김", "김치", "나뭇잎", "녹차", "대구", "된장",
  "떡", "라이스페이퍼", "라임", "렌틸콩", "마시멜로우", "마카로니", "망고", "메밀", "무", "미트볼",
  "바나나", "식초", "벌레", "병아리콩", "복숭아", "빵가루", "사과", "새싹", "생강", "성게",
  "세이지", "소세지", "스타후르츠", "스팸", "시나몬", "시리얼", "씨앗", "아몬드", "아보카도", "양배추",
  "엘더베리", "연근", "연어", "열매", "오징어먹물", "올리브", "요거트", "육수", "인삼", "젤라틴",
  "조개", "참기름", "체리", "초콜릿칩", "칠리소스", "카라멜시럽", "캐비어", "커피콩", "탄산", "통겨자",
  "트러플", "파마산가루", "파스타면", "파인애플", "팔각", "현자의돌", "호밀", "호박", "물", "케첩",
];

const PLANNING_INGREDIENT_EMOJIS = {
  꿀: "🍯", 민트: "🌿", 새우: "🍤", 알로에: "🌵", 파: "🌱", 가쓰오부시: "🐟",
  "검은 쿠키": "🍪", 고구마: "🍠", 김치: "🥬", 녹차: "🍵", 대구: "🐟", 된장: "🫙",
  떡: "🍡", 라이스페이퍼: "🍘", 라임: "🍋‍🟩", 렌틸콩: "🫘", 마시멜로우: "🍡",
  마카로니: "🍝", 망고: "🥭", 메밀: "🌾", 무: "🥕", 미트볼: "🧆", 복숭아: "🍑",
  사과: "🍎", 새싹: "🌱", 생강: "🫚", 성게: "🟠", 세이지: "🌿", 스팸: "🥫",
  시나몬: "🪵", 시리얼: "🥣", 아몬드: "🌰", 엘더베리: "🫐", 연근: "🪷", 연어: "🐟",
  열매: "🫐", 오징어먹물: "🦑", 요거트: "🥣", 젤라틴: "🍮", 조개: "🐚", 참기름: "🫗",
  초콜릿칩: "🍫", 칠리소스: "🌶️", 카라멜시럽: "🍮", 캐비어: "🐟", 커피콩: "☕",
  통겨자: "🟡", 파마산가루: "🧀", 파인애플: "🍍", 팔각: "🌟", 현자의돌: "💎",
  호밀: "🌾", 병아리콩: "🫘",
};

const PLANNING_INGREDIENT_ALIASES = {
  계란: "egg", 감자: "potato", 밀가루: "flour", 버섯: "mushroom", 설탕: "sugar", 식용유: "oil",
  고추: "chili", 당근: "carrot", 도토리: "acorn", 딸기: "strawberry", 마늘: "garlic", 버터: "butter",
  빵: "bread", 생크림: "cream", 소금: "salt", 쌀: "rice", 양파: "onion", 오이: "cucumber",
  옥수수: "corn", 우유: "milk", 치즈: "cheese", 토마토: "tomato", 후추: "pepper", 가지: "eggplant",
  간장: "soy", 고기: "meat", 김: "seaweed", 나뭇잎: "leaf", 벌레: "insect", 빵가루: "breadcrumbs",
  소세지: "sausage", 스타후르츠: "starFruit", 씨앗: "seed", 아보카도: "avocado", 양배추: "cabbage",
  올리브: "olive", 육수: "broth", 인삼: "ginseng", 체리: "cherry", 탄산: "soda", 트러플: "truffle",
  파스타면: "pasta", 호박: "pumpkin", 물: "water", 케첩: "ketchup",
};

PLANNING_INGREDIENT_NAMES.forEach((name, index) => {
  const existingKey = PLANNING_INGREDIENT_ALIASES[name]
    || Object.keys(GAME_INGREDIENTS).find((key) => GAME_INGREDIENTS[key].name === name);
  if (existingKey) return;
  GAME_INGREDIENTS[`planning_${String(index + 1).padStart(3, "0")}`] = {
    id: 30100 + index,
    name,
    emoji: PLANNING_INGREDIENT_EMOJIS[name] || "🍽️",
  };
});

GAME_INGREDIENTS.randomPlanning = { id: 30999, name: "랜덤 재료", emoji: "🎲", random: true };

function normalizePlanningIngredientName(name) {
  const normalized = String(name || "").trim();
  if (normalized === "대파") return "파";
  if (normalized === "도토리(식용)" || normalized === "도토리(돈 이스터에그)") return "도토리";
  if (normalized === "육수(면수)") return "육수";
  if (normalized === "계란(에그플랜트)") return "계란";
  if (normalized === "검은 쿠키(오레오)") return "검은 쿠키";
  if (normalized === "재료 랜덤") return "랜덤 재료";
  return normalized;
}

function planningIngredient(name) {
  const normalized = normalizePlanningIngredientName(name);
  return Object.values(GAME_INGREDIENTS).find((ingredient) => ingredient.name === normalized) || null;
}

// `병아리-재료(기획)`의 각 병아리 열을 그대로 옮겼다. 첫 재료 70%, 두 번째 재료 30%이며
// 한 종류만 기재된 병아리는 드랍 성공 시 해당 재료를 확정 선택한다.
const CHICK_INGREDIENT_NAMES = {
  1: [["병아리콩"], ["고기"], ["밀가루"]],
  2: [["나뭇잎"], ["열매", "도토리"], ["벌레", "시나몬"]],
  3: [["양파", "아보카도"], ["밀가루", "새싹"], ["쌀"]],
  4: [["밀가루", "후추"], ["소금", "옥수수"], ["트러플", "생크림"]],
  5: [["생강", "꿀"], ["사과", "복숭아"], ["식초", "요거트"]],
  6: [["설탕", "씨앗"], ["꿀"], ["체리", "딸기"]],
  7: [["김치", "파"], ["간장", "된장"], ["계란", "식용유"]],
  8: [["양배추", "파"], ["가지", "계란"], ["오이", "마늘"]],
  9: [["쌀", "치즈"], ["대구", "연어"], ["우유"]],
  10: [["감자", "양파"], ["아몬드"], ["계란"]],
  11: [["버터"], ["설탕", "딸기"], ["빵", "빵가루"]],
  12: [["식용유", "올리브"], ["파스타면", "육수"], ["토마토", "치즈"]],
  13: [["고추", "칠리소스"], ["설탕", "마시멜로우"], ["버섯", "소금"]],
  14: [["탄산", "카라멜시럽"], ["감자", "토마토"], ["빵", "오이"]],
  15: [["녹차"], ["떡"], ["참기름"]],
  16: [["당근", "옥수수"], ["버섯", "검은 쿠키"], ["식용유"]],
  17: [["커피콩"], ["초콜릿칩"], ["시리얼", "도토리"]],
  18: [["메밀", "민트"], ["우유", "바나나"], ["민트", "계란"]],
  19: [["마카로니"], ["당근", "후추"], ["파마산가루", "가쓰오부시"]],
  20: [["고구마", "감자"], ["재료 랜덤"], ["스팸", "미트볼"]],
  21: [["버섯"], ["소세지"], ["알로에", "연근"]],
  22: [["통겨자", "고추"], ["파인애플", "망고"], ["새우", "라임"]],
  23: [["조개", "김"], ["성게", "오징어먹물"], ["캐비어", "새우"]],
  24: [["라이스페이퍼"], ["무", "인삼"], ["세이지", "엘더베리"]],
  25: [["렌틸콩", "스타후르츠"], ["팔각", "현자의돌"], ["알로에", "젤라틴"]],
  26: [["생크림"], ["호박", "버터"], ["마늘", "호밀"]],
};

// 엑셀 이미지와 유니티 `icon_chick_###` 원본을 해시 대조해 연결한 프로필이다.
const THEME_CHICK_PROFILES = {
  1: [[1001, "기본 병아리"], [1003, "공룡 병아리"], [1046, "쿠키 병아리"]],
  2: [[1048, "나뭇잎 병아리"], [1004, "도토리 병아리"], [1050, "나무둥치 병아리"]],
  3: [[1012, "아보카도 병아리"], [1024, "새싹 병아리"], [1049, "농부 병아리"]],
  4: [[1061, "파란 리본 병아리"], [1062, "까마귀 병아리"], [1063, "파란 보닛 병아리"]],
  5: [[1066, "복숭아 병아리"], [1067, "복숭아씨 병아리"], [1068, "복숭아 천사 병아리"]],
  6: [[1057, "꽃 병아리"], [1059, "꿀벌 병아리"], [1058, "체리 병아리"]],
  7: [[1081, "연어 병아리"], [1098, "장독대 병아리"], [1026, "프라이팬 병아리"]],
  8: [[1031, "배추 병아리"], [1095, "가지 병아리"], [1097, "채소 바구니 병아리"]],
  9: [[1060, "생쥐 병아리"], [1047, "고양이 병아리"], [1034, "잠옷 병아리"]],
  10: [[1069, "둥지 병아리"], [1002, "알껍질 병아리"], [1018, "닭 병아리"]],
  11: [[1085, "밀가루 포대 병아리"], [1086, "잼 병아리"], [1016, "식빵 병아리"]],
  12: [[1054, "이탈리아 채소 병아리"], [1056, "파스타 병아리"], [1055, "피자 병아리"]],
  13: [[1052, "캠프파이어 병아리"], [1051, "캠핑 토스트 병아리"], [1053, "카우보이 병아리"]],
  14: [[1019, "콜라 병아리"], [1025, "감자튀김 병아리"], [1092, "햄버거 병아리"]],
  15: [[1096, "고려청자 병아리"], [1099, "엽전 병아리"], [1100, "양반 병아리"]],
  16: [[1101, "러버콘 병아리"], [1102, "맨홀뚜껑 병아리"], [1008, "자동차 병아리"]],
  17: [[1074, "전화기 병아리"], [1075, "컴퓨터 병아리"], [1076, "회사원 병아리"]],
  18: [[1064, "줄무늬 병아리"], [1065, "바나나 병아리"], [1036, "목욕 바구니 병아리"]],
  19: [[1104, "리코더 병아리"], [1105, "연필 병아리"], [1106, "연필깎이 병아리"]],
  20: [[1090, "헤드셋 병아리"], [1091, "오락기 병아리"], [1029, "게임 마스터 병아리"]],
  21: [[1103, "이끼 병아리"], [1093, "소세지 병아리"], [1094, "개구리 병아리"]],
  22: [[1014, "폭탄 병아리"], [1107, "앵무새 병아리"], [1108, "후크선장 병아리"]],
  23: [[1083, "열대어 병아리"], [1084, "복어 병아리"], [1082, "상어 병아리"]],
  24: [[1070, "마법책 병아리"], [1071, "만드라고라 병아리"], [1072, "마법사 할아버지 병아리"]],
  25: [[1080, "망원경 병아리"], [1073, "대마법사 병아리"], [1010, "외계인 병아리"]],
  26: [[1088, "유령 병아리"], [1087, "촛불 병아리"], [1089, "리퍼 병아리"]],
};

// 초반 9개 테마에서 5~7개씩 고르게 발견하는 50종 테스트 카탈로그다.
// 엑셀 원본은 보존하고 프로토타입에서만 조합과 순서를 재구성한다.
const GAME_RECIPE_CATALOG = [
  [1, "삶은 병아리콩", ["물", "병아리콩"], 4, 35],
  [2, "병아리콩 가득", ["병아리콩", "병아리콩", "병아리콩"], 4, 65],
  [3, "삶은 고기", ["물", "고기"], 4, 50],
  [4, "병아리콩 팬케이크", ["병아리콩", "밀가루"], 36, 40],
  [5, "육전", ["밀가루", "고기"], 36, 45],
  [6, "고기쌈", ["고기", "나뭇잎"], 19, 45],
  [7, "도토리묵", ["물", "도토리"], 32, 40],
  [8, "상큼 나뭇잎 샐러드", ["열매", "나뭇잎", "도토리"], 1, 48],
  [9, "열매꼬치구이", ["열매", "고기"], 5, 55],
  [10, "벌레 파이", ["벌레", "밀가루"], 29, 45],
  [11, "고단백 식품", ["벌레", "고기"], 20, 55],
  [12, "벌레먹은 나뭇잎", ["나뭇잎", "벌레"], 1, 45],
  [13, "맑은 양파 수프", ["물", "양파"], 4, 55],
  [14, "아보카도 병아리콩 샐러드", ["아보카도", "병아리콩", "나뭇잎"], 1, 65],
  [15, "새싹전", ["새싹", "밀가루"], 36, 55],
  [16, "쌀밥", ["물", "쌀"], 25, 55],
  [17, "병아리콩 밥", ["물", "병아리콩", "쌀"], 8, 65],
  [18, "후추 스테이크", ["고기", "후추"], 20, 70],
  [19, "구운 옥수수", ["옥수수", "옥수수"], 5, 60],
  [20, "바삭 벌레구이", ["벌레", "밀가루", "소금"], 5, 70],
  [21, "콘스프", ["옥수수", "생크림", "소금"], 4, 80],
  [22, "트러플 크림 리조또", ["쌀", "생크림", "트러플"], 8, 100],
  [23, "계피차", ["물", "시나몬", "꿀"], 39, 60],
  [24, "생강차", ["물", "생강", "꿀"], 39, 60],
  [25, "사과 생강차", ["물", "사과", "생강", "꿀"], 39, 70],
  [26, "시나몬 사과조림", ["물", "사과", "시나몬", "꿀"], 34, 80],
  [27, "복숭아 요거트", ["복숭아", "꿀", "요거트"], 34, 75],
  [28, "시나몬 롤", ["밀가루", "시나몬", "설탕"], 40, 65],
  [29, "진저브레드", ["밀가루", "생강", "설탕"], 40, 75],
  [30, "해바라기씨 파이", ["씨앗", "밀가루", "설탕"], 29, 80],
  [31, "딸기 생크림 케이크", ["딸기", "생크림", "밀가루", "설탕"], 40, 100],
  [32, "체리 사탕", ["체리", "설탕"], 34, 55],
  [33, "과일 가족 모임", ["사과", "복숭아", "체리", "딸기"], 34, 110],
  [34, "김치전", ["김치", "밀가루"], 36, 65],
  [35, "파김치", ["김치", "파"], 6, 60],
  [36, "된장국", ["물", "된장"], 39, 60],
  [37, "불고기", ["고기", "간장", "양파"], 19, 95],
  [38, "계란볶음밥", ["쌀", "계란", "식용유"], 8, 75],
  [39, "김치볶음밥", ["김치", "식용유", "쌀"], 8, 80],
  [40, "양배추 딤섬", ["양배추", "밀가루", "고기", "파"], 12, 95],
  [41, "가지 소고기 덮밥", ["가지", "고기", "쌀", "양파", "간장"], 19, 110],
  [42, "씨앗 오이 샐러드", ["씨앗", "오이", "나뭇잎"], 1, 75],
  [43, "마늘 김치볶음", ["김치", "식용유", "마늘"], 19, 80],
  [44, "마늘 육회", ["고기", "계란", "파", "마늘"], 19, 105],
  [45, "치즈 간장계란밥", ["쌀", "계란", "간장", "치즈"], 22, 90],
  [46, "연어덮밥", ["쌀", "연어", "양파", "간장"], 18, 100],
  [47, "대구구이", ["대구", "소금"], 18, 80],
  [48, "연어구이", ["연어", "소금"], 18, 85],
  [49, "연어초밥", ["연어", "쌀", "식초", "설탕"], 18, 110],
  [50, "치즈 오믈렛", ["계란", "우유", "치즈", "식용유"], 22, 95],
].map(([recipeId, recipeName, ingredientNames, baseRecipeId, foodPrice]) => ({
  recipeId,
  recipeName,
  name: recipeName,
  ingredientNames,
  baseRecipeId,
  iconRecipeId: baseRecipeId,
  foodPrice,
}));

const RECIPE_PROGRESSION = GAME_RECIPE_CATALOG.map((recipe) => ({
  themeId: 0,
  slot: -1,
  threshold: 0,
  isPlanningRecipe: true,
  recipeId: recipe.recipeId,
  baseRecipeId: recipe.baseRecipeId,
  recipeName: recipe.recipeName,
  foodPrice: recipe.foodPrice,
  ingredientCount: recipe.ingredientNames.length,
  ingredientRequirements: recipe.ingredientNames.map(planningIngredient),
}));

const EARLY_RECIPE_CATALOG = GAME_RECIPE_CATALOG;

const CORE_PROGRESSION = Object.keys(THEME_NAMES).flatMap((themeIdText) => {
  const themeId = Number(themeIdText);
  return [0, 1, 2].map((slot) => {
    const profile = THEME_CHICK_PROFILES[themeId][slot];
    const rewardIngredients = CHICK_INGREDIENT_NAMES[themeId][slot].map(planningIngredient);
    const dropIngredient = rewardIngredients[0];
    const linkedRecipe = RECIPE_PROGRESSION[(themeId - 1) * 3 + slot] || null;
    const isBase = themeId === 1 && slot === 0;
    return {
      themeId,
      slot,
      purchaseRequirement: Number((themeId === 1
        ? THEME_CHICK_PURCHASE_REQUIREMENTS.stone
        : THEME_CHICK_PURCHASE_REQUIREMENTS.standard)[slot]),
      customerId: isBase ? 3 : 10000 + themeId * 10 + slot + 1,
      customerName: profile[1],
      commonId: profile[0],
      ingredientId: dropIngredient.id,
      ingredientName: dropIngredient.name,
      ingredientEmoji: dropIngredient.emoji,
      rewardIngredients,
      ingredientRequirements: linkedRecipe?.ingredientRequirements || [],
      recipeId: linkedRecipe?.recipeId || null,
      baseRecipeId: linkedRecipe?.baseRecipeId || 1,
      recipeName: linkedRecipe?.recipeName || null,
      foodPrice: linkedRecipe?.foodPrice || null,
      ingredientCount: linkedRecipe?.ingredientCount || 0,
      dropChance: GUEST_INGREDIENT_DROP_CHANCE,
    };
  });
});

// 레시피를 발견했는데 이전 음식보다 더 싸 보이지 않도록, 실제 재료 획득 시점과 조합 수를 가격 하한에 반영한다.
const PROTOTYPE_RECIPE_PRICE_OVERRIDES = Object.freeze({
  1: 35,
});

function ingredientPriceDiscoveryStage(ingredientId) {
  if (Number(ingredientId) === Number(GAME_INGREDIENTS.water.id)) return 0;
  const visitStageOffsets = [0, 1, 4];
  return CORE_PROGRESSION.reduce((earliestStage, chickRoute) => {
    const rewardIndex = chickRoute.rewardIngredients.findIndex((ingredient) => ingredient.id === Number(ingredientId));
    if (rewardIndex < 0) return earliestStage;
    const stage = (chickRoute.themeId - 1) * 9 + chickRoute.slot * 2 + visitStageOffsets[rewardIndex];
    return Math.min(earliestStage, stage);
  }, Number.POSITIVE_INFINITY);
}

function recipeDiscoveryPriceFloor(route) {
  const stages = route.ingredientRequirements.map((ingredient) => ingredientPriceDiscoveryStage(ingredient.id));
  const stage = Math.max(...stages.filter(Number.isFinite), 0);
  const ingredientCount = Math.max(2, Number(route.ingredientCount || route.ingredientRequirements.length));
  let twoIngredientFloor = 40;
  if (stage >= 1) twoIngredientFloor = 45;
  if (stage >= 5) twoIngredientFloor = 55;
  if (stage >= 9) twoIngredientFloor = 65;
  if (stage >= 14) twoIngredientFloor = 80;
  if (stage >= 19) twoIngredientFloor = 95;
  if (stage >= 27) twoIngredientFloor = 115 + Math.ceil((stage - 26) / 9) * 25;
  const rawFloor = twoIngredientFloor + Math.max(0, ingredientCount - 2) * 12;
  return Math.ceil(rawFloor / 5) * 5;
}

RECIPE_PROGRESSION.forEach((route) => {
  const override = PROTOTYPE_RECIPE_PRICE_OVERRIDES[route.recipeId];
  route.minimumFoodPrice = recipeDiscoveryPriceFloor(route);
  if (override !== undefined) {
    route.foodPrice = override;
    route.minimumFoodPrice = override;
    route.hasPrototypePriceOverride = true;
  }
});

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
  7: { key: "sink", name: "싱크대", description: "시간이 지나면 터치해 물을 받을 수 있어요.", icon: "assets/ui/facility/icon_facility_1_sink_stone.png" },
  8: { key: "countertop", name: "도마 테이블", description: "터치하면 요리 연구 화면을 열 수 있어요.", icon: "assets/ui/facility/icon_facility_1_countertop_stone.png" },
  9: { key: "kitchenware", name: "조리도구함", description: "주방 공간을 채우는 장식 설비예요.", icon: "assets/ui/facility/icon_facility_1_kitchenware_stone.png" },
  10: { key: "lighting", name: "조명", description: "주방의 분위기를 밝혀 주는 장식 설비예요.", icon: "assets/ui/facility/icon_facility_1_lighting_stone.png" },
  11: { key: "fence", name: "울타리", description: "레스토랑의 외곽 공간을 구분하는 설비예요.", icon: "assets/ui/facility/icon_facility_1_fence_stone.png" },
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
  if (row.facilityType === 7) return { x: 178, y: 174, w: 78, h: 82 };
  if (row.facilityType === 8) return { x: 274, y: 174, w: 78, h: 82 };
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
  PROTOTYPE_RECIPE_PRICE_OVERRIDES,
  EARLY_RECIPE_CATALOG,
  GAME_RECIPE_CATALOG,
  GAME_INGREDIENTS,
  THEME_CHICK_PURCHASE_REQUIREMENTS,
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
