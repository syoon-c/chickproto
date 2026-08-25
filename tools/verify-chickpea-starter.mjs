import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, ".tmp", "chickpea-starter");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => typeof window.render_game_to_text === "function");

  const ingredientIds = await page.evaluate(() => Object.fromEntries(Object.values(window.CHICK_CONFIG.GAME_INGREDIENTS)
    .filter((ingredient) => ["병아리콩", "물", "나뭇잎"].includes(ingredient.name))
    .map((ingredient) => [ingredient.name, ingredient.id])));
  let current = await state();
  if (current.recipes.catalogTotal !== 54
    || current.recipes.owned !== 1
    || current.recipes.levels[1] !== 1
    || current.recipes.prices[1] !== 35
    || current.progression.ingredients[ingredientIds.병아리콩] !== 1
    || current.progression.ingredients[ingredientIds.물] !== 1
    || current.progression.ingredients[ingredientIds.나뭇잎]
    || current.progression.unlockedChickRoutes[0]?.recipeName !== "삶은 병아리콩") {
    throw new Error(`초기 병아리콩 요리 상태가 다릅니다: ${JSON.stringify(current.recipes)}`);
  }

  await page.locator('[data-screen="theme"]').click();
  await page.locator("#menu-close-btn").click();
  await page.evaluate((leafId) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.version = 22;
    saved.crafting.ingredients = { [leafId]: 2 };
    saved.crafting.starterIngredientsGranted = true;
    saved.totalResearchCount = 0;
    saved.metrics.recipeResearchAttempts = 0;
    saved.metrics.ingredientsFound = 0;
    localStorage.setItem(key, JSON.stringify(saved));
  }, ingredientIds.나뭇잎);
  await page.reload({ waitUntil: "load" });
  current = await state();
  if (current.progression.ingredients[ingredientIds.병아리콩] !== 1
    || current.progression.ingredients[ingredientIds.물] !== 1
    || current.progression.ingredients[ingredientIds.나뭇잎]) {
    throw new Error(`기존 초기 저장의 시작 재료가 교체되지 않았습니다: ${JSON.stringify(current.progression.ingredients)}`);
  }
  await page.evaluate(async () => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const tables = await window.ChickData.loadTables();
    const countertop = tables.installs.find((row) => Number(row.facilityType) === 8);
    saved.installed = [...new Set([...saved.installed, countertop.id])];
    saved.tutorial = { activeId: null, seen: ["welcome", "recipe-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();

  const card = page.locator('.recipe-catalog-card.is-discovered[data-recipe-id="1"]');
  const initialCardOrder = await page.locator(".recipe-catalog-card").evaluateAll((cards) => cards.slice(0, 5).map((item) => item.dataset.recipeId));
  if (JSON.stringify(initialCardOrder) !== JSON.stringify(["1", "2", "3", "4", "5"])) {
    throw new Error("삶은 병아리콩이 요리 연구 목록의 첫 번째 카드가 아닙니다.");
  }
  if (!(await card.innerText()).includes("삶은 병아리콩")) throw new Error("기본 요리 카드가 삶은 병아리콩이 아닙니다.");
  const requirements = await card.locator(".recipe-catalog-formula span").evaluateAll((items) => items.map((item) => item.getAttribute("title")));
  if (!requirements.some((text) => text?.startsWith("물 1/1"))
    || !requirements.some((text) => text?.startsWith("병아리콩 1/1"))) {
    throw new Error(`기본 요리 재료 표시가 다릅니다: ${JSON.stringify(requirements)}`);
  }
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "01-boiled-chickpeas-starter.png") });

  await card.locator('[data-action="manual-upgrade"]').click();
  current = await state();
  if (current.recipes.levels[1] !== 2
    || current.progression.ingredients[ingredientIds.병아리콩]
    || current.progression.ingredients[ingredientIds.물]
    || current.ingredientStorage.totalItems !== 0) {
    throw new Error(`기본 재료 소비 또는 레벨업이 다릅니다: ${JSON.stringify(current.recipes)}`);
  }
  if (!(await page.locator(".recipe-upgrade-card").innerText()).includes("삶은 병아리콩")) {
    throw new Error("삶은 병아리콩 레벨업 연출이 표시되지 않았습니다.");
  }
  const upgradedCardOrder = await page.locator(".recipe-catalog-card").evaluateAll((cards) => cards.slice(0, 5).map((item) => item.dataset.recipeId));
  if (JSON.stringify(upgradedCardOrder) !== JSON.stringify(initialCardOrder)) {
    throw new Error(`레벨업 후 요리 카드 순서가 바뀌었습니다: ${JSON.stringify(upgradedCardOrder)}`);
  }
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "02-boiled-chickpeas-upgrade.png") });
  if (errors.length) throw new Error(`브라우저 오류: ${errors.join(" | ")}`);
  console.log("CHICKPEA_STARTER_OK recipes=54 base=삶은병아리콩 ingredients=병아리콩1+물1 upgrade=1->2");
} finally {
  await browser.close();
}
