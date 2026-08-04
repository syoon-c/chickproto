import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, "src", "game-config.js"), "utf8"), { filename: "src/game-config.js" });
const { CORE_PROGRESSION, RECIPE_PROGRESSION, EARLY_RECIPE_CATALOG, GAME_INGREDIENTS } = globalThis.CHICK_CONFIG;

const earlyIngredientIds = new Set(CORE_PROGRESSION
  .filter((route) => route.themeId <= 2)
  .flatMap((route) => route.rewardIngredients.slice(0, 2).map((ingredient) => ingredient.id)));
const earlyRecipes = RECIPE_PROGRESSION.filter((route) => route.ingredientRequirements
  .every((ingredient) => earlyIngredientIds.has(ingredient.id)));
const expectedEarlyNames = [
  "샐러드", "버섯전", "샌드위치", "버터 토스트", "토마토 샌드위치", "달걀 샌드위치", "토마토 달걀볶음", "버터빵",
  "새싹 샐러드", "양상추 샌드위치", "버섯 토스트", "달걀밥", "버터 라이스", "토마토 리조또",
];
if (CORE_PROGRESSION.length !== 45 || RECIPE_PROGRESSION.length !== 64 || EARLY_RECIPE_CATALOG.length !== 19) {
  throw new Error(`Recipe/chick totals are incorrect: ${CORE_PROGRESSION.length}/${RECIPE_PROGRESSION.length}/${EARLY_RECIPE_CATALOG.length}`);
}
if (earlyIngredientIds.size !== 9 || JSON.stringify(earlyRecipes.map((route) => route.recipeName)) !== JSON.stringify(expectedEarlyNames)) {
  throw new Error(`Expected fourteen early recipes from nine ingredients: ${JSON.stringify({ ingredients: [...earlyIngredientIds], recipes: earlyRecipes.map((route) => route.recipeName) })}`);
}
const combinations = RECIPE_PROGRESSION.map((route) => route.ingredientRequirements.map((ingredient) => ingredient.id).sort().join("+"));
if (new Set(combinations).size !== combinations.length) throw new Error("An early recipe duplicates an existing ingredient combination");
if (EARLY_RECIPE_CATALOG.slice(0, 5).some((recipe) => recipe.foodPrice > 50)) throw new Error("An added early recipe is not low-priced");
if (EARLY_RECIPE_CATALOG.slice(5).some((recipe) => recipe.foodPrice > 70)) throw new Error("A surplus-material recipe is priced too high");

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "early-recipes");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
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
  await page.evaluate(({ breadId, butterId }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = { [breadId]: 1, [butterId]: 1 };
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, { breadId: GAME_INGREDIENTS.bread.id, butterId: GAME_INGREDIENTS.butter.id });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  if (await page.locator(".recipe-catalog-card").count() !== 64) throw new Error("The UI recipe catalog did not expand to 64 cards");
  await page.locator(`[data-action="select-ingredient"][data-id="${GAME_INGREDIENTS.bread.id}"]`).click();
  await page.locator(`[data-action="select-ingredient"][data-id="${GAME_INGREDIENTS.butter.id}"]`).click();
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  let current = await state();
  if (current.recipes.catalogTotal !== 64
    || current.recipes.levels["20001"] !== 1
    || current.recipes.prices["20001"] !== 35
    || current.recipes.mysteryRecipeCount !== 62) {
    throw new Error(`Butter toast was not discovered as a cheap early recipe: ${JSON.stringify(current.recipes)}`);
  }
  const revealText = await page.locator("#recipe-reveal").innerText();
  if (!revealText.includes("버터 토스트")) throw new Error(`Wrong early recipe reveal: ${revealText}`);
  await page.locator('[data-action="dismiss-recipe-reveal"]').click();
  const card = page.locator('.recipe-catalog-card.is-discovered[data-recipe-id="20001"]');
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "01-butter-toast-discovered.png") });
  current = await state();
  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`EARLY_RECIPES_OK ingredients=${earlyIngredientIds.size} recipes=${earlyRecipes.length} total=${RECIPE_PROGRESSION.length} butterToast=35`);
} finally {
  await browser.close();
}
