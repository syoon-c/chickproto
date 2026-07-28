import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "cafe-guests");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

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

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const requiredTypes = new Set([15, 17, 18, 19, 21]);
    const cafeParts = window.CHICK_TABLE_SOURCE.InstallFacility
      .filter((row) => row.areaType === 2 && requiredTypes.has(row.facilityType))
      .map((row) => 101 * 1000 + Number(row.id));
    saved.ownedRecipes = {
      1: { level: 1, stack: 0, codexClaimed: false },
      7: { level: 1, stack: 0, codexClaimed: false },
      10: { level: 1, stack: 0, codexClaimed: false },
    };
    saved.cafeArea = { unlocked: true, expansionConfirmed: true };
    saved.cafeThemes = {
      ...saved.cafeThemes,
      activeThemeId: 101,
      opened: cafeParts,
    };
    saved.cafeGuests = [];
    saved.cafeQueue = [];
    saved.cafePayments = [];
    saved.cafeVisit = { timer: 0, total: 0 };
    saved.rng = 1;
    saved.guests = [{
      id: 88001,
      customerId: 3,
      commonId: 1001,
      customerName: "기본 병아리",
      state: "eating",
      seatId: "restaurant-to-cafe-test",
      tableId: 0,
      x: 240,
      y: 450,
      targetX: 240,
      targetY: 900,
      recipeId: 1,
      visitNumber: 1,
      wait: 0,
      stateTime: 7.1,
      mood: "satisfied",
      bob: 0,
    }];
    saved.cakeWorkshop.limitedSale = {
      recipeId: "cafe-guest-test",
      name: "테스트 딸기 케이크",
      comboBonus: true,
      unitPrice: 100,
      remaining: 2,
      selection: {
        sheetId: "cake_sheet_basic",
        creamId: "cake_cream_fresh",
        toppingId: "cake_topping_strawberry",
      },
    };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });

  let current = await state();
  if (!current.cafeArea.serviceReady
    || current.cafeArea.continuedVisitChance !== .8 || current.cafeArea.queuedVisitors !== 0) {
    throw new Error(`Cafe service did not initialize correctly: ${JSON.stringify(current.cafeArea)}`);
  }

  if (!current.cafeGuests.length) await page.evaluate(() => window.advanceTime(4000));
  current = await state();
  const continuedGuest = current.cafeGuests[0];
  if (current.cafeGuests.length !== 1 || current.metrics.cafeVisitors !== 1
    || current.metrics.cafeContinuedVisitors !== 1
    || continuedGuest.sourceRestaurantGuestId !== 88001
    || continuedGuest.customerId !== 3) {
    throw new Error(`Restaurant guest did not continue to Cafe: ${JSON.stringify({
      cafeArea: current.cafeArea,
      cafeGuests: current.cafeGuests,
      metrics: current.metrics,
    })}`);
  }
  await page.locator('[data-world-area="cafe"]').click();
  await page.screenshot({ path: path.join(out, "01-guest-arrives-at-cafe.png"), fullPage: true });

  await page.evaluate(() => window.advanceTime(7000));
  current = await state();
  const enjoying = current.cafeGuests.find((guest) => guest.state === "enjoying");
  if (!enjoying || enjoying.orderKind !== "cake" || enjoying.enjoyRemaining == null) {
    throw new Error(`Cafe guest did not order and sit down: ${JSON.stringify(current.cafeGuests)}`);
  }
  await page.screenshot({ path: path.join(out, "02-guest-enjoys-cake.png"), fullPage: true });

  await page.evaluate(() => window.advanceTime(7500));
  current = await state();
  if (current.metrics.cafeServed < 1 || !current.cafePayments.length
    || current.cakeWorkshop.limitedSale?.remaining !== 1) {
    throw new Error(`Cafe service did not produce cake sale/payment: ${JSON.stringify({
      metrics: current.metrics,
      payments: current.cafePayments,
      sale: current.cakeWorkshop.limitedSale,
    })}`);
  }
  const payment = current.cafePayments[0];
  const beforeAcorns = current.resources.acorns;
  await clickCanvas(payment.x, payment.y);
  current = await state();
  if (current.resources.acorns !== beforeAcorns + payment.amount
    || current.metrics.cafeCollected !== payment.amount) {
    throw new Error(`Cafe payment collection failed: ${JSON.stringify(current.metrics)}`);
  }
  await page.screenshot({ path: path.join(out, "03-cafe-sale-collected.png"), fullPage: true });
  await page.evaluate(() => window.advanceTime(30000));
  current = await state();
  if (current.metrics.cafeVisitors !== 1 || current.cafeArea.queuedVisitors !== 0) {
    throw new Error(`Cafe created an independent visitor: ${JSON.stringify({
      cafeArea: current.cafeArea,
      cafeGuests: current.cafeGuests,
      metrics: current.metrics,
    })}`);
  }

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("CAFE_GUESTS_OK restaurantContinuation=80% cakeSale=1 independentVisitors=0");
} finally {
  await browser.close();
}
