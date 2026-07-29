import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "progression-loop");
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

async function serveOneCustomer(expectedCustomerId) {
  const initial = await state();
  let ingredientId = null;
  let before = 0;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    for (let i = 0; i < 5; i += 1) await page.locator("#promotion-btn").click();
    await page.evaluate(() => window.advanceTime(4000));
    const waiting = (await state()).guests.find((guest) => guest.state === "awaiting_order");
    if (!waiting || waiting.customerId !== expectedCustomerId) {
      throw new Error(`Expected customer ${expectedCustomerId}, got ${JSON.stringify(waiting)}`);
    }
    ingredientId ??= waiting.dropIngredient;
    before = Number(initial.progression.ingredients[ingredientId] || 0);
    await clickCanvas(waiting.x, waiting.y - 40);
    await page.evaluate(() => window.advanceTime(8000));
    await page.evaluate(() => window.advanceTime(4000));
    const drops = (await state()).ingredientDrops;
    for (const drop of drops) await clickCanvas(drop.x, drop.y);
    if (Number((await state()).progression.ingredients[ingredientId] || 0) > before) return;
  }
  throw new Error(`Customer ${expectedCustomerId} did not drop ingredient within 60 visits`);
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  for (const name of ["조명", "테이블", "조리기구"]) {
    const candidate = (await state()).installCandidates.find((item) => item.name === name);
    await clickCanvas(candidate.x, candidate.y);
    await page.locator("#install-confirm-btn").click();
  }
  const afterInstall = await state();
  if (afterInstall.resources.acorns !== 100) throw new Error(`Core installation should leave 100 acorns, got ${afterInstall.resources.acorns}`);
  await page.evaluate(async () => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const loaded = await window.ChickData.loadTables();
    const campingTable = loaded.restaurantThemes.find((row) => row.id === 6001);
    saved.ownedRecipes = { 1: { level: 1, stack: 0, codexClaimed: true } };
    saved.crafting = { autoEnabled: false, ingredients: {}, history: [] };
    saved.resources.acorns = campingTable.facilityPrice;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });

  await page.locator('[data-screen="theme"]').click();
  await page.locator('[data-action="theme-select"][data-id="6"]').click();
  await page.locator('[data-action="buy-theme"][data-id="6001"]').click();
  let current = await state();
  if (current.progression.unlockedThemes.includes(6) || current.progression.unlockedCustomers.includes(4)) {
    throw new Error("A single facility part unlocked the whole theme customer");
  }
  if (current.progression.activeThemeParts[1] !== 6001 || current.progression.activeThemeParts[2] !== 1002) {
    throw new Error("Buying the table theme part changed more than the table facility type");
  }
  if (current.resources.acorns !== 0) throw new Error("Camping theme part did not deduct its temporary price");
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, "01-theme-unlocks-chick.png"), fullPage: true });
  await page.locator("#menu-close-btn").click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, "01b-single-part-world.png"), fullPage: true });

  await page.evaluate(async () => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const loaded = await window.ChickData.loadTables();
    const campingTotal = loaded.restaurantThemes
      .filter((row) => row.facilityTheme === 6 && Number(row.purchaseType) !== 2)
      .reduce((sum, row) => sum + Number(row.facilityPrice), 0);
    saved.installed = window.CHICK_TABLE_SOURCE.InstallFacility.filter((row) => row.areaType === 1).map((row) => row.id);
    saved.resources.acorns = campingTotal;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="theme"]').click();
  await page.locator('[data-action="theme-select"][data-id="6"]').click();
  while (await page.locator('[data-action="buy-theme"]').count()) {
    await page.locator('[data-action="buy-theme"]').first().click();
  }
  current = await state();
  const campingChicks = current.progression.themeChickProgress[6].unlocked;
  if (!current.progression.unlockedThemes.includes(6) || !current.progression.unlockedCustomers.includes(4) || campingChicks.length !== 3) {
    throw new Error(`Completing all camping facility parts did not unlock three chicks: ${JSON.stringify(campingChicks)}`);
  }
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, "01c-complete-theme-unlocks-chick.png"), fullPage: true });
  await page.locator("#menu-close-btn").click();
  await page.evaluate(async () => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const loaded = await window.ChickData.loadTables();
    const italyTable = loaded.restaurantThemes.find((row) => row.id === 8001);
    const stoneIds = new Set(window.CHICK_TABLE_SOURCE.ThemeFacility.filter((row) => row.areaType === 1 && row.facilityTheme === 1).map((row) => row.id));
    saved.themes.opened = saved.themes.opened.filter((id) => !stoneIds.has(id));
    saved.installed = saved.installed.filter((id) => ![11, 19].includes(id));
    saved.crafting.ingredients[30007] = 1;
    saved.crafting.ingredients[30010] = 1;
    saved.resources.acorns = italyTable.facilityPrice;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  current = await state();
  if (current.progression.ingredients[30007] !== 1 || current.progression.ingredients[30010] !== 1) throw new Error("Wedge ingredient combination is missing");

  await page.locator('[data-screen="recipe"]').click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, "02-manual-craft-ready.png"), fullPage: true });
  await page.locator('[data-action="craft-recipe"][data-id="10"]').click();
  current = await state();
  if (current.progression.ingredients[30007] !== 0 || current.progression.ingredients[30010] !== 0 || !current.progression.craftedRecipes.includes(10)) {
    throw new Error("Manual recipe crafting failed");
  }
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, "03-manual-crafted.png"), fullPage: true });

  await page.locator("#menu-close-btn").click();
  await page.locator('[data-screen="theme"]').click();
  await page.locator('[data-action="theme-select"][data-id="8"]').click();
  await page.locator('[data-action="buy-theme"][data-id="8001"]').click();
  await page.locator("#menu-close-btn").click();
  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const italyRows = window.CHICK_TABLE_SOURCE.ThemeFacility.filter((row) => row.areaType === 1 && row.facilityTheme === 8);
    saved.themes.opened = italyRows.map((row) => row.id);
    saved.themes.unlockedThemeIds = [...new Set([...saved.themes.unlockedThemeIds, 8])];
    saved.crafting.ingredients[30002] = 1;
    saved.crafting.ingredients[30004] = 1;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-action="auto-craft"]').click();
  current = await state();
  const autoEntry = current.progression.craftedRecipes.includes(7);
  if (!autoEntry || current.progression.ingredients[30002] !== 0 || current.progression.ingredients[30004] !== 0) throw new Error("Automatic pizza ingredient combination failed");
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  await page.waitForTimeout(250);
  await page.locator(".game-frame").screenshot({ path: path.join(out, "04-auto-crafted-restaurant-only.png") });
  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("PROGRESSION_LOOP_OK");
} finally {
  await browser.close();
}
