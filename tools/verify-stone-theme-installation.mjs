import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "individual-installation");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));

const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function openCandidate(installId) {
  if (await page.locator("#chef-dialogue").isVisible()) {
    await page.locator("#chef-dialogue").click();
    await page.waitForTimeout(100);
  }
  const current = await gameState();
  const candidate = current.installationSystem.candidates.find((item) => item.id === installId);
  if (!candidate) throw new Error(`Install ${installId} is not an available field candidate: ${JSON.stringify(current.installationSystem.candidates)}`);
  const canvas = page.locator("#game-canvas");
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error("Game canvas is not visible.");
  await canvas.click({ position: {
    x: candidate.position.x * canvasBox.width / 480,
    y: candidate.position.y * canvasBox.height / 900,
  } });
  await page.locator("#install-panel").waitFor({ state: "visible" });
  const opened = await gameState();
  if (opened.installationSystem.selectedInstallId !== installId) {
    throw new Error(`Wrong individual install panel opened: ${JSON.stringify(opened.installationSystem)}`);
  }
}

async function confirmCandidate(installId, expectedCost) {
  await openCandidate(installId);
  if (Number((await page.locator("#install-cost").innerText()).replaceAll(",", "")) !== expectedCost) {
    throw new Error(`Install ${installId} did not show cost ${expectedCost}.`);
  }
  await page.locator("#install-confirm-btn").click();
  await page.locator("#install-panel").waitFor({ state: "hidden" });
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });

  let state = await gameState();
  if (await page.locator("#install-panel").count() !== 1 || await page.locator("#install-panel").isVisible()) {
    throw new Error("The individual install panel must exist and start closed.");
  }
  if (state.installedFacilityIds.length !== 0) throw new Error(`A new game should start with no facilities: ${state.installedFacilityIds}`);
  if (state.installationSystem.mode !== "individual-field-installation" || !state.installationSystem.separateInstallPanel) {
    throw new Error(`Unexpected installation mode: ${JSON.stringify(state.installationSystem)}`);
  }
  if (state.installationSystem.stoneParts.length !== 11
    || state.installationSystem.stoneParts.some((part) => !part.owned || [12, 13].includes(part.facilityType))) {
    throw new Error(`Stone must remain the owned base appearance without tree/background parts: ${JSON.stringify(state.installationSystem.stoneParts)}`);
  }
  if (state.installationSystem.candidates.map((item) => item.id).join(",") !== "16,1") {
    throw new Error(`The first two install points are incorrect: ${JSON.stringify(state.installationSystem.candidates)}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "01-empty-restaurant-install-points.png") });

  await confirmCandidate(16, 10);
  state = await gameState();
  if (state.installedFacilityIds.join(",") !== "16" || state.resources.acorns !== 140) {
    throw new Error(`Lighting was not installed individually: ${JSON.stringify({ installed: state.installedFacilityIds, acorns: state.resources.acorns })}`);
  }

  await openCandidate(1);
  await page.locator(".game-frame").screenshot({ path: path.join(out, "02-single-table-install-popup.png") });
  await page.locator("#install-confirm-btn").click();
  state = await gameState();
  let tablePart = state.installationSystem.stoneParts.find((part) => part.facilityType === 1);
  if (tablePart.installedIds.join(",") !== "1" || state.installedFacilityIds.some((id) => [2, 3, 4].includes(id))) {
    throw new Error(`Buying the first table installed more than one table: ${JSON.stringify(tablePart)}`);
  }

  await confirmCandidate(5, 25);
  state = await gameState();
  let stovePart = state.installationSystem.stoneParts.find((part) => part.facilityType === 2);
  if (stovePart.installedIds.join(",") !== "5" || state.installedFacilityIds.some((id) => [6, 7, 8].includes(id))
    || !state.promotion.enabled) {
    throw new Error(`Buying the first stove installed more than one stove: ${JSON.stringify({ stovePart, promotion: state.promotion })}`);
  }
  const distinctProgressBeforeSecondTable = state.progression.themeChickProgress[1].opened;

  await confirmCandidate(2, 40);
  state = await gameState();
  tablePart = state.installationSystem.stoneParts.find((part) => part.facilityType === 1);
  if (tablePart.installedIds.join(",") !== "1,2" || state.installedFacilityIds.some((id) => [3, 4].includes(id))) {
    throw new Error(`The second table install was not independent: ${JSON.stringify(tablePart)}`);
  }
  if (state.progression.themeChickProgress[1].opened !== distinctProgressBeforeSecondTable) {
    throw new Error("A second table instance must not masquerade as a new facility type for chick progression.");
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "03-two-tables-one-stove-installed.png") });

  await page.reload({ waitUntil: "load" });
  state = await gameState();
  if (state.installationSystem.selectedInstallId !== null || state.installedFacilityIds.join(",") !== "1,2,5,16") {
    throw new Error(`Partial individual installations did not persist cleanly: ${JSON.stringify(state.installationSystem)}`);
  }

  await page.locator("#debug-toggle-btn").click();
  await page.locator("#debug-install-all-btn").click();
  state = await gameState();
  if (state.installedFacilityIds.length !== state.debug.totalInstallFacilities
    || state.debug.installedFacilities !== state.debug.totalInstallFacilities
    || state.progression.themeChickProgress[1].opened !== 11) {
    throw new Error(`Debug install-all did not complete the restored system: ${JSON.stringify({ installed: state.installedFacilityIds, debug: state.debug, progress: state.progression.themeChickProgress[1] })}`);
  }
  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log(`INDIVIDUAL_INSTALLATION_OK partial=lighting1+tables2+stove1 total=${state.debug.totalInstallFacilities} stoneTypes=11`);
} finally {
  await browser.close();
}
