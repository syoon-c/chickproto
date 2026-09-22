(function () {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

  const state = {
    mode: "play",
    day: 1,
    energy: 12,
    maxEnergy: 12,
    level: 1,
    xp: 0,
    resources: { grass: 0, twig: 0, stone: 0 },
    inventory: { cushion: 0, lamp: 0 },
    placed: { cushion: false, lamp: false },
    selectedPlace: null,
    chickArrived: false,
    bridgeFixed: false,
    cleaned: 0,
    clock: 0,
    sound: false,
    hintsSeen: false,
    particles: [],
  };

  const obstacles = [
    { id: "bush-1", type: "bush", x: 185, y: 385, r: 42, reward: { grass: 2, twig: 1 }, label: "엉킨 풀더미", active: true },
    { id: "branch-1", type: "branch", x: 310, y: 490, r: 40, reward: { twig: 3, grass: 1 }, label: "마른 나뭇가지", active: true },
    { id: "rock-1", type: "rock", x: 490, y: 430, r: 42, reward: { stone: 3 }, label: "돌무더기", active: true },
    { id: "bush-2", type: "bush", x: 760, y: 218, r: 38, reward: { grass: 3, twig: 1 }, label: "웃자란 풀", active: true },
    { id: "branch-2", type: "branch", x: 680, y: 510, r: 38, reward: { twig: 3 }, label: "떠내려온 가지", active: true },
    { id: "rock-2", type: "rock", x: 825, y: 455, r: 40, reward: { stone: 3, grass: 1 }, label: "깨진 돌조각", active: true },
  ];

  const recipes = {
    cushion: { name: "꽃잎 방석", cost: { grass: 3, twig: 1 }, description: "폭신한 풀잎과 꽃으로 만든 둥지 방석" },
    lamp: { name: "반딧불 등불", cost: { twig: 2, stone: 1 }, description: "해가 져도 둥지 곁을 밝혀 주는 작은 등불" },
  };

  const placementSpots = {
    cushion: { x: 612, y: 353, r: 38 },
    lamp: { x: 695, y: 330, r: 34 },
  };

  const bridge = { x: 878, y: 323, r: 72, cost: { twig: 3, stone: 3 } };

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform((rect.width / W) * dpr, 0, 0, (rect.height / H) * dpr, 0, 0);
    render();
  }

  function roundedRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, rr);
  }

  function ellipse(x, y, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawWorld() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#b8dc9e"); sky.addColorStop(1, "#88bf79");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = 0.15;
    for (let y = 20; y < H; y += 52) for (let x = 20 + ((y / 52) % 2) * 20; x < W; x += 55) {
      ellipse(x, y, 3, 8, "#ffffff");
    }
    ctx.globalAlpha = 1;

    // River
    ctx.fillStyle = "#78bfd3";
    ctx.beginPath();
    ctx.moveTo(830, -20); ctx.bezierCurveTo(780, 125, 900, 190, 835, 300); ctx.bezierCurveTo(785, 390, 905, 485, 840, 670);
    ctx.lineTo(1040, 670); ctx.lineTo(1040, -20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.44)"; ctx.lineWidth = 5; ctx.lineCap = "round";
    [[875,82,948,95],[848,173,936,186],[868,430,956,442],[846,540,918,553]].forEach(l=>{ctx.beginPath();ctx.moveTo(l[0],l[1]);ctx.quadraticCurveTo((l[0]+l[2])/2,l[1]-8,l[2],l[3]);ctx.stroke();});

    // Paths
    ctx.strokeStyle = "#dccb9b"; ctx.lineWidth = 72; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(95, 575); ctx.quadraticCurveTo(310, 340, 535, 390); ctx.quadraticCurveTo(690, 420, 825, 320); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.2)"; ctx.lineWidth = 5; ctx.setLineDash([2,14]);
    ctx.beginPath(); ctx.moveTo(95,575);ctx.quadraticCurveTo(310,340,535,390);ctx.quadraticCurveTo(690,420,825,320);ctx.stroke();ctx.setLineDash([]);

    drawTrees();
    drawWorkshop();
    drawNest();
    drawBridge();
    obstacles.filter(o => o.active).forEach(drawObstacle);
    drawChick(452, 320 + Math.sin(state.clock * 2) * 3, "#f6ca4c", "콩이", false);
    if (state.chickArrived) drawChick(598, 286 + Math.sin(state.clock * 2 + 1) * 3, "#f2bb45", "모루", true);
    drawParticles();
  }

  function drawTrees() {
    const trees = [[65,110,.95],[170,78,.75],[290,105,.9],[440,76,.7],[585,105,.92],[720,72,.72],[95,275,.68],[340,240,.62],[760,520,.7],[535,555,.72],[155,535,.7]];
    trees.forEach(([x,y,s],i)=>{
      ctx.fillStyle="#7b583d";roundedRect(x-9*s,y+22*s,18*s,39*s,8*s);ctx.fill();
      ellipse(x,y,42*s,38*s,i%2?"#4f8b59":"#5e985c"); ellipse(x-25*s,y+9*s,29*s,27*s,"#69a667"); ellipse(x+25*s,y+8*s,27*s,25*s,"#477f50");
      ellipse(x-13*s,y-12*s,25*s,22*s,"rgba(255,255,255,.1)");
    });
  }

  function drawWorkshop() {
    ctx.save(); ctx.translate(250,220);
    ellipse(0,66,96,28,"rgba(48,73,34,.16)");
    ctx.fillStyle="#fff1c4";roundedRect(-68,-8,136,78,13);ctx.fill();
    ctx.fillStyle="#d87848";ctx.beginPath();ctx.moveTo(-82,1);ctx.lineTo(0,-62);ctx.lineTo(82,1);ctx.closePath();ctx.fill();
    ctx.fillStyle="#a9553c";roundedRect(-7,22,34,48,6);ctx.fill();
    ctx.fillStyle="#78a8b8";roundedRect(-50,17,28,26,6);ctx.fill();
    ctx.fillStyle="#fff";ctx.globalAlpha=.35;ctx.fillRect(-44,20,4,20);ctx.globalAlpha=1;
    ctx.fillStyle="#d6b369";roundedRect(70,40,67,22,6);ctx.fill();ctx.fillStyle="#80633e";ctx.fillRect(80,60,7,22);ctx.fillRect(120,60,7,22);
    ctx.restore();
  }

  function drawNest() {
    const x=640,y=355;
    ellipse(x,y+43,102,29,"rgba(48,73,34,.16)");
    ctx.strokeStyle="#b47c43";ctx.lineWidth=12;ctx.lineCap="round";
    ctx.beginPath();ctx.arc(x,y+8,66,.12*Math.PI,.88*Math.PI);ctx.stroke();
    ctx.beginPath();ctx.arc(x,y+6,52,.08*Math.PI,.92*Math.PI);ctx.stroke();
    ctx.strokeStyle="#dec18b";ctx.lineWidth=4;for(let i=-45;i<=45;i+=15){ctx.beginPath();ctx.moveTo(x+i,y+16);ctx.lineTo(x+i*1.25,y+36);ctx.stroke();}
    if (state.placed.cushion) { ellipse(placementSpots.cushion.x,placementSpots.cushion.y+8,35,18,"#e8a45c");ellipse(placementSpots.cushion.x,placementSpots.cushion.y+2,7,7,"#f5e4b0"); }
    else drawPlacementSpot("cushion");
    if (state.placed.lamp) drawLamp(placementSpots.lamp.x,placementSpots.lamp.y);
    else drawPlacementSpot("lamp");
  }

  function drawPlacementSpot(type) {
    const s=placementSpots[type];
    ctx.save();ctx.strokeStyle=state.selectedPlace===type?"#f6c94f":"rgba(255,255,255,.72)";ctx.lineWidth=4;ctx.setLineDash([7,7]);ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle="rgba(255,255,255,.82)";ctx.font="900 24px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("+",s.x,s.y);ctx.restore();
  }

  function drawLamp(x,y){ctx.save();ctx.shadowColor="rgba(255,220,92,.65)";ctx.shadowBlur=18;ctx.fillStyle="#f5cf56";roundedRect(x-12,y-22,24,29,7);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle="#6d5237";ctx.lineWidth=4;ctx.stroke();ctx.fillStyle="#6d5237";ctx.fillRect(x-2,y+7,4,18);ctx.restore();}

  function drawBridge() {
    const x=bridge.x,y=bridge.y;
    if(state.bridgeFixed){
      ctx.strokeStyle="#7a5235";ctx.lineWidth=9;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x-68,y-30);ctx.lineTo(x+72,y-30);ctx.moveTo(x-68,y+30);ctx.lineTo(x+72,y+30);ctx.stroke();
      for(let i=-58;i<=58;i+=19){ctx.fillStyle=i%38===0?"#c98c4f":"#db9e59";roundedRect(x+i,y-39,15,78,4);ctx.fill();}
      ctx.fillStyle="#ffffff";ctx.globalAlpha=.8;ctx.font="900 16px sans-serif";ctx.textAlign="center";ctx.fillText("물안개 습지",x,y-58);ctx.globalAlpha=1;
    } else {
      ctx.strokeStyle="#795238";ctx.lineWidth=8;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x-67,y-25);ctx.lineTo(x-20,y-15);ctx.moveTo(x+22,y+20);ctx.lineTo(x+68,y+28);ctx.stroke();
      [-57,-38,-17,26,47,65].forEach((dx,i)=>{ctx.save();ctx.translate(x+dx,y+(i<3?-9:8));ctx.rotate((i-2)*.05);ctx.fillStyle="#c88b4e";roundedRect(-7,-30,15,59,4);ctx.fill();ctx.restore();});
      ctx.fillStyle="rgba(53,46,36,.82)";roundedRect(x-49,y-74,98,32,10);ctx.fill();ctx.fillStyle="#fff";ctx.font="800 14px sans-serif";ctx.textAlign="center";ctx.fillText(state.chickArrived?"수리 가능":"건축 특기 필요",x,y-53);
    }
  }

  function drawObstacle(o) {
    ctx.save();ctx.translate(o.x,o.y);ellipse(0,18,o.r*.9,o.r*.32,"rgba(46,72,33,.17)");
    if(o.type==="bush"){
      [0,1,2,3,4].forEach((_,i)=>{const a=i/5*Math.PI*2;ellipse(Math.cos(a)*17,Math.sin(a)*10-2,24,18,i%2?"#578e4d":"#699e58")});
      ctx.strokeStyle="#a27b43";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-20,20);ctx.lineTo(18,-18);ctx.moveTo(-18,-13);ctx.lineTo(19,19);ctx.stroke();
    } else if(o.type==="branch"){
      ctx.strokeStyle="#805637";ctx.lineWidth=10;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-34,16);ctx.lineTo(33,-15);ctx.moveTo(-6,4);ctx.lineTo(-17,-21);ctx.moveTo(14,-7);ctx.lineTo(31,11);ctx.stroke();
    } else {
      ellipse(-13,5,26,21,"#8e968d");ellipse(16,9,24,19,"#a2a69e");ellipse(4,-10,20,17,"#7f8981");
    }
    ctx.strokeStyle="rgba(255,255,255,.75)";ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.arc(0,0,o.r+6,0,Math.PI*2);ctx.stroke();ctx.restore();
  }

  function drawChick(x,y,color,name,helmet){
    ctx.save();ctx.translate(x,y);ellipse(0,32,30,10,"rgba(48,73,34,.16)");ellipse(0,0,27,31,color);
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(-22,2,13,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(22,2,13,0,Math.PI*2);ctx.fill();
    if(helmet){ctx.fillStyle="#d88745";ctx.beginPath();ctx.arc(0,-12,25,Math.PI,0);ctx.lineTo(25,-8);ctx.lineTo(-25,-8);ctx.closePath();ctx.fill();ctx.fillStyle="#bd6e36";roundedRect(-29,-10,58,7,3);ctx.fill();}
    ctx.fillStyle="#342f27";ellipse(-9,-3,3,4,"#342f27");ellipse(9,-3,3,4,"#342f27");ctx.fillStyle="#ef7f40";ctx.beginPath();ctx.moveTo(-6,5);ctx.lineTo(7,5);ctx.lineTo(0,12);ctx.closePath();ctx.fill();
    ctx.fillStyle="rgba(255,255,255,.9)";roundedRect(-27,39,54,20,10);ctx.fill();ctx.fillStyle="#4b4439";ctx.font="800 12px sans-serif";ctx.textAlign="center";ctx.fillText(name,0,53);ctx.restore();
  }

  function drawParticles(){
    state.particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ellipse(p.x,p.y,p.size,p.size,p.color)});ctx.globalAlpha=1;
  }

  function update(dt){
    state.clock+=dt;
    state.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=30*dt;p.life-=dt*1.4});
    state.particles=state.particles.filter(p=>p.life>0);
  }

  function render(){drawWorld();}

  function addParticles(x,y,color){for(let i=0;i<14;i++){const a=Math.random()*Math.PI*2;state.particles.push({x,y,vx:Math.cos(a)*(30+Math.random()*60),vy:Math.sin(a)*(30+Math.random()*60)-40,life:1,size:3+Math.random()*4,color});}}

  function gainXP(amount){
    state.xp+=amount;
    const next=state.level===1?30:80;
    if(state.level<3&&state.xp>=next){state.level++;showToast(`환경 레벨이 ${state.level}이 되었습니다`);}
  }

  function interactAt(x,y){
    if(state.mode!=="play") return;
    if(state.selectedPlace){
      const s=placementSpots[state.selectedPlace];
      if(Math.hypot(x-s.x,y-s.y)<=s.r+15){placeItem(state.selectedPlace);return;}
      showHint("점선으로 표시된 둥지 자리를 눌러주세요");return;
    }
    const obstacle=obstacles.find(o=>o.active&&Math.hypot(x-o.x,y-o.y)<=o.r+12);
    if(obstacle){cleanObstacle(obstacle);return;}
    if(Math.hypot(x-bridge.x,y-bridge.y)<=bridge.r){tryRepairBridge();return;}
    showHint("점선이 있는 자연물을 눌러 정리할 수 있어요");
  }

  function cleanObstacle(o){
    if(state.energy<=0){showToast("행동 에너지가 부족합니다");return;}
    state.energy--;o.active=false;state.cleaned++;
    Object.entries(o.reward).forEach(([k,v])=>state.resources[k]+=v);
    gainXP(8);addParticles(o.x,o.y,o.type==="rock"?"#d9ded5":"#dff0a7");
    showToast(`${o.label} 정리 완료 · ${rewardText(o.reward)}`);syncUI();
  }

  function rewardText(reward){return Object.entries(reward).map(([k,v])=>`${resourceName(k)} +${v}`).join(" · ");}
  function resourceName(k){return {grass:"풀잎",twig:"나뭇가지",stone:"돌멩이"}[k];}
  function hasCost(cost){return Object.entries(cost).every(([k,v])=>state.resources[k]>=v);}
  function payCost(cost){Object.entries(cost).forEach(([k,v])=>state.resources[k]-=v);}

  function craft(type){
    const recipe=recipes[type];if(!hasCost(recipe.cost)){showToast("재료가 조금 더 필요합니다");return;}
    payCost(recipe.cost);state.inventory[type]++;gainXP(10);showToast(`${recipe.name}을 만들었습니다`);syncUI();
  }

  function selectPlacement(type){state.selectedPlace=type;activateTab("tasks");showHint(`${recipes[type].name}을 놓을 점선 자리를 눌러주세요`,2200);render();}
  function placeItem(type){
    if(state.inventory[type]<=0||state.placed[type])return;
    state.inventory[type]--;state.placed[type]=true;state.selectedPlace=null;gainXP(12);addParticles(placementSpots[type].x,placementSpots[type].y,"#fff3a9");showToast(`${recipes[type].name}을 배치했습니다`);syncUI();
    if(state.placed.cushion&&state.placed.lamp&&!state.chickArrived){setTimeout(triggerArrival,650);}
  }

  function triggerArrival(){state.chickArrived=true;state.mode="arrival";document.getElementById("arrival-card").hidden=false;gainXP(15);syncUI();}
  function closeArrival(){state.mode="play";document.getElementById("arrival-card").hidden=true;showHint("모루와 함께 끊어진 다리를 눌러보세요",2400);render();}

  function tryRepairBridge(){
    if(state.bridgeFixed){showToast("물안개 습지로 가는 길이 열려 있습니다");return;}
    if(!state.chickArrived){showToast("다리를 고칠 수 있는 친구가 필요합니다");return;}
    if(!hasCost(bridge.cost)){showToast(`수리 재료가 부족합니다 · 나뭇가지 ${bridge.cost.twig}, 돌멩이 ${bridge.cost.stone}`);activateTab("tasks");return;}
    payCost(bridge.cost);state.bridgeFixed=true;state.level=3;state.xp=100;addParticles(bridge.x,bridge.y,"#fff3a9");state.mode="complete";document.getElementById("completion-card").hidden=false;syncUI();
  }

  function showHint(message,duration=1500){const el=document.getElementById("tool-chip");el.textContent=message;el.classList.add("show");clearTimeout(showHint.timer);showHint.timer=setTimeout(()=>el.classList.remove("show"),duration);}
  function showToast(message){const el=document.getElementById("toast");el.textContent=message;el.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.classList.remove("show"),1900);}

  function syncUI(){
    document.getElementById("level-value").textContent=state.level;
    ["grass","twig","stone"].forEach(k=>document.getElementById(`${k}-count`).textContent=state.resources[k]);
    const energy=document.getElementById("energy-pips");energy.innerHTML=Array.from({length:state.maxEnergy},(_,i)=>`<i class="${i<state.energy?"on":""}"></i>`).join("");energy.setAttribute("aria-label",`행동 에너지 ${state.energy}`);
    const steps=[
      {done:state.cleaned>=3,text:`환경 정리 ${Math.min(state.cleaned,3)} / 3`},
      {done:state.placed.cushion&&state.placed.lamp,text:"햇살 둥지 완성"},
      {done:state.bridgeFixed,text:"나무다리 복구"},
    ];
    document.getElementById("quest-steps").innerHTML=steps.map(s=>`<div class="quest-step ${s.done?"done":""}"><i></i><span>${s.text}</span></div>`).join("");
    document.getElementById("requirements").innerHTML=[
      {k:"nest",n:"빈 둥지",done:true},{k:"cushion",n:"꽃잎 방석",done:state.placed.cushion},{k:"lamp",n:"반딧불 등불",done:state.placed.lamp}
    ].map(r=>`<div class="requirement ${r.done?"done":""}"><span class="req-icon ${r.k}"></span>${r.n}</div>`).join("");
    const doneCount=1+(state.placed.cushion?1:0)+(state.placed.lamp?1:0);document.getElementById("habitat-progress").textContent=`${doneCount} / 3`;

    const action=document.getElementById("quest-action");
    if(state.bridgeFixed){action.textContent="물안개 습지 길 열림";action.disabled=true;}
    else if(state.chickArrived){action.textContent="다리 복구하기";action.disabled=false;}
    else if(state.cleaned>=3){action.textContent="서식지 물건 만들기";action.disabled=false;}
    else {action.textContent="정리할 곳 보기";action.disabled=false;}

    document.getElementById("recipe-list").innerHTML=Object.entries(recipes).map(([key,r])=>{
      const placed=state.placed[key],owned=state.inventory[key]>0,ready=hasCost(r.cost);
      const cost=Object.entries(r.cost).map(([k,v])=>`${resourceName(k)} ${v}`).join(" · ");
      const label=placed?"배치 완료":owned?"둥지에 놓기":ready?"만들기":"재료 부족";
      const cls=owned?"place":ready?"ready":"";
      return `<article class="recipe"><div class="recipe-visual ${key}"></div><div><h3>${r.name}</h3><p>${r.description}</p><p>${cost}</p></div><button class="${cls}" data-recipe="${key}" ${placed||(!owned&&!ready)?"disabled":""}>${label}</button></article>`;
    }).join("");
    document.querySelectorAll("[data-recipe]").forEach(btn=>btn.addEventListener("click",()=>state.inventory[btn.dataset.recipe]>0?selectPlacement(btn.dataset.recipe):craft(btn.dataset.recipe)));

    document.getElementById("friend-count").textContent=state.chickArrived?"2 / 2":"1 / 2";
    document.getElementById("friend-list").innerHTML=`
      <article class="friend"><div class="friend-avatar"><i></i></div><div><h3>콩이</h3><p class="skill">특기 · 채집</p><p>풀숲에서 재료를 더 잘 찾아요.</p></div></article>
      <article class="friend ${state.chickArrived?"":"locked"}"><div class="friend-avatar"><i></i></div><div><h3>${state.chickArrived?"모루":"아직 만나지 못한 친구"}</h3><p class="skill">${state.chickArrived?"특기 · 건축":"햇살 둥지를 완성해 보세요"}</p><p>${state.chickArrived?"튼튼한 시설을 함께 지을 수 있어요.":"포근하고 밝은 곳을 좋아하는 것 같아요."}</p></div></article>`;
    render();
  }

  function activateTab(name){document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===name));document.querySelectorAll(".tab-view").forEach(v=>v.classList.toggle("active",v.id===`tab-${name}`));}

  canvas.addEventListener("pointerdown",e=>{
    const rect=canvas.getBoundingClientRect();const x=(e.clientX-rect.left)/rect.width*W;const y=(e.clientY-rect.top)/rect.height*H;interactAt(x,y);
  });
  document.querySelectorAll(".tab").forEach(t=>t.addEventListener("click",()=>activateTab(t.dataset.tab)));
  document.getElementById("quest-action").addEventListener("click",()=>{
    if(state.bridgeFixed)return;
    if(state.chickArrived){tryRepairBridge();return;}
    if(state.cleaned>=3){activateTab("craft");showToast("방석과 등불을 차례로 만들어 주세요");return;}
    const o=obstacles.find(o=>o.active);if(o)showHint(`${o.label}을 눌러주세요`,2200);
  });
  document.getElementById("welcome-button").addEventListener("click",closeArrival);
  document.getElementById("arrival-close").addEventListener("click",closeArrival);
  document.getElementById("continue-button").addEventListener("click",()=>{state.mode="play";document.getElementById("completion-card").hidden=true;showToast("물안개 습지는 다음 프로토타입에서 열립니다");});
  document.getElementById("help-button").addEventListener("click",()=>document.getElementById("help-modal").hidden=false);
  document.getElementById("help-close").addEventListener("click",()=>document.getElementById("help-modal").hidden=true);
  document.getElementById("help-start").addEventListener("click",()=>{document.getElementById("help-modal").hidden=true;showHint("점선이 있는 자연물을 눌러 정리해 보세요",2400);});
  document.getElementById("sound-button").addEventListener("click",e=>{state.sound=!state.sound;e.currentTarget.classList.toggle("muted",!state.sound);e.currentTarget.setAttribute("aria-label",state.sound?"소리 끄기":"소리 켜기");showToast(state.sound?"효과음을 켰습니다":"효과음을 껐습니다");});
  document.addEventListener("keydown",e=>{
    if(e.key>="1"&&e.key<="3")activateTab(["tasks","craft","friends"][Number(e.key)-1]);
    if(e.key.toLowerCase()==="f"){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();}
    if(e.key==="Escape"&&state.selectedPlace){state.selectedPlace=null;syncUI();}
  });
  window.addEventListener("resize",resizeCanvas);
  document.addEventListener("fullscreenchange",()=>setTimeout(resizeCanvas,50));

  window.advanceTime=function(ms){const steps=Math.max(1,Math.round(ms/(1000/60)));for(let i=0;i<steps;i++)update(1/60);render();};
  window.render_game_to_text=function(){
    const available=obstacles.filter(o=>o.active).map(o=>({id:o.id,label:o.label,x:o.x,y:o.y,reward:o.reward}));
    let next="점선이 있는 자연물을 눌러 정리하세요.";
    if(state.cleaned>=3&&!state.placed.cushion)next=state.inventory.cushion?"햇살 둥지의 방석 자리를 눌러 배치하세요.":"제작 탭에서 꽃잎 방석을 만드세요.";
    else if(state.placed.cushion&&!state.placed.lamp)next=state.inventory.lamp?"햇살 둥지의 등불 자리를 눌러 배치하세요.":"제작 탭에서 반딧불 등불을 만드세요.";
    else if(state.chickArrived&&!state.bridgeFixed)next="새 친구 모루와 함께 오른쪽의 끊어진 다리를 수리하세요.";
    else if(state.bridgeFixed)next="버들숲 복구 완료. 물안개 습지로 가는 길이 열렸습니다.";
    return JSON.stringify({coordinate_system:"canvas 1000x640; origin top-left; x right, y down",mode:state.mode,day:state.day,energy:`${state.energy}/${state.maxEnergy}`,environment_level:state.level,resources:{...state.resources},active_obstacles:available,habitat:{empty_nest:true,cushion:state.placed.cushion,lamp:state.placed.lamp},friends:state.chickArrived?["콩이: 채집","모루: 건축"]:["콩이: 채집"],bridge:{fixed:state.bridgeFixed,x:bridge.x,y:bridge.y,requires:state.bridgeFixed?null:{...bridge.cost,building_friend:true}},selected_for_placement:state.selectedPlace,next_action:next});
  };

  syncUI();resizeCanvas();
  let last=performance.now();
  function loop(now){const dt=Math.min(.034,(now-last)/1000);last=now;update(dt);render();requestAnimationFrame(loop);}requestAnimationFrame(loop);
})();
