import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, "data", "runtime-tables.js"), "utf8"), {
  filename: "data/runtime-tables.js",
});
vm.runInThisContext(fs.readFileSync(path.join(root, "src", "game-config.js"), "utf8"), {
  filename: "src/game-config.js",
});

const {
  BASE_CAKE_INGREDIENTS,
  CAFE_THEME_CAKE_REWARDS,
  CAKE_RECIPES,
} = globalThis.CHICK_CONFIG;
const cafeRows = globalThis.CHICK_TABLE_SOURCE.InstallFacility.filter((row) => row.areaType === 2);
const shelf = cafeRows.find((row) => row.facilityType === 18);
if (!shelf) throw new Error("Unity cafe cake shelf row was not found");
if (CAKE_RECIPES.length < 5) throw new Error(`Expected at least five cake combinations, got ${CAKE_RECIPES.length}`);
if (!CAKE_RECIPES.some((recipe) => recipe.id === "cake_recipe_walnut_mocha")) {
  throw new Error("Cross-theme walnut mocha recipe is missing");
}

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "cake-workshop");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
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

  const openedPartIds = [101, 102].flatMap((themeId) =>
    cafeRows.map((row) => themeId * 1000 + Number(row.id)));
  const ingredientIds = [
    ...BASE_CAKE_INGREDIENTS,
    ...Object.values(CAFE_THEME_CAKE_REWARDS).flat(),
  ].map((ingredient) => ingredient.id);
  await page.evaluate(({ openedPartIds: ids, ingredientIds: cakes }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.ownedRecipes = {
      1: { level: 1, stack: 0, codexClaimed: false },
      7: { level: 1, stack: 0, codexClaimed: false },
      10: { level: 1, stack: 0, codexClaimed: false },
    };
    saved.cafeArea = { unlocked: true, expansionConfirmed: true };
    saved.cafeThemes = { opened: ids, activeThemeId: 101, cakeIngredients: cakes };
    localStorage.setItem(key, JSON.stringify(saved));
  }, { openedPartIds, ingredientIds });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-world-area="cafe"]').click();

  if (!await page.locator("#cake-workshop-btn").isVisible()) {
    throw new Error("The installed cake shelf did not expose the Cake making button");
  }
  await page.locator("#cake-workshop-btn").click();
  let state = await gameState();
  if (state.currentScreen !== "cake" || !state.cafeArea.bakingFacilityInstalled) {
    throw new Error(`Cake workshop did not open from the installed shelf: ${JSON.stringify(state.cafeArea)}`);
  }
  const workshopText = await page.locator("#menu-content").innerText();
  if (!workshopText.includes("시트 맛") || !workshopText.includes("크림 맛")
    || !workshopText.includes("대표 토핑") || !workshopText.includes("오늘의 무료 제작")) {
    throw new Error(`Cake workshop is missing required steps: ${workshopText}`);
  }
  await page.screenshot({ path: path.join(out, "01-workshop-open.png"), fullPage: true });

  await page.locator('[data-part-id="cake_sheet_walnut"]').click();
  await page.locator('[data-part-id="cake_cream_espresso"]').click();
  await page.locator('[data-part-id="cake_topping_chocolate"]').click();
  const preview = page.locator(".cake-preview");
  await preview.scrollIntoViewIfNeeded();
  await preview.click({ position: { x: 115, y: 85 } });
  await preview.click({ position: { x: 220, y: 120 } });
  state = await gameState();
  if (state.cakeWorkshop.matchedRecipe !== "cake_recipe_walnut_mocha"
    || state.cakeWorkshop.toppingCount !== 2) {
    throw new Error(`Cross-theme cake did not match before completion: ${JSON.stringify(state.cakeWorkshop)}`);
  }
  await page.screenshot({ path: path.join(out, "02-cross-theme-decoration.png"), fullPage: true });

  await page.locator('[data-action="finish-cake"][data-currency="free"]').click();
  state = await gameState();
  if (state.cakeWorkshop.freeCraftAvailable
    || !state.cakeWorkshop.discoveredRecipeIds.includes("cake_recipe_walnut_mocha")
    || state.cakeWorkshop.limitedSale?.name !== "호두 모카 케이크"
    || state.cakeWorkshop.limitedSale?.remaining !== 5) {
    throw new Error(`Cake completion result mismatch: ${JSON.stringify(state.cakeWorkshop)}`);
  }
  const resultText = await page.locator("#menu-content").innerText();
  if (!resultText.includes("신규 레시피 발견") || !resultText.includes("호두 모카 케이크")
    || !resultText.includes("5조각 한정 판매")) {
    throw new Error(`Cake result UI mismatch: ${resultText}`);
  }
  if (!await page.locator('[data-action="finish-cake"][data-currency="ideas"]').isDisabled()
    || !await page.locator('[data-action="finish-cake"][data-currency="gems"]').isDisabled()) {
    throw new Error("Paid repeat craft buttons must be disabled without ideas or gems");
  }
  await page.screenshot({ path: path.join(out, "03-recipe-discovered.png"), fullPage: true });

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.guests = [{
      id: 9001,
      customerId: 1,
      commonId: 1,
      state: "eating",
      seatId: "cake-test-seat",
      tableId: 0,
      x: 240,
      y: 450,
      targetX: 240,
      targetY: 900,
      recipeId: 1,
      wait: 0,
      stateTime: 3.3,
      mood: "satisfied",
      bob: 0,
    }];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.evaluate(() => window.advanceTime(34));
  state = await gameState();
  if (state.cakeWorkshop.limitedSale?.remaining !== 4
    || state.guests[0]?.cakePurchase !== "호두 모카 케이크"
    || !state.payments.length
    || state.payments[0].amount < 248) {
    throw new Error(`Customer did not prioritize the limited cake: ${JSON.stringify({
      sale: state.cakeWorkshop.limitedSale,
      guest: state.guests[0],
      payment: state.payments[0],
    })}`);
  }

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(state, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`CAKE_WORKSHOP_OK recipes=${CAKE_RECIPES.length} saleRemaining=${state.cakeWorkshop.limitedSale.remaining}`);
} finally {
  await browser.close();
}
