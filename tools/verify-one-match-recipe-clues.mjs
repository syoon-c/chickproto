import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "one-match-recipe-clues");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  const ingredients = await page.evaluate(() => ({
    leaf: window.CHICK_CONFIG.GAME_INGREDIENTS.leaf,
    rice: window.CHICK_CONFIG.GAME_INGREDIENTS.rice,
  }));
  await page.evaluate(({ leaf, rice }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const countertop = window.CHICK_TABLE_SOURCE.InstallFacility.find((row) => Number(row.areaType) === 1 && Number(row.facilityType) === 8);
    saved.installed = [...new Set([...saved.installed, countertop.id])];
    saved.crafting.ingredients = { [leaf.id]: 1, [rice.id]: 1 };
    saved.crafting.selected = [];
    saved.crafting.hints = {};
    localStorage.setItem(key, JSON.stringify(saved));
  }, ingredients);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  await page.locator(`[data-action="select-ingredient"][data-id="${ingredients.leaf.id}"]`).click();
  await page.locator(`[data-action="select-ingredient"][data-id="${ingredients.rice.id}"]`).click();
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  await page.locator('[data-action="dismiss-recipe-reveal"]').click();

  const current = await gameState();
  const hint = current.recipes.hintedRecipes["20014"];
  if (JSON.stringify(current.recipes.hintRule?.thresholds) !== JSON.stringify({ 2: 1, 3: 2, 4: 2, 5: 3 })
    || !current.recipes.hintRule?.revealAllQualifyingRecipes
    || hint?.recipeName !== "새싹 샐러드"
    || JSON.stringify(hint.revealedIngredients) !== JSON.stringify(["나뭇잎"])
    || JSON.stringify(hint.missingClues) !== JSON.stringify(["초록색 채소"])) {
    throw new Error(`One-match hint is incorrect: ${JSON.stringify(current.recipes.hintedRecipes)}`);
  }

  const hintedCard = page.locator('.recipe-catalog-card[data-recipe-id="20014"]');
  const hintedText = await hintedCard.innerText();
  if (!hintedText.includes("새싹 샐러드")
    || !hintedText.includes("나뭇잎")
    || !hintedText.includes("초록색 채소가 더 필요할 것 같아요")
    || hintedText.includes("양상추")
    || hintedText.includes("쌀")) {
    throw new Error(`Hint card exposed the wrong information: ${hintedText}`);
  }
  const unrelatedName = await page.locator('.recipe-catalog-card[data-recipe-id="20002"] .recipe-catalog-copy > strong').innerText();
  if (unrelatedName !== "???") throw new Error(`Unrelated recipe name leaked: ${unrelatedName}`);
  if (Object.keys(current.recipes.hintedRecipes).length < 2) {
    throw new Error(`One combination did not reveal every qualifying recipe: ${JSON.stringify(current.recipes.hintedRecipes)}`);
  }

  await hintedCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "01-sprout-salad-clue.png") });
  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`ONE_MATCH_RECIPE_CLUES_OK recipe=sprout-salad correct=leaf multiHints=${Object.keys(current.recipes.hintedRecipes).length} clue=green-vegetable`);
} finally {
  await browser.close();
}
