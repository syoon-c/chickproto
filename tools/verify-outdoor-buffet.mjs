import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "outdoor-buffet");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function clickCanvas(x, y) {
  const box = await page.locator("#game-canvas").boundingBox();
  if (!box) throw new Error("Canvas is unavailable");
  await page.mouse.click(box.x + x * box.width / 480, box.y + y * box.height / 900);
}

async function placeRecipeAtStand(standIndex) {
  const current = await gameState();
  const stand = current.buffet.stands[standIndex];
  if (!stand) throw new Error(`Buffet stand ${standIndex} is not unlocked`);
  await clickCanvas(stand.x, stand.y);
  await page.locator('[data-action="buffet-place"]:not([disabled])').first().click();
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.ownedRecipes = Object.fromEntries(window.CHICK_CONFIG.RECIPE_PROGRESSION.slice(0, 8)
      .map((route) => [route.recipeId, { level: 1, stack: 0, codexClaimed: true }]));
    saved.tutorial = { activeId: null, seen: ["welcome", "special-promotion-unlocked", "contest-unlocked"] };
    saved.ui.area = "restaurant";
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });

  let current = await gameState();
  if (current.tutorial.activeId !== "buffet-unlocked" || current.buffet.unlocked
    || !await page.locator("#chef-dialogue").isVisible() || !await page.locator("#area-next-btn").isHidden()) {
    throw new Error(`Eight recipes did not trigger the gated buffet story: ${JSON.stringify({ tutorial: current.tutorial, buffet: current.buffet })}`);
  }
  await page.screenshot({ path: path.join(out, "01-eight-recipes-story.png"), fullPage: true });

  await page.locator("#chef-dialogue").click();
  current = await gameState();
  if (!current.buffet.unlocked || await page.locator("#area-next-btn").isHidden()) {
    throw new Error("Buffet arrow did not unlock after the chef story");
  }
  await page.locator("#area-next-btn").click();
  current = await gameState();
  if (current.mode !== "buffet" || current.buffet.area !== "buffet" || await page.locator("#area-prev-btn").isHidden()) {
    throw new Error(`Buffet area navigation failed: ${JSON.stringify(current.buffet)}`);
  }
  if (current.buffet.standCount !== 4 || current.buffet.maxStandCount !== 8
    || current.buffet.nextStandRecipeRequirement !== 12) {
    throw new Error(`Initial buffet capacity should be 4/8: ${JSON.stringify(current.buffet)}`);
  }
  await page.screenshot({ path: path.join(out, "02-empty-buffet.png"), fullPage: true });

  for (let index = 0; index < 4; index += 1) await placeRecipeAtStand(index);
  current = await gameState();
  if (current.buffet.stands.filter((stand) => stand.recipeId).length !== 4
    || new Set(current.buffet.stands.map((stand) => stand.recipeId)).size !== 4
    || current.buffet.perMinute <= 0) {
    throw new Error(`Buffet display placement failed: ${JSON.stringify(current.buffet)}`);
  }
  await page.screenshot({ path: path.join(out, "03-recipe-displays.png"), fullPage: true });

  const milestones = [[12, 5], [16, 6], [20, 7], [24, 8]];
  for (const [recipeCount, expectedCapacity] of milestones) {
    await page.evaluate((targetCount) => {
      const key = "chick-bistro-planning-prototype-v2";
      const saved = JSON.parse(localStorage.getItem(key));
      window.CHICK_CONFIG.RECIPE_PROGRESSION.slice(0, targetCount).forEach((route) => {
        saved.ownedRecipes[route.recipeId] ||= { level: 1, stack: 0, codexClaimed: true };
      });
      saved.buffet.lastUpdatedAt = Date.now();
      localStorage.setItem(key, JSON.stringify(saved));
    }, recipeCount);
    await page.reload({ waitUntil: "load" });
    current = await gameState();
    if (current.buffet.standCount !== expectedCapacity) {
      throw new Error(`Buffet capacity did not grow at ${recipeCount} recipes: ${JSON.stringify(current.buffet)}`);
    }
    await placeRecipeAtStand(expectedCapacity - 1);
  }
  current = await gameState();
  if (current.buffet.standCount !== 8 || current.buffet.nextStandRecipeRequirement !== null
    || current.buffet.stands.some((stand) => !stand.recipeId)) {
    throw new Error(`Maximum buffet expansion failed: ${JSON.stringify(current.buffet)}`);
  }
  const perMinute = current.buffet.perMinute;
  await page.screenshot({ path: path.join(out, "04-max-expansion.png"), fullPage: true });

  await page.evaluate(() => window.advanceTime(60_000));
  current = await gameState();
  if (current.buffet.cashbox !== perMinute) {
    throw new Error(`One-minute passive income mismatch: expected ${perMinute}, got ${current.buffet.cashbox}`);
  }
  const beforeCashboxClaim = current.resources.acorns;
  await clickCanvas(240, 715);
  current = await gameState();
  if (current.buffet.cashbox !== 0 || current.resources.acorns !== beforeCashboxClaim + perMinute) {
    throw new Error("Buffet cashbox did not add its final amount to acorns");
  }

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.buffet.cashbox = 0;
    saved.buffet.passiveElapsed = 0;
    saved.buffet.offlinePending = 0;
    saved.buffet.offlineSeconds = 0;
    saved.buffet.lastUpdatedAt = Date.now() - (2 * 60 * 60 * 1000);
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  current = await gameState();
  const expectedOffline = perMinute * 120;
  if (!current.buffet.offlinePanelVisible || current.buffet.offlinePending !== expectedOffline) {
    throw new Error(`Two-hour offline reward mismatch: expected ${expectedOffline}, got ${JSON.stringify(current.buffet)}`);
  }
  await page.screenshot({ path: path.join(out, "05-offline-reward.png"), fullPage: true });
  const beforeOfflineClaim = current.resources.acorns;
  await page.locator("#offline-reward-claim").click();
  current = await gameState();
  if (current.buffet.offlinePanelVisible || current.resources.acorns !== beforeOfflineClaim + expectedOffline) {
    throw new Error("Offline buffet reward claim failed");
  }

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.rng = 1;
    saved.ui.area = "buffet";
    saved.buffet.lastUpdatedAt = Date.now();
    saved.guests = [{
      id: "guest-buffet-test",
      customerId: 3,
      commonId: 1001,
      customerName: "기본 병아리",
      state: "leaving",
      mood: "satisfied",
      x: 240,
      y: 895,
      targetX: 240,
      targetY: 900,
      bob: 0,
      stateTime: 0,
      wait: 0,
      buffetQueued: true,
    }];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.evaluate(() => window.advanceTime(4_000));
  current = await gameState();
  if (current.buffet.visitors.length !== 1 || current.buffet.visitors[0].state !== "browsing") {
    throw new Error(`Restaurant guest did not continue to the buffet: ${JSON.stringify(current.buffet.visitors)}`);
  }
  await page.screenshot({ path: path.join(out, "06-post-meal-visitor.png"), fullPage: true });
  const beforeVisitorPurchase = current.buffet.cashbox;
  await page.evaluate(() => window.advanceTime(3_200));
  current = await gameState();
  if (current.buffet.visitors[0]?.willBuy !== true || current.buffet.cashbox <= beforeVisitorPurchase
    || current.metrics.buffetPurchases < 1) {
    throw new Error(`Buffet visitor purchase flow failed: ${JSON.stringify({ visitors: current.buffet.visitors, buffet: current.buffet, metrics: current.metrics })}`);
  }

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`OUTDOOR_BUFFET_OK recipes=8->24 stands=4->8 perMinute=${perMinute} offline=${expectedOffline} visitorPurchase=yes`);
} finally {
  await browser.close();
}
