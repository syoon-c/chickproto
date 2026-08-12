import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "bottom-sheet-outside-dismiss");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function clickCanvas(x, y) {
  const canvas = page.locator("#game-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas is not visible");
  await page.mouse.click(box.x + x / 480 * box.width, box.y + y / 900 * box.height);
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => typeof window.render_game_to_text === "function");
  await page.locator('[data-screen="theme"]').click();
  let current = await state();
  if (current.currentScreen !== "theme" || !current.themeManagement?.outsideTapDismiss) {
    throw new Error("Theme bottom sheet did not expose outside-tap dismissal.");
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "01-theme-sheet-open.png") });
  const installedBefore = current.installedFacilityIds.length;
  await clickCanvas(240, 240);
  current = await state();
  if (current.currentScreen !== "restaurant" || !await page.locator("#menu-screen").isHidden()
    || current.installedFacilityIds.length !== installedBefore || !await page.locator("#install-panel").isHidden()) {
    throw new Error("Outside theme-sheet tap triggered the field instead of only closing the sheet.");
  }

  await page.evaluate(async () => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const tables = await window.ChickData.loadTables();
    saved.installed = [...new Set([...saved.installed, tables.installs.find((row) => Number(row.facilityType) === 8).id])];
    saved.tutorial = { activeId: null, seen: ["welcome", "recipe-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  current = await state();
  if (current.currentScreen !== "recipe" || !current.recipes.outsideTapDismiss) {
    throw new Error("Cooking-research bottom sheet did not expose outside-tap dismissal.");
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "02-cooking-research-sheet-open.png") });
  await clickCanvas(240, 240);
  current = await state();
  if (current.currentScreen !== "restaurant" || !await page.locator("#menu-screen").isHidden()) {
    throw new Error("Outside cooking-research tap did not close the sheet.");
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "03-outside-tap-closed.png") });
  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log("BOTTOM_SHEET_OUTSIDE_DISMISS_OK theme=yes cookingResearch=yes fieldActionSuppressed=yes");
} finally {
  await browser.close();
}
