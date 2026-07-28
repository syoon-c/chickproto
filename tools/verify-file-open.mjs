import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);

const outputDir = path.join(root, "output", "file-open-verified-v7");
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push({ type: "console.error", text: message.text() });
});
page.on("pageerror", (error) => errors.push({ type: "pageerror", text: String(error) }));

function parseState(text) {
  return JSON.parse(text);
}

async function readState() {
  return parseState(await page.evaluate(() => window.render_game_to_text()));
}

async function clickCanvas(x, y) {
  const canvas = page.locator("#game-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas bounding box not found");
  await page.mouse.click(box.x + (x / 480) * box.width, box.y + (y / 900) * box.height);
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(500);

  const initial = await readState();
  fs.writeFileSync(path.join(outputDir, "01-initial.json"), JSON.stringify(initial, null, 2));
  await page.screenshot({ path: path.join(outputDir, "01-initial.png"), fullPage: true });

  for (const name of ["조명", "테이블", "조리기구"]) {
    const current = await readState();
    const candidate = current.installCandidates.find((item) => item.name === name);
    if (!candidate) throw new Error(`Install candidate not found: ${name}`);
    await clickCanvas(candidate.x, candidate.y);
    await page.locator("#install-confirm-btn").click();
  }

  for (let i = 0; i < 5; i += 1) await page.locator("#promotion-btn").click();
  // The first table now sits higher in the room, so allow the guest to finish
  // walking from the entrance before checking the awaiting-order state.
  await page.evaluate(() => window.advanceTime(4000));
  const awaiting = await readState();
  fs.writeFileSync(path.join(outputDir, "02-awaiting-order.json"), JSON.stringify(awaiting, null, 2));
  await page.screenshot({ path: path.join(outputDir, "02-awaiting-order.png"), fullPage: true });

  const guest = awaiting.guests.find((item) => item.state === "awaiting_order");
  if (!guest) throw new Error("Awaiting-order guest not found");
  await clickCanvas(guest.x, guest.y - 40);
  await page.evaluate(() => window.advanceTime(12000));
  const paymentState = await readState();
  const payment = paymentState.payments[0];
  if (!payment) throw new Error("Payment not found after meal");
  await clickCanvas(payment.x, payment.y);
  await page.evaluate(() => window.advanceTime(500));

  const completed = await readState();
  fs.writeFileSync(path.join(outputDir, "03-completed.json"), JSON.stringify(completed, null, 2));
  await page.screenshot({ path: path.join(outputDir, "03-completed.png"), fullPage: true });
  fs.writeFileSync(path.join(outputDir, "console-errors.json"), JSON.stringify(errors, null, 2));

  const expectedAcorns = paymentState.resources.acorns + payment.amount;
  if (completed.resources.acorns !== expectedAcorns || completed.metrics.served !== 1 || completed.metrics.collected !== payment.amount) {
    throw new Error(`Unexpected completed state: ${JSON.stringify(completed)}`);
  }
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log("FILE_OPEN_CORE_LOOP_OK");
} finally {
  await browser.close();
}
