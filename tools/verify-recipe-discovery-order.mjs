import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "recipe-discovery-order");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const visibleCatalogOrder = () => page.locator(".recipe-catalog-card").evaluateAll((cards) => cards
  .map((card) => Number(card.dataset.recipeId)));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();
  const ingredients = await page.evaluate(() => ({
    bread: window.CHICK_CONFIG.GAME_INGREDIENTS.bread,
    tomato: window.CHICK_CONFIG.GAME_INGREDIENTS.tomato,
  }));
  await page.evaluate(({ bread, tomato }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = { [bread.id]: 1, [tomato.id]: 1 };
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, ingredients);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();

  const expectedFirstTwelve = [1, 20014, 10001, 2, 20015, 20016, 20002, 20003, 20004, 20001, 20005, 20017];
  let current = await gameState();
  let uiOrder = await visibleCatalogOrder();
  if (current.recipes.catalogSort !== "earliest-ingredient-discovery-stage"
    || JSON.stringify(current.recipes.catalogOrder.slice(0, 12)) !== JSON.stringify(expectedFirstTwelve)
    || JSON.stringify(uiOrder.slice(0, 12)) !== JSON.stringify(expectedFirstTwelve)) {
    throw new Error(`Recipe catalog is not sorted by expected discovery stage: ${JSON.stringify(current.recipes.catalogOrder.slice(0, 12))}`);
  }
  const fifthCardText = await page.locator('.recipe-catalog-card[data-recipe-id="20002"]').innerText();
  if (!fifthCardText.includes("NO.07")) throw new Error(`Tomato sandwich is not seventh in discovery order: ${fifthCardText}`);
  await page.locator('.recipe-catalog-card[data-recipe-id="1"]').scrollIntoViewIfNeeded();
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "01-earliest-recipes-first.png") });

  await page.locator(`[data-action="select-ingredient"][data-id="${ingredients.bread.id}"]`).click();
  await page.locator(`[data-action="select-ingredient"][data-id="${ingredients.tomato.id}"]`).click();
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  await page.locator('[data-action="dismiss-recipe-reveal"]').click();
  current = await gameState();
  uiOrder = await visibleCatalogOrder();
  if (current.recipes.levels["20002"] !== 1
    || JSON.stringify(current.recipes.catalogOrder.slice(0, 12)) !== JSON.stringify(expectedFirstTwelve)
    || JSON.stringify(uiOrder.slice(0, 12)) !== JSON.stringify(expectedFirstTwelve)) {
    throw new Error("Discovery changed the fixed expected-discovery catalog order");
  }
  await page.locator('.recipe-catalog-card[data-recipe-id="20002"]').scrollIntoViewIfNeeded();
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "02-order-kept-after-discovery.png") });

  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log("RECIPE_DISCOVERY_ORDER_OK first=salad/sprout-salad/mushroom-pancake/sandwich fixed-after-discovery=true");
} finally {
  await browser.close();
}
