import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "progressive-multi-recipe-hints");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function setInventoryAndAttempt(ingredientIds, { keepHints = true } = {}) {
  await page.evaluate(({ ingredientIds: ids, keepHints: preserve }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = ids.reduce((inventory, id) => {
      inventory[id] = Number(inventory[id] || 0) + 1;
      return inventory;
    }, {});
    saved.crafting.selected = [];
    if (!preserve) saved.crafting.hints = {};
    localStorage.setItem(key, JSON.stringify(saved));
  }, { ingredientIds, keepHints });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="recipe"]').click();
  for (const ingredientId of ingredientIds) {
    await page.locator(`[data-action="select-ingredient"][data-id="${ingredientId}"]`).click();
  }
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  const toast = await page.locator("#toast").innerText();
  if (await page.locator("#recipe-reveal").isVisible()) {
    await page.locator('[data-action="dismiss-recipe-reveal"]').click();
  }
  return { state: await gameState(), toast };
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
    const countertop = window.CHICK_TABLE_SOURCE.InstallFacility.find((row) => Number(row.areaType) === 1 && Number(row.facilityType) === 8);
    saved.installed = [...new Set([...saved.installed, countertop.id])];
    saved.tutorial = { activeId: null, seen: ["welcome"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });

  const info = await page.evaluate(() => {
    const c = window.CHICK_CONFIG;
    const byName = (name) => c.RECIPE_PROGRESSION.find((route) => route.recipeName === name);
    const ingredient = (key) => c.GAME_INGREDIENTS[key].id;
    return {
      ids: Object.fromEntries(["leaf", "rice", "bread", "sausage", "pasta", "tomato", "garlic", "beef", "cheese", "onion", "mushroom", "water", "fruit"].map((key) => [key, ingredient(key)])),
      routes: {
        hotdog: byName("핫도그"),
        pasta: byName("파스타"),
        burger: byName("햄버거"),
      },
    };
  });

  let result = await setInventoryAndAttempt([info.ids.leaf, info.ids.rice], { keepHints: false });
  const firstHintSnapshot = JSON.stringify(result.state.recipes.hintedRecipes);
  const firstHintCount = Object.keys(result.state.recipes.hintedRecipes).length;
  if (firstHintCount < 2 || !result.toast.includes("외") || !result.toast.includes("힌트")) {
    throw new Error(`A two-slot attempt did not reveal all matching recipes: ${result.toast} / ${firstHintSnapshot}`);
  }

  result = await setInventoryAndAttempt([info.ids.leaf, info.ids.rice]);
  if (JSON.stringify(result.state.recipes.hintedRecipes) !== firstHintSnapshot || result.toast.includes("힌트")) {
    throw new Error(`Repeated matches were announced again: ${result.toast}`);
  }

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.ownedRecipes = {
      1: { level: 1, stack: 0, codexClaimed: true },
      20001: { level: 1, stack: 0, codexClaimed: true },
      20002: { level: 1, stack: 0, codexClaimed: true },
      20003: { level: 1, stack: 0, codexClaimed: true },
      20004: { level: 1, stack: 0, codexClaimed: true },
      20014: { level: 1, stack: 0, codexClaimed: true },
    };
    saved.crafting.bowlCapacity = 5;
    saved.crafting.hints = {};
    localStorage.setItem(key, JSON.stringify(saved));
  });

  result = await setInventoryAndAttempt([info.ids.bread, info.ids.mushroom, info.ids.water], { keepHints: false });
  if (result.state.recipes.hintedRecipes[String(info.routes.hotdog.recipeId)]) {
    throw new Error("A three-slot recipe was revealed with only one correct slot");
  }
  result = await setInventoryAndAttempt([info.ids.bread, info.ids.sausage, info.ids.water]);
  if (result.state.recipes.hintedRecipes[String(info.routes.hotdog.recipeId)]?.revealedCount !== 2) {
    throw new Error("A three-slot recipe was not revealed at two correct slots");
  }

  result = await setInventoryAndAttempt([info.ids.pasta, info.ids.tomato, info.ids.mushroom, info.ids.water]);
  if (result.state.recipes.hintedRecipes[String(info.routes.pasta.recipeId)]?.revealedCount !== 2) {
    throw new Error("A four-slot recipe was not revealed at two correct slots");
  }

  result = await setInventoryAndAttempt([info.ids.bread, info.ids.beef, info.ids.cheese, info.ids.mushroom, info.ids.water]);
  let burgerHint = result.state.recipes.hintedRecipes[String(info.routes.burger.recipeId)];
  if (burgerHint?.revealedCount !== 3) {
    throw new Error(`A five-slot recipe was not revealed at three correct slots: ${JSON.stringify(burgerHint)}`);
  }
  result = await setInventoryAndAttempt([info.ids.bread, info.ids.beef, info.ids.tomato, info.ids.mushroom, info.ids.water]);
  burgerHint = result.state.recipes.hintedRecipes[String(info.routes.burger.recipeId)];
  if (burgerHint?.revealedCount !== 4 || !burgerHint.revealedIngredients.includes("토마토")) {
    throw new Error(`A newly matched slot did not extend the existing hint: ${JSON.stringify(burgerHint)}`);
  }
  const progressiveSnapshot = JSON.stringify(result.state.recipes.hintedRecipes);
  result = await setInventoryAndAttempt([info.ids.bread, info.ids.beef, info.ids.tomato, info.ids.mushroom, info.ids.water]);
  if (JSON.stringify(result.state.recipes.hintedRecipes) !== progressiveSnapshot || result.toast.includes("힌트")) {
    throw new Error(`A repeated five-slot match was announced again: ${result.toast}`);
  }

  const burgerCard = page.locator(`.recipe-catalog-card[data-recipe-id="${info.routes.burger.recipeId}"]`);
  await burgerCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "01-progressive-multi-hints.png") });
  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(result.state, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`PROGRESSIVE_MULTI_RECIPE_HINTS_OK firstMulti=${firstHintCount} thresholds=1/2/2/3 progressiveBurger=4 repeatSilent=true`);
} finally {
  await browser.close();
}
