import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "recipe-price-progression");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

const expectedEarlyPrices = {
  1: 40,
  20014: 45,
  10001: 48,
  2: 52,
  20015: 50,
  20016: 52,
  20002: 54,
  20003: 56,
  20004: 56,
  20001: 60,
  20005: 72,
  20017: 65,
  20018: 68,
  20019: 78,
  10021: 80,
};

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();
  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.installed = window.CHICK_TABLE_SOURCE.InstallFacility.filter((row) => Number(row.areaType) === 1).map((row) => row.id);
    saved.ownedRecipes = Object.fromEntries(window.CHICK_CONFIG.RECIPE_PROGRESSION
      .map((route) => [route.recipeId, { level: 1, stack: 0, codexClaimed: true }]));
    saved.tutorial = { activeId: null, seen: ["welcome", "recipe-unlocked", "drops-unlocked", "special-promotion-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });

  const current = await gameState();
  for (const [recipeId, expected] of Object.entries(expectedEarlyPrices)) {
    if (current.recipes.prices[recipeId] !== expected) {
      throw new Error(`Early recipe price mismatch ${recipeId}: expected ${expected}, got ${current.recipes.prices[recipeId]}`);
    }
  }

  const floorFailures = await page.evaluate(() => window.CHICK_CONFIG.RECIPE_PROGRESSION
    .filter((route) => !route.hasPrototypePriceOverride)
    .map((route) => ({
      recipeId: route.recipeId,
      name: route.recipeName,
      minimum: route.minimumFoodPrice,
    })))
    .then((routes) => routes.filter((route) => current.recipes.prices[route.recipeId] < route.minimum));
  if (floorFailures.length) throw new Error(`Recipe price floor failures: ${JSON.stringify(floorFailures)}`);

  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-tab="owned"]').click();
  const visibleText = await page.locator("#menu-content").innerText();
  if (!visibleText.includes("현재 가격 40") || !visibleText.includes("현재 가격 52")) {
    throw new Error("Balanced prices are missing from owned recipe cards");
  }
  await page.screenshot({ path: path.join(out, "01-balanced-early-prices.png"), fullPage: true });

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify({
    earlyPrices: Object.fromEntries(Object.keys(expectedEarlyPrices).map((id) => [id, current.recipes.prices[id]])),
    floorFailures,
  }, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`RECIPE_PRICE_PROGRESSION_OK early=${Object.keys(expectedEarlyPrices).length} floorFailures=0 salad=40 next=45 smile=80`);
} finally {
  await browser.close();
}
