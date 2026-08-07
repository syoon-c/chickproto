import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "all-ingredient-drops");
fs.mkdirSync(out, { recursive: true });

const routes = [
  { themeId: 1, customerId: 3, ingredientId: 30039, emoji: "🍃", name: "leaf" },
  { themeId: 1, customerId: 10013, ingredientId: 30003, emoji: "🍞", name: "bread" },
  { themeId: 6, customerId: 10061, ingredientId: 30048, emoji: "🥩", name: "beef" },
  { themeId: 8, customerId: 10081, ingredientId: 30027, emoji: "🧄", name: "garlic" },
];

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
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  for (const route of routes) {
    await page.evaluate(({ themeId, customerId }) => {
      const key = "chick-bistro-planning-prototype-v2";
      const saved = JSON.parse(localStorage.getItem(key));
      saved.rng = 1;
      saved.installed = window.CHICK_TABLE_SOURCE.InstallFacility
        .filter((row) => row.areaType === 1 && row.id !== 19)
        .map((row) => row.id);
      const themeRows = window.CHICK_TABLE_SOURCE.ThemeFacility
        .filter((row) => row.areaType === 1 && row.facilityTheme === themeId);
      saved.themes.opened = themeId === 1
        ? themeRows.map((row) => row.id)
        : themeRows.slice(0, Math.ceil(themeRows.length * .3)).map((row) => row.id);
      saved.themes.unlockedThemeIds = [themeId];
      saved.guests = Array.from({ length: 150 }, (_, index) => ({
        id: 70000 + index,
        customerId,
        commonId: 1001,
        customerName: "재료 드랍 검증 병아리",
        state: "eating",
        seatId: `all-drop-${themeId}-${index}`,
        tableId: 0,
        x: 45 + (index % 8) * 55,
        y: 170 + Math.floor(index / 8) * 28,
        targetX: 240,
        targetY: 900,
        recipeId: 1,
        visitNumber: 1,
        wait: 0,
        stateTime: 7.1,
        mood: "satisfied",
        bob: 0,
      }));
      saved.orders = [];
      saved.cooking = [];
      saved.payments = [];
      saved.ingredientDrops = [];
      saved.promotion = { progress: 0, queued: 0, totalClicks: 0 };
      saved.crafting.ingredients = {};
      saved.metrics.ingredientDropAttempts = 0;
      saved.metrics.ingredientDropMisses = 0;
      localStorage.setItem(key, JSON.stringify(saved));
    }, route);
    await page.reload({ waitUntil: "load" });
    await page.evaluate(() => window.advanceTime(34));
    const resolvedState = await state();
    const drop = resolvedState.ingredientDrops.find((item) => item.ingredientId === route.ingredientId) || null;
    if (!drop || drop.ingredientId !== route.ingredientId || drop.emoji !== route.emoji) {
      throw new Error(`Wrong ${route.name} field drop: ${JSON.stringify({ drop, available: resolvedState.ingredientDrops.slice(0, 8), metrics: resolvedState.metrics })}`);
    }
    await page.screenshot({ path: path.join(out, `${route.themeId}-${route.name}.png`), fullPage: true });
    await clickCanvas(drop.x, drop.y);
    if ((await state()).progression.ingredients[route.ingredientId] !== 1) throw new Error(`${route.name} field collection failed`);
  }

  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("ALL_INGREDIENT_DROPS_OK");
} finally {
  await browser.close();
}
