import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, "src", "game-config.js"), "utf8"), { filename: "src/game-config.js" });
const { GUEST_GRADES } = globalThis.CHICK_CONFIG;
if (JSON.stringify(GUEST_GRADES.map((grade) => [grade.minVisits, grade.primaryCount, grade.secondaryCount, grade.rareCount]))
  !== JSON.stringify([[1, 1, 0, 0], [40, 1, 1, 0], [150, 1, 1, 1]])) {
  throw new Error(`Three-stage guest grades mismatch: ${JSON.stringify(GUEST_GRADES)}`);
}

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "customer-codex-clean-ui");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
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

  const routes = await page.evaluate(() => window.CHICK_CONFIG.CORE_PROGRESSION.filter((route) => route.themeId === 6));
  await page.evaluate((campingRoutes) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const rows = window.CHICK_TABLE_SOURCE.ThemeFacility.filter((row) => row.areaType === 1 && row.facilityTheme === 6);
    saved.themes.opened = [...new Set([...saved.themes.opened, ...rows.map((row) => row.id)])];
    saved.collections.customers = {
      [campingRoutes[0].customerId]: { count: 1, firstSeen: Date.now(), isNew: false },
      [campingRoutes[1].customerId]: { count: 40, firstSeen: Date.now(), isNew: false },
      [campingRoutes[2].customerId]: { count: 150, firstSeen: Date.now(), isNew: false },
    };
    saved.ui.collectionCustomerId = campingRoutes[2].customerId;
    localStorage.setItem(key, JSON.stringify(saved));
  }, routes);
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="collection"]').click();
  await page.waitForTimeout(150);

  if (await page.locator(".customer-roster-card").count() !== 45) throw new Error("Customer roster must contain 45 compact cards");
  if (await page.locator(".customer-profile").count() !== 1) throw new Error("Codex must show exactly one customer detail panel");
  if (await page.locator(".customer-grade-step").count() !== 3) throw new Error("Customer grade panel must have three steps");
  if (await page.locator(".customer-grade-step.is-reached").count() !== 3) throw new Error("150 visits must reach all three steps");
  if (await page.locator(".customer-drop-row").count() !== 3 || await page.locator(".customer-drop-row.is-active").count() !== 3) {
    throw new Error("150 visits must unlock all three material rows");
  }
  let text = await page.locator("#menu-content").innerText();
  if (!text.includes("150회") || !text.includes("최고의 단골") || text.includes("연결 레시피") || text.includes("현재 2개")) {
    throw new Error(`Customer detail text is incorrect: ${text}`);
  }
  await page.screenshot({ path: path.join(out, "01-clean-customer-profile.png"), fullPage: true });

  await page.locator(`[data-action="select-customer"][data-id="${routes[1].customerId}"]`).click();
  if (await page.locator(".customer-grade-step.is-reached").count() !== 2
    || await page.locator(".customer-drop-row.is-active").count() !== 2) {
    throw new Error("40 visits must unlock two grade/material steps");
  }
  text = await page.locator(".customer-profile").innerText();
  if (!text.includes("단골") || !text.includes("다음 150회") || !text.includes("현재 1개")) {
    throw new Error(`40-visit profile is incorrect: ${text}`);
  }

  await page.locator(`[data-action="select-customer"][data-id="${routes[0].customerId}"]`).click();
  if (await page.locator(".customer-grade-step.is-reached").count() !== 1
    || await page.locator(".customer-drop-row.is-active").count() !== 1) {
    throw new Error("First visit must unlock only the primary material");
  }
  const current = await state();
  if (current.progression.guestGrades.length !== 3
    || current.collection.customerGrades[routes[0].customerId].nextAt !== 40
    || current.collection.customerGrades[routes[1].customerId].nextAt !== 150
    || current.collection.customerGrades[routes[2].customerId].nextAt !== null) {
    throw new Error(`Text state grade progression mismatch: ${JSON.stringify(current.collection.customerGrades)}`);
  }

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("CUSTOMER_CODEX_UI_OK roster=45 detail=1 grades=1/40/150 dropQuantity=1");
} finally {
  await browser.close();
}
