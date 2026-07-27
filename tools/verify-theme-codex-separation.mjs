import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "theme-codex-separation");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const campingRows = window.CHICK_TABLE_SOURCE.ThemeFacility
      .filter((row) => row.areaType === 1 && row.facilityTheme === 6);
    saved.themes.opened = [...new Set([...saved.themes.opened, ...campingRows.map((row) => row.id)])];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  const campingRoutes = (await state()).progression.unlockedChickRoutes.filter((route) => route.themeId === 6);
  if (campingRoutes.length !== 3) {
    throw new Error(`Camping theme must unlock three chicks for this check: ${JSON.stringify(campingRoutes)}`);
  }

  await page.locator('[data-screen="theme"]').click();
  await page.locator('[data-action="theme-select"][data-id="6"]').click();
  await page.waitForTimeout(200);
  const themeText = await page.locator("#menu-content").innerText();
  if (!themeText.includes("새로운 병아리 등장 완료") || !themeText.includes("상세 정보는 도감에서 확인")) {
    throw new Error(`Theme page is missing the generic chick notice: ${themeText}`);
  }
  for (const route of campingRoutes) {
    const privateThemeDetails = [
      route.customerName,
      route.recipeName,
      ...route.rewardItems.map((item) => item.name),
    ].filter(Boolean);
    if (privateThemeDetails.some((detail) => themeText.includes(detail))) {
      throw new Error(`Theme page leaked chick detail for ${route.customerName}: ${themeText}`);
    }
  }
  await page.screenshot({ path: path.join(out, "01-theme-generic-chicks.png"), fullPage: true });

  await page.locator("#collection-btn").click();
  await page.waitForTimeout(200);
  const codexText = await page.locator("#menu-content").innerText();
  for (const route of campingRoutes) {
    const expectedDetails = [
      route.customerName,
      route.recipeName,
      ...route.rewardItems.map((item) => item.name),
    ].filter(Boolean);
    if (expectedDetails.some((detail) => !codexText.includes(detail))) {
      throw new Error(`Codex is missing unlocked chick detail for ${route.customerName}: ${codexText}`);
    }
  }
  if (!codexText.includes("캠핑 테마") || !codexText.includes("연결 레시피") || !codexText.includes("선물")) {
    throw new Error(`Codex is missing source/reward/recipe labels: ${codexText}`);
  }
  await page.screenshot({ path: path.join(out, "02-codex-chick-details.png"), fullPage: true });
  const campingCard = page.locator(".collection-cell", { hasText: campingRoutes[0].customerName });
  await campingCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(out, "03-codex-camping-details.png"), fullPage: true });

  const current = await state();
  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`THEME_CODEX_SEPARATION_OK chicks=${campingRoutes.length}`);
} finally {
  await browser.close();
}
