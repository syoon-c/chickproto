import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "area-swipe-and-meal-time");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function dragCanvas(fromRatio, toRatio) {
  const box = await page.locator("#game-canvas").boundingBox();
  const y = box.y + box.height * .58;
  await page.mouse.move(box.x + box.width * fromRatio, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * ((fromRatio + toRatio) / 2), y, { steps: 6 });
  await page.mouse.move(box.x + box.width * toRatio, y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(120);
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
    saved.ownedRecipes = {
      1: { level: 1, stack: 0, codexClaimed: false },
      7: { level: 1, stack: 0, codexClaimed: false },
      10: { level: 1, stack: 0, codexClaimed: false },
    };
    saved.cafeArea = { unlocked: true, expansionConfirmed: true };
    saved.guests = [{
      id: 99001,
      customerId: 3,
      commonId: 1001,
      customerName: "기본 병아리",
      state: "eating",
      seatId: "meal-duration-test",
      tableId: 0,
      x: 240,
      y: 450,
      targetX: 240,
      targetY: 900,
      recipeId: 1,
      visitNumber: 1,
      wait: 0,
      stateTime: 0,
      mood: "satisfied",
      bob: 0,
    }];
    saved.orders = [];
    saved.cooking = [];
    saved.payments = [];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });

  let current = await state();
  if (current.mealDurationSeconds !== 7
    || current.guests[0]?.mealDuration !== 7
    || current.guests[0]?.mealRemaining !== 7) {
    throw new Error(`Meal duration is not seven seconds: ${JSON.stringify(current.guests[0])}`);
  }
  await page.evaluate(() => window.advanceTime(6900));
  current = await state();
  if (current.guests[0]?.state !== "eating" || current.metrics.served !== 0) {
    throw new Error(`Meal ended before seven seconds: ${JSON.stringify(current.guests[0])}`);
  }
  await page.evaluate(() => window.advanceTime(200));
  current = await state();
  if (current.guests[0]?.state !== "leaving" || current.metrics.served !== 1) {
    throw new Error(`Meal did not end after seven seconds: ${JSON.stringify(current.guests[0])}`);
  }

  await dragCanvas(.82, .18);
  current = await state();
  if (current.mode !== "restaurant" || current.worldNavigation.current !== "restaurant"
    || current.worldNavigation.methods.length !== 1
    || current.worldNavigation.methods[0] !== "edge-arrow") {
    throw new Error(`Canvas drag changed area or drag navigation remains enabled: ${JSON.stringify(current.worldNavigation)}`);
  }

  await page.locator('[data-world-area="cafe"]').click();
  current = await state();
  if (current.mode !== "cafe") throw new Error("Right arrow did not move to Cafe");
  if (await page.locator('[data-world-area="restaurant"]').isHidden()
    || !await page.locator('[data-world-area="cafe"]').isHidden()) {
    throw new Error("Cafe arrow visibility is incorrect");
  }
  await page.screenshot({ path: path.join(out, "01-arrow-to-cafe.png"), fullPage: true });

  await dragCanvas(.18, .82);
  current = await state();
  if (current.mode !== "cafe" || current.worldNavigation.current !== "cafe") {
    throw new Error(`Canvas drag unexpectedly returned to Restaurant: ${JSON.stringify(current.worldNavigation)}`);
  }
  await page.locator('[data-world-area="restaurant"]').click();
  current = await state();
  if (current.mode !== "restaurant") throw new Error("Left arrow did not return to Restaurant");
  await page.screenshot({ path: path.join(out, "02-arrow-back-to-restaurant.png"), fullPage: true });

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("AREA_ARROW_AND_MEAL_TIME_OK duration=7 arrows=ok drag=disabled");
} finally {
  await browser.close();
}
