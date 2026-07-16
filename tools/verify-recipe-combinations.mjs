import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "recipe-combinations");
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

  const routeInfo = await page.evaluate(() => {
    const early = window.CHICK_CONFIG.CORE_PROGRESSION.find((route) => route.themeId === 1 && route.slot === 0);
    const middle = window.CHICK_CONFIG.CORE_PROGRESSION.find((route) => route.themeId === 6 && route.slot === 0);
    const late = window.CHICK_CONFIG.CORE_PROGRESSION.find((route) => route.themeId === 14 && route.slot === 0);
    return { early, middle, late };
  });
  if (routeInfo.early.ingredientRequirements.length !== 1
    || routeInfo.middle.ingredientRequirements.length !== 2
    || routeInfo.late.ingredientRequirements.length !== 3) {
    throw new Error(`Ingredient tiers are incorrect: ${JSON.stringify(routeInfo)}`);
  }

  await page.evaluate(({ late }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const stoneRows = window.CHICK_TABLE_SOURCE.ThemeFacility.filter((row) => row.areaType === 1 && row.facilityTheme === 1);
    const targetRows = window.CHICK_TABLE_SOURCE.ThemeFacility.filter((row) => row.areaType === 1 && row.facilityTheme === late.themeId);
    saved.themes.opened = [...stoneRows.map((row) => row.id), ...targetRows.slice(0, Math.ceil(targetRows.length * .3)).map((row) => row.id)];
    saved.crafting.ingredients = Object.fromEntries(late.ingredientRequirements.map((ingredient) => [ingredient.id, 1]));
    localStorage.setItem(key, JSON.stringify(saved));
  }, routeInfo);
  await page.reload({ waitUntil: "load" });

  let current = await state();
  const requirements = current.recipes.craftRequirements[routeInfo.late.recipeId];
  if (requirements?.length !== 3 || !current.recipes.craftable.includes(routeInfo.late.recipeId)) {
    throw new Error(`Late recipe is not craftable with three ingredients: ${JSON.stringify(requirements)}`);
  }
  await page.locator('[data-screen="recipe"]').click();
  await page.waitForTimeout(200);
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "01-three-ingredient-ready.png") });
  await page.locator(`[data-action="craft-recipe"][data-id="${routeInfo.late.recipeId}"]`).click();
  current = await state();
  if (!current.progression.craftedRecipes.includes(routeInfo.late.recipeId)
    || requirements.some((requirement) => Number(current.progression.ingredients[requirement.ingredientId] || 0) !== 0)) {
    throw new Error("Three-ingredient recipe did not consume the complete combination");
  }
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "02-three-ingredient-crafted.png") });

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("RECIPE_COMBINATIONS_OK single=1 middle=2 late=3");
} finally {
  await browser.close();
}
