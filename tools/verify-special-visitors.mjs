import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "special-visitors");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function spawnFromDebug(type) {
  if (!await page.locator("#debug-panel").isVisible()) await page.locator("#debug-toggle-btn").click();
  await page.locator("#debug-special-type").selectOption(type);
  await page.locator("#debug-spawn-special-btn").click();
  const current = await gameState();
  if (current.specialCustomers.length !== 1 || current.specialCustomers[0].type !== type) {
    throw new Error(`Debug special spawn failed for ${type}: ${JSON.stringify(current.specialCustomers)}`);
  }
  return current.specialCustomers[0];
}

async function clickSpecialActor(advanceMs = 5000) {
  await page.evaluate((milliseconds) => window.advanceTime(milliseconds), advanceMs);
  const current = await gameState();
  const actor = current.specialCustomers[0];
  if (!actor) throw new Error("Special actor disappeared before interaction");
  const box = await page.locator("#game-canvas").boundingBox();
  await page.mouse.click(box.x + actor.x / 480 * box.width, box.y + actor.y / 900 * box.height);
  return gameState();
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();
  await page.locator("#debug-toggle-btn").click();
  await page.locator("#debug-install-all-btn").click();
  await page.locator("#debug-resource-type").selectOption("acorns");
  await page.locator("#debug-resource-amount").fill("5000");
  await page.locator("#debug-add-resource-btn").click();
  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients[window.CHICK_CONFIG.GAME_INGREDIENTS.leaf.id] = 8;
    saved.tutorial = { activeId: null, seen: ["welcome", "drops-unlocked", "recipe-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });

  await spawnFromDebug("merchant");
  let current = await clickSpecialActor(0);
  if (current.specialVisitor.panelVisible
    || current.specialCustomers[0]?.state !== "approaching"
    || current.specialCustomers[0]?.canInteract !== false) {
    throw new Error("A peaceful special visitor was interactive before reaching its destination");
  }
  current = await clickSpecialActor(5000);
  if (!current.specialVisitor.panelVisible
    || current.specialCustomers[0]?.canInteract !== false
    || !(await page.locator("#special-visitor-title").innerText()).includes("재료 상인")) {
    throw new Error("Merchant panel did not open");
  }
  const offers = current.specialCustomers[0].offers;
  if (!offers?.length || offers.some((offer) => !current.specialPromotion.availableIngredients.some((item) => item.ingredientId === offer.ingredientId))) {
    throw new Error(`Merchant sold a currently unobtainable ingredient: ${JSON.stringify(offers)}`);
  }
  if (offers.some((offer) => offer.unitPrice < 120 || offer.price !== offer.unitPrice * offer.quantity)
    || current.specialVisitor.merchantPricing.theme1Base !== 120
    || current.specialVisitor.merchantPricing.theme2Base !== 300
    || current.specialVisitor.merchantPricing.theme3Base !== 1200
    || current.specialVisitor.merchantPricing.laterThemeMultiplier !== 2) {
    throw new Error(`Merchant pricing is not progression-scaled: ${JSON.stringify(offers)}`);
  }
  const firstOffer = offers[0];
  const acornsBefore = current.resources.acorns;
  const ingredientBefore = Number(current.progression.ingredients[firstOffer.ingredientId] || 0);
  await page.locator(`[data-special-action="buy"][data-offer-id="${firstOffer.id}"]`).click();
  current = await gameState();
  if (current.resources.acorns !== acornsBefore - firstOffer.price
    || Number(current.progression.ingredients[firstOffer.ingredientId] || 0) !== ingredientBefore + firstOffer.quantity
    || current.metrics.merchantPurchases !== 1) {
    throw new Error("Merchant purchase did not update currency and inventory");
  }
  await page.screenshot({ path: path.join(out, "01-material-merchant.png"), fullPage: true });
  await page.locator("#special-visitor-close").click();
  await page.evaluate(() => window.advanceTime(10000));

  await spawnFromDebug("fairy");
  current = await clickSpecialActor();
  if (!current.specialVisitor.panelVisible
    || current.specialVisitor.panelTitle !== "바람의 요정"
    || !(await page.locator("#special-visitor-content").innerText()).includes("15%에서 30%")) {
    throw new Error(`Wind fairy explanation panel did not open: ${JSON.stringify(current.specialVisitor)}`);
  }
  await page.screenshot({ path: path.join(out, "02-wind-fairy-popup.png"), fullPage: true });
  await page.locator('[data-special-action="fairy"]').click();
  current = await gameState();
  if (current.specialVisitor.dropMultiplier !== 2
    || current.progression.ingredientDropRule.currentChance !== 0.3
    || !await page.locator("#drop-boost-badge").isVisible()) {
    throw new Error(`Wind fairy did not double ingredient drops: ${JSON.stringify(current.specialVisitor)}`);
  }
  await page.screenshot({ path: path.join(out, "03-wind-fairy-buff.png"), fullPage: true });
  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.specialVisitor.dropBoostRemaining = 60;
    saved.specialVisitor.lastUpdatedAt = Date.now() - 30000;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  current = await gameState();
  if (current.specialVisitor.dropBoostRemaining < 28 || current.specialVisitor.dropBoostRemaining > 31) {
    throw new Error(`Wind fairy real-time persistence was not reconciled: ${current.specialVisitor.dropBoostRemaining}`);
  }
  await page.evaluate(() => window.advanceTime(31000));
  current = await gameState();
  if (current.specialVisitor.dropMultiplier !== 1 || current.progression.ingredientDropRule.currentChance !== 0.15) {
    throw new Error("Wind fairy buff did not expire after 60 seconds");
  }

  let futureTrade = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await spawnFromDebug("trader");
    current = await gameState();
    if (current.specialCustomers[0].trade?.isFuture) {
      futureTrade = current.specialCustomers[0].trade;
      break;
    }
  }
  if (!futureTrade || current.specialVisitor.futureTradeChance !== 0.15) throw new Error("A 15% future-material trade offer was not generated");
  const requestBefore = Number(current.progression.ingredients[futureTrade.requestIngredientId] || 0);
  const rewardBefore = Number(current.progression.ingredients[futureTrade.rewardIngredientId] || 0);
  current = await clickSpecialActor();
  if (!current.specialVisitor.panelVisible || !(await page.locator("#special-visitor-content").innerText()).includes("아직 평소에는 얻을 수 없는 재료")) {
    throw new Error("Future-material trade warning is missing");
  }
  await page.screenshot({ path: path.join(out, "03-future-material-trade.png"), fullPage: true });
  await page.locator('[data-special-action="trade"]').click();
  current = await gameState();
  if (Number(current.progression.ingredients[futureTrade.requestIngredientId] || 0) !== requestBefore - futureTrade.requestCount
    || Number(current.progression.ingredients[futureTrade.rewardIngredientId] || 0) !== rewardBefore + futureTrade.rewardCount
    || current.metrics.futureTrades !== 1) {
    throw new Error("Future-material trade did not exchange the promised quantities");
  }
  await page.evaluate(() => window.advanceTime(10000));

  await spawnFromDebug("thief");
  current = await gameState();
  if (current.specialCustomers[0]?.state !== "approaching" || current.specialCustomers[0]?.canInteract !== true) {
    throw new Error("Thief was not catchable while moving");
  }
  current = await clickSpecialActor(1000);
  if (!current.specialVisitor.panelVisible
    || current.specialVisitor.panelTitle !== "도둑 병아리"
    || !(await page.locator("#special-visitor-content").innerText()).includes("팁을 훔쳐")) {
    throw new Error("Thief explanation panel did not open");
  }
  await page.screenshot({ path: path.join(out, "04-thief-popup.png"), fullPage: true });
  await page.locator('[data-special-action="catch"]').click();
  current = await gameState();
  if (current.specialCustomers[0]?.state !== "caught") throw new Error("Thief could not be caught from its explanation panel");
  await page.evaluate(() => window.advanceTime(10000));

  current = await gameState();
  const visitorsBeforeTimer = current.metrics.specialVisitors;
  const nextIn = current.specialVisitor.nextIn;
  await page.evaluate((milliseconds) => window.advanceTime(milliseconds), Math.max(0, nextIn * 1000 - 1000));
  current = await gameState();
  if (current.metrics.specialVisitors !== visitorsBeforeTimer) throw new Error("A special visitor arrived before the 120-second interval");
  await page.evaluate(() => window.advanceTime(2000));
  current = await gameState();
  if (current.metrics.specialVisitors !== visitorsBeforeTimer + 1 || current.specialCustomers.length !== 1) {
    throw new Error("A special visitor did not arrive at the 120-second interval");
  }

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`SPECIAL_VISITORS_OK interval=120 merchant=progression-priced-arrival-only fairy=15%->30% tradeFuture=15% thief=catchable-in-motion`);
} finally {
  await browser.close();
}
