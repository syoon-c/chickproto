import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, "src", "game-config.js"), "utf8"), { filename: "src/game-config.js" });
const { CORE_PROGRESSION, GAME_INGREDIENTS } = globalThis.CHICK_CONFIG;
const salad = CORE_PROGRESSION.find((route) => route.recipeId === 1);
if (Object.keys(GAME_INGREDIENTS).length !== 78) throw new Error("Configured ingredient count changed unexpectedly");
if (new Set(CORE_PROGRESSION.flatMap((route) => route.rewardIngredients.map((ingredient) => ingredient.id))).size !== 51) {
  throw new Error("Active ingredient count changed unexpectedly");
}
if (salad.ingredientRequirements.length !== 1 || salad.ingredientRequirements[0].id !== 30039 || salad.ingredientCount !== 2) {
  throw new Error(`Salad must use two leaves: ${JSON.stringify(salad)}`);
}

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "owned-ingredient-discovery-sensible");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function reset() {
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await reset();

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = { 30039: 3 };
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  let current = await state();
  if (current.recipes.craftRequirements[1]?.[0]?.count !== 2 || !current.recipes.craftable.includes(1)) {
    throw new Error(`Salad leaf upgrade is not ready: ${JSON.stringify(current.recipes)}`);
  }
  await page.locator('[data-action="select-ingredient"][data-id="30039"]').click();
  await page.locator('[data-action="select-ingredient"][data-id="30039"]').click();
  await page.screenshot({ path: path.join(out, "01-salad-two-leaves.png"), fullPage: true });
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  current = await state();
  if (current.recipes.levels[1] !== 2 || current.recipes.prices[1] !== 44
    || current.recipes.recipeLevelPriceBonus !== 0.10
    || current.recipes.craftCosts[1] !== 2
    || current.recipes.upgradeIngredientCostRule !== "fixed-per-recipe"
    || current.recipes.reveal?.result !== "upgrade"
    || current.recipes.reveal?.automatic !== false
    || current.recipes.reveal?.previousLevel !== 1
    || current.recipes.reveal?.newLevel !== 2
    || current.recipes.reveal?.previousPrice !== 40
    || current.recipes.reveal?.newPrice !== 44
    || current.recipes.reveal?.priceIncrease !== 4
    || Number(current.progression.ingredients[30039] || 0) !== 1) {
    throw new Error(`Two leaves did not upgrade salad price by 10%: ${JSON.stringify(current.recipes)}`);
  }
  const upgradeText = await page.locator(".recipe-upgrade-card").innerText();
  if (!upgradeText.includes("레시피 레벨업") || !upgradeText.includes("Lv.1") || !upgradeText.includes("Lv.2")
    || !upgradeText.includes("40") || !upgradeText.includes("44") || !upgradeText.includes("+4원 상승")
    || await page.locator(".recipe-reveal-rays").count() || await page.locator(".recipe-reveal-sparkles").count()) {
    throw new Error(`Upgrade reveal is stale: ${upgradeText}`);
  }
  await page.waitForTimeout(450);
  await page.locator("#recipe-reveal").screenshot({ path: path.join(out, "02-salad-levelup-price-reveal.png") });
  await page.locator('[data-action="dismiss-recipe-reveal"]').click();
  await page.locator('[data-tab="owned"]').click();
  const ownedRecipeText = await page.locator("#menu-content").innerText();
  if (!ownedRecipeText.includes("Lv.UP당 가격 +10%") || !ownedRecipeText.includes("현재 가격 44")) {
    throw new Error(`Owned recipe price copy is stale: ${ownedRecipeText}`);
  }
  await page.screenshot({ path: path.join(out, "03-salad-level-2-price.png"), fullPage: true });

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients[30039] = 2;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-action="select-ingredient"][data-id="30039"]').click();
  await page.locator('[data-action="select-ingredient"][data-id="30039"]').click();
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  current = await state();
  if (current.recipes.levels[1] !== 3 || current.recipes.prices[1] !== 48
    || current.recipes.craftCosts[1] !== 2 || Number(current.progression.ingredients[30039] || 0) !== 0) {
    throw new Error(`Salad upgrade cost increased after level 2: ${JSON.stringify(current.recipes)}`);
  }
  await page.screenshot({ path: path.join(out, "04-salad-level-3-fixed-cost.png"), fullPage: true });

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.guests = [{
      id: "price-test", customerId: 3, commonId: 1, recipeId: 1, visitNumber: 1,
      seatId: "price-test-seat", tableId: 0, x: 240, y: 430, targetX: 240, targetY: 900,
      wait: 0, state: "disappointed", stateTime: 6.1, mood: "disappointed", bob: 0,
    }];
    saved.payments = [];
    saved.ingredientDrops = [];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.evaluate(() => window.advanceTime(34));
  current = await state();
  if (current.payments[0]?.amount !== 48) {
    throw new Error(`Actual level-3 sale did not use the 10% price: ${JSON.stringify(current.payments)}`);
  }

  await reset();
  const future = await page.evaluate(() => window.CHICK_CONFIG.CORE_PROGRESSION.find((route) => route.themeId === 15 && route.slot === 0));
  await page.evaluate((route) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.ownedRecipes[2] = { level: 1, stack: 0, codexClaimed: true };
    saved.ownedRecipes[10001] = { level: 1, stack: 0, codexClaimed: true };
    saved.crafting.ingredients = Object.fromEntries(route.ingredientRequirements.map((ingredient) => [ingredient.id, 1]));
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, future);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  current = await state();
  if (current.progression.unlockedThemes.includes(15) || current.progression.unlockedChickRoutes.some((route) => route.themeId === 15)) {
    throw new Error("Future theme or chick was unexpectedly unlocked");
  }
  if (current.recipes.searchScope !== "all-recipes-by-owned-ingredients" || !current.recipes.craftable.includes(future.recipeId)) {
    throw new Error(`Owned ingredients cannot target a recipe outside chick unlocks: ${JSON.stringify(current.recipes)}`);
  }
  for (const ingredient of future.ingredientRequirements) {
    const picker = page.locator(`[data-action="select-ingredient"][data-id="${ingredient.id}"]`);
    if (!await picker.isVisible()) throw new Error(`Owned ingredient ${ingredient.id} is hidden from the picker`);
    await picker.click();
  }
  await page.screenshot({ path: path.join(out, "04-future-recipe-by-inventory.png"), fullPage: true });
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  current = await state();
  if (current.recipes.levels[future.recipeId] !== 1) throw new Error("Future recipe was not discovered from owned ingredients");

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`OWNED_INGREDIENT_DISCOVERY_OK configured=78 active=51 salad=leafx2 fixedUpgradeCost=2 priceBonus=10% futureRecipe=${future.recipeId}`);
} finally {
  await browser.close();
}
