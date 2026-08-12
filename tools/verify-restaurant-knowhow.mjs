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
  if (current.currentScreen !== "knowhow" || current.knowhow.nodes.length !== 48 || current.knowhow.graphPresentation !== "connected-mind-map"
    || current.knowhow.nodes.some((node) => node.maxLevel !== 1)) {
    throw new Error(`Knowhow map did not render: ${JSON.stringify(current.knowhow)}`);
  }
  await page.screenshot({ path: path.join(out, "01-knowhow-map.png"), fullPage: true });
  const preservedScroll = await page.evaluate(() => {
    const viewport = document.querySelector(".knowhow-map-viewport");
    viewport.scrollLeft = 190;
    viewport.scrollTop = 175;
    const before = { left: viewport.scrollLeft, top: viewport.scrollTop };
    document.querySelector('[data-action="knowhow-select"][data-skill-id="offline_bonus_1"]').click();
    const next = document.querySelector(".knowhow-map-viewport");
    return { before, after: { left: next.scrollLeft, top: next.scrollTop } };
  });
  if (preservedScroll.before.left !== preservedScroll.after.left || preservedScroll.before.top !== preservedScroll.after.top) {
    throw new Error(`Knowhow map jumped after selecting a node: ${JSON.stringify(preservedScroll)}`);
  }
  await page.screenshot({ path: path.join(out, "01b-scroll-preserved.png"), fullPage: true });

  await page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key));
    saved.version = 17;
    saved.knowhow.skills = { restaurant_basics: 1, auto_collect: 2, auto_order: 1, cooking_speed: 1, research_speed: 1 };
    saved.knowhow.selectedSkillId = "auto_collect";
    localStorage.setItem(key, JSON.stringify(saved));
  }, saveKey);
  await page.reload({ waitUntil: "load" });
  current = await gameState();
  const migratedLevels = Object.fromEntries(current.knowhow.nodes.map((node) => [node.id, node.level]));
  if (!migratedLevels.auto_collect_1 || !migratedLevels.auto_collect_2 || !migratedLevels.auto_collect_3
    || !migratedLevels.auto_order_1 || !migratedLevels.cooking_speed_3 || !migratedLevels.research_speed_1) {
    throw new Error(`Legacy multi-level knowhow did not migrate into one-time nodes: ${JSON.stringify(migratedLevels)}`);
  }
  await page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key));
    saved.version = 19;
    saved.knowhow.skills = {
      restaurant_basics: 1,
      auto_collect_1: 1,
      auto_collect_2: 1,
      auto_collect_3: 1,
      auto_order_1: 1,
      auto_order_2: 1,
      auto_calm_1: 1,
      auto_calm_2: 1,
      auto_promotion_1: 1,
    };
    localStorage.setItem(key, JSON.stringify(saved));
  }, saveKey);
  await page.reload({ waitUntil: "load" });
  current = await gameState();
  if (current.knowhow.automation.paymentInterval !== 30 || current.knowhow.automation.ingredientInterval !== 30
    || current.knowhow.automation.buffetInterval !== 60 || current.knowhow.automation.orderDelay !== 2
    || current.knowhow.automation.calmDelay !== 2 || current.knowhow.automation.promotionInterval !== 30
    || current.knowhow.nodes.find((node) => node.id === "auto_payment_2")?.level !== 0) {
    throw new Error(`Version 19 automation did not migrate without free speed upgrades: ${JSON.stringify(current.knowhow.automation)}`);
  }
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

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
  await page.locator('[data-action="open-ingredient-picker"]').click();
  for (const ingredientId of invalidPair) await page.locator(`[data-action="select-ingredient"][data-id="${ingredientId}"]`).first().click();
  await page.locator('[data-action="close-ingredient-picker"]').last().click();
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(3000));
  current = await gameState();
  if (current.knowhow.xp !== 0 || current.knowhow.points !== 1 || current.knowhow.xpPerPoint !== 125
    || current.knowhow.xpRewards.guestMealCooking !== 1 || current.metrics.failedRecipeResearches < 1) {
    throw new Error(`Weird-dish research did not grant knowhow XP: ${JSON.stringify({ knowhow: current.knowhow, failed: current.metrics.failedRecipeResearches })}`);
  }

  await page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key));
    saved.knowhow.xp = 125;
    localStorage.setItem(key, JSON.stringify(saved));
  }, saveKey);
  await page.reload({ waitUntil: "load" });
  current = await gameState();
  if (current.knowhow.points !== 2 || current.knowhow.xp !== 0 || current.knowhow.xpPerPoint !== 150) {
    throw new Error(`Knowhow XP requirement did not grow 100 -> 125 -> 150: ${JSON.stringify(current.knowhow)}`);
  }

  await page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key));
    saved.knowhow.points = 100;
    localStorage.setItem(key, JSON.stringify(saved));
  }, saveKey);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="knowhow"]').click();
  await upgrade("auto_collect_1");
  if ((await gameState()).knowhow.automation.paymentInterval !== 30) throw new Error("Auto payment stage I is not 30 seconds");
  await upgrade("auto_collect_2");
  if ((await gameState()).knowhow.automation.ingredientInterval !== 30) throw new Error("Auto ingredient stage I is not 30 seconds");
  await upgrade("auto_promotion_1");
  await upgrade("auto_order_1");
  await upgrade("auto_payment_2");
  if ((await gameState()).knowhow.automation.paymentInterval !== 20) throw new Error("Auto payment stage II is not 20 seconds");
  await upgrade("auto_ingredient_2");
  if ((await gameState()).knowhow.automation.ingredientInterval !== 20) throw new Error("Auto ingredient stage II is not 20 seconds");
  await upgrade("auto_calm_1");
  await upgrade("auto_promotion_2");
  await upgrade("auto_order_2");
  await upgrade("auto_payment_3");
  if ((await gameState()).knowhow.automation.paymentInterval !== 10) throw new Error("Auto payment stage III is not 10 seconds");
  await upgrade("auto_ingredient_3");
  if ((await gameState()).knowhow.automation.ingredientInterval !== 10) throw new Error("Auto ingredient stage III is not 10 seconds");
  for (const id of ["auto_calm_2", "auto_promotion_3", "auto_order_3", "auto_calm_3", "auto_collect_3", "auto_buffet_2", "auto_buffet_3",
    "drop_bonus_1", "double_drop_1", "storage_bonus_1", "drop_bonus_2", "double_drop_2", "merchant_discount_1", "drop_bonus_3", "double_drop_3", "storage_bonus_2", "double_drop_4", "merchant_discount_2", "double_drop_5", "double_drop_6", "double_drop_7", "double_drop_8", "double_drop_9", "double_drop_10",
    "cooking_speed_1", "research_speed_1", "offline_bonus_1", "cooking_speed_2", "contest_prize_1", "research_speed_2", "buffet_income_1", "cooking_speed_3", "offline_bonus_2", "research_speed_3", "contest_prize_2", "buffet_income_2"]) await upgrade(id);
  current = await gameState();
  if (Math.abs(current.knowhow.effects.ingredientDropChance - .22) > .0001
    || current.knowhow.effects.buffetOfflineCapSeconds !== 14400
    || current.knowhow.effects.contestPrizeMultiplier !== 1.2
    || current.knowhow.effects.storageBonus !== 10 || current.knowhow.effects.merchantDiscount !== .2
    || current.knowhow.effects.buffetIncomeMultiplier !== 1.2
    || current.knowhow.effects.bonusIngredientChance !== .05
    || current.ingredientStorage.knowhowBonus !== 10
    || current.knowhow.automation.paymentInterval !== 10 || current.knowhow.automation.ingredientInterval !== 10
    || current.knowhow.automation.buffetInterval !== 20 || current.knowhow.automation.orderDelay !== 1
    || current.knowhow.automation.calmDelay !== 1 || current.knowhow.automation.promotionInterval !== 10
    || current.knowhow.automation.tipboxExcluded !== true) {
    throw new Error(`Knowhow effects are not connected: ${JSON.stringify(current.knowhow)}`);
  }
  await page.screenshot({ path: path.join(out, "02-upgraded-branches.png"), fullPage: true });

  await page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key));
    const leaf = window.CHICK_CONFIG.GAME_INGREDIENTS.leaf.id;
    saved.ingredientDrops = [{ id: "knowhow-drop", ingredientId: leaf, emoji: "🍃", items: [{ ingredientId: leaf, count: 1 }], totalCount: 1, x: 200, y: 300 }];
    saved.payments = [{ id: "knowhow-pay", seatId: "test", x: 220, y: 320, amount: 77, models: 1 }];
    saved.tipbox = 123;
    saved.metrics.autoCollected = 0;
    saved.metrics.autoPayments = 0;
    saved.metrics.autoIngredients = 0;
    saved.metrics.autoOrders = 0;
    saved.metrics.autoPromotions = 0;
    saved.knowhow.automation = { collectElapsed: 0, orderElapsed: 0, promotionElapsed: 0 };
    saved.tutorial.activeId = null;
    localStorage.setItem(key, JSON.stringify(saved));
  }, saveKey);
  await page.reload({ waitUntil: "load" });
  await page.evaluate(() => window.advanceTime(9000));
  current = await gameState();
  if (!current.ingredientDrops.length || !current.payments.length || current.metrics.autoPromotions !== 0) {
    throw new Error(`Ten-second automation fired too early: ${JSON.stringify({ drops: current.ingredientDrops, payments: current.payments, metrics: current.metrics })}`);
  }
  await page.evaluate(() => window.advanceTime(1500));
  current = await gameState();
  if (current.ingredientDrops.length || current.payments.length || current.metrics.autoPayments !== 1
    || current.metrics.autoIngredients !== 1 || current.metrics.autoPromotions !== 1) {
    throw new Error(`Ten-second automation did not fire once: ${JSON.stringify({ drops: current.ingredientDrops, payments: current.payments, metrics: current.metrics })}`);
  }
  await page.evaluate(() => window.advanceTime(30000));
  current = await gameState();
  if (current.ingredientDrops.length || current.payments.length || current.tipbox < 123 || current.metrics.autoCollected < 2
    || current.metrics.autoPromotions < 1 || current.metrics.autoOrders < 1) {
    throw new Error(`Automation did not operate the restaurant: ${JSON.stringify({ drops: current.ingredientDrops, payments: current.payments, promotion: current.promotion, metrics: current.metrics })}`);
  }
  await page.locator('[data-screen="knowhow"]').click();
  await page.screenshot({ path: path.join(out, "03b-automation-running.png"), fullPage: true });

  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  console.log(`RESTAURANT_KNOWHOW_OK xp=research${current.knowhow.xpRewards.recipeResearchSuccessOrFailure}/meal${current.knowhow.xpRewards.guestMealCooking} nodes=${current.knowhow.nodes.length} auto=payment10s+ingredient10s+promotion10s drop=${Math.round(current.knowhow.effects.ingredientDropChance * 100)}% offline=${current.knowhow.effects.buffetOfflineCapSeconds / 3600}h contest=x${current.knowhow.effects.contestPrizeMultiplier}`);
} finally {
  await browser.close();
}
