import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const tableNames = [
  "GeneralSetting",
  "Recipe",
  "RecipeSetting",
  "RecipeResearch",
  "Ingredient",
  "AreaExpansion",
  "Customer",
  "CommonCustomer",
  "CustomerSetting",
  "InstallFacility",
  "Item",
  "RepeatMission",
  "MainMission",
  "Reward",
  "RewardGroup",
  "Staff",
  "StaffLevelUp",
  "Performance",
  "SpecialCustomer",
  "ThemeFacility",
  "Formula",
  "AbilityConfig",
];

const tables = Object.fromEntries(tableNames.map((name) => {
  const filename = path.join(dataDir, `${name}.json`);
  return [name, JSON.parse(fs.readFileSync(filename, "utf8"))];
}));

const output = `// Generated from data/*.json by tools/build-runtime-tables.mjs.\nwindow.CHICK_TABLE_SOURCE=${JSON.stringify(tables)};\n`;
fs.writeFileSync(path.join(dataDir, "runtime-tables.js"), output, "utf8");
console.log(`Generated data/runtime-tables.js (${Buffer.byteLength(output)} bytes)`);
