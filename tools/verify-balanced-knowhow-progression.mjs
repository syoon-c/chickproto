import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "balanced-knowhow-progression");
fs.mkdirSync(out, { recursive: true });

const expectedBranches = [
  [
    "auto_collect_1", "auto_collect_2", "auto_promotion_1", "auto_order_1",
    "auto_payment_2", "auto_ingredient_2", "auto_calm_1", "auto_promotion_2",
    "auto_order_2", "auto_payment_3", "auto_ingredient_3", "auto_calm_2",
    "auto_promotion_3", "auto_order_3", "auto_calm_3", "auto_collect_3",
    "auto_buffet_2", "auto_buffet_3",
  ],
  [
    "drop_bonus_1", "double_drop_1", "storage_bonus_1", "drop_bonus_2",
    "double_drop_2", "merchant_discount_1", "drop_bonus_3", "double_drop_3",
    "storage_bonus_2", "double_drop_4", "merchant_discount_2", "double_drop_5",
    "double_drop_6", "double_drop_7", "double_drop_8", "double_drop_9", "double_drop_10",
  ],
  [
    "cooking_speed_1", "research_speed_1", "offline_bonus_1", "cooking_speed_2",
    "contest_prize_1", "research_speed_2", "buffet_income_1", "cooking_speed_3",
    "offline_bonus_2", "research_speed_3", "contest_prize_2", "buffet_income_2",
  ],
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const saveKey = "chick-bistro-planning-prototype-v2";

async function upgrade(id) {
  await page.locator(`[data-action="knowhow-select"][data-skill-id="${id}"]`).click();
  await page.locator(`[data-action="knowhow-upgrade"][data-skill-id="${id}"]`).click();
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();
  await page.locator('[data-screen="knowhow"]').click();

  let current = await gameState();
  if (current.knowhow.progressionPattern !== "balanced-interleaved-categories"
    || JSON.stringify(current.knowhow.branchSequences) !== JSON.stringify(expectedBranches)) {
    throw new Error(`Balanced branch order is missing: ${JSON.stringify(current.knowhow.branchSequences)}`);
  }
  const nodes = Object.fromEntries(current.knowhow.nodes.map((node) => [node.id, node]));
  expectedBranches.forEach((branch) => branch.forEach((id, index) => {
    const expectedParent = index === 0 ? "restaurant_basics" : branch[index - 1];
    if (nodes[id]?.prerequisites?.[0]?.id !== expectedParent || nodes[id]?.y !== 170 + index * 115) {
      throw new Error(`Unexpected placement for ${id}: ${JSON.stringify(nodes[id])}`);
    }
  }));
  if (!nodes.auto_collect_1.prerequisitesMet || nodes.auto_collect_2.prerequisitesMet || nodes.auto_payment_2.prerequisitesMet) {
    throw new Error("Fresh automation branch does not expose only its first balanced step");
  }
  await page.screenshot({ path: path.join(out, "01-balanced-map-start.png"), fullPage: true });

  await page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key));
    saved.knowhow.points = 20;
    localStorage.setItem(key, JSON.stringify(saved));
  }, saveKey);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="knowhow"]').click();

  for (const id of expectedBranches[0].slice(0, 4)) await upgrade(id);
  current = await gameState();
  const levels = Object.fromEntries(current.knowhow.nodes.map((node) => [node.id, node]));
  if (!expectedBranches[0].slice(0, 4).every((id) => levels[id].level === 1)
    || !levels.auto_payment_2.prerequisitesMet
    || levels.auto_ingredient_2.prerequisitesMet) {
    throw new Error("Automation branch did not unlock one mixed category at a time");
  }
  await page.screenshot({ path: path.join(out, "02-four-mixed-skills-learned.png"), fullPage: true });

  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log("BALANCED_KNOWHOW_OK branches=3 automation=payment>ingredient>promotion>order growth=cooking>research>offline");
} finally {
  await browser.close();
}
