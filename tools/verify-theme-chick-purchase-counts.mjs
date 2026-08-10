import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "theme-chick-purchase-counts");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const gameState = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function buyPart(partId) {
  const card = page.locator(`.theme-part-card[data-id="${partId}"]`);
  await card.scrollIntoViewIfNeeded();
  await card.click();
  const buy = page.locator(`.theme-part-primary[data-action="buy-theme"][data-id="${partId}"]`);
  await buy.waitFor({ state: "visible" });
  await buy.click();
  await page.locator('[data-action="theme-part-close"]').last().click();
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.locator("#debug-toggle-btn").click();
  await page.locator("#debug-install-all-btn").click();
  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.resources.acorns = 1_000_000_000;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="theme"]').click();

  let state = await gameState();
  const stone = state.progression.themeChickProgress[1];
  if (stone.total !== 11 || stone.requirements.map((item) => item.purchaseCount).join(",") !== "0,8,11") {
    throw new Error(`Stone purchase requirements are incorrect: ${JSON.stringify(stone)}`);
  }

  await page.locator('[data-action="theme-select"][data-id="2"]').click();
  state = await gameState();
  const wood = state.progression.themeChickProgress[2];
  if (wood.total !== 11 || wood.requirements.map((item) => item.purchaseCount).join(",") !== "4,8,11") {
    throw new Error(`Standard purchase requirements are incorrect: ${JSON.stringify(wood)}`);
  }
  const nodes = page.locator(".theme-step-node");
  const chickNodes = page.locator(".theme-step-node.is-chick");
  const chickLabels = await chickNodes.evaluateAll((items) => items.map((item) => item.getAttribute("aria-label")));
  if (await nodes.count() !== 11 || chickLabels.length !== 3
    || !chickLabels.some((label) => label.includes("파츠 4종 보유"))
    || !chickLabels.some((label) => label.includes("파츠 8종 보유"))
    || !chickLabels.some((label) => label.includes("파츠 11종 보유"))
    || chickLabels.some((label) => label.includes("%"))
    || (await page.locator(".theme-track-count").innerText()).replace(/\s+/g, " ").trim() !== "0 / 11") {
    throw new Error(`Step track is missing exact chick milestones: ${JSON.stringify(chickLabels)}`);
  }
  if (await page.locator(".theme-chick-progress-card").count()) throw new Error("The previous chick cards must be removed.");
  if (state.progression.themeChickMilestoneRule !== "stone-installed-facility-types;other-owned-theme-part-types") {
    throw new Error(`Theme chick milestone unit is ambiguous: ${state.progression.themeChickMilestoneRule}`);
  }
  const chickIcons = page.locator(".theme-step-node.is-chick > img");
  if (await chickIcons.count() !== 3) throw new Error("Each chick purchase milestone must show its icon.");
  const invalidIcons = await chickIcons.evaluateAll((images) => images.filter((image) => !image.complete
    || image.naturalWidth <= 0
    || image.getBoundingClientRect().width < 26).length);
  if (invalidIcons) throw new Error(`${invalidIcons} chick milestone icons failed to render clearly.`);
  const initialMarkerStyles = await chickNodes.evaluateAll((items) => items.map((item) => ({
    unlocked: item.classList.contains("is-unlocked"),
    borderColor: getComputedStyle(item).borderColor,
  })));
  if (initialMarkerStyles.some((item) => item.unlocked) || await page.locator(".theme-step-node.is-reached").count()) {
    throw new Error(`No Wood milestone may be reached at 0 parts: ${JSON.stringify(initialMarkerStyles)}`);
  }
  if (state.themeManagement.parts.some((part) => [12, 13].includes(part.facilityType))) {
    throw new Error(`Tree/background data remained in theme management: ${JSON.stringify(state.themeManagement.parts)}`);
  }
  await page.locator(".game-frame").screenshot({ path: path.join(out, "01-explicit-4-8-11-requirements.png") });

  const partIds = state.themeManagement.parts.map((part) => part.id);
  for (const partId of partIds.slice(0, 3)) await buyPart(partId);
  state = await gameState();
  if (state.progression.themeChickProgress[2].unlocked.length !== 0) throw new Error("A Wood chick unlocked before 4 purchases.");
  await page.locator("#menu-content").evaluate((element) => { element.scrollTop = 0; });
  await page.locator(".game-frame").screenshot({ path: path.join(out, "01b-three-of-eleven-step-track.png") });

  await buyPart(partIds[3]);
  state = await gameState();
  if (state.progression.themeChickProgress[2].opened !== 4 || state.progression.themeChickProgress[2].unlocked.length !== 1) {
    throw new Error(`First Wood chick did not unlock at 4 purchases: ${JSON.stringify(state.progression.themeChickProgress[2])}`);
  }
  if (await page.locator(".theme-step-node.is-chick.is-unlocked").count() !== 1
    || await page.locator(".theme-step-node.is-reached").count() !== 3
    || !(await page.locator(".theme-step-node.is-chick.is-unlocked").getAttribute("aria-label")).includes("4종")) throw new Error("The first chick milestone did not update at 4 parts.");
  await page.locator(".game-frame").screenshot({ path: path.join(out, "02-first-chick-at-4-purchases.png") });

  for (const partId of partIds.slice(4, 8)) await buyPart(partId);
  state = await gameState();
  if (state.progression.themeChickProgress[2].opened !== 8 || state.progression.themeChickProgress[2].unlocked.length !== 2) {
    throw new Error(`Second Wood chick did not unlock at 8 purchases: ${JSON.stringify(state.progression.themeChickProgress[2])}`);
  }
  if (await page.locator(".theme-step-node.is-chick.is-unlocked").count() !== 2
    || await page.locator(".theme-step-node.is-reached").count() !== 6
    || (await page.locator(".theme-track-count").innerText()).replace(/\s+/g, " ").trim() !== "8 / 11") throw new Error("The second chick milestone did not update at 8 parts.");
  await page.locator(".game-frame").screenshot({ path: path.join(out, "02b-two-chicks-at-8-purchases.png") });

  for (const partId of partIds.slice(8)) await buyPart(partId);
  state = await gameState();
  if (state.progression.themeChickProgress[2].opened !== 11 || state.progression.themeChickProgress[2].unlocked.length !== 3) {
    throw new Error(`Third Wood chick did not unlock at 11 purchases: ${JSON.stringify(state.progression.themeChickProgress[2])}`);
  }
  if (await page.locator(".theme-step-node.is-chick.is-unlocked").count() !== 3
    || await page.locator(".theme-step-node.is-reached").count() !== 8
    || (await page.locator(".theme-track-count").innerText()).replace(/\s+/g, " ").trim() !== "11 / 11") throw new Error("All chick milestones did not update at 11 parts.");
  await page.locator(".game-frame").screenshot({ path: path.join(out, "03-all-chicks-at-11-purchases.png") });
  if (errors.length) throw new Error(`Console errors: ${errors.join(" | ")}`);
  console.log("THEME_CHICK_PART_TYPES_OK stone=base/8/11 standard=4/8/11 steps=11 chick-nodes=3");
} finally {
  await browser.close();
}
