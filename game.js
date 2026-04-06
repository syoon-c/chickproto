// Runtime state, simulation, drawing, and bootstrapping.
const dom = {
  topBar: document.querySelector(".top-bar"),
  utilityTopRight: document.querySelector(".utility-stack-top-right"),
  topNoticeStack: document.getElementById("top-notice-stack"),
  menuLaunchBonusBanner: document.getElementById("menu-launch-bonus-banner"),
  menuLaunchBonusName: document.getElementById("menu-launch-bonus-name"),
  menuLaunchBonusTimer: document.getElementById("menu-launch-bonus-timer"),
  acorns: document.getElementById("acorn-count"),
  acornTestBtn: document.getElementById("acorn-test-btn"),
  followers: document.getElementById("follower-count"),
  ingredients: document.getElementById("ingredient-count"),
  restaurantStatusCard: document.querySelector(".status-card-bottom-left"),
  promoStack: document.querySelector(".promo-stack"),
  bottomNav: document.querySelector(".bottom-nav"),
  utilitySideRight: document.querySelector(".utility-side-right"),
  promotionFill: document.getElementById("promotion-fill"),
  promotionText: document.getElementById("promotion-text"),
  rankCurrentLabel: document.getElementById("rank-current-label"),
  rankProgressText: document.getElementById("rank-progress-text"),
  openRankBtn: document.getElementById("open-rank"),
  studyLevel: document.getElementById("study-level"),
  studyCost: document.getElementById("study-cost"),
  studyEffectCopy: document.getElementById("study-effect-copy"),
  studySkillCopy: document.getElementById("study-skill-copy"),
  skillList: document.getElementById("skill-list"),
  studySkillsModal: document.getElementById("study-skills-modal"),
  studySkillsSummary: document.getElementById("study-skills-summary"),
  studySkillsList: document.getElementById("study-skills-list"),
  studySkillsClose: document.getElementById("study-skills-close"),
  recipeTabMenu: document.getElementById("recipe-tab-menu"),
  recipeTabIngredients: document.getElementById("recipe-tab-ingredients"),
  recipeTabBook: document.getElementById("recipe-tab-book"),
  recipeCopy: document.getElementById("recipe-copy"),
  recipeList: document.getElementById("recipe-list"),
  recipeDetailModal: document.getElementById("recipe-detail-modal"),
  recipeDetailTitle: document.getElementById("recipe-detail-title"),
  recipeDetailIcon: document.getElementById("recipe-detail-icon"),
  recipeDetailRarity: document.getElementById("recipe-detail-rarity"),
  recipeDetailLevel: document.getElementById("recipe-detail-level"),
  recipeDetailFragments: document.getElementById("recipe-detail-fragments"),
  recipeDetailMetrics: document.getElementById("recipe-detail-metrics"),
  recipeDetailEnhance: document.getElementById("recipe-detail-enhance"),
  recipeDetailClose: document.getElementById("recipe-detail-close"),
  recipeEventModal: document.getElementById("recipe-event-modal"),
  recipeEventBurst: document.getElementById("recipe-event-burst"),
  recipeEventKicker: document.getElementById("recipe-event-kicker"),
  recipeEventTitle: document.getElementById("recipe-event-title"),
  recipeEventCopy: document.getElementById("recipe-event-copy"),
  recipeEventIcon: document.getElementById("recipe-event-icon"),
  recipeEventRarity: document.getElementById("recipe-event-rarity"),
  recipeEventName: document.getElementById("recipe-event-name"),
  recipeEventAbilities: document.getElementById("recipe-event-abilities"),
  recipeEventCostSection: document.getElementById("recipe-event-cost-section"),
  recipeEventCostLabel: document.getElementById("recipe-event-cost-label"),
  recipeEventCosts: document.getElementById("recipe-event-costs"),
  recipeEventConfirm: document.getElementById("recipe-event-confirm"),
  expansionList: document.getElementById("expansion-list"),
  outingPanel: document.getElementById("outing-panel"),
  outingFarmLevel: document.getElementById("outing-farm-level"),
  outingFarmCharge: document.getElementById("outing-farm-charge"),
  outingInterviewLevel: document.getElementById("outing-interview-level"),
  outingInterviewTicket: document.getElementById("outing-interview-ticket"),
  outingInterviewLock: document.getElementById("outing-interview-lock"),
  enterFarmBtn: document.getElementById("enter-farm-btn"),
  enterInterviewBtn: document.getElementById("enter-interview-btn"),
  staffInterviewLevel: document.getElementById("staff-interview-level"),
  staffInterviewTicket: document.getElementById("staff-interview-ticket"),
  staffOpenInterviewBtn: document.getElementById("staff-open-interview-btn"),
  staffList: document.getElementById("staff-list"),
  staffDetailModal: document.getElementById("staff-detail-modal"),
  staffDetailTitle: document.getElementById("staff-detail-title"),
  staffDetailAvatar: document.getElementById("staff-detail-avatar"),
  staffDetailRole: document.getElementById("staff-detail-role"),
  staffDetailName: document.getElementById("staff-detail-name"),
  staffDetailStat: document.getElementById("staff-detail-stat"),
  staffDetailMetrics: document.getElementById("staff-detail-metrics"),
  staffDetailInterview: document.getElementById("staff-detail-interview"),
  staffDetailClose: document.getElementById("staff-detail-close"),
  snsProfileHeader: document.getElementById("sns-profile-header"),
  snsProfileAvatar: document.getElementById("sns-profile-avatar"),
  snsProfileHandle: document.getElementById("sns-profile-handle"),
  snsProfileName: document.getElementById("sns-profile-name"),
  snsProfilePosts: document.getElementById("sns-profile-posts"),
  snsProfileFollowers: document.getElementById("sns-profile-followers"),
  snsProfileBio: document.getElementById("sns-profile-bio"),
  snsCopyWrap: document.getElementById("sns-copy-wrap"),
  snsCopy: document.getElementById("sns-copy"),
  snsTabMy: document.getElementById("sns-tab-my"),
  snsTabTagged: document.getElementById("sns-tab-tagged"),
  snsMyTools: document.getElementById("sns-my-tools"),
  snsCaptureBtn: document.getElementById("sns-capture-btn"),
  snsCaptureCopy: document.getElementById("sns-capture-copy"),
  snsFeedList: document.getElementById("sns-feed-list"),
  snsPostModal: document.getElementById("sns-post-modal"),
  snsPostBurst: document.getElementById("sns-post-burst"),
  snsPostKicker: document.getElementById("sns-post-kicker"),
  snsPostTitle: document.getElementById("sns-post-title"),
  snsPostCopy: document.getElementById("sns-post-copy"),
  snsPostPreview: document.getElementById("sns-post-preview"),
  snsPostReward: document.getElementById("sns-post-reward"),
  snsPostRewardValue: document.getElementById("sns-post-reward-value"),
  snsPostConfirm: document.getElementById("sns-post-confirm"),
  rankMedalIcon: document.getElementById("rank-medal-icon"),
  rankStageCurrent: document.getElementById("rank-stage-current"),
  rankStageCurrentCopy: document.getElementById("rank-stage-current-copy"),
  rankStageNextCard: document.getElementById("rank-stage-next-card"),
  rankStageNext: document.getElementById("rank-stage-next"),
  rankStageNextCopy: document.getElementById("rank-stage-next-copy"),
  rankPanelCopyWrap: document.getElementById("rank-panel-copy-wrap"),
  rankPanelCopy: document.getElementById("rank-panel-copy"),
  rankGoalList: document.getElementById("rank-goal-list"),
  rankPromoteBtn: document.getElementById("rank-promote-btn"),
  codexDiscovered: document.getElementById("codex-discovered"),
  codexServed: document.getElementById("codex-served"),
  codexCopy: document.getElementById("codex-copy"),
  codexList: document.getElementById("codex-list"),
  codexDetailModal: document.getElementById("codex-detail-modal"),
  codexDetailBadge: document.getElementById("codex-detail-badge"),
  codexDetailTitle: document.getElementById("codex-detail-title"),
  codexDetailCopy: document.getElementById("codex-detail-copy"),
  codexDetailState: document.getElementById("codex-detail-state"),
  codexDetailServed: document.getElementById("codex-detail-served"),
  codexDetailSatisfied: document.getElementById("codex-detail-satisfied"),
  codexDetailPreferred: document.getElementById("codex-detail-preferred"),
  codexDetailUnlock: document.getElementById("codex-detail-unlock"),
  codexDetailPatron: document.getElementById("codex-detail-patron"),
  codexDetailPatronReward: document.getElementById("codex-detail-patron-reward"),
  codexDetailClose: document.getElementById("codex-detail-close"),
  patronEventModal: document.getElementById("patron-event-modal"),
  patronEventBurst: document.getElementById("patron-event-burst"),
  patronEventKicker: document.getElementById("patron-event-kicker"),
  patronEventTitle: document.getElementById("patron-event-title"),
  patronEventCopy: document.getElementById("patron-event-copy"),
  patronEventIcon: document.getElementById("patron-event-icon"),
  patronEventLevel: document.getElementById("patron-event-level"),
  patronEventName: document.getElementById("patron-event-name"),
  patronEventRewards: document.getElementById("patron-event-rewards"),
  patronEventConfirm: document.getElementById("patron-event-confirm"),
  specialGuestModal: document.getElementById("special-guest-modal"),
  rankUpModal: document.getElementById("rank-up-modal"),
  rankUpStamp: document.getElementById("rank-up-stamp"),
  rankUpBadge: document.getElementById("rank-up-badge"),
  rankUpTitle: document.getElementById("rank-up-title"),
  rankUpCopy: document.getElementById("rank-up-copy"),
  rankUpRewardList: document.getElementById("rank-up-reward-list"),
  rankUpUnlockList: document.getElementById("rank-up-unlock-list"),
  rankUpClose: document.getElementById("rank-up-close"),
  skillOptions: document.getElementById("skill-options"),
  studyPanel: document.getElementById("study-panel"),
  recipePanel: document.getElementById("recipe-panel"),
  expansionPanel: document.getElementById("expansion-panel"),
  staffPanel: document.getElementById("staff-panel"),
  snsPanel: document.getElementById("sns-panel"),
  snsShortcutBadge: document.getElementById("sns-shortcut-badge"),
  rankPanel: document.getElementById("rank-panel"),
  codexPanel: document.getElementById("codex-panel"),
  codexShortcutBadge: document.getElementById("codex-shortcut-badge"),
  recipeShortcutBadge: document.getElementById("recipe-shortcut-badge"),
  farmSceneHud: document.getElementById("farm-scene-hud"),
  farmBackBtn: document.getElementById("farm-back-btn"),
  farmLevelLabel: document.getElementById("farm-level-label"),
  farmExpLabel: document.getElementById("farm-exp-label"),
  farmExpFill: document.getElementById("farm-exp-fill"),
  farmChargeLabel: document.getElementById("farm-charge-label"),
  farmNextCharge: document.getElementById("farm-next-charge"),
  farmChargeTestBtn: document.getElementById("farm-charge-test-btn"),
  farmGenerateBtn: document.getElementById("farm-generate-btn"),
  farmInventoryToggle: document.getElementById("farm-inventory-toggle"),
  farmInventoryModal: document.getElementById("farm-inventory-modal"),
  farmInventoryClose: document.getElementById("farm-inventory-close"),
  farmRewardCopy: document.getElementById("farm-reward-copy"),
  farmInventoryList: document.getElementById("farm-inventory-list"),
  interviewSceneHud: document.getElementById("interview-scene-hud"),
  interviewBackBtn: document.getElementById("interview-back-btn"),
  interviewLevelLabel: document.getElementById("interview-level-label"),
  interviewExpLabel: document.getElementById("interview-exp-label"),
  interviewTicketLabel: document.getElementById("interview-ticket-label"),
  interviewCopyTitle: document.getElementById("interview-copy-title"),
  interviewCopy: document.getElementById("interview-copy"),
  interviewStartArea: document.getElementById("interview-start-area"),
  interviewStartSlotList: document.getElementById("interview-start-slot-list"),
  interviewGuide: document.getElementById("interview-guide"),
  interviewResumeCard: document.getElementById("interview-resume-card"),
  interviewResumeClose: document.getElementById("interview-resume-close"),
  interviewResumeAvatar: document.getElementById("interview-resume-avatar"),
  interviewResumeName: document.getElementById("interview-resume-name"),
  interviewResumeTag: document.getElementById("interview-resume-tag"),
  interviewResumeGreeting: document.getElementById("interview-resume-greeting"),
  interviewResumeStats: document.getElementById("interview-resume-stats"),
  interviewResumeSlotPreview: document.getElementById("interview-resume-slot-preview"),
  interviewResumeSelect: document.getElementById("interview-resume-select"),
  interviewAssignCard: document.getElementById("interview-assign-card"),
  interviewAssignAvatar: document.getElementById("interview-assign-avatar"),
  interviewAssignName: document.getElementById("interview-assign-name"),
    interviewAssignTag: document.getElementById("interview-assign-tag"),
    interviewCandidateList: document.getElementById("interview-candidate-list"),
    interviewSlotList: document.getElementById("interview-slot-list"),
    interviewSkipBtn: document.getElementById("interview-skip-btn"),
    interviewSkipConfirmModal: document.getElementById("interview-skip-confirm-modal"),
    interviewSkipConfirmCancel: document.getElementById("interview-skip-confirm-cancel"),
    interviewSkipConfirmAccept: document.getElementById("interview-skip-confirm-accept"),
    skillModal: document.getElementById("skill-modal"),
  startOverlay: document.getElementById("start-overlay"),
  studyUpgradeBtn: document.getElementById("study-upgrade-btn"),
  resetDataBtn: document.getElementById("reset-data-btn"),
};

const SAVE_STORAGE_KEY = "chick-restaurant-core-loop-desktop-v2";
const SAVE_VERSION = 5;
const AUTO_SAVE_INTERVAL_SECONDS = 3;

let state;
let rafId = 0;
const staffBubbles = {
  chef:        { line: "", until: 0, nextAt: 0 },
  server:      { line: "", until: 0, nextAt: 0 },
  promoter:    { line: "", until: 0, nextAt: 0 },
  farmer:      { line: "", until: 0, nextAt: 0 },
  interviewee: { line: "", until: 0 },
  protagonist: { line: "", until: 0 },
};
let lastTime = 0;
let lastPersistClock = 0;
const cameraDragState = {
  pointerId: null,
  startClientX: 0,
  startCameraX: 0,
  distance: 0,
  suppressClick: false,
};
const farmDragState = {
  pointerId: null,
  sourceIndex: null,
  hoverIndex: null,
  startClientX: 0,
  startClientY: 0,
  currentClientX: 0,
  currentClientY: 0,
  distance: 0,
  suppressClick: false,
};
const CHEF_HOME_FALLBACK_POSITION = { x: WORLD_CENTER_X, y: 206 };
const CHEF_LINE_POOLS = {
  opening: [
    "좋아요, 영업 들어가거덩요.",
    "오늘도 맛으로 가보거덩요.",
    "주방 준비 끝났거덩요. 손님 받아볼게요.",
  ],
  idleEmpty: [
    "장사가 왜 이렇게 안 되거덩요...",
    "손님이 없거덩요. 홍보 조금 더 쳐야 돼요.",
    "지금 좀 한가하거덩요. 손님만 오면 바로 들어가요.",
  ],
  idle: [
    "지금은 숨 돌리는 타이밍이거덩요.",
    "손님만 들어오면 바로 갈 수 있거덩요.",
    "주방은 미리 정리돼 있어야 안 꼬이거덩요.",
  ],
  start: [
    "{recipe}, 지금 바로 들어가거덩요.",
    "{recipe}, 타이밍 늦으면 안 되거덩요.",
    "{recipe}, 이건 제가 바로 잡을게요.",
  ],
  rush: [
    "엄청 바쁘거덩요.",
    "지금 주문이 한 번에 들어오거덩요.",
    "이럴 때 동선 꼬이면 바로 밀리거덩요.",
  ],
  finish: [
    "{recipe}, 지금 딱 좋거덩요.",
    "이 정도면 바로 나가도 되거덩요.",
    "{recipe}, 오늘 컨디션 괜찮거덩요.",
  ],
};
const CHEF_RECIPE_COOK_LINES = {
  salad: [
    "샐러드는 식감이 먼저거덩요. 숨 죽으면 끝이에요.",
    "샐러드는 선명해야 되거덩요. 답답하면 바로 티 나요.",
  ],
  sandwich: [
    "샌드위치는 단면이 정직해야 되거덩요.",
    "샌드위치는 한입 밸런스가 맞아야 되거덩요.",
  ],
  hotdog: [
    "핫도그는 소스가 과하면 바로 질리거덩요.",
    "핫도그는 빵이 눅눅하면 안 되거덩요.",
  ],
  soup: [
    "수프는 버터랑 크림 텍스처가 중요하거덩요.",
    "수프는 농도가 한 끗만 어긋나도 바로 느껴지거덩요.",
  ],
  omelet: [
    "오믈렛은 불이 세면 바로 질겨지거덩요.",
    "오믈렛은 결이 부드러워야 되거덩요.",
  ],
  skewers: [
    "꼬치는 겉만 타면 안 되거덩요. 속까지 맞춰야 돼요.",
    "꼬치는 굽는 타이밍이 전부거덩요.",
  ],
  kimbap: [
    "김밥은 속재료 밸런스가 틀어지면 바로 퍽퍽하거덩요.",
    "김밥은 썰었을 때 단면이 깔끔해야 되거덩요.",
  ],
  pizza: [
    "피자는 도우랑 치즈 타이밍이 같이 가야 되거덩요.",
    "피자는 끝맛까지 무너지면 안 되거덩요.",
  ],
  friedrice: [
    "볶음밥은 팬에서 흩어지는 결이 살아야 되거덩요.",
    "볶음밥은 센 불인데도 기름지면 안 되거덩요.",
  ],
  grilledfish: [
    "생선구이는 껍질부터 잡아야 되거덩요.",
    "생선은 비린 끝맛 남으면 바로 티 나거덩요.",
  ],
  burger: [
    "햄버거는 소스보다 패티 온도가 먼저거덩요.",
    "햄버거는 한입에 재료가 다 들어와야 되거덩요.",
  ],
  wedges: [
    "웨지감자는 겉은 바삭하고 속은 포슬해야 되거덩요.",
    "감자는 튀김색부터 맞아야 되거덩요.",
  ],
  bibimbap: [
    "비빔밥은 재료가 따로 놀면 안 되거덩요.",
    "비빔밥은 고추장보다 밥 온도가 중요하거덩요.",
  ],
  dimsum: [
    "딤섬은 피가 두꺼우면 바로 답답하거덩요.",
    "딤섬은 속이 촉촉해야 되거덩요.",
  ],
  pasta: [
    "파스타는 면 익힘이 반 이상이거덩요.",
    "파스타는 소스가 면을 눌러버리면 안 되거덩요.",
  ],
  taco: [
    "타코는 한입에 터지는 산뜻함이 있어야 되거덩요.",
    "타코는 또르띠야 식감부터 잡아야 되거덩요.",
  ],
  ramen: [
    "라멘은 국물 첫 향이 약하면 이미 늦었거덩요.",
    "라멘은 면이 퍼지는 순간 끝이거덩요.",
  ],
  friednoodles: [
    "볶음면은 불향이 얹혀야 되거덩요.",
    "볶음면은 면이 떡지면 바로 무거워지거덩요.",
  ],
  tonkatsu: [
    "돈까스는 튀김옷 소리부터 달라야 되거덩요.",
    "돈까스는 고기 육즙 못 잡으면 바로 퍽퍽하거덩요.",
  ],
  curry: [
    "카레는 향은 진한데 끝은 무거우면 안 되거덩요.",
    "카레는 한 숟갈 먹고 바로 다음 숟갈 가야 되거덩요.",
  ],
  chicken: [
    "치킨은 첫 한입에 바삭함이 터져야 되거덩요.",
    "치킨은 속까지 촉촉해야 되는 거거덩요.",
  ],
  gnocchi: [
    "뇨끼는 질감이 무거우면 바로 티 나거덩요.",
    "뇨끼는 쫀득한데 답답하면 안 되거덩요.",
  ],
  sushi: [
    "초밥은 밥 온도만 틀어져도 밸런스 깨지거덩요.",
    "초밥은 힘 빼고 잡아야 되거덩요.",
  ],
  bulgogi: [
    "불고기는 단맛만 세면 바로 질리거덩요.",
    "불고기는 향은 올라오는데 고기는 부드러워야 되거덩요.",
  ],
  steak: [
    "스테이크는 굽기 한 번 놓치면 돌이키기 어렵거덩요.",
    "스테이크는 육즙이 안에 있어야 되거덩요.",
  ],
};
const LAST_DEPARTURE_BUBBLE_BY_TIER = new Map();

state = loadPersistedState();
lastPersistClock = state.clock || 0;

function getOutstandingOrderCount() {
  return (
    state.restaurant.pendingOrders.length +
    state.restaurant.tables.filter((table) => table.customer?.state === "awaiting_order").length
  );
}

function renderGameToText() {
  const rankStatus = getRankPromotionStatus();
  const hudSpecialGoal = getHudSpecialSatisfiedGoal(rankStatus);
  const visibleCustomers = [
    ...state.restaurant.queue.map((customer) => ({ ...customer, tableId: null })),
    ...state.restaurant.tables
      .filter((table) => table.customer)
      .map((table) => ({ ...table.customer, tableId: table.id })),
    ...state.restaurant.departingCustomers.map((customer) => ({ ...customer, tableId: null })),
  ].map((customer) => ({
    id: customer.id,
    kind: customer.kind,
    name: customer.name,
    badge:
      customer.kind === "special" ? customer.badge || getCustomerProfileBadge(customer.profileId) : "🐥",
    profileId: customer.profileId,
    tableId: customer.tableId,
    recipe: getRecipe(customer.recipeId)?.name || null,
    recipeEmoji: getRecipe(customer.recipeId)?.emoji || null,
    preferredRecipes: (customer.preferredRecipes || []).map(
      (recipeId) => getRecipe(recipeId)?.name || recipeId
    ),
    state: customer.state,
    satisfaction:
      customer.satisfaction && {
        label: customer.satisfaction.label,
        emoji: customer.satisfaction.emoji,
        score: Number(customer.satisfaction.score.toFixed(1)),
        bubbleText: customer.satisfaction.bubbleText,
      },
    x: Number(customer.x.toFixed(1)),
    y: Number(customer.y.toFixed(1)),
    orderBubble:
      customer.state === "awaiting_order"
        ? (() => {
            const bubble = getOrderBubbleRect(customer);
            return {
              x: Number(bubble.x.toFixed(1)),
              y: Number(bubble.y.toFixed(1)),
              width: bubble.width,
              height: bubble.height,
            };
          })()
        : null,
  }));

  const payload = {
    coordinateSystem: "canvas origin=(0,0) top-left, x rightward, y downward",
    mode: state.mode,
    scene: state.scene,
    resources: {
      acorns: state.resources.acorns,
      ingredientTotal: getIngredientTotalCount(),
    },
    study: {
      level: state.study.level,
      nextCost: getStudyCost(),
      skillDraftOpen: state.ui.skillDraft.length > 0,
      skills: Object.fromEntries(
        Object.entries(state.study.skillLevels).filter(([, level]) => level > 0)
      ),
    },
    restaurant: {
      cameraX: Number(state.camera.x.toFixed(1)),
      cameraMaxX: GAME_WORLD_MAX_CAMERA_X,
      worldWidth: WORLD_WIDTH,
      promotionProgress: state.restaurant.promotionProgress,
      promotionThreshold: getPromotionThreshold(),
      queueCount: state.restaurant.queue.length,
      pendingOrders: state.restaurant.pendingOrders.length,
      untappedOrders: state.restaurant.tables.filter(
        (table) => table.customer?.state === "awaiting_order"
      ).length,
      tables: state.restaurant.tables.length,
      stoves: state.restaurant.stoves.length,
      served: state.metrics.served,
      specialSatisfied: getSpecialSatisfiedCount(),
      satisfactionCounts: state.metrics.satisfactionCounts,
      latestSatisfaction: state.metrics.latestSatisfaction,
      nextExpansion: getNextExpansion()?.title || null,
    },
    staffs: {
      chef: {
        level: getStaffLevel("chef"),
        priceMultiplier: Number(getChefPriceMultiplier().toFixed(2)),
        cookMultiplier: Number(getChefCookMultiplier().toFixed(2)),
        actor: {
          x: Number(state.chefActor.x.toFixed(1)),
          y: Number(state.chefActor.y.toFixed(1)),
          targetX: Number(state.chefActor.targetX.toFixed(1)),
          targetY: Number(state.chefActor.targetY.toFixed(1)),
          mode: state.chefActor.mode,
          stoveId: state.chefActor.stoveId,
          activeCount: state.chefActor.activeCount,
          line: state.chefActor.line,
        },
      },
      server: {
        level: getStaffLevel("server"),
        mode: state.staffs.server.mode,
        x: Number(state.staffs.server.x.toFixed(1)),
        y: Number(state.staffs.server.y.toFixed(1)),
        speed: Number(getServerMoveSpeed().toFixed(1)),
        support: Number(getServerSatisfactionSupportForStat(getStaffRelevantStat("server")).toFixed(2)),
      },
      promoter: {
        level: getStaffLevel("promoter"),
        cooldown: Number(getPromoterCooldown().toFixed(1)),
        timer: Number((state.staffs.promoter.timer || 0).toFixed(1)),
        extraChance: Number((getPromoterExtraCustomerChanceForStat(getStaffRelevantStat("promoter")) * 100).toFixed(0)),
      },
      farmer: {
        level: getStaffLevel("farmer"),
        cooldown: Number(getFarmerCooldown().toFixed(1)),
        timer: Number((state.staffs.farmer.timer || 0).toFixed(1)),
        extraChance: Number((getFarmerExtraSpawnChanceForStat(getStaffRelevantStat("farmer")) * 100).toFixed(0)),
      },
      interview: {
        level: state.staffs.interview.level,
        tickets: state.staffs.interview.tickets,
        targetStaffId: state.staffs.interview.targetStaffId,
        candidates: (state.staffs.interview.candidates || []).map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
          staffId: candidate.staffId,
          staffTitle: candidate.staffTitle,
          primaryFocus: candidate.primaryFocus,
          stats: candidate.stats,
        })),
      },
    },
    codex: {
      discovered: getCodexCounts().discovered,
      served: getCodexCounts().served,
      satisfied: getSpecialSatisfiedCount(),
      total: CUSTOMER_PROFILES.length,
      topPatrons: CUSTOMER_PROFILES
        .map((profile) => {
          const entry = getCodexEntry(state, profile.id);
          return {
            profileId: profile.id,
            name: profile.name,
            level: getCustomerPatronLevel(entry),
            served: entry.servedCount,
          };
        })
        .filter((entry) => entry.served > 0)
        .sort((left, right) => right.level - left.level || right.served - left.served)
        .slice(0, 3),
    },
    social: {
      followers: state.social.followers,
      followerPoints: state.social.followerPoints,
      activeTab: state.social.activeTab,
      myPosts: state.social.ownPosts.length,
      taggedPosts: state.social.taggedPosts.length,
      growth: state.social.growth,
      libraryEntries: state.social.library.entriesLoaded,
      librarySource: state.social.library.sourceSummary,
      nextCaptureIn: Number(Math.max(0, state.social.nextCaptureAt - state.clock).toFixed(1)),
      latestTaggedPost:
        state.social.taggedPosts[0] && {
          taggedKind: state.social.taggedPosts[0].taggedKind || "review",
          guestName: state.social.taggedPosts[0].guestName,
          handle: state.social.taggedPosts[0].handle,
          recipeName: state.social.taggedPosts[0].recipeName,
          ratingLabel: state.social.taggedPosts[0].ratingLabel,
          satisfactionTier: state.social.taggedPosts[0].satisfactionTier || null,
          followerGain: state.social.taggedPosts[0].followerGain || 0,
          rewardClaimed: Boolean(state.social.taggedPosts[0].rewardClaimed),
          imageStatus: state.social.taggedPosts[0].imageStatus,
        },
    },
    farm: {
      level: state.farm.level,
      exp: state.farm.exp,
      expTarget: getFarmExpTarget(state.farm.level),
      charges: state.farm.charges,
      maxCharges: state.farm.maxCharges,
      nextChargeIn:
        state.farm.charges >= state.farm.maxCharges
          ? 0
          : Number(Math.max(0, state.farm.nextChargeAt - state.clock).toFixed(1)),
      harvests: state.farm.harvests,
      inventory: state.farm.inventory,
      items: state.farm.board
        .map((item, index) =>
          item
            ? {
                index,
                kind: item.kind,
                name: FARM_ITEM_META[item.kind]?.name || item.kind,
                final: Boolean(FARM_ITEM_META[item.kind]?.final),
              }
            : null
        )
        .filter(Boolean),
      lastRewardText: state.farm.lastRewardText,
    },
    rank: {
      currentTier: getCurrentRankTier().title,
      nextTier: getNextRankTier()?.title || null,
      promotion: {
        completedCount: rankStatus.completedCount,
        totalCount: rankStatus.totalCount,
        eligible: rankStatus.eligible,
        isMax: rankStatus.isMax,
      },
      hudSpecialGoal: hudSpecialGoal
        ? {
            scopeLabel: hudSpecialGoal.scopeLabel,
            current: hudSpecialGoal.current,
            target: hudSpecialGoal.target,
            progressText: hudSpecialGoal.progressText,
            complete: hudSpecialGoal.complete,
          }
        : null,
      celebrationOpen: Boolean(state.ui.rankCelebration),
      newUnlocks: {
        recipes: state.ui.newUnlocks.recipeIds.length,
        guests: state.ui.newUnlocks.guestIds.length,
      },
    },
    customersAtTables: visibleCustomers,
    ownedRecipes: getOwnedRecipes().map(({ recipe, owned }) => ({
      name: getRecipeNameByLevel(recipe.id, owned.level),
      level: owned.level,
      stage: getRecipeStageLabel(owned.level),
      enhanceCost: getRecipeUpgradeCost(recipe.id, owned.level),
      payout: getRecipePayout(recipe.id),
      cookTime: Number(getRecipeCookTime(recipe.id).toFixed(1)),
    })),
    unlockedRecipes: getUnlockedRecipes().map((recipe) => recipe.id),
    panel: state.ui.openPanel,
    recipeTab: state.ui.recipeTab,
    recipeDetail: state.ui.recipeDetailId,
    staffDetail: state.ui.staffDetailId,
    recipeCelebration: state.ui.recipeCelebration
      ? {
          kind: state.ui.recipeCelebration.kind,
          recipeId: state.ui.recipeCelebration.recipeId,
          recipeName: state.ui.recipeCelebration.recipeName,
        }
      : null,
    patronCelebration: state.ui.patronCelebration
      ? {
          profileId: state.ui.patronCelebration.profileId,
          level: state.ui.patronCelebration.level,
        }
      : null,
    codexDetail: state.ui.codexDetailId,
    specialGuestAlert: state.ui.specialGuestAlert,
  };
  return JSON.stringify(payload);
}

function advanceTime(ms) {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let index = 0; index < steps; index += 1) {
    update(FIXED_DT);
  }
  renderDynamicUI();
  draw();
}

function isCanvasInteractionLocked() {
  return (
    state.mode !== "playing" ||
    state.scene === SCENE_INTERVIEW ||
    state.ui.openPanel ||
    state.ui.skillDraft.length > 0 ||
    state.ui.recipeCelebration ||
    state.ui.patronCelebration ||
    state.ui.specialGuestAlert ||
    state.ui.rankCelebration
  );
}

function getCanvasPointerMetrics(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = GAME_WIDTH / rect.width;
  const scaleY = GAME_HEIGHT / rect.height;
  const viewportX = (clientX - rect.left) * scaleX;
  const viewportY = (clientY - rect.top) * scaleY;
  return {
    scaleX,
    scaleY,
    viewportX,
    viewportY,
    worldX: viewportX + state.camera.x,
    worldY: viewportY,
  };
}

function beginFarmDrag(event) {
  if (state.mode !== "playing" || state.scene !== SCENE_FARM || state.ui.openPanel) {
    return;
  }
  const { viewportX, viewportY } = getCanvasPointerMetrics(event.clientX, event.clientY);
  const sourceIndex = getFarmCellIndexAt(viewportX, viewportY);
  if (sourceIndex < 0 || !state.farm.board[sourceIndex]) {
    return;
  }
  if (FARM_ITEM_META[state.farm.board[sourceIndex].kind]?.final) {
    return;
  }
  farmDragState.pointerId = event.pointerId;
  farmDragState.sourceIndex = sourceIndex;
  farmDragState.hoverIndex = sourceIndex;
  farmDragState.startClientX = event.clientX;
  farmDragState.startClientY = event.clientY;
  farmDragState.currentClientX = event.clientX;
  farmDragState.currentClientY = event.clientY;
  farmDragState.distance = 0;
  farmDragState.suppressClick = false;
  canvas.setPointerCapture?.(event.pointerId);
}

function updateFarmDrag(event) {
  if (farmDragState.pointerId !== event.pointerId) {
    return;
  }
  const { viewportX, viewportY } = getCanvasPointerMetrics(event.clientX, event.clientY);
  farmDragState.currentClientX = event.clientX;
  farmDragState.currentClientY = event.clientY;
  farmDragState.distance = Math.max(
    farmDragState.distance,
    Math.hypot(event.clientX - farmDragState.startClientX, event.clientY - farmDragState.startClientY)
  );
  farmDragState.hoverIndex = getFarmCellIndexAt(viewportX, viewportY);
}

function endFarmDrag(event) {
  if (farmDragState.pointerId !== event.pointerId) {
    return;
  }
  if (farmDragState.distance > FARM_DRAG_THRESHOLD) {
    const { viewportX, viewportY } = getCanvasPointerMetrics(event.clientX, event.clientY);
    const targetIndex = getFarmCellIndexAt(viewportX, viewportY);
    if (targetIndex >= 0) {
      moveFarmItem(farmDragState.sourceIndex, targetIndex);
      refreshAllUI();
      persistStateNow();
    }
    farmDragState.suppressClick = true;
    window.setTimeout(() => {
      farmDragState.suppressClick = false;
    }, 0);
  }

  canvas.releasePointerCapture?.(event.pointerId);
  farmDragState.pointerId = null;
  farmDragState.sourceIndex = null;
  farmDragState.hoverIndex = null;
  farmDragState.distance = 0;
}

function beginCameraDrag(event) {
  if (isCanvasInteractionLocked()) {
    return;
  }
  cameraDragState.suppressClick = false;
  cameraDragState.pointerId = event.pointerId;
  cameraDragState.startClientX = event.clientX;
  cameraDragState.startCameraX = state.camera.x;
  cameraDragState.distance = 0;
  canvas.setPointerCapture?.(event.pointerId);
}

function handleCanvasPointerDown(event) {
  if (state.scene === SCENE_INTERVIEW) {
    const { viewportX, viewportY } = getCanvasPointerMetrics(event.clientX, event.clientY);
    const interview = state.staffs.interview;
    const candidates = interview.candidates || [];

    // 주인공 터치 → 교섭권 치트
    const pdx = viewportX - IV_PROTAGONIST_X;
    const pdy = viewportY - IV_PROTAGONIST_Y;
    if (pdx * pdx + pdy * pdy < 45 * 45) {
      interview.tickets += 1;
      pushLog("주인공을 톡 건드렸다. 교섭권 1장이 생겼다.");
      refreshAllUI();
      persistStateNow();
      return;
    }

    // 후보 터치 → 포커스/해제
    if (candidates.length > 0 && !interview.selectedCandidateId) {
      const positions = getInterviewCandidatePositions();
      for (const pos of positions) {
        const cdx = viewportX - pos.x;
        const cdy = viewportY - (pos.focused ? pos.y - 10 : pos.y - 10);
        if (cdx * cdx + cdy * cdy < 40 * 40) {
          if (pos.focused) {
            // 이미 포커스된 후보를 다시 터치 → 선택 확정
            selectInterviewCandidate(pos.candidate.id);
          } else {
            // 새 후보 포커스
            focusInterviewCandidate(pos.candidate.id);
          }
          refreshAllUI();
          return;
        }
      }
      // 빈 공간 터치 → 포커스 해제
      if (interview.focusedCandidateId) {
        clearInterviewCandidateFocus();
        refreshAllUI();
      }
    }
    return;
  }
  if (state.scene === SCENE_FARM) {
    beginFarmDrag(event);
    return;
  }
  beginCameraDrag(event);
}

function handleCanvasPointerMove(event) {
  if (state.scene === SCENE_FARM) {
    updateFarmDrag(event);
    return;
  }
  updateCameraDrag(event);
}

function handleCanvasPointerUp(event) {
  if (state.scene === SCENE_FARM) {
    endFarmDrag(event);
    return;
  }
  endCameraDrag(event);
}

function updateCameraDrag(event) {
  if (cameraDragState.pointerId !== event.pointerId) {
    return;
  }
  const metrics = getCanvasPointerMetrics(event.clientX, event.clientY);
  const deltaWorldX = (event.clientX - cameraDragState.startClientX) * metrics.scaleX;
  cameraDragState.distance = Math.max(cameraDragState.distance, Math.abs(deltaWorldX));
  if (GAME_WORLD_MAX_CAMERA_X <= 0) {
    return;
  }
  state.camera.x = clampCameraX(cameraDragState.startCameraX - deltaWorldX);
}

function endCameraDrag(event) {
  if (cameraDragState.pointerId !== event.pointerId) {
    return;
  }
  cameraDragState.suppressClick = cameraDragState.distance > CAMERA_DRAG_THRESHOLD;
  if (cameraDragState.suppressClick) {
    window.setTimeout(() => {
      cameraDragState.suppressClick = false;
    }, 0);
  }
  canvas.releasePointerCapture?.(event.pointerId);
  cameraDragState.pointerId = null;
  cameraDragState.startClientX = 0;
  cameraDragState.startCameraX = state.camera.x;
  cameraDragState.distance = 0;
}

function handleFarmCanvasClick(viewportX, viewportY) {
  const cellIndex = getFarmCellIndexAt(viewportX, viewportY);
  if (cellIndex < 0) {
    return;
  }
  if (collectFarmFinal(cellIndex)) {
    refreshAllUI();
    persistStateNow();
  }
}

function frame(timestamp) {
  if (!lastTime) {
    lastTime = timestamp;
  }

  const delta = Math.min(0.05, (timestamp - lastTime) / 1000);
  lastTime = timestamp;
  update(delta);
  renderDynamicUI();
  draw();
  rafId = requestAnimationFrame(frame);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

document.getElementById("start-btn")?.addEventListener("click", startGame);
document.getElementById("promotion-btn")?.addEventListener("click", handlePromotion);
dom.topNoticeStack?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-top-notice-id]");
  if (!button) {
    return;
  }
  dismissTopNotice(button.dataset.topNoticeId);
  refreshAllUI();
  persistStateNow();
});
dom.resetDataBtn?.addEventListener("click", handleResetData);

window.addEventListener("keydown", (event) => {
  if (event.key === "f") {
    toggleFullscreen();
  }
  if (event.key === "Escape" && document.fullscreenElement) {
    document.exitFullscreen?.();
  }
});

window.addEventListener("pagehide", persistStateNow);
window.addEventListener("beforeunload", persistStateNow);
window.addEventListener("resize", () => {
  configureCanvasResolution();
  draw();
});

canvas.addEventListener("pointerdown", handleCanvasPointerDown);
canvas.addEventListener("pointermove", handleCanvasPointerMove);
canvas.addEventListener("pointerup", handleCanvasPointerUp);
canvas.addEventListener("pointercancel", handleCanvasPointerUp);

canvas.addEventListener("click", (event) => {
  if (state.scene === SCENE_FARM) {
    if (farmDragState.suppressClick) {
      farmDragState.suppressClick = false;
      return;
    }
    if (state.mode !== "playing" || state.ui.openPanel) {
      return;
    }
    const { viewportX, viewportY } = getCanvasPointerMetrics(event.clientX, event.clientY);
    handleFarmCanvasClick(viewportX, viewportY);
    return;
  }

  if (cameraDragState.suppressClick) {
    cameraDragState.suppressClick = false;
    return;
  }

  if (isCanvasInteractionLocked()) {
    return;
  }

  const { worldX, worldY } = getCanvasPointerMetrics(event.clientX, event.clientY);

  for (const table of [...state.restaurant.tables].reverse()) {
    if (!table.customer || table.customer.state !== "awaiting_order") {
      continue;
    }

    const bubble = getOrderBubbleRect(table.customer);
    const isInside =
      worldX >= bubble.x &&
      worldX <= bubble.x + bubble.width &&
      worldY >= bubble.y &&
      worldY <= bubble.y + bubble.height;

    if (isInside) {
      acceptOrder(table.id);
      break;
    }
  }
});

window.render_game_to_text = renderGameToText;
window.advanceTime = advanceTime;
window.resetPrototype = () => resetGame({ clearSave: true });

configureCanvasResolution();
primeChickIconCache();
syncStartOverlay();
renderSkillOptions();
refreshAllUI();
setChefLine("opening", null, {
  force: true,
  duration: 3.1,
  nextDelay: 6.1,
});
rafId = requestAnimationFrame(frame);
