import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, "src", "game-config.js"), "utf8"), { filename: "src/game-config.js" });
const { CORE_PROGRESSION, GAME_INGREDIENTS, INGREDIENT_SLOT_WEIGHTS } = globalThis.CHICK_CONFIG;
const greenChicks = CORE_PROGRESSION.filter((route) => route.themeId === 3);
const expected = [
  ["아보카도 병아리", ["나뭇잎", "아보카도"]],
  ["양배추 병아리", ["나뭇잎", "양배추"]],
  ["선인장 병아리", ["면", "고추"]],
];
if (JSON.stringify(greenChicks.map((route) => [route.customerName, route.rewardIngredients.map((item) => item.name)]))
  !== JSON.stringify(expected)) {
  throw new Error(`Green chick leaf assignments are incorrect: ${JSON.stringify(greenChicks)}`);
}
if (greenChicks.slice(0, 2).some((route) => route.rewardIngredients[0].id !== GAME_INGREDIENTS.leaf.id)
  || greenChicks[2].rewardIngredients[0].id !== GAME_INGREDIENTS.noodles.id
  || JSON.stringify(INGREDIENT_SLOT_WEIGHTS) !== JSON.stringify({ base: 0.7, special: 0.3 })) {
  throw new Error("Green chick early-recipe ingredient assignments are incorrect");
}

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "green-chick-leaf-drops");
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
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();
  await page.evaluate((routes) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const themeRows = window.CHICK_TABLE_SOURCE.ThemeFacility
      .filter((row) => Number(row.areaType) === 1 && Number(row.facilityTheme) === 3);
    saved.themes.opened = [...new Set([...saved.themes.opened, ...themeRows.map((row) => row.id)])];
    saved.collections.customers = Object.fromEntries(routes.map((route, index) => [route.customerId, {
      count: index === 0 ? 1 : 40,
      firstSeen: Date.now(),
      isNew: false,
    }]));
    saved.ui.collectionCustomerId = routes[1].customerId;
    localStorage.setItem(key, JSON.stringify(saved));
  }, greenChicks);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="collection"]').click();

  let profileText = await page.locator(".customer-profile").innerText();
  if (!profileText.includes("양배추 병아리") || !profileText.includes("나뭇잎")
    || await page.locator(".customer-drop-row.is-active").count() !== 2
    || !profileText.includes("처음부터")) {
    throw new Error(`Cabbage chick leaf drop is not visible at 40 visits: ${profileText}`);
  }
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "01-cabbage-chick-leaf-drop.png") });

  await page.locator(`[data-action="select-customer"][data-id="${greenChicks[0].customerId}"]`).click();
  profileText = await page.locator(".customer-profile").innerText();
  if (!profileText.includes("아보카도 병아리") || !profileText.includes("나뭇잎")
    || !profileText.includes("아보카도") || !profileText.includes("70%") || !profileText.includes("30%")
    || await page.locator(".customer-drop-row.is-active").count() !== 2) {
    throw new Error(`Avocado chick leaf drop is not active from the first visit: ${profileText}`);
  }
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "02-avocado-chick-primary-leaf.png") });

  const current = await gameState();
  const routes = current.progression.unlockedChickRoutes.filter((route) => route.themeId === 3);
  if (routes.length !== 3
    || routes[0].rewardItems[0].name !== "나뭇잎"
    || routes[1].rewardItems[0].name !== "나뭇잎"
    || routes[2].rewardItems[0].name !== "면") {
    throw new Error(`Text state does not expose the green chick leaf drops: ${JSON.stringify(routes)}`);
  }
  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("GREEN_CHICK_EARLY_RECIPE_DROPS_OK avocado/cabbage=leaf-base cactus=noodles+chili overallDrop=15%");
} finally {
  await browser.close();
}
