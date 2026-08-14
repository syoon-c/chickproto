import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, "src", "game-config.js"), "utf8"), {
  filename: "src/game-config.js",
});

const { CORE_PROGRESSION, GAME_INGREDIENTS, GUEST_GRADES, GUEST_INGREDIENT_DROP_CHANCE, INGREDIENT_SLOT_WEIGHTS } = globalThis.CHICK_CONFIG;
const expectedGrades = [
  [1, "첫 방문", 1],
  [2, "단골", 40],
  [3, "최고의 단골", 150],
];

if (JSON.stringify(GUEST_GRADES.map((grade) => [
  grade.id,
  grade.name,
  grade.minVisits,
])) !== JSON.stringify(expectedGrades)) {
  throw new Error(`Guest grade table mismatch: ${JSON.stringify(GUEST_GRADES)}`);
}

if (CORE_PROGRESSION.length !== 45) {
  throw new Error(`Expected 45 chick routes, got ${CORE_PROGRESSION.length}`);
}
if (GUEST_INGREDIENT_DROP_CHANCE !== 0.15) {
  throw new Error(`Guest ingredient drop chance must be 15%, got ${GUEST_INGREDIENT_DROP_CHANCE}`);
}

const validIngredientIds = new Set(Object.values(GAME_INGREDIENTS).map((ingredient) => ingredient.id));
for (const route of CORE_PROGRESSION) {
  if (route.rewardIngredients.length !== 2) {
    throw new Error(`Customer ${route.customerId} does not have two reward slots`);
  }
  if (new Set(route.rewardIngredients.map((ingredient) => ingredient.id)).size !== 2) {
    throw new Error(`Customer ${route.customerId} has duplicate reward slots`);
  }
  if (route.rewardIngredients.some((ingredient) => !validIngredientIds.has(ingredient.id))) {
    throw new Error(`Customer ${route.customerId} references an unknown ingredient`);
  }
  if (route.dropChance !== GUEST_INGREDIENT_DROP_CHANCE) {
    throw new Error(`Customer ${route.customerId} drop chance mismatch: ${route.dropChance}`);
  }
}

const baseIngredientIds = CORE_PROGRESSION.map((route) => route.rewardIngredients[0].id);
const specialIngredientIds = CORE_PROGRESSION.map((route) => route.rewardIngredients[1].id);
if (new Set(baseIngredientIds).size >= baseIngredientIds.length) {
  throw new Error("Base ingredients must overlap between chicks");
}
if (new Set(specialIngredientIds).size !== CORE_PROGRESSION.length) {
  throw new Error("Every chick must have one unique special ingredient");
}
if (specialIngredientIds.some((id) => baseIngredientIds.includes(id))) {
  throw new Error("A unique special ingredient is also used as another chick's base ingredient");
}
const assignedIngredientIds = new Set(CORE_PROGRESSION.flatMap((route) => route.rewardIngredients.map((ingredient) => ingredient.id)));
if (assignedIngredientIds.size !== 59) throw new Error(`Expected 59 introduced ingredients, got ${assignedIngredientIds.size}`);
const recipeIngredientIds = new Set(globalThis.CHICK_CONFIG.RECIPE_PROGRESSION.flatMap((route) => route.ingredientRequirements.map((ingredient) => ingredient.id)));
if ([...recipeIngredientIds].some((id) => !assignedIngredientIds.has(id))) {
  throw new Error("At least one recipe ingredient cannot be obtained from a chick");
}
if (JSON.stringify(INGREDIENT_SLOT_WEIGHTS) !== JSON.stringify({ base: 0.7, special: 0.3 })) {
  throw new Error(`Ingredient slot weights mismatch: ${JSON.stringify(INGREDIENT_SLOT_WEIGHTS)}`);
}
const cumulativeRecipeCounts = [1, 2, 3].map((themeId) => {
  const availableIds = new Set(CORE_PROGRESSION.filter((route) => route.themeId <= themeId)
    .flatMap((route) => route.rewardIngredients.map((ingredient) => ingredient.id)));
  return globalThis.CHICK_CONFIG.RECIPE_PROGRESSION.filter((route) => route.ingredientRequirements
    .every((ingredient) => availableIds.has(ingredient.id))).length;
});
if (JSON.stringify(cumulativeRecipeCounts) !== JSON.stringify([7, 13, 16])) {
  throw new Error(`Early recipe progression mismatch: ${JSON.stringify(cumulativeRecipeCounts)}`);
}
const milestoneIngredientIds = new Set();
const earlyMilestoneRecipeCounts = CORE_PROGRESSION.filter((route) => route.themeId <= 3)
  .sort((a, b) => a.themeId - b.themeId || a.slot - b.slot)
  .map((route) => {
    route.rewardIngredients.forEach((ingredient) => milestoneIngredientIds.add(ingredient.id));
    return globalThis.CHICK_CONFIG.RECIPE_PROGRESSION.filter((recipeRoute) => recipeRoute.ingredientRequirements
      .every((ingredient) => milestoneIngredientIds.has(ingredient.id))).length;
  });
if (JSON.stringify(earlyMilestoneRecipeCounts) !== JSON.stringify([1, 2, 7, 9, 10, 13, 14, 15, 16])) {
  throw new Error(`Early chick milestone recipes mismatch: ${JSON.stringify(earlyMilestoneRecipeCounts)}`);
}

console.log(`GUEST_DROPS_OK routes=${CORE_PROGRESSION.length} baseTypes=${new Set(baseIngredientIds).size} uniqueSpecials=${new Set(specialIngredientIds).size} introducedIngredients=${assignedIngredientIds.size} earlyRecipes=${cumulativeRecipeCounts.join("/")} milestones=${earlyMilestoneRecipeCounts.join("/")} dropChance=${GUEST_INGREDIENT_DROP_CHANCE} slotWeights=70/30 visitIndependent=yes`);
