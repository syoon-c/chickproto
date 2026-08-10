import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "theme-completion-bonus");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const readState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();
  await page.locator('[data-screen="theme"]').click();

  let state = await readState();
  const initialMultiplier = state.recipes.salePriceMultipliers.restaurantPriceUp;
  const effect = page.locator(".theme-completion-effect");
  if (!await effect.innerText().then((text) => text.includes("전체 구매 효과") && text.includes("메뉴 가격 +20% 상승"))) {
    throw new Error(`Completion effect copy is missing: ${await effect.innerText()}`);
  }
  if (!await effect.evaluate((node) => node.classList.contains("is-locked"))) throw new Error("Incomplete Stone theme effect must be locked.");
  if (!await effect.locator('img[src$="icon_lock.png"]').count()) throw new Error("Locked completion effect must use the lock asset.");
  if (state.themeManagement.completionEffect.achieved || state.themeManagement.completionEffect.menuPriceBonusPercent !== 20) {
    throw new Error(`Initial completion state is incorrect: ${JSON.stringify(state.themeManagement.completionEffect)}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "01-locked-20-percent-effect.png") });

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const stoneTypes = new Set(window.CHICK_TABLE_SOURCE.ThemeFacility
      .filter((row) => Number(row.areaType) === 1 && Number(row.facilityTheme) === 1 && Number(row.purchaseType) === 1)
      .map((row) => Number(row.facilityType)));
    const oneInstallPerType = window.CHICK_TABLE_SOURCE.InstallFacility
      .filter((row) => Number(row.areaType) === 1 && stoneTypes.has(Number(row.facilityType)))
      .filter((row, index, rows) => rows.findIndex((candidate) => Number(candidate.facilityType) === Number(row.facilityType)) === index)
      .map((row) => Number(row.id));
    saved.installed = [...new Set([...saved.installed, ...oneInstallPerType])];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="theme"]').click();

  state = await readState();
  const completedMultiplier = state.recipes.salePriceMultipliers.restaurantPriceUp;
  if (!state.themeManagement.completionEffect.achieved
    || !state.themeManagement.completionEffect.completedThemeIds.includes(1)
    || Math.abs(completedMultiplier - initialMultiplier - .2) > 1e-9) {
    throw new Error(`Stone completion did not add exactly 20%: ${JSON.stringify({ initialMultiplier, completedMultiplier, completion: state.themeManagement.completionEffect })}`);
  }
  if (!await effect.evaluate((node) => node.classList.contains("is-complete"))) throw new Error("Completed Stone theme effect did not activate visually.");
  if (!await effect.locator('img[src$="icon_check.png"]').count()) throw new Error("Completed effect must use the check asset.");
  await page.locator(".game-frame").screenshot({ path: path.join(out, "02-active-20-percent-effect.png") });

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const woodRows = window.CHICK_TABLE_SOURCE.ThemeFacility
      .filter((row) => Number(row.areaType) === 1 && Number(row.facilityTheme) === 2 && Number(row.purchaseType) === 1);
    saved.themes.opened = [...new Set([...saved.themes.opened, ...woodRows.map((row) => Number(row.id))])];
    saved.ui.themeId = 2;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="theme"]').click();
  await page.locator('[data-action="theme-select"][data-id="2"]').click();
  state = await readState();
  const twoCompletedMultiplier = state.recipes.salePriceMultipliers.restaurantPriceUp;
  const woodPartBonus = state.themeManagement.parts.reduce((sum, part) => sum + Number(part.incomePercent || 0), 0) / 100;
  if (!state.themeManagement.completionEffect.achieved
    || state.themeManagement.completionEffect.completedThemeIds.join(",") !== "1,2"
    || Math.abs(twoCompletedMultiplier - completedMultiplier - woodPartBonus - .2) > 1e-9) {
    throw new Error(`Completion bonus does not stack per completed theme: ${JSON.stringify({ completion: state.themeManagement.completionEffect, completedMultiplier, twoCompletedMultiplier, woodPartBonus })}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "03-two-completed-themes.png") });

  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(state, null, 2));
  console.log(`THEME_COMPLETION_BONUS_OK bonus=20% completed=${state.themeManagement.completionEffect.completedThemeIds.join(",")}`);
} finally {
  await browser.close();
}
