import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "water-recipes");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function setIngredients(ingredients) {
  await page.evaluate((ingredientKeys) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = Object.fromEntries(ingredientKeys.map((ingredientKey) => [
      window.CHICK_CONFIG.GAME_INGREDIENTS[ingredientKey].id,
      1,
    ]));
    saved.crafting.selected = [];
    saved.crafting.bowlCapacity = 4;
    localStorage.setItem(key, JSON.stringify(saved));
  }, ingredients);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-action="open-ingredient-picker"]').click();
  for (const ingredientKey of ingredients) {
    const ingredientId = await page.evaluate((key) => window.CHICK_CONFIG.GAME_INGREDIENTS[key].id, ingredientKey);
    await page.locator(`[data-action="select-ingredient"][data-id="${ingredientId}"]`).click();
  }
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();
  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const countertop = window.CHICK_TABLE_SOURCE.InstallFacility.find((row) => Number(row.areaType) === 1 && Number(row.facilityType) === 8);
    saved.installed = [...new Set([...saved.installed, countertop.id])];
    saved.tutorial = { activeId: null, seen: ["welcome"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });

  const catalog = await page.evaluate(() => {
    const ingredientKeyById = Object.fromEntries(Object.entries(window.CHICK_CONFIG.GAME_INGREDIENTS)
      .map(([key, ingredient]) => [ingredient.id, key]));
    return window.CHICK_CONFIG.RECIPE_PROGRESSION.map((route) => ({
      id: route.recipeId,
      name: route.recipeName,
      keys: route.ingredientRequirements.map((ingredient) => ingredientKeyById[ingredient.id]).sort(),
      price: route.foodPrice,
    }));
  });
  const newNames = ["쌀죽", "삶은 달걀", "맑은 국수", "토마토 수프", "감자 수프", "채소죽", "두부 장국", "양배추 피클"];
  const waterRecipes = catalog.filter((recipe) => recipe.keys.includes("water"));
  const signatures = catalog.map((recipe) => recipe.keys.join("+"));
  if (catalog.length !== 72 || waterRecipes.length !== 10
    || newNames.some((name) => !waterRecipes.some((recipe) => recipe.name === name))
    || new Set(signatures).size !== signatures.length) {
    throw new Error(`Invalid water recipe catalog: ${JSON.stringify({ total: catalog.length, waterRecipes, unique: new Set(signatures).size })}`);
  }

  await setIngredients(["water", "rice"]);
  const pickerText = await page.locator(".recipe-ingredient-dialog").innerText();
  if (!pickerText.includes("2/4") || !(await page.locator(".recipe-picker-mix").isEnabled())) {
    throw new Error(`Two-ingredient water recipe is not ready in the bowl: ${pickerText}`);
  }
  await page.locator(".recipe-ingredient-dialog").screenshot({ path: path.join(out, "01-rice-porridge-bowl.png") });
  await page.locator(".recipe-picker-mix").click();
  await page.evaluate(() => window.advanceTime(2500));
  let current = await gameState();
  if (current.recipes.reveal?.result !== "success" || current.recipes.reveal?.recipeName !== "쌀죽") {
    throw new Error(`Rice porridge was not discovered: ${JSON.stringify(current.recipes)}`);
  }
  await page.locator("#recipe-reveal").screenshot({ path: path.join(out, "02-rice-porridge-discovery.png") });
  await page.locator('[data-action="dismiss-recipe-reveal"]').click();

  await setIngredients(["water", "cabbage", "vinegar", "sugar"]);
  const fourIngredientText = await page.locator(".recipe-ingredient-dialog").innerText();
  if (!fourIngredientText.includes("4/4") || !(await page.locator(".recipe-picker-mix").isEnabled())) {
    throw new Error(`Four-ingredient water recipe is not ready in the bowl: ${fourIngredientText}`);
  }
  await page.locator(".recipe-picker-mix").click();
  await page.evaluate(() => window.advanceTime(2500));
  current = await gameState();
  if (current.recipes.reveal?.result !== "success" || current.recipes.reveal?.recipeName !== "양배추 피클") {
    throw new Error(`Cabbage pickle was not discovered: ${JSON.stringify(current.recipes)}`);
  }
  await page.locator("#recipe-reveal").screenshot({ path: path.join(out, "03-cabbage-pickle-discovery.png") });

  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log(`WATER_RECIPES_OK total=${catalog.length} waterRecipes=${waterRecipes.length} new=${newNames.length} uniqueCombinations=${new Set(signatures).size}`);
} finally {
  await browser.close();
}
