import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "theme-half-sheet");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="theme"]').click();
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));

  const worldBox = await page.locator(".world-area").boundingBox();
  const menuBox = await page.locator("#menu-screen").boundingBox();
  if (!worldBox || !menuBox) throw new Error("Theme sheet or restaurant world is not visible.");
  const startRatio = (menuBox.y - worldBox.y) / worldBox.height;
  const heightRatio = menuBox.height / worldBox.height;
  if (startRatio < .50 || startRatio > .54 || heightRatio < .45 || heightRatio > .51) {
    throw new Error(`Theme sheet is not approximately half-height: ${JSON.stringify({ startRatio, heightRatio })}`);
  }
  const upperLayer = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return { id: element?.id || null, insideMenu: Boolean(element?.closest?.("#menu-screen")) };
  }, { x: worldBox.x + worldBox.width / 2, y: worldBox.y + worldBox.height * .32 });
  if (upperLayer.insideMenu) throw new Error(`The theme sheet covers the upper restaurant: ${JSON.stringify(upperLayer)}`);
  if (await page.locator(".theme-part-card").count() !== 11) throw new Error("The compact grid must contain 11 parts without tree/background data.");
  const cardTypography = await page.locator('.theme-part-card[data-id="1001"]').evaluate((card) => ({
    height: card.getBoundingClientRect().height,
    statusFontSize: Number.parseFloat(getComputedStyle(card.querySelector("span")).fontSize),
    iconWidth: card.querySelector(".theme-part-art").getBoundingClientRect().width,
  }));
  if (cardTypography.height < 68 || cardTypography.statusFontSize < 9.5 || cardTypography.iconWidth < 40) {
    throw new Error(`Theme card is still too small to read: ${JSON.stringify(cardTypography)}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "01-restaurant-visible-above-theme-sheet.png") });

  await page.locator('.theme-part-card[data-id="1001"]').click();
  const detail = page.locator(".theme-part-dialog");
  await detail.waitFor({ state: "visible" });
  await page.waitForTimeout(250);
  const detailBox = await detail.boundingBox();
  const detailAction = page.locator('.theme-part-primary[data-id="1001"]');
  const detailActionBox = await detailAction.boundingBox();
  if (!detailBox || !detailActionBox || detailBox.y < menuBox.y
    || detailActionBox.y + detailActionBox.height > menuBox.y + menuBox.height + 1) {
    throw new Error(`Part detail action escaped the half sheet: ${JSON.stringify({ detailBox, detailActionBox, menuBox })}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "02-compact-part-detail.png") });
  if (!(await detailAction.isDisabled()) || (await detailAction.innerText()).trim() !== "현재 적용 중") {
    throw new Error("The owned Stone appearance must remain active without installing its table group.");
  }
  await page.locator('[data-action="theme-part-close"]').last().click();

  const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const tablePart = state.installationSystem.stoneParts.find((part) => part.id === 1001);
  if (!tablePart?.owned || tablePart.installedIds.length !== 0 || state.currentScreen !== "theme") {
    throw new Error(`Theme UI changed installation state unexpectedly: ${JSON.stringify({ tablePart, currentScreen: state.currentScreen })}`);
  }
  if ((await page.locator('.theme-part-card[data-id="1001"]').innerText()).trim() !== "적용 중") {
    throw new Error("Purchased table part is not shown as active in the compact sheet.");
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "03-theme-ui-preserved.png") });
  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log(`THEME_HALF_SHEET_OK start=${startRatio.toFixed(2)} height=${heightRatio.toFixed(2)} parts=11 installationSeparate=yes`);
} finally {
  await browser.close();
}
