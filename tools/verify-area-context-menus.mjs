import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "area-context-menus");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  await page.locator('[data-screen="recipe"]').click();
  let current = await state();
  let menuText = await page.locator("#menu-content").innerText();
  if (current.currentScreen !== "recipe" || current.visibleRecipeType !== "restaurant"
    || menuText.includes("수제 케이크")) {
    throw new Error(`Restaurant recipe menu mixed in Cafe recipes: ${menuText}`);
  }
  await page.locator("#menu-close-btn").click();
  await page.locator('[data-screen="theme"]').click();
  menuText = await page.locator("#menu-content").innerText();
  if (!menuText.includes("돌 테마") || menuText.includes("통나무 카페")
    || await page.locator(".theme-area-switch").count()) {
    throw new Error(`Restaurant theme menu mixed in Cafe themes: ${menuText}`);
  }
  await page.screenshot({ path: path.join(out, "01-restaurant-theme-only.png"), fullPage: true });

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.ownedRecipes = {
      1: { level: 1, stack: 0, codexClaimed: false },
      7: { level: 1, stack: 0, codexClaimed: false },
      10: { level: 1, stack: 0, codexClaimed: false },
    };
    saved.cafeArea = { unlocked: true, expansionConfirmed: true };
    saved.cafeThemes.opened = [];
    saved.resources.acorns = 50000;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-world-area="cafe"]').click();
  if ((await page.locator("#recipe-nav-label").innerText()).trim() !== "케이크"
    || (await page.locator("#theme-nav-label").innerText()).trim() !== "카페 테마") {
    throw new Error("Cafe bottom navigation labels did not switch context");
  }

  await page.locator('[data-screen="recipe"]').click();
  current = await state();
  menuText = await page.locator("#menu-content").innerText();
  if (current.currentScreen !== "cake" || current.visibleRecipeType !== "cake"
    || !menuText.includes("케이크 진열대를 먼저 설치")
    || !menuText.includes("카페 케이크 레시피")
    || menuText.includes("샐러드")) {
    throw new Error(`Cafe recipe menu did not show the baking facility guide: ${menuText}`);
  }
  await page.screenshot({ path: path.join(out, "02-cafe-recipe-install-guide.png"), fullPage: true });

  await page.locator('[data-action="go-cafe-theme"]').click();
  menuText = await page.locator("#menu-content").innerText();
  if (!menuText.includes("통나무 카페") || !menuText.includes("모던 카페")
    || menuText.includes("돌 테마") || await page.locator(".theme-area-switch").count()) {
    throw new Error(`Cafe theme menu mixed in Restaurant themes: ${menuText}`);
  }
  if ((await page.locator(".feature-card .card-action").allTextContents()).some((label) => !label.includes("10a 구매"))) {
    throw new Error("Log cafe parts must cost 10a");
  }
  await page.screenshot({ path: path.join(out, "03a-cafe-base-price.png"), fullPage: true });
  await page.locator('[data-action="theme-select"][data-id="102"]').click();
  if ((await page.locator(".feature-card .card-action").allTextContents()).some((label) => !label.includes("30a 구매"))) {
    throw new Error("Modern cafe parts must cost 30a");
  }
  await page.screenshot({ path: path.join(out, "03-cafe-theme-only.png"), fullPage: true });
  const beforeModernPurchase = await state();
  const modernBuyButton = page.locator('[data-action="buy-cafe-theme"]').first();
  const modernPartId = Number(await modernBuyButton.getAttribute("data-id"));
  await modernBuyButton.click();
  current = await state();
  if (!current.cafeArea.installedPartIds.includes(modernPartId)
    || current.resources.acorns !== beforeModernPurchase.resources.acorns - 30000) {
    throw new Error("Modern cafe part did not deduct 30a");
  }

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const shelf = window.CHICK_TABLE_SOURCE.InstallFacility.find((row) => row.areaType === 2 && row.facilityType === 18);
    saved.cafeThemes.opened = [101000 + Number(shelf.id)];
    saved.cafeThemes.activeThemeId = 101;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-world-area="cafe"]').click();
  if (!await page.locator("#cake-workshop-btn").isVisible()) {
    throw new Error("Installed cake shelf did not expose the Cake making button");
  }
  await page.screenshot({ path: path.join(out, "04-cake-button-on-cafe.png"), fullPage: true });
  await page.locator("#cake-workshop-btn").click();
  current = await state();
  menuText = await page.locator("#menu-content").innerText();
  if (current.currentScreen !== "cake" || !menuText.includes("시트 맛")
    || !menuText.includes("토핑 꾸미기") || menuText.includes("먼저 설치해 주세요")) {
    throw new Error(`Cake making screen did not open from the visible access button: ${menuText}`);
  }
  await page.screenshot({ path: path.join(out, "05-cake-maker-visible.png"), fullPage: true });

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("AREA_CONTEXT_MENUS_OK restaurant=restaurant cafe=cake");
} finally {
  await browser.close();
}
