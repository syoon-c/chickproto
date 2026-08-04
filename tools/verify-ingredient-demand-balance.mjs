import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, "src", "game-config.js"), "utf8"), { filename: "src/game-config.js" });
const { CORE_PROGRESSION, RECIPE_PROGRESSION, GAME_INGREDIENTS } = globalThis.CHICK_CONFIG;

const ingredientRows = Object.fromEntries(Object.values(GAME_INGREDIENTS)
  .map((ingredient) => [ingredient.id, { name: ingredient.name, uses: 0, supplyWeight: 0 }]));
for (const route of RECIPE_PROGRESSION) {
  for (const ingredient of route.ingredientRequirements) ingredientRows[ingredient.id].uses += 1;
}
for (const route of CORE_PROGRESSION) {
  route.rewardIngredients.forEach((ingredient, index) => {
    ingredientRows[ingredient.id].supplyWeight += [0.5, 0.3, 0.2][index];
  });
}
const activeRows = Object.values(ingredientRows).filter((row) => row.uses > 0);
const supplyRatios = activeRows.map((row) => row.supplyWeight / row.uses);
const minSupplyRatio = Math.min(...supplyRatios);
const maxSupplyRatio = Math.max(...supplyRatios);
if (RECIPE_PROGRESSION.length !== 64 || activeRows.length !== 51
  || activeRows.filter((row) => row.uses === 1).length !== 12
  || maxSupplyRatio / minSupplyRatio > 3.01) {
  throw new Error(`Ingredient demand/supply balance mismatch: ${JSON.stringify({
    recipes: RECIPE_PROGRESSION.length,
    activeIngredients: activeRows.length,
    singleUse: activeRows.filter((row) => row.uses === 1).length,
    minSupplyRatio,
    maxSupplyRatio,
  })}`);
}
const expectedRecipes = {
  "마늘 버섯볶음": ["마늘", "버섯", "식용유"],
  "양배추 돼지고기볶음": ["양배추", "돼지고기", "간장"],
  "콘치즈": ["옥수수", "치즈", "버터"],
  "씨앗 샐러드": ["나뭇잎", "해바라기씨"],
  "당근 크림수프": ["당근", "육수", "생크림"],
  "아보카도 에그": ["아보카도", "달걀"],
  "과일 우유": ["과일", "우유"],
  "매콤 치즈 감자": ["감자", "고추", "치즈"],
};
for (const [recipeName, ingredientNames] of Object.entries(expectedRecipes)) {
  const route = RECIPE_PROGRESSION.find((entry) => entry.recipeName === recipeName);
  if (!route || JSON.stringify(route.ingredientRequirements.map((ingredient) => ingredient.name)) !== JSON.stringify(ingredientNames)) {
    throw new Error(`Surplus-material recipe mismatch: ${recipeName}`);
  }
}
const combinations = RECIPE_PROGRESSION.map((route) => route.ingredientRequirements
  .map((ingredient) => ingredient.id).sort((a, b) => a - b).join("+"));
if (new Set(combinations).size !== combinations.length) throw new Error("A balanced recipe duplicates another combination");

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "ingredient-demand-balance");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  const info = await page.evaluate(() => ({
    corn: window.CHICK_CONFIG.GAME_INGREDIENTS.corn,
    cheese: window.CHICK_CONFIG.GAME_INGREDIENTS.cheese,
    butter: window.CHICK_CONFIG.GAME_INGREDIENTS.butter,
    bread: window.CHICK_CONFIG.GAME_INGREDIENTS.bread,
    tomato: window.CHICK_CONFIG.GAME_INGREDIENTS.tomato,
    routes: window.CHICK_CONFIG.RECIPE_PROGRESSION.map((route) => route.recipeId),
  }));
  await page.evaluate(({ corn, cheese, butter }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.ownedRecipes = {
      1: { level: 1, stack: 0, codexClaimed: false },
      2: { level: 1, stack: 0, codexClaimed: false },
      10001: { level: 1, stack: 0, codexClaimed: false },
      10003: { level: 1, stack: 0, codexClaimed: false },
    };
    saved.crafting.ingredients = { [corn.id]: 1, [cheese.id]: 1, [butter.id]: 1 };
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, info);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  if (await page.locator(".recipe-catalog-card").count() !== 64) throw new Error("Recipe UI does not show 64 recipes");
  for (const ingredient of [info.corn, info.cheese, info.butter]) {
    await page.locator(`[data-action="select-ingredient"][data-id="${ingredient.id}"]`).click();
  }
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(1200));
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "01-surplus-recipe-research.png") });
  await page.evaluate(() => window.advanceTime(1300));
  let current = await gameState();
  if (current.recipes.levels["20008"] !== 1 || current.ingredientStorage.totalItems !== 0
    || current.recipes.reveal?.recipeName !== "콘치즈") {
    throw new Error(`Corn cheese discovery failed: ${JSON.stringify(current.recipes)}`);
  }
  await page.waitForFunction(() => {
    const image = document.querySelector(".recipe-reveal-dish img");
    return image?.complete && image.naturalWidth > 0;
  });
  await page.waitForTimeout(150);
  await page.locator("#recipe-reveal").screenshot({ path: path.join(out, "02-corn-cheese-discovered.png") });

  await page.evaluate(({ routes, bread, butter, tomato }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.ownedRecipes = Object.fromEntries(routes.map((recipeId) => [recipeId, {
      level: recipeId === 20001 || recipeId === 20002 ? 1 : 999,
      stack: 0,
      codexClaimed: false,
    }]));
    saved.crafting.ingredients = { [bread.id]: 3, [butter.id]: 1, [tomato.id]: 5 };
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, info);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  current = await gameState();
  if (current.recipes.autoResearchTarget !== 20002
    || current.recipes.autoResearchPriority !== "new-first-lowest-level-then-highest-inventory-pressure") {
    throw new Error(`Automatic research did not prioritize surplus ingredients: ${JSON.stringify(current.recipes)}`);
  }
  await page.locator('[data-action="auto-craft"]').click();
  current = await gameState();
  if (current.recipes.research?.recipeId !== 20002 || current.ingredientStorage.totalItems !== 7) {
    throw new Error(`Automatic research did not consume the higher-pressure combination: ${JSON.stringify(current.recipes.research)}`);
  }
  await page.evaluate(() => window.advanceTime(2500));
  current = await gameState();
  if (current.recipes.levels["20002"] !== 2 || current.recipes.levels["20001"] !== 1) {
    throw new Error("Automatic research upgraded the wrong same-level recipe");
  }
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "03-surplus-auto-research.png") });

  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log(`INGREDIENT_DEMAND_BALANCE_OK recipes=64 active=51 singleUse=12 supplySpread=${(maxSupplyRatio / minSupplyRatio).toFixed(1)}x auto=inventory-pressure`);
} finally {
  await browser.close();
}
