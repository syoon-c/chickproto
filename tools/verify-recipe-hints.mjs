import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "recipe-hints");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
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

  const recipeInfo = await page.evaluate(() => {
    const ingredients = window.CHICK_CONFIG.GAME_INGREDIENTS;
    const sandwich = window.CHICK_CONFIG.CORE_PROGRESSION.find((route) => route.recipeName === "샌드위치");
    return { sandwich, bread: ingredients.bread, rice: ingredients.rice, leaf: ingredients.leaf };
  });
  await page.evaluate(({ bread, rice }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = { [bread.id]: 1, [rice.id]: 1 };
    saved.crafting.selected = [];
    saved.crafting.hints = {};
    localStorage.setItem(key, JSON.stringify(saved));
  }, recipeInfo);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();

  const allCards = page.locator(".recipe-catalog-card");
  if (await allCards.count() !== 59
    || await page.locator(".recipe-catalog-card.is-mystery").count() !== 58
    || await page.locator(".recipe-catalog-card.is-discovered").count() !== 1) {
    throw new Error("The recipe catalog does not show all 59 discovered and mystery cards");
  }
  const mysteryNames = await page.locator(".recipe-catalog-card.is-mystery .recipe-catalog-copy > strong").allTextContents();
  if (mysteryNames.some((name) => name !== "???")) throw new Error("A locked recipe name was exposed");

  await page.locator(`[data-action="select-ingredient"][data-id="${recipeInfo.bread.id}"]`).click();
  await page.locator(`[data-action="select-ingredient"][data-id="${recipeInfo.rice.id}"]`).click();
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  await page.locator('[data-action="dismiss-recipe-reveal"]').click();

  let current = await gameState();
  const hint = current.recipes.hintedRecipes[String(recipeInfo.sandwich.recipeId)];
  if (current.recipes.hintRule !== "same-size-and-all-but-one-correct"
    || hint?.revealedCount !== 1
    || hint?.totalCount !== 2
    || JSON.stringify(hint.revealedIngredients) !== JSON.stringify(["빵"])) {
    throw new Error(`Near-miss did not reveal only the correct ingredient: ${JSON.stringify(current.recipes)}`);
  }
  const sandwichCard = page.locator(`.recipe-catalog-card[data-recipe-id="${recipeInfo.sandwich.recipeId}"]`);
  const sandwichText = await sandwichCard.innerText();
  if (!sandwichText.includes("???") || !sandwichText.includes("빵") || !sandwichText.includes("?") || sandwichText.includes("쌀")) {
    throw new Error(`Wrong ingredient leaked into the recipe hint: ${sandwichText}`);
  }
  await sandwichCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "01-partial-hint.png") });

  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  current = await gameState();
  if (current.recipes.hintedRecipes[String(recipeInfo.sandwich.recipeId)]?.revealedIngredients[0] !== "빵") {
    throw new Error("Recipe hint did not persist after reload");
  }

  await page.evaluate(({ bread, leaf }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = { [bread.id]: 1, [leaf.id]: 1 };
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, recipeInfo);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  await page.locator(`[data-action="select-ingredient"][data-id="${recipeInfo.bread.id}"]`).click();
  await page.locator(`[data-action="select-ingredient"][data-id="${recipeInfo.leaf.id}"]`).click();
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  current = await gameState();
  if (current.recipes.levels[String(recipeInfo.sandwich.recipeId)] !== 1
    || current.recipes.mysteryRecipeCount !== 57
    || !await page.locator("#recipe-reveal").isVisible()) {
    throw new Error("Completing the hinted combination did not discover the recipe");
  }
  await page.locator('[data-action="dismiss-recipe-reveal"]').click();
  const discoveredText = await page.locator(`.recipe-catalog-card.is-discovered[data-recipe-id="${recipeInfo.sandwich.recipeId}"]`).innerText();
  if (!discoveredText.includes("샌드위치") || discoveredText.includes("???")) {
    throw new Error(`Discovered recipe card did not open normally: ${discoveredText}`);
  }
  await page.locator(`.recipe-catalog-card[data-recipe-id="${recipeInfo.sandwich.recipeId}"]`).scrollIntoViewIfNeeded();
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "02-discovered-after-hint.png") });

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("RECIPE_HINTS_OK catalog=59 nearMiss=bread-only persisted=true discovered=sandwich");
} finally {
  await browser.close();
}
