import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dir, "..", "..");
const context = { window: {} };
vm.runInNewContext(await fs.readFile(path.join(projectRoot, "src", "game-config.js"), "utf8"), context);
const { CORE_PROGRESSION, RECIPE_PROGRESSION, THEME_NAMES } = context.window.CHICK_CONFIG;
const demand = new Map();
for (const recipe of RECIPE_PROGRESSION) {
  const distinct = new Set();
  for (const ingredient of recipe.ingredientRequirements) {
    if (ingredient.name === "물") continue;
    const entry = demand.get(ingredient.name) || { slots: 0, recipes: new Set() };
    entry.slots += 1;
    entry.recipes.add(recipe.recipeName);
    demand.set(ingredient.name, entry);
    distinct.add(ingredient.name);
  }
}
const supply = new Map();
for (const chick of CORE_PROGRESSION) {
  chick.rewardIngredients.forEach((ingredient, index) => {
    const conditionalChance = chick.rewardIngredients.length === 1 ? 1 : index === 0 ? 0.7 : 0.3;
    const entry = supply.get(ingredient.name) || { score: 0, sources: [] };
    entry.score += conditionalChance;
    entry.sources.push({ chick: chick.customerName, theme: THEME_NAMES[chick.themeId], chance: conditionalChance });
    supply.set(ingredient.name, entry);
  });
}
const allNames = [...new Set([...demand.keys(), ...supply.keys()])];
const rows = allNames.map((name) => ({
  name,
  slots: demand.get(name)?.slots || 0,
  recipeCount: demand.get(name)?.recipes.size || 0,
  supplyScore: supply.get(name)?.score || 0,
  burden: supply.get(name)?.score ? (demand.get(name)?.slots || 0) / supply.get(name).score : null,
  sourceCount: supply.get(name)?.sources.length || 0,
}));
console.log(JSON.stringify({
  themes: Object.keys(THEME_NAMES).length,
  chicks: CORE_PROGRESSION.length,
  recipes: RECIPE_PROGRESSION.length,
  demandIngredients: demand.size,
  supplyIngredients: supply.size,
  unusedDrops: rows.filter((row) => row.supplyScore && !row.slots).sort((a,b) => b.supplyScore-a.supplyScore),
  missingSources: rows.filter((row) => row.slots && !row.supplyScore),
  burden: rows.filter((row) => row.slots && row.supplyScore).sort((a,b) => b.burden-a.burden),
}, null, 2));
