import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "order-bubble-priority");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function clickCanvas(x, y) {
  const canvas = page.locator("#game-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas is not visible");
  await page.mouse.click(box.x + x / 480 * box.width, box.y + y / 900 * box.height);
}

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
    saved.installed = tables.installs.map((row) => row.id);
    saved.tutorial = { activeId: null, seen: ["welcome", "recipe-unlocked", "fridge-next", "drops-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator("#promotion-btn").click();
  await page.evaluate(() => window.advanceTime(5000));
  let current = await gameState();
  const guest = current.guests.find((item) => item.state === "awaiting_order");
  if (!guest) throw new Error("No guest reached the ordering state for the overlap test.");

  await page.evaluate((guestId) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const guest = saved.guests.find((item) => item.id === guestId);
    guest.x = 425;
    guest.y = 495;
    guest.state = "awaiting_order";
    guest.stateTime = 0;
    localStorage.setItem(key, JSON.stringify(saved));
  }, guest.id);
  await page.reload({ waitUntil: "load" });
  current = await gameState();
  const beforeOrders = current.metrics.orders;
  await page.locator(".game-frame").screenshot({ path: path.join(out, "01-overlapping-order-bubble.png") });

  // (425,455) is both the tipbox center and the guest's order-bubble hit area.
  await clickCanvas(425, 455);
  current = await gameState();
  const orderedGuest = current.guests.find((item) => item.id === guest.id);
  if (current.tipboxSystem.panelVisible || current.metrics.orders !== beforeOrders + 1
    || orderedGuest?.state === "awaiting_order") {
    throw new Error(`Tipbox won the overlapping tap instead of the order bubble: ${JSON.stringify({ tipbox: current.tipboxSystem, orders: current.metrics.orders, guest: orderedGuest })}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "02-order-taken-tipbox-closed.png") });
  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log(`ORDER_BUBBLE_PRIORITY_OK overlap=tipbox-center orders=${beforeOrders}->${current.metrics.orders} tipboxPanel=closed`);
} finally {
  await browser.close();
}
