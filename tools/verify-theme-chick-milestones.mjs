import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "theme-chick-milestones-stone-3");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function setCampingPartCount(count) {
  await page.evaluate((openedCount) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const stoneRows = window.CHICK_TABLE_SOURCE.ThemeFacility.filter((row) => row.areaType === 1 && row.facilityTheme === 1);
    const campingRows = window.CHICK_TABLE_SOURCE.ThemeFacility.filter((row) => row.areaType === 1 && row.facilityTheme === 6);
    saved.themes.opened = [...stoneRows.map((row) => row.id), ...campingRows.slice(0, openedCount).map((row) => row.id)];
    localStorage.setItem(key, JSON.stringify(saved));
  }, count);
  await page.reload({ waitUntil: "load" });
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  let current = await state();
  const availableThemeIds = Object.keys(current.progression.themeChickProgress).map(Number);
  if (availableThemeIds.length !== 15 || Math.max(...availableThemeIds) !== 15) {
    throw new Error(`Only themes through Astrology (15) may be available: ${JSON.stringify(availableThemeIds)}`);
  }
  if (current.progression.themeChickProgress[1].unlocked.length !== 1) {
    throw new Error("The starting Stone theme must only unlock the base chick before all facilities are installed");
  }
  const baseRoute = current.progression.unlockedChickRoutes.find((route) => route.customerId === 3);
  if (baseRoute?.ingredientId !== 30039 || baseRoute?.recipeId !== 1 || current.recipes.craftCosts[1] !== 2) {
    throw new Error(`The base chick must upgrade the starting salad with two leaves: ${JSON.stringify(baseRoute)}`);
  }
  if (current.progression.unlockedChickRoutes.some((route) => route.customerId === 10013)) {
    throw new Error("The Stone completion chick must remain locked before all facilities are installed");
  }
  const themePrices = await page.evaluate(async () => {
    const loaded = (await window.ChickData.loadTables()).restaurantThemes;
    const woodByType = new Map(loaded
      .filter((row) => Number(row.facilityTheme) === 2 && Number(row.purchaseType) !== 2)
      .map((row) => [Number(row.facilityType), Number(row.facilityPrice)]));
    return loaded.filter((row) => Number(row.purchaseType) !== 2 && Number(row.facilityTheme) > 1).map((row) => ({
      themeId: Number(row.facilityTheme),
      facilityType: Number(row.facilityType),
      expected: window.CHICK_CONFIG.restaurantThemePartPrice(row.facilityTheme, woodByType.get(Number(row.facilityType))),
      actual: Number(row.facilityPrice),
    }));
  });
  if (themePrices.some((row) => row.actual !== row.expected)) {
    throw new Error(`Restaurant theme prices do not follow the 2x curve: ${JSON.stringify(themePrices)}`);
  }
  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients[30039] = 3;
    const cuttingBoardPart = window.CHICK_TABLE_SOURCE.ThemeFacility
      .find((row) => row.areaType === 1 && row.facilityTheme === 1 && row.facilityType === 8);
    const cuttingBoardInstall = window.CHICK_TABLE_SOURCE.InstallFacility
      .find((row) => row.areaType === 1 && row.facilityType === 8);
    saved.themes.opened = [...new Set([...saved.themes.opened, cuttingBoardPart.id])];
    saved.installed = [...new Set([...saved.installed, cuttingBoardInstall.id])];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, "00-base-salad-upgrade.png"), fullPage: true });
  await page.locator("#menu-close-btn").click();
  await page.locator('[data-screen="theme"]').click();
  await page.waitForTimeout(200);
  await page.locator("#menu-content").evaluate((element) => { element.scrollTop = 0; });
  await page.locator(".game-frame").screenshot({ path: path.join(out, "00b-stone-completion-locked.png") });
  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const stoneRows = window.CHICK_TABLE_SOURCE.ThemeFacility
      .filter((row) => row.areaType === 1 && row.facilityTheme === 1);
    const openedStoneRows = stoneRows.filter((row) => ![12, 13].includes(Number(row.facilityType))).slice(0, 8);
    const stoneTypes = new Set(openedStoneRows.map((row) => row.facilityType));
    const stoneInstalls = window.CHICK_TABLE_SOURCE.InstallFacility
      .filter((row) => row.areaType === 1 && stoneTypes.has(row.facilityType));
    saved.themes.opened = openedStoneRows.map((row) => row.id);
    saved.installed = stoneInstalls.map((row) => row.id);
    saved.resources.acorns = 100000;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  current = await state();
  if (current.progression.themeChickProgress[1].unlocked.length !== 2) {
    throw new Error("Buying 8 Stone parts must unlock the second chick");
  }
  const stoneMiddleRoute = current.progression.unlockedChickRoutes.find((route) => route.customerId === 10012);
  if (stoneMiddleRoute?.customerName !== "공룡 병아리") {
    throw new Error(`The Stone 8-part chick must be the dinosaur chick: ${JSON.stringify(stoneMiddleRoute)}`);
  }
  await page.locator('[data-screen="theme"]').click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, "00c-stone-second-chick-8-parts.png"), fullPage: true });

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const stoneRows = window.CHICK_TABLE_SOURCE.ThemeFacility
      .filter((row) => row.areaType === 1 && row.facilityTheme === 1);
    const stoneTypes = new Set(stoneRows.map((row) => row.facilityType));
    saved.themes.opened = stoneRows.map((row) => row.id);
    saved.installed = window.CHICK_TABLE_SOURCE.InstallFacility
      .filter((row) => row.areaType === 1 && stoneTypes.has(row.facilityType))
      .map((row) => row.id);
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  current = await state();
  if (current.progression.themeChickProgress[1].unlocked.length !== 3) {
    throw new Error("Installing every Stone facility must unlock all three chicks");
  }
  const stoneBonusRoute = current.progression.unlockedChickRoutes.find((route) => route.customerId === 10013);
  if (stoneBonusRoute?.ingredientId !== 30003 || stoneBonusRoute?.recipeId !== 2 || stoneBonusRoute?.recipeName !== "샌드위치") {
    throw new Error(`The Stone completion chick must provide the sandwich route: ${JSON.stringify(stoneBonusRoute)}`);
  }
  await page.locator('[data-screen="theme"]').click();
  await page.locator('[data-action="theme-select"][data-id="2"]').click();
  await page.waitForTimeout(150);
  await page.locator("#menu-content").evaluate((element) => { element.scrollTop = 0; });
  await page.locator(".game-frame").screenshot({ path: path.join(out, "00d-theme-price-curve.png") });
  await page.locator('[data-action="theme-select"][data-id="1"]').click();
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  await page.waitForTimeout(500);
  await page.locator("#menu-content").evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({ path: path.join(out, "00d-stone-three-chicks-complete.png"), fullPage: true });

  const total = current.progression.themeChickProgress[6].total;
  const requiredFirst = 4;
  const requiredSecond = 8;
  const checks = [
    [requiredFirst - 1, 0],
    [requiredFirst, 1],
    [requiredSecond - 1, 1],
    [requiredSecond, 2],
    [total - 1, 2],
    [total, 3],
  ];

  for (const [partCount, chickCount] of checks) {
    await setCampingPartCount(partCount);
    current = await state();
    const progress = current.progression.themeChickProgress[6];
    if (progress.opened !== partCount || progress.unlocked.length !== chickCount) {
      throw new Error(`Camping ${partCount}/${total} should unlock ${chickCount} chicks: ${JSON.stringify(progress)}`);
    }
    if (partCount === requiredSecond || partCount === total) {
      await page.locator('[data-screen="theme"]').click();
      await page.locator('[data-action="theme-select"][data-id="6"]').click();
      await page.waitForFunction(() => [...document.images].every((image) => image.complete));
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(out, `${partCount}-parts.png`), fullPage: true });
    }
  }

  const campingRoutes = current.progression.unlockedChickRoutes.filter((route) => route.themeId === 6);
  if (campingRoutes.length !== 3
    || new Set(campingRoutes.map((route) => route.ingredientId)).size !== 3
    || new Set(campingRoutes.map((route) => route.recipeId)).size !== 3) {
    throw new Error(`Camping chicks need three distinct ingredient/recipe routes: ${JSON.stringify(campingRoutes)}`);
  }

  const expectedCampingChicks = new Set(current.progression.themeChickProgress[6].unlocked);
  const seenCampingChicks = new Map();
  let stoneBonusVisit = null;
  for (let seed = 1; seed <= 80 && (seenCampingChicks.size < expectedCampingChicks.size || !stoneBonusVisit); seed += 1) {
    await page.evaluate((rngSeed) => {
      const key = "chick-bistro-planning-prototype-v2";
      const saved = JSON.parse(localStorage.getItem(key));
      const stoneRows = window.CHICK_TABLE_SOURCE.ThemeFacility.filter((row) => row.areaType === 1 && row.facilityTheme === 1);
      const campingRows = window.CHICK_TABLE_SOURCE.ThemeFacility.filter((row) => row.areaType === 1 && row.facilityTheme === 6);
      saved.themes.opened = [...stoneRows, ...campingRows].map((row) => row.id);
      const stoneTypes = new Set(stoneRows.map((row) => row.facilityType));
      saved.installed = window.CHICK_TABLE_SOURCE.InstallFacility.filter((row) => row.areaType === 1 && stoneTypes.has(row.facilityType)).map((row) => row.id);
      saved.rng = rngSeed;
      saved.guests = [];
      saved.orders = [];
      saved.cooking = [];
      saved.payments = [];
      saved.ingredientDrops = [];
      saved.promotion = { progress: 0, queued: 0, totalClicks: 0 };
      localStorage.setItem(key, JSON.stringify(saved));
    }, seed * 1000);
    await page.reload({ waitUntil: "load" });
    for (let click = 0; click < 5; click += 1) await page.locator("#promotion-btn").click();
    await page.evaluate(() => window.advanceTime(4000));
    const guest = (await state()).guests.find((item) => item.state === "awaiting_order");
    if (guest?.themeId === 6 && expectedCampingChicks.has(guest.customerId)) {
      if (!guest.dropIngredient) throw new Error(`Camping chick has no field ingredient: ${JSON.stringify(guest)}`);
      seenCampingChicks.set(guest.customerId, guest.icon);
    }
    if (guest?.customerId === 10013) stoneBonusVisit = guest;
  }
  if (seenCampingChicks.size !== 3 || new Set(seenCampingChicks.values()).size !== 3) {
    throw new Error(`All three camping chicks must actually visit with distinct icons: ${JSON.stringify([...seenCampingChicks])}`);
  }
  if (!stoneBonusVisit?.icon.endsWith("icon_chick_002.png") || stoneBonusVisit.dropIngredient !== 30003) {
    throw new Error(`Stone completion bonus chick did not visit correctly: ${JSON.stringify(stoneBonusVisit)}`);
  }

  current = await state();
  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`THEME_CHICK_MILESTONES_OK stone=0/8/11 campingTotal=${total} purchases=${requiredFirst}/${requiredSecond}/${total}`);
} finally {
  await browser.close();
}
