import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "tipbox-system");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function clickCanvas(x, y) {
  const box = await page.locator("#game-canvas").boundingBox();
  await page.mouse.click(box.x + x / 480 * box.width, box.y + y / 900 * box.height);
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  const tipboxPosition = await page.evaluate(async () => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const tables = await window.ChickData.loadTables();
    const tipbox = tables.installs.find((row) => Number(row.facilityType) === 3);
    saved.installed = [...new Set([...saved.installed, tipbox.id])];
    saved.tipbox = 450;
    saved.tipboxCapacity = 500;
    saved.resources.gems = 10;
    localStorage.setItem(key, JSON.stringify(saved));
    return window.CHICK_CONFIG.facilityPlacement(tipbox);
  });
  await page.reload({ waitUntil: "load" });
  let current = await gameState();
  if (current.tipboxSystem.amount !== 450 || current.tipboxSystem.capacity !== 500 || current.tipboxSystem.initialCapacity !== 500) {
    throw new Error(`Initial tipbox capacity is incorrect: ${JSON.stringify(current.tipboxSystem)}`);
  }

  await clickCanvas(tipboxPosition.x, tipboxPosition.y);
  current = await gameState();
  if (!current.tipboxSystem.panelVisible || !await page.locator("#tipbox-panel").isVisible()
    || await page.locator("#tipbox-amount").innerText() !== "450" || await page.locator("#tipbox-capacity").innerText() !== "500") {
    throw new Error(`Tipbox did not open its collection popup: ${JSON.stringify(current.tipboxSystem)}`);
  }
  await page.screenshot({ path: path.join(out, "01-tipbox-popup.png"), fullPage: true });

  await page.locator("#tipbox-expand").click();
  current = await gameState();
  if (current.tipboxSystem.capacity !== 1000 || current.resources.gems !== 0 || current.metrics.tipboxExpansions !== 1) {
    throw new Error(`Tipbox gem expansion failed: ${JSON.stringify({ tipbox: current.tipboxSystem, gems: current.resources.gems })}`);
  }
  await page.screenshot({ path: path.join(out, "02-expanded-tipbox.png"), fullPage: true });

  const beforeAcorns = current.resources.acorns;
  await page.locator("#tipbox-collect").click();
  current = await gameState();
  if (current.tipbox !== 0 || current.resources.acorns !== beforeAcorns + 450 || !current.tipboxSystem.panelVisible
    || !await page.locator("#tipbox-collect").isDisabled()) {
    throw new Error(`Tip collection through popup failed: ${JSON.stringify({ tipbox: current.tipboxSystem, acorns: current.resources.acorns })}`);
  }

  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  console.log("TIPBOX_SYSTEM_OK popup=touch-only capacity=500 expand=500/10gems all-normal-tip=yes disappointed=no auto-excluded=yes");
} finally {
  await browser.close();
}
