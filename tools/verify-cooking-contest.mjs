import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "cooking-contest");
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

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.ownedRecipes = Object.fromEntries(window.CHICK_CONFIG.RECIPE_PROGRESSION.slice(0, 5)
      .map((route) => [route.recipeId, { level: 1, stack: 0, codexClaimed: true }]));
    saved.tutorial = { activeId: null, seen: ["welcome", "special-promotion-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  let current = await gameState();
  if (current.contest.unlocked || !await page.locator("#contest-button").isHidden()) {
    throw new Error("Contest appeared before six recipes");
  }

  const target = await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const routes = window.CHICK_CONFIG.RECIPE_PROGRESSION.slice(0, 6);
    saved.ownedRecipes = Object.fromEntries(routes
      .map((route) => [route.recipeId, { level: 1, stack: 0, codexClaimed: true }]));
    const bread = window.CHICK_CONFIG.GAME_INGREDIENTS.bread.id;
    const leaf = window.CHICK_CONFIG.GAME_INGREDIENTS.leaf.id;
    const cheese = window.CHICK_CONFIG.GAME_INGREDIENTS.cheese.id;
    const recipe = routes.find((route) => {
      const ids = route.ingredientRequirements.map((ingredient) => Number(ingredient.id));
      return ids.includes(bread) && ids.includes(leaf);
    });
    saved.crafting.ingredients[cheese] = 3;
    saved.crafting.storageCapacity = Math.max(saved.crafting.storageCapacity, 20);
    saved.resources.gems = 20;
    saved.tutorial = { activeId: null, seen: ["welcome", "special-promotion-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
    return { recipeId: recipe.recipeId, ingredientId: cheese };
  });
  await page.reload({ waitUntil: "load" });
  current = await gameState();
  if (current.tutorial.activeId !== "contest-unlocked" || current.contest.unlocked
    || !await page.locator("#chef-dialogue").isVisible() || !await page.locator("#contest-button").isHidden()) {
    throw new Error(`Six recipes did not trigger contest tutorial: ${JSON.stringify({ tutorial: current.tutorial, contest: current.contest })}`);
  }
  await page.screenshot({ path: path.join(out, "01-contest-unlock.png"), fullPage: true });
  await page.locator("#chef-dialogue").click();
  current = await gameState();
  if (!current.contest.unlocked || await page.locator("#contest-button").isHidden()) {
    throw new Error("Contest button did not unlock after tutorial");
  }
  await page.screenshot({ path: path.join(out, "01b-contest-button.png"), fullPage: true });

  await page.locator("#contest-button").click();
  current = await gameState();
  if (current.currentScreen !== "contest" || current.contest.tiers[0].unlocked !== true
    || current.contest.tiers.slice(1).some((tier) => tier.unlocked) || current.contest.nextEntryCost !== 0) {
    throw new Error(`Initial contest screen is incorrect: ${JSON.stringify(current.contest)}`);
  }
  await page.locator(`[data-action="contest-recipe"][data-id="${target.recipeId}"]`).click();
  await page.locator(`[data-action="contest-ingredient"][data-id="${target.ingredientId}"]`).click();
  await page.screenshot({ path: path.join(out, "02-entry-selection.png"), fullPage: true });

  const beforeEntry = await gameState();
  await page.locator('[data-action="contest-submit"]').click();
  current = await gameState();
  if (!current.contest.judging || current.contest.entriesToday !== 1 || current.contest.nextEntryCost !== 10
    || current.resources.gems !== 20
    || current.progression.ingredients[String(target.ingredientId)] !== beforeEntry.progression.ingredients[String(target.ingredientId)] - 1) {
    throw new Error(`Free contest entry failed: ${JSON.stringify(current.contest)}`);
  }
  await page.screenshot({ path: path.join(out, "03-judging.png"), fullPage: true });
  await page.evaluate(() => window.advanceTime(3_000));
  current = await gameState();
  if (current.contest.judging || current.contest.result?.rank !== 1 || !current.contest.firstPlaceTierIds.includes(1)
    || current.resources.acorns !== beforeEntry.resources.acorns + 800 || current.metrics.contestPrizeMoney !== 800) {
    throw new Error(`Guaranteed preference match did not win first place: ${JSON.stringify({ contest: current.contest, resources: current.resources, metrics: current.metrics })}`);
  }
  await page.screenshot({ path: path.join(out, "04-first-place.png"), fullPage: true });

  await page.locator('[data-action="contest-result-close"]').click();
  const beforePaidEntry = await gameState();
  await page.locator('[data-action="contest-submit"]').click();
  current = await gameState();
  if (!current.contest.judging || current.contest.entriesToday !== 2
    || current.resources.gems !== beforePaidEntry.resources.gems - 10) {
    throw new Error(`Paid re-entry did not cost 10 gems: ${JSON.stringify(current.contest)}`);
  }
  await page.evaluate(() => window.advanceTime(3_000));

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.contest.dayKey = "2000-01-01";
    saved.contest.entriesToday = 9;
    saved.contest.result = null;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  current = await gameState();
  if (current.contest.entriesToday !== 0 || current.contest.nextEntryCost !== 0) {
    throw new Error(`Daily free entry did not reset: ${JSON.stringify(current.contest)}`);
  }

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    window.CHICK_CONFIG.RECIPE_PROGRESSION.slice(0, 20).forEach((route) => {
      saved.ownedRecipes[route.recipeId] ||= { level: 1, stack: 0, codexClaimed: true };
    });
    saved.contest.firstPlaceTierIds = [1];
    saved.tutorial.seen = [...new Set([...saved.tutorial.seen, "buffet-unlocked"] )];
    saved.tutorial.activeId = null;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  current = await gameState();
  if (!current.contest.tiers[1].unlocked || current.contest.tiers[2].unlocked
    || current.contest.tiers[2].requirementText !== "왕국 대회 1등 필요".replace("왕국 대회", "숲속 축제")) {
    throw new Error(`Previous first-place gate is incorrect: ${JSON.stringify(current.contest.tiers)}`);
  }
  await page.locator("#contest-button").click();
  await page.locator('[data-action="contest-tier"][data-id="2"]').click();
  await page.screenshot({ path: path.join(out, "05-next-tier.png"), fullPage: true });

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("COOKING_CONTEST_OK unlock=6 daily=1 free extra=10gems tierGate=recipe+previous-win firstPrize=800");
} finally {
  await browser.close();
}
