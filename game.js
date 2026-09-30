(()=>{"use strict";
const canvas=document.getElementById("game-canvas"),ctx=canvas.getContext("2d"),W=390,H=844,dpr=Math.max(1,Math.min(devicePixelRatio||1,2));
const source={bg:"assets/game/meadow-base.png",tree:"assets/game/tree.png",logs:"assets/game/logs.png",rocks:"assets/game/rocks.png",grass:"assets/game/grass.png",berries:"assets/game/berries.png",campfire:"assets/game/campfire.png",workbench:"assets/game/workbench.png",lamp:"assets/game/lamp.png",garden:"assets/game/garden.png",picnic:"assets/game/picnic-table.png",arch:"assets/game/flower-arch.png",swing:"assets/game/garden-swing.png",market:"assets/game/village-shop.svg",resinLamp:"assets/game/resin-lantern.svg",petalPlanter:"assets/game/petal-planter.svg",snowLight:"assets/game/snow-light.svg",nest:"assets/unity/nest.png",base:"assets/unity/chick-base.png",scout:"assets/unity/chick-scout.png",builder:"assets/unity/chick-builder.png",leaf:"assets/unity/chick-leaf.png",camera:"assets/unity/chick-camera.png",cowboy:"assets/unity/chick-cowboy.png",fancy:"assets/unity/chick-fancy.png",snow:"assets/unity/chick-snow.png"},assets={};
const rewardNames={wood:"나무",stone:"돌",sprout:"새싹",berry:"열매",resin:"숲의 수지",petal:"꽃잎",crystal:"눈 결정"};
const state={clock:0,dayClock:0,intro:true,discardingSave:false,day:1,area:"village",energy:12,maxEnergy:12,resources:{wood:2,stone:0,sprout:1,berry:0,resin:0,petal:0,crystal:0},acorns:0,stock:{resinLamp:0,petalPlanter:0,snowLight:0},orderDays:{},orderCounts:{},claimedQuests:[],dailyCleanup:false,dailyCare:false,caredAreas:{},dailySkills:{},dailyBond:{},bonds:{},leads:{},encounterMisses:0,rngSeed:Date.now()>>>0,guest:null,lastEncounter:"",profileId:null,buildTab:"living",selectedFurniture:null,movingFacility:null,placementArmed:false,selectedNestId:null,cleared:0,forestCleared:0,groveCleared:0,snowCleared:0,plays:0,happiness:0,xp:0,level:1,buildMode:null,visitorPending:false,bridgeRepaired:false,forestTrailFound:false,groveBloomed:false,icePlayground:false,photoTaken:false,selectedChick:null,effects:[],particles:[],focusedEntity:null};
const lifeData=window.CHICK_LIFE_DATA||{};
function subjectName(name){const code=name.charCodeAt(name.length-1);return name+(code>=0xac00&&code<=0xd7a3&&(code-0xac00)%28?"이":"가")}
const reservedTiles=new Set(["g-2-0","g-2-2","g-6-0","g-6-2","g-8-0","g-10-2"]);
const meadowGrid={sourceWidth:941,sourceHeight:1672,sourceRowY:660,sourceRowStep:67,sourceHalfWidth:110,sourceHalfHeight:67};
const meadowScale=Math.max(W/meadowGrid.sourceWidth,H/meadowGrid.sourceHeight);
const meadowOffsetX=(W-meadowGrid.sourceWidth*meadowScale)/2;
const villageTiles=Array.from({length:12},(_,row)=>(row%2?[340,560,780]:[230,450,670]).map((sourceX,col)=>{const id=`g-${row}-${col}`;return{id,x:Math.round(meadowOffsetX+sourceX*meadowScale),y:Math.round((meadowGrid.sourceRowY+row*meadowGrid.sourceRowStep)*meadowScale),kind:reservedTiles.has(id)?"nature":"build"}})).flat();
const buildTiles=villageTiles.filter(tile=>tile.kind==="build");
const entities=[
 {id:"tree-a",type:"tree",tileId:"g-2-0",size:118,hp:3,maxHp:3,reward:{wood:2}},
 {id:"rocks-a",type:"rocks",tileId:"g-2-2",size:93,hp:3,maxHp:3,reward:{stone:2}},
 {id:"logs-a",type:"logs",tileId:"g-6-0",size:92,hp:2,maxHp:2,reward:{wood:2}},
 {id:"grass-a",type:"grass",tileId:"g-6-2",size:82,hp:1,maxHp:1,reward:{sprout:1}},
 {id:"berries-a",type:"berries",tileId:"g-10-2",size:91,hp:2,maxHp:2,reward:{berry:2}},
 {id:"grass-b",type:"grass",tileId:"g-8-0",size:76,hp:1,maxHp:1,reward:{sprout:1}}
];
for(const entity of entities){const tile=villageTiles.find(t=>t.id===entity.tileId);entity.x=tile.x;entity.y=tile.y}
const forestEntities=[
 {id:"forest-tree",type:"tree",x:77,y:391,size:132,hp:3,maxHp:3,reward:{wood:2,resin:1}},
 {id:"forest-rocks",type:"rocks",x:307,y:407,size:102,hp:3,maxHp:3,reward:{stone:2,resin:1}},
 {id:"forest-berries",type:"berries",x:220,y:545,size:104,hp:2,maxHp:2,reward:{berry:2,resin:1}},
 {id:"forest-grass",type:"grass",x:76,y:634,size:91,hp:1,maxHp:1,reward:{sprout:2,resin:1}},
 {id:"forest-logs",type:"logs",x:308,y:660,size:100,hp:2,maxHp:2,reward:{wood:2,resin:1}}
];
const groveEntities=[
 {id:"grove-tree",type:"tree",x:76,y:395,size:125,hp:3,maxHp:3,reward:{wood:2,petal:1}},
 {id:"grove-berries-a",type:"berries",x:312,y:423,size:102,hp:2,maxHp:2,reward:{berry:2,petal:1}},
 {id:"grove-grass",type:"grass",x:80,y:590,size:90,hp:1,maxHp:1,reward:{sprout:2,petal:1}},
 {id:"grove-berries-b",type:"berries",x:289,y:658,size:100,hp:2,maxHp:2,reward:{berry:2,petal:1}},
 {id:"grove-logs",type:"logs",x:208,y:515,size:91,hp:2,maxHp:2,reward:{wood:2,petal:1}}
];
const snowEntities=[
 {id:"snow-rocks-a",type:"rocks",x:76,y:393,size:111,hp:3,maxHp:3,reward:{stone:2,crystal:1}},
 {id:"snow-logs",type:"logs",x:306,y:430,size:100,hp:2,maxHp:2,reward:{wood:2,crystal:1}},
 {id:"snow-grass",type:"grass",x:74,y:604,size:90,hp:1,maxHp:1,reward:{sprout:2,crystal:1}},
 {id:"snow-rocks-b",type:"rocks",x:292,y:660,size:102,hp:3,maxHp:3,reward:{stone:2,crystal:1}},
 {id:"snow-berries",type:"berries",x:199,y:528,size:95,hp:2,maxHp:2,reward:{berry:2,crystal:1}}
];
const regionEntities={village:entities,forest:forestEntities,grove:groveEntities,snow:snowEntities};
const regions={village:{name:"햇살 마을",hint:"서식지와 가구를 만드는 곳"},forest:{name:"햇살 숲",hint:"건축가와 다리를 고치면 열려요"},grove:{name:"꽃바람 숲",hint:"탐험삐약 · 햇살 숲 채집 3곳"},snow:{name:"눈꽃 들판",hint:"풀잎삐약 · 꽃바람 숲 채집 3곳"}};
const areaTiles={village:villageTiles};
for(const area of["forest","grove","snow"]){
 const rotated=area==="forest"||area==="snow";
 areaTiles[area]=villageTiles.map(tile=>{
  const x=rotated?W-tile.x:tile.x,y=rotated?Math.round(H-tile.y+6*meadowGrid.sourceRowStep*meadowScale):tile.y;
  const blocked=regionEntities[area].some(e=>Math.hypot(e.x-x,e.y-y)<64)||area==="forest"&&Math.hypot(195-x,322-y)<75||area==="grove"&&(Math.hypot(142-x,338-y)<75||Math.hypot(298-x,338-y)<70)||area==="snow"&&Math.hypot(195-x,340-y)<80;
  return{id:`${area}:${tile.id}`,x,y,kind:blocked?"nature":"build",area}
 })
}
function currentTiles(){return areaTiles[state.area]||villageTiles}
function buildTilesFor(area=state.area){return(areaTiles[area]||villageTiles).filter(tile=>tile.kind==="build")}
function activeEntities(){return regionEntities[state.area]||entities}
const chickCatalog=[
 {id:"base",name:"삐약이",asset:"base",status:"첫 둥지를 찾아온 마을의 첫 주민이에요.",skill:"응원: 하루 한 번 기운 3 회복",habitat:"햇살 빈터",clue:"정돈된 초원에 관심이 있어요.",wish:"텃밭이나 모닥불",favorite:["garden","campfire","picnic"],request:{berry:1},ready:()=>state.cleared>=1,missing:()=>`마을 빈터 정리 ${Math.min(state.cleared,1)}/1`},
 {id:"scout",name:"탐험삐약",asset:"scout",status:"새로운 길을 살피는 탐험가예요.",skill:"햇살 숲의 숨은 길을 찾아요",habitat:"텃밭 쉼터",clue:"마을 어딘가의 텃밭을 살펴봐요.",wish:"텃밭이나 수지 등불",favorite:["garden","resinLamp"],request:{wood:2},ready:nest=>state.cleared>=3&&nearFacility(nest,["garden"]),missing:nest=>state.cleared<3?`마을 빈터 정리 ${Math.min(state.cleared,3)}/3`:"마을에 텃밭 필요"},
 {id:"builder",name:"뚝딱삐약",asset:"builder",status:"무거운 자재를 옮기고 다리를 고칠 수 있어요.",skill:"개울 다리 복구",habitat:"나무 작업터",clue:"마을의 통나무나 작업대를 눈여겨봐요.",wish:"작업대",favorite:["workbench"],request:{stone:2},ready:nest=>state.level>=2&&(nearFacility(nest,["workbench"])||nearNature(nest,"logs")),missing:nest=>state.level<2?"마을 성장 2단계 필요":"마을에 통나무 또는 작업대 필요"},
 {id:"leaf",name:"풀잎삐약",asset:"leaf",status:"꽃바람 숲의 식물 돌보기를 좋아해요.",skill:"시든 꽃밭을 되살려 눈꽃 길을 열어요",habitat:"꽃잎 정원",clue:"숲 탐험 뒤 마을에 텃밭이나 꽃 아치를 놓아 봐요.",wish:"텃밭·꽃 아치·꽃잎 화분",favorite:["garden","arch","petalPlanter"],request:{sprout:2},ready:nest=>state.forestCleared>=3&&nearFacility(nest,["garden","arch"]),missing:nest=>state.forestCleared<3?`햇살 숲 채집 ${Math.min(state.forestCleared,3)}/3`:"마을에 텃밭 또는 꽃 아치 필요"},
 {id:"camera",name:"찰칵삐약",asset:"camera",status:"새 지역의 풍경을 기록해요.",skill:"꽃바람 숲의 비밀 풍경을 사진에 담아요",habitat:"사진 쉼터",clue:"꽃바람 숲을 둘러본 뒤 마을에 쉬기 좋은 자리를 꾸며요.",wish:"소풍 탁자나 가로등",favorite:["picnic","lamp"],request:{berry:2},ready:nest=>state.groveCleared>=2&&nearFacility(nest,["picnic","lamp"]),missing:nest=>state.groveCleared<2?`꽃바람 숲 채집 ${Math.min(state.groveCleared,2)}/2`:"마을에 소풍 탁자 또는 가로등 필요"},
 {id:"cowboy",name:"모험삐약",asset:"cowboy",homeArea:"forest",status:"햇살 숲의 나무 길을 걷는 친구예요.",skill:"숲 살피기: 하루 한 번 숲의 수지 1개",habitat:"숲속 쉼터",clue:"나무 향이 진한 쉼터에 발자국이 남았어요.",wish:"모닥불이나 수지 등불",favorite:["campfire","resinLamp"],request:{wood:2},ready:nest=>state.forestCleared>=2&&(nearFacility(nest,["campfire","workbench"])||nearNature(nest,"logs")),missing:()=>"숲의 자연과 쉼터를 살펴보세요"},
 {id:"fancy",name:"꽃단장삐약",asset:"fancy",homeArea:"grove",status:"꽃바람 숲의 꽃잎을 돌보는 친구예요.",skill:"꽃 돌보기: 하루 한 번 꽃잎 1개",habitat:"꽃향기 둥지",clue:"꽃잎이 모이는 자리에서 작은 노랫소리가 들려요.",wish:"꽃 아치나 꽃잎 화분",favorite:["arch","petalPlanter"],request:{sprout:2},ready:nest=>state.groveCleared>=2&&(nearFacility(nest,["arch","garden","petalPlanter"])||nearNature(nest,"berries")),missing:()=>"꽃이 피는 자리를 살펴보세요"},
 {id:"snow",name:"눈송삐약",asset:"snow",homeArea:"snow",status:"눈꽃 들판에서 온 차분한 친구예요.",skill:"얼음 놀이터를 만들어요",habitat:"따뜻한 보금자리",clue:"눈꽃 들판을 살핀 뒤 따뜻하고 밝은 자리를 찾아요.",wish:"모닥불·가로등·눈꽃 조명",favorite:["campfire","lamp","snowLight"],request:{stone:2},ready:nest=>state.snowCleared>=2&&(nearFacility(nest,["campfire","lamp"])||nearNature(nest,"rocks")),missing:nest=>state.snowCleared<2?`눈꽃 들판 채집 ${Math.min(state.snowCleared,2)}/2`:"따뜻한 곳이나 반짝이는 돌이 필요"}
];
const chicks=[];
const facilities=[];
const recipes={
 nest:{name:"포근한 빈 둥지",asset:"nest",category:"living",desc:"새 병아리가 머무는 집",cost:{wood:2,sprout:1},size:92,level:1},
 campfire:{name:"포근한 모닥불",asset:"campfire",category:"living",desc:"눌러서 기운 회복",cost:{wood:3,stone:2},size:94},
 workbench:{name:"나무 작업대",asset:"workbench",category:"living",desc:"눌러서 나무 손질",cost:{wood:4,stone:2},size:100},
 garden:{name:"작은 텃밭",asset:"garden",category:"living",desc:"눌러서 열매와 새싹 수확",cost:{wood:2,sprout:2},size:106},
 lamp:{name:"마을 가로등",asset:"lamp",category:"decor",desc:"밤을 밝히는 꾸미기",cost:{wood:2,stone:1},size:91},
 picnic:{name:"소풍 탁자",asset:"picnic",category:"living",desc:"병아리와 함께 쉬는 시설",price:3,size:105,level:1},
 arch:{name:"꽃 아치",asset:"arch",category:"decor",desc:"산책길을 꾸미는 장식",price:5,size:103,level:2},
 swing:{name:"꽃 그네",asset:"swing",category:"living",desc:"병아리와 함께 노는 시설",price:6,size:108,level:2},
 market:{name:"마을 가게",asset:"market",category:"store",desc:"지역 재료로 특별한 가구 제작",cost:{wood:4,stone:2,berry:1},size:116,level:2},
 resinLamp:{name:"수지 등불",asset:"resinLamp",category:"decor",desc:"햇살 숲에서 만든 빛",stockKey:"resinLamp",size:93,level:2},
 petalPlanter:{name:"꽃잎 화분",asset:"petalPlanter",category:"decor",desc:"꽃바람 숲의 색을 담은 화분",stockKey:"petalPlanter",size:94,level:2},
 snowLight:{name:"눈꽃 조명",asset:"snowLight",category:"decor",desc:"눈꽃 들판의 맑은 빛",stockKey:"snowLight",size:94,level:3}
};
recipes.workbench.level=2;recipes.lamp.level=2;recipes.campfire.level=1;recipes.garden.level=1;
const furnitureNotes={
 nest:{use:"새 친구 한 마리의 집이 됩니다.",place:"빈 둥지와 주변 가구의 조합이 새로운 흔적을 만듭니다."},
 campfire:{use:"누르면 기운을 회복합니다.",place:"따뜻한 곳을 좋아하는 병아리가 찾아와 쉽니다."},
 workbench:{use:"누르면 나무를 얻습니다.",place:"만들기를 좋아하는 병아리가 작업하러 옵니다."},
 garden:{use:"누르면 열매와 새싹을 얻습니다.",place:"같은 지역의 둥지와 어울리면 서식지의 분위기가 달라집니다."},
 lamp:{use:"마을을 환하게 꾸미는 장식입니다.",place:"불빛을 좋아하는 병아리가 이곳을 구경합니다."},
 picnic:{use:"쉬면 기운이 회복됩니다.",place:"병아리들이 간식을 먹고 풍경을 바라봅니다."},
 arch:{use:"꽃길에 색을 더하는 장식입니다.",place:"꽃을 좋아하는 병아리의 산책 장소가 됩니다."},
 swing:{use:"놀면 기운이 회복됩니다.",place:"병아리가 그네 곁으로 찾아오는 장면을 볼 수 있습니다."}
};
Object.assign(furnitureNotes,{
 market:{use:"지역 재료로 특별한 꾸미기 가구를 만듭니다.",place:"숲·꽃밭·눈 지역을 다시 찾아가 재료를 모으는 이유가 됩니다."},
 resinLamp:{use:"햇살 숲의 빛으로 이 지역을 꾸밉니다.",place:"숲의 수지를 마을 가게에 납품해 얻은 가구입니다."},
 petalPlanter:{use:"꽃바람 숲의 색으로 이 지역을 꾸밉니다.",place:"꽃잎을 마을 가게에 납품해 얻은 가구입니다."},
 snowLight:{use:"눈꽃 들판의 맑은 빛으로 이 지역을 꾸밉니다.",place:"눈 결정을 마을 가게에 납품해 얻은 가구입니다."}
});
const regionOrders={forest:{name:"햇살 숲",material:"resin",product:"resinLamp",color:"#cbaa68"},grove:{name:"꽃바람 숲",material:"petal",product:"petalPlanter",color:"#efacd0"},snow:{name:"눈꽃 들판",material:"crystal",product:"snowLight",color:"#bde8f4"}};
function nestCount(area=null){return facilities.filter(f=>f.type==="nest"&&(!area||f.area===area)).length}
function nestLimit(area=state.area){return chickCatalog.filter(info=>(info.homeArea||"village")===area).length}
function markCare(){state.dailyCare=true;state.caredAreas[state.area]=true}
function nearFacility(nest,types){return facilities.some(f=>f.area===nest.area&&types.includes(f.type))}
function nearNature(nest,type){return(regionEntities[nest.area]||entities).some(e=>e.type===type)}
function freeNests(area=state.area){return facilities.filter(f=>f.type==="nest"&&f.area===area&&!f.occupant&&state.guest?.nestId!==f.id)}
function freeNest(area=state.area){return freeNests(area)[0]}
function readyCandidates(area=state.area){if(state.guest)return[];return chickCatalog.filter(info=>!hasChick(info.id)&&(info.homeArea||"village")===area).flatMap(info=>{const nest=freeNests(area).find(n=>info.ready(n));return nest?[{info,nest}]:[]})}
function leadFor(id){return state.leads[id]||(state.leads[id]={signs:0})}
function encounterChance(){const candidates=readyCandidates();if(!candidates.length)return 0;const mostSigns=Math.max(...candidates.map(candidate=>leadFor(candidate.info.id).signs));if(mostSigns>=(!hasChick("base")?2:3))return 1;return Math.min(.9,(!hasChick("base")?.65:.4)+mostSigns*.15+Math.min(2,candidates.length-1)*.05+(candidates.some(candidate=>candidate.nest.upgraded)?.1:0))}
function visitorReady(){return readyCandidates().length>0}
function addChick(id,restored=false,nestId=null){const info=chickCatalog.find(entry=>entry.id===id);if(!info||chicks.some(chick=>chick.id===id))return;const nest=facilities.find(f=>f.id===nestId&&f.type==="nest")||facilities.find(f=>f.type==="nest"&&f.occupant===id)||freeNest(info.homeArea||"village");const index=chicks.length,chick={id,name:info.name,asset:info.asset,homeArea:nest?.area||info.homeArea||"village",x:nest?.x||202,y:nest?.y||430,size:65,phase:index*1.8,status:info.status,arrivedAt:restored?-100:state.clock,activity:null,activityCount:0};chicks.push(chick);if(nest&&!nest.occupant)nest.occupant=id;state.selectedChick=id}
function hasChick(id){return chicks.some(chick=>chick.id===id)}
function timeSlot(){return state.dayClock<24?"morning":state.dayClock<54?"afternoon":"evening"}
function activityLabel(chick){const activity=chick.activity;return activity?.status==="travel"?`이동 중 · ${activity.label}`:activity?.label||"마을을 둘러보는 중"}
function pickChickActivity(chick){
 const profile=lifeData[chick.id];if(!profile)return;
 const options=[];
 for(const routine of profile.activities||[]){if(!routine.times.includes(timeSlot()))continue;const places=routine.place==="nest"?facilities.filter(f=>f.type==="nest"&&f.occupant===chick.id&&f.area===chick.homeArea):facilities.filter(f=>f.type===routine.place&&f.area===chick.homeArea);for(const place of places)if(!chicks.some(other=>other!==chick&&other.activity?.placeId===place.id))options.push({x:place.x+(place.x>195?-30:30),y:place.y+12,label:routine.label,mark:routine.mark,placeId:place.id})}
 const natural=(regionEntities[chick.homeArea]||entities).find(e=>e.type===profile.nature?.type&&e.hp>0&&!chicks.some(other=>other!==chick&&other.activity?.placeId===e.id));if(natural)options.push({x:natural.x+(natural.x>195?-43:43),y:natural.y+13,label:profile.nature.label,mark:profile.nature.mark,placeId:natural.id});
 if(!options.length){const nest=facilities.find(f=>f.type==="nest"&&f.occupant===chick.id);options.push({x:nest?.x||195,y:(nest?.y||515)+12,label:"서식지 산책",mark:"♪",placeId:nest?.id||null})}
 const choice=options[(chick.activityCount+state.day+chicks.indexOf(chick))%options.length];chick.activityCount++;
 chick.activity={status:"travel",x:Math.max(42,Math.min(348,choice.x)),y:Math.max(310,Math.min(715,choice.y)),label:choice.label,mark:choice.mark,placeId:choice.placeId,until:0};
}
function regionOpen(id){return id==="village"||id==="forest"&&state.bridgeRepaired||id==="grove"&&state.forestTrailFound||id==="snow"&&state.groveBloomed&&state.level>=3}
const load=()=>Promise.all(Object.entries(source).map(([key,src])=>new Promise(resolve=>{const img=new Image();img.onload=()=>{assets[key]=img;resolve()};img.onerror=()=>resolve();img.src=src})));
function resize(){const rect=canvas.getBoundingClientRect();canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);ctx.setTransform(rect.width/W*dpr,0,0,rect.height/H*dpr,0,0);render()}
function drawContain(img,x,y,w,h=w,alpha=1){if(!img)return;const scale=Math.min(w/img.width,h/img.height),dw=img.width*scale,dh=img.height*scale;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);ctx.restore()}
function drawBackground(){if(!assets.bg){ctx.fillStyle="#dff2a8";ctx.fillRect(0,0,W,H);return}const scale=Math.max(W/assets.bg.width,H/assets.bg.height),dw=assets.bg.width*scale,dh=assets.bg.height*scale;if(state.area==="forest"||state.area==="snow"){ctx.save();ctx.translate(W,H);ctx.rotate(Math.PI);ctx.drawImage(assets.bg,(W-dw)/2,(H-dh)/2,dw,dh);ctx.restore()}else ctx.drawImage(assets.bg,(W-dw)/2,(H-dh)/2,dw,dh);if(state.area==="forest"){ctx.fillStyle="#4a98651d";ctx.fillRect(0,0,W,H);drawContain(assets.tree,-47,192,104);drawContain(assets.tree,340,260,104)}else if(state.area==="grove"){ctx.fillStyle="#f58da929";ctx.fillRect(0,0,W,H);drawContain(assets.arch,7,205,100);drawContain(assets.arch,322,242,95);for(let i=0;i<16;i++){ctx.fillStyle=i%2?"#ffdfe9a0":"#fff2c2b0";ctx.beginPath();ctx.ellipse((i*83+24)%W,285+(i*97)%420,3,5,.5,0,Math.PI*2);ctx.fill()}}else if(state.area==="snow"){ctx.fillStyle="#dff5ff88";ctx.fillRect(0,0,W,H);for(let i=0;i<30;i++){ctx.fillStyle="#ffffff9c";ctx.beginPath();ctx.arc((i*107+19)%W,275+(i*71)%440,i%3+2,0,Math.PI*2);ctx.fill()}}}
function shadowEllipse(x,y,rx,ry,alpha=.18){ctx.save();ctx.fillStyle=`rgba(48,73,42,${alpha})`;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore()}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawEntity(e){if(e.hp<=0&&e.fade<=0)return;const shake=e.shake>0?Math.sin(state.clock*55)*4:0,alpha=e.fade===undefined?1:Math.max(0,e.fade/.38);shadowEllipse(e.x,e.y+e.size*.28,e.size*.29,e.size*.1,.14*alpha);drawContain(assets[e.type],e.x-e.size/2+shake,e.y-e.size*.68,e.size,e.size,alpha);if(e.hp>0&&e.hp<e.maxHp){const w=43,x=e.x-w/2,y=e.y-e.size*.49;ctx.fillStyle="#fff9e6";roundRect(x-2,y-2,w+4,9,5);ctx.fill();ctx.fillStyle="#e8b9a7";roundRect(x,y,w,5,3);ctx.fill();ctx.fillStyle="#62aa50";roundRect(x,y,w*(e.hp/e.maxHp),5,3);ctx.fill()}}
function drawFacility(f){shadowEllipse(f.x,f.y+f.size*.25,f.size*.28,f.size*.1);drawContain(assets[f.type],f.x-f.size/2,f.y-f.size*.66,f.size,f.size);if(f.upgraded){ctx.fillStyle="#fff6c8";ctx.beginPath();ctx.arc(f.x-f.size*.34,f.y-f.size*.51,11,0,Math.PI*2);ctx.fill();ctx.fillStyle="#d48e24";ctx.font="900 14px sans-serif";ctx.textAlign="center";ctx.fillText("★",f.x-f.size*.34,f.y-f.size*.51+5)}if(f.type==="nest"&&!f.occupant&&!state.buildMode){const ready=readyCandidates().some(candidate=>candidate.nest.id===f.id),guest=state.guest?.nestId===f.id;if(ready||guest){ctx.fillStyle=guest?"#ffad63":"#76bc62";ctx.beginPath();ctx.arc(f.x+31,f.y-46,13,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="900 15px sans-serif";ctx.textAlign="center";ctx.fillText(guest?"!":"?",f.x+31,f.y-41)}}if(f.type==="market"&&Object.keys(regionOrders).some(id=>regionOpen(id)&&state.orderDays[id]!==state.day&&state.resources[regionOrders[id].material]>=2)){ctx.fillStyle="#f3a75b";ctx.beginPath();ctx.arc(f.x+f.size*.3,f.y-f.size*.53,12,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="900 14px sans-serif";ctx.textAlign="center";ctx.fillText("!",f.x+f.size*.3,f.y-f.size*.53+5)}if(f.cooldown>state.clock){const remain=Math.ceil(f.cooldown-state.clock);ctx.fillStyle="#fffdf2e8";roundRect(f.x-20,f.y-f.size*.5,40,18,9);ctx.fill();ctx.fillStyle="#596258";ctx.font="900 9px sans-serif";ctx.textAlign="center";ctx.fillText(`${remain}초`,f.x,f.y-f.size*.5+12)}}
function drawBridgeMarker(){ctx.save();const y=222+Math.sin(state.clock*2)*2;ctx.shadowColor="#31462d55";ctx.shadowBlur=9;ctx.fillStyle=state.bridgeRepaired?"#5ca64c":"#d69049";roundRect(245,y-13,99,29,11);ctx.fill();ctx.lineWidth=2;ctx.strokeStyle="#fff7d6";ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle="#fff";ctx.font="900 11px sans-serif";ctx.textAlign="center";ctx.fillText(state.bridgeRepaired?"지역 이동":"다리 수리",294,y+6);if(!state.bridgeRepaired&&state.area==="village"){ctx.fillStyle="#765039";ctx.fillRect(266,162,7,16);ctx.fillRect(305,169,7,15);ctx.strokeStyle="#e0c196";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(269,171);ctx.lineTo(311,178);ctx.stroke()}ctx.restore()}
function visibleProjects(){if(state.area==="forest")return[{id:"trail",x:195,y:322,label:state.forestTrailFound?"열린 숲길":"수상한 덩굴길",done:state.forestTrailFound,color:"#4b9a58"}];if(state.area==="grove")return[{id:"bloom",x:142,y:316,label:state.groveBloomed?"피어난 꽃밭":"시든 꽃밭",done:state.groveBloomed,color:"#de8caa"},{id:"photo",x:298,y:322,label:state.photoTaken?"사진 명소":"비밀 풍경",done:state.photoTaken,color:"#6f9ebe"}];if(state.area==="snow")return[{id:"ice",x:195,y:316,label:state.icePlayground?"얼음 놀이터":"얼어붙은 빈터",done:state.icePlayground,color:"#7bb8d0"}];return[]}
function drawProjectTerrain(){ctx.save();if(state.area==="forest"){if(state.forestTrailFound){ctx.lineCap="round";ctx.beginPath();ctx.moveTo(174,352);ctx.quadraticCurveTo(238,275,390,276);ctx.strokeStyle="#61a263";ctx.lineWidth=48;ctx.stroke();ctx.strokeStyle="#e8d5a2";ctx.lineWidth=32;ctx.stroke();for(let i=0;i<9;i++){ctx.fillStyle=i%2?"#fff6d1":"#daedab";ctx.beginPath();ctx.arc(186+i*22,338-i*6,3,0,Math.PI*2);ctx.fill()}}else{ctx.strokeStyle="#477852";ctx.lineWidth=7;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(150+i*20,350);ctx.bezierCurveTo(155+i*20,324,178+i*15,307,206+i*12,291);ctx.stroke()}}}else if(state.area==="grove"){ctx.fillStyle=state.groveBloomed?"#86b75f":"#a6a278";ctx.beginPath();ctx.ellipse(142,338,77,34,0,0,Math.PI*2);ctx.fill();for(let i=0;i<17;i++){const x=83+(i*37)%118,y=323+(i*17)%30;ctx.fillStyle=state.groveBloomed?i%2?"#ffd9e8":"#fff0a9":"#776e55";ctx.beginPath();ctx.arc(x,y,state.groveBloomed?4:2,0,Math.PI*2);ctx.fill()}}else if(state.area==="snow"){ctx.fillStyle=state.icePlayground?"#9bdcf2":"#c4dae0";ctx.strokeStyle="#edf9ff";ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(195,340,79,34,0,0,Math.PI*2);ctx.fill();ctx.stroke();if(state.icePlayground){ctx.strokeStyle="#ffffffad";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(149,345);ctx.quadraticCurveTo(195,320,239,348);ctx.stroke()}}ctx.restore()}
function drawWorldProjects(){for(const project of visibleProjects()){ctx.save();if(project.done){ctx.fillStyle=project.color+"70";ctx.beginPath();ctx.ellipse(project.x,project.y+17,58,24,0,0,Math.PI*2);ctx.fill();for(let i=0;i<7;i++){const x=project.x-44+i*15,y=project.y+10+(i%2)*14;ctx.fillStyle=state.area==="snow"?"#effbff":"#fff2bf";ctx.beginPath();ctx.arc(x,y,3+i%2,0,Math.PI*2);ctx.fill()}}ctx.fillStyle=project.done?project.color:"#6b624c";ctx.strokeStyle="#fff9e3";ctx.lineWidth=2;roundRect(project.x-62,project.y-31,124,31,13);ctx.fill();ctx.stroke();ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="900 11px sans-serif";ctx.fillText(project.label,project.x,project.y-11);ctx.restore()}}
function projectAt(p){return visibleProjects().find(project=>Math.abs(p.x-project.x)<64&&Math.abs(p.y-project.y+15)<28)}
function useWorldProject(project){
 if(project.id==="trail"){
  if(state.forestTrailFound){toast("탐험삐약이 찾아낸 꽃바람 숲길이에요.");return}
  if(!hasChick("scout")){toast("덩굴 너머에 길이 보여요. 탐험을 좋아하는 친구가 필요해요.");return}
  if(state.resources.resin<2){toast(`숲의 수지 ${state.resources.resin}/2 · 숲 자연물을 살펴보세요.`);return}
  state.resources.resin-=2;state.forestTrailFound=true;toast("꽃바람 숲길이 열렸어요!")
 }else if(project.id==="bloom"){
  if(state.groveBloomed){toast("풀잎삐약이 되살린 꽃밭이에요.");return}
  if(!hasChick("leaf")){toast("꽃밭이 시들었어요. 식물을 돌보는 친구가 필요해요.");return}
  if(state.resources.petal<2){toast(`꽃잎 ${state.resources.petal}/2 · 꽃바람 숲에서 모아 보세요.`);return}
  state.resources.petal-=2;state.groveBloomed=true;toast("꽃밭이 살아났어요!")
 }else if(project.id==="photo"){
  if(state.photoTaken){toast("찰칵삐약과 남긴 사진 명소예요.");return}
  if(!hasChick("camera")){toast("멋진 풍경이에요. 사진을 좋아하는 친구와 다시 와 보세요.");return}
  state.photoTaken=true;state.acorns+=3;toast("비밀 풍경 발견! 도토리 3개")
 }else if(project.id==="ice"){
  if(state.icePlayground){state.energy=Math.min(state.maxEnergy,state.energy+2);markCare();toast("얼음 놀이터에서 기운 2 회복!");checkProgress();saveGame();return}
  if(!hasChick("snow")){toast("얼음을 다룰 줄 아는 친구가 필요해요.");return}
  if(state.resources.crystal<2){toast(`눈 결정 ${state.resources.crystal}/2 · 눈꽃 들판에서 모아 보세요.`);return}
  state.resources.crystal-=2;state.icePlayground=true;toast("얼음 놀이터가 열렸어요!")
 }
 markCare();burst(project.x,project.y,project.color);checkProgress();saveGame()
}
function drawChick(c){const active=["act","shared","respond"].includes(c.activity?.status),bob=Math.sin(state.clock*(active?6:3)+c.phase)*(active?4:2.4);shadowEllipse(c.x,c.y+25,c.size*.25,c.size*.08,.16);ctx.save();ctx.shadowColor="#3f52373b";ctx.shadowBlur=6;ctx.shadowOffsetY=3;drawContain(assets[c.asset],c.x-c.size/2,c.y-c.size*.62+bob,c.size,c.size);ctx.restore();if(active){const a=c.activity;ctx.fillStyle=a.status==="shared"?"#ffefc9":"#fffdf2";ctx.strokeStyle="#e8d8b0";ctx.lineWidth=1;roundRect(c.x-28,c.y-60,56,20,10);ctx.fill();ctx.stroke();ctx.fillStyle=a.status==="shared"?"#d77a42":"#5d8350";ctx.font="900 11px sans-serif";ctx.textAlign="center";ctx.fillText(a.mark||"♪",c.x,c.y-46);if(a.status==="shared"){ctx.fillStyle="#ffcc78";ctx.beginPath();ctx.arc(c.x+25+Math.sin(state.clock*5)*5,c.y-30,3,0,Math.PI*2);ctx.fill()}}if(state.clock-c.arrivedAt<5){ctx.fillStyle="#fffdf2";roundRect(c.x-31,c.y-c.size*.68-18,62,18,9);ctx.fill();ctx.fillStyle="#4c6545";ctx.font="900 9px sans-serif";ctx.textAlign="center";ctx.fillText("새 친구!",c.x,c.y-c.size*.68-5)}}
function guestArea(){return facilities.find(f=>f.id===state.guest?.nestId)?.area||null}
function guestPosition(){const nest=facilities.find(f=>f.id===state.guest?.nestId);return nest?{x:Math.min(345,nest.x+38),y:nest.y+10}:null}
function drawGuest(){if(!state.guest||guestArea()!==state.area)return;const info=chickCatalog.find(c=>c.id===state.guest.id),p=guestPosition();if(!info||!p)return;shadowEllipse(p.x,p.y+20,20,7);drawContain(assets[info.asset],p.x-37,p.y-46+Math.sin(state.clock*3)*2,74,74);ctx.fillStyle="#fff9e9";roundRect(p.x-31,p.y-59,62,19,9);ctx.fill();ctx.fillStyle="#ad6334";ctx.font="900 10px sans-serif";ctx.textAlign="center";ctx.fillText("새 손님!",p.x,p.y-46)}
function drawLeadSigns(){if(state.guest)return;const marked=new Set();for(const {info,nest} of readyCandidates()){const signs=leadFor(info.id).signs;if(!signs||marked.has(nest.id))continue;marked.add(nest.id);const direction=nest.x>195?-1:1;ctx.save();ctx.fillStyle="#9b7250";for(let i=0;i<Math.min(3,signs+1);i++){const x=nest.x+direction*(44+i*11),y=nest.y+17+i*6;ctx.beginPath();ctx.ellipse(x,y,5,3,-.35,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+direction*3,y-5,2,0,Math.PI*2);ctx.fill()}ctx.restore()}}
function tileAt(x,y){const halfWidth=meadowGrid.sourceHalfWidth*meadowScale,halfHeight=meadowGrid.sourceHalfHeight*meadowScale;return currentTiles().map(tile=>({tile,distance:Math.abs(x-tile.x)/halfWidth+Math.abs(y-tile.y)/halfHeight})).filter(entry=>entry.distance<=1).sort((a,b)=>a.distance-b.distance)[0]?.tile}
function tileOccupied(tile){return facilities.some(f=>f.tileId===tile.id)}
function nearestFreeTile(x,y,used=new Set(),area=state.area){return buildTilesFor(area).filter(tile=>!used.has(tile.id)&&!tileOccupied(tile)).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0]}
function drawDiamond(tile,fill,stroke,width=1){const halfWidth=meadowGrid.sourceHalfWidth*meadowScale,halfHeight=meadowGrid.sourceHalfHeight*meadowScale;ctx.beginPath();ctx.moveTo(tile.x,tile.y-halfHeight);ctx.lineTo(tile.x+halfWidth,tile.y);ctx.lineTo(tile.x,tile.y+halfHeight);ctx.lineTo(tile.x-halfWidth,tile.y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
function drawGroundGrid(){ctx.save();for(const tile of currentTiles()){const occupied=tile.kind==="build"&&tileOccupied(tile);if(state.buildMode){const active=state.pointer?.id===tile.id;drawDiamond(tile,tile.kind==="nature"?"#dfaa6480":occupied?"#667b7055":active?"#f7f7bdcc":"#dcffb999",tile.kind==="nature"?"#ae753f":occupied?"#829484":active?"#ffffff":"#5caa57",active?3:2)}else if(tile.kind==="nature"&&state.area==="village")drawDiamond(tile,"#e9bb7240","#b48f5d44")}ctx.restore()}
function drawBuildGhost(){if(!state.buildMode||!state.pointer||state.pointer.kind!=="build"||tileOccupied(state.pointer))return;const r=recipes[state.buildMode],x=state.pointer.x,y=state.pointer.y;ctx.save();ctx.globalAlpha=.74;shadowEllipse(x,y+r.size*.25,r.size*.3,r.size*.12,.16);drawContain(assets[r.asset],x-r.size/2,y-r.size*.66,r.size,r.size);ctx.restore()}
function drawFurnitureReveal(f){const t=f.revealAt===undefined?2:state.clock-f.revealAt;if(t>=1.15){drawFacility(f);return}ctx.save();const x=f.x,y=f.y;shadowEllipse(x,y+f.size*.27,f.size*.28,f.size*.1,.2);if(f.revealKind==="shop"&&t<.45){ctx.fillStyle="#f2bc79";roundRect(x-28,y-50,56,45,8);ctx.fill();ctx.fillStyle="#fff1bf";ctx.fillRect(x-4,y-50,8,45);ctx.fillRect(x-28,y-32,56,7);ctx.fillStyle="#ef9b68";roundRect(x-32,y-54,64,12,5);ctx.fill()}else if(f.revealKind==="craft"&&t<.28){ctx.strokeStyle="#a47e55";ctx.lineWidth=4;ctx.strokeRect(x-30,y-45,60,38);ctx.fillStyle="#fff1b8";ctx.font="900 18px sans-serif";ctx.textAlign="center";ctx.fillText("✦",x,y-18)}else{const start=f.revealKind==="shop"?.45:.28,p=Math.min(1,(t-start)/.45),scale=.28+.72*(1-Math.pow(1-p,2)),size=f.size*scale;drawContain(assets[f.type],x-size/2,y-size*.66,size,size)}for(let i=0;i<5;i++){const angle=i*Math.PI*2/5+state.clock*2;ctx.fillStyle=i%2?"#fff6bb":"#ffd16a";ctx.beginPath();ctx.arc(x+Math.cos(angle)*40,y-23+Math.sin(angle)*22,2.8,0,Math.PI*2);ctx.fill()}ctx.restore()}
function drawEffects(){for(const e of state.effects){const t=e.life/e.max;ctx.save();ctx.globalAlpha=Math.min(1,t*2);ctx.fillStyle=e.color||"#fff";ctx.strokeStyle="#493f2f";ctx.lineWidth=3;ctx.font="900 14px sans-serif";ctx.textAlign="center";ctx.strokeText(e.text,e.x,e.y);ctx.fillText(e.text,e.x,e.y);ctx.restore()}for(const p of state.particles){ctx.save();ctx.globalAlpha=Math.max(0,p.life/.65);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.restore()}}
function render(){ctx.clearRect(0,0,W,H);drawBackground();drawGroundGrid();drawProjectTerrain();drawBridgeMarker();const layers=[];activeEntities().filter(e=>e.hp>0||e.fade>0).forEach(e=>layers.push({y:e.y,draw:()=>drawEntity(e)}));facilities.filter(f=>f.area===state.area).forEach(f=>layers.push({y:f.y,draw:()=>drawFurnitureReveal(f)}));chicks.filter(c=>c.homeArea===state.area).forEach(c=>layers.push({y:c.y,draw:()=>drawChick(c)}));if(state.guest&&guestArea()===state.area)layers.push({y:guestPosition()?.y||0,draw:drawGuest});layers.sort((a,b)=>a.y-b.y).forEach(l=>l.draw());drawLeadSigns();drawWorldProjects();drawBuildGhost();drawEffects()}
function update(dt){
 state.clock+=dt;state.dayClock+=dt;
 for(const e of Object.values(regionEntities).flat()){e.shake=Math.max(0,(e.shake||0)-dt);if(e.hp<=0)e.fade=Math.max(0,(e.fade??.38)-dt)}
 for(const e of state.effects){e.life-=dt;e.y-=22*dt}state.effects=state.effects.filter(e=>e.life>0);
 for(const p of state.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=55*dt}state.particles=state.particles.filter(p=>p.life>0);
 for(const c of chicks){
  if(!c.activity||(c.activity.status!=="travel"&&state.clock>=c.activity.until))pickChickActivity(c);
  const a=c.activity;if(!a)continue;
  if(a.status==="travel"){
   const dx=a.x-c.x,dy=a.y-c.y,dist=Math.hypot(dx,dy),speed=c.id==="builder"?24:31;
   if(dist<=speed*dt+3){c.x=a.x;c.y=a.y;a.status=a.kind==="call"?"respond":"act";a.until=state.clock+(a.kind==="call"?4:7+(c.activityCount%3)*2)}
   else{c.x+=dx/dist*speed*dt;c.y+=dy/dist*speed*dt}
  }
 }
}
function canvasPoint(event){const r=canvas.getBoundingClientRect();return{x:(event.clientX-r.left)/r.width*W,y:(event.clientY-r.top)/r.height*H}}
function hitEntity(p){return entities.filter(e=>e.hp>0).reverse().find(e=>Math.hypot(p.x-e.x,p.y-(e.y-e.size*.15))<e.size*.43)}
function hitChick(p){return [...chicks].reverse().find(c=>Math.hypot(p.x-c.x,p.y-(c.y-c.size*.18))<c.size*.48)}
function hitFacility(p){return [...facilities].reverse().find(f=>Math.hypot(p.x-f.x,p.y-(f.y-f.size*.15))<f.size*.42)}
function hitWorld(p){const hits=[];for(const e of activeEntities().filter(e=>e.hp>0))if(Math.hypot(p.x-e.x,p.y-(e.y-e.size*.15))<e.size*.43)hits.push({kind:"entity",item:e,y:e.y});for(const f of facilities.filter(f=>f.area===state.area))if(Math.hypot(p.x-f.x,p.y-(f.y-f.size*.15))<f.size*.42)hits.push({kind:"facility",item:f,y:f.y});for(const c of chicks.filter(c=>c.homeArea===state.area))if(Math.hypot(p.x-c.x,p.y-(c.y-c.size*.18))<c.size*.48)hits.push({kind:"chick",item:c,y:c.y});const guest=guestArea()===state.area?guestPosition():null;if(guest&&Math.hypot(p.x-guest.x,p.y-(guest.y-12))<39)hits.push({kind:"guest",item:state.guest,y:guest.y+10});return hits.sort((a,b)=>b.y-a.y)[0]}
function validPlacement(x,y){const tile=tileAt(x,y);return !!tile&&tile.kind==="build"&&!tileOccupied(tile)}
function burst(x,y,color="#f2c650"){for(let i=0;i<9;i++){const angle=Math.PI*2*i/9+i*.17;state.particles.push({x,y:y-14,vx:Math.cos(angle)*(24+4*i),vy:Math.sin(angle)*(24+4*i)-28,r:2+i%3,life:.65,color})}}
function floatText(x,y,text,color="#fff4a8"){state.effects.push({x,y,text,color,life:.85,max:.85})}
function satisfactionFor(id){const info=chickCatalog.find(c=>c.id===id),nest=facilities.find(f=>f.type==="nest"&&f.occupant===id);return !!info&&!!nest&&nearFacility(nest,info.favorite)}
function satisfactionCount(){return chicks.filter(c=>satisfactionFor(c.id)).length}
function environmentScore(){return chicks.length+satisfactionCount()+chicks.filter(c=>(state.bonds[c.id]||0)>=3).length}
function updateEnvironmentLevel(announce=true,restore=false){const score=environmentScore(),next=score>=5?3:score>=2?2:1,oldMax=state.maxEnergy;state.maxEnergy=12+Math.min(8,score);state.energy=restore?Math.min(state.energy,state.maxEnergy):Math.min(state.maxEnergy,state.energy+Math.max(0,state.maxEnergy-oldMax));if(next>state.level){state.level=next;if(announce){toast(next===2?"마을 성장! 작업대와 가게가 열렸어요.":"마을 성장! 눈꽃 들판에 가까워졌어요.");burst(195,370,"#ffdc64")}}}
function gainXP(amount){state.xp+=amount}
function gather(e){if(state.energy<=0){toast("기운이 없어요. 다음 날을 시작해 회복해 주세요.");return}state.energy--;e.hp--;e.shake=.22;burst(e.x,e.y-e.size*.15);floatText(e.x,e.y-e.size*.55,"톡!");if(e.hp<=0){markCare();Object.entries(e.reward).forEach(([key,value])=>{state.resources[key]+=value;floatText(e.x,e.y-e.size*.36,`+${value} ${rewardNames[key]}`,"#fff4a8")});const key={village:"cleared",forest:"forestCleared",grove:"groveCleared",snow:"snowCleared"}[state.area];state[key]++;state.dailyCleanup=true;gainXP(3);burst(e.x,e.y-e.size*.12,"#8ecb65");toast(`${Object.entries(e.reward).map(([k,v])=>`${rewardNames[k]} ${v}개`).join(", ")}를 모았어요`);if(state.area==="forest"&&state.resources.resin>=2&&!state.forestTrailFound)toast("숲의 수지가 모였어요. 덩굴길을 살펴보세요.");if(state.area==="grove"&&state.resources.petal>=2&&!state.groveBloomed)toast("꽃잎이 모였어요. 시든 꽃밭을 살펴보세요.")}checkProgress();saveGame()}
function reactToNewFurniture(f){const interested=chicks.find(c=>{const nest=facilities.find(n=>n.type==="nest"&&n.occupant===c.id),info=chickCatalog.find(i=>i.id===c.id);return nest?.area===f.area&&info?.favorite.includes(f.type)});if(!interested)return;interested.activity={status:"travel",x:Math.max(42,Math.min(348,f.x+(f.x>195?-30:30))),y:Math.max(310,Math.min(715,f.y+12)),label:`새 ${recipes[f.type].name} 구경`,mark:"♥",placeId:f.id,until:0};speak(`${subjectName(interested.name)} 새 가구를 보러 가요.`)}
function placeFacility(x,y,confirmed=false){
 const tile=tileAt(x,y);if(!tile){toast("격자 칸을 눌러주세요.");return}if(tile.kind==="nature"){toast("갈색 칸은 자연물이 다시 자라는 자리예요.");return}
 if(state.movingFacility){const moving=facilities.find(f=>f.id===state.movingFacility&&f.area===state.area);if(!moving){cancelBuild();return}const other=facilities.find(f=>f.tileId===tile.id);if(other&&other!==moving){const old=buildTilesFor(state.area).find(t=>t.id===moving.tileId);other.x=old.x;other.y=old.y;other.tileId=old.id}moving.x=tile.x;moving.y=tile.y;moving.tileId=tile.id;cancelBuild();state.dailyCare=true;burst(tile.x,tile.y,"#b9ec8d");toast("시설 위치를 바꿨어요. 재료와 도토리는 쓰지 않았어요.");checkProgress();saveGame();return}
 if(!validPlacement(x,y)){toast("이미 시설이 있는 칸이에요. 다른 초록 칸을 골라주세요.");return}
 if(!confirmed&&(!state.placementArmed||state.pointer?.id!==tile.id)){state.pointer=tile;state.placementArmed=true;document.getElementById("place-confirm").hidden=false;updatePlacementHint();toast("이 자리의 분위기를 살펴보세요. 한 번 더 누르면 완성됩니다.");return}
 const type=state.buildMode,r=recipes[type],first=!facilities.some(f=>f.type===type);if(!canPlaceRecipe(r)){cancelBuild();toast("놓을 가구나 재료가 부족해요.");return}
 if(r.stockKey)state.stock[r.stockKey]--;else if(r.price)state.acorns-=r.price;else Object.entries(r.cost).forEach(([key,value])=>state.resources[key]-=value);
 const made={id:`${type}-${facilities.length+1}`,type,area:state.area,x:tile.x,y:tile.y,tileId:tile.id,size:r.size,cooldown:0,revealAt:state.clock,revealKind:r.price||r.stockKey?"shop":"craft"};facilities.push(made);cancelBuild();markCare();gainXP(type==="nest"||type==="garden"?5:3);
 burst(tile.x,tile.y,r.price?"#ffc77d":"#e6d879");floatText(tile.x,tile.y-r.size*.55,first?"새 가구!":"완성!","#fff4a8");reactToNewFurniture(made);
 checkProgress();toast(r.stockKey?`${r.name} 배치 완료! 이 지역의 이야기가 마을에 남았어요.`:r.price?`${subjectName(r.name)} 도착했어요! 포장을 풀고 있어요.`:first?`첫 ${r.name} 완성!`:`${r.name} 완성!`);saveGame()
}
function useFacility(f){const r=recipes[f.type],bonus=f.upgraded?1:0;if(f.type==="nest"){state.selectedNestId=f.id;openSheet("habitat-sheet");return}if(f.type==="market"){openSheet("market-sheet");return}if(r.category==="decor"){speak(`${r.name} 주변을 병아리들이 구경하고 있어요.`);burst(f.x,f.y-f.size*.2,"#f7d9a2");return}if(f.cooldown>state.clock){toast(`${r.name}은 잠시 뒤에 다시 이용할 수 있어요.`);return}markCare();if(f.type==="campfire"){state.energy=Math.min(state.maxEnergy,state.energy+3+bonus*2);speak(`모닥불에서 기운을 ${3+bonus*2} 회복했어요!`);f.cooldown=12}else if(f.type==="garden"){state.resources.berry+=1+bonus;state.resources.sprout+=1+bonus;speak(`텃밭에서 열매와 새싹을 ${1+bonus}개씩 수확했어요!`);f.cooldown=15}else if(f.type==="workbench"){state.resources.wood+=1+bonus;speak(`작업대에서 나무 ${1+bonus}개를 다듬었어요!`);f.cooldown=12}else if(f.type==="picnic"){state.energy=Math.min(state.maxEnergy,state.energy+2+bonus);speak(`소풍 탁자에서 기운을 ${2+bonus} 회복했어요!`);f.cooldown=13}else if(f.type==="swing"){state.energy=Math.min(state.maxEnergy,state.energy+2+bonus*2);speak(`꽃 그네에서 놀고 기운을 ${2+bonus*2} 회복했어요!`);f.cooldown=12}burst(f.x,f.y-f.size*.2);checkProgress();saveGame()}
function openFriend(chick=chicks.find(c=>c.id===state.selectedChick)||chicks[0]){
 const empty=!chick;document.getElementById("friend-empty").hidden=!empty;document.getElementById("friend-profile").hidden=empty;document.getElementById("friend-actions").hidden=empty;
 document.getElementById("friend-name").textContent=empty?"아직 빈 마을":chick.name;
 if(chick){
  state.selectedChick=chick.id;document.getElementById("friend-image").src=source[chick.asset];
  const info=chickCatalog.find(entry=>entry.id===chick.id),bond=state.bonds[chick.id]||0;
  document.getElementById("friend-status").innerHTML=`<strong>${activityLabel(chick)}</strong><span class="friend-skill">${regions[chick.homeArea].name} · 친밀함 ${bond}/5</span><span class="friend-skill ${satisfactionFor(chick.id)?"happy":"waiting"}">좋아하는 가구: ${info.wish}</span>`;
  document.getElementById("skill-button-hint").textContent={base:"기운 회복",scout:"숲길 찾기",builder:"다리 복구",leaf:"꽃밭 돌보기",camera:"풍경 촬영",cowboy:"숲의 수지",fancy:"꽃잎 돌보기",snow:"얼음터 만들기"}[chick.id];
  document.getElementById("join-button-hint").textContent=chick.activity?.status==="act"?chick.activity.label:"함께 시간 보내기";
 }
 document.getElementById("friend-roster").innerHTML=chicks.map(c=>`<button class="${c.id===chick?.id?"active":""}" data-chick="${c.id}"><img src="${source[c.asset]}" alt="">${c.name}</button>`).join("");
 document.querySelectorAll("[data-chick]").forEach(button=>button.onclick=()=>openFriend(chicks.find(c=>c.id===button.dataset.chick)));openSheet("friend-sheet")
}
function useFriendSkill(chick){
 if(chick.id==="cowboy"||chick.id==="fancy"){
  if(state.area!==chick.homeArea){toast(`${chick.name}을 만나려면 ${regions[chick.homeArea].name}으로 가 주세요.`);return}
  if(state.dailySkills[chick.id]){toast(`${chick.name}의 도움은 오늘 이미 받았어요.`);return}
  const material=chick.id==="cowboy"?"resin":"petal";state.resources[material]++;state.dailySkills[chick.id]=true;markCare();closeSheets();burst(chick.x,chick.y,"#ffe470");toast(`${chick.name}과 함께 ${rewardNames[material]} 1개를 찾았어요.`);checkProgress();saveGame();return
 }
 if(chick.id==="base"){if(state.dailySkills.base){toast("삐약이의 응원은 오늘 이미 받았어요.");return}if(state.energy>=state.maxEnergy){toast("기운이 가득해요. 채집 후에 다시 와 보세요.");return}state.energy=Math.min(state.maxEnergy,state.energy+3);state.dailySkills.base=true;markCare();closeSheets();burst(chick.x,chick.y,"#ffe470");toast("삐약이의 응원으로 기운이 3 회복됐어요.");checkProgress();saveGame();return}if(chick.id==="builder"){if(state.area==="village")openSheet("bridge-sheet");else toast("마을의 개울 다리에서 뚝딱삐약의 특기를 써 보세요.");return}const destination={scout:"forest",leaf:"grove",camera:"grove",snow:"snow"}[chick.id],projectId={scout:"trail",leaf:"bloom",camera:"photo",snow:"ice"}[chick.id];if(state.area!==destination){toast(`${regions[destination].name}의 특별한 장소에서 이 특기를 써 보세요.`);return}closeSheets();useWorldProject(visibleProjects().find(p=>p.id===projectId))}
function friendAction(action){
 const chick=chicks.find(c=>c.id===state.selectedChick);if(!chick)return;
 if(action==="skill"){useFriendSkill(chick);return}
 if(state.area!==chick.homeArea){toast(`${chick.name}은 ${regions[chick.homeArea].name}에 있어요. 그곳에서 만나 주세요.`);return}
 const profile=lifeData[chick.id]||{},bond=state.bonds[chick.id]||0;
 if(action==="call"){
  chick.activity={status:"travel",kind:"call",x:195,y:465,label:"인사",mark:"♪",until:0};
  speak(profile.call?.[bond>=3?1:0]||`${subjectName(chick.name)} 다가와요.`);burst(chick.x,chick.y-25,"#ffe2a1");
 }else if(action==="join"){
  const label=chick.activity?.label||"함께 놀기",mark=chick.activity?.mark||"♪";
  chick.activity={status:"shared",x:chick.x,y:chick.y,label:`함께 ${label}`,mark,until:state.clock+6};
  if(!state.dailyBond[chick.id]){state.dailyBond[chick.id]=true;state.bonds[chick.id]=Math.min(5,bond+1)}
  speak(profile.join?.[bond>=3?1:0]||`${chick.name}${chick.name.endsWith("이")?"와":"과"} 함께했어요.`);burst(chick.x,chick.y-24,"#ffcf85");
 }
 markCare();closeSheets();checkProgress();saveGame()
}
function canAfford(cost){return Object.entries(cost).every(([key,value])=>state.resources[key]>=value)}
function costText(cost){return Object.entries(cost).map(([k,v])=>`<span class="${state.resources[k]<v?"missing":""}">${rewardNames[k]} ${state.resources[k]}/${v}</span>`).join("")}
function canPlaceRecipe(r){return r.stockKey?(state.stock[r.stockKey]||0)>0:r.price?state.acorns>=r.price:canAfford(r.cost)}
function recipeCostText(r){return r.stockKey?`<span class="${canPlaceRecipe(r)?"":"missing"}">완성품 ${state.stock[r.stockKey]||0}개</span>`:r.price?`<span class="${canPlaceRecipe(r)?"":"missing"}">도토리 ${state.acorns}/${r.price}</span>`:costText(r.cost)}
function renderRecipes(){
 document.querySelectorAll("[data-build-tab]").forEach(button=>button.classList.toggle("active",button.dataset.buildTab===state.buildTab));
 document.getElementById("shop-note").textContent=state.buildTab==="store"&&state.area!=="village"?"마을 가게는 햇살 마을에서 열 수 있어요.":{living:"생활 가구는 누르면 회복·수확·놀이에 사용할 수 있어요.",decor:"꾸미기 가구는 둥지와 어울리고 병아리가 구경해요. 지역 가구는 가게에서 만듭니다.",store:"마을 가게를 놓으면 지역 재료를 특별한 가구로 바꿀 수 있어요."}[state.buildTab];
 document.getElementById("recipe-list").innerHTML=Object.entries(recipes).filter(([,r])=>r.category===state.buildTab&&(state.area==="village"||r.category!=="store")).map(([key,r])=>{const unlocked=state.level>=r.level,affordable=canPlaceRecipe(r),placed=facilities.some(f=>f.type===key&&f.area===state.area);return `<button class="recipe ${affordable&&unlocked?"affordable":"locked"} ${placed&&key!=="nest"?"placed":""}" data-recipe="${key}"><img src="${source[r.asset]}" alt=""><strong>${r.name}${key==="nest"?` · ${nestCount(state.area)}/${nestLimit()}개`:""}</strong><small>${r.desc}</small><span class="recipe-cost">${recipeCostText(r)}</span>${unlocked?"":`<span class="lock-label">성장 ${r.level}단계</span>`}</button>`}).join("");
 document.querySelectorAll("[data-recipe]").forEach(button=>button.onclick=()=>openFurniture(button.dataset.recipe));
 const local=facilities.filter(f=>f.area===state.area);document.getElementById("move-section").hidden=!local.length;
 document.getElementById("upgrade-heading").hidden=!local.some(f=>recipes[f.type].category==="living");
 document.getElementById("move-list").innerHTML=local.map((f,index)=>`<button data-move="${f.id}">${recipes[f.type].name} ${index+1}</button>`).join("");
 document.querySelectorAll("[data-move]").forEach(button=>button.onclick=()=>selectMove(button.dataset.move));
 document.getElementById("upgrade-list").innerHTML=local.filter(f=>recipes[f.type].category==="living").map((f,index)=>`<button data-upgrade="${f.id}" ${f.upgraded?"disabled":""}>${recipes[f.type].name} ${index+1} · ${f.upgraded?"개선 완료":"도토리 4개로 개선"}<small>${upgradeBenefit(f.type)}</small></button>`).join("");
 document.querySelectorAll("[data-upgrade]").forEach(button=>button.onclick=()=>upgradeFacility(button.dataset.upgrade))
}
function renderMarket(){
 document.getElementById("market-orders").innerHTML=Object.entries(regionOrders).map(([id,order])=>{
  const unlocked=regionOpen(id),today=state.orderDays[id]===state.day,enough=state.resources[order.material]>=2,ready=unlocked&&!today&&enough;
  return `<article class="market-order ${ready?"ready":"locked"}"><img src="${source[order.product]}" alt=""><span><strong>${order.name} · ${recipes[order.product].name}</strong><small>${rewardNames[order.material]} ${state.resources[order.material]}/2 → 가구 1개</small><em>${!unlocked?"지역을 먼저 발견해 주세요":today?"오늘은 이미 만들었어요":enough?`지금 만들 수 있어요 · 총 ${state.orderCounts[id]||0}개 제작`:"지역에서 재료를 모아 주세요"}</em></span><button data-order="${id}" ${ready?"":"disabled"}>${today?"완료":"만들기"}</button></article>`
 }).join("");
 document.querySelectorAll("[data-order]").forEach(button=>button.onclick=()=>fulfillOrder(button.dataset.order))
}
function fulfillOrder(id){
 const order=regionOrders[id];if(!order||!facilities.some(f=>f.type==="market")||!regionOpen(id)||state.orderDays[id]===state.day||state.resources[order.material]<2){renderMarket();return}
 state.resources[order.material]-=2;state.stock[order.product]=(state.stock[order.product]||0)+1;state.orderDays[id]=state.day;state.orderCounts[id]=(state.orderCounts[id]||0)+1;state.acorns+=1;state.dailyCare=true;
 const shop=facilities.find(f=>f.type==="market");burst(shop.x,shop.y-35,order.color);floatText(shop.x,shop.y-62,`+1 ${recipes[order.product].name}`,"#fff4a8");
 checkProgress();renderMarket();toast(`${recipes[order.product].name} 완성! 꾸미기에서 배치하세요. 도토리도 1개 받았어요.`);saveGame()
}
function openFurniture(type){
 const r=recipes[type];if(!r)return;state.selectedFurniture=type;
 document.getElementById("furniture-kind").textContent={living:"LIVING",decor:"DECORATION",store:"VILLAGE STORE"}[r.category];
 document.getElementById("furniture-name").textContent=r.name;
 document.getElementById("furniture-image").src=source[r.asset];
 document.getElementById("furniture-badge").textContent=facilities.some(f=>f.type===type&&f.area===state.area)?"이 지역에 놓아 본 가구":"처음 놓아 볼 가구";
 document.getElementById("furniture-use").textContent=furnitureNotes[type].use;
 document.getElementById("furniture-place").textContent=furnitureNotes[type].place;
 document.getElementById("furniture-cost").innerHTML=recipeCostText(r);
 document.getElementById("furniture-checkout").textContent=r.stockKey?"마을 가게에서 만든 완성품입니다. 배치 확정 시 한 개를 사용합니다.":r.price?"놓을 자리를 확정할 때 도토리를 사용합니다.":"놓을 자리를 확정할 때 재료를 사용합니다.";
 const button=document.getElementById("furniture-preview-button"),locked=state.level<r.level,affordable=canPlaceRecipe(r);
 button.disabled=locked||!affordable||type==="nest"&&nestCount(state.area)>=nestLimit()||type==="market"&&facilities.some(f=>f.type==="market");
 button.textContent=locked?`마을 성장 ${r.level}단계에서 열려요`:!affordable?r.stockKey?"마을 가게에서 먼저 만들어 주세요":r.price?"도토리를 모아 주세요":"재료가 모이면 놓아 볼 수 있어요":type==="market"&&facilities.some(f=>f.type==="market")?"가게는 한 곳만 놓을 수 있어요":button.disabled?"둥지가 모두 준비됐어요":"이 지역에 미리 놓아보기";
 openSheet("furniture-sheet")
}
function placementMood(type,tile){if(!tile)return"배경의 마름모 칸을 골라 주세요.";if(tile.kind==="nature")return"갈색 칸은 자연물이 다시 자라는 자리예요.";if(tileOccupied(tile))return"이미 가구가 있어요. 다른 초록 칸을 골라 주세요.";if(type==="nest")return"새 친구가 머물 자리를 골라 주세요.";return recipes[type].category==="decor"?"이 지역을 꾸밀 자리예요.":recipes[type].category==="store"?"지역 가게를 열 자리예요.":"눌러 사용할 생활 가구예요."}
function updatePlacementHint(){if(state.buildMode)document.getElementById("mode-hint").textContent=state.movingFacility?"옮길 칸을 고르세요 · 비용 없음":`${placementMood(state.buildMode,state.pointer)}${state.placementArmed?" · 완성 가능":""}`}
function upgradeFacility(id){const facility=facilities.find(f=>f.id===id&&f.area===state.area);if(!facility||facility.upgraded)return;if(state.acorns<4){toast("시설 개선에 도토리 4개가 필요해요.");return}state.acorns-=4;facility.upgraded=true;burst(facility.x,facility.y-28,"#ffe177");toast(`${recipes[facility.type].name} 개선 완료! ${upgradeBenefit(facility.type)}`);checkProgress();saveGame()}
function upgradeBenefit(type){return {nest:"방문 확률 +10%",garden:"열매·새싹 수확량 +1",workbench:"나무 수확량 +1",campfire:"기운 회복 +2",picnic:"기운 회복 +1",swing:"기운 회복 +2"}[type]||"효과 증가"}
function selectRecipe(type){const r=recipes[type];if(type==="market"&&state.area!=="village"){toast("마을 가게는 햇살 마을에만 놓을 수 있어요.");return}if(state.level<r.level){toast(`마을 성장 ${r.level}단계에서 열려요.`);return}if(type==="nest"&&nestCount(state.area)>=nestLimit()){toast("이 지역의 병아리 수만큼 둥지가 준비됐어요.");return}if(type==="market"&&facilities.some(f=>f.type==="market")){toast("마을 가게는 한 곳만 놓을 수 있어요.");return}if(!canPlaceRecipe(r)){toast(r.stockKey?"마을 가게에서 지역 재료로 먼저 만들어 주세요.":r.price?"도토리가 부족해요.":"부족한 재료를 확인하고 모아주세요.");return}if(!nearestFreeTile(205,505)){toast("설치할 빈 칸이 없어요.");return}closeSheets();state.buildMode=type;state.placementArmed=false;document.getElementById("place-confirm").hidden=true;state.pointer=nearestFreeTile(205,505);document.getElementById("mode-title").textContent=`${r.name} 미리 놓기`;document.getElementById("mode-banner").hidden=false;updatePlacementHint();toast("초록 칸을 고르세요. 취소하면 재료를 쓰지 않아요.")}
function selectMove(id){const f=facilities.find(item=>item.id===id&&item.area===state.area);if(!f)return;closeSheets();state.movingFacility=id;state.buildMode=f.type;state.placementArmed=false;document.getElementById("place-confirm").hidden=true;state.pointer=buildTilesFor(state.area).find(tile=>tile.id===f.tileId);document.getElementById("mode-title").textContent=`${recipes[f.type].name} 옮기기`;document.getElementById("mode-banner").hidden=false;updatePlacementHint();toast("옮길 칸을 누르세요. 이미 놓인 시설과 위치를 바꿀 수도 있어요.")}
function cancelBuild(){state.buildMode=null;state.movingFacility=null;state.pointer=null;state.placementArmed=false;document.getElementById("place-confirm").hidden=true;document.getElementById("mode-banner").hidden=true}
function hasNest(){return nestCount()>0}
function selectedHabitatNest(){return freeNests().find(f=>f.id===state.selectedNestId)||freeNest()}
function habitatConditions(){const nest=selectedHabitatNest();return[{name:"빈 둥지",detail:"짓기에서 설치",done:!!nest},{name:"오늘 돌봄",detail:"채집·시설 사용",done:!!state.caredAreas[state.area]}]}
function conditionHTML(rows){return rows.map(row=>`<div class="condition-row ${row.done?"done":""}"><i>${row.done?"✓":"·"}</i><span>${row.name}</span><b>${row.done?"충족":row.detail}</b></div>`).join("")}
function knownChick(info){return info.id==="base"||info.id==="scout"&&(hasChick("base")||state.cleared>=2)||info.id==="builder"&&state.level>=2||info.id==="leaf"&&state.bridgeRepaired||info.id==="camera"&&(state.forestTrailFound||state.groveCleared>0)||info.id==="cowboy"||info.id==="fancy"||info.id==="snow"}
function renderHabitat(){
 const nest=selectedHabitatNest(),guest=guestArea()===state.area?state.guest:null,unmet=chickCatalog.filter(info=>(info.homeArea||"village")===state.area&&!hasChick(info.id)&&guest?.id!==info.id&&knownChick(info));
 document.getElementById("habitat-copy").textContent=guest?"둥지에 손님이 왔어요.":nest?"같은 지역의 가구와 자연이 새 친구를 부릅니다.":"이 지역에 둥지를 지어 보세요.";
 document.getElementById("habitat-conditions").innerHTML=conditionHTML(habitatConditions());
 const clue=unmet.find(info=>nest&&info.ready(nest))||unmet[0];
 document.getElementById("habitat-candidates").innerHTML=clue?`<article class="habitat-candidate ${nest&&clue.ready(nest)?"ready":""}"><img src="${source[clue.asset]}" alt=""><span><strong>${nest&&clue.ready(nest)?"새 발자국":"낯선 흔적"}</strong><small>${lifeData[clue.id]?.sign||"이 지역을 살펴보세요."}</small></span></article>`:"";
 document.getElementById("habitat-note").textContent=guest?"둥지를 눌러 인사하세요.":visitorReady()?state.caredAreas[state.area]?"다음 날을 시작해 보세요.":"이 지역을 돌봐 주세요.":unmet.length?"가구나 자연을 더 살펴보세요.":"새로운 친구를 찾아보세요.";
 if(!guest&&readyCandidates().some(({info})=>leadFor(info.id).signs>0))document.getElementById("habitat-status").textContent="발자국 발견"
}
function bridgeConditions(){return[{name:"건축가 병아리",detail:"나무 작업터 서식지에서 발견",done:hasChick("builder")},{name:"나무 2개",detail:`보유 ${state.resources.wood}/2`,done:state.resources.wood>=2},{name:"돌 2개",detail:`보유 ${state.resources.stone}/2`,done:state.resources.stone>=2}]}
function renderBridge(){document.getElementById("bridge-conditions").innerHTML=conditionHTML(bridgeConditions());const button=document.getElementById("repair-button");button.disabled=state.bridgeRepaired||!bridgeConditions().every(c=>c.done);button.textContent=state.bridgeRepaired?"복구 완료 · 숲길이 열렸어요":"다리 복구하기"}
function questData(){return[
 {name:"첫 둥지 만들기",desc:"빈 둥지가 있어야 첫 병아리가 와요.",current:Math.min(nestCount(),1),goal:1},
 {name:"첫 병아리 맞이하기",desc:"햇살 빈터를 만들고 찾아온 손님과 친해지세요.",current:Math.min(chicks.length,1),goal:1},
 {name:"주민 세 마리 맞이하기",desc:"서로 다른 서식지를 꾸미고 손님을 맞이하세요.",current:Math.min(chicks.length,3),goal:3},
 {name:"건축가와 다리 복구",desc:"나무 작업터의 친구와 다리를 복구하세요.",current:state.bridgeRepaired?1:0,goal:1},
 {name:"숨은 숲길 찾기",desc:"탐험삐약과 숲의 수지로 덩굴길을 살펴보세요.",current:state.forestTrailFound?1:0,goal:1},
 {name:"꽃밭 되살리기",desc:"풀잎삐약과 꽃잎으로 시든 꽃밭을 돌보세요.",current:state.groveBloomed?1:0,goal:1},
 {name:"얼음 놀이터 만들기",desc:"눈송삐약과 눈 결정으로 새 놀이 공간을 만드세요.",current:state.icePlayground?1:0,goal:1},
 {name:"병아리 여섯 마리 맞이하기",desc:"둥지를 늘려 주민을 한 마리씩 모으세요.",current:Math.min(chicks.length,6),goal:6},
 {name:"지역의 새 친구 만나기",desc:"숲과 꽃바람 숲에서 각각 새로운 주민을 맞이하세요.",current:["cowboy","fancy"].filter(hasChick).length,goal:2}
]}
function renderQuests(){const next=questData().find(q=>q.current<q.goal);document.getElementById("quest-list").innerHTML=next?`<article class="quest-row"><i>✦</i><span><strong>${next.name}</strong><small>${next.desc}</small></span><b>${next.current}/${next.goal}<small>도토리 +2</small></b></article>`:'<p class="sheet-copy">모든 목표를 이루었어요.</p>';document.getElementById("quest-summary").textContent=next?.name||"마을 둘러보기"}
function grantQuestRewards(){questData().forEach((quest,index)=>{if(quest.current>=quest.goal&&!state.claimedQuests.includes(index)){state.claimedQuests.push(index);state.acorns+=2;toast(`${quest.name} 완료 · 도토리 2개를 받았어요.`)}})}
function checkProgress(){const wasPending=state.visitorPending;updateEnvironmentLevel();state.visitorPending=visitorReady();grantQuestRewards();if(state.visitorPending&&!wasPending)toast("새 서식지에 친구가 찾아올 기척이 있어요. 하루를 돌봐 주세요.");syncUI()}
function randomUnit(){state.rngSeed=(Math.imul(1664525,state.rngSeed)+1013904223)>>>0;return state.rngSeed/4294967296}
function rollEncounter(){
 if(state.guest)return`손님이 ${regions[guestArea()]?.name||"다른 지역"}에 머물고 있어요. 먼저 만나 보세요.`;
 const candidates=readyCandidates();
 if(!candidates.length)return"새 손님을 위한 서식지 조합이 아직 없어요.";
 if(!state.caredAreas[state.area])return"오늘은 이 지역을 돌보지 않았어요. 이곳에서 채집하거나 시설을 이용해 주세요.";
 if(randomUnit()<encounterChance()){
  const weights=candidates.map(candidate=>1+leadFor(candidate.info.id).signs),total=weights.reduce((a,b)=>a+b,0);
  let choice=randomUnit()*total,index=0;while(index<weights.length-1&&choice>=weights[index])choice-=weights[index++];
  const pick=candidates[index];state.guest={id:pick.info.id,nestId:pick.nest.id,arrivedDay:state.day+1,phase:"greet"};
  state.encounterMisses=0;burst(pick.nest.x,pick.nest.y-40,"#ffda84");
  return`${subjectName(pick.info.name)} ${pick.info.habitat}에 찾아왔어요! 먼저 다가가 인사해 보세요.`;
 }
 for(const candidate of candidates)leadFor(candidate.info.id).signs=Math.min(3,leadFor(candidate.info.id).signs+1);
 state.encounterMisses++;
 return"서식지에 새로운 발자국이 남았어요. 다음 방문 기회가 높아졌습니다.";
}
function nextDay(){const encounter=rollEncounter();state.day++;state.dayClock=0;state.energy=state.maxEnergy;state.dailyCleanup=false;state.dailyCare=false;state.caredAreas={};state.dailySkills={};state.dailyBond={};state.lastEncounter=encounter;for(const e of Object.values(regionEntities).flat()){e.hp=e.maxHp;e.fade=undefined;e.shake=0}for(const f of facilities)f.cooldown=0;toast(`DAY ${state.day} · ${encounter}`);checkProgress();saveGame()}
function openGuest(){if(!state.guest)return;if(guestArea()!==state.area){toast(`손님은 ${regions[guestArea()]?.name||"다른 지역"}의 둥지에 있어요.`);return}const info=chickCatalog.find(c=>c.id===state.guest.id),greeting=state.guest.phase==="greet";document.getElementById("guest-name").textContent=info.name;document.getElementById("guest-image").src=source[info.asset];document.getElementById("guest-copy").textContent=greeting?lifeData[info.id]?.greeting||`${subjectName(info.name)} 둥지에서 기다려요.`:`${subjectName(info.name)} 이곳에 머물고 싶어 해요. 작은 부탁을 들어주세요.`;document.getElementById("guest-request-box").hidden=greeting;document.getElementById("guest-request").innerHTML=costText(info.request);const button=document.getElementById("guest-welcome-button");button.disabled=!greeting&&!canAfford(info.request);button.textContent=greeting?"다가가 인사하기":canAfford(info.request)?"부탁을 들어주고 함께 살기":"재료를 모아 다시 만나기";openSheet("guest-sheet")}
function welcomeGuest(){if(!state.guest)return;const info=chickCatalog.find(c=>c.id===state.guest.id);if(state.guest.phase==="greet"){state.guest.phase="request";state.dailyCare=true;toast(`${subjectName(info.name)} 마음을 열었어요. 부탁을 살펴보세요.`);openGuest();saveGame();return}if(!canAfford(info.request)){openGuest();return}Object.entries(info.request).forEach(([key,value])=>state.resources[key]-=value);const nestId=state.guest.nestId;state.guest=null;addChick(info.id,false,nestId);state.bonds[info.id]=1;state.happiness+=5;gainXP(5);state.dailyCare=true;closeSheets();const nest=facilities.find(f=>f.id===nestId);burst(nest?.x||202,nest?.y||430,"#ffd85b");toast(`${subjectName(info.name)} 주민이 되었어요! 이제 마을에서 생활해요.`);checkProgress();saveGame()}
function repairBridge(){if(state.bridgeRepaired)return;if(!bridgeConditions().every(c=>c.done)){renderBridge();toast("건축가와 나무 2개, 돌 2개가 필요해요.");return}state.resources.wood-=2;state.resources.stone-=2;state.bridgeRepaired=true;state.happiness+=20;gainXP(10);closeSheets();burst(294,210,"#ffdf79");toast("다리 복구 완료! 표지를 눌러 숲으로 가보세요.");checkProgress();saveGame()}
function renderRegions(){const visible=Object.entries(regions).filter(([id])=>id==="village"||id==="forest"||id==="grove"&&state.bridgeRepaired||id==="snow"&&state.forestTrailFound);document.getElementById("region-list").innerHTML=visible.map(([id,region])=>`<button data-region="${id}" class="${state.area===id?"current":""}" ${regionOpen(id)?"":"disabled"}><strong>${regionOpen(id)?"↗":"●"} ${region.name}${state.area===id?" · 현재 지역":""}</strong><small>${regionOpen(id)?id==="village"?"둥지·생활 가구·마을 가게":`둥지 ${nestCount(id)}/${nestLimit(id)} · 주민 ${chicks.filter(c=>c.homeArea===id).length} · ${rewardNames[regionOrders[id].material]}`:id==="forest"?"다리를 복구해 주세요":id==="grove"?"숲의 숨은 길을 찾아보세요":"꽃밭 복구 · 마을 성장 3단계"}</small></button>`).join("");document.querySelectorAll("[data-region]").forEach(button=>button.onclick=()=>goToRegion(button.dataset.region))}
function goToRegion(id){if(!regionOpen(id)){toast(`${regions[id].name}은 아직 열리지 않았어요.`);return}state.area=id;cancelBuild();closeSheets();document.getElementById("area-name").textContent=regions[id].name;syncUI();toast(`${regions[id].name}에 도착했어요.`);saveGame()}
function travel(){if(!state.bridgeRepaired){openSheet("bridge-sheet");return}renderRegions();openSheet("region-sheet")}
function renderBag(){const items=[{k:"wood",icon:"◆"},{k:"stone",icon:"●"},{k:"sprout",icon:"♣"},{k:"berry",icon:"●"},{k:"resin",icon:"✦"},{k:"petal",icon:"✿"},{k:"crystal",icon:"◇"}];document.getElementById("bag-grid").innerHTML=items.map(i=>`<article class="bag-item"><b class="${i.k}">${i.icon}</b><strong>${state.resources[i.k]}</strong><small>${rewardNames[i.k]}</small></article>`).join("")+Object.values(regionOrders).filter(order=>state.stock[order.product]>0).map(order=>`<article class="bag-item"><img src="${source[order.product]}" alt=""><strong>${state.stock[order.product]}</strong><small>${recipes[order.product].name}</small></article>`).join("")}
function syncUI(){
 document.getElementById("energy-count").textContent=state.energy;
 document.getElementById("energy-max-count").textContent=state.maxEnergy;
 document.getElementById("bag-acorn-count").textContent=state.acorns;
 document.getElementById("day-count").textContent=state.day;
 document.getElementById("friends-count").textContent=`친구 ${chicks.length}`;
 const score=environmentScore(),next=score<2?`주민·선호 가구·친밀함 ${score}/2 → 작업대·가게`:score<5?`주민·선호 가구·친밀함 ${score}/5 → 눈꽃 길`:score<8?"주민·선호 가구·친밀함 → 기운 한도 증가":"기운 한도 성장 완료";
 document.getElementById("growth-title").textContent=`마을 성장 ${state.level}단계 · 기운 최대 ${state.maxEnergy}`;
 document.getElementById("growth-detail").textContent=next;
 const status=document.getElementById("habitat-status"),localGuest=!!state.guest&&guestArea()===state.area;
 status.textContent=localGuest?"손님 만나기":state.guest?"다른 지역에 손님":visitorReady()?"새 발자국":nestCount(state.area)?"흔적 살펴보기":"빈 둥지 준비";
 const habitatButton=document.getElementById("habitat-button");habitatButton.hidden=!state.guest&&!nestCount(state.area);habitatButton.classList.toggle("guest",localGuest);
 renderQuests();renderHabitat();renderBridge();renderBag();renderRecipes()
}
function openSheet(id){closeSheets();if(id==="build-sheet")renderRecipes();if(id==="quest-sheet")renderQuests();if(id==="bag-sheet")renderBag();if(id==="habitat-sheet")renderHabitat();if(id==="bridge-sheet")renderBridge();if(id==="region-sheet")renderRegions();if(id==="market-sheet")renderMarket();document.getElementById(id).hidden=false}
function closeSheets(){document.querySelectorAll(".bottom-sheet").forEach(sheet=>sheet.hidden=true)}
function toast(message){const el=document.getElementById("toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),1900)}
function speak(message){const el=document.getElementById("speech-bubble");el.textContent=message;el.classList.add("show");clearTimeout(speak.timer);speak.timer=setTimeout(()=>el.classList.remove("show"),1900)}
function onCanvas(event){if(state.intro)return;const p=canvasPoint(event);if(state.buildMode){placeFacility(p.x,p.y);return}if(p.x>=242&&p.x<=346&&p.y>=197&&p.y<=252){travel();return}const project=projectAt(p);if(project){useWorldProject(project);return}const hit=hitWorld(p);if(!hit){speak("자연물을 채집하거나 빈 둥지를 지어 첫 병아리를 맞이해 보세요.");return}if(hit.kind==="guest")openGuest();else if(hit.kind==="chick")openFriend(hit.item);else if(hit.kind==="facility")useFacility(hit.item);else gather(hit.item)}
canvas.addEventListener("pointerdown",event=>{event.preventDefault();onCanvas(event)});canvas.addEventListener("pointermove",event=>{if(state.buildMode){const p=canvasPoint(event),next=tileAt(p.x,p.y)||null;if(next?.id!==state.pointer?.id){state.placementArmed=false;document.getElementById("place-confirm").hidden=true}state.pointer=next;updatePlacementHint();render()}});
document.getElementById("start-game").onclick=()=>{state.intro=false;document.getElementById("intro-card").hidden=true;toast("첫 병아리는 아직 없어요. 빈 둥지를 준비해 주세요.");saveGame()};
document.getElementById("build-button").onclick=()=>openSheet("build-sheet");document.getElementById("bag-button").onclick=()=>openSheet("bag-sheet");document.getElementById("friends-button").onclick=()=>openFriend();document.getElementById("quest-button").onclick=()=>openSheet("quest-sheet");document.getElementById("habitat-button").onclick=()=>state.guest?openGuest():openSheet("habitat-sheet");document.getElementById("guest-welcome-button").onclick=welcomeGuest;document.getElementById("cancel-build").onclick=cancelBuild;
document.getElementById("place-confirm").onclick=()=>{if(state.buildMode&&state.placementArmed&&state.pointer)placeFacility(state.pointer.x,state.pointer.y,true)};
document.getElementById("furniture-preview-button").onclick=()=>{if(state.selectedFurniture)selectRecipe(state.selectedFurniture)};
document.querySelectorAll("[data-build-tab]").forEach(button=>button.onclick=()=>{state.buildTab=button.dataset.buildTab;renderRecipes()});
document.getElementById("day-button").onclick=nextDay;document.getElementById("repair-button").onclick=repairBridge;
document.getElementById("restart-button").onclick=event=>{const button=event.currentTarget;if(!button.classList.contains("armed")){button.classList.add("armed");button.textContent="진행 기록 삭제 · 한 번 더 누르기";clearTimeout(button.resetTimer);button.resetTimer=setTimeout(()=>{button.classList.remove("armed");button.textContent="처음부터 새로 시작"},5000);return}state.discardingSave=true;localStorage.removeItem("chick-village-save-v2");location.reload()};
document.addEventListener("visibilitychange",()=>{if(document.hidden&&!state.intro&&!state.discardingSave)saveGame()});addEventListener("pagehide",()=>{if(!state.intro&&!state.discardingSave)saveGame()});
document.querySelectorAll("[data-close]").forEach(button=>button.onclick=()=>document.getElementById(button.dataset.close).hidden=true);document.querySelectorAll("[data-friend-action]").forEach(button=>button.onclick=()=>friendAction(button.dataset.friendAction));
document.addEventListener("keydown",event=>{if(event.key==="Escape"){closeSheets();cancelBuild()}});addEventListener("resize",resize);
window.advanceTime=ms=>{for(let i=0,n=Math.max(1,Math.round(ms/(1000/60)));i<n;i++)update(1/60);render()};
window.render_game_to_text=()=>JSON.stringify({
 coordinate_system:"portrait canvas 390x844; origin top-left",mode:state.intro?"intro":state.buildMode?`placing ${state.buildMode}`:"explore",area:state.area,
 day:state.day,timeSlot:timeSlot(),energy:`${state.energy}/${state.maxEnergy}`,resources:state.resources,acorns:state.acorns,dailyCare:state.dailyCare,dailySkills:state.dailySkills,
 regions:Object.keys(regions).map(id=>({id,open:regionOpen(id)})),environment:{level:state.level,score:environmentScore(),satisfied:satisfactionCount(),closeFriends:chicks.filter(c=>(state.bonds[c.id]||0)>=3).length},
 projects:{forestTrailFound:state.forestTrailFound,groveBloomed:state.groveBloomed,icePlayground:state.icePlayground,photoTaken:state.photoTaken,visible:visibleProjects()},
 habitat:{nests:nestCount(state.area),nestLimit:nestLimit(),residents:chicks.filter(c=>c.homeArea===state.area).length,allResidents:chicks.length,caredToday:!!state.caredAreas[state.area],candidates:readyCandidates().map(({info,nest})=>({id:info.id,nestId:nest.id,signs:leadFor(info.id).signs})),chance:encounterChance(),guest:guestArea()===state.area?state.guest:null,guestArea:guestArea(),lastEncounter:state.lastEncounter},
 market:{placed:facilities.some(f=>f.type==="market"),stock:state.stock,orderCounts:state.orderCounts,orders:Object.entries(regionOrders).map(([id,order])=>({region:id,open:regionOpen(id),material:order.material,needed:2,owned:state.resources[order.material],product:order.product,ready:regionOpen(id)&&state.orderDays[id]!==state.day&&state.resources[order.material]>=2}))},
 bridge:{repaired:state.bridgeRepaired,conditions:bridgeConditions()},quests:questData().map((q,index)=>({...q,rewarded:state.claimedQuests.includes(index)})),
 obstacles:activeEntities().filter(e=>e.hp>0).map(e=>({id:e.id,type:e.type,x:Math.round(e.x),y:Math.round(e.y),hp:`${e.hp}/${e.maxHp}`})),
 grid:{buildable:buildTilesFor().length,available:buildTilesFor().filter(tile=>!tileOccupied(tile)).length,nature:currentTiles().filter(tile=>tile.kind==="nature").map(tile=>({id:tile.id,x:tile.x,y:tile.y})),selected:state.pointer?.id||null},
 furniture:{selected:state.selectedFurniture,placing:state.buildMode,armed:state.placementArmed,hint:state.buildMode?placementMood(state.buildMode,state.pointer):null},
 facilities:facilities.filter(f=>f.area===state.area).map(f=>({id:f.id,type:f.type,area:f.area,tileId:f.tileId,occupant:f.occupant||null,upgraded:!!f.upgraded,x:Math.round(f.x),y:Math.round(f.y),ready:f.cooldown<=state.clock,revealing:!!f.revealAt&&state.clock-f.revealAt<3})),
 chicks:chicks.filter(c=>c.homeArea===state.area).map(c=>({id:c.id,name:c.name,homeArea:c.homeArea,x:Math.round(c.x),y:Math.round(c.y),activity:c.activity?.status||"idle",doing:activityLabel(c),destination:c.activity?{x:c.activity.x,y:c.activity.y}:null,bond:state.bonds[c.id]||0,joinedToday:!!state.dailyBond[c.id]}))
});
function saveGame(){try{localStorage.setItem("chick-village-save-v2",JSON.stringify({schema:10,profileId:state.profileId,day:state.day,dayClock:state.dayClock,area:state.area,energy:state.energy,resources:state.resources,acorns:state.acorns,stock:state.stock,orderDays:state.orderDays,orderCounts:state.orderCounts,claimedQuests:state.claimedQuests,dailyCleanup:state.dailyCleanup,dailyCare:state.dailyCare,caredAreas:state.caredAreas,dailySkills:state.dailySkills,dailyBond:state.dailyBond,bonds:state.bonds,leads:state.leads,encounterMisses:state.encounterMisses,rngSeed:state.rngSeed,guest:state.guest,lastEncounter:state.lastEncounter,cleared:state.cleared,forestCleared:state.forestCleared,groveCleared:state.groveCleared,snowCleared:state.snowCleared,plays:state.plays,happiness:state.happiness,xp:state.xp,level:state.level,bridgeRepaired:state.bridgeRepaired,forestTrailFound:state.forestTrailFound,groveBloomed:state.groveBloomed,icePlayground:state.icePlayground,photoTaken:state.photoTaken,chickIds:chicks.map(c=>c.id),chickStates:chicks.map(c=>({id:c.id,homeArea:c.homeArea,x:c.x,y:c.y,activityCount:c.activityCount})),facilities:facilities.map(({id,type,area,tileId,x,y,size,occupant,upgraded})=>({id,type,area,tileId,x,y,size,occupant,upgraded})),obstacles:Object.values(regionEntities).flat().map(({id,hp})=>({id,hp}))}))}catch{}}
function restoreGame(){try{
 const raw=localStorage.getItem("chick-village-save-v2");if(!raw)return;const saved=JSON.parse(raw);
 for(const key of["day","area","energy","cleared","forestCleared","groveCleared","snowCleared","plays","happiness","xp","level","bridgeRepaired"])if(saved[key]!==undefined)state[key]=saved[key];
 state.dayClock=Number.isFinite(saved.dayClock)?Math.max(0,saved.dayClock):0;
 state.profileId=saved.profileId||state.profileId;state.acorns=Number.isFinite(saved.acorns)?Math.max(0,saved.acorns):0;
 for(const key of Object.keys(state.stock))if(Number.isInteger(saved.stock?.[key]))state.stock[key]=Math.max(0,saved.stock[key]);
 for(const id of Object.keys(regionOrders)){if(Number.isInteger(saved.orderDays?.[id]))state.orderDays[id]=saved.orderDays[id];if(Number.isInteger(saved.orderCounts?.[id]))state.orderCounts[id]=Math.max(0,saved.orderCounts[id])}
 state.dailyCleanup=!!saved.dailyCleanup;state.dailyCare=!!saved.dailyCare||(saved.schema<5&&!!saved.dailyCleanup);
 state.caredAreas=saved.caredAreas&&typeof saved.caredAreas==="object"?saved.caredAreas:state.dailyCare?{[state.area]:true}:{};
 state.dailySkills=saved.dailySkills&&typeof saved.dailySkills==="object"?saved.dailySkills:{};
 state.dailyBond=saved.dailyBond&&typeof saved.dailyBond==="object"?saved.dailyBond:{};
 state.bonds=saved.bonds&&typeof saved.bonds==="object"?saved.bonds:{};
 state.leads=saved.leads&&typeof saved.leads==="object"?saved.leads:{};
 state.encounterMisses=Number.isInteger(saved.encounterMisses)?Math.max(0,saved.encounterMisses):0;
 state.rngSeed=Number.isInteger(saved.rngSeed)?saved.rngSeed>>>0:state.rngSeed;
 state.lastEncounter=typeof saved.lastEncounter==="string"?saved.lastEncounter:"";
 for(const key of Object.keys(state.resources))if(Number.isFinite(saved.resources?.[key]))state.resources[key]=saved.resources[key];
 for(const data of saved.obstacles||[]){const target=Object.values(regionEntities).flat().find(e=>e.id===data.id);if(target){target.hp=data.hp;target.fade=data.hp<=0?0:undefined}}
 const used=new Set();for(const data of saved.facilities||[]){if(!recipes[data.type])continue;const area=regions[data.area]?data.area:"village";let tile=buildTilesFor(area).find(t=>t.id===data.tileId&&!used.has(t.id));if(!tile)tile=nearestFreeTile(Number(data.x)||205,Number(data.y)||505,used,area);if(!tile)continue;used.add(tile.id);facilities.push({...data,area,x:tile.x,y:tile.y,tileId:tile.id,size:recipes[data.type].size,cooldown:0})}
 const ids=Array.isArray(saved.chickIds)?saved.chickIds:(saved.visitorArrived?["base","scout","builder"]:[]);
 for(const id of ids){const info=chickCatalog.find(c=>c.id===id);if(!info)continue;let nest=facilities.find(f=>f.type==="nest"&&f.occupant===id);if(!nest){const savedArea=saved.chickStates?.find(c=>c.id===id)?.homeArea;const area=regions[savedArea]?savedArea:saved.schema<10?"village":info.homeArea||"village";nest=facilities.find(f=>f.type==="nest"&&f.area===area&&!f.occupant);if(!nest){const tile=nearestFreeTile(205,505,used,area);if(tile){used.add(tile.id);nest={id:`nest-migrated-${id}`,type:"nest",area,x:tile.x,y:tile.y,tileId:tile.id,size:recipes.nest.size,cooldown:0};facilities.push(nest)}}}addChick(id,true,nest?.id)}
 for(const data of saved.chickStates||[]){const chick=chicks.find(c=>c.id===data.id);if(chick){if(Number.isFinite(data.x))chick.x=Math.max(35,Math.min(355,data.x));if(Number.isFinite(data.y))chick.y=Math.max(300,Math.min(730,data.y));chick.activityCount=Number.isInteger(data.activityCount)?Math.max(0,data.activityCount):0}}
 state.forestTrailFound=!!saved.forestTrailFound||(saved.schema<7&&hasChick("scout")&&state.forestCleared>=3);
 state.groveBloomed=!!saved.groveBloomed||(saved.schema<7&&hasChick("leaf")&&state.groveCleared>=3);
 state.icePlayground=!!saved.icePlayground;state.photoTaken=!!saved.photoTaken;
 if(saved.guest&&chickCatalog.some(c=>c.id===saved.guest.id)&&facilities.some(f=>f.id===saved.guest.nestId&&f.type==="nest"&&!f.occupant))state.guest={id:saved.guest.id,nestId:saved.guest.nestId,arrivedDay:Number(saved.guest.arrivedDay)||state.day,phase:saved.guest.phase||"request"};
 if(saved.schema<8&&!state.guest)for(const candidate of readyCandidates())leadFor(candidate.info.id).signs=Math.min(3,state.encounterMisses);
 state.claimedQuests=Array.isArray(saved.claimedQuests)?saved.claimedQuests.filter(id=>Number.isInteger(id)&&id>=0&&id<questData().length):questData().flatMap((q,index)=>q.current>=q.goal?[index]:[]);
 if(!Number.isFinite(saved.acorns)&&saved.schema<4)state.acorns=state.claimedQuests.length*2;
 if(!regions[state.area]||!regionOpen(state.area))state.area="village";
 updateEnvironmentLevel(false,true);state.visitorPending=visitorReady();state.intro=false;document.getElementById("intro-card").hidden=true;document.getElementById("area-name").textContent=regions[state.area].name
}catch{}}
state.profileId=globalThis.crypto?.randomUUID?.()||`local-${Date.now()}`;restoreGame();load().then(()=>{resize();syncUI()});let previous=performance.now();function loop(now){update(Math.min(.034,(now-previous)/1000));previous=now;render();requestAnimationFrame(loop)}requestAnimationFrame(loop);
})();
