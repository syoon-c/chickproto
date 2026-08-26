import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, ".tmp", "web-game-sync");
fs.mkdirSync(out, { recursive: true });
const expectedRecipeOrder = [
  "삶은 병아리콩", "병아리콩 가득", "삶은 고기", "병아리콩 팬케이크", "육전",
  "고기쌈", "도토리묵", "상큼 나뭇잎 샐러드", "열매꼬치구이", "벌레 파이", "고단백 식품", "벌레먹은 나뭇잎",
  "맑은 양파 수프", "아보카도 병아리콩 샐러드", "새싹전", "쌀밥", "병아리콩 밥",
  "후추 스테이크", "구운 옥수수", "바삭 벌레구이", "콘스프", "트러플 크림 리조또",
  "계피차", "생강차", "사과 생강차", "시나몬 사과조림", "복숭아 요거트",
  "시나몬 롤", "진저브레드", "해바라기씨 파이", "딸기 생크림 케이크", "체리 사탕", "과일 가족 모임",
  "김치전", "파김치", "된장국", "불고기", "계란볶음밥", "김치볶음밥",
  "양배추 딤섬", "가지 소고기 덮밥", "씨앗 오이 샐러드", "마늘 김치볶음", "마늘 육회",
  "치즈 간장계란밥", "연어덮밥", "대구구이", "연어구이", "연어초밥", "치즈 오믈렛",
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => typeof window.render_game_to_text === "function");
  await page.locator('[data-screen="theme"]').click();
  await page.locator("#menu-close-btn").click();

  await page.evaluate(async () => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const tables = await window.ChickData.loadTables();
    const countertop = tables.installs.find((row) => Number(row.facilityType) === 8);
    saved.installed = [...new Set([...saved.installed, countertop.id])];
    saved.ownedRecipes = Object.fromEntries(window.CHICK_CONFIG.RECIPE_PROGRESSION.map((recipe) => [
      recipe.recipeId,
      { level: 1, stack: 0, codexClaimed: true },
    ]));
    saved.tutorial = { activeId: null, seen: ["welcome", "recipe-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));

  const cards = page.locator(".recipe-catalog-card");
  if (await cards.count() !== 50) throw new Error(`요리 연구 카드 수가 50개가 아닙니다: ${await cards.count()}`);
  const text = await page.locator("#menu-content").innerText();
  for (const name of ["삶은 병아리콩", "아보카도 병아리콩 샐러드", "김치볶음밥", "양배추 딤섬", "연어초밥"]) {
    if (!text.includes(name)) throw new Error(`요리 연구 목록에 ${name}이(가) 없습니다.`);
  }
  const recipeNames = await page.locator(".recipe-catalog-copy > strong").allTextContents();
  if (JSON.stringify(recipeNames) !== JSON.stringify(expectedRecipeOrder)) {
    throw new Error(`요리 연구 카드 순서가 테마별 테스트 흐름과 다릅니다: ${JSON.stringify(recipeNames)}`);
  }
  const cardNumbers = await cards.locator(".recipe-catalog-copy > small:first-child").allTextContents();
  if (!cardNumbers[0]?.startsWith("NO.01") || !cardNumbers.at(-1)?.startsWith("NO.50")) {
    throw new Error(`요리 연구 카드 번호가 잘못되었습니다: ${cardNumbers[0]} ~ ${cardNumbers.at(-1)}`);
  }
  if (recipeNames.includes("샐러드")) throw new Error("기존 샐러드가 요리 연구 목록에 남아 있습니다.");
  const brokenImages = await page.locator(".recipe-catalog-card img").evaluateAll((images) => images
    .filter((image) => image.naturalWidth === 0)
    .map((image) => image.getAttribute("src")));
  if (brokenImages.length) throw new Error(`요리 아이콘이 깨졌습니다: ${brokenImages.join(", ")}`);
  const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  if (state.recipes.catalogTotal !== 50 || state.recipes.owned !== 50) {
    throw new Error(`요리 연구 상태가 일치하지 않습니다: ${JSON.stringify({ total: state.recipes.catalogTotal, owned: state.recipes.owned })}`);
  }
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "planning-recipe-catalog.png") });
  if (errors.length) throw new Error(`브라우저 오류: ${errors.join(" | ")}`);
  console.log("PLANNING_RECIPE_UI_OK recipes=50 owned=50 icons=ok");
} finally {
  await browser.close();
}
