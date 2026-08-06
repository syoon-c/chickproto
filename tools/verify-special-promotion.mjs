import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "special-promotion");
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
    const facilityTypes = new Set([1, 2, 8, 10]);
    saved.installed = window.CHICK_TABLE_SOURCE.InstallFacility
      .filter((row) => Number(row.areaType) === 1 && facilityTypes.has(Number(row.facilityType)))
      .map((row) => row.id);
    saved.ownedRecipes = Object.fromEntries(window.CHICK_CONFIG.RECIPE_PROGRESSION.slice(0, 4)
      .map((route) => [route.recipeId, { level: 1, stack: 0, codexClaimed: true }]));
    saved.tutorial = { activeId: null, seen: ["welcome"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });

  let current = await gameState();
  if (current.recipes.owned !== 4 || current.specialPromotion.unlocked
    || !await page.locator("#special-promotion-btn").isHidden()) {
    throw new Error(`Special promotion appeared before five recipes: ${JSON.stringify(current.specialPromotion)}`);
  }

  const target = await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const craftRoute = window.CHICK_CONFIG.RECIPE_PROGRESSION.find((route) => !saved.ownedRecipes[route.recipeId]
      && Number(route.ingredientCount) === 2 && route.ingredientRequirements.length === 2
      && route.ingredientRequirements[0].id !== route.ingredientRequirements[1].id);
    saved.crafting.ingredients = Object.fromEntries(craftRoute.ingredientRequirements.map((ingredient) => [ingredient.id, 1]));
    saved.crafting.selected = [];
    const carrot = window.CHICK_CONFIG.GAME_INGREDIENTS.carrot;
    const carrotSources = window.CHICK_CONFIG.CORE_PROGRESSION.filter((route) => route.rewardIngredients
      .some((ingredient) => Number(ingredient.id) === carrot.id));
    const carrotThemeIds = new Set(carrotSources.map((route) => Number(route.themeId)));
    const sourceThemeRows = window.CHICK_TABLE_SOURCE.ThemeFacility.filter((row) => Number(row.areaType) === 1
      && carrotThemeIds.has(Number(row.facilityTheme)));
    saved.themes.opened = [...new Set([...saved.themes.opened, ...sourceThemeRows.map((row) => row.id)])];
    saved.collections.customers ||= {};
    carrotSources.forEach((source) => {
      saved.collections.customers[source.customerId] = { count: 150, codexClaimed: true };
    });
    localStorage.setItem(key, JSON.stringify(saved));
    return {
      sourceIds: carrotSources.map((source) => source.customerId),
      ingredientId: carrot.id,
      ingredientName: carrot.name,
      craftIngredientIds: craftRoute.ingredientRequirements.map((ingredient) => ingredient.id),
    };
  });
  await page.reload({ waitUntil: "load" });

  await page.locator('[data-screen="recipe"]').click();
  for (const ingredientId of target.craftIngredientIds) {
    await page.locator(`[data-action="select-ingredient"][data-id="${ingredientId}"]`).click();
  }
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  if (!await page.locator("#recipe-reveal").isVisible()) throw new Error("Fifth recipe discovery reveal did not appear");
  await page.locator('[data-action="dismiss-recipe-reveal"]').click();

  current = await gameState();
  if (current.tutorial.activeId !== "special-promotion-unlocked" || current.specialPromotion.unlocked
    || !await page.locator("#special-promotion-btn").isHidden() || current.currentScreen !== "restaurant"
    || !await page.locator("#menu-screen").isHidden() || !await page.locator("#chef-dialogue").isVisible()) {
    throw new Error(`Five recipes did not trigger the gated tutorial: ${JSON.stringify({ tutorial: current.tutorial, promotion: current.specialPromotion })}`);
  }
  if (!(await page.locator("#chef-dialogue").innerText()).includes("특별 홍보")) throw new Error("Special promotion tutorial copy is missing");
  await page.screenshot({ path: path.join(out, "01-five-recipes-tutorial.png"), fullPage: true });

  await page.locator("#chef-dialogue").click();
  current = await gameState();
  if (!current.specialPromotion.unlocked || await page.locator("#special-promotion-btn").isHidden()) {
    throw new Error("Special promotion did not unlock after tutorial dismissal");
  }

  await page.locator("#special-promotion-btn").click();
  current = await gameState();
  if (!current.specialPromotion.panelVisible) throw new Error("Ingredient invitation panel did not open");
  const availableIds = new Set(current.specialPromotion.availableIngredients.map((item) => item.ingredientId));
  if (!availableIds.has(target.ingredientId)) throw new Error(`Unlocked chick's primary ingredient is missing: ${JSON.stringify(target)}`);
  const lockedIngredientsLeaked = current.specialPromotion.availableIngredients.some((item) => item.guestIds.some((guestId) => !current.progression.unlockedCustomers.includes(guestId)));
  if (lockedIngredientsLeaked) throw new Error("A locked chick appeared in special promotion choices");
  await page.locator("#special-promotion-search").fill(target.ingredientName);
  const choice = page.locator(`[data-ingredient-id="${target.ingredientId}"]`);
  if (await choice.count() !== 1) throw new Error("Ingredient search did not narrow the invitation list");
  await page.screenshot({ path: path.join(out, "02-ingredient-search.png"), fullPage: true });
  await choice.click();

  current = await gameState();
  if (current.specialPromotion.ingredientId !== null || current.specialPromotion.remaining !== 0
    || current.specialPromotion.detail?.ingredientId !== target.ingredientId
    || !current.specialPromotion.detail.sources.length
    || current.specialPromotion.detail.sources.some((source) => !target.sourceIds.includes(source.customerId))
    || !await page.locator("#special-promotion-detail").isVisible()) {
    throw new Error(`Ingredient source popup is incorrect or promotion started too early: ${JSON.stringify(current.specialPromotion)}`);
  }
  const sourceRows = page.locator(".special-promotion-source");
  if (await sourceRows.count() !== current.specialPromotion.detail.sources.length
    || !(await page.locator(".special-promotion-detail-title").innerText()).includes("당근")
    || !(await sourceRows.first().innerText()).includes("재료")) {
    throw new Error("Ingredient source popup did not render compact guest source details");
  }
  await page.screenshot({ path: path.join(out, "03-carrot-source-popup.png"), fullPage: true });
  await page.locator('[data-action="confirm-special-promotion"]').click();

  current = await gameState();
  if (current.specialPromotion.ingredientId !== target.ingredientId || current.specialPromotion.remaining < 59
    || !await page.locator("#special-promotion-btn").isDisabled()
    || !(await page.locator("#special-promotion-label").innerText()).includes(":")) {
    throw new Error(`Special promotion did not start for 60 seconds: ${JSON.stringify(current.specialPromotion)}`);
  }
  await page.locator("#promotion-btn").click();
  current = await gameState();
  if (!current.guests.length || current.guests.some((guest) => !target.sourceIds.includes(guest.customerId))) {
    throw new Error(`Non-target guests appeared during special promotion: ${JSON.stringify(current.guests)}`);
  }
  await page.screenshot({ path: path.join(out, "04-active-target-promotion.png"), fullPage: true });

  await page.evaluate(() => window.advanceTime(30000));
  current = await gameState();
  const activeTimerLabel = await page.locator("#special-promotion-label").innerText();
  if (current.specialPromotion.remaining < 29 || current.specialPromotion.remaining > 31
    || !activeTimerLabel.includes(":")) {
    throw new Error(`Active countdown is incorrect: ${JSON.stringify(current.specialPromotion)}`);
  }

  await page.evaluate(() => window.advanceTime(30000));
  current = await gameState();
  if (current.specialPromotion.remaining !== 0 || current.specialPromotion.cooldown < 29
    || !(await page.locator("#special-promotion-label").innerText()).includes("재사용")) {
    throw new Error(`Thirty-second cooldown did not start: ${JSON.stringify(current.specialPromotion)}`);
  }
  await page.screenshot({ path: path.join(out, "05-cooldown.png"), fullPage: true });

  await page.evaluate(() => window.advanceTime(30000));
  current = await gameState();
  if (current.specialPromotion.cooldown !== 0 || await page.locator("#special-promotion-btn").isDisabled()
    || (await page.locator("#special-promotion-label").innerText()).trim() !== "특별 홍보") {
    throw new Error(`Special promotion did not become reusable: ${JSON.stringify(current.specialPromotion)}`);
  }

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`SPECIAL_PROMOTION_OK recipes=5 tutorial=required target=${target.ingredientName} source-popup=${target.sourceIds.length} duration=60 cooldown=30 filter=unlocked-only`);
} finally {
  await browser.close();
}
