import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const playwrightUrl = pathToFileURL(path.join(codexHome, "node_modules", "playwright", "index.mjs")).href;
const { chromium } = await import(playwrightUrl);
const out = path.join(root, ".tmp", "planning-theme-order");
fs.mkdirSync(out, { recursive: true });

const expectedThemeOrder = [
  "돌 테마", "나무 테마", "초록 줄무늬 테마", "블루화이트 테마", "그린핑크 테마",
  "벚꽃 테마", "한식당 테마", "채소밭 테마", "블루 땡땡이 테마", "병아리 테마",
  "식빵 테마", "이태리 테마", "캠핑 테마", "패스트푸드 테마", "양반집 테마",
  "톨게이트 테마", "옛날 사무실 테마", "목욕탕 테마", "학교 테마", "오락실 테마",
  "버섯 늪 테마", "해적선 테마", "바닷속 테마", "연금술 테마", "우주 점성술 테마", "무덤 테마",
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 480, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));

try {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-screen="theme"]').click();

  const tabs = page.locator('.theme-tabs [data-action="theme-select"]');
  const actualThemeOrder = await tabs.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")));
  if (JSON.stringify(actualThemeOrder) !== JSON.stringify(expectedThemeOrder)) {
    throw new Error(`테마 UI 순서가 다릅니다: ${JSON.stringify(actualThemeOrder)}`);
  }

  const scenarios = [
    { id: 6, title: "벚꽃 식당", chicks: ["꽃 병아리", "꿀벌 병아리", "체리 병아리"], file: "06-cherry.png" },
    { id: 7, title: "한식당", chicks: ["연어 병아리", "장독대 병아리", "프라이팬 병아리"], file: "07-krestaurant.png" },
    { id: 24, title: "연금술 식당", chicks: ["마법책 병아리", "만드라고라 병아리", "마법사 할아버지 병아리"], file: "24-alchemical.png" },
  ];
  for (const scenario of scenarios) {
    await page.locator(`[data-action="theme-select"][data-id="${scenario.id}"]`).click();
    const header = await page.locator(".theme-set-panel > header strong").innerText();
    if (header !== scenario.title) throw new Error(`테마 ${scenario.id} 제목이 다릅니다: ${header}`);
    const chickLabels = await page.locator(".theme-step-node.is-chick").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
    scenario.chicks.forEach((name, index) => {
      if (!chickLabels[index]?.startsWith(name)) throw new Error(`테마 ${scenario.id} 병아리 ${index + 1} 순서가 다릅니다: ${chickLabels[index]}`);
    });
    await page.waitForFunction(() => [...document.images].every((image) => image.complete));
    const broken = await page.locator(".theme-management img").evaluateAll((images) => images.filter((image) => image.naturalWidth === 0).map((image) => image.src));
    if (broken.length) throw new Error(`테마 ${scenario.id} 이미지가 깨졌습니다: ${broken.join(", ")}`);
    await page.locator("#menu-screen").screenshot({ path: path.join(out, scenario.file) });
  }

  if (errors.length) throw new Error(`브라우저 오류: ${errors.join(" | ")}`);
  console.log("PLANNING_THEME_ORDER_UI_OK themes=26 chicks=78 samples=6/7/24 icons=ok");
} finally {
  await browser.close();
}
