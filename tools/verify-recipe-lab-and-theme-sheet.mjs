import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, "src", "game-config.js"), "utf8"), { filename: "src/game-config.js" });
const { CORE_PROGRESSION, INGREDIENT_SLOT_WEIGHTS } = globalThis.CHICK_CONFIG;

if (CORE_PROGRESSION.length !== 45) throw new Error(`Expected 45 theme chicks, got ${CORE_PROGRESSION.length}`);
if (new Set(CORE_PROGRESSION.map((route) => route.commonId)).size !== 45) throw new Error("Theme chick resources are not uniquely assigned");
const seenIngredientIds = new Set();
const seenSpecialIngredientIds = new Set();
for (let themeId = 1; themeId <= 15; themeId += 1) {
  const routes = CORE_PROGRESSION.filter((route) => route.themeId === themeId);
  if (routes.length !== 3) throw new Error(`Theme ${themeId} does not have three chicks`);
  if (routes.some((route) => route.rewardIngredients.length !== 2)) throw new Error(`Theme ${themeId} does not use the two-material guest structure`);
  const themeIngredients = new Set(routes.flatMap((route) => route.rewardIngredients.map((ingredient) => ingredient.id)));
  const themeSpecialIds = routes.map((route) => route.rewardIngredients[1].id);
  if (themeSpecialIds.some((id) => seenSpecialIngredientIds.has(id))) throw new Error(`Theme ${themeId} repeats a special ingredient`);
  themeSpecialIds.forEach((id) => seenSpecialIngredientIds.add(id));
  themeIngredients.forEach((id) => seenIngredientIds.add(id));
  if (routes.some((route) => Number(route.ingredientCount || 0) < 2)) throw new Error(`Theme ${themeId} has a recipe using fewer than two items`);
}
const baseIngredientIds = CORE_PROGRESSION.map((route) => route.rewardIngredients[0].id);
if (new Set(baseIngredientIds).size !== 14 || seenSpecialIngredientIds.size !== 45 || seenIngredientIds.size !== 59) {
  throw new Error("Base-overlap/unique-special ingredient structure is incorrect");
}
if (JSON.stringify(INGREDIENT_SLOT_WEIGHTS) !== JSON.stringify({ base: 0.7, special: 0.3 })) {
  throw new Error(`Ingredient slot weights mismatch: ${JSON.stringify(INGREDIENT_SLOT_WEIGHTS)}`);
}

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "recipe-lab-sensible-recipes");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function setSave(mutator) {
  await page.evaluate(mutator);
  await page.reload({ waitUntil: "load" });
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();
  await setSave(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const unlockFacilities = window.CHICK_TABLE_SOURCE.InstallFacility
      .filter((row) => Number(row.areaType) === 1 && [6, 8].includes(Number(row.facilityType)))
      .map((row) => row.id);
    saved.installed = [...new Set([...saved.installed, ...unlockFacilities])];
    saved.tutorial = { activeId: null, seen: ["welcome"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });

  const routes = await page.evaluate(() => ({
    base: window.CHICK_CONFIG.CORE_PROGRESSION.find((route) => route.themeId === 1 && route.slot === 0),
    wood: window.CHICK_CONFIG.CORE_PROGRESSION.filter((route) => route.themeId === 2),
    green: window.CHICK_CONFIG.CORE_PROGRESSION.find((route) => route.themeId === 3 && route.slot === 0),
  }));

  await page.locator('[data-screen="recipe"]').click();
  let current = await state();
  if (current.recipes.combinationCapacity !== 2 || current.recipes.autoResearchUnlocked) {
    throw new Error(`Initial recipe lab state mismatch: ${JSON.stringify(current.recipes)}`);
  }
  if (await page.locator('[data-action="auto-craft"]').isEnabled()) throw new Error("Auto research unlocked before five recipes");

  await setSave(async () => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const tables = await window.ChickData.loadTables();
    const woodRows = tables.restaurantThemes.filter((row) => row.facilityTheme === 2);
    saved.themes.opened = [...new Set([...saved.themes.opened, ...woodRows.slice(0, Math.ceil(woodRows.length * .3)).map((row) => row.id)])];
    const target = window.CHICK_CONFIG.CORE_PROGRESSION.find((route) => route.themeId === 2 && route.slot === 0);
    saved.ownedRecipes[2] = { level: 1, stack: 0, codexClaimed: true };
    saved.ownedRecipes[10001] = { level: 1, stack: 0, codexClaimed: true };
    saved.crafting.ingredients = Object.fromEntries(target.ingredientRequirements.map((ingredient) => [ingredient.id, 1]));
    saved.crafting.bowlCapacity = 3;
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-action="open-ingredient-picker"]').click();
  for (const requirement of routes.wood[0].ingredientRequirements) {
    await page.locator(`[data-action="select-ingredient"][data-id="${requirement.id}"]`).click();
  }
  await page.screenshot({ path: path.join(out, "01-manual-combination-ready.png"), fullPage: true });
  await page.locator('.recipe-picker-mix').click();
  current = await state();
  if (current.recipes.combinationCapacity !== 3 || current.recipes.selectedIngredients.length || !current.recipes.research) {
    throw new Error("Mixing inside the ingredient popup did not consume the selected three slots");
  }
  await page.evaluate(() => window.advanceTime(2500));
  current = await state();
  if (!current.recipes.levels[routes.wood[0].recipeId] || current.recipes.owned !== 4) throw new Error("Manual combination did not discover a recipe");

  await setSave(async () => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const tables = await window.ChickData.loadTables();
    const woodRows = tables.restaurantThemes.filter((row) => row.facilityTheme === 2);
    saved.themes.opened = [...new Set([...saved.themes.opened, ...woodRows.map((row) => row.id)])];
    const allRoutes = window.CHICK_CONFIG.CORE_PROGRESSION;
    const wood = allRoutes.filter((route) => route.themeId === 2);
    const green = allRoutes.find((route) => route.themeId === 3 && route.slot === 0);
    saved.ownedRecipes = {
      1: { level: 3, stack: 0, codexClaimed: true },
      [wood[0].recipeId]: { level: 2, stack: 0, codexClaimed: true },
      [wood[1].recipeId]: { level: 1, stack: 0, codexClaimed: true },
      [green.recipeId]: { level: 1, stack: 0, codexClaimed: true },
      2: { level: 1, stack: 0, codexClaimed: true },
    };
    saved.crafting.ingredients = Object.fromEntries(wood[2].ingredientRequirements.map((ingredient) => [ingredient.id, 2]));
    saved.crafting.bowlCapacity = 4;
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.locator('[data-screen="recipe"]').click();
  current = await state();
  if (!current.recipes.autoResearchUnlocked || current.recipes.combinationCapacity !== 4
    || current.recipes.autoResearchTarget !== routes.wood[2].recipeId) {
    throw new Error(`Auto research did not prioritize a new recipe: ${JSON.stringify(current.recipes)}`);
  }
  await page.locator('[data-action="auto-craft"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  current = await state();
  if (current.recipes.levels[routes.wood[2].recipeId] !== 1) throw new Error("Auto research did not discover the new recipe first");
  await page.screenshot({ path: path.join(out, "02-auto-new-recipe.png"), fullPage: true });

  await setSave(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const wood = window.CHICK_CONFIG.CORE_PROGRESSION.filter((route) => route.themeId === 2);
    saved.ownedRecipes[wood[0].recipeId].level = 2;
    saved.ownedRecipes[wood[1].recipeId].level = 1;
    saved.ownedRecipes[wood[2].recipeId].level = 4;
    saved.crafting.ingredients = {};
    const route = wood[1];
    const total = Math.max(route.ingredientCount, route.ingredientRequirements.length);
    const base = Math.floor(total / route.ingredientRequirements.length);
    const remainder = total % route.ingredientRequirements.length;
    route.ingredientRequirements.forEach((ingredient, index) => { saved.crafting.ingredients[ingredient.id] = base + (index < remainder ? 1 : 0); });
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.locator('[data-screen="recipe"]').click();
  current = await state();
  if (current.recipes.autoResearchTarget !== routes.wood[1].recipeId) throw new Error("Auto research did not select the lowest-level craftable recipe");
  await page.locator('[data-action="auto-craft"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  current = await state();
  if (current.recipes.levels[routes.wood[1].recipeId] !== 2) throw new Error("Lowest-level recipe was not upgraded");

  await setSave(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.rng = 20260803;
    saved.guests = Array.from({ length: 600 }, (_, index) => ({
      id: 70000 + index, customerId: 3, commonId: 1001, customerName: "기본 병아리", state: "eating",
      seatId: `drop-${index}`, tableId: 0, x: 40 + index % 8 * 55, y: 180, targetX: 240, targetY: 900,
      recipeId: 1, visitNumber: 700, wait: 0, stateTime: 7.1, mood: "satisfied", bob: 0,
    }));
    saved.orders = []; saved.cooking = []; saved.payments = []; saved.ingredientDrops = [];
    saved.metrics.ingredientDropAttempts = 0; saved.metrics.ingredientDropMisses = 0;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.evaluate(() => window.advanceTime(34));
  current = await state();
  const slotCounts = current.ingredientDrops.reduce((result, drop) => ({ ...result, [drop.slot]: (result[drop.slot] || 0) + 1 }), {});
  const hits = current.ingredientDrops.length;
  const ratios = Object.fromEntries(["base", "special"].map((slot) => [slot, Number(slotCounts[slot] || 0) / hits]));
  if (hits / 600 < 0.11 || hits / 600 > 0.19
    || ratios.base < 0.55 || ratios.base > 0.85
    || ratios.special < 0.15 || ratios.special > 0.45) {
    throw new Error(`Drop probability distribution mismatch: ${JSON.stringify({ hits, ratios })}`);
  }

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "result.json"), JSON.stringify({ hits, ratios }, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`RECIPE_LAB_THEME_SHEET_OK routes=45 bowl=gem-upgrade-2-to-4 auto=new-first/lowest-level slots=${JSON.stringify(ratios)}`);
} finally {
  await browser.close();
}
