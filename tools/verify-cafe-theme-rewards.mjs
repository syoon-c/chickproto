import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

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
  CAFE_CAKE_MILESTONES,
  CAFE_THEME_CAKE_REWARDS,
  CAFE_THEME_MIN_PRICE,
  CAFE_THEME_PRICE_RATE,
  CAFE_THEME_NAMES,
} = globalThis.CHICK_CONFIG;

if (JSON.stringify(CAFE_CAKE_MILESTONES) !== JSON.stringify([0.3, 0.7, 1])) {
  throw new Error(`Cake milestone thresholds are incorrect: ${JSON.stringify(CAFE_CAKE_MILESTONES)}`);
}
if (BASE_CAKE_INGREDIENTS.length !== 3) {
  throw new Error(`Expected three base cake ingredients, got ${BASE_CAKE_INGREDIENTS.length}`);
}
if (CAFE_THEME_MIN_PRICE !== 25 || CAFE_THEME_PRICE_RATE !== 0.25) {
  throw new Error(`Cafe theme price rule mismatch: min=${CAFE_THEME_MIN_PRICE} rate=${CAFE_THEME_PRICE_RATE}`);
}

const themeIds = Object.keys(CAFE_THEME_NAMES).map(Number);
const cafeInstallRows = globalThis.CHICK_TABLE_SOURCE.InstallFacility.filter((row) => row.areaType === 2);
if (cafeInstallRows.length !== 13) {
  throw new Error(`Expected 13 Unity cafe install rows, got ${cafeInstallRows.length}`);
}
const rewardIds = new Set();
for (const themeId of themeIds) {
  const rewards = CAFE_THEME_CAKE_REWARDS[themeId];
  if (!rewards || rewards.length !== 3) {
    throw new Error(`Theme ${themeId} must have exactly three cake rewards`);
  }
  if (rewards.map((reward) => reward.type).join(",") !== "sheet,cream,topping") {
    throw new Error(`Theme ${themeId} reward order must be sheet/cream/topping`);
  }
  for (const reward of rewards) {
    if (rewardIds.has(reward.id)) throw new Error(`Duplicate cake reward id: ${reward.id}`);
    rewardIds.add(reward.id);
  }
  const rows = globalThis.CHICK_TABLE_SOURCE.ThemeFacility
    .filter((row) => row.areaType === 2 && row.facilityTheme === themeId);
  if (!rows.length) throw new Error(`Cafe theme ${themeId} is missing from Unity ThemeFacility data`);
  const requiredCounts = CAFE_CAKE_MILESTONES.map((threshold) => Math.ceil(cafeInstallRows.length * threshold));
  if (!(requiredCounts[0] < requiredCounts[1] && requiredCounts[1] < requiredCounts[2])) {
    throw new Error(`Theme ${themeId} milestone counts overlap: ${requiredCounts.join("/")}`);
  }
  if (requiredCounts.join("/") !== "4/10/13") {
    throw new Error(`Cafe milestone counts must be 4/10/13, got ${requiredCounts.join("/")}`);
  }
}

if (rewardIds.size !== themeIds.length * 3) {
  throw new Error(`Expected ${themeIds.length * 3} unique cake rewards, got ${rewardIds.size}`);
}

console.log(`CAFE_THEME_REWARDS_OK themes=${themeIds.length} installs=${cafeInstallRows.length} rewards=${rewardIds.size} base=${BASE_CAKE_INGREDIENTS.length} thresholds=${CAFE_CAKE_MILESTONES.join("/")}`);
