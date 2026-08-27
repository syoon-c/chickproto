import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, "src", "game-config.js"), "utf8"), { filename: "src/game-config.js" });

const { CORE_PROGRESSION, GAME_INGREDIENTS, RECIPE_PROGRESSION } = globalThis.CHICK_CONFIG;
const angel = CORE_PROGRESSION.find((route) => route.themeId === 5 && route.slot === 2);
const pickle = RECIPE_PROGRESSION.find((route) => route.recipeId === 51);
if (JSON.stringify(angel.rewardIngredients.map((ingredient) => ingredient.name)) !== JSON.stringify(["요거트", "식초"])) {
  throw new Error(`복숭아 천사 병아리 재료 순서가 잘못되었습니다: ${JSON.stringify(angel.rewardIngredients)}`);
}
if (pickle.recipeName !== "새콤 양파절임"
  || JSON.stringify(pickle.ingredientRequirements.map((ingredient) => ingredient.name)) !== JSON.stringify(["양파", "식초"])) {
  throw new Error(`식초 레시피가 잘못되었습니다: ${JSON.stringify(pickle)}`);
}

const ingredientByName = (name) => Object.values(GAME_INGREDIENTS).find((ingredient) => ingredient.name === name);
const yogurt = ingredientByName("요거트");
const vinegar = ingredientByName("식초");
const onion = ingredientByName("양파");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "yogurt-vinegar-balance");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  await page.evaluate(({ route }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const fridge = window.CHICK_TABLE_SOURCE.InstallFacility.find((row) => Number(row.areaType) === 1 && Number(row.facilityType) === 6);
    saved.installed = [...new Set([...saved.installed, fridge.id])];
    saved.rng = 20260827;
    saved.guests = Array.from({ length: 600 }, (_, index) => ({
      id: `vinegar-test-${index}`,
      customerId: route.customerId,
      commonId: route.commonId,
      customerName: route.customerName,
      state: "eating",
      seatId: `vinegar-seat-${index}`,
      tableId: 0,
      x: 240,
      y: 430,
      targetX: 240,
      targetY: 900,
      recipeId: 1,
      visitNumber: 1,
      wait: 0,
      stateTime: 7.1,
      mood: "satisfied",
      bob: 0,
    }));
    saved.orders = [];
    saved.cooking = [];
    saved.payments = [];
    saved.ingredientDrops = [];
    saved.metrics.ingredientDropAttempts = 0;
    saved.metrics.ingredientDropMisses = 0;
    localStorage.setItem(key, JSON.stringify(saved));
  }, { route: angel });
  await page.reload({ waitUntil: "load" });
  await page.evaluate(() => window.advanceTime(34));
  let current = await state();
  const drops = current.ingredientDrops;
  const yogurtDrops = drops.filter((drop) => drop.ingredientId === yogurt.id).length;
  const vinegarDrops = drops.filter((drop) => drop.ingredientId === vinegar.id).length;
  const yogurtRatio = yogurtDrops / Math.max(1, drops.length);
  if (current.metrics.ingredientDropAttempts !== 600 || drops.length < 65 || drops.length > 115
    || yogurtDrops + vinegarDrops !== drops.length || yogurtRatio < 0.58 || yogurtRatio > 0.82
    || drops.some((drop) => drop.totalCount !== 1 || drop.items.length !== 1)) {
    throw new Error(`요거트/식초 드랍 검증 실패: ${JSON.stringify({ attempts: current.metrics.ingredientDropAttempts, drops: drops.length, yogurtDrops, vinegarDrops, yogurtRatio })}`);
  }

  await page.evaluate(({ onionId, vinegarId }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const countertop = window.CHICK_TABLE_SOURCE.InstallFacility.find((row) => Number(row.areaType) === 1 && Number(row.facilityType) === 8);
    saved.installed = [...new Set([...saved.installed, countertop.id])];
    saved.guests = [];
    saved.orders = [];
    saved.cooking = [];
    saved.payments = [];
    saved.ingredientDrops = [];
    saved.crafting.ingredients = { [onionId]: 1, [vinegarId]: 1 };
    saved.crafting.selected = [];
    saved.tutorial = { activeId: null, seen: ["welcome", "recipe-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
  }, { onionId: onion.id, vinegarId: vinegar.id });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-action="open-ingredient-picker"]').click();
  await page.locator(`[data-action="select-ingredient"][data-id="${onion.id}"]`).click();
  await page.locator(`[data-action="select-ingredient"][data-id="${vinegar.id}"]`).click();
  await page.screenshot({ path: path.join(out, "01-onion-vinegar-in-bowl.png"), fullPage: true });
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  current = await state();
  if (current.recipes.levels[51] !== 1
    || current.recipes.reveal?.recipeId !== 51
    || current.recipes.reveal?.result !== "success"
    || Number(current.progression.ingredients[onion.id] || 0) !== 0
    || Number(current.progression.ingredients[vinegar.id] || 0) !== 0) {
    throw new Error(`새콤 양파절임 발견 실패: ${JSON.stringify(current.recipes)}`);
  }
  await page.screenshot({ path: path.join(out, "02-onion-pickle-discovered.png"), fullPage: true });
  fs.writeFileSync(path.join(out, "result.json"), JSON.stringify({
    overallDrops: drops.length,
    yogurtDrops,
    vinegarDrops,
    yogurtRatio,
    recipe: "새콤 양파절임",
    combination: ["양파", "식초"],
  }, null, 2));
  if (errors.length) throw new Error(`브라우저 오류: ${errors.join(" | ")}`);
  console.log(`YOGURT_VINEGAR_RECIPE_OK drops=${drops.length} yogurt=${yogurtDrops} vinegar=${vinegarDrops} recipe=새콤양파절임`);
} finally {
  await browser.close();
}
