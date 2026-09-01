import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "known-recipe-combinations");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => typeof window.render_game_to_text === "function");

  await page.locator('[data-screen="theme"]').click();
  await page.locator("#menu-close-btn").click();
  await page.evaluate(async () => {
    const key = "chick-bistro-planning-prototype-v2";
    const tables = await window.ChickData.loadTables();
    const saved = JSON.parse(localStorage.getItem(key));
    const countertopId = tables.installs.find((row) => Number(row.facilityType) === 8)?.id;
    saved.installed = [...new Set([...saved.installed, countertopId].filter(Boolean))];
    saved.ownedRecipes[2] = { level: 1, stack: 0, codexClaimed: false };
    saved.ownedRecipes[3] = { level: 1, stack: 0, codexClaimed: false };
    saved.crafting.ingredients = { 30067: 5, 30153: 5, 30008: 5 };
    saved.resources.ideas = 5;
    saved.tutorial = { activeId: null, seen: ["welcome", "recipe-unlocked", "fridge-next", "drops-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));

  await page.locator('[data-screen="recipe"]').click();
  await page.locator(".mixing-board").click();
  const picker = page.locator(".recipe-ingredient-dialog");
  await picker.waitFor({ state: "visible" });

  let state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  if (await picker.locator(".recipe-picker-known-recipes").count() !== 0
    || state.recipes.knownCombinationGuide.visible
    || state.recipes.knownCombinationGuide.recipeCount !== 0) {
    throw new Error("Known recipe appeared before an exact ingredient combination was selected.");
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "01-empty-no-preview.png") });

  await picker.locator('[data-action="select-ingredient"][data-id="30008"]').click();
  state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  if (state.recipes.selectedIngredients.join(",") !== "30008"
    || state.recipes.knownCombinationGuide.visible
    || await picker.locator(".recipe-picker-known-recipes").count() !== 0) {
    throw new Error("A partial ingredient selection incorrectly revealed a known recipe.");
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "02-partial-no-preview.png") });

  await picker.locator('[data-action="select-ingredient"][data-id="30067"]').click();
  state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const guide = picker.locator(".recipe-picker-known-recipes");
  const cards = guide.locator(".recipe-picker-known-card");
  if (state.recipes.selectedIngredients.join(",") !== "30008,30067"
    || !state.recipes.knownCombinationGuide.visible
    || state.recipes.knownCombinationGuide.trigger !== "exact-selected-combination-only"
    || state.recipes.knownCombinationGuide.recipeCount !== 1
    || await cards.count() !== 1
    || !(await cards.first().innerText()).includes("삶은 고기")
    || (await cards.first().innerText()).includes("???")) {
    throw new Error(`Exact known combination did not reveal its recipe: ${JSON.stringify(state.recipes.knownCombinationGuide)}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "03-exact-known-recipe.png") });

  await picker.locator('[data-action="remove-selected-ingredient"][data-id="30067"]').click();
  state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  if (state.recipes.knownCombinationGuide.visible || await picker.locator(".recipe-picker-known-recipes").count() !== 0) {
    throw new Error("Known recipe preview remained after the exact combination was broken.");
  }

  await picker.locator('[data-action="close-ingredient-picker"]').click();
  state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  if (state.recipes.knownCombinationGuide.visible || await page.locator(".recipe-picker-known-recipes").count() !== 0) {
    throw new Error("Known combination guide remained after closing the ingredient picker.");
  }

  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log("KNOWN_RECIPE_COMBINATIONS_OK exact-only=yes partial-hidden=yes recipe=삶은 고기");
} finally {
  await browser.close();
}
