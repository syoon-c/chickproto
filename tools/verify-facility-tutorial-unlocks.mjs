import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "facility-tutorial-unlocks");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function clickCanvas(x, y) {
  const canvas = page.locator("#game-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas is not visible");
  await page.mouse.click(box.x + x / 480 * box.width, box.y + y / 900 * box.height);
}

async function dismissDialogue() {
  if (await page.locator("#chef-dialogue").isVisible()) await page.locator("#chef-dialogue").click();
}

async function installCandidateById(id) {
  await dismissDialogue();
  const current = await gameState();
  const candidate = current.installCandidates.find((entry) => entry.id === id);
  if (!candidate) throw new Error(`Install candidate ${id} is unavailable: ${JSON.stringify(current.installCandidates)}`);
  await clickCanvas(candidate.x, candidate.y);
  await page.locator("#install-confirm-btn").click();
}

async function serveOneGuest() {
  let waiting = null;
  for (let attempt = 0; attempt < 6 && !waiting; attempt += 1) {
    await page.locator("#promotion-btn").click();
    await page.evaluate(() => window.advanceTime(4500));
    waiting = (await gameState()).guests.find((guest) => guest.state === "awaiting_order");
  }
  if (!waiting) throw new Error("A normal restaurant guest did not arrive");
  await clickCanvas(waiting.x, waiting.y - 40);
  await page.evaluate(() => window.advanceTime(13000));
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });

  let current = await gameState();
  const recipeNav = page.locator('[data-screen="recipe"]');
  if (current.recipes.systemUnlocked || current.progression.ingredientDropRule.unlocked
    || !await recipeNav.evaluate((element) => element.classList.contains("is-locked"))
    || current.tutorial.activeId !== "welcome") {
    throw new Error(`Initial facility locks are incorrect: ${JSON.stringify(current)}`);
  }
  await recipeNav.click();
  current = await gameState();
  if (current.currentScreen !== "restaurant" || current.tutorial.activeId !== "recipe-locked"
    || !(await page.locator("#chef-dialogue").innerText()).includes("도마 테이블")) {
    throw new Error("The locked recipe button did not call the chef tutorial");
  }
  await page.screenshot({ path: path.join(out, "01-recipe-locked-dialogue.png"), fullPage: true });
  await dismissDialogue();

  const installOrder = await page.evaluate(async () => {
    const tables = await window.ChickData.loadTables();
    const countertop = tables.installs.find((row) => Number(row.facilityType) === 8);
    const fridge = tables.installs.find((row) => Number(row.facilityType) === 6);
    return { beforeCountertop: tables.installs.slice(0, tables.installs.indexOf(countertop) + 1).map((row) => row.id), countertopId: countertop.id, fridgeId: fridge.id };
  });
  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.resources.acorns = 10000;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });

  for (const installId of installOrder.beforeCountertop) await installCandidateById(installId);
  current = await gameState();
  if (!current.recipes.systemUnlocked || current.progression.ingredientDropRule.unlocked
    || current.tutorial.activeId !== "recipe-unlocked"
    || await recipeNav.evaluate((element) => element.classList.contains("is-locked"))) {
    throw new Error(`Countertop did not unlock recipes only: ${JSON.stringify(current)}`);
  }
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(out, "02-countertop-recipe-unlocked.png"), fullPage: true });
  await page.locator("#chef-dialogue").click();
  current = await gameState();
  if (current.tutorial.activeId !== "fridge-next" || !(await page.locator("#chef-dialogue").innerText()).includes("냉장고")) {
    throw new Error("The countertop tutorial did not continue to the refrigerator guide");
  }
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(out, "03-fridge-next-dialogue.png"), fullPage: true });
  await dismissDialogue();

  await recipeNav.click();
  if ((await gameState()).currentScreen !== "recipe") throw new Error("Recipe menu remained locked after countertop installation");
  await page.locator("#menu-close-btn").click();

  await serveOneGuest();
  current = await gameState();
  if (current.metrics.ingredientDropAttempts !== 0 || current.ingredientDrops.length !== 0) {
    throw new Error("A guest attempted to drop ingredients before refrigerator installation");
  }

  await installCandidateById(installOrder.fridgeId);
  current = await gameState();
  if (!current.progression.ingredientDropRule.unlocked || current.tutorial.activeId !== "drops-unlocked"
    || !(await page.locator("#chef-dialogue").innerText()).includes("재료")) {
    throw new Error(`Refrigerator did not unlock ingredient drops: ${JSON.stringify(current)}`);
  }
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(out, "04-fridge-drop-unlocked.png"), fullPage: true });
  await dismissDialogue();

  await serveOneGuest();
  current = await gameState();
  if (current.metrics.ingredientDropAttempts !== 1) {
    throw new Error(`Ingredient drop roll did not start after refrigerator installation: ${current.metrics.ingredientDropAttempts}`);
  }

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("FACILITY_TUTORIAL_UNLOCKS_OK recipe=countertop drops=fridge dialogue=chef beforeDropAttempts=0 afterDropAttempts=1");
} finally {
  await browser.close();
}
