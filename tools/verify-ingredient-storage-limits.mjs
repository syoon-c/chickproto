import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, "src", "game-config.js"), "utf8"), { filename: "src/game-config.js" });
const {
  GUEST_INGREDIENT_DROP_CHANCE,
  INGREDIENT_STORAGE_INITIAL_CAPACITY,
  INGREDIENT_STORAGE_EXPANSION_AMOUNT,
  INGREDIENT_STORAGE_EXPANSION_GEM_COST,
} = globalThis.CHICK_CONFIG;
if (GUEST_INGREDIENT_DROP_CHANCE !== 0.15
  || INGREDIENT_STORAGE_INITIAL_CAPACITY !== 20
  || INGREDIENT_STORAGE_EXPANSION_AMOUNT !== 5
  || INGREDIENT_STORAGE_EXPANSION_GEM_COST !== 10) {
  throw new Error("Ingredient drop/storage config mismatch");
}

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "ingredient-storage-limits");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function setSave({ ingredients, storageCapacity = 20, gems = 0, drop = null, omitCapacity = false }) {
  await page.evaluate((payload) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const countertop = window.CHICK_TABLE_SOURCE.InstallFacility.find((row) => Number(row.areaType) === 1 && Number(row.facilityType) === 8);
    saved.installed = [...new Set([...saved.installed, countertop.id])];
    saved.tutorial = { activeId: null, seen: ["welcome"] };
    saved.crafting.ingredients = payload.ingredients;
    if (payload.omitCapacity) delete saved.crafting.storageCapacity;
    else saved.crafting.storageCapacity = payload.storageCapacity;
    saved.resources.gems = payload.gems;
    saved.ingredientDrops = payload.drop ? [payload.drop] : [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, { ingredients, storageCapacity, gems, drop, omitCapacity });
  await page.reload({ waitUntil: "load" });
}

async function clickCanvas(x, y) {
  const box = await page.locator("#game-canvas").boundingBox();
  await page.mouse.click(box.x + x / 480 * box.width, box.y + y / 900 * box.height);
}

const makeDrop = (ingredientId, emoji = "🍃") => ({
  id: `storage-${ingredientId}`, ingredientId, emoji,
  items: [{ ingredientId, count: 1 }], totalCount: 1,
  gradeId: 1, gradeName: "첫 방문", ingredientSlot: "primary", x: 240, y: 450,
});

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  let current = await state();
  if (JSON.stringify(current.ingredientStorage) !== JSON.stringify({
    usedSlots: 2, slotLimit: 20, totalItems: 2, totalLimit: 20, capacity: 20, remaining: 18,
    expansionAmount: 5, expansionGemCost: 10, ingredientTypes: 2,
  })) throw new Error(`Initial storage state mismatch: ${JSON.stringify(current.ingredientStorage)}`);

  await setSave({ ingredients: { 30039: 12, 30040: 8 }, storageCapacity: 20, gems: 10, drop: makeDrop(30041) });
  await clickCanvas(240, 450);
  current = await state();
  if (current.ingredientStorage.totalItems !== 20 || current.ingredientDrops.length !== 1 || current.progression.ingredients[30041]) {
    throw new Error("Full 20-slot storage accepted another ingredient");
  }
  if (!(await page.locator("#toast").innerText()).includes("20/20칸")) throw new Error("Full-storage feedback is missing");

  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-tab="ingredients"]').click();
  const summary = await page.locator(".ingredient-inventory-summary").innerText();
  if (!summary.includes("보관 용량") || !summary.includes("20/20칸")) throw new Error(`Storage summary mismatch: ${summary}`);
  const expandButton = page.locator('[data-action="expand-ingredient-storage"]');
  if (await expandButton.isDisabled() || !(await expandButton.innerText()).includes("10") || !(await expandButton.innerText()).includes("+5칸")) {
    throw new Error("Storage expansion button is incorrect");
  }
  await page.screenshot({ path: path.join(out, "01-full-20-slot-storage.png"), fullPage: true });
  await expandButton.click();
  current = await state();
  if (current.ingredientStorage.capacity !== 25 || current.ingredientStorage.remaining !== 5 || current.resources.gems !== 0) {
    throw new Error(`Storage expansion did not spend 10 gems for five slots: ${JSON.stringify(current.ingredientStorage)}`);
  }
  if (!await page.locator('[data-action="expand-ingredient-storage"]').isDisabled()) throw new Error("Expansion button stayed enabled without ten gems");
  await page.screenshot({ path: path.join(out, "02-expanded-25-slot-storage.png"), fullPage: true });

  await page.locator("#menu-close-btn").click();
  await clickCanvas(240, 450);
  current = await state();
  if (current.ingredientStorage.totalItems !== 21 || current.ingredientStorage.remaining !== 4
    || current.progression.ingredients[30041] !== 1 || current.ingredientDrops.length !== 0) {
    throw new Error("Expanded storage did not accept the waiting field ingredient");
  }

  await setSave({ ingredients: { 30039: 17, 30040: 9 }, omitCapacity: true });
  current = await state();
  if (current.ingredientStorage.totalItems !== 26 || current.ingredientStorage.capacity !== 30
    || current.progression.ingredients[30039] !== 17 || current.progression.ingredients[30040] !== 9) {
    throw new Error(`Legacy inventory migration lost items: ${JSON.stringify(current.ingredientStorage)}`);
  }

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("INGREDIENT_STORAGE_EXPANSION_OK initial=20 gems=10 increment=5 fullDropsRemain=true migration=preserved");
} finally {
  await browser.close();
}
