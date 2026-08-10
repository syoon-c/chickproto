import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "drag-scroll");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));

async function drag(from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(100);
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="theme"]').click();
  await page.waitForTimeout(250);

  const themeTabs = page.locator(".theme-tabs");
  const tabsBox = await themeTabs.boundingBox();
  const beforeHorizontal = await themeTabs.evaluate((element) => element.scrollLeft);
  await drag(
    { x: tabsBox.x + tabsBox.width - 25, y: tabsBox.y + tabsBox.height / 2 },
    { x: tabsBox.x + 35, y: tabsBox.y + tabsBox.height / 2 },
  );
  const afterHorizontal = await themeTabs.evaluate((element) => element.scrollLeft);
  if (afterHorizontal <= beforeHorizontal + 10) {
    throw new Error(`Horizontal theme drag did not scroll: ${beforeHorizontal} -> ${afterHorizontal}`);
  }
  const selectedAfterDrag = await themeTabs.locator("button.is-active").getAttribute("data-id");
  if (selectedAfterDrag !== "1") throw new Error(`Dragging a theme button triggered a click: ${selectedAfterDrag}`);

  await page.waitForTimeout(400);
  await page.locator('[data-action="theme-select"][data-id="2"]').click();
  if (await page.locator(".theme-tabs button.is-active").getAttribute("data-id") !== "2") {
    throw new Error("Normal theme button clicks stopped working after a drag");
  }

  const menuContent = page.locator("#menu-content");
  const contentBox = await menuContent.boundingBox();
  const verticalMetrics = await menuContent.evaluate((element) => ({
    before: element.scrollTop,
    max: Math.max(0, element.scrollHeight - element.clientHeight),
  }));
  const beforeVertical = verticalMetrics.before;
  await drag(
    { x: contentBox.x + contentBox.width / 2, y: contentBox.y + contentBox.height - 55 },
    { x: contentBox.x + contentBox.width / 2, y: contentBox.y + 150 },
  );
  const afterVertical = await menuContent.evaluate((element) => element.scrollTop);
  if (verticalMetrics.max > 5 && afterVertical < Math.min(verticalMetrics.max, beforeVertical + 80)) {
    throw new Error(`Vertical menu drag did not scroll: ${beforeVertical} -> ${afterVertical}`);
  }

  await page.screenshot({ path: path.join(out, "dragged-theme-menu.png"), fullPage: true });
  await page.locator("#menu-close-btn").click();
  if (!await page.locator("#menu-screen").evaluate((element) => element.hidden)) {
    throw new Error("Menu close click stopped working after drag scrolling");
  }
  fs.writeFileSync(path.join(out, "result.json"), JSON.stringify({ beforeHorizontal, afterHorizontal, beforeVertical, afterVertical }, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`DRAG_SCROLL_OK horizontal=${beforeHorizontal}->${afterHorizontal} vertical=${beforeVertical}->${afterVertical}`);
} finally {
  await browser.close();
}
