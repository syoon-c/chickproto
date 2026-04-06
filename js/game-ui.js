// Minimal HUD-only UI for the restaurant core loop.

function renderDynamicUI() {
  if (dom.acorns) {
    dom.acorns.textContent = formatNumber(state.resources.acorns);
  }

  const threshold = Math.max(1, getPromotionThreshold());
  const progress = Math.max(0, Number(state.restaurant.promotionProgress || 0));
  const ratio = Math.max(0, Math.min(1, progress / threshold));

  if (dom.promotionFill) {
    dom.promotionFill.style.width = `${ratio * 100}%`;
  }

  if (dom.promotionText) {
    dom.promotionText.textContent = `${progress} / ${threshold}`;
  }
}

function refreshAllUI() {
  renderDynamicUI();
  if (typeof draw === "function") {
    draw();
  }
}

function renderSkillOptions() {}

function getPanel() {
  return null;
}

function openPanel() {}

function closePanels() {
  if (state?.ui) {
    state.ui.openPanel = null;
  }
}

function handleResetData() {
  if (typeof resetGame === "function") {
    resetGame({ clearSave: true });
  }
}

function handleStudyUpgrade() {}
function closeStudySkillsModal() {}
function switchRecipeTab(tabName) {
  if (state?.ui) {
    state.ui.recipeTab = tabName === "ingredients" || tabName === "recipe" ? tabName : "menu";
  }
  refreshAllUI();
}
function switchSocialTab() {}
function openSocialPostModal() {}
function closeSocialPostModal() {}
function claimSocialPostReward() {}
function handleRankPromotion() {}
function closeRankCelebration(forceClose = false) {
  if (state?.ui && (forceClose || state.ui.rankCelebration)) {
    state.ui.rankCelebration = null;
  }
}
function closeRecipeCelebration() {
  if (state?.ui) {
    state.ui.recipeCelebration = null;
  }
}
function closePatronCelebration() {
  if (state?.ui) {
    state.ui.patronCelebration = null;
  }
}
function closeCodexDetail() {
  if (state?.ui) {
    state.ui.codexDetailId = null;
  }
}
function closeRecipeDetail() {
  if (state?.ui) {
    state.ui.recipeDetailId = null;
  }
}
function closeStaffDetail() {
  if (state?.ui) {
    state.ui.staffDetailId = null;
  }
}
function openInterviewSkipConfirm() {}
function closeInterviewSkipConfirm() {}
function confirmInterviewSkipSelection() {}
function renderRecipeDetailModal() {}
function renderFarmHud() {}
function pushTopNotice() {}
function dismissTopNotice() {}
function pruneExpiredTopNotices() {}
