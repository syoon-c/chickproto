import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "cooking-price-balance");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });

  const recipes = await page.evaluate(() => window.CHICK_CONFIG.RECIPE_PROGRESSION.map((route) => {
    const recipe = window.getRecipe(route.recipeId);
    return {
      id: route.recipeId,
      name: route.recipeName,
      price: Number(recipe.foodPrice),
      inheritedCookTime: Number(recipe.cookTime),
      duration: window.baseRecipeCookingDuration(recipe),
    };
  }));
  const sorted = [...recipes].sort((a, b) => a.price - b.price || a.duration - b.duration);
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].price > sorted[index - 1].price && sorted[index].duration < sorted[index - 1].duration) {
      throw new Error(`Cooking time decreased as price increased: ${JSON.stringify([sorted[index - 1], sorted[index]])}`);
    }
  }
  const salad = recipes.find((recipe) => recipe.id === 1);
  const mushroomPancake = recipes.find((recipe) => recipe.id === 10001);
  if (salad?.price !== 40 || salad.duration !== 4) throw new Error(`Salad cooking balance changed unexpectedly: ${JSON.stringify(salad)}`);
  if (mushroomPancake?.price !== 48 || mushroomPancake.duration !== 4.5 || mushroomPancake.inheritedCookTime !== 21) {
    throw new Error(`Mushroom pancake still follows its reused icon's cooking time: ${JSON.stringify(mushroomPancake)}`);
  }

  await page.locator("#debug-toggle-btn").click();
  await page.locator("#debug-install-all-btn").click();
  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.ownedRecipes = {
      1: { level: 1, stack: 0, codexClaimed: true },
      10001: { level: 1, stack: 0, codexClaimed: true },
    };
    saved.tutorial = { activeId: null, seen: ["welcome", "drops-unlocked", "recipe-unlocked"] };
    saved.guests = [{
      id: 9001,
      customerId: 3,
      commonId: 1001,
      customerName: "기본 병아리",
      state: "waiting_food",
      seatId: "test-seat",
      tableId: 1,
      x: 240,
      y: 430,
      targetX: 240,
      targetY: 430,
      recipeId: 10001,
      wait: 0,
      stateTime: 0,
      mood: "normal",
      bob: 0,
    }];
    saved.orders = [{ guestId: 9001, recipeId: 10001, orderedAt: saved.clock }];
    saved.cooking = [];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.evaluate(() => window.advanceTime(100));
  let state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  if (state.cooking.length !== 1 || state.cooking[0].recipe !== "버섯전" || state.cooking[0].duration !== 4.5) {
    throw new Error(`Actual cooking task did not use price-derived duration: ${JSON.stringify(state.cooking)}`);
  }
  if (state.recipes.cookingTimeRule.pricePerSecond !== 20
    || state.recipes.cookingTimes[10001].baseDuration !== 4.5) {
    throw new Error(`Cooking rule is missing from text state: ${JSON.stringify(state.recipes.cookingTimeRule)}`);
  }

  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-tab="owned"]').click();
  const menuText = await page.locator("#menu-content").innerText();
  if (!menuText.includes("버섯전") || !menuText.includes("조리 4.5초")) throw new Error("Owned recipe UI does not show cooking duration");
  await page.screenshot({ path: path.join(out, "01-price-linked-times.png"), fullPage: true });
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(state, null, 2));
  fs.writeFileSync(path.join(out, "recipe-times.json"), JSON.stringify(recipes, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  const highest = sorted.at(-1);
  console.log(`COOKING_PRICE_BALANCE_OK recipes=${recipes.length} salad=40/4s mushroom=48/4.5s highest=${highest.price}/${highest.duration}s`);
} finally {
  await browser.close();
}
