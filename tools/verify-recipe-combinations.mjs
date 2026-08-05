import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "recipe-combinations-sensible");
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
    const middle = window.CHICK_CONFIG.CORE_PROGRESSION.find((route) => route.recipeName === "볶음밥");
    const late = window.CHICK_CONFIG.CORE_PROGRESSION.find((route) => route.recipeName === "스테이크");
    const sunflower = window.CHICK_CONFIG.CORE_PROGRESSION.find((route) => route.recipeName === "해바라기 씨앗 파이");
    return { early, middle, late, sunflower };
  });
  if (routeInfo.early.ingredientRequirements.length !== 1 || routeInfo.early.ingredientRequirements[0].id !== 30039
    || routeInfo.middle.ingredientRequirements.length !== 4
    || routeInfo.late.ingredientRequirements.length !== 5) {
    throw new Error(`Ingredient tiers are incorrect: ${JSON.stringify(routeInfo)}`);
  }
  const sensibleExamples = await page.evaluate(() => {
    const routes = window.CHICK_CONFIG.CORE_PROGRESSION;
    const ingredients = (name) => routes.find((route) => route.recipeName === name)?.ingredientRequirements.map((item) => item.name);
    return {
      sandwich: ingredients("샌드위치"),
      friedRice: ingredients("볶음밥"),
      porkCutlet: ingredients("돈까스"),
      steak: ingredients("스테이크"),
      sunflowerPie: ingredients("해바라기 씨앗 파이"),
      originalRecipeCount: window.CHICK_CONFIG.RECIPE_NAMES.filter((name) => routes.some((route) => route.recipeName === name)).length,
      themedNames: routes.filter((route) => /^(돌|나무|목욕탕|우주 점성술) /.test(route.recipeName)).map((route) => route.recipeName),
    };
  });
  if (JSON.stringify(sensibleExamples.sandwich) !== JSON.stringify(["빵", "나뭇잎"])
    || JSON.stringify(sensibleExamples.friedRice) !== JSON.stringify(["쌀", "식용유", "모둠 채소", "달걀"])
    || JSON.stringify(sensibleExamples.porkCutlet) !== JSON.stringify(["돼지고기", "빵가루", "식용유", "양배추"])
    || JSON.stringify(sensibleExamples.steak) !== JSON.stringify(["소고기", "로즈마리", "버터", "마늘", "후추"])
    || JSON.stringify(sensibleExamples.sunflowerPie) !== JSON.stringify(["해바라기씨", "밀가루", "버터"])
    || sensibleExamples.originalRecipeCount !== 40
    || sensibleExamples.themedNames.length) {
    throw new Error(`Recipe concepts are not ingredient-driven: ${JSON.stringify(sensibleExamples)}`);
  }

  await page.evaluate(({ middle }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const stoneRows = window.CHICK_TABLE_SOURCE.ThemeFacility.filter((row) => row.areaType === 1 && row.facilityTheme === 1);
    const targetRows = window.CHICK_TABLE_SOURCE.ThemeFacility.filter((row) => row.areaType === 1 && row.facilityTheme === middle.themeId);
    const countertop = window.CHICK_TABLE_SOURCE.InstallFacility.find((row) => Number(row.areaType) === 1 && Number(row.facilityType) === 8);
    saved.installed = [...new Set([...saved.installed, countertop.id])];
    saved.themes.opened = [...stoneRows.map((row) => row.id), ...targetRows.slice(0, Math.ceil(targetRows.length * .7)).map((row) => row.id)];
    saved.ownedRecipes = {
      1: { level: 1, stack: 0, codexClaimed: true },
      2: { level: 1, stack: 0, codexClaimed: true },
      10001: { level: 1, stack: 0, codexClaimed: true },
      20001: { level: 1, stack: 0, codexClaimed: true },
    };
    saved.crafting.ingredients = Object.fromEntries(middle.ingredientRequirements.map((ingredient) => [ingredient.id, 1]));
    saved.crafting.bowlCapacity = 4;
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, routeInfo);
  await page.reload({ waitUntil: "load" });

  let current = await state();
  const requirements = current.recipes.craftRequirements[routeInfo.middle.recipeId];
  if (current.recipes.combinationCapacity !== 4 || requirements?.length !== 4 || !current.recipes.craftable.includes(routeInfo.middle.recipeId)) {
    throw new Error(`Four-slot recipe is not craftable: ${JSON.stringify({ requirements, recipes: current.recipes })}`);
  }
  await page.locator('[data-screen="recipe"]').click();
  await page.waitForTimeout(200);
  for (const requirement of routeInfo.middle.ingredientRequirements) {
    await page.locator(`[data-action="select-ingredient"][data-id="${requirement.id}"]`).click();
  }
  if (!await page.locator(".mixing-board .mixing-bowl").isVisible()
    || await page.locator(".combination-slots").count()
    || await page.locator(".bowl-ingredient").count() !== 4) {
    throw new Error("Recipe ingredients are not presented inside the cutting-board bowl");
  }
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "01-four-ingredient-ready.png") });
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  current = await state();
  if (!current.progression.craftedRecipes.includes(routeInfo.middle.recipeId)
    || requirements.some((requirement) => Number(current.progression.ingredients[requirement.ingredientId] || 0) !== 0)) {
    throw new Error("Three-ingredient recipe did not consume the complete combination");
  }
  const reveal = page.locator("#recipe-reveal");
  if (!await reveal.isVisible() || !(await reveal.innerText()).includes("새 레시피 발견!") || !(await reveal.innerText()).includes("볶음밥")) {
    throw new Error("New recipe celebration reveal did not appear");
  }
  if (await page.locator(".recipe-reveal-rays").count() !== 1 || await page.locator(".recipe-upgrade-card").count()) {
    throw new Error("New recipe discovery no longer uses the brighter celebration reveal");
  }
  await page.waitForFunction(() => [...document.querySelectorAll("#recipe-reveal img")].every((image) => image.complete));
  await page.waitForTimeout(700);
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "02-four-ingredient-crafted.png") });

  await page.evaluate((route) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = Object.fromEntries(route.ingredientRequirements.map((ingredient) => [ingredient.id, 1]));
    saved.crafting.bowlCapacity = 5;
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, routeInfo.sunflower);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  for (const ingredient of routeInfo.sunflower.ingredientRequirements) {
    await page.locator(`[data-action="select-ingredient"][data-id="${ingredient.id}"]`).click();
  }
  await page.screenshot({ path: path.join(out, "03-sunflower-seed-pie-ready.png"), fullPage: true });
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  current = await state();
  if (current.recipes.levels[routeInfo.sunflower.recipeId] !== 1) {
    throw new Error("Sunflower seed pie was not discovered from seed, flour, and butter");
  }

  await page.evaluate((route) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = Object.fromEntries(route.ingredientRequirements.map((ingredient) => [ingredient.id, 1]));
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, routeInfo.late);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  current = await state();
  if (current.recipes.combinationCapacity !== 5) throw new Error(`Five-slot bowl did not unlock: ${current.recipes.combinationCapacity}`);
  for (const ingredient of routeInfo.late.ingredientRequirements) {
    await page.locator(`[data-action="select-ingredient"][data-id="${ingredient.id}"]`).click();
  }
  if (await page.locator(".bowl-ingredient").count() !== 5) throw new Error("Five ingredients were not placed in the bowl");
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "04-five-ingredient-steak-ready.png") });
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  current = await state();
  if (current.recipes.levels[routeInfo.late.recipeId] !== 1 || current.recipes.reveal?.recipeName !== "스테이크") {
    throw new Error("Five-ingredient steak was not discovered");
  }
  await page.locator("#recipe-reveal").screenshot({ path: path.join(out, "05-five-ingredient-steak-discovered.png") });

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("RECIPE_COMBINATIONS_OK recipes=64 costs=2/3/4/5 friedRice=4 steak=5 sunflowerPie=3");
} finally {
  await browser.close();
}
