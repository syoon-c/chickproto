import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "debug-panel");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });

  const resetBox = await page.locator("#reset-btn").boundingBox();
  const debugBox = await page.locator("#debug-toggle-btn").boundingBox();
  if (!resetBox || !debugBox || debugBox.y <= resetBox.y + resetBox.height) {
    throw new Error("DEBUG button is not positioned below reset");
  }

  await page.locator("#debug-toggle-btn").click();
  let current = await gameState();
  if (!current.debug.panelVisible || !await page.locator("#debug-panel").isVisible()) {
    throw new Error("Debug panel did not open");
  }
  await page.screenshot({ path: path.join(out, "01-debug-panel.png"), fullPage: true });

  const additions = [
    ["acorns", 12345],
    ["ideas", 321],
    ["gems", 17],
    ["stickers", 9],
  ];
  const before = { ...current.resources };
  for (const [resource, amount] of additions) {
    await page.locator("#debug-resource-type").selectOption(resource);
    await page.locator("#debug-resource-amount").fill(String(amount));
    await page.locator("#debug-add-resource-btn").click();
  }

  const debugIngredientId = await page.evaluate(() => window.CHICK_CONFIG.GAME_INGREDIENTS.leaf.id);
  if (await page.locator("#debug-ingredient-type").inputValue() !== String(debugIngredientId)
    || !(await page.locator("#debug-ingredient-type").innerText()).includes("나뭇잎")) {
    throw new Error("Leaf is not pinned to the top of the debug ingredient picker");
  }
  const ingredientBefore = current.progression.ingredients[String(debugIngredientId)] || 0;
  await page.locator("#debug-ingredient-type").selectOption(String(debugIngredientId));
  await page.locator("#debug-ingredient-amount").fill("27");
  await page.locator("#debug-add-ingredient-btn").click();
  current = await gameState();
  if (current.progression.ingredients[String(debugIngredientId)] !== ingredientBefore + 27
    || current.ingredientStorage.capacity < current.ingredientStorage.totalItems) {
    throw new Error(`Debug ingredient addition failed: ${JSON.stringify({ ingredientId: debugIngredientId, before: ingredientBefore, after: current.progression.ingredients[String(debugIngredientId)], storage: current.ingredientStorage })}`);
  }
  current = await gameState();
  for (const [resource, amount] of additions) {
    if (current.resources[resource] !== before[resource] + amount) {
      throw new Error(`Debug resource addition failed for ${resource}: ${JSON.stringify(current.resources)}`);
    }
  }

  await page.locator("#debug-install-all-btn").click();
  current = await gameState();
  if (current.debug.installedFacilities !== current.debug.totalInstallFacilities
    || current.installCandidates.length !== 0
    || !current.recipes.systemUnlocked
    || !current.progression.ingredientDropRule.unlocked) {
    throw new Error(`Install-all did not finish initial setup: ${JSON.stringify(current.debug)}`);
  }
  await page.screenshot({ path: path.join(out, "02-resources-and-install-all.png"), fullPage: true });

  await page.reload({ waitUntil: "load" });
  const reloaded = await gameState();
  if (reloaded.debug.installedFacilities !== reloaded.debug.totalInstallFacilities
    || additions.some(([resource, amount]) => reloaded.resources[resource] !== before[resource] + amount)
    || reloaded.progression.ingredients[String(debugIngredientId)] !== ingredientBefore + 27) {
    throw new Error(`Debug changes did not persist after reload: ${JSON.stringify({ before, after: current.resources, reloaded: reloaded.resources, debug: reloaded.debug, errors })}`);
  }

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(reloaded, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`DEBUG_PANEL_OK install=${reloaded.debug.installedFacilities}/${reloaded.debug.totalInstallFacilities} acorns=+12345 ideas=+321 gems=+17 stickers=+9 ingredient=leaf+27 persisted=yes`);
} finally {
  await browser.close();
}
