import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => typeof window.render_game_to_text === "function");
  await page.locator('[data-screen="theme"]').click();
  await page.locator("#menu-close-btn").click();

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.version = 23;
    saved.ownedRecipes = {
      1: { level: 2 }, 12: { level: 4 }, 33: { level: 3 }, 26: { level: 5 },
      43: { level: 6 }, 46: { level: 2 }, 49: { level: 3 }, 50: { level: 4 },
      13: { level: 9 }, 48: { level: 9 }, 53: { level: 9 },
    };
    saved.guests = [{
      id: 1, customerId: 3, customerName: "기본 병아리", recipeId: 26,
      state: "waiting", x: 120, y: 520, targetX: 120, targetY: 520,
      wait: 0, stateTime: 0, mood: "normal", bob: 0,
    }];
    saved.orders = [{ guestId: 1, recipeId: 26, orderedAt: 0 }];
    saved.cooking = [{ guestId: 1, recipeId: 43, elapsed: 1, duration: 5 }];
    saved.buffet = { ...saved.buffet, stands: [33, 13, 46, null, null, null, null, null], visitors: [] };
    saved.contest = {
      ...saved.contest,
      selectedRecipeId: 43,
      result: { tierId: 1, recipeId: 46, recipeName: "연어덮밥" },
      history: [{ tierId: 1, recipeId: 53, recipeName: "라따뚜이" }],
    };
    saved.crafting.history = [{ recipeId: 33 }, { recipeId: 13 }, { recipeId: 0, failed: true }];
    saved.crafting.hints = { 26: [1, 2], 13: [3] };
    saved.ui.lastResearch = { recipeId: 33, isNew: true };
    saved.tutorial = { activeId: null, seen: ["welcome", "recipe-unlocked", "buffet-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));

  const expectedLevels = { 1: 2, 2: 4, 13: 3, 14: 5, 15: 6, 46: 2, 47: 3, 48: 4 };
  for (const [recipeId, level] of Object.entries(expectedLevels)) {
    if (state.recipes.levels[recipeId] !== level) {
      throw new Error(`레시피 ${recipeId} 저장 레벨이 보존되지 않았습니다: ${JSON.stringify(state.recipes.levels)}`);
    }
  }
  if (state.recipes.owned !== 8 || state.recipes.catalogTotal !== 50) {
    throw new Error(`레시피 저장 마이그레이션 개수가 다릅니다: ${JSON.stringify(state.recipes)}`);
  }
  if (state.guests[0]?.recipeId !== 14 || state.ordersQueued !== 1 || state.cooking[0]?.recipe !== "새싹전") {
    throw new Error("진행 중 손님·주문·조리 레시피가 새 번호로 이어지지 않았습니다.");
  }
  const standIds = state.buffet.stands.map((stand) => stand.recipeId);
  if (JSON.stringify(standIds.slice(0, 3)) !== JSON.stringify([13, null, 46])) {
    throw new Error(`뷔페 레시피가 올바르게 이전되지 않았습니다: ${JSON.stringify(standIds)}`);
  }
  if (state.contest.selectedRecipeId !== 15 || state.contest.result?.recipeId !== 46) {
    throw new Error(`대회 레시피가 올바르게 이전되지 않았습니다: ${JSON.stringify(state.contest)}`);
  }
  if (JSON.stringify(state.progression.craftedRecipes) !== JSON.stringify([13, 0])) {
    throw new Error(`요리 연구 이력이 올바르게 이전되지 않았습니다: ${JSON.stringify(state.progression.craftedRecipes)}`);
  }
  if (errors.length) throw new Error(`브라우저 오류: ${errors.join(" | ")}`);
  console.log("RECIPE_CATALOG_V24_MIGRATION_OK owned=8 live=ok buffet=ok contest=ok history=ok");
} finally {
  await browser.close();
}
