import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "unity-feature-regression");
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

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });

  const navLabels = await page.locator(".bottom-nav .nav-button strong").allTextContents();
  if (navLabels.join(",") !== "테마,레시피,손님") throw new Error(`Unexpected bottom navigation: ${navLabels.join(",")}`);
  if (await page.locator("#objective-card").count()) throw new Error("Objective toast/card still exists");
  if (await page.locator("#collection-btn,[data-screen='missions'],[data-screen='staff']").count()) throw new Error("Removed navigation is still visible");
  await page.screenshot({ path: path.join(out, "01-three-button-layout.png"), fullPage: true });

  for (const name of ["조명", "테이블", "조리기구"]) {
    const current = await state();
    const candidate = current.installCandidates.find((item) => item.name === name);
    await clickCanvas(candidate.x, candidate.y);
    await page.locator("#install-confirm-btn").click();
  }
  for (let i = 0; i < 5; i += 1) await page.locator("#promotion-btn").click();
  await page.evaluate(() => window.advanceTime(2500));
  const waiting = await state();
  if (waiting.collection.customers !== 1) throw new Error("Customer collection did not register");
  await page.locator('[data-screen="collection"]').click();
  await page.screenshot({ path: path.join(out, "02-customer-collection.png"), fullPage: true });

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const woodRows = window.CHICK_TABLE_SOURCE.ThemeFacility.filter((row) => row.areaType === 1 && row.facilityTheme === 2);
    saved.themes.opened = [...new Set([...saved.themes.opened, ...woodRows.slice(0, Math.ceil(woodRows.length * .3)).map((row) => row.id)])];
    saved.crafting = { ingredients: { 30040: 1, 30041: 1 }, history: [], selected: [] };
    saved.ownedRecipes = { 1: { level: 1, stack: 0, codexClaimed: true } };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  const openNavBox = await page.locator(".bottom-nav").boundingBox();
  const openNavButtons = await page.locator(".bottom-nav .nav-button").all();
  for (const button of openNavButtons) {
    const box = await button.boundingBox();
    if (!box || !openNavBox || box.x < openNavBox.x || box.x + box.width > openNavBox.x + openNavBox.width) {
      throw new Error("Bottom navigation button escaped its dock while a menu was open");
    }
  }
  await page.locator('[data-action="select-ingredient"][data-id="30040"]').click();
  await page.locator('[data-action="select-ingredient"][data-id="30041"]').click();
  await page.locator('[data-action="discover-combination"]').click();
  const crafted = await state();
  if (crafted.recipes.owned !== 2 || crafted.recipes.levels[10003] !== 1
    || Number(crafted.progression.ingredients[30040] || 0) !== 0
    || Number(crafted.progression.ingredients[30041] || 0) !== 0) throw new Error(`Manual recipe discovery failed: ${JSON.stringify(crafted.recipes)}`);
  await page.screenshot({ path: path.join(out, "03-research-upgrade.png"), fullPage: true });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("chick-bistro-planning-prototype-v2")));
  if (saved.ownedRecipes[10003]?.level !== 1 || saved.metrics.recipesCrafted !== 1) throw new Error("Crafted recipe state mismatch");

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const current = JSON.parse(localStorage.getItem(key));
    current.resources.acorns = 100000000;
    current.installed = [...new Set([...current.installed, 10])];
    current.performance.cooldown = 0;
    localStorage.setItem(key, JSON.stringify(current));
  });
  await page.reload({ waitUntil: "load" });
  await clickCanvas(70, 405);
  await page.locator('[data-action="start-performance"]').click();
  await page.locator("#menu-close-btn").click();
  await page.locator('[data-screen="theme"]').click();
  await page.locator('[data-action="theme-select"][data-id="6"]').click();
  await page.locator('[data-action="buy-theme"][data-id="6001"]').click();
  await page.screenshot({ path: path.join(out, "04-theme.png"), fullPage: true });
  const managed = await page.evaluate(() => JSON.parse(localStorage.getItem("chick-bistro-planning-prototype-v2")));
  if (managed.performance.activeId <= 0 || managed.themes.activeByFacility[1] !== 6001 || managed.themes.unlockedThemeIds.includes(6)) {
    throw new Error("Management state mismatch");
  }

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const current = JSON.parse(localStorage.getItem(key));
    current.tipbox = 100;
    current.specialActors = [{ specialId: 1, x: 410, y: 595, targetX: 410, targetY: 595, state: "approaching", timer: 0, stolen: 0 }];
    localStorage.setItem(key, JSON.stringify(current));
  });
  await page.reload({ waitUntil: "load" });
  await page.evaluate(() => window.advanceTime(100));
  const thief = (await state()).specialCustomers[0];
  if (!thief || thief.stolen !== 50) throw new Error("Thief did not steal configured tip ratio");
  await clickCanvas(thief.x, thief.y);
  const afterCatch = await page.evaluate(() => JSON.parse(localStorage.getItem("chick-bistro-planning-prototype-v2")));
  if (afterCatch.tipbox !== 100) throw new Error("Catching thief did not restore stolen tip");
  await page.screenshot({ path: path.join(out, "05-thief-caught.png"), fullPage: true });

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const current = JSON.parse(localStorage.getItem(key));
    const allRestaurantIds = window.CHICK_TABLE_SOURCE.InstallFacility.filter((row) => row.areaType === 1).map((row) => row.id);
    current.installed = allRestaurantIds.filter((id) => ![9, 17, 18].includes(id));
    current.resources.acorns = 100000;
    current.specialActors = [];
    localStorage.setItem(key, JSON.stringify(current));
  });
  await page.reload({ waitUntil: "load" });
  const canvasBox = await page.locator("#game-canvas").boundingBox();
  const navBox = await page.locator(".bottom-nav").boundingBox();
  if (!canvasBox || !navBox || canvasBox.y + canvasBox.height > navBox.y) throw new Error("Bottom navigation overlaps the game canvas");
  const restaurantNavButtons = await page.locator(".bottom-nav .nav-button").all();
  if (restaurantNavButtons.length !== 3) throw new Error("Restaurant view lost bottom navigation buttons");
  for (const button of restaurantNavButtons) {
    const box = await button.boundingBox();
    if (!box || box.x < navBox.x || box.x + box.width > navBox.x + navBox.width) {
      throw new Error("Bottom navigation button escaped its dock in restaurant view");
    }
  }
  const bottomState = await state();
  const entrance = bottomState.installCandidates.find((item) => item.name === "출입구");
  const fence = bottomState.installCandidates.find((item) => item.name === "울타리");
  if (!entrance || !fence) throw new Error("Bottom facility candidates are missing");
  await clickCanvas(entrance.x, entrance.y);
  if (!(await page.locator("#install-panel").isVisible())) throw new Error("Entrance install panel did not open");
  await page.locator("#install-close-btn").click();
  await clickCanvas(fence.x, fence.y);
  if (!(await page.locator("#install-panel").isVisible())) throw new Error("Fence install panel did not open");
  await page.locator("#install-close-btn").click();
  await page.screenshot({ path: path.join(out, "06-bottom-facilities.png"), fullPage: true });

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(await state(), null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("UNITY_FEATURES_OK");
} finally {
  await browser.close();
}
