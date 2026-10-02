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
await mkdir('output/progression-loop', { recursive: true });
const game = () => page.evaluate(() => window.__chickGame.getState());
const advance = ms => page.evaluate(ms => window.advanceTime(ms), ms);
const node = id => page.locator(`[data-node="${id}"]`).click();
const clickWorld = async (x, y) => {
  const point = await page.evaluate(([x, y]) => {
    const svg = document.querySelector('svg'), p = svg.createSVGPoint();
    p.x = x; p.y = y;
    const mapped = p.matrixTransform(svg.getScreenCTM());
    return { x: mapped.x, y: mapped.y };
  }, [x, y]);
  await page.mouse.click(point.x, point.y);
};
const craft = async id => {
  if (['workbench', 'farm', 'stove', 'tub', 'stage'].includes(id)) await page.locator('[data-panel="craft"]').click();
  else {
    const state = await game();
    const bench = state.placements[state.region].find(o => o.kind === 'workbench');
    if (!bench) throw Error(`${id} 제작에 작업대가 없습니다`);
    await page.locator(`[data-object="${bench.id}"]`).click();
  }
  await page.locator(`[data-craft="${id}"]`).click();
  await page.locator('#sheet-close').click();
};
const place = async (id, x, y) => {
  await page.locator('[data-panel="storage"]').click();
  await page.locator(`[data-place="${id}"]`).click();
  await clickWorld(x, y);
  await page.locator('#place-done').click();
};

await node('wood1'); await node('wood2'); await node('stone1');
await craft('workbench');
await advance(31000);
await place('workbench', 200, 320);
let state = await game();
const benchId = state.placements.home.find(o => o.kind === 'workbench')?.id;
if (!benchId) throw Error('작업대 설치 실패');
await page.screenshot({ path: 'output/progression-loop/workbench.png' });
await page.locator('[data-panel="craft"]').click();
if (await page.locator('[data-craft="swing"]').count()) throw Error('가구가 시설 제작 목록에 남아 있습니다');
await page.screenshot({ path: 'output/progression-loop/recipes.png' });
await page.locator('#sheet-close').click();
await page.locator(`[data-object="${benchId}"]`).click();
if (!await page.locator('[data-craft="swing"]').isVisible() || !await page.locator('[data-craft="bench"]').isVisible()) throw Error('작업대에 나무 가구 제작이 없습니다');
await page.screenshot({ path: 'output/progression-loop/workbench-recipes.png' });
await page.locator('#sheet-close').click();

// 가구 제작이 진행되는 동안 같은 재료를 판자로 가공합니다.
await craft('cushion');
await page.locator('#objective-button').click();
if (await page.locator('#sheet-title').textContent() !== '목공 작업대') throw Error('제작 중 목표가 작업대로 안내하지 않습니다');
await page.locator('#sheet-close').click();
await node('wood1');
await page.locator(`[data-object="${benchId}"]`).click();
await page.locator('[data-action="process-plank"]').click();
state = await game();
if (!state.job || !state.processing[benchId]) throw Error('제작과 가공을 동시에 시작할 수 없습니다');
await page.reload();
state = await game();
if (!state.job || !state.processing[benchId]) throw Error('병렬 제작·가공이 저장되지 않았습니다');
await page.locator(`[data-object="${benchId}"]`).click();
await page.screenshot({ path: 'output/progression-loop/processing.png' });
await advance(16000);
await page.locator('[data-action="collect-plank"]').click();
if ((await game()).inventory.plank !== 2) throw Error('판자 가공·수령 실패');
await page.locator('#sheet-close').click();
await node('wood1'); await node('wood2');
await page.locator(`[data-object="${benchId}"]`).click();
await page.locator('[data-action="process-plank"]').click();
await advance(16000);
await page.locator('[data-action="collect-plank"]').click();
await page.locator('#sheet-close').click();
await node('stone1');
await craft('carpentry');
state = await game();
if (Math.round((state.job.end-state.clock)/1000) !== 45) throw Error('도구 제작 시간이 틀립니다');
await advance(46000);
state = await game();
if (!state.tools.carpentry) throw Error('목공 도구 효과가 열리지 않았습니다');
await place('cushion', 130, 350);
await node('wood1'); await node('wood2');
state = await game();
if (state.inventory.wood < 6) throw Error('도구의 채집량 증가가 적용되지 않았습니다');
for (let i = 0; i < 2; i++) {
  await page.locator(`[data-object="${benchId}"]`).click();
  await page.locator('[data-action="process-plank"]').click();
  await advance(16000);
  await page.locator('[data-action="collect-plank"]').click();
  await page.locator('#sheet-close').click();
}
await node('stone1');
await craft('perch');
state = await game();
if ((state.job.end-state.clock)/1000 > 39 || (state.job.end-state.clock)/1000 < 36) throw Error('도구의 제작 시간 단축이 적용되지 않았습니다');
await advance(40000);
await place('perch', 265, 315);
state = await game();
if (state.invitation?.id !== 'kong') throw Error('판자 가구와 방석 조합으로 콩이가 방문하지 않습니다');
await page.screenshot({ path: 'output/progression-loop/invitation.png' });
await advance(60000);
if ((await game()).guest?.id !== 'kong') throw Error('콩이가 도착하지 않았습니다');
await page.locator('[data-chick="kong"]').click();
await page.locator('[data-action="greet"]').click();
state = await game();
if (!state.residents.includes('kong')) throw Error('병아리 입주 실패');
const text = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
if (!text.tools.carpentry || !text.residents.includes('kong')) throw Error('텍스트 상태와 화면 상태가 다릅니다');
if (errors.length) throw Error(`브라우저 오류: ${errors.join(' / ')}`);
console.log('채집 → 작업대 → 병렬 가공·제작 → 도구 개선 → 전망대 → 콩이 방문 확인. 브라우저 오류 0건.');
await browser.close();
