// Interview candidate generation and assignment rules.

function getServerHomePosition() {
  return {
    x: WORLD_CENTER_X + 178,
    y: 634,
  };
}

function getPromoterHomePosition() {
  return {
    x: 308,
    y: 746,
  };
}

function getStaffDef(staffId) {
  return STAFF_SLOT_META[staffId] || STAFF_CATALOG[staffId] || null;
}

function getStaffLevelRow(staffId, level) {
  const def = getStaffDef(staffId);
  if (!def) {
    return null;
  }
  return STAFF_LEVEL_ROW_BY_KEY.get(`${def.tableId}:${level}`) || null;
}

function getStaffLevel(staffId, targetState = state) {
  return targetState.staffs[staffId]?.level || 0;
}

function getAssignedStaffCandidate(staffId, targetState = state) {
  return targetState.staffs?.[staffId]?.candidate || null;
}

function getStaffCandidateStat(candidate, statKey) {
  return Math.max(0, Number(candidate?.stats?.[statKey] || 0));
}

function getStaffRelevantStat(staffId, targetState = state) {
  const def = getStaffDef(staffId);
  if (!def) {
    return 0;
  }
  return getStaffCandidateStat(getAssignedStaffCandidate(staffId, targetState), def.statKey);
}

function getStaffDerivedLevelForSlot(candidate, staffId) {
  const def = getStaffDef(staffId);
  if (!candidate || !def) {
    return 0;
  }
  return Math.min(5, Math.max(1, Math.ceil(getStaffCandidateStat(candidate, def.statKey) / 2)));
}

function getInterviewExpTarget(level = state.staffs.interview.level) {
  return 2 + Math.max(0, level - 1) * 2;
}

function getInterviewCandidateById(candidateId, targetState = state) {
  return (targetState.staffs?.interview?.candidates || []).find((candidate) => candidate.id === candidateId) || null;
}

function buildInterviewCandidateName(sequence) {
  const prefix = STAFF_INTERVIEW_NAME_PREFIXES[(sequence - 1) % STAFF_INTERVIEW_NAME_PREFIXES.length];
  const suffix =
    STAFF_INTERVIEW_NAME_SUFFIXES[
      Math.floor((sequence - 1) / STAFF_INTERVIEW_NAME_PREFIXES.length) % STAFF_INTERVIEW_NAME_SUFFIXES.length
    ];
  return `${prefix}${suffix}`;
}

function buildInterviewCandidateStats(staffId, targetState = state) {
  const def = getStaffDef(staffId);
  const level = targetState.staffs.interview.level;
  const primaryFocus = def?.statKey || "cooking";
  const floor = Math.min(6, 1 + Math.floor((level - 1) * 0.6));
  const ceiling = Math.min(10, 4 + level);
  const stats = {
    cooking: 0,
    service: 0,
    promotion: 0,
    diligence: 0,
  };
  const primaryValue =
    floor + Math.floor(Math.random() * Math.max(1, ceiling - floor + 1)) + 2 + Math.floor(level / 3);
  stats[primaryFocus] = Math.min(10, primaryValue);
  return {
    stats,
    primaryFocus,
  };
}

function createInterviewCandidate(staffId, targetState = state) {
  const def = getStaffDef(staffId);
  const sequence = targetState.staffs.interview.nextCandidateId++;
  const { stats, primaryFocus } = buildInterviewCandidateStats(staffId, targetState);
  const iconProfile = CUSTOMER_PROFILES[(sequence - 1) % CUSTOMER_PROFILES.length];
  return {
    id: `candidate-${sequence}`,
    name: buildInterviewCandidateName(sequence),
    iconPath: iconProfile?.iconPath || SPECIAL_CHICK_ICON_PATHS[(sequence - 1) % SPECIAL_CHICK_ICON_PATHS.length],
    badge: iconProfile?.badge || CUSTOMER_BADGES[(sequence - 1) % CUSTOMER_BADGES.length],
    accent: iconProfile?.accent || CUSTOMER_COLORS[(sequence - 1) % CUSTOMER_COLORS.length],
    tag: STAFF_INTERVIEW_TAGS[(sequence - 1) % STAFF_INTERVIEW_TAGS.length],
    staffId,
    staffTitle: def?.title || "직원",
    primaryFocus,
    flavor: STAFF_INTERVIEW_ROLE_FLAVORS[primaryFocus],
    stats,
  };
}

function levelUpInterviewIfNeeded(targetState = state) {
  let leveledUp = false;
  while (targetState.staffs.interview.exp >= getInterviewExpTarget(targetState.staffs.interview.level)) {
    targetState.staffs.interview.exp -= getInterviewExpTarget(targetState.staffs.interview.level);
    targetState.staffs.interview.level += 1;
    leveledUp = true;
  }
  return leveledUp;
}

function pickInterviewCandidateLine(candidate, kind = "focus") {
  const fallbackGreeting = INTERVIEW_CANDIDATE_GREETING[candidate?.primaryFocus] || ["잘 부탁드려요!"];
  const linePool =
    kind === "selected"
      ? INTERVIEW_CANDIDATE_SELECTED_LINES[candidate?.primaryFocus] || fallbackGreeting
      : INTERVIEW_CANDIDATE_FOCUS_LINES[candidate?.primaryFocus] || fallbackGreeting;
  return pickRandom(linePool);
}

function focusInterviewCandidate(candidateId) {
  const candidate = getInterviewCandidateById(candidateId);
  if (!candidate) {
    return;
  }
  state.staffs.interview.focusedCandidateId = candidate.id;
  setStaffBubble("interviewee", pickInterviewCandidateLine(candidate, "focus"), 3.4);
}

function clearInterviewCandidateFocus() {
  state.staffs.interview.focusedCandidateId = null;
  setStaffBubble("interviewee", "", 0);
}

function startInterviewSession(staffId = state.staffs.interview.targetStaffId) {
  const interview = state.staffs.interview;
  const def = getStaffDef(staffId);
  if (!def) {
    pushLog("어느 자리에 사람을 볼지 먼저 정해야 하거덩요.");
    refreshAllUI();
    return;
  }
  if (interview.tickets <= 0) {
    pushLog("면접 교섭권이 없거덩요. 다음 승급이나 보상에서 더 챙겨야 해요.");
    refreshAllUI();
    return;
  }
  interview.targetStaffId = staffId;
  interview.tickets -= 1;
  state.metrics.interviewSessions = Number(state.metrics.interviewSessions || 0) + 1;
  if (interview.tickets < STAFF_INTERVIEW_MAX_TICKETS && !interview.ticketNextChargeAt) {
    interview.ticketNextChargeAt = state.clock + STAFF_INTERVIEW_TICKET_RECHARGE_SECONDS;
  }
  interview.exp += STAFF_INTERVIEW_EXP_PER_SESSION;
  const leveledUp = levelUpInterviewIfNeeded(state);
  interview.candidates = Array.from({ length: STAFF_INTERVIEW_CANDIDATE_COUNT }, () => createInterviewCandidate(staffId, state));
  interview.selectedCandidateId = null;
  interview.focusedCandidateId = null;
  setStaffBubble("interviewee", "", 0);
  setStaffBubble("protagonist", pickRandom(INTERVIEW_PROTAGONIST_LINES_START), 3.5);
  pushLog(
    leveledUp
      ? `면접 레벨이 ${interview.level}이 됐다. ${def.title} 자리에 더 좋은 인재 풀이 열렸거덩요.`
      : `${def.title} 자리 면접 후보 3명이 도착했다.`
  );
  refreshAllUI();
  persistStateNow();
}

function skipInterviewSelection() {
  state.staffs.interview.candidates = [];
  state.staffs.interview.selectedCandidateId = null;
  state.staffs.interview.targetStaffId = null;
  state.metrics.staffHires = Number(state.metrics.staffHires || 0) + 1;
  clearInterviewCandidateFocus();
  pushLog("이번 면접은 그냥 넘기기로 했다.");
  refreshAllUI();
  persistStateNow();
}

function selectInterviewCandidate(candidateId) {
  const candidate = getInterviewCandidateById(candidateId);
  if (!candidate) {
    return;
  }
  state.staffs.interview.selectedCandidateId = candidateId;
  setStaffBubble("interviewee", pickInterviewCandidateLine(candidate, "selected"), 3.6);
  refreshAllUI();
}

function assignInterviewCandidateToSlot(slotId) {
  const def = getStaffDef(slotId);
  const candidate = getInterviewCandidateById(state.staffs.interview.selectedCandidateId);
  if (!candidate || !def || candidate.staffId !== slotId) {
    return;
  }
  const previous = getAssignedStaffCandidate(slotId);
  const slot = state.staffs[slotId];
  slot.candidate = {
    ...candidate,
    assignedAt: state.clock,
    assignedSlotId: slotId,
  };
  slot.level = getStaffDerivedLevelForSlot(candidate, slotId);

  if (slotId === "server") {
    const home = getServerHomePosition();
    slot.x = home.x;
    slot.y = home.y;
    slot.targetX = home.x;
    slot.targetY = home.y;
    slot.tableId = null;
    slot.mode = "idle";
  }

  if (slotId === "promoter") {
    const home = getPromoterHomePosition();
    slot.x = home.x;
    slot.y = home.y;
    slot.timer = Math.min(slot.timer || getPromoterCooldown(), 2.5);
  }

  if (slotId === "farmer") {
    slot.timer = Math.min(slot.timer || getFarmerCooldown(), 2.5);
  }

  state.staffs.interview.candidates = [];
  state.staffs.interview.selectedCandidateId = null;
  state.staffs.interview.targetStaffId = null;
  clearInterviewCandidateFocus();
  setStaffBubble("protagonist", pickRandom(INTERVIEW_PROTAGONIST_LINES_HIRED), 3.5);
  pushLog(
    previous
      ? `${candidate.name}을(를) ${def.title}에 배치했다. ${previous.name}은(는) 이번에 쉬게 됐다.`
      : `${candidate.name}을(를) ${def.title}에 배치했다.`
  );
  refreshAllUI();
  persistStateNow();
}
