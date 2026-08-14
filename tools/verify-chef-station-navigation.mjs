import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "chef-station-navigation");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function clickCanvas(x, y) {
  const box = await page.locator("#game-canvas").boundingBox();
  if (!box) throw new Error("Canvas is not visible");
  await page.mouse.click(box.x + x / 480 * box.width, box.y + y / 900 * box.height);
}

function near(actual, expected, tolerance = 1) {
  return Math.abs(Number(actual) - Number(expected)) <= tolerance;
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();
  await page.evaluate(async () => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const tables = await window.ChickData.loadTables();
    const stationIds = [6, 7, 8].map((facilityType) => tables.installs
      .find((row) => Number(row.facilityType) === facilityType)?.id).filter(Boolean);
    saved.installed = [...new Set([...saved.installed, ...stationIds])];
    saved.crafting.ingredients = { ...saved.crafting.ingredients, 30001: 3, 30067: 2 };
    saved.tutorial = { activeId: null, seen: ["welcome", "recipe-unlocked", "fridge-next", "drops-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));

  let current = await gameState();
  if (!near(current.chef.position.x, 400) || !near(current.chef.position.y, 330)
    || current.facilityInteractions.sinkWater.placement.x !== 178
    || current.facilityInteractions.countertop.placement.x !== 274
    || current.facilityInteractions.fridge.placement.x !== 370) {
    throw new Error(`Initial chef or station placement mismatch: ${JSON.stringify({ chef: current.chef, facilities: current.facilityInteractions })}`);
  }

  await page.locator('[data-screen="recipe"]').click();
  await page.evaluate(() => window.advanceTime(500));
  current = await gameState();
  if (current.currentScreen !== "recipe" || current.currentTab !== "craft" || current.chef.station !== "countertop"
    || current.chef.moving || !near(current.chef.position.x, 274) || !near(current.chef.position.y, 248)) {
    throw new Error(`Chef did not move to the countertop for research: ${JSON.stringify(current.chef)}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "01-chef-at-countertop.png") });

  await page.locator('[data-tab="ingredients"]').click();
  await page.evaluate(() => window.advanceTime(500));
  current = await gameState();
  const fridgeText = await page.locator("#menu-screen").innerText();
  if (current.currentTab !== "ingredients" || current.chef.station !== "fridge" || current.chef.moving
    || !near(current.chef.position.x, 370) || !near(current.chef.position.y, 248)
    || (await page.locator("#menu-title").innerText()).trim() !== "냉장고"
    || !fridgeText.includes("냉장고") || fridgeText.includes("재료 보관함")) {
    throw new Error(`Chef or refrigerator naming did not switch with the tab: ${JSON.stringify({ chef: current.chef, fridgeText })}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "02-chef-at-fridge.png") });

  await page.locator("#menu-close-btn").click();
  await page.evaluate(() => window.advanceTime(500));
  current = await gameState();
  if (current.currentScreen !== "restaurant" || current.chef.station !== "home" || current.chef.moving
    || !near(current.chef.position.x, 400) || !near(current.chef.position.y, 330)) {
    throw new Error(`Chef did not return home after closing the sheet: ${JSON.stringify(current.chef)}`);
  }

  await clickCanvas(274, 174);
  await page.evaluate(() => window.advanceTime(500));
  current = await gameState();
  if (current.currentTab !== "craft" || current.chef.station !== "countertop") {
    throw new Error("Tapping the moved countertop did not open research at the countertop.");
  }
  await page.locator("#menu-close-btn").click();
  await page.evaluate(() => window.advanceTime(500));
  await clickCanvas(370, 174);
  await page.evaluate(() => window.advanceTime(500));
  current = await gameState();
  if (current.currentTab !== "ingredients" || current.chef.station !== "fridge") {
    throw new Error("Tapping the refrigerator did not open the refrigerator tab.");
  }

  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log("CHEF_STATION_NAVIGATION_OK countertop=274 sink=178 fridge=370 movement=tab-target-and-home naming=냉장고");
} finally {
  await browser.close();
}
