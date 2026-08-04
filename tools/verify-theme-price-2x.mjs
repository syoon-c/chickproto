import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "theme-price-2x");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  const result = await page.evaluate(async () => {
    const rows = (await window.ChickData.loadTables()).restaurantThemes
      .filter((row) => Number(row.purchaseType) !== 2);
    const woodByType = new Map(rows.filter((row) => Number(row.facilityTheme) === 2)
      .map((row) => [Number(row.facilityType), Number(row.facilityPrice)]));
    const mismatches = rows.filter((row) => Number(row.facilityTheme) >= 2 && Number(row.facilityPrice)
      !== Math.round(woodByType.get(Number(row.facilityType)) * 2 ** (Number(row.facilityTheme) - 2)));
    const ranges = Object.fromEntries(Array.from({ length: 14 }, (_, index) => index + 2).map((themeId) => {
      const prices = rows.filter((row) => Number(row.facilityTheme) === themeId).map((row) => Number(row.facilityPrice));
      return [themeId, { min: Math.min(...prices), max: Math.max(...prices) }];
    }));
    return { multiplier: window.CHICK_CONFIG.RESTAURANT_THEME_PRICE_MULTIPLIER, mismatches, ranges };
  });
  if (result.multiplier !== 2 || result.mismatches.length
    || result.ranges[2].min !== 1300 || result.ranges[2].max !== 2250
    || result.ranges[3].min !== 2600 || result.ranges[3].max !== 4500
    || result.ranges[4].min !== 5200 || result.ranges[4].max !== 9000) {
    throw new Error(`Theme price curve mismatch: ${JSON.stringify(result)}`);
  }

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.installed = window.CHICK_TABLE_SOURCE.InstallFacility
      .filter((row) => Number(row.areaType) === 1).map((row) => row.id);
    saved.resources.acorns = 1000000000;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="theme"]').click();
  await page.locator('[data-action="theme-select"][data-id="3"]').click();
  const menuText = await page.locator("#menu-screen").innerText();
  if (!menuText.includes("초록 줄무늬 테마") || !menuText.includes("2.6a 구매")) {
    throw new Error(`Green stripe prices are not visible in the theme UI: ${menuText}`);
  }
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "01-green-stripe-2x-prices.png") });
  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log(`THEME_PRICE_2X_OK wood=${result.ranges[2].min}-${result.ranges[2].max} greenStripe=${result.ranges[3].min}-${result.ranges[3].max} blueWhite=${result.ranges[4].min}-${result.ranges[4].max}`);
} finally {
  await browser.close();
}
