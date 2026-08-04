import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "ingredient-drop-probability-sensible-recipes");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function runVisitGroup(visits, expectedCountsByIngredientId) {
  await page.evaluate(({ visitCount, guestCount }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.rng = 20260727 + visitCount;
    saved.guests = Array.from({ length: guestCount }, (_, index) => ({
      id: 50000 + visitCount * 1000 + index,
      customerId: 3,
      commonId: 1001,
      customerName: "기본 병아리",
      state: "eating",
      seatId: `drop-test-${visitCount}-${index}`,
      tableId: 0,
      x: 45 + (index % 8) * 55,
      y: 170 + Math.floor(index / 8) * 48,
      targetX: 240,
      targetY: 900,
      recipeId: 1,
      visitNumber: visitCount,
      wait: 0,
      stateTime: 7.1,
      mood: "satisfied",
      bob: 0,
    }));
    saved.orders = [];
    saved.cooking = [];
    saved.payments = [];
    saved.ingredientDrops = [];
    saved.metrics.ingredientDropAttempts = 0;
    saved.metrics.ingredientDropMisses = 0;
    saved.metrics.giftBundles = 0;
    saved.metrics.giftItems = 0;
    localStorage.setItem(key, JSON.stringify(saved));
  }, { visitCount: visits, guestCount: 600 });
  await page.reload({ waitUntil: "load" });
  await page.evaluate(() => window.advanceTime(34));
  const current = await state();
  const attempts = current.metrics.ingredientDropAttempts;
  const misses = current.metrics.ingredientDropMisses;
  const hits = current.ingredientDrops.length;
  if (attempts !== 600 || hits + misses !== attempts) {
    throw new Error(`Drop counters do not add up at ${visits} visits: attempts=${attempts} hits=${hits} misses=${misses}`);
  }
  const rate = hits / attempts;
  if (rate < 0.11 || rate > 0.19) {
    throw new Error(`Seeded drop rate is inconsistent with 15% at ${visits} visits: ${rate}`);
  }
  if (current.ingredientDrops.some((drop) => {
    const expectedCount = expectedCountsByIngredientId[drop.ingredientId];
    return drop.items.length !== 1
      || !expectedCount
      || drop.totalCount !== expectedCount
      || drop.items[0].count !== expectedCount;
  })) {
    throw new Error(`A guest dropped the wrong ingredient type/count at ${visits} visits`);
  }
  const actualIds = new Set(current.ingredientDrops.map((drop) => drop.ingredientId));
  const expectedIngredientIds = Object.keys(expectedCountsByIngredientId).map(Number);
  if ([...actualIds].some((id) => !expectedIngredientIds.includes(id))) {
    throw new Error(`Locked ingredient dropped at ${visits} visits: ${JSON.stringify([...actualIds])}`);
  }
  if (expectedIngredientIds.some((id) => !actualIds.has(id))) {
    throw new Error(`Unlocked ingredient did not enter the drop pool at ${visits} visits: ${JSON.stringify([...actualIds])}`);
  }
  return { current, hits, misses, rate };
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  let current = await state();
  if (current.progression.ingredientDropRule.overallChance !== 0.15
    || current.progression.ingredientDropRule.ingredientTypesOnSuccess !== 1
    || JSON.stringify(current.progression.ingredientDropRule.slotChances) !== JSON.stringify({ primary: 0.5, secondary: 0.3, special: 0.2 })
    || JSON.stringify(current.progression.ingredientDropRule.grades) !== JSON.stringify([
      { minVisits: 1, primaryCount: 1, secondaryCount: 0, rareCount: 0 },
      { minVisits: 40, primaryCount: 1, secondaryCount: 1, rareCount: 0 },
      { minVisits: 300, primaryCount: 1, secondaryCount: 1, rareCount: 1 },
    ])) {
    throw new Error(`Drop rule mismatch: ${JSON.stringify(current.progression.ingredientDropRule)}`);
  }

  const first = await runVisitGroup(1, { 30039: 1 });
  const regular = await runVisitGroup(40, { 30039: 1, 30001: 1 });
  const best = await runVisitGroup(300, { 30039: 1, 30001: 1, 30002: 1 });
  current = best.current;
  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const secondaryDrop = saved.ingredientDrops.find((drop) => drop.ingredientId === 30001 && drop.totalCount === 1);
    saved.guests = [];
    saved.orders = [];
    saved.cooking = [];
    saved.payments = [];
    saved.ingredientDrops = secondaryDrop ? [secondaryDrop] : [];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.screenshot({ path: path.join(out, "03-secondary-quantity-badge.png"), fullPage: true });

  const result = {
    configuredChance: current.progression.ingredientDropRule.overallChance,
    first: { hits: first.hits, misses: first.misses, rate: first.rate, counts: { 30039: 1 } },
    regular: { hits: regular.hits, misses: regular.misses, rate: regular.rate, counts: { 30039: 1, 30001: 1 } },
    best: { hits: best.hits, misses: best.misses, rate: best.rate, counts: { 30039: 1, 30001: 1, 30002: 1 } },
  };
  fs.writeFileSync(path.join(out, "result.json"), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`INGREDIENT_DROP_15_PERCENT_QUANTITY_OK first=${first.hits}/600 regular=${regular.hits}/600 best=${best.hits}/600`);
} finally {
  await browser.close();
}
