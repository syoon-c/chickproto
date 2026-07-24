import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "balance-items");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));

const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const clickCanvas = async (x, y) => {
  const box = await page.locator("#game-canvas").boundingBox();
  await page.mouse.click(box.x + x / 480 * box.width, box.y + y / 900 * box.height);
};

async function install(name) {
  const candidate = (await state()).installCandidates.find((item) => item.name === name);
  if (!candidate) throw new Error(`Missing install candidate: ${name}`);
  await clickCanvas(candidate.x, candidate.y);
  await page.locator("#install-confirm-btn").click();
}

async function serveAndCollect(expectedCustomerId = 3) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    for (let i = 0; i < 5; i += 1) await page.locator("#promotion-btn").click();
    await page.evaluate(() => window.advanceTime(4000));
    const waiting = (await state()).guests.find((guest) => guest.state === "awaiting_order");
    if (!waiting) continue;
    const targetCustomer = waiting.customerId === expectedCustomerId;
    if (targetCustomer && expectedCustomerId === 3 && !waiting.icon.endsWith("icon_chick_001.png")) throw new Error(`First guest is not the base chick: ${waiting.icon}`);
    await clickCanvas(waiting.x, waiting.y - 40);
    await page.evaluate(() => window.advanceTime(12000));
    const drops = (await state()).ingredientDrops;
    const drop = targetCustomer ? drops.find((item) => item.ingredientId === 30001) : null;
    if (!drop) {
      for (const item of drops) await clickCanvas(item.x, item.y);
      continue;
    }
    if (drop.emoji !== "🥬") throw new Error(`Unexpected field ingredient: ${JSON.stringify(drop)}`);
    await clickCanvas(drop.x, drop.y);
    return;
  }
  throw new Error("Base chick did not drop lettuce within 12 visits");
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });

  let current = await state();
  const lighting = current.installCandidates.find((item) => item.name === "조명");
  const table = current.installCandidates.find((item) => item.name === "테이블");
  if (lighting?.cost !== 10 || table?.cost !== 15) throw new Error(`Facility costs were not halved: ${JSON.stringify(current.installCandidates)}`);

  await install("조명");
  await install("테이블");
  await install("조리기구");
  current = await state();
  if (current.resources.acorns !== 100) throw new Error(`Core installation should leave 100 acorns, got ${current.resources.acorns}`);
  if (current.recipes.prices[1] !== 40) throw new Error(`Salad price should be 40, got ${current.recipes.prices[1]}`);
  if (Object.values(current.progression.ingredientDropChances).some((chance) => chance !== 1)) {
    throw new Error(`Guest gifts should be guaranteed: ${JSON.stringify(current.progression.ingredientDropChances)}`);
  }

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.rng = 2;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });

  for (let i = 0; i < 5; i += 1) await page.locator("#promotion-btn").click();
  await page.evaluate(() => window.advanceTime(4000));
  let waiting = (await state()).guests.find((guest) => guest.state === "awaiting_order");
  if (!waiting || waiting.customerId !== 3 || !waiting.icon.endsWith("icon_chick_001.png")) throw new Error(`Initial guest resource mismatch: ${JSON.stringify(waiting)}`);
  await page.locator(".game-frame").screenshot({ path: path.join(out, "00-base-chick.png") });
  await clickCanvas(waiting.x, waiting.y - 40);
  await page.evaluate(() => window.advanceTime(12000));
  current = await state();
  if (current.progression.ingredients[30001]) throw new Error("Lettuce entered inventory before field collection");
  if (current.ingredientDrops.length !== 1 || current.ingredientDrops[0].emoji !== "🥬"
    || current.ingredientDrops[0].totalCount !== 1 || current.ingredientDrops[0].items[0].count !== 1) {
    throw new Error(`First-visit lettuce gift is incorrect: ${JSON.stringify(current.ingredientDrops)}`);
  }
  if (current.metrics.ingredientDropAttempts !== 1 || current.metrics.ingredientDropMisses !== 0) throw new Error("Guaranteed gift counters are incorrect");
  await page.screenshot({ path: path.join(out, "01-lettuce-field-drop.png"), fullPage: true });
  await clickCanvas(current.ingredientDrops[0].x, current.ingredientDrops[0].y);

  await serveAndCollect();
  await serveAndCollect();
  current = await state();
  if (current.progression.ingredients[30001] !== 3) throw new Error(`Collected lettuce should be 3, got ${current.progression.ingredients[30001]}`);

  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-action="auto-craft"]').click();
  current = await state();
  if (current.recipes.levels[1] !== 2 || current.recipes.prices[1] !== 42 || current.progression.ingredients[30001] !== 0 || current.recipes.craftCosts[1] !== 4) {
    throw new Error(`Base chick did not upgrade salad: ${JSON.stringify(current.recipes)}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "02-base-chick-upgraded-salad.png") });

  await page.locator("#menu-close-btn").click();
  await serveAndCollect();
  await serveAndCollect();
  await serveAndCollect();
  await serveAndCollect();
  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-action="craft-recipe"][data-id="1"]').click();
  current = await state();
  if (current.recipes.levels[1] !== 3 || current.recipes.prices[1] !== 44 || current.progression.ingredients[30001] !== 0 || current.recipes.craftCosts[1] !== 5) {
    throw new Error(`Duplicate craft did not level salad by 5%: ${JSON.stringify(current.recipes)}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "03-salad-level-3.png") });

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.missions.mainGroup = 4;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="missions"]').click();
  const missionText = await page.locator("#menu-content").innerText();
  const missionCards = await page.locator("#menu-content .feature-card").count();
  if (missionText.includes("메뉴 연구") || missionCards !== 2) throw new Error(`Removed mission remains: ${missionText}`);
  await page.locator(".game-frame").screenshot({ path: path.join(out, "04-removed-system-missions-filtered.png") });

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("BALANCE_ITEMS_OK");
} finally {
  await browser.close();
}
