// 식당아리 Chick Bistro — 프로토타입
// 기획서 기준: 핵심 루프 + 설치 + 테마 + 레시피 연구
//
// 좌표계: 캔버스 480x1040 (모바일 9:19.5), 원점 좌상단

// ===== 상수 =====
const GAME_W = 480;
const GAME_H = 1040;
const FIXED_DT = 1 / 60;

const SAVE_KEY = "chick-bistro-prototype-v1";

// 레시피 카탈로그 (icon_library 기반)
const RECIPE_LIB = (window.RECIPE_ICON_LIBRARY?.entries || []);
const RECIPE_NAME_BY_ID = {};
RECIPE_LIB.forEach((entry) => {
  RECIPE_NAME_BY_ID[entry.recipeId] = entry.recipeName;
});

// 등급 분류 (기획서: 평범한 요리 / 멋진 요리 / 특별한 요리)
const RECIPE_RARITY = {
  // 평범한 요리 (basic) - 8종, 가중치 높음
  salad:   { rarity: "basic", weight: 14, basePrice: 60,  baseCook: 4 },
  sandwich:{ rarity: "basic", weight: 14, basePrice: 80,  baseCook: 5 },
  hotdog:  { rarity: "basic", weight: 12, basePrice: 90,  baseCook: 5 },
  soup:    { rarity: "basic", weight: 12, basePrice: 100, baseCook: 6 },
  omelet:  { rarity: "basic", weight: 12, basePrice: 110, baseCook: 6 },
  kimbap:  { rarity: "basic", weight: 10, basePrice: 130, baseCook: 7 },
  friedrice:{ rarity: "basic", weight: 10, basePrice: 150, baseCook: 7 },
  wedges:  { rarity: "basic", weight: 10, basePrice: 140, baseCook: 6 },
  // 멋진 요리 (rare) - 9종
  skewers: { rarity: "rare", weight: 6, basePrice: 200, baseCook: 8 },
  pizza:   { rarity: "rare", weight: 6, basePrice: 240, baseCook: 9 },
  burger:  { rarity: "rare", weight: 6, basePrice: 220, baseCook: 8 },
  bibimbap:{ rarity: "rare", weight: 5, basePrice: 260, baseCook: 9 },
  pasta:   { rarity: "rare", weight: 5, basePrice: 280, baseCook: 10 },
  taco:    { rarity: "rare", weight: 5, basePrice: 250, baseCook: 9 },
  ramen:   { rarity: "rare", weight: 5, basePrice: 290, baseCook: 10 },
  friednoodles:{ rarity: "rare", weight: 5, basePrice: 270, baseCook: 9 },
  curry:   { rarity: "rare", weight: 5, basePrice: 300, baseCook: 10 },
  grilledfish:{ rarity: "rare", weight: 5, basePrice: 280, baseCook: 9 },
  tonkatsu:{ rarity: "rare", weight: 5, basePrice: 310, baseCook: 10 },
  dimsum:  { rarity: "rare", weight: 5, basePrice: 260, baseCook: 9 },
  // 특별한 요리 (epic) - 5종
  chicken: { rarity: "epic", weight: 2, basePrice: 460, baseCook: 12 },
  gnocchi: { rarity: "epic", weight: 2, basePrice: 480, baseCook: 12 },
  sushi:   { rarity: "epic", weight: 2, basePrice: 520, baseCook: 13 },
  bulgogi: { rarity: "epic", weight: 2, basePrice: 500, baseCook: 13 },
  steak:   { rarity: "epic", weight: 1, basePrice: 600, baseCook: 14 },
};

const RECIPE_LIST = Object.keys(RECIPE_RARITY).filter((id) => RECIPE_NAME_BY_ID[id]);

const RARITY_LABEL = {
  basic: "평범한 요리",
  rare:  "멋진 요리",
  epic:  "특별한 요리",
};

// 강화 단계별 효과 (기획서: 별 최대까지 상승, 더 이상 연구에서 등장 X)
const MAX_STARS = 5;
function priceMultiplierForStars(stars) {
  return 1 + stars * 0.22;
}
function cookMultiplierForStars(stars) {
  return Math.max(0.4, 1 - stars * 0.1);
}

// 연구 비용: 100 + (5회 구간 × 150) + (현재 구간 순번 × 20)
function researchCostForCount(count) {
  const bigStep = Math.floor(count / 5);
  const smallStep = count % 5;
  return 100 + bigStep * 150 + smallStep * 20;
}

// 메뉴별 천장 (기획서: 처음 획득 메뉴에만 천장, 메뉴마다 다른 절대 횟수)
// 평범한 요리는 일찍, 특별한 요리는 늦게 천장 발동
const RECIPE_PITY = {
  // basic 메뉴는 1~2회 안에 거의 다 자연스럽게 뜨지만 보장값
  salad: 2, sandwich: 3, hotdog: 4, soup: 5, omelet: 6,
  kimbap: 8, friedrice: 10, wedges: 12,
  // rare 멋진 요리
  skewers: 16, pizza: 20, burger: 24, bibimbap: 28, pasta: 32,
  taco: 36, ramen: 40, friednoodles: 44, curry: 48, grilledfish: 52,
  tonkatsu: 56, dimsum: 60,
  // epic 특별한 요리
  chicken: 70, gnocchi: 82, sushi: 95, bulgogi: 110, steak: 130,
};

// 시설 좌표 + 설치 시퀀스 (InstallFacility.json 17종 모두)
// 부엌 뒷줄 (camera-pan 영역, y ~155)
const BACKROW_SLOTS = {
  countertop: { id: "countertop", x: 90,  y: 155, w: 80, h: 80 },  // 도마테이블
  sink:       { id: "sink",       x: 188, y: 155, w: 80, h: 80 },  // 싱크대
  fridge:     { id: "fridge",     x: 286, y: 155, w: 80, h: 80 },  // 냉장고
  toolbox:    { id: "toolbox",    x: 386, y: 155, w: 80, h: 80 },  // 조리도구함
};
// 화구 줄 (y ~285)
const STOVE_SLOTS = [
  { id: "stove-1", x: 105, y: 285 },
  { id: "stove-2", x: 197, y: 285 },
  { id: "stove-3", x: 289, y: 285 },
  { id: "stove-4", x: 381, y: 285 },
];
// 테이블 (2x2, y 530/700)
const TABLE_SLOTS = [
  { id: "table-1", x: 160, y: 540 },
  { id: "table-2", x: 320, y: 540 },
  { id: "table-3", x: 160, y: 700 },
  { id: "table-4", x: 320, y: 700 },
];
// 단일 시설들
const SINGLE_SLOTS = {
  entrance:  { id: "entrance",  x: 240, y: 860, w: 120, h: 120 },
  stage:     { id: "stage",     x: 80,  y: 850, w: 90,  h: 90 },
  tipbox:    { id: "tipbox",    x: 400, y: 850, w: 70,  h: 80 },
  lighting:  { id: "lighting",  x: 420, y: 95,  w: 60,  h: 70 },
  fence:     { id: "fence",     x: 240, y: 1018, w: 480, h: 22 },
};
const CHEF_HOME = { x: 240, y: 380 };
const ENTRANCE = SINGLE_SLOTS.entrance;
// 줄서기 큐 위치 — 출입구 바로 앞에 일렬 (x 고정, y만 다름)
const QUEUE_SLOTS = [
  { x: 240, y: 945 },
  { x: 240, y: 970 },
  { x: 240, y: 995 },
  { x: 240, y: 1020 },
];

// 설치 시퀀스 — InstallFacility.json 17종 (시작: stove-1, table-1 보유)
// sequence 1=table-1, 5=stove-1 은 시작 보유라 제외
const INSTALL_SEQUENCE = [
  { kind: "table",  slotId: "table-2",   title: "2번 테이블",   desc: "한 번에 받을 수 있는 손님이 늘어난다.", cost: 50 },
  { kind: "table",  slotId: "table-3",   title: "3번 테이블",   desc: "중반 처리량을 받쳐줄 좌석이 추가된다.", cost: 80 },
  { kind: "table",  slotId: "table-4",   title: "4번 테이블",   desc: "한 줄을 더 깔끔하게 채울 수 있다.",     cost: 120 },
  { kind: "stove",  slotId: "stove-2",   title: "2번 조리기구", desc: "동시에 조리할 수 있는 주문이 늘어난다.", cost: 150 },
  { kind: "stove",  slotId: "stove-3",   title: "3번 조리기구", desc: "주문이 몰릴 때 대기 시간이 줄어든다.", cost: 220 },
  { kind: "stove",  slotId: "stove-4",   title: "4번 조리기구", desc: "고급 메뉴까지 동시에 굴린다.",         cost: 320 },
  { kind: "single", slotId: "entrance",  title: "출입구",       desc: "손님이 더 자주 찾아온다.",             cost: 200 },
  { kind: "single", slotId: "stage",     title: "무대",         desc: "수익에 보너스 효과가 추가된다.",       cost: 280 },
  { kind: "single", slotId: "tipbox",    title: "팁박스",       desc: "추가 도토리를 모을 수 있다.",          cost: 360 },
  { kind: "back",   slotId: "fridge",    title: "냉장고",       desc: "재료 효율을 올린다.",                  cost: 460 },
  { kind: "back",   slotId: "sink",      title: "싱크대",       desc: "조리 시간이 단축된다.",                cost: 580 },
  { kind: "back",   slotId: "countertop",title: "도마 테이블",  desc: "조리 정확도를 높인다.",                cost: 720 },
  { kind: "back",   slotId: "toolbox",   title: "조리도구함",   desc: "고급 메뉴 해금 속도가 빨라진다.",      cost: 880 },
  { kind: "single", slotId: "lighting",  title: "조명",         desc: "분위기 보너스가 적용된다.",            cost: 999 },
  { kind: "single", slotId: "fence",     title: "울타리",       desc: "전체 인테리어 점수가 오른다.",         cost: 1000 },
];
const INSTALL_VISIBLE_AHEAD = 2; // 한 번에 보이는 후보 수

// 테마 정의 — ThemeFacility.json 기준 (6개 테마, 각 시설 종류마다 분리 구매)
// 통화: 101=도토리, 102=보석
const THEME_LIST = [
  { id: "stone",    name: "대충 돌 식당",   themeNo: 1, costAcorn: 0,   costGem: 0,  boost: 0.0 },
  { id: "wood",     name: "아늑한 나무 식당", themeNo: 2, costAcorn: 100, costGem: 0,  boost: 0.10 },
  { id: "camping",  name: "스카우트 캠핑장", themeNo: 3, costAcorn: 100, costGem: 0,  boost: 0.20 },
  { id: "italy",    name: "이태리 피제리아", themeNo: 4, costAcorn: 100, costGem: 0,  boost: 0.20 },
  { id: "summer",   name: "초여름 그해",     themeNo: 6, costAcorn: 100, costGem: 0,  boost: 0.20 },
  { id: "cherry",   name: "벚꽃 떨어질 즈음", themeNo: 7, costAcorn: 0,   costGem: 10, boost: 0.40 },
];

function buildThemeDefs(prefix) {
  // prefix = "Table" | "Stove" | "Entrance" | "CounterTop"
  const suffix = { stone: "Stone", wood: "Wood", camping: "Camping", italy: "Italy", summer: "BlueWhite", cherry: "CherryBlossom" };
  return THEME_LIST.map((t) => ({
    id: t.id,
    name: t.name,
    icon: `Icon/Facility/Icon_Facility_${prefix}_${suffix[t.id]}.png`,
    costAcorn: t.costAcorn,
    costGem: t.costGem,
    boost: t.boost,
  }));
}

const THEME_DEFS = {
  table:      buildThemeDefs("Table"),
  stove:      buildThemeDefs("Stove"),
  entrance:   buildThemeDefs("Entrance"),
  countertop: buildThemeDefs("CounterTop"),
  sink:       buildThemeDefs("Sink"),
  fridge:     buildThemeDefs("Fridge"),
  toolbox:    buildThemeDefs("Kitchenware"),
  stage:      buildThemeDefs("Stage"),
  tipbox:     buildThemeDefs("TipBox"),
  lighting:   buildThemeDefs("Lighting"),
  fence:      buildThemeDefs("Fence"),
};
// 슬롯 ID → 테마 키 매핑
const SLOT_THEME_KEY = {
  countertop: "countertop", sink: "sink", fridge: "fridge", toolbox: "toolbox",
  entrance: "entrance", stage: "stage", tipbox: "tipbox", lighting: "lighting", fence: "fence",
};
const FACILITY_KEYS_ALL = ["table","stove","entrance","countertop","sink","fridge","toolbox","stage","tipbox","lighting","fence"];

// ===== 상태 =====
function createInitialState() {
  return {
    clock: 0,
    resources: { acorns: 260, gems: 0 },
    promo: { progress: 0, threshold: 5, pendingSpawns: 0, lastClick: 0 },

    facilities: {
      tables: [{ slotId: "table-1" }],   // 시작: 테이블 1개
      stoves: [{ slotId: "stove-1" }],   // 시작: 화구 1개
      singles: [],                       // {slotId} for entrance/stage/tipbox/lighting/fence
      backrow: [],                       // {slotId} for fridge/sink/countertop/toolbox
    },
    installIndex: 0,    // 다음 설치할 시퀀스 번호
    installCheckpoints: 0, // 클리어한 설치 수

    themes: {
      table: "stone",
      stove: "stone",
      entrance: "stone",
      countertop: "stone",
      sink: "stone",
      fridge: "stone",
      toolbox: "stone",
      stage: "stone",
      tipbox: "stone",
      lighting: "stone",
      fence: "stone",
    },
    themesOwned: (() => {
      const o = {};
      for (const k of FACILITY_KEYS_ALL) o[k] = ["stone"];
      return o;
    })(),

    recipes: (() => {
      const owned = {};
      // 시작: 샐러드 1성으로 보유
      owned.salad = { stars: 1, dupes: 0 };
      return owned;
    })(),
    researchCount: 0,

    customers: [],     // {id, state, x, y, vx, recipeId, tableId, timer, total}
    cookingTasks: [],  // {stoveId, recipeId, customerId, tableId, progress, duration}
    customerSeq: 1,

    chef: { x: CHEF_HOME.x, y: CHEF_HOME.y, anim: 0, mode: "idle" }, // mode: idle|cook|research

    metrics: { served: 0, researched: 0 },

    ui: {
      installCandidateId: null,   // 어느 후보 말풍선이 떠 있나
      chefBubbleOpen: false,
      panel: null,                 // 'recipe' | 'theme'
      eventModal: null,            // { type:'research'|'enhance', payload }
    },
  };
}

let state = loadState() || createInitialState();

// ===== 유틸 =====
function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // 간단한 머지: 누락 필드는 기본값으로 채움
    const initial = createInitialState();
    const merged = Object.assign(initial, data, {
      ui: createInitialState().ui,    // UI는 매번 초기화
      customers: [],                  // 손님 진행 상태는 초기화
      cookingTasks: [],
      promo: { ...initial.promo, ...(data.promo || {}), threshold: 5 },
      chef: { ...initial.chef },
    });
    // 테마 마이그레이션: 신규 THEME_DEFS에 없는 ID는 기본값(stone)으로
    if (!merged.themes) merged.themes = {};
    if (!merged.themesOwned) merged.themesOwned = {};
    for (const k of FACILITY_KEYS_ALL) {
      if (!merged.themes[k] || !THEME_DEFS[k].some((t) => t.id === merged.themes[k])) {
        merged.themes[k] = "stone";
      }
      if (!Array.isArray(merged.themesOwned[k])) merged.themesOwned[k] = ["stone"];
      if (!merged.themesOwned[k].includes("stone")) merged.themesOwned[k].push("stone");
      // 현재 적용된 테마는 자동으로 소유에 추가
      if (!merged.themesOwned[k].includes(merged.themes[k])) {
        merged.themesOwned[k].push(merged.themes[k]);
      }
    }
    // 시설 마이그레이션
    if (!merged.facilities) merged.facilities = { tables: [{slotId:"table-1"}], stoves: [{slotId:"stove-1"}], singles: [], backrow: [] };
    if (!Array.isArray(merged.facilities.singles)) merged.facilities.singles = [];
    if (!Array.isArray(merged.facilities.backrow)) merged.facilities.backrow = [];
    const validTableIds = new Set(TABLE_SLOTS.map((s) => s.id));
    const validStoveIds = new Set(STOVE_SLOTS.map((s) => s.id));
    const validSingleIds = new Set(Object.keys(SINGLE_SLOTS));
    const validBackIds = new Set(Object.keys(BACKROW_SLOTS));
    merged.facilities.tables  = merged.facilities.tables.filter((f) => validTableIds.has(f.slotId));
    merged.facilities.stoves  = merged.facilities.stoves.filter((f) => validStoveIds.has(f.slotId));
    merged.facilities.singles = merged.facilities.singles.filter((f) => validSingleIds.has(f.slotId));
    merged.facilities.backrow = merged.facilities.backrow.filter((f) => validBackIds.has(f.slotId));
    // installIndex를 이미 설치된 슬롯 너머로 정렬
    merged.installIndex = 0;
    while (
      merged.installIndex < INSTALL_SEQUENCE.length &&
      isSlotInstalledIn(merged.facilities, INSTALL_SEQUENCE[merged.installIndex])
    ) {
      merged.installIndex += 1;
    }
    // 레시피 필드 마이그레이션: _dupePending → dupes, MAX_STARS 클램프
    if (merged.recipes && typeof merged.recipes === "object") {
      for (const id of Object.keys(merged.recipes)) {
        const r = merged.recipes[id];
        if (!r || typeof r !== "object") { delete merged.recipes[id]; continue; }
        if (r._dupePending != null && r.dupes == null) {
          r.dupes = r._dupePending;
        }
        delete r._dupePending;
        if (typeof r.dupes !== "number" || r.dupes < 0) r.dupes = 0;
        if (typeof r.stars !== "number") r.stars = 1;
        if (r.stars > MAX_STARS) r.stars = MAX_STARS;
      }
    }
    return merged;
  } catch {
    return null;
  }
}
function saveState() {
  try {
    const snapshot = JSON.parse(JSON.stringify(state));
    snapshot.customers = [];
    snapshot.cookingTasks = [];
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
  } catch {}
}
function resetState() {
  localStorage.removeItem(SAVE_KEY);
  state = createInitialState();
  refreshHud();
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return "0";
  if (n < 1000) return String(Math.floor(n));
  // 기획서: 4자리 이상은 소문자 알파벳 단위 (a, b, c, ...) 소수 둘째
  const units = ["", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"];
  let unit = 0;
  let v = n;
  while (v >= 1000 && unit < units.length - 1) {
    v /= 1000;
    unit += 1;
  }
  let str = v.toFixed(2);
  // 0.X 형태 정리
  if (str.endsWith(".00")) str = str.slice(0, -3);
  else if (str.endsWith("0")) str = str.slice(0, -1);
  return str + units[unit];
}

function rng(min, max) {
  return Math.random() * (max - min) + min;
}
function pickWeighted(items, weightFn) {
  const total = items.reduce((s, it) => s + weightFn(it), 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= weightFn(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

// ===== 캔버스 =====
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
let dpr = 1;

function configureCanvas() {
  dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = GAME_W * dpr;
  canvas.height = GAME_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}

// 이미지 캐시
const imgCache = new Map();
function getImage(path) {
  if (!path) return null;
  if (imgCache.has(path)) return imgCache.get(path);
  const img = new Image();
  img.src = path;
  imgCache.set(path, img);
  return img;
}
function drawImageScaled(img, x, y, w, h) {
  if (!img || !img.complete || img.naturalWidth === 0) return false;
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  return true;
}

// ===== 좌표/터치 헬퍼 =====
function getCanvasPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = GAME_W / rect.width;
  const sy = GAME_H / rect.height;
  return {
    x: (clientX - rect.left) * sx,
    y: (clientY - rect.top) * sy,
    rect,
  };
}

// 캔버스 좌표 → 화면 px 좌표 (오버레이 위치용)
function canvasToScreen(cx, cy) {
  const rect = canvas.getBoundingClientRect();
  const frame = document.querySelector(".phone-frame").getBoundingClientRect();
  const sx = rect.width / GAME_W;
  const sy = rect.height / GAME_H;
  return {
    x: rect.left - frame.left + cx * sx,
    y: rect.top - frame.top + cy * sy,
  };
}

// ===== 헬퍼: 시설/설치 =====
function slotMeta(kind, slotId) {
  if (kind === "table") return TABLE_SLOTS.find((s) => s.id === slotId);
  if (kind === "stove") return STOVE_SLOTS.find((s) => s.id === slotId);
  if (kind === "single") return SINGLE_SLOTS[slotId];
  if (kind === "back") return BACKROW_SLOTS[slotId];
  return null;
}
function isSlotInstalledIn(facilities, cand) {
  const arr = cand.kind === "table" ? facilities.tables
            : cand.kind === "stove" ? facilities.stoves
            : cand.kind === "single" ? facilities.singles
            : cand.kind === "back" ? facilities.backrow
            : [];
  return arr.some((f) => f.slotId === cand.slotId);
}
function isSlotInstalled(kind, slotId) {
  return isSlotInstalledIn(state.facilities, { kind, slotId });
}
function getInstallCandidates() {
  // 이미 설치된 슬롯은 건너뛰고 순서상 다음 N개만 노출
  const out = [];
  let idx = state.installIndex;
  while (idx < INSTALL_SEQUENCE.length && out.length < INSTALL_VISIBLE_AHEAD) {
    const cand = INSTALL_SEQUENCE[idx];
    if (!isSlotInstalled(cand.kind, cand.slotId)) {
      out.push({ ...cand, index: idx });
    }
    idx += 1;
  }
  return out;
}
function candidateBox(cand) {
  const slot = slotMeta(cand.kind, cand.slotId);
  if (!slot) return null;
  let w, h;
  if (cand.kind === "table") { w = 96; h = 78; }
  else if (cand.kind === "stove") { w = 78; h = 78; }
  else if (cand.kind === "back") { w = slot.w; h = slot.h; }
  else { w = slot.w; h = slot.h; }
  return { x: slot.x, y: slot.y, w, h };
}
function findCandidateAt(cx, cy) {
  for (const cand of getInstallCandidates()) {
    const b = candidateBox(cand);
    if (!b) continue;
    if (cx >= b.x - b.w/2 && cx <= b.x + b.w/2 && cy >= b.y - b.h/2 && cy <= b.y + b.h/2) {
      return cand;
    }
  }
  return null;
}
function installCandidate(cand) {
  if (state.resources.acorns < cand.cost) {
    showToast("도토리가 부족합니다.");
    return;
  }
  if (isSlotInstalled(cand.kind, cand.slotId)) {
    state.ui.installCandidateId = null;
    refreshHud();
    return;
  }
  state.resources.acorns -= cand.cost;
  if (cand.kind === "table") state.facilities.tables.push({ slotId: cand.slotId });
  else if (cand.kind === "stove") state.facilities.stoves.push({ slotId: cand.slotId });
  else if (cand.kind === "single") state.facilities.singles.push({ slotId: cand.slotId });
  else if (cand.kind === "back") state.facilities.backrow.push({ slotId: cand.slotId });
  // installIndex를 이미 설치된 슬롯들 너머로 진전
  while (
    state.installIndex < INSTALL_SEQUENCE.length &&
    isSlotInstalled(INSTALL_SEQUENCE[state.installIndex].kind, INSTALL_SEQUENCE[state.installIndex].slotId)
  ) {
    state.installIndex += 1;
  }
  state.installCheckpoints += 1;
  state.ui.installCandidateId = null;
  saveState();
  refreshHud();
  showToast(`${cand.title} 설치 완료!`);
}

// ===== 헬퍼: 손님/주문 =====
const SEATS_PER_TABLE = 2;
function tableSeatOffset(seat) {
  // seat: 0(좌), 1(우) — 테이블 앞쪽(아래) 좌우로 앉음
  return seat === 0 ? { dx: -24, dy: 32 } : { dx: 24, dy: 32 };
}
function findFreeTable() {
  // 테이블 + 빈 좌석 인덱스 반환
  for (const f of state.facilities.tables) {
    const used = new Set(
      state.customers
        .filter((c) => c.tableId === f.slotId && c.seat != null)
        .map((c) => c.seat)
    );
    for (let s = 0; s < SEATS_PER_TABLE; s += 1) {
      if (!used.has(s)) return { table: f, seat: s };
    }
  }
  return null;
}
function findFreeStove() {
  for (const f of state.facilities.stoves) {
    const busy = state.cookingTasks.some((t) => t.stoveId === f.slotId);
    if (!busy) return f;
  }
  return null;
}
function spawnCustomer() {
  const found = findFreeTable();
  if (!found) {
    state.promo.pendingSpawns += 1;
    return;
  }
  const slot = slotMeta("table", found.table.slotId);
  const off = tableSeatOffset(found.seat);
  const ownedIds = Object.keys(state.recipes).filter((id) => state.recipes[id]?.stars > 0);
  const recipeId = ownedIds[Math.floor(Math.random() * ownedIds.length)] || "salad";
  state.customers.push({
    id: `c${state.customerSeq++}`,
    state: "walking",
    x: ENTRANCE.x,
    y: ENTRANCE.y + 30,
    targetX: slot.x + off.dx,
    targetY: slot.y + off.dy,
    recipeId,
    tableId: found.table.slotId,
    seat: found.seat,
    timer: 0,
    total: 0,
    bob: Math.random() * Math.PI * 2,
    color: pickCustomerColor(),
  });
}
function pickCustomerColor() {
  const palette = ["#ffd54f", "#ff9e7a", "#94d66d", "#f29bd0", "#8ecdf6", "#f6c14f"];
  return palette[Math.floor(Math.random() * palette.length)];
}

function tryStartCooking() {
  // 주문이 접수된 손님 찾고 비어 있는 화구로 보냄
  for (const cust of state.customers) {
    if (cust.state !== "ordered") continue;
    const stove = findFreeStove();
    if (!stove) return;
    const recipe = RECIPE_RARITY[cust.recipeId];
    const stars = state.recipes[cust.recipeId]?.stars || 1;
    const duration = Math.max(1.5, recipe.baseCook * cookMultiplierForStars(stars));
    state.cookingTasks.push({
      stoveId: stove.slotId,
      recipeId: cust.recipeId,
      customerId: cust.id,
      tableId: cust.tableId,
      progress: 0,
      duration,
    });
    cust.state = "waiting";
    cust.timer = 0;
  }
}

function orderBubblePos(cust) {
  const slot = slotMeta("table", cust.tableId);
  const off = tableSeatOffset(cust.seat ?? 0);
  return { x: slot.x + off.dx, y: slot.y + off.dy - 56 };
}
function acceptOrderAt(cx, cy) {
  for (const cust of state.customers) {
    if (cust.state !== "awaiting_order") continue;
    const b = orderBubblePos(cust);
    if (cx >= b.x - 32 && cx <= b.x + 32 && cy >= b.y - 28 && cy <= b.y + 28) {
      cust.state = "ordered";
      cust.timer = 0;
      return true;
    }
  }
  return false;
}

// ===== 시뮬레이션 =====
function update(dt) {
  state.clock += dt;
  state.chef.anim += dt;

  // 손님 업데이트
  for (const cust of state.customers) {
    cust.bob += dt;
    if (cust.state === "walking") {
      const dx = cust.targetX - cust.x;
      const dy = cust.targetY - cust.y;
      const d = Math.hypot(dx, dy);
      const speed = 110;
      if (d <= speed * dt) {
        cust.x = cust.targetX;
        cust.y = cust.targetY;
        cust.state = "awaiting_order";
        cust.timer = 0;
      } else {
        cust.x += (dx / d) * speed * dt;
        cust.y += (dy / d) * speed * dt;
      }
    } else if (cust.state === "awaiting_order") {
      // 주문 대기 (UI 처리)
    } else if (cust.state === "waiting") {
      // 조리 대기
    } else if (cust.state === "eating") {
      cust.timer += dt;
      if (cust.timer >= cust.total) {
        // 식사 완료 → 결제
        const recipe = RECIPE_RARITY[cust.recipeId];
        const stars = state.recipes[cust.recipeId]?.stars || 1;
        const themeBoost = totalThemeBoost();
        const payout = Math.round(recipe.basePrice * priceMultiplierForStars(stars) * (1 + themeBoost));
        state.resources.acorns += payout;
        state.metrics.served += 1;
        spawnPayoutToast(cust, payout);
        cust.state = "leaving";
        cust.targetX = ENTRANCE.x;
        cust.targetY = ENTRANCE.y + 60;
      }
    } else if (cust.state === "leaving") {
      const dx = cust.targetX - cust.x;
      const dy = cust.targetY - cust.y;
      const d = Math.hypot(dx, dy);
      const speed = 130;
      if (d <= speed * dt) {
        cust.x = cust.targetX;
        cust.y = cust.targetY;
        cust._done = true;
      } else {
        cust.x += (dx / d) * speed * dt;
        cust.y += (dy / d) * speed * dt;
      }
    }
  }
  state.customers = state.customers.filter((c) => !c._done);

  // 펜딩 스폰 처리
  if (state.promo.pendingSpawns > 0 && findFreeTable()) {
    state.promo.pendingSpawns -= 1;
    spawnCustomer();
  }

  // 조리 진행
  for (const task of state.cookingTasks) {
    task.progress += dt;
    if (task.progress >= task.duration) {
      // 자동 서빙
      const cust = state.customers.find((c) => c.id === task.customerId);
      if (cust) {
        cust.state = "eating";
        cust.timer = 0;
        cust.total = 3.4; // 식사 시간
      }
      task._done = true;
    }
  }
  state.cookingTasks = state.cookingTasks.filter((t) => !t._done);

  // 요리사: 항상 정위치 — 조리는 화구가 자동으로 처리
  // (기획서: 요리사는 연구 전용, 조리는 각 조리기구에서 자동)
  const dx = CHEF_HOME.x - state.chef.x;
  const dy = CHEF_HOME.y - state.chef.y;
  const d = Math.hypot(dx, dy);
  if (d > 0.5) {
    state.chef.x += (dx / d) * Math.min(120 * dt, d);
    state.chef.y += (dy / d) * Math.min(120 * dt, d);
  }
  state.chef.mode = state.ui.chefBubbleOpen ? "research" : "idle";

  tryStartCooking();
  pruneToasts();
}

function totalThemeBoost() {
  // 설치된 시설의 테마 보너스 합산 (기획서: 시설별 테마가 곱적용 → 단순 합산으로 근사)
  let sum = 0;
  // 항상 카운팅: table, stove, entrance(있을 때), backrow installed, singles installed
  sum += THEME_DEFS.table.find((t) => t.id === state.themes.table).boost;
  sum += THEME_DEFS.stove.find((t) => t.id === state.themes.stove).boost;
  for (const f of state.facilities.singles) {
    const k = SLOT_THEME_KEY[f.slotId];
    if (k && THEME_DEFS[k]) sum += THEME_DEFS[k].find((t) => t.id === state.themes[k]).boost;
  }
  for (const f of state.facilities.backrow) {
    const k = SLOT_THEME_KEY[f.slotId];
    if (k && THEME_DEFS[k]) sum += THEME_DEFS[k].find((t) => t.id === state.themes[k]).boost;
  }
  return sum;
}

// ===== 토스트 =====
const toasts = [];
function showToast(text) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = text;
  document.getElementById("toast-area").appendChild(node);
  toasts.push({ node, until: performance.now() + 2200 });
}
function pruneToasts() {
  const now = performance.now();
  while (toasts.length && toasts[0].until <= now) {
    const t = toasts.shift();
    t.node.remove();
  }
}

const payoutFx = []; // {x, y, value, age}
function spawnPayoutToast(cust, value) {
  payoutFx.push({ x: cust.x, y: cust.y - 60, value, age: 0 });
}

// ===== 렌더링 =====
function draw() {
  ctx.clearRect(0, 0, GAME_W, GAME_H);
  drawBackground();
  drawDecorBack();
  drawBackrow();
  drawStoves();
  drawChef();
  drawTables();
  drawSingles();
  drawCustomers();
  drawQueue();
  drawCookingFood();
  drawDottedZones();
  drawEntrance();
  drawPayoutFx();
}

function drawBackground() {
  // 풀밭
  const grad = ctx.createLinearGradient(0, 0, 0, GAME_H);
  grad.addColorStop(0, "#759c4f");
  grad.addColorStop(1, "#83a85a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // 부엌 영역 (위쪽, 뒷줄 + 화구 줄)
  ctx.fillStyle = "#a99066";
  ctx.fillRect(0, 80, GAME_W, 260);
  ctx.fillStyle = "rgba(80, 60, 30, 0.22)";
  ctx.fillRect(0, 336, GAME_W, 4);

  // 부엌-손님 구역 사이 돌길
  ctx.fillStyle = "#c8b88a";
  ctx.fillRect(GAME_W/2 - 60, 340, 120, 90);

  // 손님 영역 (중앙)
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.beginPath();
  ctx.ellipse(GAME_W / 2, 620, 230, 200, 0, 0, Math.PI * 2);
  ctx.fill();

  // 출입구로 이어지는 길 — 문 앞 큐 영역까지
  ctx.fillStyle = "#c8b88a";
  ctx.fillRect(GAME_W/2 - 36, 800, 72, 220);

  // 나무
  drawTree(28, 50, 32);
  drawTree(GAME_W - 28, 50, 32);
  drawTree(20, 820, 30);
  drawTree(GAME_W - 22, 820, 32);
  drawTree(36, 1000, 26);
  drawTree(GAME_W - 36, 1000, 28);
}
function drawTree(cx, cy, r) {
  ctx.fillStyle = "#3e6a3a";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(20, 60, 22, 0.35)";
  ctx.beginPath();
  ctx.arc(cx + r * 0.3, cy + r * 0.35, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
}

function drawDecorBack() {
  // 부엌 뒷벽
  ctx.fillStyle = "#7d5d36";
  ctx.fillRect(0, 80, GAME_W, 12);
}

function drawBackrow() {
  // 설치된 뒷줄 시설(도마/싱크/냉장고/조리도구함)
  for (const f of state.facilities.backrow) {
    const slot = BACKROW_SLOTS[f.slotId];
    if (!slot) continue;
    const themeKey = SLOT_THEME_KEY[f.slotId];
    const themeDef = THEME_DEFS[themeKey].find((t) => t.id === state.themes[themeKey]);
    const img = getImage(themeDef.icon);
    drawShadow(slot.x, slot.y + slot.h/2 - 4, slot.w * 0.45, 7);
    if (!drawImageScaled(img, slot.x, slot.y, slot.w, slot.h)) {
      ctx.fillStyle = "#b8946d";
      ctx.fillRect(slot.x - slot.w/2, slot.y - slot.h/2, slot.w, slot.h);
    }
  }
}

function drawSingles() {
  // 무대/팁박스/조명/울타리 등 설치된 단일 시설 (출입구는 별도 함수)
  for (const f of state.facilities.singles) {
    if (f.slotId === "entrance") continue; // 출입구는 drawEntrance에서
    const slot = SINGLE_SLOTS[f.slotId];
    if (!slot) continue;
    const themeKey = SLOT_THEME_KEY[f.slotId];
    const themeDef = THEME_DEFS[themeKey].find((t) => t.id === state.themes[themeKey]);
    const img = getImage(themeDef.icon);
    if (f.slotId !== "fence") drawShadow(slot.x, slot.y + slot.h/2 - 6, slot.w * 0.4, 8);
    if (!drawImageScaled(img, slot.x, slot.y, slot.w, slot.h)) {
      ctx.fillStyle = "#9a7a4c";
      ctx.fillRect(slot.x - slot.w/2, slot.y - slot.h/2, slot.w, slot.h);
    }
  }
}

function drawStoves() {
  const theme = THEME_DEFS.stove.find((t) => t.id === state.themes.stove);
  const img = getImage(theme.icon);
  for (const stove of state.facilities.stoves) {
    const slot = slotMeta("stove", stove.slotId);
    if (!slot) continue;
    drawShadow(slot.x, slot.y + 30, 36, 8);
    if (!drawImageScaled(img, slot.x, slot.y, 78, 78)) {
      ctx.fillStyle = "#7a5a36";
      ctx.fillRect(slot.x - 30, slot.y - 30, 60, 60);
    }
    // 조리중 불꽃
    const task = state.cookingTasks.find((t) => t.stoveId === slot.slotId);
    if (task) {
      const t = state.clock * 8;
      ctx.fillStyle = `rgba(255, 160, 50, ${0.6 + Math.sin(t) * 0.2})`;
      ctx.beginPath();
      ctx.arc(slot.x, slot.y - 14, 6 + Math.sin(t * 0.7) * 1.5, 0, Math.PI * 2);
      ctx.fill();
      // 진행 바
      const w = 44, h = 5, ratio = task.progress / task.duration;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(slot.x - w/2, slot.y + 38, w, h);
      ctx.fillStyle = "#ffd566";
      ctx.fillRect(slot.x - w/2, slot.y + 38, w * ratio, h);
    }
  }
}

function drawTables() {
  const theme = THEME_DEFS.table.find((t) => t.id === state.themes.table);
  const img = getImage(theme.icon);
  for (const table of state.facilities.tables) {
    const slot = slotMeta("table", table.slotId);
    if (!slot) continue;
    drawShadow(slot.x, slot.y + 28, 44, 9);
    if (!drawImageScaled(img, slot.x, slot.y, 96, 80)) {
      ctx.fillStyle = "#cf9c5b";
      ctx.fillRect(slot.x - 36, slot.y - 30, 72, 60);
    }
  }
}

function drawShadow(cx, cy, rx, ry) {
  ctx.fillStyle = "rgba(20, 22, 14, 0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawChef() {
  const x = state.chef.x;
  const y = state.chef.y;
  const bob = Math.sin(state.chef.anim * 4) * 1.4;
  // 탭 시 강조 링
  if (state.ui.chefBubbleOpen) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 213, 102, 0.85)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(x, y + 28, 38, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  drawShadow(x, y + 28, 22, 6);
  const img = getImage("Icon/Chick/Icon_Chick_099.png");
  if (!drawImageScaled(img, x, y - 6 + bob, 76, 76)) {
    ctx.fillStyle = "#f4cf48";
    ctx.beginPath();
    ctx.arc(x, y + bob, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  // 연구 중 전구
  if (state.ui.chefBubbleOpen) {
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText("💡", x, y - 38 + bob);
  }
}

function drawQueue() {
  // 출입구 앞 줄서기 — pendingSpawns 만큼 보이게
  const pending = Math.min(QUEUE_SLOTS.length, state.promo.pendingSpawns);
  if (pending <= 0) return;
  const img = getImage("Icon/Chick/Icon_Chick_001.png");
  for (let i = 0; i < pending; i += 1) {
    const slot = QUEUE_SLOTS[i];
    const bob = Math.sin((state.clock + i * 0.7) * 3) * 1.5;
    drawShadow(slot.x, slot.y + 18, 14, 4);
    if (!drawImageScaled(img, slot.x, slot.y + bob, 48, 48)) {
      ctx.fillStyle = "#f6c14f";
      ctx.beginPath();
      ctx.arc(slot.x, slot.y + bob, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCustomers() {
  // 손님 정렬 (y기준)
  const sorted = [...state.customers].sort((a, b) => a.y - b.y);
  const img = getImage("Icon/Chick/Icon_Chick_001.png");
  for (const cust of sorted) {
    const bob = Math.sin(cust.bob * 3.4) * 1.6;
    drawShadow(cust.x, cust.y + 22, 16, 5);
    if (!drawImageScaled(img, cust.x, cust.y + bob, 56, 56)) {
      ctx.fillStyle = cust.color;
      ctx.beginPath();
      ctx.arc(cust.x, cust.y + bob, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    // 주문 말풍선
    if (cust.state === "awaiting_order") {
      drawOrderBubble(cust);
    } else if (cust.state === "eating") {
      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.fillText("😋", cust.x, cust.y - 32);
    }
  }
}

function drawOrderBubble(cust) {
  const pos = orderBubblePos(cust);
  const cx = pos.x;
  const cy = pos.y;
  const w = 60, h = 52;
  // 그림자
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  roundRect(cx - w/2 + 2, cy - h/2 + 4, w, h, 12);
  ctx.fill();
  // 말풍선
  ctx.fillStyle = "#fffaee";
  ctx.strokeStyle = "#c2a062";
  ctx.lineWidth = 2;
  roundRect(cx - w/2, cy - h/2, w, h, 12);
  ctx.fill();
  ctx.stroke();
  // 꼬리
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy + h/2 - 1);
  ctx.lineTo(cx, cy + h/2 + 10);
  ctx.lineTo(cx + 6, cy + h/2 - 1);
  ctx.closePath();
  ctx.fillStyle = "#fffaee";
  ctx.fill();
  ctx.stroke();
  // 레시피 아이콘
  const recipeIcon = getImage(`assets/recipe-icons/${cust.recipeId}.png`);
  if (!drawImageScaled(recipeIcon, cx, cy - 4, 38, 38)) {
    ctx.fillStyle = "#7a5a36";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(RECIPE_NAME_BY_ID[cust.recipeId] || cust.recipeId, cx, cy);
  }
  // 톡 표시 (애니메이션)
  if (Math.floor(state.clock * 2) % 2 === 0) {
    ctx.fillStyle = "#d97a1a";
    ctx.beginPath();
    ctx.arc(cx + w/2 - 8, cy - h/2 + 8, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCookProgress(task) {
  const slot = slotMeta("stove", task.stoveId);
  if (!slot) return;
  const ratio = Math.max(0, Math.min(1, task.progress / task.duration));
  const remain = Math.max(0, task.duration - task.progress);
  const cx = slot.x;
  const cy = slot.y - 56;
  const w = 56, h = 10;
  // 배경
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  roundRect(cx - w/2 - 1, cy - h/2 - 1, w + 2, h + 2, 6);
  ctx.fill();
  // 채움
  const grad = ctx.createLinearGradient(cx - w/2, 0, cx + w/2, 0);
  grad.addColorStop(0, "#ffd566");
  grad.addColorStop(1, "#ff9d3a");
  ctx.fillStyle = grad;
  roundRect(cx - w/2, cy - h/2, w * ratio, h, 5);
  ctx.fill();
  // 남은 초
  ctx.font = "bold 10px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${remain.toFixed(1)}s`, cx, cy);
  ctx.textBaseline = "alphabetic";
}

function drawCookingFood() {
  for (const task of state.cookingTasks) {
    const slot = slotMeta("stove", task.stoveId);
    if (!slot) continue;
    const r = 14 + Math.sin(state.clock * 5) * 1.5;
    const recipeIcon = getImage(`assets/recipe-icons/${task.recipeId}.png`);
    if (!drawImageScaled(recipeIcon, slot.x, slot.y - 24, r * 1.6, r * 1.6)) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(slot.x, slot.y - 24, r, 0, Math.PI * 2);
      ctx.fill();
    }
    drawCookProgress(task);
  }
}

function drawDottedZones() {
  if (state.ui.installCandidateId !== null) return; // 말풍선 떠 있을 땐 안 그림
  for (const cand of getInstallCandidates()) {
    const b = candidateBox(cand);
    if (!b) continue;
    const pulse = 0.5 + 0.5 * Math.sin(state.clock * 3);
    ctx.save();
    ctx.translate(b.x, b.y);
    // 점선 사각형
    ctx.strokeStyle = `rgba(255, 240, 180, ${0.55 + pulse * 0.35})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    roundRect(-b.w/2, -b.h/2, b.w, b.h, 10);
    ctx.stroke();
    ctx.setLineDash([]);
    // 가격 라벨 + 시설 아이콘 (PDF 기획서: 점선 영역 안에 비용 표시)
    const acornIcon = getImage("Icon/Currency/Icon_Currency_001.png");
    const lblW = Math.max(70, 24 + String(cand.cost).length * 8);
    const lx = 0, ly = b.h/2 - 14;
    ctx.fillStyle = "rgba(40, 28, 12, 0.82)";
    roundRect(lx - lblW/2, ly - 12, lblW, 24, 12);
    ctx.fill();
    drawImageScaled(acornIcon, lx - lblW/2 + 14, ly, 18, 18);
    ctx.fillStyle = "#fff8e3";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(formatNumber(cand.cost), lx - lblW/2 + 26, ly + 5);
    ctx.restore();
  }
}

function drawEntrance() {
  // 출입구는 설치된 경우에만 표시 (없으면 풀밭 길만)
  const installed = state.facilities.singles.some((f) => f.slotId === "entrance");
  if (!installed) return;
  const theme = THEME_DEFS.entrance.find((t) => t.id === state.themes.entrance);
  const img = getImage(theme.icon);
  const x = ENTRANCE.x;
  const y = ENTRANCE.y;
  drawShadow(x, y + 60, 60, 10);
  if (!drawImageScaled(img, x, y, 130, 130)) {
    ctx.fillStyle = "#7a5a36";
    ctx.fillRect(x - 50, y - 50, 100, 100);
  }
}

function drawPayoutFx() {
  for (const fx of payoutFx) {
    fx.age += FIXED_DT;
    const alpha = Math.max(0, 1 - fx.age / 1.4);
    const rise = fx.age * 24;
    ctx.fillStyle = `rgba(80, 50, 12, ${alpha})`;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🌰 +${formatNumber(fx.value)}`, fx.x, fx.y - rise);
  }
  for (let i = payoutFx.length - 1; i >= 0; i -= 1) {
    if (payoutFx[i].age >= 1.4) payoutFx.splice(i, 1);
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

// ===== HUD 업데이트 =====
const dom = {
  acorn: document.getElementById("acorn-count"),
  gem: document.getElementById("gem-count"),
  promoFill: document.getElementById("promotion-fill"),
  promoText: document.getElementById("promotion-text"),
  installBubble: document.getElementById("install-bubble"),
  installBubbleIcon: document.getElementById("install-bubble-icon"),
  installBubbleTitle: document.getElementById("install-bubble-title"),
  installBubbleDesc: document.getElementById("install-bubble-desc"),
  installBubbleCost: document.getElementById("install-bubble-cost"),
  installConfirmBtn: document.getElementById("install-confirm-btn"),
  recipeBadge: document.getElementById("recipe-badge"),
  researchBubble: document.getElementById("research-bubble"),
  researchCost: document.getElementById("research-cost"),
  researchStartBtn: document.getElementById("research-start-btn"),
  researchCancelBtn: document.getElementById("research-cancel-btn"),
  panelOverlay: document.getElementById("panel-overlay"),
  panelTitle: document.getElementById("panel-title"),
  panelBody: document.getElementById("panel-body"),
  panelCloseBtn: document.getElementById("panel-close-btn"),
  researchVignette: document.getElementById("research-vignette"),
  resultOverlay: document.getElementById("research-result-overlay"),
  resultIcon: document.getElementById("research-result-icon"),
  resultName: document.getElementById("research-result-name"),
  resultRarity: document.getElementById("research-result-rarity"),
  resultKicker: document.getElementById("research-result-kicker"),
  resultConfirm: document.getElementById("research-result-confirm"),
  enhanceOverlay: document.getElementById("enhance-overlay"),
  enhanceIcon: document.getElementById("enhance-icon"),
  enhanceName: document.getElementById("enhance-name"),
  enhanceStars: document.getElementById("enhance-stars"),
  enhanceConfirm: document.getElementById("enhance-confirm"),
};

function refreshHud() {
  dom.acorn.textContent = formatNumber(state.resources.acorns);
  dom.gem.textContent = formatNumber(state.resources.gems);
  const ratio = Math.max(0, Math.min(1, state.promo.progress / state.promo.threshold));
  dom.promoFill.style.width = `${ratio * 100}%`;
  dom.promoText.textContent = `${state.promo.progress} / ${state.promo.threshold}`;

  // 메뉴 배지: 강화 가능(중복 보유) + 미확인 신규 메뉴 합산
  let badge = 0;
  for (const id of RECIPE_LIST) {
    const owned = state.recipes[id];
    if (!owned) continue;
    if (owned.dupes > 0 && owned.stars < MAX_STARS) badge += 1;
  }
  if (badge > 0) {
    dom.recipeBadge.hidden = false;
    dom.recipeBadge.textContent = String(badge);
  } else {
    dom.recipeBadge.hidden = true;
  }

  // 설치 말풍선
  if (state.ui.installCandidateId !== null) {
    const cand = INSTALL_SEQUENCE[state.ui.installCandidateId];
    if (cand && !isSlotInstalled(cand.kind, cand.slotId)) {
      const slot = slotMeta(cand.kind, cand.slotId);
      // 위쪽 영역(뒷줄/조명)은 말풍선이 화면 밖으로 나가지 않도록 아래로 뒤집기
      const flipDown = slot.y < 260;
      const halfH = slot.h ? slot.h / 2 : 39;
      const anchorY = flipDown ? (slot.y + halfH + 6) : (slot.y - halfH - 6);
      const screen = canvasToScreen(slot.x, anchorY);
      dom.installBubble.dataset.flip = flipDown ? "down" : "up";
      dom.installBubble.style.left = `${screen.x}px`;
      dom.installBubble.style.top = `${screen.y}px`;
      dom.installBubble.hidden = false;
      dom.installBubbleTitle.textContent = cand.title;
      dom.installBubbleDesc.textContent = cand.desc;
      dom.installBubbleCost.textContent = formatNumber(cand.cost);
      // 현재 적용 테마 아이콘으로 표시
      const themeKey = (cand.kind === "table") ? "table"
                     : (cand.kind === "stove") ? "stove"
                     : SLOT_THEME_KEY[cand.slotId];
      const themeId = state.themes[themeKey];
      const themeDef = THEME_DEFS[themeKey].find((t) => t.id === themeId);
      dom.installBubbleIcon.innerHTML = `<img src="${themeDef.icon}" alt="" />`;
      dom.installConfirmBtn.disabled = state.resources.acorns < cand.cost;
    } else {
      state.ui.installCandidateId = null;
      dom.installBubble.hidden = true;
    }
  } else {
    dom.installBubble.hidden = true;
  }

  // 연구 말풍선 — 요리사 아래에 위치 (PDF 기획서)
  if (state.ui.chefBubbleOpen) {
    const screen = canvasToScreen(state.chef.x, state.chef.y + 36);
    dom.researchBubble.style.left = `${screen.x}px`;
    dom.researchBubble.style.top = `${screen.y}px`;
    dom.researchBubble.hidden = false;
    if (dom.researchVignette) dom.researchVignette.hidden = false;
    const cost = researchCostForCount(state.researchCount);
    dom.researchCost.textContent = formatNumber(cost);
    const blocked = !canResearch();
    dom.researchStartBtn.disabled = blocked || state.resources.acorns < cost;
  } else {
    dom.researchBubble.hidden = true;
    if (dom.researchVignette) dom.researchVignette.hidden = true;
  }
}

// ===== 설치 클릭 처리 =====
function handleCanvasClick(cx, cy) {
  // 우선순위: 주문 말풍선 → 설치 후보 → 요리사 → 빈 클릭
  if (acceptOrderAt(cx, cy)) return;

  // 요리사 클릭
  const dx = cx - state.chef.x;
  const dy = cy - (state.chef.y - 6);
  if (dx * dx + dy * dy < 38 * 38 && !state.ui.panel) {
    state.ui.chefBubbleOpen = !state.ui.chefBubbleOpen;
    state.ui.installCandidateId = null;
    refreshHud();
    return;
  }

  // 설치 후보 클릭
  const cand = findCandidateAt(cx, cy);
  if (cand) {
    state.ui.installCandidateId = cand.index;
    state.ui.chefBubbleOpen = false;
    refreshHud();
    return;
  }

  // 빈 곳 클릭 → 말풍선 닫기
  if (state.ui.installCandidateId !== null || state.ui.chefBubbleOpen) {
    state.ui.installCandidateId = null;
    state.ui.chefBubbleOpen = false;
    refreshHud();
  }
}

// ===== 홍보 =====
function handlePromotion() {
  state.promo.progress += 1;
  if (state.promo.progress >= state.promo.threshold) {
    state.promo.progress = 0;
    spawnCustomer();
  }
  refreshHud();
}

// 연구가 가능한지 (기획서: 가능한 모든 메뉴를 최대 강화하면 일시 중지)
function canResearch() {
  // 미보유 메뉴가 있거나, 보유 중 별이 MAX 미만인 메뉴가 있으면 가능
  return RECIPE_LIST.some((id) => {
    const owned = state.recipes[id];
    return !owned || owned.stars < MAX_STARS;
  });
}

// ===== 레시피 연구 =====
function startResearch() {
  if (!canResearch()) {
    showToast("모든 메뉴를 최대까지 강화했습니다.");
    return;
  }
  const cost = researchCostForCount(state.researchCount);
  if (state.resources.acorns < cost) {
    showToast("도토리가 부족합니다.");
    return;
  }
  state.resources.acorns -= cost;
  state.researchCount += 1;
  state.metrics.researched += 1;

  // 천장 처리: 처음 획득 메뉴에만 적용 (메뉴별 절대 횟수)
  // 미획득 메뉴 중 천장 도달한 것이 있으면 그 중 가장 작은 천장을 가진 메뉴 보장
  const pityHits = RECIPE_LIST
    .filter((id) => !state.recipes[id])
    .filter((id) => state.researchCount >= (RECIPE_PITY[id] || 999));

  let pickedId = null;
  if (pityHits.length > 0) {
    // 천장 메뉴 중 천장값 가장 작은 것
    pityHits.sort((a, b) => (RECIPE_PITY[a] || 999) - (RECIPE_PITY[b] || 999));
    pickedId = pityHits[0];
  } else {
    // 가중치 추첨: MAX 강화 메뉴는 풀에서 제외, 미보유 가중치 1.4배
    const pool = RECIPE_LIST.filter((id) => {
      const owned = state.recipes[id];
      return !owned || owned.stars < MAX_STARS;
    });
    pickedId = pickWeighted(pool, (id) => {
      const w = RECIPE_RARITY[id].weight;
      return state.recipes[id] ? w : w * 1.4;
    });
  }

  const isNew = !state.recipes[pickedId];
  if (isNew) {
    state.recipes[pickedId] = { stars: 1, dupes: 0 };
  } else {
    // 중복 시: 강화 재료 누적 (유저가 패널에서 직접 강화)
    state.recipes[pickedId].dupes = (state.recipes[pickedId].dupes || 0) + 1;
  }

  // 결과 모달
  state.ui.eventModal = { type: "research", recipeId: pickedId, isNew };
  state.ui.chefBubbleOpen = false;
  showResearchResultModal();
  refreshHud();
  saveState();
}

function showResearchResultModal() {
  const evt = state.ui.eventModal;
  if (!evt || evt.type !== "research") return;
  const r = RECIPE_RARITY[evt.recipeId];
  dom.resultIcon.src = `assets/recipe-icons/${evt.recipeId}.png`;
  dom.resultName.textContent = RECIPE_NAME_BY_ID[evt.recipeId] || evt.recipeId;
  dom.resultRarity.textContent = RARITY_LABEL[r.rarity];
  dom.resultRarity.dataset.rarity = r.rarity;
  dom.resultKicker.textContent = evt.isNew ? "NEW! 새로운 레시피!" : "이미 가진 레시피!";
  dom.resultOverlay.hidden = false;
}
function closeResultModal() {
  state.ui.eventModal = null;
  dom.resultOverlay.hidden = true;
}

// ===== 패널 (레시피 / 테마) =====
function openPanel(name) {
  state.ui.panel = name;
  state.ui.installCandidateId = null;
  state.ui.chefBubbleOpen = false;
  dom.panelOverlay.hidden = false;
  if (name === "recipe") {
    dom.panelTitle.textContent = "레스토랑 메뉴";
    renderRecipePanel();
  } else if (name === "theme") {
    dom.panelTitle.textContent = "레스토랑 테마";
    renderThemePanel();
  }
  refreshHud();
}
function closePanel() {
  state.ui.panel = null;
  dom.panelOverlay.hidden = true;
}

function renderRecipePanel() {
  // 카테고리 탭 (기획서: 시그니처 / 시즌. 시즌은 추후 기획)
  const wrap = document.createElement("div");
  wrap.className = "recipe-wrap";
  const tabs = document.createElement("div");
  tabs.className = "recipe-cats";
  tabs.innerHTML = `
    <button class="recipe-cat-btn" data-cat="signature" data-active="true" type="button">시그니처</button>
    <button class="recipe-cat-btn" data-cat="season" type="button">시즌</button>
  `;
  wrap.appendChild(tabs);

  const grid = document.createElement("div");
  grid.className = "recipe-grid";
  for (const id of RECIPE_LIST) {
    const meta = RECIPE_RARITY[id];
    const owned = state.recipes[id];
    const card = document.createElement("button");
    card.className = "recipe-card";
    card.dataset.rarity = meta.rarity;
    if (!owned) card.dataset.state = "locked";
    else if (owned.dupes > 0 && owned.stars < MAX_STARS) card.dataset.state = "upgradable";
    else card.dataset.state = "owned";
    const stars = owned ? owned.stars : 0;
    const starRow = stars > 0
      ? "★".repeat(stars) + "☆".repeat(MAX_STARS - stars)
      : "";
    const dupeBadge = owned && owned.dupes > 0
      ? `<span class="recipe-dupe">+${owned.dupes}</span>` : "";
    const upgradeTag = (owned && owned.dupes > 0 && owned.stars < MAX_STARS)
      ? `<span class="recipe-upgrade-tag">Upgrade!</span>` : "";
    card.innerHTML = `
      <span class="recipe-rarity-tag"></span>
      ${dupeBadge}
      ${upgradeTag}
      <img class="recipe-icon" src="assets/recipe-icons/${id}.png" alt="" />
      <div class="recipe-name">${owned ? RECIPE_NAME_BY_ID[id] : "???"}</div>
      <div class="recipe-stars">${starRow}</div>
    `;
    if (owned) {
      card.addEventListener("click", () => onRecipeCardClick(id));
    } else {
      card.addEventListener("click", () => showToast("[요리 연구]로 획득할 수 있어요."));
    }
    grid.appendChild(card);
  }
  wrap.appendChild(grid);

  // 시즌 탭은 빈 상태
  const seasonView = document.createElement("div");
  seasonView.className = "recipe-season";
  seasonView.hidden = true;
  seasonView.innerHTML = `<div class="recipe-empty">시즌 메뉴는 추후 업데이트 예정이에요.</div>`;
  wrap.appendChild(seasonView);

  // 탭 전환
  tabs.querySelectorAll(".recipe-cat-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat;
      tabs.querySelectorAll(".recipe-cat-btn").forEach((b) => {
        b.dataset.active = (b.dataset.cat === cat) ? "true" : "false";
      });
      grid.hidden = (cat !== "signature");
      seasonView.hidden = (cat !== "season");
    });
  });

  dom.panelBody.innerHTML = "";
  dom.panelBody.appendChild(wrap);
}

function onRecipeCardClick(id) {
  const owned = state.recipes[id];
  if (!owned) return;
  if (owned.stars >= MAX_STARS) {
    showToast("이미 최대 강화 단계입니다.");
    return;
  }
  // 기획서 규칙: 강화는 중복으로 나온 메뉴 1개를 소비 (도토리 X)
  if (!owned.dupes || owned.dupes <= 0) {
    showToast("연구에서 중복으로 나오면 강화할 수 있어요.");
    return;
  }
  owned.dupes -= 1;
  owned.stars += 1;
  showEnhanceModal(id);
  saveState();
  renderRecipePanel();
  refreshHud();
}

function showEnhanceModal(id) {
  const owned = state.recipes[id];
  dom.enhanceIcon.src = `assets/recipe-icons/${id}.png`;
  dom.enhanceName.textContent = RECIPE_NAME_BY_ID[id];
  dom.enhanceStars.textContent = "★".repeat(owned.stars);
  dom.enhanceOverlay.hidden = false;
}
function closeEnhanceModal() {
  dom.enhanceOverlay.hidden = true;
}

// 테마 패널 — PDF 기획서 기반:
// ① 패널명 ② 수익률 배지 ③ 가로 테마 선택 ④ 시설 그리드 ⑤ 시설 테마 버튼 ⑥ 전체 적용
const FACILITY_GROUPS = [
  { key: "table",      label: "식탁" },
  { key: "stove",      label: "조리기구" },
  { key: "entrance",   label: "출입구" },
  { key: "countertop", label: "도마테이블" },
  { key: "sink",       label: "싱크대" },
  { key: "fridge",     label: "냉장고" },
  { key: "toolbox",    label: "조리도구함" },
  { key: "stage",      label: "무대" },
  { key: "tipbox",     label: "팁박스" },
  { key: "lighting",   label: "조명" },
  { key: "fence",      label: "울타리" },
];
let _themePanelSelected = "stone"; // 가로 선택된 테마 id

function renderThemePanel() {
  const wrap = document.createElement("div");
  wrap.className = "theme-wrap";

  // ② 수익률 배지
  const totalBoost = totalThemeBoost();
  const rateBadge = document.createElement("div");
  rateBadge.className = "theme-rate";
  rateBadge.innerHTML = `현재 수익 보너스 <strong>+${Math.round(totalBoost * 100)}%</strong>`;
  wrap.appendChild(rateBadge);

  // ③ 가로 테마 선택
  const themeStrip = document.createElement("div");
  themeStrip.className = "theme-strip";
  for (const t of THEME_LIST) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-strip-btn";
    btn.dataset.active = (t.id === _themePanelSelected) ? "true" : "false";
    btn.innerHTML = `
      <img src="Icon/Facility/Icon_Facility_Table_${themeSuffix(t.id)}.png" alt="" />
      <span>${t.name}</span>
    `;
    btn.addEventListener("click", () => {
      _themePanelSelected = t.id;
      renderThemePanel();
    });
    themeStrip.appendChild(btn);
  }
  wrap.appendChild(themeStrip);

  // ④ 시설 그리드
  const grid = document.createElement("div");
  grid.className = "theme-facility-grid";
  for (const grp of FACILITY_GROUPS) {
    const themeDef = THEME_DEFS[grp.key].find((t) => t.id === _themePanelSelected);
    if (!themeDef) continue;
    const owned = state.themesOwned[grp.key]?.includes(_themePanelSelected);
    const applied = state.themes[grp.key] === _themePanelSelected;
    const isSpecial = themeDef.costGem > 0;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "theme-facility";
    card.dataset.state = applied ? "applied" : (owned ? "owned" : "locked");
    if (isSpecial) card.dataset.special = "true";

    card.innerHTML = `
      <img src="${themeDef.icon}" alt="" />
      <span class="theme-facility-label">${grp.label}</span>
      ${applied ? `<span class="theme-facility-tag">적용중</span>`
        : owned ? `<span class="theme-facility-tag owned">보유</span>`
        : `<span class="theme-facility-tag locked">${formatNumber(themeDef.costGem || themeDef.costAcorn)}</span>`}
    `;
    card.addEventListener("click", () => onFacilityThemeTap(grp.key, _themePanelSelected));
    grid.appendChild(card);
  }
  wrap.appendChild(grid);

  // ⑥ 전체 적용
  const applyAll = document.createElement("button");
  applyAll.type = "button";
  applyAll.className = "theme-apply-all";
  applyAll.textContent = "테마 전체 적용";
  applyAll.addEventListener("click", () => onApplyAll(_themePanelSelected));
  wrap.appendChild(applyAll);

  dom.panelBody.innerHTML = "";
  dom.panelBody.appendChild(wrap);
}

function themeSuffix(id) {
  return { stone: "Stone", wood: "Wood", camping: "Camping", italy: "Italy", summer: "BlueWhite", cherry: "CherryBlossom" }[id];
}

function onFacilityThemeTap(facilityKey, themeId) {
  const owned = state.themesOwned[facilityKey]?.includes(themeId);
  const applied = state.themes[facilityKey] === themeId;
  if (applied) {
    showToast("이미 적용 중인 테마입니다.");
    return;
  }
  if (owned) {
    state.themes[facilityKey] = themeId;
    saveState();
    renderThemePanel();
    refreshHud();
    return;
  }
  // 미보유 → 디테일 팝업
  showThemeDetail(facilityKey, themeId);
}

function showThemeDetail(facilityKey, themeId) {
  const themeDef = THEME_DEFS[facilityKey].find((t) => t.id === themeId);
  const themeMeta = THEME_LIST.find((t) => t.id === themeId);
  if (!themeDef || !themeMeta) return;
  const grp = FACILITY_GROUPS.find((g) => g.key === facilityKey);
  const useGem = themeDef.costGem > 0;
  const cost = useGem ? themeDef.costGem : themeDef.costAcorn;
  const iconPath = useGem ? "Icon/Currency/Icon_Currency_002.png" : "Icon/Currency/Icon_Currency_001.png";
  const have = useGem ? state.resources.gems : state.resources.acorns;

  // 동적 모달
  const overlay = document.createElement("div");
  overlay.className = "event-overlay theme-detail-overlay";
  overlay.innerHTML = `
    <div class="event-card theme-detail-card">
      <div class="theme-detail-name">${grp.label} · ${themeMeta.name}</div>
      <img class="event-icon" src="${themeDef.icon}" alt="" />
      <div class="theme-detail-effect">수익 +${Math.round(themeDef.boost * 100)}%</div>
      <div class="theme-detail-desc">${themeMeta.name} 컨셉의 ${grp.label} 테마</div>
      <div class="theme-detail-actions">
        <button class="ghost-btn" data-act="cancel" type="button">취소</button>
        <button class="primary-btn" data-act="buy" type="button" ${have < cost ? "disabled" : ""}>
          <img class="cost-icon" src="${iconPath}" alt="" />
          <span>${formatNumber(cost)}</span>
          <span class="primary-btn-label">구매하기</span>
        </button>
      </div>
    </div>
  `;
  document.querySelector(".phone-frame").appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('[data-act="cancel"]').addEventListener("click", close);
  overlay.querySelector('[data-act="buy"]').addEventListener("click", () => {
    if (useGem) {
      if (!confirm(`보석 ${cost}개를 사용해 구매할까요?`)) return;
      if (state.resources.gems < cost) { showToast("보석이 부족합니다."); return; }
      state.resources.gems -= cost;
    } else {
      if (state.resources.acorns < cost) { showToast("도토리가 부족합니다."); return; }
      state.resources.acorns -= cost;
    }
    if (!state.themesOwned[facilityKey].includes(themeId)) state.themesOwned[facilityKey].push(themeId);
    state.themes[facilityKey] = themeId;
    showToast(`${themeMeta.name} 적용!`);
    close();
    saveState();
    renderThemePanel();
    refreshHud();
  });
}

function onApplyAll(themeId) {
  // 보유한 시설부터 일괄 적용. 미보유는 비용 합산 후 확인
  const targets = FACILITY_GROUPS.filter((g) => state.themes[g.key] !== themeId);
  if (targets.length === 0) { showToast("이미 모두 이 테마입니다."); return; }
  let acornCost = 0, gemCost = 0;
  const toBuy = [];
  for (const g of targets) {
    if (state.themesOwned[g.key]?.includes(themeId)) continue;
    const def = THEME_DEFS[g.key].find((t) => t.id === themeId);
    if (def.costGem > 0) gemCost += def.costGem; else acornCost += def.costAcorn;
    toBuy.push(g.key);
  }
  if (toBuy.length > 0) {
    const msg = `미보유 ${toBuy.length}개 시설 테마를 ${acornCost > 0 ? `도토리 ${acornCost}` : ""}${acornCost > 0 && gemCost > 0 ? " + " : ""}${gemCost > 0 ? `보석 ${gemCost}` : ""}로 구매하고 전체 적용할까요?`;
    if (!confirm(msg)) return;
    if (state.resources.acorns < acornCost) { showToast("도토리가 부족합니다."); return; }
    if (state.resources.gems < gemCost) { showToast("보석이 부족합니다."); return; }
    state.resources.acorns -= acornCost;
    state.resources.gems -= gemCost;
    for (const key of toBuy) {
      if (!state.themesOwned[key].includes(themeId)) state.themesOwned[key].push(themeId);
    }
  }
  for (const g of targets) state.themes[g.key] = themeId;
  showToast("전체 테마가 적용되었습니다!");
  saveState();
  renderThemePanel();
  refreshHud();
}

// ===== 이벤트 바인딩 =====
document.getElementById("promotion-btn").addEventListener("click", handlePromotion);
document.getElementById("reset-btn").addEventListener("click", () => {
  if (confirm("모든 진행도를 초기화할까요?")) {
    resetState();
  }
});
document.querySelectorAll("[data-panel]").forEach((btn) => {
  btn.addEventListener("click", () => openPanel(btn.dataset.panel));
});
dom.panelCloseBtn.addEventListener("click", closePanel);
dom.panelOverlay.addEventListener("click", (e) => {
  if (e.target === dom.panelOverlay) closePanel();
});
dom.installConfirmBtn.addEventListener("click", () => {
  if (state.ui.installCandidateId === null) return;
  const cand = INSTALL_SEQUENCE[state.ui.installCandidateId];
  installCandidate(cand);
});
dom.researchStartBtn.addEventListener("click", startResearch);
dom.researchCancelBtn.addEventListener("click", () => {
  state.ui.chefBubbleOpen = false;
  refreshHud();
});
dom.resultConfirm.addEventListener("click", closeResultModal);
dom.resultOverlay.addEventListener("click", (e) => {
  if (e.target === dom.resultOverlay) closeResultModal();
});
dom.enhanceConfirm.addEventListener("click", closeEnhanceModal);
dom.enhanceOverlay.addEventListener("click", (e) => {
  if (e.target === dom.enhanceOverlay) closeEnhanceModal();
});

canvas.addEventListener("click", (e) => {
  const p = getCanvasPoint(e.clientX, e.clientY);
  handleCanvasClick(p.x, p.y);
});
window.addEventListener("resize", () => {
  configureCanvas();
  refreshHud();
});

// ===== 메인 루프 =====
let lastTime = 0;
function frame(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min(0.05, (ts - lastTime) / 1000);
  lastTime = ts;
  update(dt);
  draw();
  refreshHudIfNeeded();
  requestAnimationFrame(frame);
}

let lastHudAcorns = -1;
let lastHudThreshold = -1;
let lastHudProgress = -1;
function refreshHudIfNeeded() {
  if (
    state.resources.acorns !== lastHudAcorns ||
    state.promo.progress !== lastHudProgress ||
    state.promo.threshold !== lastHudThreshold
  ) {
    lastHudAcorns = state.resources.acorns;
    lastHudProgress = state.promo.progress;
    lastHudThreshold = state.promo.threshold;
    refreshHud();
  }
  // 말풍선 위치는 매 프레임 캔버스가 흔들리지 않으므로 한 번만 갱신해도 OK,
  // 하지만 요리사가 움직이면 갱신 필요
  if (state.ui.chefBubbleOpen) {
    const screen = canvasToScreen(state.chef.x, state.chef.y + 36);
    dom.researchBubble.style.left = `${screen.x}px`;
    dom.researchBubble.style.top = `${screen.y}px`;
  }
}

// 자동 저장 (10초마다)
setInterval(() => {
  saveState();
}, 10000);
window.addEventListener("beforeunload", saveState);

// 부트
configureCanvas();
refreshHud();
requestAnimationFrame(frame);

// 디버그 훅
window.gameState = () => state;
window.resetGame = resetState;