import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "first-guest-toast");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

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
    saved.collections.customers = {};
    saved.guests = [];
    saved.orders = [];
    saved.cooking = [];
    saved.payments = [];
    saved.resources.acorns = 1000000;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });

  await page.locator("#promotion-btn").click();
  let current = await gameState();
  const toast = page.locator("#guest-toast");
  const toastText = await toast.innerText();
  if (!current.newGuestAlert.visible || current.toast.visible
    || !toastText.includes("새로운 손님 첫 방문!")
    || !toastText.includes("기본 병아리")
    || !toastText.includes("손님 도감에 등록됐어요")
    || !await toast.evaluate((element) => element.classList.contains("new-guest-alert"))) {
    throw new Error(`First guest did not use the separate alert: ${JSON.stringify(current.newGuestAlert)} / ${toastText}`);
  }
  const iconSource = await toast.locator(".new-guest-toast-icon").getAttribute("src");
  if (!iconSource?.endsWith("icon_chick_001.png") || current.collection.customers !== 1) {
    throw new Error(`First guest toast used the wrong icon or collection state: ${iconSource}`);
  }
  await page.waitForTimeout(550);
  await page.screenshot({ path: path.join(out, "01-first-guest-highlight.png"), fullPage: true });

  await page.locator('[data-screen="theme"]').click();
  await page.locator('[data-action="theme-select"][data-id="2"]').click();
  await page.locator('.theme-part-card.is-priced:not(.is-unavailable):has(> span > img)').first().click();
  await page.locator('[data-action="buy-theme"]:not(:disabled)').click();
  current = await gameState();
  if (!current.newGuestAlert.visible || !current.newGuestAlert.text.includes("기본 병아리")
    || !current.toast.visible || current.toast.variant !== "default" || !current.toast.text) {
    throw new Error(`Regular and guest alerts were not shown independently: ${JSON.stringify({ toast: current.toast, guest: current.newGuestAlert })}`);
  }
  await page.screenshot({ path: path.join(out, "02-simultaneous-separate-alerts.png"), fullPage: true });

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.guests = [];
    saved.orders = [];
    saved.cooking = [];
    saved.payments = [];
    saved.promotion = { progress: 0, queued: 0, totalClicks: saved.promotion.totalClicks };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator("#promotion-btn").click();
  current = await gameState();
  if (current.newGuestAlert.visible || current.toast.visible
    || current.collection.customerGrades[3]?.visits !== 2) {
    throw new Error(`Repeat guest was not silent: ${JSON.stringify({ toast: current.toast, collection: current.collection })}`);
  }
  await page.screenshot({ path: path.join(out, "03-repeat-guest-silent.png"), fullPage: true });

  fs.writeFileSync(path.join(out, "state.json"), JSON.stringify(current, null, 2));
  fs.writeFileSync(path.join(out, "console-errors.json"), JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("FIRST_GUEST_TOAST_OK first=separate regular=simultaneous repeat=silent icon=base-chick");
} finally {
  await browser.close();
}
