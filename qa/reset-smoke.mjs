import { chromium } from 'file:///C:/Users/Soyoon%20Bang/.codex/node_modules/playwright/index.mjs';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto('http://localhost:5173');
await page.evaluate(() => localStorage.removeItem('chick-village-story-v1'));
await page.reload();
await mkdir('output/reset', { recursive: true });
const game = () => page.evaluate(() => window.__chickGame.getState());

await page.locator('[data-node="wood1"]').click();
await page.locator('[data-node="stone1"]').click();
await page.locator('[data-panel="craft"]').click();
await page.locator('[data-craft="workbench"]').click();
await page.evaluate(() => window.advanceTime(31000));
await page.locator('#sheet-close').click();
let before = await game();
if (before.stock.workbench !== 1) throw Error('초기화 시험용 진행을 만들지 못했습니다');

await page.locator('[data-panel="bag"]').click();
await page.locator('[data-reset-open]').click();
if (!await page.locator('[data-reset-confirm]').isVisible()) throw Error('초기화 확인 화면이 열리지 않습니다');
await page.screenshot({ path: 'output/reset/confirm.png' });
await page.locator('[data-reset-cancel]').click();
if ((await game()).stock.workbench !== 1) throw Error('취소했는데 진행이 사라졌습니다');

await page.locator('[data-reset-open]').click();
await Promise.all([
  page.waitForNavigation(),
  page.locator('[data-reset-confirm]').click(),
]);
let after = await game();
if (after.stock.workbench || after.residents.length || after.placements.home.length || after.inventory.wood !== 2 || after.region !== 'home') throw Error('진행이 초기 상태로 돌아오지 않았습니다');
await page.screenshot({ path: 'output/reset/fresh.png' });
await page.reload();
after = await game();
if (after.stock.workbench || after.inventory.wood !== 2) throw Error('초기화 결과가 저장되지 않았습니다');
const text = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
if (text.stock.workbench || text.residents.length) throw Error('텍스트 상태가 초기화된 화면과 다릅니다');
if (errors.length) throw Error(`브라우저 오류: ${errors.join(' / ')}`);
console.log('확인 화면, 취소 시 진행 보존, 확정 시 초기화, 재접속 유지 확인. 브라우저 오류 0건.');
await browser.close();
