import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "recipe-tab-separation");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));

const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => typeof window.render_game_to_text === "function");

  await page.locator('[data-screen="theme"]').click();
  await page.locator("#menu-close-btn").click();
  await page.evaluate(async () => {
    const key = "chick-bistro-planning-prototype-v2";
    const tables = await window.ChickData.loadTables();
    const saved = JSON.parse(localStorage.getItem(key));
    const facilityIds = [6, 8]
      .map((type) => tables.installs.find((row) => Number(row.facilityType) === type)?.id)
      .filter(Boolean);
    saved.installed = [...new Set([...saved.installed, ...facilityIds])];
    saved.crafting.ingredients = { 30001: 5, 30067: 5 };
    saved.resources.ideas = 5;
    saved.tutorial = { activeId: null, seen: ["welcome", "recipe-unlocked", "fridge-next", "drops-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));

  await page.locator('[data-screen="recipe"]').click();
  const tabLabels = await page.locator("#menu-tabs button").allTextContents();
  if (JSON.stringify(tabLabels.map((label) => label.trim())) !== JSON.stringify(["연구", "요리 목록", "냉장고"])) {
    throw new Error(`Unexpected recipe tabs: ${JSON.stringify(tabLabels)}`);
  }
  let current = await gameState();
  if (current.currentScreen !== "recipe"
    || current.recipes.tabs.join(",") !== "craft,catalog,ingredients"
    || !await page.locator(".combination-lab").isVisible()
    || await page.locator(".recipe-catalog-card").count() !== 0) {
    throw new Error(`Research tab still includes the recipe catalog: ${JSON.stringify(current.recipes)}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "01-research-only.png") });

  await page.locator('[data-tab="catalog"]').click();
  current = await gameState();
  const catalogCards = await page.locator(".recipe-catalog-card").count();
  if (current.recipes.tabPurposes.catalog !== "all-recipes-and-upgrades"
    || (await page.locator("#menu-title").innerText()).trim() !== "요리 목록"
    || await page.locator(".combination-lab").count() !== 0
    || catalogCards !== current.recipes.catalogTotal
    || await page.locator(".recipe-catalog-card.is-discovered").count() < 1
    || await page.locator(".recipe-catalog-card.is-mystery").count() < 1) {
    throw new Error(`Catalog tab is incomplete: ${JSON.stringify({ catalogCards, recipes: current.recipes })}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "02-all-recipes.png") });

  await page.locator('[data-tab="ingredients"]').click();
  if ((await page.locator("#menu-title").innerText()).trim() !== "냉장고"
    || !await page.locator(".ingredient-storage-panel").isVisible()
    || await page.locator(".recipe-catalog-card").count() !== 0
    || await page.locator(".combination-lab").count() !== 0) {
    throw new Error("The refrigerator tab contains recipe research or catalog content.");
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "03-fridge-only.png") });

  await page.locator('[data-tab="craft"]').click();
  if (!await page.locator(".combination-lab").isVisible()
    || await page.locator(".recipe-catalog-card").count() !== 0) {
    throw new Error("Returning to research did not restore the research-only view.");
  }

  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log(`RECIPE_TAB_SEPARATION_OK tabs=${tabLabels.join("/")} catalog=${catalogCards}`);
} finally {
  await browser.close();
}
