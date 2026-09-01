import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "sink-water-and-recipe-sheet");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));

async function clickCanvas(x, y) {
  const canvas = page.locator("#game-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas is not visible");
  await page.mouse.click(box.x + x / 480 * box.width, box.y + y / 900 * box.height);
}

const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => typeof window.render_game_to_text === "function"
    && JSON.parse(window.render_game_to_text()).currentScreen === "restaurant");
  await page.locator('[data-screen="theme"]').click();
  await page.locator("#menu-close-btn").click();

  await page.evaluate(async () => {
    const key = "chick-bistro-planning-prototype-v2";
    const tables = await window.ChickData.loadTables();
    const saved = JSON.parse(localStorage.getItem(key));
    const facilityIds = [7, 8].map((type) => tables.installs.find((row) => Number(row.facilityType) === type)?.id).filter(Boolean);
    saved.installed = [...new Set([...saved.installed, ...facilityIds])];
    saved.crafting.ingredients = { 30001: 1 };
    saved.crafting.storageCapacity = 20;
    saved.tutorial = { activeId: null, seen: ["welcome", "recipe-unlocked", "fridge-next", "drops-unlocked"] };
    saved.facilityInteractions.sinkWater.readyAt = Number(saved.clock || 0) + 8;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));

  let current = await gameState();
  if (!current.facilityInteractions.sinkWater.installed
    || current.facilityInteractions.sinkWater.acquisition !== "guaranteed-after-timer"
    || current.facilityInteractions.sinkWater.chance !== 1
    || current.facilityInteractions.sinkWater.ready !== false) {
    throw new Error(`Sink interaction was not configured: ${JSON.stringify(current.facilityInteractions.sinkWater)}`);
  }

  await clickCanvas(178, 174);
  current = await gameState();
  let savedWaterAmount = await page.evaluate(() => Number(JSON.parse(localStorage.getItem("chick-bistro-planning-prototype-v2")).crafting.ingredients[30067] || 0));
  if (savedWaterAmount !== 0 || current.facilityInteractions.sinkWater.attempts !== 0
    || !current.toast.text?.includes("초 후")) {
    throw new Error("Sink granted water before its guaranteed timer completed.");
  }
  await page.evaluate(() => window.advanceTime(8100));
  current = await gameState();
  if (!current.facilityInteractions.sinkWater.ready || current.facilityInteractions.sinkWater.remainingCooldown !== 0) {
    throw new Error("Sink did not become ready after eight seconds.");
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "00-sink-water-ready.png") });

  await clickCanvas(178, 174);
  current = await gameState();
  const savedAfterWater = await page.evaluate(() => JSON.parse(localStorage.getItem("chick-bistro-planning-prototype-v2")));
  if (savedAfterWater.crafting.ingredients[30067] !== 1
    || current.facilityInteractions.sinkWater.attempts !== 1
    || current.facilityInteractions.sinkWater.collected !== 1
    || current.facilityInteractions.sinkWater.ready !== false
    || current.facilityInteractions.sinkWater.remainingCooldown < 7) {
    throw new Error(`Sink did not grant guaranteed water and restart its timer: ${JSON.stringify({ sink: current.facilityInteractions.sinkWater, water: savedAfterWater.crafting.ingredients[30067] })}`);
  }
  if (!current.toast.text?.includes("물 ×1 획득")) throw new Error(`Sink success feedback is missing: ${JSON.stringify(current.toast)}`);

  await clickCanvas(178, 174);
  current = await gameState();
  const savedDuringCooldown = await page.evaluate(() => JSON.parse(localStorage.getItem("chick-bistro-planning-prototype-v2")));
  if (savedDuringCooldown.crafting.ingredients[30067] !== 1 || current.facilityInteractions.sinkWater.attempts !== 1
    || !current.toast.text?.includes("초 후")) {
    throw new Error("Sink cooldown did not block immediate repeated collection.");
  }

  await page.evaluate(() => window.advanceTime(8100));
  await clickCanvas(178, 174);
  current = await gameState();
  savedWaterAmount = await page.evaluate(() => Number(JSON.parse(localStorage.getItem("chick-bistro-planning-prototype-v2")).crafting.ingredients[30067] || 0));
  if (savedWaterAmount !== 2 || current.facilityInteractions.sinkWater.collected !== 2) {
    throw new Error("Sink did not grant guaranteed water again after the next timer.");
  }

  await clickCanvas(274, 174);
  current = await gameState();
  if (current.currentScreen !== "recipe" || current.recipes.presentation !== "bottom-sheet") {
    throw new Error(`Countertop did not open the recipe sheet: ${JSON.stringify({ screen: current.currentScreen, recipes: current.recipes })}`);
  }
  const worldBox = await page.locator(".world-area").boundingBox();
  const menuBox = await page.locator("#menu-screen").boundingBox();
  if (!worldBox || !menuBox) throw new Error("Recipe sheet is not visible.");
  const startRatio = (menuBox.y - worldBox.y) / worldBox.height;
  const heightRatio = menuBox.height / worldBox.height;
  if (startRatio < .36 || startRatio > .40 || heightRatio < .60 || heightRatio > .64) {
    throw new Error(`Recipe sheet is not approximately 62% height: ${JSON.stringify({ startRatio, heightRatio })}`);
  }
  const upperLayer = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return { id: element?.id || null, insideMenu: Boolean(element?.closest?.("#menu-screen")) };
  }, { x: worldBox.x + worldBox.width / 2, y: worldBox.y + worldBox.height * .20 });
  if (upperLayer.insideMenu) throw new Error(`Recipe sheet covers the upper restaurant: ${JSON.stringify(upperLayer)}`);
  if (!await page.locator(".mixing-board").isVisible()) throw new Error("Countertop did not open the crafting tab.");
  if ((await page.locator("#menu-title").innerText()).trim() !== "요리 연구"
    || (await page.locator("#recipe-nav-label").innerText()).trim() !== "요리 연구") {
    throw new Error("Recipe-facing navigation was not renamed to 요리 연구.");
  }
  if ((await page.locator("#menu-screen").innerText()).includes("레시피")) {
    throw new Error("The cooking-research sheet still contains the old 레시피 label.");
  }
  if (await page.locator(".recipe-ingredient-dialog").count() !== 0
    || await page.locator("#menu-content > .combination-picker").count() !== 0) {
    throw new Error("Ingredient choices should stay hidden until the bowl is tapped.");
  }
  const bottomControlsBox = await page.locator("#bottom-controls").boundingBox();
  const autoButtonBox = await page.locator(".auto-research-button").boundingBox();
  const recipeScrollTop = await page.locator("#menu-content").evaluate((element) => element.scrollTop);
  if (!bottomControlsBox || !autoButtonBox || recipeScrollTop !== 0
    || await page.locator(".combination-lab > .combination-discover").count() !== 0
    || autoButtonBox.y + autoButtonBox.height > bottomControlsBox.y) {
    throw new Error(`The outside mix button was not removed or auto research is clipped: ${JSON.stringify({ bottomControlsBox, autoButtonBox, recipeScrollTop })}`);
  }

  await page.locator(".game-frame").screenshot({ path: path.join(out, "01-countertop-recipe-sheet.png") });
  await page.locator(".mixing-board").click();
  const picker = page.locator(".recipe-ingredient-dialog");
  await picker.waitFor({ state: "visible" });
  const pickerBox = await picker.boundingBox();
  if (!pickerBox || pickerBox.y < menuBox.y || pickerBox.y + pickerBox.height > menuBox.y + menuBox.height + 1
    || (await picker.locator("h3").innerText()).trim() !== "재료 넣기") {
    throw new Error(`Bowl ingredient picker escaped the cooking-research sheet: ${JSON.stringify({ pickerBox, menuBox })}`);
  }
  if ((await picker.locator("header small").innerText()).trim() !== "최대 2개"
    || await picker.locator(".recipe-picker-capacity").count() !== 0
    || await picker.locator(".recipe-picker-empty-slot").count() !== 2
    || !await picker.locator(".recipe-picker-mix").isDisabled()) {
    throw new Error("The ingredient popup does not clearly show its empty 0/2 capacity.");
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "02a-bowl-capacity-empty.png") });
  await picker.locator('[data-action="select-ingredient"][data-id="30067"]').click();
  if (await picker.locator('.recipe-picker-selected [data-id="30067"]').count() !== 1) {
    throw new Error("Selecting water in the bowl popup did not keep the popup open or update the selection.");
  }
  if (await picker.locator(".recipe-picker-empty-slot").count() !== 1
    || !await picker.locator(".recipe-picker-mix").isDisabled()) {
    throw new Error("The ingredient popup did not update its remaining capacity after one selection.");
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "02b-bowl-capacity-one-left.png") });
  await picker.locator('[data-action="select-ingredient"][data-id="30001"]').click();
  if (await picker.locator(".recipe-picker-empty-slot").count() !== 0
    || await picker.locator('[data-action="select-ingredient"]:not([disabled])').count() !== 0
    || await picker.locator(".recipe-picker-mix").isDisabled()
    || !(await picker.locator(".recipe-picker-mix").innerText()).includes("바로 섞기")) {
    throw new Error("The ingredient popup did not show a full 2/2 bowl or disable further selections.");
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "02c-bowl-capacity-full.png") });
  await picker.locator(".recipe-picker-mix").click();
  current = await gameState();
  if (await picker.count() !== 0 || current.recipes.ingredientPickerOpen || !current.recipes.research
    || current.recipes.selectedIngredients.length || current.recipes.outsideMixButton !== false
    || current.recipes.ingredientSelection !== "tap-bowl-popup-mix-inside") {
    throw new Error(`Mixing inside the ingredient popup did not start research directly: ${JSON.stringify(current.recipes)}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "02d-popup-mix-started.png") });
  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log(`SINK_WATER_RECIPE_SHEET_OK guaranteed=yes cooldown=8s repeated=2 start=${startRatio.toFixed(2)} height=${heightRatio.toFixed(2)} mix=inside-popup naming=요리연구`);
} finally {
  await browser.close();
}
