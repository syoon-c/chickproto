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
  { themeId: 1, customerId: 3, ingredientId: 30001, emoji: "🥬", name: "lettuce" },
  { themeId: 6, customerId: 4, ingredientId: 30007, emoji: "🥔", name: "potato" },
  { themeId: 8, customerId: 5, ingredientId: 30002, emoji: "🍅", name: "tomato" },
  { themeId: 25, customerId: 6, ingredientId: 30025, emoji: "🥕", name: "carrot" },
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
    await page.evaluate(({ themeId }) => {
      const key = "chick-bistro-planning-prototype-v2";
      const saved = JSON.parse(localStorage.getItem(key));
      saved.rng = 1;
      saved.installed = window.CHICK_TABLE_SOURCE.InstallFacility
        .filter((row) => row.areaType === 1 && ![11, 19].includes(row.id))
        .map((row) => row.id);
      const themeRows = window.CHICK_TABLE_SOURCE.ThemeFacility
        .filter((row) => row.areaType === 1 && row.facilityTheme === themeId);
      saved.themes.opened = themeId === 1
        ? themeRows.map((row) => row.id)
        : themeRows.slice(0, Math.ceil(themeRows.length * .3)).map((row) => row.id);
      saved.themes.unlockedThemeIds = [themeId];
      saved.guests = [];
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

    let drop = null;
    for (let attempt = 0; attempt < 20 && !drop; attempt += 1) {
      for (let i = 0; i < 5; i += 1) await page.locator("#promotion-btn").click();
      await page.evaluate(() => window.advanceTime(4000));
      const waiting = (await state()).guests.find((guest) => guest.state === "awaiting_order");
      if (!waiting) continue;
      const targetCustomer = waiting.customerId === route.customerId;
      await clickCanvas(waiting.x, waiting.y - 40);
      await page.evaluate(() => window.advanceTime(12000));
      const drops = (await state()).ingredientDrops;
      drop = targetCustomer ? drops.find((item) => item.ingredientId === route.ingredientId) || null : null;
      if (!drop) {
        for (const item of drops) await clickCanvas(item.x, item.y);
      }
    }
    if (!drop || drop.ingredientId !== route.ingredientId || drop.emoji !== route.emoji) {
      throw new Error(`Wrong ${route.name} field drop: ${JSON.stringify(drop)}`);
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
