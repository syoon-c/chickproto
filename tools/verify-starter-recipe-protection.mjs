import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "starter-recipe-learning");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const readState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function mix(ingredientIds) {
  for (const ingredientId of ingredientIds) {
    await page.locator(`[data-action="select-ingredient"][data-id="${ingredientId}"]`).click();
  }
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
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
  const info = await page.evaluate(() => ({
    leaf: window.CHICK_CONFIG.GAME_INGREDIENTS.leaf.id,
    lettuce: window.CHICK_CONFIG.GAME_INGREDIENTS.lettuce.id,
    bread: window.CHICK_CONFIG.GAME_INGREDIENTS.bread.id,
    rice: window.CHICK_CONFIG.GAME_INGREDIENTS.rice.id,
    sproutSalad: window.CHICK_CONFIG.RECIPE_PROGRESSION.find((route) => route.recipeName === "새싹 샐러드").recipeId,
  }));

  await page.locator('[data-screen="recipe"]').click();
  let current = await readState();
  if (current.progression.ingredients[info.leaf] !== 1
    || current.progression.ingredients[info.lettuce] !== 1
    || current.ingredientStorage.totalItems !== 2) {
    throw new Error(`Starter ingredients were not granted once: ${JSON.stringify(current)}`);
  }
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "01-starter-ingredients.png") });
  await page.reload({ waitUntil: "load" });
  current = await readState();
  if (current.progression.ingredients[info.leaf] !== 1
    || current.progression.ingredients[info.lettuce] !== 1
    || current.ingredientStorage.totalItems !== 2) {
    throw new Error(`Starter ingredients were granted more than once after reload: ${JSON.stringify(current.progression.ingredients)}`);
  }

  await page.evaluate(({ bread, rice }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = { [bread]: 1, [rice]: 1 };
    saved.crafting.selected = [];
    saved.crafting.hints = {};
    localStorage.setItem(key, JSON.stringify(saved));
  }, info);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  await mix([info.bread, info.rice]);
  current = await readState();
  if (current.recipes.reveal?.result !== "failure"
    || current.recipes.reveal?.recipeName !== "괴식"
    || current.metrics.failedRecipeResearches !== 1
    || current.metrics.recipeResearchAttempts !== 1
    || current.progression.ingredients[info.bread]
    || current.progression.ingredients[info.rice]
    || current.ingredientStorage.totalItems !== 0) {
    throw new Error(`First failure did not consume ingredients and make a weird dish: ${JSON.stringify(current)}`);
  }
  await page.waitForFunction(() => document.querySelector(".recipe-reveal-dish img")?.naturalWidth > 0);
  await page.locator("#recipe-reveal").screenshot({ path: path.join(out, "02-first-failure-consumes.png") });
  await page.locator('[data-action="dismiss-recipe-reveal"]').click();

  await page.evaluate(({ leaf, lettuce }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = { [leaf]: 1, [lettuce]: 1 };
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, info);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  await mix([info.leaf, info.lettuce]);
  current = await readState();
  if (current.recipes.reveal?.result !== "success"
    || current.recipes.reveal?.recipeId !== info.sproutSalad
    || current.recipes.owned !== 2) {
    throw new Error(`Starter combination did not discover sprout salad: ${JSON.stringify(current.recipes)}`);
  }
  await page.waitForFunction(() => document.querySelector(".recipe-reveal-dish img")?.naturalWidth > 0);
  await page.locator("#recipe-reveal").screenshot({ path: path.join(out, "03-first-new-recipe.png") });

  await page.locator('[data-action="dismiss-recipe-reveal"]').click();
  await page.evaluate(({ bread, rice }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = { [bread]: 1, [rice]: 1 };
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, info);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  await mix([info.bread, info.rice]);
  current = await readState();
  if (current.recipes.reveal?.result !== "failure"
    || current.metrics.failedRecipeResearches !== 2
    || current.ingredientStorage.totalItems !== 0) {
    throw new Error(`Later failure did not keep consuming ingredients: ${JSON.stringify(current)}`);
  }
  await page.waitForFunction(() => document.querySelector(".recipe-reveal-dish img")?.naturalWidth > 0);
  await page.locator("#recipe-reveal").screenshot({ path: path.join(out, "04-normal-weird-dish-after-discovery.png") });

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("STARTER_RECIPE_LEARNING_OK starter=leaf+lettuce firstFailure=consumed firstDiscovery=sproutSalad laterFailure=consumed");
} finally {
  await browser.close();
}
