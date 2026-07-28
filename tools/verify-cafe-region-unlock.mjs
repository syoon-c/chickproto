import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "cafe-region-unlock");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function setOwnedRecipes(ids) {
  await page.evaluate((recipeIds) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.ownedRecipes = Object.fromEntries(recipeIds.map((id) => [id, {
      level: 1,
      stack: 0,
      codexClaimed: false,
    }]));
    saved.cafeArea = { unlocked: false, expansionConfirmed: false };
    saved.cafeThemes.opened = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, ids);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(200);
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.version = 8;
    saved.cafeArea = { unlocked: true };
    saved.cafeThemes.opened = [101001];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  let current = await state();
  if (current.cafeArea.unlocked || current.cafeArea.expansionConfirmed || current.mode !== "restaurant") {
    throw new Error(`Legacy Cafe data bypassed the recipe expansion gate: ${JSON.stringify(current.cafeArea)}`);
  }

  await setOwnedRecipes([1, 10]);
  current = await state();
  if (current.cafeArea.unlocked || current.cafeArea.expansionAvailable
    || current.cafeArea.discoveredRestaurantRecipeCount !== 2 || current.cafeArea.requiredRecipeCount !== 3
    || current.mode !== "restaurant") {
    throw new Error(`Cafe expansion opened before three recipes: ${JSON.stringify(current.cafeArea)}`);
  }
  if (!await page.locator('[data-world-area="cafe"]').isDisabled()) {
    throw new Error("Cafe area button must remain disabled before three restaurant recipes");
  }
  if (!(await page.locator("#cafe-lock-badge").innerText()).includes("2/3")) {
    throw new Error(`Cafe lock badge did not show recipe progress: ${await page.locator("#cafe-lock-badge").innerText()}`);
  }
  await page.screenshot({ path: path.join(out, "01-two-recipes-locked.png"), fullPage: true });

  await setOwnedRecipes([1, 10, 7]);
  current = await state();
  if (current.cafeArea.unlocked || !current.cafeArea.expansionAvailable
    || current.cafeArea.discoveredRestaurantRecipeCount !== 3
    || !current.progression.unlockedRegions.includes(1)) {
    throw new Error(`Three recipes did not enable Cafe expansion: ${JSON.stringify(current.cafeArea)}`);
  }
  if (await page.locator('[data-world-area="cafe"]').isDisabled()) {
    throw new Error("Cafe area button did not activate after three restaurant recipes");
  }
  await page.locator('[data-world-area="cafe"]').click();
  if (await page.locator("#cafe-expand-btn").isDisabled()) {
    throw new Error("Cafe expansion button did not activate at three recipes");
  }
  if (!(await page.locator("#cafe-lock-badge").innerText()).includes("확장")) {
    throw new Error("Cafe lock badge did not change to expansion available");
  }
  await page.screenshot({ path: path.join(out, "02-three-recipes-ready.png"), fullPage: true });

  await page.locator('[data-world-area="restaurant"]').click();
  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-tab="regions"]').click();
  const regionText = await page.locator("#menu-content").innerText();
  if (!regionText.includes("카페 지역") || !regionText.includes("카페 확장 가능")) {
    throw new Error(`Recipe region card is not linked to Cafe: ${regionText}`);
  }
  await page.screenshot({ path: path.join(out, "03-recipe-region-open.png"), fullPage: true });
  await page.locator("#menu-close-btn").click();

  await page.locator('[data-world-area="cafe"]').click();
  await page.locator("#cafe-expand-btn").click();
  current = await state();
  if (!current.cafeArea.unlocked || !current.cafeArea.expansionAvailable) {
    throw new Error(`Cafe did not open after the unlocked expansion action: ${JSON.stringify(current.cafeArea)}`);
  }
  if (await page.locator("#cafe-expand-btn").isVisible()) {
    throw new Error("Cafe expansion button remained visible after expansion");
  }
  await page.screenshot({ path: path.join(out, "04-cafe-opened.png"), fullPage: true });

  await page.reload({ waitUntil: "load" });
  await page.locator('[data-world-area="cafe"]').click();
  current = await state();
  if (!current.cafeArea.unlocked || current.mode !== "cafe" || current.installCandidates.length === 0) {
    throw new Error(`Cafe expansion did not persist after reload: ${JSON.stringify(current.cafeArea)}`);
  }

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("CAFE_REGION_UNLOCK_OK recipes=3 region=1");
} finally {
  await browser.close();
}
