import { chromium } from 'file:///C:/Users/Soyoon%20Bang/.codex/node_modules/playwright/index.mjs';

const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
await page.goto('http://localhost:5173');
await page.evaluate(()=>localStorage.removeItem('chick-village-story-v1'));
await page.reload();

const game=()=>page.evaluate(()=>window.__chickGame.getState());
const advance=ms=>page.evaluate(ms=>window.advanceTime(ms),ms);
const node=id=>page.locator(`[data-node="${id}"]`).click();
const region=async id=>{await page.locator('#region-button').click();await page.locator(`[data-region="${id}"]`).click()};
const clickWorld=async(x,y)=>{const point=await page.evaluate(([x,y])=>{const svg=document.querySelector('svg'),p=svg.createSVGPoint();p.x=x;p.y=y;const a=p.matrixTransform(svg.getScreenCTM());return{x:a.x,y:a.y}},[x,y]);await page.mouse.click(point.x,point.y)};
const craft=async(id,ms)=>{await page.locator('[data-panel="craft"]').click();await page.locator(`[data-craft="${id}"]`).click();await advance(ms);await page.locator('#sheet-close').click()};
const place=async(id,x,y)=>{await page.locator('[data-panel="storage"]').click();await page.locator(`[data-place="${id}"]`).click();if(x!==undefined)await clickWorld(x,y);await page.locator('#place-done').click()};
const greet=async id=>{await page.locator(`[data-chick="${id}"]`).click();await page.locator('[data-action="greet"]').click()};
const request=async()=>{await page.locator('[data-action="fulfill"]').click();await page.locator('#sheet-close').click()};

// 별도 서식지 물건 없이 그네와 벤치만으로 첫 병아리가 찾아옵니다.
await node('wood1');await node('wood2');await node('stone1');
await craft('swing',61000);await place('swing',200,320);
if((await game()).invitation)throw Error('가구 한 종류만으로 방문했습니다');
await node('wood1');await node('wood2');await node('stone1');
await craft('bench',61000);await place('bench',270,250);
let s=await game();
if(s.placements.home.some(o=>['meadow','forestHome','riverHome','ridgeHome'].includes(o.kind))||s.invitation?.id!=='kong')throw Error('가구 조합 방문 실패');
await page.screenshot({path:'output/tempo-game/furniture-habitat.png'});
await node('berry1');await node('berry2');await advance(60000);
if((await game()).guest?.id!=='kong')throw Error('콩이 1분 내 방문 실패');
await greet('kong');if((await game()).stars.kong!==1)throw Error('인사 실패');
await request();s=await game();
if(s.stars.kong!==3||!s.unlocked.forest||s.coins!==5||s.inventory.feather!==2)throw Error('부탁 보상 실패');

// 숲의 전용 생산물로 가구를 만들고, 휴식 가구를 함께 놓습니다.
await region('forest');await node('herb1');await node('wood1');await node('stone1');
await craft('flower',181000);await place('flower',190,330);
if((await game()).invitation)throw Error('숲 가구 한 종류만으로 방문했습니다');
await node('wood1');await craft('cushion',31000);await place('cushion',126,364);
s=await game();if(s.invitation?.id!=='sprout')throw Error('숲 가구 조합 방문 실패');
await page.screenshot({path:'output/tempo-game/forest-furniture.png'});
await advance(60000);await node('herb1');
await greet('sprout');await request();
s=await game();if(s.stars.sprout!==3||s.coins!==7||s.inventory.feather!==3)throw Error('숲 친구 보상 실패');

// 가구 이동도 공간 조합에 반영됩니다.
await region('home');let bench=(await game()).placements.home.find(o=>o.kind==='bench');
await region('forest');await page.locator('[data-panel="storage"]').click();await page.locator(`[data-move="${bench.id}"]`).click();await clickWorld(230,380);await page.locator('#place-done').click();
if(!(await game()).placements.forest.some(o=>o.id===bench.id))throw Error('가구 지역 이동 실패');
await page.reload();s=await game();if(s.stars.sprout!==3||!s.placements.forest.some(o=>o.id===bench.id))throw Error('저장 복원 실패');

// 같은 원칙이 강변과 능선에도 적용되고, 지역 재료가 실제 가구에 쓰입니다.
await page.locator('[data-panel="friends"]').click();await page.locator('[data-friend="kong"]').click();await page.locator('[data-memory="play"]').click();
for(let i=0;i<4;i++)await page.locator('[data-action="push"]').click();
await page.locator('#sheet-close').click();
await advance(60000);s=await game();
if(s.guest?.id==='mori'){await greet('mori');await page.locator('#sheet-close').click()}
if(!(await game()).unlocked.river)throw Error('행복으로 강변이 열리지 않았습니다');
await region('home');await node('wood1');let swing=(await game()).placements.home.find(o=>o.kind==='swing');
await region('river');await node('reed1');
await craft('reedMat',421000);await place('reedMat',105,365);
if((await game()).invitation?.region==='river')throw Error('강변 가구 한 종류만으로 방문했습니다');
await page.locator('[data-panel="storage"]').click();await page.locator(`[data-move="${swing.id}"]`).click();await clickWorld(306,292);await page.locator('#place-done').click();
s=await game();
if(s.invitation?.id!=='naru'&&s.guest?.id!=='naru'){
  if(s.invitation)await advance(60000);
  s=await game();
  if(s.guest&&s.guest.id!=='naru'){await region(s.guest.region);await greet(s.guest.id);await page.locator('#sheet-close').click();await region('river')}
  await advance(1000);s=await game();
}
if(s.invitation?.id!=='naru'&&s.guest?.id!=='naru')throw Error('강변 가구 조합 방문 실패');
await page.screenshot({path:'output/tempo-game/river-furniture.png'});
await advance(60000);await node('stone1');await node('stone2');await greet('naru');await request();
s=await game();if(!s.tools.pickaxe||s.stars.naru!==3)throw Error('강변 부탁 보상 실패');
if(!s.unlocked.ridge){await region('forest');await node('hardwood1');await page.locator('[data-panel="friends"]').click();await page.locator('[data-friend="mori"]').click();await request()}
if(!(await game()).unlocked.ridge)throw Error('행복으로 능선이 열리지 않았습니다');
await region('ridge');await node('ore1');
await craft('lantern',421000);await place('lantern',120,350);
let cushion=(await game()).placements.forest.find(o=>o.kind==='cushion');
await page.locator('[data-panel="storage"]').click();await page.locator(`[data-move="${cushion.id}"]`).click();await clickWorld(210,380);await page.locator('#place-done').click();
s=await game();
if(s.invitation?.id!=='banjjak'&&s.guest?.id!=='banjjak'){
  if(s.invitation)await advance(60000);
  s=await game();
  if(s.guest&&s.guest.id!=='banjjak'){await region(s.guest.region);await greet(s.guest.id);await page.locator('#sheet-close').click();await region('ridge')}
  await advance(1000);s=await game();
}
if(s.invitation?.id!=='banjjak'&&s.guest?.id!=='banjjak')throw Error('능선 가구 조합 방문 실패');
await page.screenshot({path:'output/tempo-game/ridge-furniture.png'});

// 구버전의 별도 서식지는 제거하고 자원을 환급합니다.
const before=await game();
await page.evaluate(()=>{const key='chick-village-story-v1',s=JSON.parse(localStorage.getItem(key));s.version=2;s.placements.forest.push({id:'legacy-test',kind:'forestHome',col:0,row:0,w:2,h:2});localStorage.setItem(key,JSON.stringify(s))});
await page.reload();s=await game();
if(s.placements.forest.some(o=>o.kind==='forestHome')||s.version!==3)throw Error('기존 서식지 이전 실패');
if(s.inventory.wood!==before.inventory.wood+4||s.inventory.herb!==before.inventory.herb+2||s.inventory.feather!==before.inventory.feather+1||s.coins!==before.coins+3)throw Error('기존 서식지 환급 실패');
if(errors.length)throw Error(`브라우저 오류: ${errors.join(' / ')}`);
console.log('네 지역의 가구 조합 방문, 지역별 제작, 가구 이동, 저장 이전 확인. 브라우저 오류 0건.');
await browser.close();
