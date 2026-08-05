import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "gem-bowl-capacity");
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

  let current = await gameState();
  if (current.recipes.combinationCapacity !== 2
    || current.recipes.combinationCapacityGrowth !== "gem-upgrade-only"
    || current.recipes.combinationCapacityMax !== 5) {
    throw new Error(`New-game bowl capacity mismatch: ${JSON.stringify(current.recipes)}`);
  }

  const ingredientIds = await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const countertop = window.CHICK_TABLE_SOURCE.InstallFacility.find((row) => Number(row.areaType) === 1 && Number(row.facilityType) === 8);
    const recipeIds = window.CHICK_CONFIG.RECIPE_PROGRESSION.slice(0, 6).map((route) => Number(route.recipeId));
    const ids = Object.values(window.CHICK_CONFIG.GAME_INGREDIENTS).slice(0, 5).map((ingredient) => Number(ingredient.id));
    saved.installed = [...new Set([...saved.installed, countertop.id])];
    saved.ownedRecipes = Object.fromEntries(recipeIds.map((id) => [id, { level: 1, stack: 0, codexClaimed: false }]));
    saved.crafting.ingredients = Object.fromEntries(ids.map((id) => [id, 5]));
    saved.crafting.bowlCapacity = 2;
    saved.resources.gems = 30;
    saved.tutorial = { activeId: null, seen: ["welcome"] };
    localStorage.setItem(key, JSON.stringify(saved));
    return ids;
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();

  current = await gameState();
  if (current.recipes.owned < 6 || current.recipes.combinationCapacity !== 2) {
    throw new Error(`Recipe discovery still changed bowl capacity: owned=${current.recipes.owned} capacity=${current.recipes.combinationCapacity}`);
  }
  const expand = page.locator('[data-action="expand-bowl-capacity"]');
  if (await expand.isDisabled() || !(await expand.innerText()).includes("10") || !(await expand.innerText()).includes("+1칸")) {
    throw new Error("Bowl expansion control is missing or has the wrong cost");
  }
  await page.screenshot({ path: path.join(out, "01-two-slot-bowl.png"), fullPage: true });

  for (let capacity = 3; capacity <= 5; capacity += 1) {
    await page.locator('[data-action="expand-bowl-capacity"]').click();
    current = await gameState();
    const expectedGems = (5 - capacity) * 10;
    if (current.recipes.combinationCapacity !== capacity || current.resources.gems !== expectedGems) {
      throw new Error(`Expansion mismatch at ${capacity}: gems=${current.resources.gems} capacity=${current.recipes.combinationCapacity}`);
    }
  }
  if (!await page.locator('[data-action="expand-bowl-capacity"]').isDisabled()
    || !(await page.locator('[data-action="expand-bowl-capacity"]').innerText()).includes("최대 용량")) {
    throw new Error("Maximum-capacity state is incorrect");
  }

  for (const ingredientId of ingredientIds) {
    await page.locator(`[data-action="select-ingredient"][data-id="${ingredientId}"]`).click();
  }
  current = await gameState();
  if (current.recipes.selectedIngredients.length !== 5) throw new Error("Expanded bowl did not accept five ingredients");
  await page.screenshot({ path: path.join(out, "02-five-slot-bowl.png"), fullPage: true });

  await page.reload({ waitUntil: "load" });
  current = await gameState();
  if (current.recipes.combinationCapacity !== 5 || current.resources.gems !== 0) {
    throw new Error("Bowl capacity or gem spend did not persist after reload");
  }

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.version = 11;
    delete saved.crafting.bowlCapacity;
    saved.ownedRecipes = Object.fromEntries(Object.entries(saved.ownedRecipes).slice(0, 4));
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  current = await gameState();
  if (current.recipes.combinationCapacity !== 4) {
    throw new Error(`Legacy bowl capacity was not preserved during migration: ${current.recipes.combinationCapacity}`);
  }

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("GEM_BOWL_CAPACITY_OK initial=2 cost=10 increment=1 max=5 recipesDoNotGrow=true persistence=true legacy=preserved");
} finally {
  await browser.close();
}
