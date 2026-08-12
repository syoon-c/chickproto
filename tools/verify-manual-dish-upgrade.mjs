import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "manual-dish-upgrade");
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
  await page.locator('[data-screen="theme"]').click();
  await page.locator("#menu-close-btn").click();
  await page.evaluate(async () => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const tables = await window.ChickData.loadTables();
    saved.installed.push(tables.installs.find((row) => Number(row.facilityType) === 8).id);
    saved.ownedRecipes = { 1: { level: 20, stack: 0, codexClaimed: true } };
    saved.crafting.ingredients = { 30039: 2 };
    saved.crafting.hints = { 2: [30003], 10009: [30003, 30048, 30004] };
    saved.tutorial = { activeId: null, seen: ["welcome", "recipe-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  if (await page.locator('[data-tab="owned"]').count() !== 0 || await page.locator("#menu-tabs button").count() !== 2) {
    throw new Error("The separate discovered-dishes tab still exists.");
  }

  const card = page.locator('.recipe-catalog-card:has([data-action="manual-upgrade"][data-id="1"])');
  await card.scrollIntoViewIfNeeded();
  const cardSizes = await page.locator(".recipe-catalog-card").evaluateAll((cards) => cards.slice(0, 8).map((item) => ({
    width: Math.round(item.getBoundingClientRect().width),
    height: Math.round(item.getBoundingClientRect().height),
  })));
  if (new Set(cardSizes.map((size) => size.width)).size !== 1 || new Set(cardSizes.map((size) => size.height)).size !== 1) {
    throw new Error(`Discovered, hinted, and mystery cards do not share one size: ${JSON.stringify(cardSizes)}`);
  }
  const button = card.locator('[data-action="manual-upgrade"]');
  if (!await button.isEnabled() || (await button.innerText()).trim() !== "레벨업"
    || !(await card.innerText()).includes("2/2")) {
    throw new Error(`Owned dish card did not expose a ready manual upgrade: ${await card.innerText()}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "01-upgrade-ready.png") });
  await page.locator("#menu-content").evaluate((element) => { element.scrollTop += 105; });
  await page.locator(".game-frame").screenshot({ path: path.join(out, "01b-uniform-discovered-hinted-mystery-cards.png") });
  await card.scrollIntoViewIfNeeded();
  const before = await state();
  if (!before.recipes.craftable.includes(1)) throw new Error("A dish at the former max level is excluded from automatic research candidates.");
  await button.click();
  const after = await state();
  if (before.recipes.levelLimit !== null || after.recipes.levels[1] !== 21 || after.progression.ingredients[30039] !== 0
    || after.recipes.prices[1] - before.recipes.prices[1] !== 4
    || after.metrics.recipeResearchAttempts !== before.metrics.recipeResearchAttempts + 1) {
    throw new Error(`Manual dish upgrade did not consume ingredients and level immediately: ${JSON.stringify({ before: before.recipes, after: after.recipes, ingredients: after.progression.ingredients })}`);
  }
  if (!await page.locator(".recipe-upgrade-card").isVisible()
    || !(await page.locator(".recipe-upgrade-card").innerText()).includes("Lv.21")) {
    throw new Error("Manual dish upgrade did not use the level-up result presentation.");
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "02-upgrade-complete.png") });
  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log(`MANUAL_DISH_UPGRADE_OK unlimited=yes mergedCatalog=yes cards=${cardSizes[0].width}x${cardSizes[0].height} tabs=2 level=20->21 ingredients=2->0 price=${before.recipes.prices[1]}->${after.recipes.prices[1]}`);
} finally {
  await browser.close();
}
