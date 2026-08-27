import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "game-config.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context, { filename: "src/game-config.js" });

const { CORE_PROGRESSION, GAME_INGREDIENTS, RECIPE_PROGRESSION, THEME_NAMES } = context.window.CHICK_CONFIG;
const obtainable = new Set([Number(GAME_INGREDIENTS.water.id)]);
const assignedRecipeIds = new Set();
const counts = [];

for (const themeId of Object.keys(THEME_NAMES).map(Number)) {
  CORE_PROGRESSION.filter((route) => route.themeId === themeId).forEach((route) => {
    route.rewardIngredients.forEach((ingredient) => obtainable.add(Number(ingredient.id)));
  });
  const newlyAvailable = RECIPE_PROGRESSION.filter((recipe) => !assignedRecipeIds.has(recipe.recipeId)
    && recipe.ingredientRequirements.every((ingredient) => obtainable.has(Number(ingredient.id))));
  newlyAvailable.forEach((recipe) => assignedRecipeIds.add(recipe.recipeId));
  counts.push(newlyAvailable.length);
}

assert.deepEqual(
  counts.slice(0, 9),
  [5, 7, 5, 5, 6, 6, 6, 5, 6],
  "초반 9개 테마의 신규 레시피 분포가 계획과 다릅니다.",
);
assert.equal(assignedRecipeIds.size, 51, "첫 9개 테마 안에 51개 레시피가 모두 발견 가능해야 합니다.");
assert.ok(counts.slice(9).every((count) => count === 0), "후반 테스트 제외 테마에서 새 레시피가 열립니다.");

console.log(`THEME_RECIPE_PACING_OK distribution=${counts.slice(0, 9).join("/")} total=${assignedRecipeIds.size}`);
