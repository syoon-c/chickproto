// Initial state creation, save/load, and persistent meta reconstruction.

function normalizeRecipeTab(tabName) {
  return tabName === "recipe" || tabName === "ingredients" ? tabName : "menu";
}

function createInitialState() {
  const initial = {
    mode: "playing",
    scene: SCENE_RESTAURANT,
    clock: 0,
    customerSeq: 1,
    ui: {
      openPanel: null,
      recipeTab: "menu",
      recipeDetailId: null,
      staffDetailId: null,
      socialPostDetail: null,
      recipeCelebration: null,
      recipeCelebrationQueue: [],
      patronCelebration: null,
      patronCelebrationQueue: [],
      codexDetailId: null,
      specialGuestAlert: null,
      specialGuestQueue: [],
      topNotices: [],
      topNoticeSeq: 1,
      rankCelebration: null,
      newUnlocks: {
        recipeIds: [],
        guestIds: [],
      },
      logs: [],
      skillDraft: [],
      farmInventoryOpen: false,
    },
    chefActor: createInitialChefActor(),
    camera: {
      x: INITIAL_CAMERA_X,
    },
    resources: {
      acorns: TABLE_INITIAL_ACORNS,
      books: 12,
    },
    metrics: {
      served: 0,
      promotionActions: 0,
      earnedFromService: 0,
      recipeBookProgress: 0,
      interviewSessions: 0,
      staffHires: 0,
      recipeServedCounts: {},
      satisfactionCounts: {
        delighted: 0,
        happy: 0,
        okay: 0,
        disappointed: 0,
      },
      latestSatisfaction: null,
    },
    restaurant: {
      queue: [],
      tables: [],
      stoves: [],
      departingCustomers: [],
      pendingOrders: [],
      expansionIndex: 0,
      purchased: [],
      promotionProgress: 0,
      promoBase: TABLE_PROMOTION_TOUCH_COUNT,
      promoFloor: 2,
      ambience: 0,
      menuLaunchBonus: null,
    },
    study: {
      level: 0,
      skillLevels: {},
      skillBonuses: {
        price: 0,
        cook: 0,
        promotion: 0,
        eat: 0,
        specialGuestChance: 0,
        farmBonusChance: 0,
      },
    },
    recipes: {
      owned: {},
      manualUnlocks: {},
      announcedUnlocks: {},
      selectedId: RECIPE_CATALOG[0]?.id || null,
    },
    staffs: createInitialStaffState(),
    social: createInitialSocialState(),
    farm: createInitialFarmState(),
    rank: {
      tierIndex: 0,
      readyNoticeTier: -1,
      progressBaselines: {
        served: 0,
        promotionActions: 0,
        ownPosts: 0,
        recipeRegistrations: 0,
        farmGenerations: 0,
        farmHarvests: 0,
        recipeServedCounts: {},
      },
    },
    codex: {
      entries: {},
    },
  };

  for (let index = 0; index < INITIAL_TABLE_COUNT; index += 1) {
    addTable(initial);
  }
  for (let index = 0; index < INITIAL_STOVE_COUNT; index += 1) {
    addStove(initial);
  }
  const chefHome = getChefHomePosition(initial);
  initial.chefActor.x = chefHome.x;
  initial.chefActor.y = chefHome.y;
  initial.chefActor.targetX = chefHome.x;
  initial.chefActor.targetY = chefHome.y;
  if (RECIPE_CATALOG[0]) {
    grantRecipeOwnership(initial, RECIPE_CATALOG[0].id, { level: 1 });
  }
  for (const recipe of getUnlockedRecipes(initial)) {
    initial.recipes.announcedUnlocks[recipe.id] = true;
  }
  queueCustomer(initial);
  queueCustomer(initial);

  return initial;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeSavedData(baseValue, savedValue) {
  if (Array.isArray(baseValue)) {
    return Array.isArray(savedValue) ? savedValue : baseValue;
  }
  if (isPlainObject(baseValue)) {
    const result = { ...baseValue };
    if (!isPlainObject(savedValue)) {
      return result;
    }
    for (const key of Object.keys(savedValue)) {
      result[key] = key in baseValue ? mergeSavedData(baseValue[key], savedValue[key]) : savedValue[key];
    }
    return result;
  }
  return savedValue === undefined ? baseValue : savedValue;
}

function filterResidentReviewPosts(posts) {
  if (!Array.isArray(posts)) {
    return [];
  }
  return posts.filter((post) => post?.type === "tagged" && post?.taggedKind !== "unlock").slice(0, 18);
}

function buildPersistableState(targetState = state) {
  const persistable = {
    clock: Number.isFinite(targetState.clock) ? targetState.clock : 0,
    customerSeq: Number.isFinite(targetState.customerSeq) ? targetState.customerSeq : 1,
    resources: {
      acorns: Number(targetState.resources?.acorns || 0),
      books: Number(targetState.resources?.books || 0),
    },
    metrics: {
      served: Number(targetState.metrics?.served || 0),
      promotionActions: Number(targetState.metrics?.promotionActions || 0),
      earnedFromService: Number(targetState.metrics?.earnedFromService || 0),
      recipeBookProgress: Number(targetState.metrics?.recipeBookProgress || 0),
      interviewSessions: Number(targetState.metrics?.interviewSessions || 0),
      staffHires: Number(targetState.metrics?.staffHires || 0),
      recipeServedCounts: isPlainObject(targetState.metrics?.recipeServedCounts)
        ? { ...targetState.metrics.recipeServedCounts }
        : {},
      satisfactionCounts: {
        delighted: Number(targetState.metrics?.satisfactionCounts?.delighted || 0),
        happy: Number(targetState.metrics?.satisfactionCounts?.happy || 0),
        okay: Number(targetState.metrics?.satisfactionCounts?.okay || 0),
        disappointed: Number(targetState.metrics?.satisfactionCounts?.disappointed || 0),
      },
      latestSatisfaction: targetState.metrics?.latestSatisfaction || null,
    },
    restaurant: {
      expansionIndex: Number(targetState.restaurant?.expansionIndex || 0),
      promotionProgress: Number(targetState.restaurant?.promotionProgress || 0),
      promoBase: Number(targetState.restaurant?.promoBase || TABLE_PROMOTION_TOUCH_COUNT),
      promoFloor: Number(targetState.restaurant?.promoFloor || 2),
      ambience: Number(targetState.restaurant?.ambience || 0),
      purchased: Array.isArray(targetState.restaurant?.purchased) ? [...targetState.restaurant.purchased] : [],
      menuLaunchBonus:
        isPlainObject(targetState.restaurant?.menuLaunchBonus) &&
        targetState.restaurant.menuLaunchBonus.recipeId
          ? {
              recipeId: targetState.restaurant.menuLaunchBonus.recipeId,
              rarity: targetState.restaurant.menuLaunchBonus.rarity || "basic",
              startedAt: Number(targetState.restaurant.menuLaunchBonus.startedAt || 0),
              expiresAt: Number(targetState.restaurant.menuLaunchBonus.expiresAt || 0),
              duration: Number(targetState.restaurant.menuLaunchBonus.duration || 0),
              nextGuestAt: Number(targetState.restaurant.menuLaunchBonus.nextGuestAt || 0),
            }
          : null,
    },
    study: {
      level: Number(targetState.study?.level || 0),
      skillLevels: isPlainObject(targetState.study?.skillLevels) ? { ...targetState.study.skillLevels } : {},
      skillBonuses: {
        price: Number(targetState.study?.skillBonuses?.price || 0),
        cook: Number(targetState.study?.skillBonuses?.cook || 0),
        promotion: 0,
        eat: Number(targetState.study?.skillBonuses?.eat || 0),
        specialGuestChance: Number(targetState.study?.skillBonuses?.specialGuestChance || 0),
        farmBonusChance: Number(targetState.study?.skillBonuses?.farmBonusChance || 0),
      },
    },
    recipes: {
      owned: isPlainObject(targetState.recipes?.owned) ? { ...targetState.recipes.owned } : {},
      manualUnlocks: isPlainObject(targetState.recipes?.manualUnlocks) ? { ...targetState.recipes.manualUnlocks } : {},
      announcedUnlocks: isPlainObject(targetState.recipes?.announcedUnlocks)
        ? { ...targetState.recipes.announcedUnlocks }
        : {},
      selectedId: targetState.recipes?.selectedId || null,
    },
    staffs: {
      chef: {
        level: Number(targetState.staffs?.chef?.level || 0),
        candidate: targetState.staffs?.chef?.candidate || null,
      },
      server: {
        level: Number(targetState.staffs?.server?.level || 0),
        candidate: targetState.staffs?.server?.candidate || null,
      },
      promoter: {
        level: Number(targetState.staffs?.promoter?.level || 0),
        candidate: targetState.staffs?.promoter?.candidate || null,
        x: Number(targetState.staffs?.promoter?.x || 308),
        y: Number(targetState.staffs?.promoter?.y || 746),
        timer: Number(targetState.staffs?.promoter?.timer || 0),
      },
      farmer: {
        level: Number(targetState.staffs?.farmer?.level || 0),
        candidate: targetState.staffs?.farmer?.candidate || null,
        timer: Number(targetState.staffs?.farmer?.timer || 0),
      },
      interview: {
        level: Number(targetState.staffs?.interview?.level || STAFF_INTERVIEW_START_LEVEL),
        exp: Number(targetState.staffs?.interview?.exp || 0),
        tickets: Number(targetState.staffs?.interview?.tickets ?? STAFF_INTERVIEW_START_TICKETS),
        ticketNextChargeAt:
          Number.isFinite(Number(targetState.staffs?.interview?.ticketNextChargeAt))
            ? Number(targetState.staffs.interview.ticketNextChargeAt)
            : 0,
        nextCandidateId: Number(targetState.staffs?.interview?.nextCandidateId || 1),
        targetStaffId: targetState.staffs?.interview?.targetStaffId || null,
        candidates: Array.isArray(targetState.staffs?.interview?.candidates)
          ? targetState.staffs.interview.candidates.slice(0, STAFF_INTERVIEW_CANDIDATE_COUNT)
          : [],
        selectedCandidateId: targetState.staffs?.interview?.selectedCandidateId || null,
        focusedCandidateId: null,
      },
    },
    social: {
      feedSeq: Number(targetState.social?.feedSeq || 1),
      activeTab: targetState.social?.activeTab === "tagged" ? "tagged" : "my",
      ownPosts: Array.isArray(targetState.social?.ownPosts) ? targetState.social.ownPosts.slice(0, 12) : [],
      taggedPosts: filterResidentReviewPosts(targetState.social?.taggedPosts),
      nextCaptureAt: Number(targetState.social?.nextCaptureAt || 0),
      captureCooldown: Number(targetState.social?.captureCooldown || 0),
      ownPostCount: Number(targetState.social?.ownPostCount || 0) || (Array.isArray(targetState.social?.ownPosts) ? targetState.social.ownPosts.length : 0),
      followerPoints: Number(targetState.social?.followerPoints || 0),
      followers: Number(targetState.social?.followers || 0),
      growth: isPlainObject(targetState.social?.growth) ? { ...targetState.social.growth } : null,
    },
    farm: {
      level: Math.max(1, Number(targetState.farm?.level || 1)),
      exp: Number(targetState.farm?.exp || 0),
      charges: Number(targetState.farm?.charges ?? FARM_STARTING_CHARGES),
      maxCharges: Number(targetState.farm?.maxCharges ?? FARM_MAX_CHARGES),
      nextChargeAt: Number(targetState.farm?.nextChargeAt || 0),
      itemSeq: Number(targetState.farm?.itemSeq || 1),
      generatedCount: Number(targetState.farm?.generatedCount || 0),
      harvests: Number(targetState.farm?.harvests || 0),
      inventory: isPlainObject(targetState.farm?.inventory) ? { ...targetState.farm.inventory } : {},
      board: Array.isArray(targetState.farm?.board)
        ? targetState.farm.board.map((item) =>
            item && FARM_ITEM_META[item.kind] ? { id: item.id, kind: item.kind } : null
          )
        : [],
      lastRewardText: targetState.farm?.lastRewardText || "",
    },
    rank: {
      tierIndex: Number(targetState.rank?.tierIndex || 0),
      readyNoticeTier: Number(targetState.rank?.readyNoticeTier ?? -1),
      progressBaselines: isPlainObject(targetState.rank?.progressBaselines)
        ? {
            served: Number(targetState.rank.progressBaselines?.served || 0),
            promotionActions: Number(targetState.rank.progressBaselines?.promotionActions || 0),
            ownPosts: Number(targetState.rank.progressBaselines?.ownPosts || 0),
            recipeRegistrations: Number(targetState.rank.progressBaselines?.recipeRegistrations || 0),
            farmGenerations: Number(targetState.rank.progressBaselines?.farmGenerations || 0),
            farmHarvests: Number(targetState.rank.progressBaselines?.farmHarvests || 0),
            recipeServedCounts: isPlainObject(targetState.rank.progressBaselines?.recipeServedCounts)
              ? { ...targetState.rank.progressBaselines.recipeServedCounts }
              : {},
          }
        : null,
    },
    codex: {
      entries: isPlainObject(targetState.codex?.entries) ? { ...targetState.codex.entries } : {},
    },
    ui: {
      recipeTab: normalizeRecipeTab(targetState.ui?.recipeTab),
      logs: Array.isArray(targetState.ui?.logs) ? targetState.ui.logs.slice(-12) : [],
      farmInventoryOpen: Boolean(targetState.ui?.farmInventoryOpen),
    },
  };
  return JSON.parse(JSON.stringify(persistable));
}

function shouldMigrateLegacyStudyStart(targetState) {
  const studyLevel = Number(targetState.study?.level ?? 0);
  const served = Number(targetState.metrics?.served ?? 0);
  const rankTierIndex = Number(targetState.rank?.tierIndex ?? 0);
  const hasSkills = Object.keys(targetState.study?.skillLevels || {}).length > 0;
  return studyLevel === 1 && served <= 0 && rankTierIndex === 0 && !hasSkills;
}

function clampCameraX(value) {
  return Math.max(0, Math.min(GAME_WORLD_MAX_CAMERA_X, Number.isFinite(value) ? value : 0));
}

function normalizeLoadedState(savedState) {
  const initial = createInitialState();
  const merged = mergeSavedData(initial, savedState);

  merged.mode = merged.mode === "playing" ? "playing" : "start";
  merged.scene = SCENE_RESTAURANT;
  merged.clock = Number.isFinite(merged.clock) ? merged.clock : 0;
  merged.customerSeq = Number.isFinite(merged.customerSeq) ? merged.customerSeq : 1;
  merged.resources = {
    acorns: Number(merged.resources?.acorns || 0),
    books: Number(merged.resources?.books || 0),
  };

  merged.ui = {
    ...initial.ui,
    ...(isPlainObject(merged.ui) ? merged.ui : {}),
    openPanel: null,
    recipeTab: normalizeRecipeTab(merged.ui?.recipeTab),
    recipeDetailId: null,
    staffDetailId: null,
    socialPostDetail: null,
    recipeCelebration: null,
    recipeCelebrationQueue: [],
    patronCelebration: null,
    patronCelebrationQueue: [],
    codexDetailId: null,
    specialGuestAlert: null,
    specialGuestQueue: [],
    topNotices: [],
    topNoticeSeq: 1,
    rankCelebration: null,
    skillDraft: [],
    farmInventoryOpen: Boolean(merged.ui?.farmInventoryOpen),
    newUnlocks: {
      recipeIds: [],
      guestIds: [],
    },
    logs:
      Array.isArray(merged.ui?.logs) && merged.ui.logs.length > 0
        ? merged.ui.logs.slice(-12)
        : initial.ui.logs,
  };

  merged.metrics = {
    ...initial.metrics,
    ...(isPlainObject(merged.metrics) ? merged.metrics : {}),
    recipeServedCounts: {
      ...initial.metrics.recipeServedCounts,
      ...(isPlainObject(merged.metrics?.recipeServedCounts) ? merged.metrics.recipeServedCounts : {}),
    },
    satisfactionCounts: {
      ...initial.metrics.satisfactionCounts,
      ...(isPlainObject(merged.metrics?.satisfactionCounts) ? merged.metrics.satisfactionCounts : {}),
    },
  };

  merged.restaurant = {
    ...initial.restaurant,
    ...(isPlainObject(merged.restaurant) ? merged.restaurant : {}),
    queue: [],
    tables: initial.restaurant.tables,
    stoves: initial.restaurant.stoves,
    departingCustomers: [],
    pendingOrders: [],
  };
  merged.restaurant.menuLaunchBonus =
    isPlainObject(merged.restaurant?.menuLaunchBonus) && merged.restaurant.menuLaunchBonus.recipeId
      ? {
          recipeId: merged.restaurant.menuLaunchBonus.recipeId,
          rarity: merged.restaurant.menuLaunchBonus.rarity || "basic",
          startedAt: Number(merged.restaurant.menuLaunchBonus.startedAt || 0),
          expiresAt: Number(merged.restaurant.menuLaunchBonus.expiresAt || 0),
          duration: Number(merged.restaurant.menuLaunchBonus.duration || 0),
          nextGuestAt: Number(merged.restaurant.menuLaunchBonus.nextGuestAt || 0),
        }
      : null;
  if (
    merged.restaurant.menuLaunchBonus &&
    Number(merged.restaurant.menuLaunchBonus.expiresAt || 0) <= Number(merged.clock || 0)
  ) {
    merged.restaurant.menuLaunchBonus = null;
  }
  normalizeRestaurantFacilities(merged.restaurant);

  merged.study = {
    ...initial.study,
    ...(isPlainObject(merged.study) ? merged.study : {}),
    skillLevels: isPlainObject(merged.study?.skillLevels) ? merged.study.skillLevels : {},
    skillBonuses: {
      price: Number(merged.study?.skillBonuses?.price || 0),
      cook: Number(merged.study?.skillBonuses?.cook || 0),
      promotion: 0,
      eat: Number(merged.study?.skillBonuses?.eat || 0),
      specialGuestChance: Number(merged.study?.skillBonuses?.specialGuestChance || 0),
      farmBonusChance: Number(merged.study?.skillBonuses?.farmBonusChance || 0),
    },
  };
  if (shouldMigrateLegacyStudyStart(merged)) {
    merged.study.level = 0;
  }

  merged.recipes = {
    ...initial.recipes,
    ...(isPlainObject(merged.recipes) ? merged.recipes : {}),
    owned: isPlainObject(merged.recipes?.owned) ? merged.recipes.owned : {},
    manualUnlocks: isPlainObject(merged.recipes?.manualUnlocks) ? merged.recipes.manualUnlocks : {},
    announcedUnlocks: isPlainObject(merged.recipes?.announcedUnlocks) ? merged.recipes.announcedUnlocks : {},
  };
  if (!isPlainObject(savedState?.recipes?.announcedUnlocks)) {
    merged.recipes.announcedUnlocks = {};
    for (const recipe of getUnlockedRecipes(merged)) {
      merged.recipes.announcedUnlocks[recipe.id] = true;
    }
  }
  const ownedRecipeIds = Object.keys(merged.recipes.owned);
  if (!merged.recipes.selectedId || (!merged.recipes.owned[merged.recipes.selectedId] && ownedRecipeIds.length > 0)) {
    merged.recipes.selectedId = ownedRecipeIds[0] || initial.recipes.selectedId;
  }

  merged.staffs = {
    chef: {
      ...initial.staffs.chef,
      ...(isPlainObject(merged.staffs?.chef) ? merged.staffs.chef : {}),
    },
    server: {
      ...initial.staffs.server,
      ...(isPlainObject(merged.staffs?.server) ? merged.staffs.server : {}),
      x: initial.staffs.server.x,
      y: initial.staffs.server.y,
      targetX: initial.staffs.server.targetX,
      targetY: initial.staffs.server.targetY,
      tableId: null,
      mode: "idle",
    },
    promoter: {
      ...initial.staffs.promoter,
      ...(isPlainObject(merged.staffs?.promoter) ? merged.staffs.promoter : {}),
    },
    farmer: {
      ...initial.staffs.farmer,
      ...(isPlainObject(merged.staffs?.farmer) ? merged.staffs.farmer : {}),
    },
      interview: {
        ...initial.staffs.interview,
        ...(isPlainObject(merged.staffs?.interview) ? merged.staffs.interview : {}),
        ticketNextChargeAt: Number.isFinite(Number(merged.staffs?.interview?.ticketNextChargeAt))
          ? Number(merged.staffs.interview.ticketNextChargeAt)
          : initial.staffs.interview.ticketNextChargeAt,
        targetStaffId: merged.staffs?.interview?.targetStaffId || null,
        candidates: Array.isArray(merged.staffs?.interview?.candidates)
          ? merged.staffs.interview.candidates
            .filter((candidate) =>
              Boolean(
                candidate &&
                  typeof candidate.id === "string" &&
                  typeof candidate.name === "string" &&
                  getStaffDef(candidate.staffId)
              )
            )
            .slice(0, STAFF_INTERVIEW_CANDIDATE_COUNT)
        : [],
      selectedCandidateId: merged.staffs?.interview?.selectedCandidateId || null,
    },
  };
  if (!getStaffDef(merged.staffs.interview.targetStaffId)) {
    merged.staffs.interview.targetStaffId = null;
  }
  if (
    merged.staffs.interview.selectedCandidateId &&
    !merged.staffs.interview.candidates.some(
      (candidate) => candidate.id === merged.staffs.interview.selectedCandidateId
    )
  ) {
    merged.staffs.interview.selectedCandidateId = null;
  }

  merged.social = {
    ...initial.social,
    ...(isPlainObject(merged.social) ? merged.social : {}),
    feedSeq: Math.max(1, Number(merged.social?.feedSeq || initial.social.feedSeq || 1)),
    activeTab: merged.social?.activeTab === "tagged" ? "tagged" : "my",
    ownPosts: Array.isArray(merged.social?.ownPosts)
      ? merged.social.ownPosts.slice(0, 12).map(normalizeSocialPost).filter(Boolean)
      : [],
    taggedPosts: filterResidentReviewPosts(merged.social?.taggedPosts).map(normalizeSocialPost).filter(Boolean),
    nextCaptureAt: Number.isFinite(merged.social?.nextCaptureAt) ? merged.social.nextCaptureAt : 0,
    captureCooldown: Number.isFinite(merged.social?.captureCooldown)
      ? merged.social.captureCooldown
      : initial.social.captureCooldown,
    followerPoints: Number.isFinite(merged.social?.followerPoints) ? merged.social.followerPoints : null,
    followers: Number.isFinite(merged.social?.followers) ? merged.social.followers : null,
    ownPostCount: Math.max(
      Number(merged.social?.ownPostCount || 0),
      Array.isArray(merged.social?.ownPosts) ? merged.social.ownPosts.length : 0
    ),
    growth: isPlainObject(merged.social?.growth) ? merged.social.growth : null,
    library: initial.social.library,
  };
  if (
    !Number.isFinite(merged.social.followerPoints) ||
    !Number.isFinite(merged.social.followers) ||
    !isPlainObject(merged.social.growth)
  ) {
    rebuildFollowerStateFromPosts(merged.social);
  } else {
    merged.social.growth = {
      ...createInitialSocialGrowthState(),
      ...merged.social.growth,
    };
    merged.social.followerPoints = Math.max(0, Number(merged.social.followerPoints || 0));
    merged.social.followers = Math.max(0, Math.floor(merged.social.followerPoints));
  }

  merged.rank = {
    ...initial.rank,
    ...(isPlainObject(merged.rank) ? merged.rank : {}),
  };

  merged.farm = {
    ...initial.farm,
    ...(isPlainObject(merged.farm) ? merged.farm : {}),
    level: Math.max(1, Number(merged.farm?.level || initial.farm.level)),
    exp: Math.max(0, Number(merged.farm?.exp || 0)),
    charges: Math.max(
      0,
      Math.min(FARM_MAX_CHARGES, Number(merged.farm?.charges ?? initial.farm.charges))
    ),
    maxCharges: FARM_MAX_CHARGES,
    nextChargeAt: Number.isFinite(merged.farm?.nextChargeAt) ? merged.farm.nextChargeAt : 0,
    itemSeq: Math.max(1, Number(merged.farm?.itemSeq || 1)),
    generatedCount: Math.max(0, Number(merged.farm?.generatedCount || 0)),
    harvests: Math.max(0, Number(merged.farm?.harvests || 0)),
    inventory: isPlainObject(merged.farm?.inventory) ? merged.farm.inventory : {},
    lastRewardText: merged.farm?.lastRewardText || initial.farm.lastRewardText,
    board: Array.from({ length: FARM_ROWS * FARM_COLS }, (_, index) => {
      const item = Array.isArray(merged.farm?.board) ? merged.farm.board[index] : null;
      const legacyKindMap = {
        sprout: "seed",
        flower: "sprout",
        herb: "flower",
        truffleBasket: "herb",
        calf: "calf",
        cow: "cow",
        milkCan: "milkCow",
        cheeseCrate: "milkCan",
      };
      const normalizedKind = item ? legacyKindMap[item.kind] || item.kind : null;
      return normalizedKind && FARM_ITEM_META[normalizedKind]
        ? { id: item.id || `farm-item-${index + 1}`, kind: normalizedKind }
        : null;
    }),
  };

  merged.rank = {
    ...initial.rank,
    ...(isPlainObject(merged.rank) ? merged.rank : {}),
    progressBaselines: {
      ...initial.rank.progressBaselines,
      ...(isPlainObject(merged.rank?.progressBaselines) ? merged.rank.progressBaselines : {}),
      recipeServedCounts: {
        ...initial.rank.progressBaselines.recipeServedCounts,
        ...(isPlainObject(merged.rank?.progressBaselines?.recipeServedCounts)
          ? merged.rank.progressBaselines.recipeServedCounts
          : {}),
      },
    },
  };
  if (!isPlainObject(savedState?.rank?.progressBaselines)) {
    merged.rank.progressBaselines = {
      served: Number(merged.metrics?.served || 0),
      promotionActions: Number(merged.metrics?.promotionActions || 0),
      ownPosts: Number(merged.social?.ownPostCount || 0),
      recipeRegistrations: Math.max(0, Object.keys(merged.recipes?.owned || {}).length - 1),
      farmGenerations: Number(merged.farm?.generatedCount || 0),
      farmHarvests: Number(merged.farm?.harvests || 0),
      recipeServedCounts: {
        ...(isPlainObject(merged.metrics?.recipeServedCounts) ? merged.metrics.recipeServedCounts : {}),
      },
    };
    if (Number(merged.rank.tierIndex || 0) <= 0) {
      merged.rank.progressBaselines = { ...initial.rank.progressBaselines, recipeServedCounts: {} };
    }
  }
  ensureFarmChargeTimer(merged);
  merged.chefActor = {
    ...initial.chefActor,
    x: initial.chefActor.x,
    y: initial.chefActor.y,
    targetX: initial.chefActor.targetX,
    targetY: initial.chefActor.targetY,
    nextTalkAt: initial.chefActor.nextTalkAt,
    lineUntil: 0,
    stirPhase: 0,
    busySwitchAt: 0,
    activeCount: 0,
    line: "",
    stoveId: null,
    mode: initial.chefActor.mode,
  };

  merged.camera = {
    x: initial.camera.x,
  };

  merged.codex = {
    entries: isPlainObject(merged.codex?.entries) ? merged.codex.entries : {},
  };

  return merged;
}

function normalizeRestaurantFacilities(restaurantState) {
  const savedTables = Array.isArray(restaurantState.tables) ? restaurantState.tables : [];
  const savedStoves = Array.isArray(restaurantState.stoves) ? restaurantState.stoves : [];

  let inferredCompletedCount = 0;
  let inferredTableCount = INITIAL_TABLE_COUNT;
  let inferredStoveCount = INITIAL_STOVE_COUNT;
  for (const offer of EXPANSION_SEQUENCE) {
    const hasFacility =
      offer.kind === "table"
        ? savedTables.length >= offer.slotIndex
        : offer.kind === "stove"
        ? savedStoves.length >= offer.slotIndex
        : true;
    if (!hasFacility) {
      break;
    }
    inferredCompletedCount += 1;
    if (offer.kind === "table") {
      inferredTableCount = Math.max(inferredTableCount, offer.slotIndex);
    } else {
      inferredStoveCount = Math.max(inferredStoveCount, offer.slotIndex);
    }
  }

  const requestedCompletedCount = Math.max(
    inferredCompletedCount,
    Math.min(EXPANSION_SEQUENCE.length, Number(restaurantState.expansionIndex || 0))
  );

  let tableCount = INITIAL_TABLE_COUNT;
  let stoveCount = INITIAL_STOVE_COUNT;
  const completedOffers = [];
  for (let index = 0; index < requestedCompletedCount; index += 1) {
    const offer = EXPANSION_SEQUENCE[index];
    if (!offer) {
      break;
    }
    completedOffers.push(offer);
    if (offer.kind === "table") {
      tableCount = Math.max(tableCount, offer.slotIndex);
    } else {
      stoveCount = Math.max(stoveCount, offer.slotIndex);
    }
  }

  tableCount = Math.max(tableCount, inferredTableCount);
  stoveCount = Math.max(stoveCount, inferredStoveCount);
  tableCount = Math.min(TABLE_POSITIONS.length, tableCount);
  stoveCount = Math.min(STOVE_POSITIONS.length, stoveCount);

  restaurantState.tables = Array.from({ length: tableCount }, (_, index) => ({
    ...(savedTables[index] || {}),
    id: `table-${index + 1}`,
    x: TABLE_POSITIONS[index].x,
    y: TABLE_POSITIONS[index].y,
    customer: savedTables[index]?.customer || null,
  }));

  restaurantState.stoves = Array.from({ length: stoveCount }, (_, index) => ({
    ...(savedStoves[index] || {}),
    id: `stove-${index + 1}`,
    x: STOVE_POSITIONS[index].x,
    y: STOVE_POSITIONS[index].y,
    order: savedStoves[index]?.order || null,
    progress: Number.isFinite(savedStoves[index]?.progress) ? savedStoves[index].progress : 0,
    total: Number.isFinite(savedStoves[index]?.total) ? savedStoves[index].total : 0,
    assignedAt: Number.isFinite(savedStoves[index]?.assignedAt) ? savedStoves[index].assignedAt : 0,
  }));

  restaurantState.expansionIndex = completedOffers.length;
  restaurantState.purchased = completedOffers.map((offer) => offer.title);
}

function loadPersistedState() {
  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.version || parsed.version !== SAVE_VERSION || !parsed.state) {
      clearPersistedState();
      return createInitialState();
    }
    const savedState = parsed.state;
    return normalizeLoadedState(savedState);
  } catch (error) {
    console.warn("save-load-failed", error);
    return createInitialState();
  }
}

function persistStateNow() {
  try {
    window.localStorage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({
        version: SAVE_VERSION,
        savedAt: new Date().toISOString(),
        state: buildPersistableState(state),
      })
    );
    lastPersistClock = state.clock || 0;
  } catch (error) {
    console.warn("save-write-failed", error);
  }
}

function clearPersistedState() {
  try {
    window.localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch (error) {
    console.warn("save-clear-failed", error);
  }
  lastPersistClock = 0;
}

function createInitialChefActor() {
  return {
    x: CHEF_HOME_FALLBACK_POSITION.x,
    y: CHEF_HOME_FALLBACK_POSITION.y,
    targetX: CHEF_HOME_FALLBACK_POSITION.x,
    targetY: CHEF_HOME_FALLBACK_POSITION.y,
    moveSpeed: 126,
    mode: "idle",
    stoveId: null,
    busySwitchAt: 0,
    line: "",
    lineUntil: 0,
    nextTalkAt: 1.1,
    stirPhase: 0,
    activeCount: 0,
    wanderTargetIdx: 0,
    wanderNextAt: 0,
  };
}

function createInitialStaffState() {
  const home = getServerHomePosition();
  return {
    chef: {
      level: 0,
      candidate: null,
    },
    server: {
      level: 0,
      candidate: null,
      x: home.x,
      y: home.y,
      targetX: home.x,
      targetY: home.y,
      tableId: null,
      mode: "idle",
    },
    promoter: {
      level: 0,
      candidate: null,
      x: 308,
      y: 746,
      timer: 0,
    },
    farmer: {
      level: 0,
      candidate: null,
      timer: 0,
    },
      interview: {
        level: STAFF_INTERVIEW_START_LEVEL,
        exp: 0,
        tickets: STAFF_INTERVIEW_START_TICKETS,
        ticketNextChargeAt: 0,
        nextCandidateId: 1,
        targetStaffId: null,
        candidates: [],
      selectedCandidateId: null,
    },
  };
}

function getSocialLibraryEntries() {
  const manifest = window.SNS_LIBRARY;
  if (Array.isArray(manifest)) {
    return manifest;
  }
  if (manifest && Array.isArray(manifest.entries)) {
    return manifest.entries;
  }
  return [];
}

function summarizeLibrarySources(entries) {
  const sources = Array.from(new Set(entries.map((entry) => entry.source || "seed")));
  if (sources.length === 0) {
    return "없음";
  }
  if (sources.length === 1) {
    return sources[0];
  }
  return "mixed";
}

function createInitialSocialState() {
  const library = getSocialLibraryEntries();
  return {
    activeTab: "my",
    feedSeq: 1,
    followers: 0,
    followerPoints: 0,
    ownPosts: [],
    taggedPosts: [],
    nextCaptureAt: 0,
    captureCooldown: SOCIAL_CAPTURE_COOLDOWN,
    growth: {
      ownPosts: 0,
      taggedReviews: 0,
      totalLikes: 0,
      totalComments: 0,
    },
    library: {
      entriesLoaded: library.length,
      availableRecipes: new Set(library.map((entry) => entry.recipeId)).size,
      sourceSummary: summarizeLibrarySources(library),
    },
  };
}

function createInitialSocialGrowthState() {
  return {
    ownPosts: 0,
    taggedReviews: 0,
    totalLikes: 0,
    totalComments: 0,
  };
}

function normalizeSocialPost(post) {
  if (!isPlainObject(post)) {
    return null;
  }

  const normalized = { ...post };
  const hasLegacyRewardFields =
    Number.isFinite(normalized?.followerGain) ||
    Number.isFinite(normalized?.shopLikesGain) ||
    Number.isFinite(normalized?.likes);
  const rewardClaimed =
    typeof normalized.rewardClaimed === "boolean"
      ? normalized.rewardClaimed
      : hasLegacyRewardFields;

  normalized.rewardClaimed = rewardClaimed;
  normalized.isNew = typeof normalized.isNew === "boolean" ? normalized.isNew : !rewardClaimed;
  normalized.claimedAt = Number.isFinite(normalized.claimedAt) ? normalized.claimedAt : rewardClaimed ? 0 : null;
  normalized.shopLikesGain = 0;
  normalized.followerGain = getPostFollowerGain(normalized);
  return normalized;
}

function getPostReactionCount(post) {
  return Math.max(0, Number(post?.likes || 0));
}

function getPostFollowerGain(post) {
  if (Number.isFinite(post?.followerGain) && Number(post.followerGain) > 0) {
    return Math.max(0, Number(post.followerGain));
  }
  if (post?.type === "my") {
    return calculateOwnPostFollowerGain(post);
  }
  return calculateTaggedPostFollowerGain(post);
}

function applyPostGrowthImpact(socialState, post) {
  const growth = socialState.growth || createInitialSocialGrowthState();
  const reactions = getPostReactionCount(post);
  const comments = Array.isArray(post?.comments) ? post.comments.length : 0;
  const followerGain = getPostFollowerGain(post);

  if (post?.type === "my") {
    growth.ownPosts += 1;
    growth.totalComments += comments;
  } else {
    growth.taggedReviews += 1;
  }

  growth.totalLikes += reactions;
  socialState.growth = growth;
  socialState.followerPoints = Math.max(0, Number(socialState.followerPoints || 0) + followerGain);
  socialState.followers = Math.max(0, Math.floor(socialState.followerPoints));

  return {
    followerGain,
  };
}

function calculateOwnPostFollowerGain(post) {
  const likes = Number(post?.likes || 0);
  const comments = Array.isArray(post?.comments) ? post.comments.length : 0;
  return 4 + Math.floor(likes / 18) + comments * 2;
}

function calculateTaggedPostFollowerGain(post) {
  const likes = Number(post?.likes || 0);
  if (post?.taggedKind === "unlock") {
    return 2 + Math.floor(likes / 10);
  }

  const satisfactionBoost =
    {
      delighted: 8,
      happy: 5,
      okay: 3,
      disappointed: 1,
    }[post?.satisfactionTier] || 3;

  return 3 + Math.floor(likes / 12) + satisfactionBoost;
}

function rebuildFollowerStateFromPosts(socialState) {
  const growth = createInitialSocialGrowthState();
  socialState.growth = growth;
  socialState.followerPoints = 0;
  socialState.followers = 0;

  for (const post of Array.isArray(socialState.ownPosts) ? socialState.ownPosts : []) {
    if (post?.rewardClaimed) {
      applyPostGrowthImpact(socialState, post);
    }
  }

  for (const post of Array.isArray(socialState.taggedPosts) ? socialState.taggedPosts : []) {
    if (post?.rewardClaimed) {
      applyPostGrowthImpact(socialState, post);
    }
  }
}

function awardFollowersFromPost(post) {
  return applyPostGrowthImpact(state.social, post);
}
