import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "important-toast-policy");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function clickCanvas(x, y) {
  const box = await page.locator("#game-canvas").boundingBox();
  if (!box) throw new Error("Canvas is unavailable");
  await page.mouse.click(box.x + x / 480 * box.width, box.y + y / 900 * box.height);
}

async function expectSilent(label) {
  const current = await gameState();
  if (current.toast.visible || !await page.locator("#toast").isHidden()) {
    throw new Error(`${label} displayed a routine toast: ${JSON.stringify(current.toast)}`);
  }
  return current;
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();
  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const coreTypes = new Set([1, 2, 10]);
    saved.installed = window.CHICK_TABLE_SOURCE.InstallFacility
      .filter((row) => Number(row.areaType) === 1 && coreTypes.has(Number(row.facilityType)))
      .map((row) => row.id);
    saved.tutorial = { activeId: null, seen: ["welcome"] };
    saved.collections.customers = { 3: { count: 1, firstSeen: Date.now(), isNew: false } };
    saved.guests = [];
    saved.orders = [];
    saved.cooking = [];
    saved.payments = [];
    saved.ingredientDrops = [];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });

  const expectedSilentEvents = ["guest-arrival", "order-taken", "food-delivered", "ingredient-collected", "payment-collected", "tip-collected"];
  if (JSON.stringify((await gameState()).toast.routineEventsSilent) !== JSON.stringify(expectedSilentEvents)) {
    throw new Error("The rendered toast policy is incomplete");
  }

  await page.locator("#promotion-btn").click();
  await expectSilent("Guest arrival");
  await page.evaluate(() => window.advanceTime(4500));
  let current = await gameState();
  const guest = current.guests.find((entry) => entry.state === "awaiting_order");
  if (!guest) throw new Error("Routine guest did not reach the table");
  await clickCanvas(guest.x, guest.y - 40);
  await expectSilent("Order taken");
  await page.evaluate(() => window.advanceTime(5000));
  current = await expectSilent("Food delivered");
  if (!current.guests.some((entry) => entry.state === "eating")) throw new Error("Food was not delivered during the silent step");
  await page.evaluate(() => window.advanceTime(8000));
  current = await gameState();
  const payment = current.payments[0];
  if (!payment) throw new Error("Routine payment did not appear");
  await clickCanvas(payment.x, payment.y);
  await expectSilent("Payment collected");
  await page.screenshot({ path: path.join(out, "01-routine-service-no-toast.png"), fullPage: true });

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const fridge = window.CHICK_TABLE_SOURCE.InstallFacility.find((row) => Number(row.areaType) === 1 && Number(row.facilityType) === 6);
    saved.installed = [...new Set([...saved.installed, fridge.id])];
    saved.rng = 1972;
    saved.guests = [{
      id: 99001,
      customerId: 3,
      commonId: 1001,
      customerName: "기본 병아리",
      state: "eating",
      seatId: "1-left",
      tableId: 1,
      x: 188,
      y: 432,
      targetX: 240,
      targetY: 900,
      recipeId: 1,
      visitNumber: 1,
      wait: 0,
      stateTime: 7.1,
      mood: "satisfied",
      bob: 0,
    }];
    saved.orders = [];
    saved.cooking = [];
    saved.payments = [];
    saved.ingredientDrops = [];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.evaluate(() => window.advanceTime(34));
  current = await gameState();
  if (!current.ingredientDrops.length || !current.toast.visible || !current.toast.text.includes("떨어뜨렸어요")) {
    throw new Error(`Important ingredient drop toast is missing: ${JSON.stringify(current.toast)}`);
  }
  await page.screenshot({ path: path.join(out, "02-important-drop-toast.png"), fullPage: true });

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("IMPORTANT_TOAST_POLICY_OK routine=6-silent important=ingredient-drop-visible");
} finally {
  await browser.close();
}
