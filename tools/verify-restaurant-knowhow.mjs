import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "restaurant-knowhow");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const saveKey = "chick-bistro-planning-prototype-v2";

async function upgrade(id, levels = 1) {
  for (let index = 0; index < levels; index += 1) {
    await page.locator(`[data-action="knowhow-select"][data-skill-id="${id}"]`).click();
    await page.locator(`[data-action="knowhow-upgrade"][data-skill-id="${id}"]`).click();
  }
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  const nav = await page.locator(".nav-button").evaluateAll((buttons) => buttons.map((button) => button.dataset.screen));
  if (nav.join(",") !== "theme,recipe,collection,knowhow") throw new Error(`Bottom navigation order is wrong: ${nav}`);
  await page.locator('[data-screen="knowhow"]').click();
  let current = await gameState();
  if (current.currentScreen !== "knowhow" || current.knowhow.nodes.length !== 9 || current.knowhow.graphPresentation !== "connected-mind-map") {
    throw new Error(`Knowhow map did not render: ${JSON.stringify(current.knowhow)}`);
  }
  const preservedScroll = await page.evaluate(() => {
    const viewport = document.querySelector(".knowhow-map-viewport");
    viewport.scrollLeft = 190;
    viewport.scrollTop = 175;
    const before = { left: viewport.scrollLeft, top: viewport.scrollTop };
    document.querySelector('[data-action="knowhow-select"][data-skill-id="offline_bonus"]').click();
    const next = document.querySelector(".knowhow-map-viewport");
    return { before, after: { left: next.scrollLeft, top: next.scrollTop } };
  });
  if (preservedScroll.before.left !== preservedScroll.after.left || preservedScroll.before.top !== preservedScroll.after.top) {
    throw new Error(`Knowhow map jumped after selecting a node: ${JSON.stringify(preservedScroll)}`);
  }
  await page.screenshot({ path: path.join(out, "01-knowhow-map.png"), fullPage: true });

  await page.locator("#menu-close-btn").click();
  await page.locator("#debug-toggle-btn").click();
  await page.locator("#debug-install-all-btn").click();
  const invalidPair = await page.evaluate((key) => {
    const config = window.CHICK_CONFIG;
    const signatures = new Set(config.RECIPE_PROGRESSION.map((route) => {
      const count = Number(route.ingredientCount || route.ingredientRequirements.length);
      if (count !== 2) return "";
      const base = Math.floor(count / route.ingredientRequirements.length);
      const remainder = count % route.ingredientRequirements.length;
      return route.ingredientRequirements.flatMap((ingredient, index) => Array(base + (index < remainder ? 1 : 0)).fill(Number(ingredient.id))).sort((a, b) => a - b).join(",");
    }));
    const ids = Object.values(config.GAME_INGREDIENTS).map((ingredient) => Number(ingredient.id));
    let pair = null;
    for (const first of ids) {
      for (const second of ids) {
        const candidate = [first, second].sort((a, b) => a - b);
        if (!signatures.has(candidate.join(","))) { pair = candidate; break; }
      }
      if (pair) break;
    }
    const saved = JSON.parse(localStorage.getItem(key));
    saved.knowhow.xp = 80;
    saved.knowhow.points = 0;
    saved.crafting.ingredients[pair[0]] = 5;
    saved.crafting.ingredients[pair[1]] = 5;
    saved.crafting.storageCapacity = Math.max(saved.crafting.storageCapacity, 20);
    saved.tutorial = { activeId: null, seen: ["welcome", "recipe-unlocked", "drops-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
    return pair;
  }, saveKey);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  for (const ingredientId of invalidPair) await page.locator(`[data-action="select-ingredient"][data-id="${ingredientId}"]`).first().click();
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(3000));
  current = await gameState();
  if (current.knowhow.xp !== 0 || current.knowhow.points !== 1 || current.metrics.failedRecipeResearches < 1) {
    throw new Error(`Weird-dish research did not grant knowhow XP: ${JSON.stringify({ knowhow: current.knowhow, failed: current.metrics.failedRecipeResearches })}`);
  }

  await page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key));
    saved.knowhow.points = 20;
    localStorage.setItem(key, JSON.stringify(saved));
  }, saveKey);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="knowhow"]').click();
  await upgrade("drop_bonus");
  await upgrade("auto_collect");
  await upgrade("auto_order", 2);
  await upgrade("auto_promotion");
  await upgrade("cooking_speed", 2);
  await upgrade("research_speed");
  await upgrade("offline_bonus");
  await upgrade("contest_prize");
  current = await gameState();
  if (Math.abs(current.knowhow.effects.ingredientDropChance - .18) > .0001
    || current.knowhow.effects.buffetOfflineCapSeconds !== 10800
    || current.knowhow.effects.contestPrizeMultiplier !== 1.1
    || current.knowhow.automation.promotionInterval !== 30) {
    throw new Error(`Knowhow effects are not connected: ${JSON.stringify(current.knowhow)}`);
  }
  await page.screenshot({ path: path.join(out, "02-upgraded-branches.png"), fullPage: true });

  await page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key));
    const leaf = window.CHICK_CONFIG.GAME_INGREDIENTS.leaf.id;
    saved.ingredientDrops = [{ id: "knowhow-drop", ingredientId: leaf, emoji: "🍃", items: [{ ingredientId: leaf, count: 1 }], totalCount: 1, x: 200, y: 300 }];
    saved.payments = [{ id: "knowhow-pay", seatId: "test", x: 220, y: 320, amount: 77, models: 1 }];
    saved.metrics.autoCollected = 0;
    saved.metrics.autoOrders = 0;
    saved.metrics.autoPromotions = 0;
    saved.knowhow.automation = { collectElapsed: 0, orderElapsed: 0, promotionElapsed: 0 };
    saved.tutorial.activeId = null;
    localStorage.setItem(key, JSON.stringify(saved));
  }, saveKey);
  await page.reload({ waitUntil: "load" });
  await page.evaluate(() => window.advanceTime(40000));
  current = await gameState();
  if (current.ingredientDrops.length || current.payments.length || current.metrics.autoCollected < 2
    || current.metrics.autoPromotions < 1 || current.metrics.autoOrders < 1) {
    throw new Error(`Automation did not operate the restaurant: ${JSON.stringify({ drops: current.ingredientDrops, payments: current.payments, promotion: current.promotion, metrics: current.metrics })}`);
  }
  await page.locator('[data-screen="knowhow"]').click();
  await page.screenshot({ path: path.join(out, "03-automation-running.png"), fullPage: true });

  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  console.log(`RESTAURANT_KNOWHOW_OK xp=research${current.knowhow.xpRewards.recipeResearchSuccessOrFailure}/meal${current.knowhow.xpRewards.guestMealCooking} nodes=${current.knowhow.nodes.length} auto=collect+order+promotion drop=${Math.round(current.knowhow.effects.ingredientDropChance * 100)}% offline=${current.knowhow.effects.buffetOfflineCapSeconds / 3600}h contest=x${current.knowhow.effects.contestPrizeMultiplier}`);
} finally {
  await browser.close();
}
