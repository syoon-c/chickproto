import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "bottom-controls-inventory");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));

const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });

  const labels = await page.locator(".bottom-nav .nav-button strong").allTextContents();
  if (labels.join(",") !== "테마,레시피,손님") throw new Error(`Unexpected bottom navigation: ${labels.join(",")}`);
  if (await page.locator("[data-screen='missions'],[data-screen='staff'],#collection-btn").count()) {
    throw new Error("Removed task/staff/top collection controls remain");
  }
  const canvasBox = await page.locator("#game-canvas").boundingBox();
  const controlsBox = await page.locator(".bottom-controls").boundingBox();
  const promoBox = await page.locator("#promotion-btn").boundingBox();
  if (!canvasBox || !controlsBox || !promoBox || controlsBox.y < canvasBox.y + canvasBox.height - 1) {
    throw new Error("Bottom controls overlap the restaurant canvas");
  }
  if (promoBox.x + promoBox.width < controlsBox.x + controlsBox.width - 12) {
    throw new Error("Promotion button is not at the bottom-right edge");
  }
  const initial = await state();
  if (initial.activeSystems.missions || initial.activeSystems.staff) throw new Error("Removed systems are still active");
  await page.screenshot({ path: path.join(out, "01-bottom-controls.png"), fullPage: true });

  await page.locator('[data-screen="recipe"]').click();
  const recipeTabs = await page.locator("#menu-tabs button").allTextContents();
  if (recipeTabs.join(",") !== "제작,레시피 1,재료 보관함") throw new Error(`Unexpected recipe tabs: ${recipeTabs.join(",")}`);
  await page.locator('[data-tab="ingredients"]').click();
  if (!(await page.locator(".ingredient-inventory-grid").isVisible())) throw new Error("Ingredient inventory category did not open");
  await page.locator("#menu-close-btn").click();

  await page.evaluate(async () => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const tables = await window.ChickData.loadTables();
    const fridge = tables.installs.find((row) => Number(row.facilityType) === 6);
    saved.installed = [...new Set([...saved.installed, fridge.id])];
    saved.crafting.ingredients = { ...saved.crafting.ingredients, 30001: 7 };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  const fridgePoint = await page.evaluate(async () => {
    const tables = await window.ChickData.loadTables();
    const fridge = tables.installs.find((row) => Number(row.facilityType) === 6);
    return window.CHICK_CONFIG.facilityPlacement(fridge);
  });
  const refreshedCanvas = await page.locator("#game-canvas").boundingBox();
  await page.mouse.click(
    refreshedCanvas.x + fridgePoint.x / 480 * refreshedCanvas.width,
    refreshedCanvas.y + fridgePoint.y / 900 * refreshedCanvas.height,
  );
  const fridgeState = await state();
  if (fridgeState.currentScreen !== "recipe" || fridgeState.currentTab !== "ingredients") {
    throw new Error(`Fridge did not open inventory: ${JSON.stringify({ screen: fridgeState.currentScreen, tab: fridgeState.currentTab })}`);
  }
  const lettuceCount = await page.locator('[data-ingredient-id="30001"] b').textContent();
  if (lettuceCount !== "7개") throw new Error(`Stored ingredient count mismatch: ${lettuceCount}`);
  if (await page.locator(".ingredient-inventory-item").count() !== 1
    || await page.locator(".ingredient-storage-panel").count() !== 1) throw new Error("Ingredient storage does not render the shared-capacity layout");
  await page.screenshot({ path: path.join(out, "02-fridge-inventory.png"), fullPage: true });

  await page.locator("#menu-close-btn").click();
  await page.locator('[data-screen="collection"]').click();
  if ((await state()).currentScreen !== "collection") throw new Error("Guest button did not open the guest collection");

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(await state(), null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("BOTTOM_CONTROLS_INVENTORY_OK nav=theme/recipe/guests fridge=inventory systems=disabled");
} finally {
  await browser.close();
}
