import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, "src", "game-config.js"), "utf8"), { filename: "src/game-config.js" });
const { CORE_PROGRESSION, RECIPE_PROGRESSION, GAME_INGREDIENTS } = globalThis.CHICK_CONFIG;

const baseChick = CORE_PROGRESSION.find((route) => route.themeId === 1 && route.slot === 0);
const mushroomChick = CORE_PROGRESSION.find((route) => route.themeId === 1 && route.slot === 1);
const sproutSalad = RECIPE_PROGRESSION.find((route) => route.recipeId === 20014);
if (JSON.stringify(baseChick.rewardIngredients.map((ingredient) => ingredient.name)) !== JSON.stringify(["나뭇잎", "양상추", "토마토"])) {
  throw new Error("The base chick no longer drops lettuce as its secondary ingredient");
}
if (JSON.stringify(mushroomChick.rewardIngredients.map((ingredient) => ingredient.name)) !== JSON.stringify(["버섯", "밀가루", "고기"])) {
  throw new Error("Mushroom/flour early drop weights are not balanced to 50/30");
}
if (!sproutSalad
  || JSON.stringify(sproutSalad.ingredientRequirements.map((ingredient) => ingredient.name)) !== JSON.stringify(["나뭇잎", "양상추"])) {
  throw new Error("The early lettuce recipe is missing");
}

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "early-lettuce-and-flour-balance");
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
  await page.evaluate(({ leafId, lettuceId }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = { [leafId]: 1, [lettuceId]: 1 };
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, { leafId: GAME_INGREDIENTS.leaf.id, lettuceId: GAME_INGREDIENTS.lettuce.id });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  const card = page.locator('.recipe-catalog-card[data-recipe-id="20014"]');
  if (!(await card.innerText()).includes("NO.02")) throw new Error("Sprout salad is not placed at the beginning of the catalog");
  await page.locator(`[data-action="select-ingredient"][data-id="${GAME_INGREDIENTS.leaf.id}"]`).click();
  await page.locator(`[data-action="select-ingredient"][data-id="${GAME_INGREDIENTS.lettuce.id}"]`).click();
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(1200));
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "01-lettuce-research.png") });
  await page.evaluate(() => window.advanceTime(1300));
  const current = await gameState();
  if (current.recipes.levels["20014"] !== 1 || current.ingredientStorage.totalItems !== 0
    || current.recipes.reveal?.recipeName !== "새싹 샐러드") {
    throw new Error(`Early lettuce was not consumed by sprout salad: ${JSON.stringify(current.recipes)}`);
  }
  await page.waitForFunction(() => {
    const image = document.querySelector(".recipe-reveal-dish img");
    return image?.complete && image.naturalWidth > 0;
  });
  await page.waitForTimeout(150);
  await page.locator("#recipe-reveal").screenshot({ path: path.join(out, "02-sprout-salad-discovered.png") });
  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log("EARLY_LETTUCE_FLOUR_BALANCE_OK lettuce=sprout-salad mushroom/flour=50/30");
} finally {
  await browser.close();
}
