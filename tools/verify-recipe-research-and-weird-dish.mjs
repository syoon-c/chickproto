import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "recipe-research-and-weird-dish");
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
  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const countertop = window.CHICK_TABLE_SOURCE.InstallFacility.find((row) => Number(row.areaType) === 1 && Number(row.facilityType) === 8);
    saved.installed = [...new Set([...saved.installed, countertop.id])];
    saved.tutorial = { activeId: null, seen: ["welcome"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });

  const info = await page.evaluate(() => ({
    bread: window.CHICK_CONFIG.GAME_INGREDIENTS.bread,
    rice: window.CHICK_CONFIG.GAME_INGREDIENTS.rice,
    leaf: window.CHICK_CONFIG.GAME_INGREDIENTS.leaf,
    salt: window.CHICK_CONFIG.GAME_INGREDIENTS.salt,
    pepper: window.CHICK_CONFIG.GAME_INGREDIENTS.pepper,
    sugar: window.CHICK_CONFIG.GAME_INGREDIENTS.sugar,
    sandwich: window.CHICK_CONFIG.RECIPE_PROGRESSION.find((route) => route.recipeName === "샌드위치"),
  }));
  await page.evaluate(({ bread, rice }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = { [bread.id]: 1, [rice.id]: 1 };
    saved.crafting.selected = [];
    saved.crafting.hints = {};
    localStorage.setItem(key, JSON.stringify(saved));
  }, info);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-action="open-ingredient-picker"]').click();
  await page.locator(`[data-action="select-ingredient"][data-id="${info.bread.id}"]`).click();
  await page.locator(`[data-action="select-ingredient"][data-id="${info.rice.id}"]`).click();
  await page.locator('[data-action="close-ingredient-picker"]').last().click();
  await page.locator('[data-action="discover-combination"]').click();

  let current = await gameState();
  if (!current.recipes.research || current.recipes.research.automatic
    || current.recipes.selectedIngredients.length
    || current.ingredientStorage.totalItems !== 0) {
    throw new Error(`Manual research did not consume ingredients immediately: ${JSON.stringify(current.recipes)}`);
  }
  if (!(await page.locator(".recipe-research-overlay").isVisible())
    || !(await page.locator(".recipe-research-overlay").innerText()).includes("요리 연구 중")) {
    throw new Error("Manual research loading overlay is not visible");
  }
  await page.evaluate(() => window.advanceTime(1200));
  current = await gameState();
  if (current.recipes.research?.progress < 0.45 || current.recipes.research?.progress > 0.55) {
    throw new Error(`Research gauge is not near halfway: ${JSON.stringify(current.recipes.research)}`);
  }
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "01-manual-research-loading.png") });
  await page.evaluate(() => window.advanceTime(1300));
  current = await gameState();
  if (current.recipes.research !== null || current.recipes.reveal?.result !== "failure"
    || current.recipes.reveal?.recipeName !== "괴식" || current.metrics.failedRecipeResearches !== 1
    || current.metrics.recipeResearchAttempts !== 1 || current.recipes.owned !== 1) {
    throw new Error(`Invalid combination did not become a weird dish: ${JSON.stringify(current.recipes)}`);
  }
  const hint = current.recipes.hintedRecipes[String(info.sandwich.recipeId)];
  if (JSON.stringify(hint?.revealedIngredients) !== JSON.stringify(["빵"])) {
    throw new Error(`Near-match hint was not preserved after failure: ${JSON.stringify(hint)}`);
  }
  await page.waitForFunction(() => {
    const image = document.querySelector(".recipe-reveal-dish img");
    return image?.complete && image.naturalWidth > 0;
  });
  await page.waitForTimeout(150);
  const weirdText = await page.locator(".recipe-reveal-card").innerText();
  if (!weirdText.includes("연구 실패") || !weirdText.includes("괴식") || !weirdText.includes("재료는 사라졌어요")) {
    throw new Error(`Weird dish reveal copy is incomplete: ${weirdText}`);
  }
  await page.locator("#recipe-reveal").screenshot({ path: path.join(out, "02-weird-dish-result.png") });

  await page.evaluate(({ bread, leaf }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.ownedRecipes = {
      1: { level: 1, stack: 0, codexClaimed: false },
      10001: { level: 1, stack: 0, codexClaimed: false },
      10003: { level: 1, stack: 0, codexClaimed: false },
      10004: { level: 1, stack: 0, codexClaimed: false },
      10005: { level: 1, stack: 0, codexClaimed: false },
    };
    saved.crafting.ingredients = { [bread.id]: 1, [leaf.id]: 1 };
    saved.crafting.bowlCapacity = 5;
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, info);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-action="auto-craft"]').click();
  current = await gameState();
  if (!current.recipes.research?.automatic || current.recipes.research.recipeId !== info.sandwich.recipeId
    || current.ingredientStorage.totalItems !== 0) {
    throw new Error(`Automatic research did not enter the shared loading flow: ${JSON.stringify(current.recipes.research)}`);
  }
  await page.evaluate(() => window.advanceTime(2500));
  current = await gameState();
  if (current.recipes.research !== null || current.recipes.reveal?.result !== "success"
    || current.recipes.reveal?.recipeId !== info.sandwich.recipeId || current.recipes.owned !== 6) {
    throw new Error(`Automatic research did not complete the new recipe first: ${JSON.stringify(current.recipes)}`);
  }
  await page.waitForFunction(() => {
    const image = document.querySelector(".recipe-reveal-dish img");
    return image?.complete && image.naturalWidth > 0;
  });
  await page.waitForTimeout(150);
  await page.locator("#recipe-reveal").screenshot({ path: path.join(out, "03-auto-research-success.png") });

  await page.locator('[data-action="dismiss-recipe-reveal"]').click();
  await page.evaluate(({ salt, pepper, sugar }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = { [salt.id]: 2, [pepper.id]: 2, [sugar.id]: 2 };
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, info);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-action="auto-craft"]').click();
  current = await gameState();
  const fallbackIngredientIds = new Set([info.salt.id, info.pepper.id, info.sugar.id]);
  if (!current.recipes.research?.automatic || current.recipes.research.recipeId !== null
    || current.recipes.autoResearchWhenNoRecipe !== "random-ingredients-up-to-bowl-capacity-then-weird-dish"
    || current.recipes.research.ingredientIds.length !== current.recipes.combinationCapacity
    || current.recipes.research.ingredientIds.some((ingredientId) => !fallbackIngredientIds.has(ingredientId))
    || current.ingredientStorage.totalItems !== 1) {
    throw new Error(`Automatic fallback did not consume random ingredients: ${JSON.stringify(current.recipes)}`);
  }
  await page.evaluate(() => window.advanceTime(1200));
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "04-auto-random-research-loading.png") });
  await page.evaluate(() => window.advanceTime(1300));
  current = await gameState();
  if (current.recipes.research !== null || current.recipes.reveal?.result !== "failure"
    || current.recipes.reveal?.recipeName !== "괴식" || current.metrics.failedRecipeResearches !== 2) {
    throw new Error(`Automatic random fallback did not become a weird dish: ${JSON.stringify(current.recipes)}`);
  }
  await page.waitForFunction(() => {
    const image = document.querySelector(".recipe-reveal-dish img");
    return image?.complete && image.naturalWidth > 0;
  });
  await page.waitForTimeout(150);
  await page.locator("#recipe-reveal").screenshot({ path: path.join(out, "05-auto-random-weird-dish.png") });

  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log("RECIPE_RESEARCH_WEIRD_DISH_OK manualFailureConsumes=true autoSuccessUsesLoading=true autoNoRecipe=randomThenWeirdDish duration=2.4s");
} finally {
  await browser.close();
}
