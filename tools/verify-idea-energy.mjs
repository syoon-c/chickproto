import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, "output", "idea-energy");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1050 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));

async function reload() {
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => typeof window.render_game_to_text === "function");
}

async function openRecipe() {
  await page.locator('[data-screen="recipe"]').click();
  await page.waitForSelector(".idea-energy-bar");
}

async function setIdeaAmount(amount) {
  await page.evaluate((value) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.resources.ideas = value;
    saved.ideaEnergy.regenElapsed = 0;
    saved.ideaEnergy.lastUpdatedAt = Date.now();
    localStorage.setItem(key, JSON.stringify(saved));
  }, amount);
  await reload();
}

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await reload();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();

  let current = await state();
  if (current.ideaEnergy.current !== 20 || current.ideaEnergy.maximum !== 20
    || current.ideaEnergy.researchCost !== 1 || current.ideaEnergy.regenSeconds !== 1800
    || JSON.stringify(current.ideaEnergy.refillCosts) !== JSON.stringify([10, 50, 100, 200])
    || current.ideaEnergy.nextRefillGemCost !== 10) {
    throw new Error(`초기 아이디어 설정이 잘못되었습니다: ${JSON.stringify(current.ideaEnergy)}`);
  }

  const ids = await page.evaluate(() => {
    const ingredient = (name) => Object.values(window.CHICK_CONFIG.GAME_INGREDIENTS).find((item) => item.name === name).id;
    const install = (type) => window.CHICK_TABLE_SOURCE.InstallFacility.find((row) => Number(row.areaType) === 1 && Number(row.facilityType) === type).id;
    return {
      onion: ingredient("양파"), vinegar: ingredient("식초"), chickpea: ingredient("병아리콩"), flour: ingredient("밀가루"),
      countertop: install(8), stove: install(2),
    };
  });
  await page.evaluate(({ ids: values }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.installed = [...new Set([...saved.installed, values.countertop, values.stove])];
    saved.resources.gems = 1000;
    saved.crafting.ingredients = { [values.onion]: 1, [values.vinegar]: 1 };
    saved.crafting.selected = [];
    saved.tutorial = { activeId: null, seen: ["welcome", "recipe-unlocked"] };
    localStorage.setItem(key, JSON.stringify(saved));
  }, { ids });
  await reload();
  await openRecipe();
  await page.screenshot({ path: path.join(out, "01-full-energy-panel.png"), fullPage: true });
  await page.locator('[data-action="open-ingredient-picker"]').click();
  await page.locator(`[data-action="select-ingredient"][data-id="${ids.onion}"]`).click();
  await page.locator(`[data-action="select-ingredient"][data-id="${ids.vinegar}"]`).click();
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  current = await state();
  if (current.ideaEnergy.current !== 19 || current.recipes.levels[51] !== 1) {
    throw new Error(`수동 연구가 아이디어 1개를 소비하지 않았습니다: ${JSON.stringify({ idea: current.ideaEnergy, levels: current.recipes.levels })}`);
  }

  await page.locator('[data-action="dismiss-recipe-reveal"]').click();
  await page.evaluate(({ ids: values }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = { [values.vinegar]: 1, [values.chickpea]: 1 };
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, { ids });
  await reload();
  await openRecipe();
  await page.locator('[data-action="open-ingredient-picker"]').click();
  await page.locator(`[data-action="select-ingredient"][data-id="${ids.vinegar}"]`).click();
  await page.locator(`[data-action="select-ingredient"][data-id="${ids.chickpea}"]`).click();
  await page.locator('[data-action="discover-combination"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  current = await state();
  if (current.ideaEnergy.current !== 18 || current.recipes.reveal?.result !== "failure") {
    throw new Error(`괴식 연구가 아이디어 1개를 소비하지 않았습니다: ${JSON.stringify(current.ideaEnergy)}`);
  }

  await page.locator('[data-action="dismiss-recipe-reveal"]').click();
  await page.evaluate(({ ids: values }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.crafting.ingredients = { [values.onion]: 1, [values.vinegar]: 1 };
    localStorage.setItem(key, JSON.stringify(saved));
  }, { ids });
  await reload();
  await openRecipe();
  await page.locator('[data-action="manual-upgrade"][data-id="51"]').click();
  current = await state();
  if (current.ideaEnergy.current !== 17 || current.recipes.levels[51] !== 2) {
    throw new Error(`수동 레벨업이 아이디어 1개를 소비하지 않았습니다: ${JSON.stringify(current.ideaEnergy)}`);
  }

  await page.locator('[data-action="dismiss-recipe-reveal"]').click();
  await page.evaluate(({ ids: values }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    [1, 2, 3, 4, 5].forEach((recipeId) => { saved.ownedRecipes[recipeId] ||= { level: 1, stack: 0, codexClaimed: true }; });
    saved.crafting.ingredients = { [values.chickpea]: 1, [values.flour]: 1 };
    saved.crafting.selected = [];
    localStorage.setItem(key, JSON.stringify(saved));
  }, { ids });
  await reload();
  await openRecipe();
  await page.locator('[data-action="auto-craft"]').click();
  await page.evaluate(() => window.advanceTime(2500));
  current = await state();
  if (current.ideaEnergy.current !== 16 || current.recipes.levels[4] !== 2) {
    throw new Error(`자동 연구가 아이디어 1개를 소비하지 않았습니다: ${JSON.stringify(current.ideaEnergy)}`);
  }

  await page.locator('[data-action="dismiss-recipe-reveal"]').click();
  await page.evaluate(({ stove }) => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.guests = [{
      id: "idea-service-test", customerId: 3, commonId: 1001, customerName: "기본 병아리", state: "waiting_food",
      seatId: "idea-service-seat", tableId: 0, x: 240, y: 430, targetX: 240, targetY: 900,
      recipeId: 1, visitNumber: 1, wait: 0, stateTime: 0, mood: "satisfied", bob: 0,
    }];
    saved.cooking = [{ stoveId: stove, guestId: "idea-service-test", recipeId: 1, elapsed: 3.99, duration: 4 }];
    localStorage.setItem(key, JSON.stringify(saved));
  }, { stove: ids.stove });
  await reload();
  await page.evaluate(() => window.advanceTime(34));
  current = await state();
  if (current.ideaEnergy.current !== 16 || current.guests[0]?.state !== "eating") {
    throw new Error(`손님 음식 조리에 아이디어가 소비됐습니다: ${JSON.stringify({ idea: current.ideaEnergy, guest: current.guests[0] })}`);
  }

  await setIdeaAmount(0);
  await openRecipe();
  const refillCosts = [];
  for (let index = 0; index < 4; index += 1) {
    current = await state();
    refillCosts.push(current.ideaEnergy.nextRefillGemCost);
    await page.locator('[data-action="recharge-ideas"]').click();
    current = await state();
    if (current.ideaEnergy.current !== 10 || current.ideaEnergy.refillsToday !== index + 1) {
      throw new Error(`아이디어 충전 ${index + 1}회차가 잘못되었습니다: ${JSON.stringify(current.ideaEnergy)}`);
    }
    if (index < 3) {
      await setIdeaAmount(0);
      await openRecipe();
    }
  }
  current = await state();
  if (JSON.stringify(refillCosts) !== JSON.stringify([10, 50, 100, 200])
    || current.resources.gems !== 640 || current.ideaEnergy.nextRefillGemCost !== 200) {
    throw new Error(`충전 비용 상승이 잘못되었습니다: ${JSON.stringify({ refillCosts, gems: current.resources.gems, idea: current.ideaEnergy })}`);
  }
  await page.screenshot({ path: path.join(out, "02-fourth-refill-next-200.png"), fullPage: true });

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.resources.ideas = 0;
    saved.ideaEnergy.dayKey = "2000-01-01";
    saved.ideaEnergy.refillsToday = 4;
    saved.ideaEnergy.regenElapsed = 0;
    saved.ideaEnergy.lastUpdatedAt = Date.now();
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await reload();
  current = await state();
  if (current.ideaEnergy.refillsToday !== 0 || current.ideaEnergy.nextRefillGemCost !== 10) {
    throw new Error(`일일 충전 가격 초기화가 잘못되었습니다: ${JSON.stringify(current.ideaEnergy)}`);
  }

  await page.evaluate(() => {
    const key = "chick-bistro-planning-prototype-v2";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.resources.ideas = 0;
    saved.ideaEnergy.regenElapsed = 0;
    saved.ideaEnergy.lastUpdatedAt = Date.now() - 1801 * 1000;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await reload();
  current = await state();
  if (current.ideaEnergy.current !== 1 || current.ideaEnergy.nextRecoveryIn > 1800) {
    throw new Error(`오프라인 30분 회복이 잘못되었습니다: ${JSON.stringify(current.ideaEnergy)}`);
  }

  fs.writeFileSync(path.join(out, "result.json"), JSON.stringify({
    researchConsumption: { manual: 1, failure: 1, levelUp: 1, automatic: 1, guestMeal: 0 },
    refillCosts,
    refillAmount: 10,
    dailyResetCost: current.ideaEnergy.nextRefillGemCost,
    offlineRecovery: current.ideaEnergy.current,
  }, null, 2));
  if (errors.length) throw new Error(`브라우저 오류: ${errors.join(" | ")}`);
  console.log("IDEA_ENERGY_OK max=20 regen=1800s research=1 refill=+10 costs=10/50/100/200 daily-reset=yes guest-meal=0");
} finally {
  await browser.close();
}
