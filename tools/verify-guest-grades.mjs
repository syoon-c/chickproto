import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, "src", "game-config.js"), "utf8"), {
  filename: "src/game-config.js",
});

const { CORE_PROGRESSION, GAME_INGREDIENTS, GUEST_GRADES, GUEST_INGREDIENT_DROP_CHANCE } = globalThis.CHICK_CONFIG;
const expectedGrades = [
  [1, "첫 방문", 1, 1, 0, 0],
  [2, "단골", 80, 2, 0, 0],
  [3, "VIP", 250, 2, 1, 0],
  [4, "최고의 단골", 700, 2, 2, 1],
];

if (JSON.stringify(GUEST_GRADES.map((grade) => [
  grade.id,
  grade.name,
  grade.minVisits,
  grade.primaryCount,
  grade.secondaryCount,
  grade.rareCount,
])) !== JSON.stringify(expectedGrades)) {
  throw new Error(`Guest grade table mismatch: ${JSON.stringify(GUEST_GRADES)}`);
}

if (CORE_PROGRESSION.length !== 45) {
  throw new Error(`Expected 45 chick routes, got ${CORE_PROGRESSION.length}`);
}
if (GUEST_INGREDIENT_DROP_CHANCE !== 0.3) {
  throw new Error(`Guest ingredient drop chance must be 30%, got ${GUEST_INGREDIENT_DROP_CHANCE}`);
}

const validIngredientIds = new Set(Object.values(GAME_INGREDIENTS).map((ingredient) => ingredient.id));
for (const route of CORE_PROGRESSION) {
  if (route.rewardIngredients.length !== 3) {
    throw new Error(`Customer ${route.customerId} does not have three reward slots`);
  }
  if (new Set(route.rewardIngredients.map((ingredient) => ingredient.id)).size !== 3) {
    throw new Error(`Customer ${route.customerId} has duplicate reward slots`);
  }
  if (route.rewardIngredients.some((ingredient) => !validIngredientIds.has(ingredient.id))) {
    throw new Error(`Customer ${route.customerId} references an unknown ingredient`);
  }
  if (route.dropChance !== GUEST_INGREDIENT_DROP_CHANCE) {
    throw new Error(`Customer ${route.customerId} drop chance mismatch: ${route.dropChance}`);
  }
}

const assignedIngredientIds = new Set(CORE_PROGRESSION.flatMap((route) => route.rewardIngredients.map((ingredient) => ingredient.id)));
if (assignedIngredientIds.size !== validIngredientIds.size) {
  const missing = [...validIngredientIds].filter((id) => !assignedIngredientIds.has(id));
  throw new Error(`Expected all ${validIngredientIds.size} shared ingredients to be assigned, got ${assignedIngredientIds.size}; missing=${missing.join(",")}`);
}

console.log(`GUEST_GRADES_OK routes=${CORE_PROGRESSION.length} sharedIngredients=${assignedIngredientIds.size} dropChance=${GUEST_INGREDIENT_DROP_CHANCE} thresholds=${GUEST_GRADES.map((grade) => grade.minVisits).join("/")}`);
