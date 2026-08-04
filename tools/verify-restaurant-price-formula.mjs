import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "restaurant-price-formula");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const readState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function configureSale(mood, guestState) {
  await page.evaluate(async ({ moodValue, stateValue }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const loadedTables = await window.ChickData.loadTables();
    const pricedThemeRows = loadedTables.restaurantThemes
      .filter((row) => Number(row.abilityValue || 0) > 0)
      .slice(0, 2);
    const tipbox = loadedTables.installs.find((row) => Number(row.facilityType) === 3);
    if (pricedThemeRows.length !== 2) throw new Error("Need two RestaurantPriceUp theme rows");
    if (!tipbox) throw new Error("Need a tipbox install row");
    saved.themes.opened = [...new Set([...saved.themes.opened, ...pricedThemeRows.map((row) => row.id)])];
    saved.installed = [...new Set([...saved.installed, tipbox.id])];
    saved.ownedRecipes = {
      1: { level: 2, stack: 0, codexClaimed: true },
      2: { level: 1, stack: 0, codexClaimed: true },
      10001: { level: 1, stack: 0, codexClaimed: true },
      20001: { level: 1, stack: 0, codexClaimed: true },
      20002: { level: 1, stack: 0, codexClaimed: true },
      20003: { level: 1, stack: 0, codexClaimed: true },
    };
    saved.performance = { cooldown: 0, activeId: 1, remaining: 60 };
    saved.guests = [{
      id: `formula-${stateValue}`, customerId: 3, commonId: 1, recipeId: 1, visitNumber: 1,
      seatId: `formula-${stateValue}-seat`, tableId: 0, x: 240, y: 430, targetX: 240, targetY: 900,
      wait: 0, state: stateValue, stateTime: 0, mood: moodValue, bob: 0,
    }];
    saved.payments = [];
    saved.ingredientDrops = [];
    saved.tipbox = 0;
    localStorage.setItem(key, JSON.stringify(saved));
  }, { moodValue: mood, stateValue: guestState });
  await page.reload({ waitUntil: "load" });
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  await configureSale("satisfied", "eating");
  let before = await readState();
  const multipliers = before.recipes.salePriceMultipliers;
  const expectedHappy = Math.round(44
    * multipliers.restaurantPriceUp
    * multipliers.satisfactionHappy
    * multipliers.performanceBuff);
  await page.evaluate(() => window.advanceTime(7100));
  let after = await readState();
  if (before.recipes.salePriceFormula !== "recipeLevelPrice*restaurantPriceUp*satisfaction*performanceBuff"
    || multipliers.restaurantPriceUp <= 1
    || multipliers.satisfactionHappy !== 1.5
    || multipliers.performanceBuff !== 1.2
    || after.payments[0]?.amount !== expectedHappy
    || after.tipbox !== Math.round(expectedHappy * .1)
    || after.tipRule?.basis !== "final-meal-price"
    || after.tipRule?.rate !== .1) {
    throw new Error(`Happy payment formula mismatch: ${JSON.stringify({ before: before.recipes, payments: after.payments, expectedHappy })}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "01-multiplied-happy-payment.png") });

  await configureSale("disappointed", "disappointed");
  before = await readState();
  const expectedDisappointed = Math.round(44
    * before.recipes.salePriceMultipliers.restaurantPriceUp
    * before.recipes.salePriceMultipliers.satisfactionNormal
    * before.recipes.salePriceMultipliers.performanceBuff);
  await page.evaluate(() => window.advanceTime(6100));
  after = await readState();
  if (after.payments[0]?.amount !== expectedDisappointed) {
    throw new Error(`Disappointed payment formula mismatch: ${JSON.stringify({ payments: after.payments, expectedDisappointed })}`);
  }

  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-tab="owned"]').click();
  const ownedText = await page.locator("#menu-content").innerText();
  if (!ownedText.includes("발견한 레시피 6") || ownedText.includes("전체 수익")) {
    throw new Error(`Removed collection bonus is still advertised: ${ownedText}`);
  }
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "02-owned-recipes-no-collection-bonus.png") });

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(after, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`RESTAURANT_PRICE_FORMULA_OK happy=${expectedHappy} tip=${Math.round(expectedHappy * .1)} disappointed=${expectedDisappointed} restaurant=${multipliers.restaurantPriceUp} satisfaction=${multipliers.satisfactionHappy} performance=${multipliers.performanceBuff}`);
} finally {
  await browser.close();
}
