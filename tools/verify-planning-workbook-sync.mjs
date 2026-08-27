import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "game-config.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context, { filename: "src/game-config.js" });

const config = context.window.CHICK_CONFIG;
const {
  THEME_NAMES,
  CORE_PROGRESSION,
  RECIPE_PROGRESSION,
  GAME_RECIPE_CATALOG,
  PROTOTYPE_RECIPE_PRICE_OVERRIDES,
} = config;

assert.equal(Object.keys(THEME_NAMES).length, 26, "기획 테마는 26개여야 합니다.");
assert.equal(CORE_PROGRESSION.length, 78, "테마당 병아리 3마리여야 합니다.");
assert.equal(RECIPE_PROGRESSION.length, 51, "프로토타입 테스트 레시피는 51개여야 합니다.");
assert.deepEqual({ ...PROTOTYPE_RECIPE_PRICE_OVERRIDES }, { 1: 35 }, "기존 레시피 가격 보정값이 남아 있습니다.");

const expectedThemeOrder = [
  "돌 테마", "나무 테마", "초록 줄무늬 테마", "블루화이트 테마", "그린핑크 테마",
  "벚꽃 테마", "한식당 테마", "채소밭 테마", "블루 땡땡이 테마", "병아리 테마",
  "식빵 테마", "이태리 테마", "캠핑 테마", "패스트푸드 테마", "양반집 테마",
  "톨게이트 테마", "옛날 사무실 테마", "목욕탕 테마", "학교 테마", "오락실 테마",
  "버섯 늪 테마", "해적선 테마", "바닷속 테마", "연금술 테마", "우주 점성술 테마", "무덤 테마",
];
assert.deepEqual(Array.from(Object.values(THEME_NAMES)), expectedThemeOrder, "테마 순서가 기획 시트와 다릅니다.");

const expectedChickOrder = [
  ["기본 병아리", "공룡 병아리", "쿠키 병아리"],
  ["나뭇잎 병아리", "도토리 병아리", "나무둥치 병아리"],
  ["아보카도 병아리", "새싹 병아리", "농부 병아리"],
  ["파란 리본 병아리", "까마귀 병아리", "파란 보닛 병아리"],
  ["복숭아 병아리", "복숭아씨 병아리", "복숭아 천사 병아리"],
  ["꽃 병아리", "꿀벌 병아리", "체리 병아리"],
  ["연어 병아리", "장독대 병아리", "프라이팬 병아리"],
  ["배추 병아리", "가지 병아리", "채소 바구니 병아리"],
  ["생쥐 병아리", "고양이 병아리", "잠옷 병아리"],
  ["둥지 병아리", "알껍질 병아리", "닭 병아리"],
  ["밀가루 포대 병아리", "잼 병아리", "식빵 병아리"],
  ["이탈리아 채소 병아리", "파스타 병아리", "피자 병아리"],
  ["캠프파이어 병아리", "캠핑 토스트 병아리", "카우보이 병아리"],
  ["콜라 병아리", "감자튀김 병아리", "햄버거 병아리"],
  ["고려청자 병아리", "엽전 병아리", "양반 병아리"],
  ["러버콘 병아리", "맨홀뚜껑 병아리", "자동차 병아리"],
  ["전화기 병아리", "컴퓨터 병아리", "회사원 병아리"],
  ["줄무늬 병아리", "바나나 병아리", "목욕 바구니 병아리"],
  ["리코더 병아리", "연필 병아리", "연필깎이 병아리"],
  ["헤드셋 병아리", "오락기 병아리", "게임 마스터 병아리"],
  ["이끼 병아리", "소세지 병아리", "개구리 병아리"],
  ["폭탄 병아리", "앵무새 병아리", "후크선장 병아리"],
  ["열대어 병아리", "복어 병아리", "상어 병아리"],
  ["마법책 병아리", "만드라고라 병아리", "마법사 할아버지 병아리"],
  ["망원경 병아리", "대마법사 병아리", "외계인 병아리"],
  ["유령 병아리", "촛불 병아리", "리퍼 병아리"],
];
const actualChickOrder = JSON.parse(JSON.stringify(Object.keys(THEME_NAMES).map((themeId) => CORE_PROGRESSION
  .filter((route) => route.themeId === Number(themeId))
  .sort((a, b) => a.slot - b.slot)
  .map((route) => route.customerName))));
assert.deepEqual(actualChickOrder, expectedChickOrder, "병아리 좌→우 순서가 기획 시트와 다릅니다.");

const expectedDropOrder = [
  [["병아리콩"], ["고기"], ["밀가루"]],
  [["나뭇잎"], ["열매", "도토리"], ["벌레", "시나몬"]],
  [["양파", "아보카도"], ["밀가루", "새싹"], ["쌀"]],
  [["밀가루", "후추"], ["소금", "옥수수"], ["트러플", "생크림"]],
  [["생강", "꿀"], ["사과", "복숭아"], ["요거트", "식초"]],
  [["설탕", "씨앗"], ["꿀"], ["체리", "딸기"]],
  [["김치", "파"], ["간장", "된장"], ["계란", "식용유"]],
  [["양배추", "파"], ["가지", "계란"], ["오이", "마늘"]],
  [["쌀", "치즈"], ["대구", "연어"], ["우유"]],
  [["감자", "양파"], ["아몬드"], ["계란"]],
  [["버터"], ["설탕", "딸기"], ["빵", "빵가루"]],
  [["식용유", "올리브"], ["파스타면", "육수"], ["토마토", "치즈"]],
  [["고추", "칠리소스"], ["설탕", "마시멜로우"], ["버섯", "소금"]],
  [["탄산", "카라멜시럽"], ["감자", "토마토"], ["빵", "오이"]],
  [["녹차"], ["떡"], ["참기름"]],
  [["당근", "옥수수"], ["버섯", "검은 쿠키"], ["식용유"]],
  [["커피콩"], ["초콜릿칩"], ["시리얼", "도토리"]],
  [["메밀", "민트"], ["우유", "바나나"], ["민트", "계란"]],
  [["마카로니"], ["당근", "후추"], ["파마산가루", "가쓰오부시"]],
  [["고구마", "감자"], ["랜덤 재료"], ["스팸", "미트볼"]],
  [["버섯"], ["소세지"], ["알로에", "연근"]],
  [["통겨자", "고추"], ["파인애플", "망고"], ["새우", "라임"]],
  [["조개", "김"], ["성게", "오징어먹물"], ["캐비어", "새우"]],
  [["라이스페이퍼"], ["무", "인삼"], ["세이지", "엘더베리"]],
  [["렌틸콩", "스타후르츠"], ["팔각", "현자의돌"], ["알로에", "젤라틴"]],
  [["생크림"], ["호박", "버터"], ["마늘", "호밀"]],
];
const actualDropOrder = JSON.parse(JSON.stringify(Object.keys(THEME_NAMES).map((themeId) => CORE_PROGRESSION
  .filter((route) => route.themeId === Number(themeId))
  .sort((a, b) => a.slot - b.slot)
  .map((route) => route.rewardIngredients.map((ingredient) => ingredient.name)))));
assert.deepEqual(actualDropOrder, expectedDropOrder, "병아리 재료 순서가 기획 시트와 다릅니다.");

for (const themeId of Object.keys(THEME_NAMES).map(Number)) {
  assert.equal(
    CORE_PROGRESSION.filter((route) => route.themeId === themeId).length,
    3,
    `${THEME_NAMES[themeId]} 병아리 수가 3마리가 아닙니다.`,
  );
}

for (const route of CORE_PROGRESSION) {
  assert.ok(route.customerName, `테마 ${route.themeId}의 병아리 이름이 없습니다.`);
  assert.ok(route.rewardIngredients.length >= 1 && route.rewardIngredients.length <= 2);
  for (const ingredient of route.rewardIngredients) {
    assert.ok(ingredient?.id, `${route.customerName}의 재료 ID가 없습니다.`);
    assert.ok(ingredient?.name, `${route.customerName}의 재료명이 없습니다.`);
  }
  const iconIndex = route.commonId - 1000;
  assert.ok(
    fs.existsSync(path.join(root, "assets", "ui", "chick", `icon_chick_${String(iconIndex).padStart(3, "0")}.png`)),
    `${route.customerName} 아이콘이 없습니다.`,
  );
}

for (const recipe of RECIPE_PROGRESSION) {
  assert.ok(recipe.recipeName);
  assert.ok(recipe.ingredientRequirements.length >= 2 && recipe.ingredientRequirements.length <= 5);
  for (const ingredient of recipe.ingredientRequirements) {
    assert.ok(ingredient?.id, `${recipe.recipeName}의 재료 ID가 없습니다.`);
  }
}

const combinationKey = (recipe) => [...recipe.ingredientNames].sort().join("|");
assert.equal(
  new Set(GAME_RECIPE_CATALOG.map(combinationKey)).size,
  GAME_RECIPE_CATALOG.length,
  "동일한 재료 조합의 레시피가 중복됩니다.",
);

const recipeByName = new Map(GAME_RECIPE_CATALOG.map((recipe) => [recipe.recipeName, recipe]));
const expectedRecipeOrder = [
  "삶은 병아리콩", "병아리콩 가득", "삶은 고기", "병아리콩 팬케이크", "육전",
  "고기쌈", "도토리묵", "상큼 나뭇잎 샐러드", "열매꼬치구이", "벌레 파이", "고단백 식품", "벌레먹은 나뭇잎",
  "맑은 양파 수프", "아보카도 병아리콩 샐러드", "새싹전", "쌀밥", "병아리콩 밥",
  "후추 스테이크", "구운 옥수수", "바삭 벌레구이", "콘스프", "트러플 크림 리조또",
  "계피차", "생강차", "사과 생강차", "시나몬 사과조림", "복숭아 요거트", "새콤 양파절임",
  "시나몬 롤", "진저브레드", "해바라기씨 파이", "딸기 생크림 케이크", "체리 사탕", "과일 가족 모임",
  "김치전", "파김치", "된장국", "불고기", "계란볶음밥", "김치볶음밥",
  "양배추 딤섬", "가지 소고기 덮밥", "씨앗 오이 샐러드", "마늘 김치볶음", "마늘 육회",
  "치즈 간장계란밥", "연어덮밥", "대구구이", "연어구이", "연어초밥", "치즈 오믈렛",
];
assert.equal(recipeByName.has("샐러드"), false, "기존 샐러드가 기획 레시피에 섞여 있습니다.");
assert.equal(GAME_RECIPE_CATALOG[0].recipeId, 1);
assert.equal(GAME_RECIPE_CATALOG[0].recipeName, "삶은 병아리콩");
assert.deepEqual(
  Array.from(GAME_RECIPE_CATALOG.map((recipe) => recipe.recipeId)),
  [...Array.from({ length: 27 }, (_, index) => index + 1), 51, ...Array.from({ length: 23 }, (_, index) => index + 28)],
);
assert.deepEqual(Array.from(GAME_RECIPE_CATALOG, (recipe) => recipe.recipeName), expectedRecipeOrder, "레시피 순서가 테마별 테스트 흐름과 다릅니다.");
assert.deepEqual(Array.from(recipeByName.get("삶은 병아리콩").ingredientNames), ["물", "병아리콩"]);
assert.deepEqual(Array.from(recipeByName.get("맑은 양파 수프").ingredientNames), ["물", "양파"]);
assert.deepEqual(Array.from(recipeByName.get("아보카도 병아리콩 샐러드").ingredientNames), ["아보카도", "병아리콩", "나뭇잎"]);
assert.deepEqual(Array.from(recipeByName.get("새싹전").ingredientNames), ["새싹", "밀가루"]);
assert.deepEqual(Array.from(recipeByName.get("양배추 딤섬").ingredientNames), ["양배추", "밀가루", "고기", "파"]);
assert.deepEqual(Array.from(recipeByName.get("가지 소고기 덮밥").ingredientNames), ["가지", "고기", "쌀", "양파", "간장"]);
assert.deepEqual(Array.from(recipeByName.get("씨앗 오이 샐러드").ingredientNames), ["씨앗", "오이", "나뭇잎"]);
assert.deepEqual(Array.from(recipeByName.get("치즈 간장계란밥").ingredientNames), ["쌀", "계란", "간장", "치즈"]);
assert.deepEqual(Array.from(recipeByName.get("김치볶음밥").ingredientNames), ["김치", "식용유", "쌀"]);
assert.deepEqual(Array.from(recipeByName.get("새콤 양파절임").ingredientNames), ["양파", "식초"]);
for (const removedRecipe of ["과카몰리", "오므라이스", "라따뚜이", "어향가지"]) {
  assert.equal(recipeByName.has(removedRecipe), false, `${removedRecipe}은(는) 51개 테스트 목록에서 제외되어야 합니다.`);
}

const obtainableNames = new Set([
  "물",
  ...CORE_PROGRESSION.flatMap((route) => route.rewardIngredients.map((ingredient) => ingredient.name)),
]);
const missingRecipeIngredients = [...new Set(
  RECIPE_PROGRESSION.flatMap((recipe) => recipe.ingredientRequirements.map((ingredient) => ingredient.name)),
)].filter((name) => !obtainableNames.has(name));
assert.deepEqual(missingRecipeIngredients, [], "획득할 수 없는 재료가 필요한 레시피가 있습니다.");

console.log(JSON.stringify({
  themes: Object.keys(THEME_NAMES).length,
  chicks: CORE_PROGRESSION.length,
  recipes: RECIPE_PROGRESSION.length,
  uniqueRecipeCombinations: new Set(GAME_RECIPE_CATALOG.map(combinationKey)).size,
  missingRecipeIngredients,
}, null, 2));
