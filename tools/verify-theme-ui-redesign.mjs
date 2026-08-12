import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "theme-ui-redesign");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();
  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.installed = window.CHICK_TABLE_SOURCE.InstallFacility
      .filter((row) => Number(row.areaType) === 1)
      .map((row) => Number(row.id));
    saved.resources.acorns = 1_000_000_000;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="theme"]').click();
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));

  const tabs = page.locator(".theme-tabs button");
  if (await tabs.count() < 10) throw new Error("Theme tabs were not rendered as a horizontal catalog.");
  if (await page.locator(".theme-tabs button img").count() !== await tabs.count()) throw new Error("A theme tab is missing its real asset.");
  const stoneCards = page.locator(".theme-part-card");
  if (await stoneCards.count() < 10) throw new Error("Stone theme parts were not rendered in the grid.");
  if ((await stoneCards.allInnerTexts()).some((text) => text.includes("수익"))) throw new Error("Income leaked into a default part card.");
  if ((await stoneCards.allInnerTexts()).some((text) => !/^(적용 중|보유 중|수집 보상|[\d,.]+[a-z]?)$/.test(text.trim()))) {
    throw new Error(`Unexpected default card copy: ${JSON.stringify(await stoneCards.allInnerTexts())}`);
  }
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "01-stone-theme-grid.png") });

  await page.locator('[data-action="theme-select"][data-id="2"]').click();
  const lockedCard = page.locator('.theme-part-card.is-priced:not(.is-unavailable)').first();
  const lockedId = await lockedCard.getAttribute("data-id");
  if (!lockedId) throw new Error("No purchasable wood theme part was found.");
  if ((await lockedCard.innerText()).includes("수익")) throw new Error("Income is visible before opening the detail popup.");
  await lockedCard.click();
  const modal = page.locator(".theme-part-modal");
  await modal.waitFor({ state: "visible" });
  const detailText = await modal.innerText();
  if (!detailText.includes("보유 수익 효과") || !detailText.includes("가격") || !detailText.includes("구매 후")) {
    throw new Error(`Theme detail popup is missing income or price information: ${detailText}`);
  }
  await page.waitForTimeout(250);
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "02-part-detail.png") });

  await modal.locator(`[data-action="buy-theme"][data-id="${lockedId}"]`).click();
  await page.locator(".theme-part-modal").waitFor({ state: "detached" });
  if (!await page.locator("#menu-screen").isVisible() || JSON.parse(await page.evaluate(() => window.render_game_to_text())).currentScreen !== "theme") {
    throw new Error("Buying a theme part closed more than the purchase popup.");
  }
  const purchasedCard = page.locator(`.theme-part-card[data-id="${lockedId}"]`);
  if ((await purchasedCard.innerText()).trim() !== "적용 중") throw new Error("Purchased theme card did not show only the active status.");
  if (await page.locator(".theme-part-modal").count()) throw new Error("Theme part popup did not close.");
  await page.locator("#menu-screen").screenshot({ path: path.join(out, "03-purchased-active-state.png") });

  const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  if (state.themeManagement?.defaultCardContent !== "price-or-owned-or-active-only"
    || state.themeManagement?.incomeVisibility !== "hidden"
    || !state.themeManagement?.parts.some((part) => part.id === Number(lockedId) && part.status === "active")) {
    throw new Error(`Rendered theme state is inconsistent: ${JSON.stringify(state.themeManagement)}`);
  }

  await purchasedCard.click();
  await page.locator(".theme-part-dialog-close").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  if (await page.locator(".theme-part-modal").count()) throw new Error("Escape did not close the theme part popup.");
  await page.waitForFunction((partId) => document.activeElement?.matches(`[data-action="theme-part-detail"][data-id="${partId}"]`), lockedId);
  await purchasedCard.click();
  await page.locator('[data-screen="recipe"]').click();
  await page.locator('[data-screen="theme"]').click();
  if (await page.locator(".theme-part-modal").count()) throw new Error("Theme part popup reopened after switching menus.");
  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log(`THEME_UI_REDESIGN_OK tabs=${await tabs.count()} stoneParts=${await stoneCards.count()} purchased=${lockedId}`);
} finally {
  await browser.close();
}
