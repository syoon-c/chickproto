import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "restaurant-only");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  const activeData = await page.evaluate(async () => {
    const tables = await window.ChickData.loadTables();
    return {
      keys: Object.keys(tables),
      areaTypes: Object.fromEntries(Object.entries(tables.raw)
        .filter(([, rows]) => Array.isArray(rows))
        .map(([name, rows]) => [name, [...new Set(rows.map((row) => row?.areaType).filter((value) => value != null))]])),
      areaExpansionTypes: tables.areaExpansions.map((row) => row.areaType),
    };
  });
  if (activeData.keys.some((key) => /cafe|cake/i.test(key))) {
    throw new Error(`Active table API still exposes removed data: ${JSON.stringify(activeData.keys)}`);
  }
  if (Object.values(activeData.areaTypes).flat().some((areaType) => Number(areaType) === 2)
    || activeData.areaExpansionTypes.some((areaType) => Number(areaType) === 2)) {
    throw new Error(`AreaType 2 survived the restaurant-only loader: ${JSON.stringify(activeData.areaTypes)}`);
  }

  const removedSelectors = [
    "#cafe-expand-btn",
    "#cake-workshop-btn",
    "[data-world-area]",
    "[data-action='buy-cafe-theme']",
    "[data-action='finish-cake']",
  ];
  for (const selector of removedSelectors) {
    if (await page.locator(selector).count()) throw new Error(`Removed control remains in the DOM: ${selector}`);
  }

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.cafeThemes = { opened: [101001] };
    saved.cafeArea = { unlocked: true };
    saved.cakeWorkshop = { totalCrafted: 99 };
    saved.cafeGuests = [{ id: 1 }];
    saved.cafePayments = [{ id: 1, amount: 999 }];
    saved.ui = { ...saved.ui, cafeThemeId: 101, worldArea: "cafe", themeArea: "cafe" };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  await page.locator("#menu-close-btn").click();

  const savedAfterMigration = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("chick-bistro-planning-prototype-v2")));
  const serializedState = await page.evaluate(() => window.render_game_to_text());
  if (["cafeThemes", "cafeArea", "cakeWorkshop", "cafeGuests", "cafePayments"]
    .some((key) => Object.hasOwn(savedAfterMigration, key))) {
    throw new Error(`Legacy removed data was saved again: ${JSON.stringify(Object.keys(savedAfterMigration))}`);
  }
  if (["cafeThemeId", "worldArea", "themeArea"].some((key) => Object.hasOwn(savedAfterMigration.ui, key))) {
    throw new Error(`Legacy removed UI state was saved again: ${JSON.stringify(savedAfterMigration.ui)}`);
  }
  if (/cafe|cake|카페|케이크/i.test(serializedState)) {
    throw new Error("Restaurant state output still includes removed Cafe/Cake data");
  }

  await page.screenshot({ path: path.join(out, "01-restaurant-only.png"), fullPage: true });
  fs.writeFileSync(path.join(out, "active-data.json"), JSON.stringify(activeData, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("RESTAURANT_ONLY_OK areaType=1 legacyCafeState=scrubbed");
} finally {
  await browser.close();
}
