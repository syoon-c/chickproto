import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "bowl-failure-cost");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const readState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => typeof window.render_game_to_text === "function");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  const ids = await page.evaluate(() => {
    const ingredient = (name) => Object.values(window.CHICK_CONFIG.GAME_INGREDIENTS)
      .find((item) => item.name === name).id;
    const countertop = window.CHICK_TABLE_SOURCE.InstallFacility
      .find((row) => Number(row.areaType) === 1 && Number(row.facilityType) === 8).id;
    return { vinegar: ingredient("식초"), countertop };
  });
  await page.evaluate(({ vinegar, countertop }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.installed = [...new Set([...saved.installed, countertop])];
    saved.crafting.bowlCapacity = 5;
    saved.crafting.ingredients = { [vinegar]: 5 };
    saved.crafting.selected = [];
    saved.resources.ideas = 20;
    [1, 2, 3, 4, 5].forEach((recipeId) => {
      saved.ownedRecipes[recipeId] ||= { level: 1, stack: 0, codexClaimed: true };
    });
    saved.tutorial = { activeId: null, seen: ["welcome", "recipe-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
  }, ids);
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => typeof window.render_game_to_text === "function");
  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-action="auto-craft"]').click();

  let current = await readState();
  if (current.recipes.combinationCapacity !== 5
    || current.recipes.research?.ingredientIds.length !== 2
    || current.recipes.autoWeirdDishIngredientCost !== 2
    || current.recipes.autoResearchWhenNoRecipe !== "random-2-ingredients-then-weird-dish"
    || current.progression.ingredients[ids.vinegar] !== 3) {
    throw new Error(`자동 괴식 재료 소비량이 2개가 아닙니다: ${JSON.stringify(current.recipes)}`);
  }
  await page.screenshot({ path: path.join(out, "01-auto-research-two-ingredients.png"), fullPage: true });
  await page.evaluate(() => window.advanceTime(2500));
  current = await readState();
  if (current.recipes.reveal?.result !== "failure") throw new Error("자동 연구가 괴식으로 완료되지 않았습니다.");
  await page.locator('[data-action="dismiss-recipe-reveal"]').click();
  if (!await page.locator('[data-action="open-ingredient-picker"]').isVisible()) {
    await page.locator('[data-screen="recipe"]').click();
  }

  await page.locator('[data-action="open-ingredient-picker"]').click();
  await page.locator(`[data-action="select-ingredient"][data-id="${ids.vinegar}"]`).click();
  await page.locator(`[data-action="select-ingredient"][data-id="${ids.vinegar}"]`).click();
  const pickerText = (await page.locator(".recipe-ingredient-dialog").innerText()).replace(/\s+/g, " ");
  if (!pickerText.includes("최대 5개")
    || !pickerText.includes("바로 섞기")
    || pickerText.includes("전부 채울 필요 없어요")
    || pickerText.includes("개 사용")) {
    throw new Error(`보울 팝업의 문구가 충분히 간결하지 않습니다: ${pickerText}`);
  }
  await page.screenshot({ path: path.join(out, "02-manual-uses-two-of-five.png"), fullPage: true });

  if (errors.length) throw new Error(`브라우저 오류: ${errors.join(" | ")}`);
  console.log("BOWL_FAILURE_COST_OK capacity=5 auto-weird-cost=2 manual-usage=2/5");
} finally {
  await browser.close();
}
