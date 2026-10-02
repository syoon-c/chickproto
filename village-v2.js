(()=>{'use strict';
const $=id=>document.getElementById(id), scene=$('scene'), sheet=$('sheet'), content=$('sheet-content');
const SAVE='chick-village-story-v1', CELL=24, REGION={home:'시작 공터',forest:'깊은 숲',river:'강변',ridge:'햇살 능선'};
const CHICK_ART='assets/unity/original/icon_chick_';
const chickArt=n=>`${CHICK_ART}${String(n).padStart(3,'0')}.png`;
const ASSET={player:chickArt(1),kong:chickArt(40),tori:chickArt(38),sprout:chickArt(3),naru:chickArt(22),bori:chickArt(20),mori:chickArt(24),sori:chickArt(23),mulgyeol:chickArt(7),banjjak:chickArt(28),dami:chickArt(17),oni:chickArt(36),gureum:chickArt(21),dali:chickArt(43),podo:chickArt(9),jami:chickArt(34),pico:chickArt(10),maru:chickArt(39),byeoli:chickArt(11)};
const BACKGROUND={home:'assets/backgrounds/home-simple.svg',forest:'assets/backgrounds/forest-simple.svg',river:'assets/backgrounds/river-simple.svg',ridge:'assets/backgrounds/ridge-simple.svg'};
const FURNITURE_ART={workbench:'assets/game/workbench.png',swing:'assets/game/garden-swing.png',farm:'assets/game/garden.png',stove:'assets/game/campfire.png',table:'assets/game/picnic-table.png',flower:'assets/game/petal-planter.svg',lantern:'assets/game/lamp.png'};
const NAMES={wood:'나무',stone:'돌',plank:'판자',berry:'산딸기',herb:'향기풀',hardwood:'단단한 나무',reed:'갈대',ore:'광석',carrot:'당근',tea:'산딸기차',soup:'당근수프',feather:'행복 깃털',coin:'기본 재화'};
const KIND={workbench:{name:'목공 작업대',feature:'craft',size:[2,2],cost:{wood:4,stone:2},time:30,rep:0,icon:'⚒',desc:'나무를 판자로 가공하고 가구와 도구를 만듭니다.'},perch:{name:'나무 전망대',feature:'play',size:[2,2],cost:{plank:4,stone:2},time:60,rep:0,icon:'♙',requiresWorkshop:true,desc:'판자로 만든 놀이 가구. 쉬는 자리와 함께 두면 콩이가 찾아옵니다.'},swing:{name:'나무 그네',feature:'play',size:[3,2],cost:{plank:4,stone:2},time:60,rep:0,icon:'♜',desc:'병아리가 타고, 함께 밀어 줄 수 있어요.'},bench:{name:'나무 벤치',feature:'rest',size:[2,1],cost:{plank:2,stone:2},time:60,rep:0,icon:'▰',desc:'한 친구가 쉬는 자리예요.'},cushion:{name:'휴식 방석',feature:'rest',size:[2,1],cost:{wood:2},time:30,rep:0,icon:'▱',desc:'작은 휴식 공간이에요.'},farm:{name:'작은 밭',feature:'farm',size:[2,2],cost:{wood:6,stone:2},time:60,rep:20,icon:'▥',desc:'당근 씨앗을 심고 수확해요.'},stove:{name:'조리대',feature:'cook',size:[2,2],cost:{wood:6,stone:4},time:60,rep:20,icon:'▣',desc:'차와 수프를 만들어요.'},table:{name:'식탁',feature:'meal',size:[3,2],cost:{wood:4,stone:2},time:60,rep:20,icon:'◒',desc:'친구 둘이 식사할 수 있어요.'},flower:{name:'꽃 화분',feature:'plant',size:[1,1],cost:{wood:2,stone:2,herb:2,feather:1,coin:3},time:180,rep:20,icon:'✿',desc:'숲의 향기풀을 심고 친구가 돌봐요.'},reedMat:{name:'갈대 돗자리',feature:'rest',size:[2,2],cost:{reed:2,wood:2,feather:2,coin:5},time:420,rep:40,icon:'▤',desc:'강변 갈대로 엮은 휴식 자리예요.'},windchime:{name:'풍경 장식',feature:'music',size:[2,2],cost:{hardwood:2,stone:2,feather:1,coin:3},time:300,rep:40,icon:'♪',desc:'바람이 불면 소리가 나요.'},lantern:{name:'등불',feature:'light',size:[1,1],cost:{wood:2,ore:1,feather:2,coin:5},time:420,rep:60,icon:'✦',desc:'밤에도 따뜻하게 빛나요.'},tub:{name:'온수 탕',feature:'hot',size:[3,3],cost:{hardwood:8,stone:10,ore:4,feather:3,coin:8},time:600,rep:120,icon:'♨',desc:'친구와 함께 쉬는 특별한 공간이에요.'},stage:{name:'축제 무대',feature:'festival',size:[3,2],cost:{wood:12,hardwood:4},time:60,rep:340,icon:'♬',desc:'친구 18명이 모이면 첫 축제를 열어요.'}};
const FACILITY_IDS=new Set(['workbench','farm','stove','tub','stage']);
const TOOLS={carpentry:{name:'목공 도구',cost:{plank:4,stone:2},rep:0,time:45,requiresWorkshop:true,desc:'나무·돌 채집량 +1, 가구 제작 시간 35% 단축'},axe:{name:'도끼',cost:{wood:2,stone:2},rep:20,time:10,desc:'숲길을 열고 단단한 나무를 채집해요.'},pickaxe:{name:'곡괭이',cost:{wood:8,stone:6},rep:60,time:20,desc:'능선길을 열고 광석을 채집해요.'}};
const LEGACY_HABITATS={meadow:{wood:4,stone:2},forestHome:{wood:4,herb:2,feather:1,coin:3},riverHome:{stone:4,reed:2,feather:2,coin:5},ridgeHome:{hardwood:4,ore:2,feather:3,coin:8}};
const HAPPINESS_THRESHOLDS=[0,3,7,12,18,25,33,42,52,63,75];
const ROSTER=[
 {id:'kong',name:'콩이',rep:0,region:'any',need:{play:1,rest:1},ask:{berry:4},hint:'놀이와 쉼터를 같은 공간에 놓아 보세요.'},
 {id:'tori',name:'토리',rep:20,region:'any',need:{cook:1,meal:1},ask:{tea:1},hint:'차를 만들고 식사 자리를 준비해 주세요.'},
 {id:'sprout',name:'새싹이',rep:40,region:'forest',need:{plant:1,rest:1},ask:{herb:2},hint:'숲에 꽃과 쉬는 자리가 필요해요.'},
 {id:'naru',name:'나루',rep:40,region:'river',need:{rest:1},ask:{stone:4},hint:'강변에 쉬는 자리를 만들어 주세요.'},
 {id:'bori',name:'보리',rep:60,region:'any',need:{farm:1,rest:1},ask:{carrot:3},hint:'밭과 쉼터가 있는 곳을 좋아해요.'},
 {id:'mori',name:'모리',rep:60,region:'forest',need:{plant:1,rest:1},ask:{hardwood:2},hint:'숲의 꽃을 돌보고 싶어 해요.'},
 {id:'sori',name:'소리',rep:60,region:'any',need:{music:1,rest:1},ask:{herb:2}},
 {id:'mulgyeol',name:'물결이',rep:80,region:'river',need:{plant:1,rest:1},ask:{berry:4}},
 {id:'banjjak',name:'반짝이',rep:80,region:'ridge',need:{light:1,rest:1},ask:{ore:2}},
 {id:'dami',name:'담이',rep:100,region:'any',need:{plant:2,rest:1},ask:{wood:6}},
 {id:'oni',name:'온이',rep:120,region:'any',need:{hot:1,rest:1},ask:{herb:2}},
 {id:'gureum',name:'구름이',rep:120,region:'any',need:{rest:2,plant:1},ask:{tea:1}},
 {id:'dali',name:'달이',rep:140,region:'any',need:{music:1,light:1,rest:1},ask:{ore:2}},
 {id:'podo',name:'포도',rep:140,region:'any',need:{meal:1,plant:1},ask:{tea:1,soup:1}},
 {id:'jami',name:'잠이',rep:180,region:'any',need:{hot:1,rest:1},ask:{},special:'riverClue'},
 {id:'pico',name:'피코',rep:180,region:'any',need:{rest:1},ask:{herb:2,tea:1},regions:3},
 {id:'maru',name:'마루',rep:200,region:'any',need:{rest:1},ask:{wood:6,stone:4},regions:4},
 {id:'byeoli',name:'별이',rep:340,region:'any',need:{music:1,light:1},ask:{tea:1},regions:4,others:17}
];
const STORY={kong:[{memory:'play',label:'같이 그네를 타 보자'},{memory:'meal',label:'처음 함께 먹는 날'}],tori:[{cost:{herb:2},label:'향긋한 차를 연구하자'},{cost:{soup:1},label:'밭에서 식탁까지'}],sprout:[{feature:'plant',count:2,label:'꽃이 둘이면 더 좋아'},{memory:'walk',label:'숲길을 같이 걷자'}],naru:[{feature:'meal',count:2,region:'river',label:'강변의 식사 자리'},{memory:'meal',label:'물가 간식'}],bori:[{cost:{soup:1},label:'따뜻한 수프 한 그릇'},{memory:'play',label:'일을 마치고 같이 놀자'}],mori:[{feature:'play',count:1,region:'forest',label:'숲속의 놀이 자리'},{memory:'walk',label:'새 길을 같이 걷자'}],jami:[{memory:'hot',label:'함께 온수에서 쉬자'},{cost:{soup:1},label:'목욕 뒤의 수프'}],sori:[{memory:'walk',label:'바람 소리를 들으며 걷자'},{cost:{tea:1},label:'노래 뒤의 차'}],mulgyeol:[{feature:'meal',count:2,region:'river',label:'강변 식사 자리'},{memory:'meal',label:'함께 먹는 날'}],banjjak:[{feature:'light',count:2,region:'ridge',label:'능선의 등불'},{memory:'walk',label:'빛을 따라 걷자'}],dami:[{feature:'rest',count:1,region:'river',label:'강변 쉼터'},{memory:'play',label:'함께 놀자'}],oni:[{memory:'hot',label:'온수에서 쉬자'},{cost:{soup:1},label:'따뜻한 수프'}],gureum:[{memory:'play',label:'함께 놀자'},{memory:'meal',label:'함께 먹자'}],dali:[{feature:'light',count:2,label:'등불 둘'},{memory:'hot',label:'온수에서 쉬자'}],podo:[{memory:'meal',label:'식탁의 추억'},{feature:'plant',count:2,label:'식물 둘'}],pico:[{memory:'walk',label:'함께 산책'},{feature:'plant',count:2,label:'정원 둘'}],maru:[{allRegions:true,label:'네 구역의 생활 공간'},{memory:'hot',label:'함께 온수에서 쉬자'}],byeoli:[{memory:'meal',label:'함께 먹자'},{memory:'play',label:'함께 놀자'}]};
const NODE_TEMPLATE={home:[['wood1','wood',50,174],['wood2','wood',64,284],['stone1','stone',320,158],['berry1','berry',48,374],['berry2','berry',318,424]],forest:[['wood1','wood',42,160],['wood2','wood',322,170],['stone1','stone',290,270],['herb1','herb',45,335],['herb2','herb',320,415],['hardwood1','hardwood',82,260],['hardwood2','hardwood',305,355]],river:[['stone1','stone',45,190],['stone2','stone',325,344],['berry1','berry',310,215],['berry2','berry',302,455],['reed1','reed',153,255],['reed2','reed',270,396]],ridge:[['ore1','ore',315,208],['ore2','ore',55,315],['hardwood1','hardwood',312,420]]};
const RESPAWN={wood:10,stone:15,berry:12,herb:20,hardwood:30,reed:20,ore:45};
const fresh=()=>({version:3,region:'home',rep:0,coins:0,inventory:{wood:2,stone:0,plank:0,berry:0,herb:0,hardwood:0,reed:0,ore:0,carrot:0,tea:0,soup:0,feather:0},stock:{},tools:{},placements:{home:[],forest:[],river:[],ridge:[]},nodes:{},processing:{},unlocked:{home:true,forest:false,river:false,ridge:false},job:null,invitation:null,guest:null,residents:[],residentHomes:{},stars:{},requests:{},memories:{},stories:{},farms:{},stoves:{},riverClue:false,festival:false,player:{x:195,y:510},clock:Date.now(),seq:0});
let state;try{state={...fresh(),...JSON.parse(localStorage.getItem(SAVE)||'null')};if(!state.inventory)state=fresh()}catch{state=fresh()}
state.clock+=Math.max(0,Math.min(7*86400000,Date.now()-(state.savedAt||Date.now())));
state.residentHomes ||= {};
state.inventory.feather ||= 0;
state.inventory.reed ||= 0;
state.inventory.plank ||= 0;
state.processing ||= {};
state.stars ||= {};
state.requests ||= {};
state.coins ||= 0;
if(state.version<2){for(const id of state.residents){state.stars[id]=Math.min(5,3+(state.stories[id]||0));state.requests[id]=true}state.version=2}
if(state.version<3){for(const [id,cost] of Object.entries(LEGACY_HABITATS)){let count=state.stock[id]||0;for(const region of Object.keys(state.placements)){const old=state.placements[region]||[];count+=old.filter(o=>o.kind===id).length;state.placements[region]=old.filter(o=>o.kind!==id)}if(state.job?.id===id){count++;state.job=null}for(const [item,amount] of Object.entries(cost)){if(item==='coin')state.coins+=amount*count;else state.inventory[item]=(state.inventory[item]||0)+amount*count}delete state.stock[id]}state.version=3;localStorage.setItem(SAVE,JSON.stringify(state))}
let panel='',placement=null,noticeTimer=0,lastTick=Date.now(),residentPositions={};
let visualPlayer={x:state.player.x,y:state.player.y};
function shoreX(x,y){const center=225+y/35;return Math.abs(x-center)<68?center+(x<center?-68:68):x}
function movePlayer(x,y){state.player={x:state.region==='river'?shoreX(x,y):x,y};save()}
if(state.region==='river'){state.player.x=shoreX(state.player.x,state.player.y);visualPlayer.x=state.player.x}
function animationClock(){return state.clock+Math.max(0,Math.min(1000,Date.now()-lastTick))}
function animatePlayer(){
 visualPlayer.x+=(state.player.x-visualPlayer.x)*.12;
 visualPlayer.y+=(state.player.y-visualPlayer.y)*.12;
 let avatar=scene.querySelector('[data-player]');
 if(avatar)avatar.setAttribute('transform',`translate(${visualPlayer.x} ${visualPlayer.y})`);
 const clock=animationClock();
 scene.querySelectorAll('[data-resident]').forEach(chick=>{
  const id=chick.dataset.resident,index=Number(chick.dataset.index),target=residentPosition(id,index,clock);
  if(state.region==='river')target.x=shoreX(target.x,target.y);
  const visual=residentPositions[id] ||= {x:target.x,y:target.y};
  visual.x+=(target.x-visual.x)*.2;
  visual.y+=(target.y-visual.y)*.2;
  chick.setAttribute('transform',`translate(${visual.x} ${visual.y})`);
 });
 if((panel==='craft'||panel==='object')&&state.job){
  const remaining=content.querySelector('[data-craft-remaining]'),recipe=content.querySelector(`[data-craft="${state.job.id}"]`),time=remainingText(Math.max(0,Math.ceil((state.job.end-animationClock())/1000)));
  if(remaining)remaining.textContent=time;
  if(recipe)recipe.textContent=time;
 }
 requestAnimationFrame(animatePlayer);
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const enough=cost=>Object.entries(cost).every(([k,v])=>(k==='coin'?state.coins:state.inventory[k]||0)>=v);
const costText=cost=>Object.entries(cost).map(([k,v])=>`${NAMES[k]||k} ${v}`).join(' · ');
const durationText=seconds=>seconds>=60?`${Math.round(seconds/60)}분`:`${seconds}초`;
const remainingText=seconds=>seconds>=60?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`:`${seconds}초`;
const spend=cost=>{if(!enough(cost))return false;for(const[k,v]of Object.entries(cost)){if(k==='coin')state.coins-=v;else state.inventory[k]-=v}return true};
const earn=cost=>{for(const[k,v]of Object.entries(cost))state.inventory[k]=(state.inventory[k]||0)+v};
const save=()=>{state.savedAt=Date.now();localStorage.setItem(SAVE,JSON.stringify(state))};
const open=(name,title,html)=>{panel=name; $('sheet-kicker').textContent=REGION[state.region];$('sheet-title').textContent=title;content.innerHTML=html;sheet.hidden=false};
const close=()=>{sheet.hidden=true;panel=''};
function tell(message){const n=$('notice');n.textContent=message;n.classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>n.classList.remove('show'),2800)}
function featureCount(region,feature){return state.placements[region].filter(o=>KIND[o.kind]?.feature===feature).reduce((n,o)=>n+(feature==='meal'?2:1),0)}
function totalStars(){return Object.values(state.stars).reduce((n,v)=>n+v,0)}
function happinessLevel(){let stars=totalStars(),level=1;for(let i=1;i<HAPPINESS_THRESHOLDS.length;i++)if(stars>=HAPPINESS_THRESHOLDS[i])level=i+1;return level}
function updateHappiness(){let before=Object.values(state.unlocked).filter(Boolean).length,level=happinessLevel();state.rep=Math.max(state.rep,totalStars()*20);if(level>=2)state.unlocked.forest=true;if(level>=3)state.unlocked.river=true;if(level>=4)state.unlocked.ridge=true;if(Object.values(state.unlocked).filter(Boolean).length>before)tell(`행복 Lv.${level}! 새로운 공터가 열렸어요.`)}
function habitatHere(region){return new Set(state.placements[region].map(o=>KIND[o.kind]?.feature).filter(f=>f&&f!=='festival')).size>=2}
function workbenchPlaced(){return Object.values(state.placements).some(list=>list.some(o=>o.kind==='workbench'))}
function craftUnlocked(id,r){const level=r.rep===0?1:r.rep<=20?2:r.rep<=40?3:r.rep<=60?4:r.rep<=120?5:7;return happinessLevel()>=level&&(!r.requiresWorkshop||workbenchPlaced())}
function scheduleVisit(){if(state.invitation||state.guest)return;for(const region of [state.region,...['forest','river','ridge','home'].filter(id=>id!==state.region)]){if(!state.unlocked[region])continue;let r=ROSTER.find(friend=>eligible(friend,region));if(!r)continue;let delay=20+(state.seq%4)*10;state.invitation={id:r.id,region,end:state.clock+delay*1000};tell(`${REGION[region]}에 새 발자국이 보여요.`);save();return}}
function eligible(r,region){if(state.residents.includes(r.id)||state.guest?.id===r.id||state.rep<r.rep||!habitatHere(region)||r.region!=='any'&&r.region!==region||r.special==='riverClue'&&!state.riverClue||r.id==='jami'&&Object.keys(REGION).reduce((n,id)=>n+featureCount(id,'meal'),0)<2||r.regions&&Object.values(state.unlocked).filter(Boolean).length<r.regions||r.others&&state.residents.length<r.others)return false;return Object.entries(r.need).every(([k,v])=>featureCount(region,k)>=v)}
function candidates(region=state.region){return ROSTER.filter(r=>eligible(r,region))}
function objective(){
 if(state.guest)return `${REGION[state.guest.region]} 입구의 손님에게 인사하기`;
 if(state.invitation)return `${REGION[state.invitation.region]}에 손님이 오는 중`;
 let pending=state.residents.find(id=>!state.requests[id]);
 if(pending)return `${ROSTER.find(r=>r.id===pending).name}의 부탁 들어주기`;
 if(!state.residents.length){
  if(!workbenchPlaced())return '작업대를 만들어 배치하기';
  if(!featureCount('home','play')&&state.inventory.plank<4&&!state.stock.perch&&!state.stock.swing){
   if(Object.values(state.processing).some(process=>process.end>state.clock))return '판자 가공 중 · 다음 재료 모으기';
   return '작업대에서 나무를 판자로 가공하기';
  }
  if(!state.tools.carpentry&&state.inventory.plank>=4)return '목공 도구로 채집과 제작 개선하기';
  if(!featureCount('home','play'))return '전망대나 그네 놓기';
  if(!featureCount('home','rest'))return '벤치나 방석 놓기';
  return '첫 친구 기다리기';
 }
 if(state.job)return `${state.job.name} 제작 중 · 다음 재료 모으기`;
 if(!state.unlocked.forest)return '친구의 부탁으로 행복 높이기';
 if(!featureCount('forest','plant'))return '숲에 꽃 화분 놓기';
 if(!habitatHere('forest'))return '숲에 다른 기능의 가구 놓기';
 if(!Object.values(state.placements).flat().some(o=>o.kind==='farm'))return '밭에서 당근 키우기';
 if(!state.unlocked.river)return '행복을 모아 강변 열기';
 if(!habitatHere('river'))return '강변에 서로 다른 가구 놓기';
 if(!state.unlocked.ridge)return '행복을 모아 능선 열기';
 if(candidates().length)return '새 발자국 살펴보기';
 return '친구와 추억 만들기';
}
function sprite(src,x,y,width,height){return `<image href="assets/game/${src}" x="${x-width/2}" y="${y-height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>`}
function nodeReady(region,id){return(state.nodes[`${region}:${id}`]||0)<=state.clock}
function nodeShape(type,x,y,ready){if(!ready)return `<ellipse cx="${x}" cy="${y}" rx="17" ry="5" fill="#5c8d54" opacity=".48"/><path d="M${x} ${y}v-12m0 8l-5-5m5 4l5-7" stroke="#a7d77d" stroke-width="3" stroke-linecap="round"/>`;
 if(type==='wood')return `${sprite('logs.png',x,y+12,62,62)}<rect x="${x-31}" y="${y-48}" width="62" height="62" fill="transparent" pointer-events="all"/>`;
 if(type==='stone'||type==='ore')return `${sprite('rocks.png',x,y+12,63,63)}${type==='ore'?`<circle cx="${x+9}" cy="${y-21}" r="7" fill="#6ce8dc" stroke="#eafff3" stroke-width="2"/><path d="M${x+9} ${y-34}v-7m-14 20h-7" stroke="#dcfff2" stroke-width="2"/>`:''}<rect x="${x-31}" y="${y-51}" width="63" height="63" fill="transparent" pointer-events="all"/>`;
 if(type==='hardwood')return `${sprite('tree.png',x,y+13,74,74)}<rect x="${x-37}" y="${y-61}" width="74" height="74" fill="transparent" pointer-events="all"/>`;
 if(type==='herb')return `${sprite('grass.png',x,y+13,64,64)}<rect x="${x-32}" y="${y-51}" width="64" height="64" fill="transparent" pointer-events="all"/>`;
 if(type==='reed')return `<path d="M${x} ${y+12}v-27m0 17l-12-14m12 8l12-15" fill="none" stroke="#5b8d69" stroke-width="4"/><ellipse cx="${x-12}" cy="${y-13}" rx="6" ry="10" fill="#c1b776"/><ellipse cx="${x+12}" cy="${y-20}" rx="6" ry="10" fill="#d8cf8c"/><rect x="${x-26}" y="${y-42}" width="52" height="56" fill="transparent" pointer-events="all"/>`;
 return `${sprite('berries.png',x,y+13,65,65)}<rect x="${x-32}" y="${y-52}" width="65" height="65" fill="transparent" pointer-events="all"/>`}
function tree(x,y,scale=1){return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 0v48" stroke="#775137" stroke-width="9"/><circle cx="-14" cy="-8" r="23" fill="#5f9a4c"/><circle cx="9" cy="-18" r="26" fill="#72ae58"/><circle cx="25" cy="2" r="20" fill="#6ea951"/><circle cx="-4" cy="-21" r="14" fill="#9ac96c" opacity=".7"/></g>`}
function objectArt(o){const x=gridX(o.col)+CELL*o.w/2,y=gridY(o.row)+CELL*o.h,kind=o.kind,k=KIND[kind],w=o.w*CELL,h=o.h*CELL;let body='';
 if(kind==='workbench')body=sprite('workbench.png',x,y+4,78,70);
 else if(kind==='perch')body=`<path d="M${x-20} ${y-8}v-45m40 45v-45" stroke="#80583b" stroke-width="7"/><path d="M${x-27} ${y-49}h54l-6 10h-42Z" fill="#d49a58" stroke="#80583b" stroke-width="3"/><path d="M${x-16} ${y-27}h32" stroke="#eec382" stroke-width="5"/><path d="M${x-9} ${y-8}v-20m18 20v-20" stroke="#bb824d" stroke-width="4"/>`;
 else if(kind==='swing')body=sprite('garden-swing.png',x,y+4,96,82);
 else if(kind==='bench')body=`<path d="M${x-21} ${y-14}v13m42-13v13" stroke="#704a32" stroke-width="5" stroke-linecap="round"/><rect x="${x-27}" y="${y-36}" width="54" height="13" rx="5" fill="#d49a5a" stroke="#825235" stroke-width="3"/><path d="M${x-23} ${y-30}h46" stroke="#f1c280" stroke-width="2"/><path d="M${x-29} ${y-19}l49-3 9 9-49 4Z" fill="#c98a4f" stroke="#7f5134" stroke-width="3" stroke-linejoin="round"/><path d="M${x-14} ${y-18}l-2 8m20-9l-2 8" stroke="#efb878" stroke-width="2"/>`;
 else if(kind==='cushion')body=`<ellipse cx="${x}" cy="${y-12}" rx="25" ry="12" fill="#a87158" opacity=".45"/><path d="M${x-26} ${y-16}q1-11 13-12h27q11 1 13 12l-6 10h-42Z" fill="#efc894" stroke="#a76f4d" stroke-width="3"/><path d="M${x-14} ${y-24}q14 9 28 0m-28 14q14-8 28 0" fill="none" stroke="#fff0c8" stroke-width="2"/>`;
 else if(kind==='farm')body=`${sprite('garden.png',x,y+7,76,76)}${state.farms[o.id]?.readyAt?`<path d="M${x-11} ${y-19}v-18m12 18v-20m12 20v-17" stroke="#7cc94e" stroke-width="4"/>`:''}`;
 else if(kind==='stove')body=sprite('campfire.png',x,y+5,72,72);
 else if(kind==='table')body=sprite('picnic-table.png',x,y+4,91,66);
 else if(kind==='reedMat')body=`<rect x="${x-w/2+3}" y="${y-h+5}" width="${w-6}" height="${h-10}" rx="5" fill="#d7bc75" stroke="#8a764d" stroke-width="3"/><path d="M${x-w/2+9} ${y-h+13}h${w-18}m-${w-18} 8h${w-18}m-${w-18} 8h${w-18}" stroke="#a78f59" stroke-width="2"/><path d="M${x-8} ${y-h+8}v${h-16}m16-${h-16}v${h-16}" stroke="#efe0a1" stroke-width="3"/>`;
 else if(kind==='tub')body=`<ellipse cx="${x}" cy="${y-18}" rx="${w/2-3}" ry="23" fill="#c08a60" stroke="#805b40" stroke-width="4"/><ellipse cx="${x}" cy="${y-26}" rx="${w/2-10}" ry="14" fill="#78c4ca"/>`;
 else if(kind==='flower')body=sprite('petal-planter.svg',x,y+3,66,66);
 else if(kind==='lantern')body=sprite('lamp.png',x,y+5,78,78);
 else body=`<rect x="${x-w/2+3}" y="${y-Math.max(25,h)}" width="${w-6}" height="${Math.max(22,h-4)}" rx="7" fill="${kind==='lantern'?'#f4cc75':'#b78255'}" stroke="#7a573a" stroke-width="3"/><text x="${x}" y="${y-13}" text-anchor="middle" font-size="23" fill="#fff5cb">${k.icon}</text>`;
 return `<g class="world-object" data-object="${o.id}"><ellipse cx="${x}" cy="${y-8}" rx="${Math.max(25,w/2+9)}" ry="${Math.max(13,h/4)}" fill="#fff6d5" opacity=".43"/><ellipse cx="${x}" cy="${y}" rx="${Math.max(13,w/2)}" ry="8" fill="#3b6940" opacity=".28"/>${body}<text x="${x}" y="${y+18}" text-anchor="middle" class="world-label">${k.name}</text><rect x="${x-w/2}" y="${y-Math.max(64,h)}" width="${w}" height="${Math.max(72,h+15)}" fill="transparent" pointer-events="all"/></g>`}
const gridX=c=>(state.region==='home'?78:54)+c*CELL,gridY=r=>(state.region==='home'?216:244)+r*CELL;
function residentPosition(id,index,clock=state.clock){const furniture=state.placements[state.region].filter(o=>['play','rest','meal','hot','farm','plant','music'].includes(KIND[o.kind].feature));const phase=clock/1000+index*5,cycle=phase%24,round=Math.floor(phase/24),base={x:100+(index%5)*45,y:505-Math.floor(index/5)*38};if(!furniture.length)return{x:base.x+Math.sin(clock/2200+index)*15,y:base.y+Math.cos(clock/3100+index)*8,use:false};let o=furniture[(round+index)%furniture.length],target={x:gridX(o.col)+o.w*CELL/2,y:gridY(o.row)+o.h*CELL-12},p;if(cycle<5){let q=cycle/5;p={x:base.x+(target.x-base.x)*q,y:base.y+(target.y-base.y)*q}}else if(cycle<15)p=target;else{let q=(cycle-15)/9;p={x:target.x+(base.x-target.x)*q,y:target.y+(base.y-target.y)*q}}return{...p,use:cycle>=5&&cycle<15}}
function residentArt(id,index,region){
 const r=ROSTER.find(v=>v.id===id),target=residentPosition(id,index,animationClock()),asset=ASSET[id]||ASSET.player;
 if(region==='river')target.x=shoreX(target.x,target.y);
 const visual=residentPositions[id] ||= {x:target.x,y:target.y};
 return `<g class="world-chick" data-chick="${id}" data-resident="${id}" data-index="${index}" transform="translate(${visual.x} ${visual.y})"><ellipse cx="0" cy="0" rx="20" ry="6" fill="#3e6640" opacity=".35"/><image href="${asset}" x="-32" y="-64" width="64" height="64"/>${target.use?'<path d="M18 -42q7-9 12 0" fill="none" stroke="#fff5bf" stroke-width="3"/>':''}<text x="0" y="18" text-anchor="middle" class="world-label">${r.name}</text><text x="0" y="31" text-anchor="middle" font-size="12" fill="#fff2a5" stroke="#6d5940" stroke-width="2" paint-order="stroke">${'★'.repeat(state.stars[id]||1)}${'☆'.repeat(5-(state.stars[id]||1))}</text></g>`;
}
function blockReason(col,row,w,h,ignore){const cols=state.region==='home'?10:12,rows=state.region==='home'?8:10;if(col<0||row<0||col+w>cols||row+h>rows)return'격자 밖이에요';
 for(const o of state.placements[state.region])if(o.id!==ignore&&col<o.col+o.w&&col+w>o.col&&row<o.row+o.h&&row+h>o.row)return'가구와 겹쳐요';
 const cx=gridX(col)+w*CELL/2,cy=gridY(row)+h*CELL/2;
 if(NODE_TEMPLATE[state.region].some(([id,type,x,y])=>Math.hypot(cx-x,cy-y)<Math.max(w,h)*12+15))return'자연물이 있는 자리예요';
 if(state.region==='river'&&Math.abs(cx-(225+cy/35))<39)return'강물이 지나가요';
 if(cy>450&&Math.abs(cx-195)<31)return'입구 길을 비워 주세요';
 return''}
function draw(){const region=state.region,home=region==='home';let world=`<image href="${BACKGROUND[region]}" x="0" y="0" width="390" height="700" preserveAspectRatio="xMidYMid slice" pointer-events="none"/>`;
 if(home)world+=`<g class="world-gate" data-gate="forest"><path d="M149 159h92" stroke="#76543b" stroke-width="11" stroke-linecap="round"/><path d="M158 159v26m74-26v26" stroke="#76543b" stroke-width="7"/><text x="195" y="150" text-anchor="middle" class="world-label">${state.unlocked.forest?'숲길':'막힌 숲길'}</text><rect x="145" y="135" width="100" height="55" fill="transparent" pointer-events="all"/></g><g class="world-gate" data-gate="river"><path d="M344 350v75" stroke="#a1744e" stroke-width="14"/><text x="338" y="342" text-anchor="middle" class="world-label">${state.unlocked.river?'강변':'낡은 다리'}</text></g>`;
 else if(region==='river')world+=`<g class="world-gate" data-gate="home"><path d="M61 599h94" stroke="#a1764f" stroke-width="13"/><text x="108" y="619" text-anchor="middle" class="world-label">공터로 돌아가기</text></g>`;
 else world+=`<g class="world-gate" data-gate="home"><path d="M145 599h100" stroke="#a1764f" stroke-width="13"/><text x="195" y="619" text-anchor="middle" class="world-label">공터로 돌아가기</text></g>`;
 if(region==='river')world+=`<g class="world-gate" data-gate="clue"><circle cx="286" cy="271" r="18" fill="${state.riverClue?'#86bcac':'#ebf8df'}"/><text x="286" y="278" text-anchor="middle" font-size="22">♫</text></g>`;
 if(region==='forest'||region==='ridge')world+=`<g class="world-gate" data-gate="${region==='forest'?'ridge':'home'}"><path d="M155 164h77" stroke="#796747" stroke-width="9"/><text x="193" y="151" text-anchor="middle" class="world-label">${region==='forest'?'능선으로 가는 바위길':'공터로 가는 길'}</text><rect x="150" y="135" width="88" height="48" fill="transparent" pointer-events="all"/></g>`;
 world+=`<g><path d="M37 540v-43m-22-2h44l-5 29H20Z" fill="#e8bc75" stroke="#765039" stroke-width="4"/><text x="37" y="515" text-anchor="middle" font-size="12" font-weight="900" fill="#5a3e28">목표</text></g><g><path d="M72 543v-30q17-23 34 0v30Z" fill="#b77a4d" stroke="#7d5236" stroke-width="3"/><ellipse cx="89" cy="531" rx="15" ry="8" fill="#ecd497"/><text x="89" y="561" class="world-label" text-anchor="middle">공동둥지</text></g>`;
 NODE_TEMPLATE[region].forEach(([id,type,x,y])=>{world+=`<g class="world-node" data-node="${id}">${nodeShape(type,x,y,nodeReady(region,id))}</g>`});
 if(placement){const cols=home?10:12,rows=home?8:10,x=gridX(0),y=gridY(0);world+=`<g class="grid"><rect x="${x}" y="${y}" width="${cols*CELL}" height="${rows*CELL}"/>`;for(let i=1;i<cols;i++)world+=`<path d="M${x+i*CELL} ${y}v${rows*CELL}"/>`;for(let i=1;i<rows;i++)world+=`<path d="M${x} ${y+i*CELL}h${cols*CELL}"/>`;world+='</g>';let bad=blockReason(placement.col,placement.row,placement.w,placement.h,placement.moveId);world+=`<rect class="${bad?'ghost-bad':'ghost-good'}" x="${gridX(placement.col)}" y="${gridY(placement.row)}" width="${placement.w*CELL}" height="${placement.h*CELL}" rx="5"/><text x="${gridX(placement.col)+placement.w*CELL/2}" y="${gridY(placement.row)-8}" text-anchor="middle" class="world-label">${KIND[placement.kind].name}</text>`}
 state.placements[region].forEach(o=>world+=objectArt(o));
 state.residents.forEach((id,i)=>{if((state.residentHomes[id]||'home')===region)world+=residentArt(id,i,region)});
 if(state.guest?.region===region){let r=ROSTER.find(v=>v.id===state.guest.id),x=region==='river'?320:275;world+=`<g class="world-chick" data-chick="${r.id}"><circle cx="${x}" cy="514" r="32" fill="#fff5c6" opacity=".7"/><image href="${ASSET[r.id]||ASSET.player}" x="${x-32}" y="466" width="64" height="64"/><text x="${x}" y="546" text-anchor="middle" class="world-label">새 손님</text></g>`}
 world+=`<g data-player transform="translate(${visualPlayer.x} ${visualPlayer.y})" pointer-events="none"><image href="${ASSET.player}" x="-30" y="-62" width="60" height="60"/><text x="0" y="16" text-anchor="middle" class="world-label">나</text></g>`;
 scene.innerHTML=`<svg class="world-svg" viewBox="0 0 390 700" preserveAspectRatio="xMidYMid meet" aria-label="${REGION[region]} 지도">${world}</svg>`;
 $('region-name').textContent=REGION[region];$('rep-count').textContent=happinessLevel();$('objective-text').textContent=objective();$('placement-controls').hidden=!placement;if(placement){$('place-name').textContent=`${KIND[placement.kind].name} 배치`;$('place-message').textContent=blockReason(placement.col,placement.row,placement.w,placement.h,placement.moveId)||'격자를 누르거나 끌어서 자리를 고르세요'}
}
function renderPanel(){if(!panel)return;({bag:showBag,reset:showResetConfirm,craft:showCraft,storage:showStorage,friends:showFriends,profile:showProfile,goals:showGoals,map:showMap,conditions:showConditions,guest:showGuest,activity:showActivity,object:showObject,tool:showTool,gate:showGate})[panel]?.()}
function showBag(){let rows=Object.entries(state.inventory).map(([k,v])=>`<div>${NAMES[k]}<b>${v}</b></div>`).join(''),level=happinessLevel(),next=HAPPINESS_THRESHOLDS[level],abilities=[state.tools.carpentry&&'채집 +1 · 제작 35% 단축',state.tools.axe&&'숲 채집',state.tools.water&&'물가 제작',state.tools.pickaxe&&'광석 채집'].filter(Boolean).join(' · ')||'아직 없음';open('bag','가방',`<div class="callout">행복 Lv.${level} · 별 ${totalStars()}개${next!==undefined?` / 다음 Lv. ${next}개`:''}<br>기본 재화 ${state.coins}개 · 얻은 능력: ${abilities}</div><div class="inventory">${rows}</div><p class="muted">재료는 10~45초마다 다시 생깁니다. 행복 깃털은 친구의 부탁 보상으로 얻습니다.</p><button class="reset-entry" data-reset-open>처음부터 다시 시작</button>`)}
function showResetConfirm(){open('reset','처음부터 다시 시작',`<div class="callout reset-warning">지금까지 모은 병아리, 가구, 재료와 지역 진행이 이 브라우저에서 지워집니다. 되돌릴 수 없습니다.</div><div class="reset-actions"><button class="secondary" data-reset-cancel>취소</button><button class="primary reset-confirm" data-reset-confirm>진행을 지우고 다시 시작</button></div>`)}
function recipeRow(id,r){const locked=!craftUnlocked(id,r)||id==='stage'&&(state.residents.length<18||Object.values(state.unlocked).some(v=>!v));let time=state.job?.id===id?Math.max(0,Math.ceil((state.job.end-state.clock)/1000)):null;let available=enough(r.cost),stock=state.stock[id]||0,icon=FURNITURE_ART[id]?`<img src="${FURNITURE_ART[id]}" alt="">`:`<span class="symbol">${r.icon||'⚒'}</span>`;return `<div class="row">${icon}<div class="copy"><b>${r.name}${stock?` · 보관 ${stock}`:''}</b><small>${locked?r.requiresWorkshop&&!workbenchPlaced()?'작업대를 놓으면 열림':`행복 Lv.${r.rep<=20?2:r.rep<=40?3:r.rep<=60?4:r.rep<=120?5:7}에 열림`:r.desc}</small><small>${costText(r.cost)} · ${durationText(state.tools.carpentry?Math.ceil(r.time*.65):r.time)}</small></div><button data-craft="${id}" ${locked||!available||state.job?'disabled':''}>${time!==null?remainingText(time):locked?'잠김':'만들기'}</button></div>`}
function showCraft(){let facilities=Object.entries(KIND).filter(([id,r])=>FACILITY_IDS.has(id)&&craftUnlocked(id,r)).map(([id,r])=>recipeRow(id,r)).join('');open('craft','시설 만들기',`${state.job?`<div class="callout">${state.job.name} 제작 중 · <b data-craft-remaining>${remainingText(Math.max(0,Math.ceil((state.job.end-state.clock)/1000)))}</b></div>`:'<div class="craft-chain">시설을 만들고 배치한 뒤, 지도에서 눌러 사용하세요</div>'}<div class="section-title">생산·생활 시설</div><div class="rows">${facilities}</div><p class="muted">나무 벤치·그네와 도구는 설치한 목공 작업대에서 만듭니다.</p>`)}
function showJobPanel(){if(!state.job){showGoals();return}if(!state.job.stationId){showCraft();return}let entry=Object.entries(state.placements).find(([,list])=>list.some(o=>o.id===state.job.stationId));if(!entry){showCraft();return}if(state.region!==entry[0])switchRegion(entry[0]);window._selectedObject=state.job.stationId;showObject()}
function workbenchMenu(o){let process=state.processing[o.id],products=Object.entries(KIND).filter(([id,r])=>!FACILITY_IDS.has(id)&&craftUnlocked(id,r)).map(([id,r])=>recipeRow(id,r)).join(''),tool=TOOLS.carpentry,toolRow=`<div class="row"><span class="symbol">⚒</span><div class="copy"><b>${tool.name}</b><small>${tool.desc}</small><small>${costText(tool.cost)} · ${durationText(tool.time)}</small></div><button data-craft="carpentry" ${state.tools.carpentry||state.job||!enough(tool.cost)?'disabled':''}>${state.tools.carpentry?'완성':'만들기'}</button></div>`;return `${state.job?`<div class="callout">${state.job.name} 제작 중 · <b data-craft-remaining>${remainingText(Math.max(0,Math.ceil((state.job.end-state.clock)/1000)))}</b></div>`:''}<div class="section-title">나무 가공</div><div class="callout">나무 2개 → 판자 2개 · 15초</div><button class="primary" data-action="process-plank" ${process||!enough({wood:2})?'disabled':''}>판자 가공 시작 · 나무 2개</button>${process?`<button class="primary" data-action="collect-plank" ${process.end<=state.clock?'':'disabled'}>${process.end<=state.clock?'판자 2개 받기':`가공 중 · ${remainingText(Math.ceil((process.end-state.clock)/1000))}`}</button>`:''}<div class="section-title">가구 제작</div><div class="rows">${products}</div><div class="section-title">도구 개선</div>${toolRow}`}
function showStorage(){const icon=id=>FURNITURE_ART[id]?`<img src="${FURNITURE_ART[id]}" alt="">`:`<span class="symbol">${KIND[id].icon}</span>`;let rows=Object.entries(state.stock).filter(([,n])=>n>0).map(([id,n])=>`<div class="row">${icon(id)}<div class="copy"><b>${KIND[id].name}</b><small>보관 ${n}개 · ${KIND[id].desc}</small></div><button data-place="${id}">배치</button></div>`).join('');let placed=Object.entries(state.placements).flatMap(([reg,list])=>list.map(o=>`<div class="row">${icon(o.kind)}<div class="copy"><b>${KIND[o.kind].name}</b><small>${REGION[reg]}에 설치됨</small></div><button data-move="${o.id}">${reg===state.region?'옮기기':'이곳에 놓기'}</button></div>`)).join('');open('storage','보관함',`<p class="muted">현재 지역의 격자에 배치합니다. 다른 지역에 놓인 가구도 가져올 수 있습니다.</p><div class="rows">${rows||'<div class="callout">아직 보관한 가구가 없어요. 만들기에서 시작해 보세요.</div>'}</div><div class="section-title">설치한 가구</div><div class="rows">${placed||'<p class="muted">아직 설치한 가구가 없어요.</p>'}</div>`)}
function showFriends(){let residents=state.residents.map(id=>{const r=ROSTER.find(v=>v.id===id);return `<div class="row"><img src="${ASSET[id]||ASSET.player}" alt=""><div class="copy"><b>${r.name}</b><small>${REGION[state.residentHomes[id]||'home']} · ${'★'.repeat(state.stars[id]||1)}${'☆'.repeat(5-(state.stars[id]||1))}</small></div><button data-friend="${id}">만나기</button></div>`}).join('');open('friends','친구',`<div class="rows">${residents||'<div class="callout">서로 다른 기능의 가구를 같은 공터에 놓으면 친구가 찾아옵니다.</div>'}</div><div class="section-title">방문 소식</div><button class="primary" data-action="conditions">새 친구의 조건 보기</button>${state.invitation?`<p class="muted">${Math.max(0,Math.ceil((state.invitation.end-state.clock)/1000))}초 안에 마을 입구로 손님이 옵니다.</p>`:''}`)}
function storyReady(id,q){if(!q)return false;if(q.memory)return!!state.memories[id]?.[q.memory];if(q.cost)return enough(q.cost);if(q.feature)return(q.region?featureCount(q.region,q.feature):Math.max(...Object.keys(REGION).map(region=>featureCount(region,q.feature))))>=q.count;if(q.allRegions)return Object.keys(REGION).every(region=>state.placements[region].some(o=>KIND[o.kind]?.feature));return false}
function claimStory(id){const step=state.stories[id]||0,q=STORY[id]?.[step];if(!state.requests[id]||!storyReady(id,q))return false;if(q.cost&&!spend(q.cost))return false;state.stories[id]=step+1;state.stars[id]=Math.min(5,(state.stars[id]||1)+1);state.coins+=2;updateHappiness();tell(`${ROSTER.find(r=>r.id===id).name}의 행복 ★${state.stars[id]} · 재화 +2`);save();return true}
function recordMemory(id,kind){if(!id)return;state.memories[id] ||= {};let first=!state.memories[id][kind];state.memories[id][kind]=true;let q=STORY[id]?.[state.stories[id]||0],story=q?.memory===kind&&claimStory(id);if(!story)tell(first?'새로운 추억을 기록했어요.':'다시 함께해서 즐거웠어요.');save();draw()}
function showProfile(){let id=window._selectedFriend,r=ROSTER.find(v=>v.id===id);if(!r)return showFriends();let step=state.stories[id]||0,q=STORY[id]?.[step],ready=storyReady(id,q),atHome=state.residentHomes[id]||'home',canPlay=featureCount(atHome,'play')>0,canMeal=featureCount(atHome,'meal')>0&&(state.inventory.tea+state.inventory.soup)>0,canHot=featureCount(atHome,'hot')>0;let detail=q?.cost?costText(q.cost):q?.memory?({play:'함께 놀기',meal:'함께 먹기',walk:'함께 산책',hot:'온수에서 쉬기'}[q.memory]+' 첫 기록'):q?.feature?`${q.region?REGION[q.region]:'한 지역'} · 시설 ${q.count}개`:q?.allRegions?'네 지역에 생활 시설 하나씩':'완료';let request=!state.requests[id]?`<div class="section-title">${r.name}의 첫 부탁</div><div class="callout">${Object.keys(r.ask).length?costText(r.ask):'서식지를 함께 둘러보기'} · 완료하면 행복 ★2, 재화와 능력을 얻습니다.</div><button class="primary" data-action="fulfill" ${enough(r.ask)?'':'disabled'}>부탁 들어주기</button>`:'';open('profile',r.name,`<div class="friend-hero"><img src="${ASSET[id]||ASSET.player}" alt=""><div><b>${r.name}</b><small>${REGION[atHome]} · ${'★'.repeat(state.stars[id]||1)}${'☆'.repeat(5-(state.stars[id]||1))}</small></div></div>${request}${state.requests[id]?`<div class="section-title">${q?`${step+2}장 · ${q.label}`:'이야기를 모두 나누었어요'}</div>${q?`<div class="callout">${detail}</div><button class="primary" data-story="${id}" ${ready?'':'disabled'}>이야기 완료 · 행복 ★1</button>`:''}`:''}<div class="section-title">함께하기</div><div class="activity-buttons"><button class="secondary" data-memory="play" ${canPlay?'':'disabled'}>놀기</button><button class="secondary" data-memory="walk">산책</button><button class="secondary" data-memory="meal" ${canMeal?'':'disabled'}>식사</button><button class="secondary" data-memory="hot" ${canHot?'':'disabled'}>온수</button></div>`)}
function showConditions(){let ready=candidates();let rows=ROSTER.filter(r=>!state.residents.includes(r.id)).filter(r=>r.rep<=state.rep+20).sort((a,b)=>Number(ready.includes(b))-Number(ready.includes(a))).slice(0,6).map(r=>{let region=r.region==='any'?state.region:r.region,missing=[!habitatHere(region)?'서로 다른 기능의 가구 2종':'',...Object.entries(r.need).filter(([k,v])=>featureCount(region,k)<v).map(([k,v])=>({play:'놀이',rest:'휴식',cook:'조리대',meal:'식사 자리',plant:'식물',farm:'밭',music:'음악',light:'조명',hot:'온수'}[k]||k)+` ${v}`)].filter(Boolean).join(' · ');let readyHere=ready.includes(r);return `<div class="row"><span class="symbol">${readyHere?'?':'·'}</span><div class="copy"><b>${readyHere?'새 발자국':r.name}</b><small>${r.region==='any'?'현재 지역':REGION[r.region]} · ${missing||'1분 안에 입구로 방문 예정'}</small></div></div>`}).join('');open('conditions','새 친구의 조건',`<p class="muted">같은 공터의 가구 조합이 방문 조건을 만족하면 손님이 찾아옵니다.</p><div class="rows">${rows||'<div class="callout">지금은 새로운 발자국이 보이지 않아요.</div>'}</div>`)}
function showGuest(){let r=ROSTER.find(v=>v.id===state.guest?.id);if(!r){showFriends();return}open('guest',`${r.name}가 찾아왔어요`, `<div class="friend-hero"><img src="${ASSET[r.id]||ASSET.player}" alt=""><div><b>${r.name}</b><small>입구에서 마을을 바라보고 있어요.</small></div></div><button class="primary" data-action="greet">인사하고 마을에 들이기</button><p class="muted">친구가 된 뒤 부탁을 들어주면 행복 별과 보상을 얻습니다.</p>`)}
function showMap(){open('map','전체 지도',`<p class="muted">친구의 행복 별을 모으면 새 공터가 열립니다. 각 공터에는 다른 재료가 있습니다.</p><div class="map-cards">${Object.entries(REGION).map(([id,name])=>`<button class="map-card ${state.unlocked[id]?'':'locked'}" data-region="${id}" ${state.unlocked[id]?'':'disabled'}><strong>${name}</strong><small>${state.unlocked[id]?`${state.guest?.region===id?'새 손님 대기 · ':''}${state.placements[id].length}개 시설 · ${NODE_TEMPLATE[id].length}곳 생산`:`행복 Lv.${id==='forest'?2:id==='river'?3:4}에 열림`}</small></button>`).join('')}</div>`)}
function showGoals(){let steps=[['작업대에서 놀이·휴식 가구 만들기',featureCount('home','play')&&featureCount('home','rest')],['콩이에게 인사하고 부탁 들어주기',state.requests.kong],['행복 Lv.2로 숲 열기',state.unlocked.forest],['숲에 꽃과 쉴 자리 놓기',featureCount('forest','plant')&&featureCount('forest','rest')],['밭에서 당근 수확하기',state.inventory.carrot>0],['토리의 부탁으로 행복 모으기',state.requests.tori],['강변과 능선 열기',state.unlocked.river&&state.unlocked.ridge],['친구 18명과 첫 축제',state.festival]];open('goals','마을의 목표',`<p class="muted">행복 별 ${totalStars()}개 · Lv.${happinessLevel()}. 친구 부탁과 이야기로 별을 모읍니다.</p><ol class="timeline">${steps.map(([t,ok])=>`<li>${ok?'✓ ':'○ '}${t}</li>`).join('')}</ol><div class="callout">${objective()}</div>`)}
function showActivity(){const r=ROSTER.find(v=>v.id===window._selectedFriend);if(!r){showFriends();return}let step=window._activityStep||0,kind=window._activityKind||'play',verb=kind==='walk'?'발맞춰 걷기':'그네 밀어주기';open('activity',`${r.name}와 함께`, `<div class="friend-hero"><img src="${ASSET[r.id]||ASSET.player}" alt=""><div><b>${r.name}</b><small>${kind==='walk'?'마을을 함께 걸어 보세요.':'그네를 함께 타 보세요.'}</small></div></div><p class="muted">${verb}를 세 번 해 주세요.</p><div class="progress"><i style="width:${step/3*100}%"></i></div><button class="primary" data-action="push">${step>=3?'추억 기록하기':`${verb} ${step}/3`}</button>`)}
function showObject(){
 let o=Object.values(state.placements).flat().find(x=>x.id===window._selectedObject);if(!o)return;
 let k=KIND[o.kind],html=`<p class="muted">${k.desc}</p>`;
 if(o.kind==='workbench')html+=workbenchMenu(o);
 else if(o.kind==='farm'){let crop=state.farms[o.id];html+=`<button class="primary" data-action="farm" ${crop&&crop.readyAt>state.clock?'disabled':''}>${!crop?'당근 심기':crop.readyAt<=state.clock?'당근 수확하기':`자라는 중 · ${Math.ceil((crop.readyAt-state.clock)/60000)}분`}</button>`}
 else if(o.kind==='stove'){let cook=state.stoves[o.id];html+=`<div class="activity-buttons"><button class="primary" data-cook="tea" ${!cook&&enough({berry:2})?'':'disabled'}>차 만들기</button><button class="primary" data-cook="soup" ${!cook&&enough({carrot:3})?'':'disabled'}>수프 만들기</button></div>${cook?`<button class="primary" data-action="collect-cook" ${cook.readyAt<=state.clock?'':'disabled'}>${cook.readyAt<=state.clock?'완성한 음식 받기':'조리 중'}</button>`:''}`}
 else if((o.kind==='swing'||o.kind==='perch')&&state.residents.length)html+=`<button class="primary" data-action="start-play">친구와 함께 놀기</button>`;
 else if(o.kind==='table'&&state.residents.length)html+=`<button class="primary" data-action="share-meal" ${state.inventory.soup+state.inventory.tea?'':'disabled'}>함께 먹기</button>`;
 else if(o.kind==='tub'&&state.residents.length)html+=`<button class="primary" data-action="rest-tub">함께 쉬기</button>`;
 else if(o.kind==='stage')html+=`<button class="primary" data-action="festival" ${state.residents.length===18&&Object.values(state.unlocked).every(Boolean)?'':'disabled'}>${state.festival?'축제 다시 보기':'첫 축제 열기'}</button>`;
 open('object',k.name,html);
}
function showTool(){let id=window._selectedTool,r=TOOLS[id];open('tool',r.name,`<p class="muted">${r.desc}</p><div class="chips">${Object.entries(r.cost).map(([k,v])=>`<span class="chip ${(state.inventory[k]||0)<v?'missing':''}">${NAMES[k]} ${state.inventory[k]||0}/${v}</span>`).join('')}</div><button class="primary" data-craft="${id}" ${state.rep>=r.rep&&enough(r.cost)&&!state.job?'':'disabled'}>도구 만들기</button>`)}
function showGate(){let id=window._selectedGate;if(id==='clue'){state.riverClue=true;save();open('gate','물소리 단서',`<div class="callout">강가의 소리를 기억했어요. 새로운 친구의 단서가 됩니다.</div>`);return}if(id==='home'){switchRegion('home');return}if(state.unlocked[id]){switchRegion(id);return}let level=id==='forest'?2:id==='river'?3:4;open('gate','새 공터',`<div class="callout">행복 Lv.${level}에 열립니다. 지금 Lv.${happinessLevel()} · 별 ${totalStars()}개</div><p class="muted">친구의 부탁과 이야기를 완료해 행복 별을 모아 보세요.</p>`)}
function beginPlacement(kind,moveId,sourceRegion){close();let k=KIND[kind];placement={kind,col:0,row:0,w:k.size[0],h:k.size[1],rotated:false,moveId:moveId||null,sourceRegion:sourceRegion||state.region};draw()}
function switchRegion(id){if(!state.unlocked[id])return;state.region=id;state.player={x:id==='river'?115:195,y:510};visualPlayer={...state.player};residentPositions={};close();save();draw()}
function tick(delta){let previousClock=state.clock;state.clock+=delta;let changed=false;if(state.job&&state.clock>=state.job.end){let j=state.job;state.job=null;if(TOOLS[j.id])state.tools[j.id]=true;else state.stock[j.id]=(state.stock[j.id]||0)+1;tell(`${j.name} 완성! ${TOOLS[j.id]?'숲길을 살펴보세요.':'보관함에서 배치하세요.'}`);changed=true}
 if(state.invitation&&state.clock>=state.invitation.end){let invitation=state.invitation;state.invitation=null;if(eligible(ROSTER.find(r=>r.id===invitation.id),invitation.region)){state.guest={id:invitation.id,region:invitation.region};tell('입구에 새 손님이 찾아왔어요.')}changed=true}
 if(!state.invitation&&!state.guest)scheduleVisit();
 if(changed){save();renderPanel()}else if(panel==='object'){const id=window._selectedObject,crop=state.farms[id],cook=state.stoves[id],process=state.processing[id];if(crop?.readyAt>previousClock&&crop.readyAt<=state.clock||cook?.readyAt>previousClock&&cook.readyAt<=state.clock||process?.end>previousClock&&process.end<=state.clock)showObject()}draw()}
function advance(ms){tick(ms);save()}
function handleAction(action){if(action==='wait10'){advance(10000);showBag()}else if(action==='conditions')showConditions();else if(action==='settle'){let r=ROSTER.find(v=>v.id===state.guest?.id);if(!r||!spend(r.ask))return;tell(`${r.name}가 마을 친구가 되었어요! 평판 +20`);state.residents.push(r.id);state.residentHomes[r.id]=state.guest.region;state.memories[r.id]={};state.rep+=20;state.guest=null;close();save();draw()}else if(action==='farm'){let o=Object.values(state.placements).flat().find(x=>x.id===window._selectedObject);let crop=state.farms[o.id];if(!crop){state.farms[o.id]={readyAt:state.clock+8*60000};tell('당근 씨앗을 심었어요.')}else if(crop.readyAt<=state.clock){delete state.farms[o.id];earn({carrot:3});tell('당근 3개를 수확했어요.')}save();showObject();draw()}else if(action==='collect-cook'){let o=Object.values(state.placements).flat().find(x=>x.id===window._selectedObject),cook=state.stoves[o.id];if(cook?.readyAt<=state.clock){earn({[cook.kind]:1});delete state.stoves[o.id];tell(`${NAMES[cook.kind]} 완성!`);save();showObject()}}else if(action==='start-play'){window._selectedFriend=state.residents[0];window._activityStep=0;showActivity()}else if(action==='push'){if((window._activityStep||0)<3){window._activityStep++;showActivity();return}let id=window._selectedFriend;if(!state.memories[id]?.play){state.memories[id].play=true;state.rep+=10;tell('첫 놀이 추억! 평판 +10')}else tell('함께 놀아서 즐거웠어요.');window._activityStep=0;save();close();draw()}else if(action==='share-meal'||action==='rest-tub'){let kind=action==='share-meal'?'meal':'hot',id=state.residents[0];if(kind==='meal'){let food=state.inventory.soup?'soup':'tea';if(!state.inventory[food])return;state.inventory[food]--}if(!state.memories[id][kind]){state.memories[id][kind]=true;state.rep+=10;tell('새 추억을 기록했어요. 평판 +10')}else tell('친구와 즐거운 시간을 보냈어요.');save();close();draw()}else if(action==='festival'){if(state.residents.length<18||Object.values(state.unlocked).some(v=>!v))return;if(!state.festival){state.festival=true;tell('삐약마을의 첫 축제가 열렸어요!')}else tell('친구들이 다시 무대에 모였어요.');save();close();draw()}}
const baseHandleAction=handleAction;
handleAction=action=>{if(action==='greet'){let guest=state.guest;if(!guest||guest.region!==state.region)return;state.residents.push(guest.id);state.residentHomes[guest.id]=guest.region;state.stars[guest.id]=1;state.requests[guest.id]=false;state.memories[guest.id]={};state.guest=null;window._selectedFriend=guest.id;updateHappiness();tell(`${ROSTER.find(r=>r.id===guest.id).name}가 마을에 들어왔어요. ★1`);save();showProfile();draw();return}if(action==='fulfill'){let id=window._selectedFriend,r=ROSTER.find(v=>v.id===id);if(!r||state.requests[id]||!spend(r.ask))return;state.requests[id]=true;state.stars[id]=Math.min(5,(state.stars[id]||1)+2);state.coins+=5;state.inventory.feather+=2;if(id==='kong')state.tools.axe=true;if(id==='tori')state.tools.water=true;if(id==='naru')state.tools.pickaxe=true;updateHappiness();tell(`${r.name}의 행복 ★${state.stars[id]} · 재화 +5 · 깃털 +2`);save();showProfile();draw();return}if(action==='farm'){let o=Object.values(state.placements).flat().find(x=>x.id===window._selectedObject);if(!o)return;let crop=state.farms[o.id];if(!crop){state.farms[o.id]={readyAt:state.clock+45000};tell('당근 씨앗을 심었어요. 45초 뒤 수확할 수 있어요.')}else if(crop.readyAt<=state.clock){delete state.farms[o.id];earn({carrot:3});tell('당근 3개를 수확했어요.')}save();showObject();draw();return}if(action==='start-play'){window._selectedFriend=state.residents.find(id=>(state.residentHomes[id]||'home')===state.region)||state.residents[0];window._activityStep=0;window._activityKind='play';showActivity();return}if(action==='push'){if((window._activityStep||0)<3){window._activityStep++;showActivity();return}recordMemory(window._selectedFriend,window._activityKind||'play');window._activityStep=0;showProfile();return}if(action==='share-meal'||action==='rest-tub'){let id=panel==='object'?(state.residents.find(id=>(state.residentHomes[id]||'home')===state.region)||state.residents[0]):window._selectedFriend,kind=action==='share-meal'?'meal':'hot';if(kind==='meal'){let food=state.inventory.soup?'soup':'tea';if(!state.inventory[food])return;state.inventory[food]--}window._selectedFriend=id;recordMemory(id,kind);showProfile();return}baseHandleAction(action)};
content.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.friend){e.stopImmediatePropagation();window._selectedFriend=b.dataset.friend;showProfile()}else if(b.dataset.story){e.stopImmediatePropagation();claimStory(b.dataset.story);showProfile();draw()}else if(b.dataset.memory){e.stopImmediatePropagation();const kind=b.dataset.memory,id=window._selectedFriend;if(kind==='play'||kind==='walk'){window._activityKind=kind;window._activityStep=0;showActivity()}else if(kind==='meal'){handleAction('share-meal')}else if(kind==='hot'){handleAction('rest-tub')}}},true);
content.addEventListener('click',e=>{const b=e.target.closest('[data-reset-open],[data-reset-cancel],[data-reset-confirm]');if(!b)return;e.stopImmediatePropagation();if(b.hasAttribute('data-reset-open'))showResetConfirm();else if(b.hasAttribute('data-reset-cancel'))showBag();else{state=fresh();save();window.location.reload()}},true);
content.addEventListener('click',e=>{let b=e.target.closest('[data-action="process-plank"],[data-action="collect-plank"]');if(!b)return;e.stopImmediatePropagation();let o=state.placements[state.region].find(x=>x.id===window._selectedObject&&x.kind==='workbench');if(!o)return;let process=state.processing[o.id];if(b.dataset.action==='process-plank'){if(process||!spend({wood:2}))return;state.processing[o.id]={end:state.clock+15000};tell('판자를 깎는 중이에요. 다른 제작도 함께 진행할 수 있어요.')}else{if(!process||process.end>state.clock)return;delete state.processing[o.id];earn({plank:2});tell('판자 2개를 받았어요. 새 가구나 도구를 만들 수 있어요.')}save();showObject();draw()},true);
content.addEventListener('click',e=>{let b=e.target.closest('[data-craft]');if(!b)return;e.stopImmediatePropagation();let id=b.dataset.craft,r=KIND[id]||TOOLS[id],station=state.placements[state.region].find(o=>o.id===window._selectedObject&&o.kind==='workbench'),atWorkbench=panel==='object'&&!!station;if(!r||state.job||TOOLS[id]&&state.tools[id]||!craftUnlocked(id,r)||FACILITY_IDS.has(id)!==(panel==='craft')||!FACILITY_IDS.has(id)&&!atWorkbench||!spend(r.cost))return;state.job={id,name:r.name,end:state.clock+Math.ceil(r.time*(state.tools.carpentry?.65:1))*1000,stationId:atWorkbench?station.id:null};tell(`${r.name} 제작을 시작했어요.`);save();atWorkbench?showObject():showCraft()},true);
content.addEventListener('click',e=>{let b=e.target.closest('[data-cook]');if(!b)return;e.stopImmediatePropagation();let o=Object.values(state.placements).flat().find(x=>x.id===window._selectedObject),kind=b.dataset.cook,cost=kind==='tea'?{berry:2}:{carrot:3};if(!o||state.stoves[o.id]||!spend(cost))return;state.stoves[o.id]={kind,readyAt:state.clock+20000};tell('조리 중이에요. 20초 뒤 받을 수 있어요.');save();showObject()},true);
content.addEventListener('click',e=>{let t=e.target.closest('button');if(!t)return;let d=t.dataset;if(d.action){handleAction(d.action);return}if(d.craft){let r=KIND[d.craft]||TOOLS[d.craft];if(state.job||state.rep<r.rep||!spend(r.cost))return;state.job={id:d.craft,name:r.name,end:state.clock+r.time*1000};tell(`${r.name} 제작을 시작했어요.`);save();showCraft();return}if(d.place){if((state.stock[d.place]||0)>0)beginPlacement(d.place);return}if(d.move){let entry=Object.entries(state.placements).find(([,a])=>a.some(o=>o.id===d.move));if(!entry)return;let o=entry[1].find(o=>o.id===d.move);beginPlacement(o.kind,o.id,entry[0]);if(entry[0]===state.region){placement.col=o.col;placement.row=o.row;placement.w=o.w;placement.h=o.h}draw();return}if(d.invite){let r=ROSTER.find(v=>v.id===d.invite);if(!eligible(r,state.region)||state.invitation||state.guest)return;state.invitation={id:r.id,region:state.region,end:state.clock+20000};tell('초대장을 남겼어요. 주변을 둘러보세요.');save();close();draw();return}if(d.region){switchRegion(d.region);return}if(d.cook){let o=Object.values(state.placements).flat().find(x=>x.id===window._selectedObject),cost=d.cook==='tea'?{berry:2}:{carrot:3};if(state.stoves[o.id]||!spend(cost))return;state.stoves[o.id]={kind:d.cook,readyAt:state.clock+30000};tell('조리를 시작했어요.');save();showObject();return}if(d.unlock){let id=d.unlock;if(id==='forest'&&state.rep>=20&&state.tools.axe||id==='ridge'&&state.rep>=60&&state.tools.pickaxe||id==='river'&&state.rep>=40&&spend({wood:6,stone:4})){state.unlocked[id]=true;tell(`${REGION[id]} 길이 열렸어요!`);save();switchRegion(id)}return}});
scene.addEventListener('pointerdown',e=>{if(!placement)return;scene.setPointerCapture(e.pointerId);selectPoint(e)});scene.addEventListener('pointermove',e=>{if(placement&&e.buttons)selectPoint(e)});scene.addEventListener('pointerup',e=>{if(placement)return;let target=e.target.closest('[data-node],[data-object],[data-chick],[data-gate]');if(target){let d=target.dataset;if(d.node){let node=NODE_TEMPLATE[state.region].find(x=>x[0]===d.node);if(!nodeReady(state.region,d.node)){tell('아직 자라는 중이에요.');return}let kind=node[1];if(kind==='hardwood'&&!state.tools.axe||kind==='ore'&&!state.tools.pickaxe){tell('도구가 필요해요.');return}state.nodes[`${state.region}:${d.node}`]=state.clock+RESPAWN[kind]*1000;earn({[kind]:kind==='herb'?2:kind==='berry'?2:state.tools.axe&&['wood','hardwood'].includes(kind)||state.tools.pickaxe&&['stone','ore'].includes(kind)?3:2});movePlayer(Math.max(34,Math.min(355,node[2]+30)),Math.max(110,Math.min(565,node[3]+30)));tell(`${NAMES[kind]}를 모았어요.`);draw();return}if(d.object){window._selectedObject=d.object;showObject();return}if(d.chick){if(state.guest?.id===d.chick)showGuest();else{window._selectedFriend=d.chick;showProfile()}return}if(d.gate){window._selectedGate=d.gate;showGate();return}}const p=svgPoint(e);movePlayer(Math.max(25,Math.min(365,p.x)),Math.max(140,Math.min(575,p.y)));draw()});
function svgPoint(e){let svg=scene.querySelector('svg'),pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;return pt.matrixTransform(svg.getScreenCTM().inverse())}
scene.addEventListener('pointerup',e=>{let chick=e.target.closest('[data-chick]');if(placement||!chick||state.guest?.id===chick.dataset.chick)return;e.stopImmediatePropagation();window._selectedFriend=chick.dataset.chick;showProfile()},true);
scene.addEventListener('pointerup',e=>{if(placement||!state.tools.carpentry)return;let target=e.target.closest('[data-node]');if(!target)return;let node=NODE_TEMPLATE[state.region].find(item=>item[0]===target.dataset.node);if(!node||!nodeReady(state.region,node[0])||!['wood','stone','hardwood','ore'].includes(node[1]))return;if(node[1]==='hardwood'&&!state.tools.axe||node[1]==='ore'&&!state.tools.pickaxe)return;earn({[node[1]]:1});save()},true);
function selectPoint(e){let p=svgPoint(e);placement.col=Math.max(0,Math.min((state.region==='home'?10:12)-placement.w,Math.round((p.x-gridX(0)-placement.w*CELL/2)/CELL)));placement.row=Math.max(0,Math.min((state.region==='home'?8:10)-placement.h,Math.round((p.y-gridY(0)-placement.h*CELL/2)/CELL)));draw()}
document.querySelectorAll('.dock [data-panel]').forEach(b=>b.addEventListener('click',()=>{if(placement){tell('배치를 완료하거나 취소해 주세요.');return}({bag:showBag,craft:showCraft,storage:showStorage,friends:showFriends,goals:showGoals})[b.dataset.panel]()}));$('region-button').onclick=showMap;$('map-button').onclick=showMap;$('objective-button').onclick=showJobPanel;$('sheet-close').onclick=close;$('sheet-backdrop').onclick=close;
$('rotate-button').onclick=()=>{if(!placement)return;[placement.w,placement.h]=[placement.h,placement.w];placement.rotated=!placement.rotated;draw()};$('place-cancel').onclick=()=>{placement=null;draw()};$('place-done').onclick=()=>{if(!placement)return;let bad=blockReason(placement.col,placement.row,placement.w,placement.h,placement.moveId);if(bad){tell(bad);return}if(placement.moveId){let source=state.placements[placement.sourceRegion],index=source.findIndex(x=>x.id===placement.moveId),o=source[index];if(!o)return;source.splice(index,1);Object.assign(o,{col:placement.col,row:placement.row,w:placement.w,h:placement.h});state.placements[state.region].push(o)}else{if((state.stock[placement.kind]||0)<1)return;state.stock[placement.kind]--;state.placements[state.region].push({id:`p${++state.seq}`,kind:placement.kind,col:placement.col,row:placement.row,w:placement.w,h:placement.h})}tell(`${KIND[placement.kind].name}을 놓았어요.`);placement=null;save();scheduleVisit();draw()};
window.render_game_to_text=()=>JSON.stringify({coordinates:'SVG 390×700, origin top-left',region:state.region,player:state.player,visibleResidents:state.residents.filter(id=>(state.residentHomes[id]||'home')===state.region).map(id=>({id,x:Math.round(residentPositions[id]?.x||0),y:Math.round(residentPositions[id]?.y||0)})),happinessLevel:happinessLevel(),stars:state.stars,totalStars:totalStars(),coins:state.coins,inventory:state.inventory,stock:state.stock,tools:state.tools,processing:state.processing,placements:state.placements,unlocked:state.unlocked,job:state.job,invitation:state.invitation,guest:state.guest,residents:state.residents,requests:state.requests,objective:objective(),panel,placement},null,2);
// Connected village loop: specialties, regional workshops and renewable requests.
const SPECIALTIES={
 scout:{label:'발견',verb:'새 채집 자리 찾기',features:['play','rest'],cost:{berry:2},reward:{wood:3},detail:'주변 자연물을 다시 찾고 나무를 가져옵니다.'},
 grow:{label:'돌보기',verb:'씨앗 함께 돌보기',features:['plant','farm'],cost:{berry:1},reward:{herb:2},detail:'이 지역의 심은 밭을 수확 가능하게 돌봅니다.'},
 make:{label:'만들기',verb:'판자 함께 다듬기',features:['craft'],cost:{wood:2},reward:{plank:2},detail:'나무를 판자로 바꿉니다. 작업대 가공과 병행할 수 있습니다.'},
 carry:{label:'운반',verb:'완성품 모아 오기',features:['rest'],cost:{berry:1},reward:{reed:2},detail:'이 지역 설비의 완성된 가공품과 음식을 한 번에 받습니다.'},
 gather:{label:'어울리기',verb:'작은 모임 열기',features:['meal','music','hot','rest'],cost:{tea:1},reward:{feather:1},detail:'가구에 친구를 모으고 행복 깃털을 남깁니다.'},
 light:{label:'꾸미기',verb:'반짝 장식 손질하기',features:['light','music'],cost:{ore:1},reward:{charm:1},detail:'가구 개선에 쓰는 반짝 장식을 만듭니다.'}
};
const ROLE={kong:'scout',tori:'gather',sprout:'grow',naru:'carry',bori:'grow',mori:'make',sori:'gather',mulgyeol:'grow',banjjak:'light',dami:'make',oni:'gather',gureum:'carry',dali:'light',podo:'gather',jami:'scout',pico:'scout',maru:'carry',byeoli:'light'};
const STATIONS={
 gardenbench:{name:'원예 작업대',region:'forest',item:'essence',input:{herb:2},products:['flower'],seconds:20},
 loombench:{name:'엮는 작업대',region:'river',item:'cloth',input:{reed:2},products:['reedMat'],seconds:25},
 metalbench:{name:'금속 작업대',region:'ridge',item:'fitting',input:{ore:2},products:['lantern','windchime'],seconds:30}
};
Object.assign(NAMES,{essence:'향기 재료',cloth:'엮은 천',fitting:'금속 부품',charm:'반짝 장식',coin:'마을 동전'});
for(const [id,s] of Object.entries(STATIONS)){
 KIND[id]={name:s.name,feature:'craft',size:[2,2],cost:{plank:2,stone:2,coin:3},time:30,rep:0,icon:'제작',desc:`${REGION[s.region]}에서 ${NAMES[s.item]}와 지역 가구를 만듭니다.`};
 FACILITY_IDS.add(id);
}
Object.assign(KIND.flower.cost,{essence:1});delete KIND.flower.cost.herb;
Object.assign(KIND.reedMat.cost,{cloth:1});delete KIND.reedMat.cost.reed;
Object.assign(KIND.lantern.cost,{fitting:1});delete KIND.lantern.cost.ore;
Object.assign(KIND.windchime.cost,{fitting:1});
state.stationJobs ||= {};state.specialtyJobs ||= {};state.specialtyCooldowns ||= {};state.upgrades ||= {};state.orders ||= {};state.roleUses ||= {};
for(const item of ['essence','cloth','fitting','charm'])state.inventory[item] ||= 0;
// Old completed requests keep their rewards and unlock their recurring role immediately.
state.version=4;
const stationFor=id=>Object.keys(STATIONS).find(key=>STATIONS[key].products.includes(id))||'workbench';
const objectById=id=>Object.values(state.placements).flat().find(o=>o.id===id);
const homeOf=id=>state.residentHomes[id]||'home';
const specialty=id=>SPECIALTIES[ROLE[id]];
const roleTarget=id=>state.placements[homeOf(id)].find(o=>specialty(id).features.includes(KIND[o.kind]?.feature));
const regionOf=o=>Object.keys(REGION).find(r=>state.placements[r].some(p=>p.id===o.id));
const activeStation=()=>panel==='object'?objectById(window._selectedObject):null;
const stationBusy=o=>state.stationJobs[o?.id]||(state.job?.stationId===o?.id?state.job:null);
const previousCraftUnlocked=craftUnlocked;
craftUnlocked=(id,r)=>STATIONS[id]?state.unlocked[STATIONS[id].region]:previousCraftUnlocked(id,r);
const previousRecipeRow=recipeRow;
recipeRow=(id,r)=>{
 const o=activeStation(),local=!FACILITY_IDS.has(id),busy=local?stationBusy(o):state.job;
 const globalJob=state.job;state.job=busy;
 let html;try{html=previousRecipeRow(id,r)}finally{state.job=globalJob}
 return html;
};
const oldWorkbenchMenu=workbenchMenu;
workbenchMenu=o=>{
 const originalJob=state.job;state.job=stationBusy(o);let html;
 try{html=oldWorkbenchMenu(o)}finally{state.job=originalJob}
 // Products are rendered by their own station, never duplicated at the wood bench.
 const container=document.createElement('div');container.innerHTML=html;
 container.querySelectorAll('[data-craft]').forEach(b=>{if(stationFor(b.dataset.craft)!=='workbench')b.closest('.row')?.remove()});
 return container.innerHTML.replaceAll('판자 2개',`판자 ${2+(state.upgrades[o.id]||0)}개`);
};
function regionalMenu(o){
 const s=STATIONS[o.kind],p=state.processing[o.id],j=stationBusy(o),rightRegion=regionOf(o)===s.region;
 if(!rightRegion)return `<div class="callout">${REGION[s.region]}에 놓아 사용하세요. 보관함에서 무료로 옮길 수 있습니다.</div>`;
 return `${j?`<div class="callout">${j.name} 제작 중</div>`:''}<div class="callout">${costText(s.input)} → ${NAMES[s.item]} ${2+(state.upgrades[o.id]||0)}개 · ${s.seconds}초</div><button class="primary" data-regional-process="${o.id}" ${p||!enough(s.input)?'disabled':''}>재료 가공하기</button>${p?`<button class="primary" data-regional-collect="${o.id}" ${p.end>state.clock?'disabled':''}>${p.end>state.clock?'가공 중':`${NAMES[s.item]} 받기`}</button>`:''}<div class="section-title">지역 가구</div>${s.products.map(id=>recipeRow(id,KIND[id])).join('')}`;
}
function upgradeCost(o){return {coin:5+5*(state.upgrades[o.id]||0),plank:2,...((state.upgrades[o.id]||0)>0?{charm:1}:{})}}
const previousShowObject=showObject;
showObject=()=>{
 const o=objectById(window._selectedObject);if(!o)return;
 if(STATIONS[o.kind]){panel='object';open('object',KIND[o.kind].name,regionalMenu(o))}else previousShowObject();
 const level=state.upgrades[o.id]||0;
 const crop=state.farms[o.id];
 if(o.kind==='farm'&&state.tools.water&&crop&&crop.readyAt>state.clock)content.insertAdjacentHTML('beforeend',`<button class="secondary" data-water="${o.id}" ${crop.watered?'disabled':''}>${crop.watered?'물을 주었습니다':'물 주기 · 15초 빨리 자랍니다'}</button>`);
 if(o.kind==='workbench'||STATIONS[o.kind])content.insertAdjacentHTML('beforeend',`<div class="section-title">작업대 개선 ${level}/2</div><p class="muted">개선마다 가공 수량 +1 · 이 작업대의 제작 시간 15% 단축</p>${level<2?`<button class="secondary" data-upgrade="${o.id}" ${enough(upgradeCost(o))?'':'disabled'}>${costText(upgradeCost(o))} · 개선</button>`:''}`);
 const friends=state.residents.filter(id=>homeOf(id)===state.region&&specialty(id).features.includes(KIND[o.kind].feature));
 if(friends.length)content.insertAdjacentHTML('beforeend',`<div class="section-title">여기서 함께할 친구</div>${friends.map(id=>`<button class="secondary" data-friend="${id}">${ROSTER.find(r=>r.id===id).name} · ${specialty(id).label}</button>`).join('')}`);
};
const previousProfile=showProfile;
showProfile=()=>{
 previousProfile();const id=window._selectedFriend;if(!state.residents.includes(id))return;
 const s=specialty(id),r=ROSTER.find(r=>r.id===id),j=state.specialtyJobs[id],target=roleTarget(id),first=!state.requests[id],cool=Math.max(0,Math.ceil(((state.specialtyCooldowns[id]||0)-state.clock)/1000));
 const old=content.querySelector('[data-action="fulfill"]');if(old){old.previousElementSibling?.remove();old.previousElementSibling?.remove();old.remove()}
 const cost=first?r.ask:s.cost;
 const card=`<section class="role-card"><small>${first?'첫 공동 행동':`특기 · ${s.label}`}</small><h3>${s.verb}</h3><p>${s.detail}</p><p class="muted">${target?KIND[target.kind].name:'같은 지역에 '+s.features.map(f=>({play:'놀이 가구',rest:'쉼터',craft:'작업대',plant:'화분',farm:'밭',meal:'식탁',music:'음악 가구',hot:'온수 탕',light:'등불'}[f])).join(' / ')} · ${REGION[homeOf(id)]}</p>${j?`<button class="primary" data-role-collect="${id}" ${j.end>state.clock?'disabled':''}>${j.end>state.clock?'함께 작업 중 · '+remainingText(Math.ceil((j.end-state.clock)/1000)):'함께한 결과 받기'}</button>`:homeOf(id)!==state.region?`<button class="primary" data-region="${homeOf(id)}">친구가 있는 곳으로</button>`:`<p class="muted">${costText(cost)||'준비물 없음'} · 12초${first?' · 행복 별 2개와 특기 개방':''}</p><button class="primary" data-role-start="${id}" ${!target||cool||!enough(cost)?'disabled':''}>${cool?'다음 활동까지 '+remainingText(cool):s.verb}</button>`}</section>`;
 content.insertAdjacentHTML('afterbegin',card);
 if(j&&homeOf(id)!==state.region){const button=content.querySelector('[data-role-collect]');button.outerHTML=`<button class="primary" data-region="${homeOf(id)}">친구가 있는 곳으로</button>`}
};
function collectProcess(o){const p=state.processing[o.id];if(!p||p.end>state.clock)return false;earn({[p.item||'plank']:2+(state.upgrades[o.id]||0)});delete state.processing[o.id];return true}
function finishRole(id){
 const j=state.specialtyJobs[id];if(!j||j.end>state.clock||homeOf(id)!==state.region)return;
 const s=specialty(id),region=j.region;delete state.specialtyJobs[id];
 if(j.first&&!state.requests[id]){state.requests[id]=true;state.stars[id]=Math.min(5,(state.stars[id]||1)+2);state.coins+=5;earn({feather:2});if(id==='kong')state.tools.axe=true;if(id==='tori')state.tools.water=true;if(id==='naru')state.tools.pickaxe=true}
 earn(s.reward);
 if(ROLE[id]==='scout')for(const n of NODE_TEMPLATE[region])delete state.nodes[`${region}:${n[0]}`];
 if(ROLE[id]==='grow')for(const o of state.placements[region])if(state.farms[o.id])state.farms[o.id].readyAt=state.clock;
 if(ROLE[id]==='carry')for(const o of state.placements[region]){collectProcess(o);const c=state.stoves[o.id];if(c?.readyAt<=state.clock){earn({[c.kind]:1});delete state.stoves[o.id]}}
 state.roleUses[id]=(state.roleUses[id]||0)+1;state.specialtyCooldowns[id]=state.clock+120000;
 updateHappiness();save();tell(`${ROSTER.find(r=>r.id===id).name}와 ${s.verb} 완료 · ${costText(s.reward)}`);showProfile();draw();
}
const oldPosition=residentPosition;
residentPosition=(id,index,clock=state.clock)=>{
 const target=objectById(state.specialtyJobs[id]?.target)||roleTarget(id);
 if(!target)return oldPosition(id,index,clock);
 const working=state.specialtyJobs[id],cycle=(clock/1000+index*5)%24;
 if(working||cycle>5&&cycle<18)return{x:gridX(target.col)+target.w*CELL/2+Math.sin(clock/2200+index)*4,y:gridY(target.row)+target.h*CELL-8,use:true};
 return oldPosition(id,index,clock);
};
const oldResidentArt=residentArt;
residentArt=(id,index,region)=>{let html=oldResidentArt(id,index,region);const j=state.specialtyJobs[id];return j?html.replace('</g>',`<text x="0" y="-64" text-anchor="middle" class="role-label">${j.end<=state.clock?'완료':specialty(id).label+' 중'}</text></g>`):html};
const oldObjectArt=objectArt;
objectArt=o=>{
 if(!STATIONS[o.kind])return oldObjectArt(o);
 const x=gridX(o.col)+o.w*CELL/2,y=gridY(o.row)+o.h*CELL;
 const accent={gardenbench:'#93ad71',loombench:'#bba47b',metalbench:'#879da1'}[o.kind];
 const top=o.kind==='gardenbench'?sprite('petal-planter.svg',x,y-27,37,37):o.kind==='metalbench'?sprite('rocks.png',x,y-27,37,32):`<path d="M${x-15} ${y-50}h30v22h-30Z" fill="#ecdcb3" stroke="#a28d69" stroke-width="2"/><path d="M${x-13} ${y-44}h26m-26 7h26m-19-12v20m9-20v20" stroke="#baa176" stroke-width="2"/>`;
 return `<g class="world-object" data-object="${o.id}">${sprite('workbench.png',x,y+4,78,70)}<path d="M${x-25} ${y-20}h50v9h-50Z" fill="${accent}"/>${top}<text x="${x}" y="${y+18}" text-anchor="middle" class="world-label">${KIND[o.kind].name}</text><rect x="${x-30}" y="${y-68}" width="60" height="85" fill="transparent" pointer-events="all"/></g>`;
};
const oldBag=showBag;
showBag=()=>{oldBag();content.innerHTML=content.innerHTML.replace('물가 제작','밭 물주기').replace('행복 깃털은 친구의 부탁 보상으로 얻습니다.','행복 깃털은 친구와의 모임과 지역 의뢰에서도 얻습니다.')};
const ORDERS={home:[{wood:6},{plank:2},{tea:1}],forest:[{herb:4},{hardwood:3},{essence:2}],river:[{reed:4},{cloth:2},{tea:2}],ridge:[{ore:3},{fitting:2},{hardwood:4}]};
function orderMenu(){const r=state.region,o=state.orders[r]||{count:0,next:0},cost=ORDERS[r][o.count%3],wait=Math.max(0,Math.ceil((o.next-state.clock)/1000));return `<section class="role-card"><small>${REGION[r]} · 반복 의뢰 ${o.count+1}</small><h3>마을에 필요한 재료</h3><p>${costText(cost)}</p><p class="muted">마을 동전 4개 · 행복 깃털 1개</p><button class="primary" data-order="${r}" ${!state.residents.length||wait||!enough(cost)?'disabled':''}>${!state.residents.length?'첫 친구를 맞이하면 열립니다':wait?'새 의뢰까지 '+remainingText(wait):'전달하기'}</button></section>`}
const oldGoals=showGoals;
showGoals=()=>{oldGoals();content.insertAdjacentHTML('afterbegin',orderMenu())};
// Capture at the sheet boundary so legacy menu handlers cannot double-spend.
sheet.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;const d=b.dataset;
 const handled=d.roleStart||d.roleCollect||d.regionalProcess||d.regionalCollect||d.upgrade||d.order||d.craft||d.water||['process-plank','collect-plank'].includes(d.action);
 if(!handled)return;e.stopImmediatePropagation();
 if(d.roleStart){const id=d.roleStart,r=ROSTER.find(r=>r.id===id),target=roleTarget(id);if(!state.residents.includes(id)||homeOf(id)!==state.region||!target||state.specialtyJobs[id]||(state.specialtyCooldowns[id]||0)>state.clock)return;const first=!state.requests[id];if(!spend(first?r.ask:specialty(id).cost))return;state.specialtyJobs[id]={first,region:state.region,target:target.id,end:state.clock+12000};tell('친구가 가구로 향합니다. 그동안 다른 일을 할 수 있습니다.');showProfile()}
 else if(d.roleCollect){finishRole(d.roleCollect);return}
 else if(d.water){const crop=state.farms[d.water],o=objectById(d.water);if(!o||regionOf(o)!==state.region||!state.tools.water||!crop||crop.watered||crop.readyAt<=state.clock)return;crop.watered=true;crop.readyAt=Math.max(state.clock,crop.readyAt-15000);showObject();tell('물을 주어 당근이 빨리 자랍니다.')}
 else if(d.order){const r=d.order;if(r!==state.region||!state.residents.length)return;const o=state.orders[r]||{count:0,next:0};if(o.next>state.clock||!spend(ORDERS[r][o.count%3]))return;state.coins+=4;earn({feather:1});state.orders[r]={count:o.count+1,next:state.clock+60000};tell('의뢰 완료 · 동전 4개 · 깃털 1개');showGoals()}
 else if(d.upgrade){const o=objectById(d.upgrade);if(!o||regionOf(o)!==state.region||(state.upgrades[o.id]||0)>=2||!spend(upgradeCost(o)))return;state.upgrades[o.id]=(state.upgrades[o.id]||0)+1;showObject();tell('작업대를 개선했습니다.')}
 else if(d.craft){const id=d.craft,r=KIND[id]||TOOLS[id],facility=FACILITY_IDS.has(id),o=activeStation();if(!r||!craftUnlocked(id,r)||TOOLS[id]&&state.tools[id])return;if(facility?panel!=='craft'||state.job:!o||o.kind!==stationFor(id)||stationBusy(o))return;if(o&&STATIONS[o.kind]&&regionOf(o)!==STATIONS[o.kind].region)return;if(id==='stage'&&(state.residents.length<18||Object.values(state.unlocked).some(v=>!v)))return;if(!spend(r.cost))return;const job={id,name:r.name,end:state.clock+Math.ceil(r.time*(state.tools.carpentry?.65:1)*(1-(state.upgrades[o?.id]||0)*.15))*1000,stationId:facility?null:o.id};if(facility)state.job=job;else state.stationJobs[o.id]=job;tell(`${r.name} 제작을 시작했습니다.`);facility?showCraft():showObject()}
 else {const o=activeStation();if(!o||regionOf(o)!==state.region)return;const s=STATIONS[o.kind];if(o.kind!=='workbench'&&!s)return;if(s&&s.region!==state.region)return;if(d.regionalCollect||d.action==='collect-plank'){if(!collectProcess(o))return;tell('가공품을 받았습니다.')}else{if(state.processing[o.id]||!spend(s?.input||{wood:2}))return;state.processing[o.id]={item:s?.item||'plank',end:state.clock+(s?.seconds||15)*1000}}showObject();
 }
 save();draw();
},true);
const oldTick=tick;
tick=delta=>{
 oldTick(delta);let changed=false;
 for(const [key,j] of Object.entries(state.stationJobs))if(j.end<=state.clock){if(TOOLS[j.id])state.tools[j.id]=true;else state.stock[j.id]=(state.stock[j.id]||0)+1;delete state.stationJobs[key];changed=true;tell(`${j.name} 완성 · 보관함을 확인하세요.`)}
 if(changed)save();
 if(['object','profile','goals'].includes(panel))renderPanel();
};
const oldObjective=objective;
objective=()=>{const ready=Object.entries(state.specialtyJobs).find(([,j])=>j.end<=state.clock);if(ready)return `${ROSTER.find(r=>r.id===ready[0]).name}와 함께한 결과 받기`;const job=Object.values(state.stationJobs)[0];return job?`${job.name} 제작 중 · 다른 작업대도 사용할 수 있어요`:oldObjective()};
const oldJobPanel=showJobPanel;
showJobPanel=()=>{const ready=Object.entries(state.specialtyJobs).find(([,j])=>j.end<=state.clock);const job=Object.values(state.stationJobs)[0];if(ready){switchRegion(homeOf(ready[0]));window._selectedFriend=ready[0];showProfile()}else if(job){const o=objectById(job.stationId);if(o){switchRegion(regionOf(o));window._selectedObject=o.id;showObject()}}else oldJobPanel()};
$('objective-button').onclick=showJobPanel;
const oldText=window.render_game_to_text;
window.render_game_to_text=()=>JSON.stringify({...JSON.parse(oldText()),stationJobs:state.stationJobs,specialtyJobs:state.specialtyJobs,specialtyCooldowns:state.specialtyCooldowns,upgrades:state.upgrades,orders:state.orders,roleUses:state.roleUses});
window.advanceTime=ms=>advance(ms);
window.__chickGame={getState:()=>structuredClone(state),advance};
setInterval(()=>{let now=Date.now(),delta=Math.min(30000,now-lastTick);lastTick=now;tick(delta)},1000);
updateHappiness();
draw();
animatePlayer();
})();
