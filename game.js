const SAVE_KEY = "core-loop-research-save-v1";
const PROMO_DURATION = 1400;
const EXIT_DURATION = 1000;

const guestSprites = [
  "Icon/Chick/Icon_Chick_001.png",
  "Icon/Chick/Icon_Chick_002.png",
  "Icon/Chick/Icon_Chick_003.png",
  "Icon/Chick/Icon_Chick_004.png",
  "Icon/Chick/Icon_Chick_005.png",
  "Icon/Chick/Icon_Chick_006.png",
  "Icon/Chick/Icon_Chick_007.png",
];

const recipes = [
  { name: "치킨", sprite: "assets/recipe-icons/chicken.png" },
  { name: "김밥", sprite: "assets/recipe-icons/kimbap.png" },
  { name: "햄버거", sprite: "assets/recipe-icons/burger.png" },
  { name: "오믈렛", sprite: "assets/recipe-icons/omelet.png" },
];

const dom = {
  promoCount: document.getElementById("promo-count"),
  servedCount: document.getElementById("served-count"),
  stateTitle: document.getElementById("state-title"),
  stateDescription: document.getElementById("state-description"),
  flowLabel: document.getElementById("flow-label"),
  progressFill: document.getElementById("progress-fill"),
  promotionBtn: document.getElementById("promotion-btn"),
  serveBtn: document.getElementById("serve-btn"),
  resetBtn: document.getElementById("reset-btn"),
  guestSprite: document.getElementById("guest-sprite"),
  foodSprite: document.getElementById("food-sprite"),
  logList: document.getElementById("log-list"),
};

let state = loadState();
let activeTimer = null;
let progressTimer = null;

window.render_game_to_text = renderGameToText;
window.advanceTime = advanceTime;

render();

dom.promotionBtn.addEventListener("click", startPromotion);
dom.serveBtn.addEventListener("click", serveGuest);
dom.resetBtn.addEventListener("click", resetState);

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return createInitialState();
    }

    const parsed = JSON.parse(raw);
    const persistedPhase = parsed.phase === "guestWaiting" ? "guestWaiting" : "idle";
    return {
      promoCount: Number.isFinite(parsed.promoCount) ? parsed.promoCount : 0,
      servedCount: Number.isFinite(parsed.servedCount) ? parsed.servedCount : 0,
      phase: persistedPhase,
      phaseElapsed: 0,
      guestSprite: parsed.guestSprite || guestSprites[0],
      currentRecipe: parsed.currentRecipe || recipes[0],
      logs: Array.isArray(parsed.logs) ? parsed.logs.slice(0, 8) : [],
    };
  } catch (error) {
    console.error("저장 데이터를 읽지 못했습니다.", error);
    return createInitialState();
  }
}

function createInitialState() {
  return {
    promoCount: 0,
    servedCount: 0,
    phase: "idle",
    phaseElapsed: 0,
    guestSprite: guestSprites[0],
    currentRecipe: recipes[0],
    logs: ["가게를 비웠습니다. 홍보를 눌러 병아리 손님을 불러보세요."],
  };
}

function saveState() {
  const payload = {
    promoCount: state.promoCount,
    servedCount: state.servedCount,
    phase: state.phase,
    guestSprite: state.guestSprite,
    currentRecipe: state.currentRecipe,
    logs: state.logs.slice(0, 8),
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

function resetState() {
  clearTimers();
  localStorage.removeItem(SAVE_KEY);
  state = createInitialState();
  render();
}

function startPromotion() {
  if (state.phase !== "idle") {
    return;
  }

  clearTimers();
  state.phase = "promoting";
  state.phaseElapsed = 0;
  state.promoCount += 1;
  state.currentRecipe = pickRandom(recipes);
  addLog(`홍보 ${state.promoCount}회차를 시작했습니다.`);
  saveState();
  render();
  animateProgress(PROMO_DURATION);

  activeTimer = window.setTimeout(() => {
    state.phase = "guestWaiting";
    state.phaseElapsed = 0;
    state.guestSprite = pickRandom(guestSprites);
    addLog("병아리 손님이 가게에 도착했습니다.");
    saveState();
    render();
  }, PROMO_DURATION);
}

function serveGuest() {
  if (state.phase !== "guestWaiting") {
    return;
  }

  clearTimers();
  state.phase = "serving";
  state.phaseElapsed = 0;
  state.servedCount += 1;
  addLog(`${state.currentRecipe.name}을(를) 건넸습니다.`);
  saveState();
  render();
  animateProgress(EXIT_DURATION);

  activeTimer = window.setTimeout(() => {
    state.phase = "idle";
    state.phaseElapsed = 0;
    addLog("손님이 음식을 받고 바로 떠났습니다.");
    saveState();
    render();
  }, EXIT_DURATION);
}

function addLog(message) {
  state.logs = [message, ...state.logs].slice(0, 8);
}

function clearTimers() {
  if (activeTimer) {
    window.clearTimeout(activeTimer);
    activeTimer = null;
  }

  if (progressTimer) {
    window.clearInterval(progressTimer);
    progressTimer = null;
  }
}

function animateProgress(duration) {
  const start = performance.now();
  dom.progressFill.style.width = "0%";

  progressTimer = window.setInterval(() => {
    const elapsed = performance.now() - start;
    const ratio = Math.min(elapsed / duration, 1);
    dom.progressFill.style.width = `${ratio * 100}%`;

    if (ratio >= 1) {
      window.clearInterval(progressTimer);
      progressTimer = null;
    }
  }, 16);
}

function advanceTime(ms) {
  if (state.phase === "promoting") {
    state.phaseElapsed += ms;
    const shouldFinish = state.phaseElapsed >= PROMO_DURATION;
    dom.progressFill.style.width = `${Math.min(state.phaseElapsed / PROMO_DURATION, 1) * 100}%`;
    if (shouldFinish) {
      window.clearTimeout(activeTimer);
      if (progressTimer) {
        window.clearInterval(progressTimer);
        progressTimer = null;
      }
      state.phase = "guestWaiting";
      state.phaseElapsed = 0;
      state.guestSprite = pickRandom(guestSprites);
      addLog("병아리 손님이 가게에 도착했습니다.");
      saveState();
      render();
    }
    return;
  }

  if (state.phase === "serving") {
    state.phaseElapsed += ms;
    const shouldFinish = state.phaseElapsed >= EXIT_DURATION;
    dom.progressFill.style.width = `${Math.min(state.phaseElapsed / EXIT_DURATION, 1) * 100}%`;
    if (shouldFinish) {
      window.clearTimeout(activeTimer);
      if (progressTimer) {
        window.clearInterval(progressTimer);
        progressTimer = null;
      }
      state.phase = "idle";
      state.phaseElapsed = 0;
      addLog("손님이 음식을 받고 바로 떠났습니다.");
      saveState();
      render();
    }
  }
}

function render() {
  dom.promoCount.textContent = String(state.promoCount);
  dom.servedCount.textContent = String(state.servedCount);

  const phaseInfo = getPhaseInfo(state.phase);
  dom.stateTitle.textContent = phaseInfo.title;
  dom.stateDescription.textContent = phaseInfo.description;
  dom.flowLabel.textContent = phaseInfo.flow;

  dom.promotionBtn.disabled = state.phase !== "idle";
  dom.serveBtn.disabled = state.phase !== "guestWaiting";

  dom.guestSprite.src = state.guestSprite;
  dom.guestSprite.hidden = state.phase === "idle" || state.phase === "promoting";

  dom.foodSprite.src = state.currentRecipe.sprite;
  dom.foodSprite.hidden = state.phase !== "serving";

  if (state.phase === "idle") {
    dom.progressFill.style.width = "0%";
  }

  dom.logList.replaceChildren(
    ...state.logs.map((entry) => {
      const item = document.createElement("li");
      item.textContent = entry;
      return item;
    }),
  );
}

function renderGameToText() {
  return JSON.stringify({
    coordinateSystem: "DOM scene, left-to-right layout, top-to-bottom document flow",
    phase: state.phase,
    promoCount: state.promoCount,
    servedCount: state.servedCount,
    currentRecipe: state.currentRecipe.name,
    guestVisible: !dom.guestSprite.hidden,
    foodVisible: !dom.foodSprite.hidden,
    flowLabel: dom.flowLabel.textContent,
    latestLog: state.logs[0] || "",
  });
}

function getPhaseInfo(phase) {
  if (phase === "promoting") {
    return {
      title: "홍보 중입니다",
      description: "가게 바깥으로 소식을 퍼뜨리고 있습니다. 잠시 후 손님이 옵니다.",
      flow: "홍보 진행 중",
    };
  }

  if (phase === "guestWaiting") {
    return {
      title: "병아리 손님이 도착했습니다",
      description: `${state.currentRecipe.name} 하나만 주면 바로 떠나는 가장 기본적인 응대 상태입니다.`,
      flow: "손님 대기",
    };
  }

  if (phase === "serving") {
    return {
      title: `${state.currentRecipe.name}을 전달했습니다`,
      description: "만족도나 추가 판정 없이, 전달 확인 후 손님을 퇴장시키고 있습니다.",
      flow: "퇴장 처리 중",
    };
  }

  return {
    title: "홍보로 첫 손님을 불러보세요",
    description: "지금은 가게가 비어 있습니다.",
    flow: "대기 중",
  };
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}
