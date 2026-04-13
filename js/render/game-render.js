// Canvas scene rendering for restaurant, farm, and interview views.
const RESTAURANT_BACKGROUND_IMAGE_PATH = "assets/BG.png";
const FACILITY_WORLD_PLACEMENTS = {
  tipbox: [{ x: WORLD_CENTER_X - 156, y: 540, width: 52, height: 52, yOffset: -38, layer: "front" }],
  entrance: [{ x: ENTRANCE_POSITION.x, y: 694, width: 158, height: 158, yOffset: -110, layer: "front" }],
  sink: [{ x: WORLD_CENTER_X + 166, y: 314, width: 58, height: 58, yOffset: -38, layer: "back" }],
  countertop: [{ x: WORLD_CENTER_X - 168, y: 312, width: 76, height: 76, yOffset: -50, layer: "back" }],
  kitchenware: [{ x: WORLD_CENTER_X - 112, y: 312, width: 58, height: 58, yOffset: -38, layer: "back" }],
  fridge: [{ x: WORLD_CENTER_X + 174, y: 224, width: 72, height: 72, yOffset: -48, layer: "back" }],
  lighting: [{ x: WORLD_CENTER_X, y: 132, width: 72, height: 72, yOffset: -62, layer: "back", glowRadius: 72 }],
  stage: [{ x: WORLD_CENTER_X + 174, y: 710, width: 92, height: 92, yOffset: -64, layer: "front" }],
  fence: [
    { x: WORLD_CENTER_X - 178, y: 760, width: 78, height: 78, yOffset: -48, layer: "front" },
    { x: WORLD_CENTER_X + 178, y: 760, width: 78, height: 78, yOffset: -48, layer: "front" },
  ],
};

function getPurchasedFacilityOffers() {
  return EXPANSION_SEQUENCE.slice(0, Math.max(0, Number(state.restaurant?.expansionIndex || 0))).filter(
    (offer) => offer.kind !== "table" && offer.kind !== "stove"
  );
}

function drawPlacedFacilityOffer(offer, placement) {
  if (!offer?.iconPath) {
    return;
  }
  ctx.save();
  ctx.translate(placement.x, placement.y);
  ctx.fillStyle = "rgba(20, 26, 21, 0.12)";
  ctx.beginPath();
  ctx.ellipse(0, Math.max(20, placement.height * 0.32), placement.width * 0.36, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  if (placement.glowRadius) {
    const glow = ctx.createRadialGradient(0, -8, 4, 0, -8, placement.glowRadius);
    glow.addColorStop(0, "rgba(255, 240, 186, 0.34)");
    glow.addColorStop(1, "rgba(255, 240, 186, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -8, placement.glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  drawFacilitySprite(
    offer.iconPath,
    placement.width,
    placement.height,
    Number.isFinite(placement.yOffset) ? placement.yOffset : -placement.height * 0.5
  );
  ctx.restore();
}

function drawPurchasedFacilities(layer) {
  for (const offer of getPurchasedFacilityOffers()) {
    const placements = FACILITY_WORLD_PLACEMENTS[offer.kind] || [];
    for (const placement of placements) {
      if ((placement.layer || "front") !== layer) {
        continue;
      }
      drawPlacedFacilityOffer(offer, placement);
    }
  }
}

function draw() {
  if (typeof ctx.reset === "function") {
    ctx.reset();
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.setTransform(getCanvasRenderScale(), 0, 0, getCanvasRenderScale(), 0, 0);
  ctx.globalAlpha = 1;
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) {
    ctx.imageSmoothingQuality = "high";
  }
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  if (state.scene === SCENE_FARM) {
    drawFarmScene();
    return;
  }
  if (state.scene === SCENE_INTERVIEW) {
    drawInterviewScene();
    return;
  }
  ctx.save();
  ctx.translate(-state.camera.x, 0);
  drawBackground();
  drawRestaurant();
  ctx.restore();
  drawMenuLaunchBonusConfetti();
}

function drawFarmScene() {
  drawFarmBackground();
  drawFarmBoard();
  drawFarmDecor();
  drawFarmDragPreview();
  drawFarmerStaffActor();
}

function drawFarmerStaffActor() {
  if (getStaffLevel("farmer") <= 0) return;
  const candidate = getAssignedStaffCandidate("farmer");
  const iconPath = candidate?.iconPath || NORMAL_CHICK_ICON_PATH;
  const x = 195;
  const y = 560;
  const bob = Math.sin(state.clock * 3.8) * 1.6;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(21, 30, 25, 0.16)";
  ctx.beginPath();
  ctx.ellipse(0, 16, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, bob);
  if (!drawChickSprite(iconPath, 42, -32)) {
    ctx.fillStyle = "#f4cf48";
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  drawStaffBubble(x, y, "farmer");
}

// --- 면접실 레이아웃 상수 ---
const IV_DESK_Y = 480;
const IV_DESK_W = 260;
const IV_DESK_H = 56;
const IV_DESK_X = 65;
const IV_PROTAGONIST_X = 195;
const IV_PROTAGONIST_Y = 620;
const IV_CHAIR_POSITIONS = [
  { x: 80, y: 300 },
  { x: 195, y: 280 },
  { x: 310, y: 300 },
];
const IV_FOCUSED_POS = { x: 195, y: 400 };

function getInterviewCandidatePositions() {
  const interview = state.staffs.interview;
  const candidates = interview.candidates || [];
  const focused = interview.focusedCandidateId;
  return candidates.map((c, i) => {
    if (c.id === focused) {
      return { ...IV_FOCUSED_POS, candidate: c, focused: true };
    }
    return { ...IV_CHAIR_POSITIONS[i], candidate: c, focused: false };
  });
}

function drawInterviewScene() {
  const interview = state.staffs.interview;
  const hasCandidates = (interview.candidates || []).length > 0;
  const focusedId = interview.focusedCandidateId;

  // === 배경: 벽 ===
  ctx.fillStyle = "#efe7d7";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // 벽 하단 라인 (벽과 바닥 경계)
  ctx.fillStyle = "#d8c9a8";
  ctx.fillRect(0, 220, GAME_WIDTH, 4);

  // === 바닥 ===
  ctx.fillStyle = "#cbb08a";
  ctx.fillRect(0, 224, GAME_WIDTH, GAME_HEIGHT - 224);

  // 바닥 나무무늬
  ctx.strokeStyle = "rgba(160, 120, 70, 0.12)";
  ctx.lineWidth = 1;
  for (let y = 240; y < GAME_HEIGHT; y += 38) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(GAME_WIDTH, y);
    ctx.stroke();
  }

  // === 벽 장식: 액자 ===
  ctx.fillStyle = "#c9a96e";
  roundRect(ctx, 40, 60, 80, 100, 6);
  ctx.fill();
  ctx.fillStyle = "#f5e6c4";
  roundRect(ctx, 46, 66, 68, 88, 4);
  ctx.fill();
  // 액자 속 그림 (간단한 풍경)
  ctx.fillStyle = "#a8d5a2";
  ctx.fillRect(50, 100, 60, 40);
  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(50, 70, 60, 30);

  ctx.fillStyle = "#c9a96e";
  roundRect(ctx, 270, 70, 80, 80, 6);
  ctx.fill();
  ctx.fillStyle = "#f5e6c4";
  roundRect(ctx, 276, 76, 68, 68, 4);
  ctx.fill();
  ctx.fillStyle = "#e8c496";
  ctx.fillRect(280, 80, 60, 56);

  // === 벽 장식: 화분 ===
  ctx.fillStyle = "#b87a4b";
  roundRect(ctx, 160, 170, 30, 36, 4);
  ctx.fill();
  ctx.fillStyle = "#6b9d58";
  ctx.beginPath();
  ctx.arc(175, 162, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#82b767";
  ctx.beginPath();
  ctx.arc(168, 155, 10, 0, Math.PI * 2);
  ctx.fill();

  // === 대기 의자 (3개) ===
  if (hasCandidates) {
    for (let i = 0; i < 3; i++) {
      const chair = IV_CHAIR_POSITIONS[i];
      // 의자 그림자
      ctx.fillStyle = "rgba(100, 70, 40, 0.15)";
      ctx.beginPath();
      ctx.ellipse(chair.x, chair.y + 42, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // 의자 등받이
      ctx.fillStyle = "#b87a4b";
      roundRect(ctx, chair.x - 22, chair.y - 10, 44, 8, 4);
      ctx.fill();
      // 의자 좌석
      ctx.fillStyle = "#d4956a";
      roundRect(ctx, chair.x - 20, chair.y - 2, 40, 28, 6);
      ctx.fill();
      // 의자 다리
      ctx.fillStyle = "#9e6840";
      ctx.fillRect(chair.x - 16, chair.y + 26, 4, 16);
      ctx.fillRect(chair.x + 12, chair.y + 26, 4, 16);
    }
  }

  // === 대기석 후보 병아리 그리기 ===
  if (hasCandidates) {
    const positions = getInterviewCandidatePositions();
    for (const pos of positions) {
      if (pos.focused) continue; // 포커스된 후보는 나중에 그림
      ctx.save();
      ctx.translate(pos.x, pos.y - 16);
      // 그림자
      ctx.fillStyle = "rgba(100, 70, 40, 0.18)";
      ctx.beginPath();
      ctx.ellipse(0, 28, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      const bob = Math.sin(state.clock * 1.8 + pos.x * 0.1) * 1.5;
      ctx.translate(0, bob);
      if (!drawChickSprite(pos.candidate.iconPath, 48, -38)) {
        ctx.fillStyle = "#ffd54f";
        ctx.beginPath();
        ctx.arc(0, -14, 16, 0, Math.PI * 2);
        ctx.fill();
      }
      // 이름 태그
      ctx.fillStyle = "rgba(90, 60, 30, 0.85)";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pos.candidate.name, 0, 18);
      ctx.restore();
    }
  }

  // === 면접 책상 ===
  // 책상 그림자
  ctx.fillStyle = "rgba(100, 70, 40, 0.18)";
  ctx.beginPath();
  ctx.ellipse(GAME_WIDTH / 2, IV_DESK_Y + IV_DESK_H + 6, IV_DESK_W / 2 + 10, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // 책상 상판
  ctx.fillStyle = "#a0724e";
  roundRect(ctx, IV_DESK_X, IV_DESK_Y, IV_DESK_W, IV_DESK_H, 10);
  ctx.fill();
  // 책상 상면 하이라이트
  ctx.fillStyle = "#b8885c";
  roundRect(ctx, IV_DESK_X + 4, IV_DESK_Y + 2, IV_DESK_W - 8, 18, 8);
  ctx.fill();
  // 책상 위 서류
  ctx.fillStyle = "#f8f0e0";
  ctx.save();
  ctx.translate(IV_DESK_X + 50, IV_DESK_Y + 10);
  ctx.rotate(-0.08);
  roundRect(ctx, 0, 0, 36, 28, 3);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#f0e8d4";
  ctx.save();
  ctx.translate(IV_DESK_X + 160, IV_DESK_Y + 8);
  ctx.rotate(0.06);
  roundRect(ctx, 0, 0, 32, 24, 3);
  ctx.fill();
  ctx.restore();
  // 책상 다리
  ctx.fillStyle = "#8d6242";
  ctx.fillRect(IV_DESK_X + 20, IV_DESK_Y + IV_DESK_H, 8, 40);
  ctx.fillRect(IV_DESK_X + IV_DESK_W - 28, IV_DESK_Y + IV_DESK_H, 8, 40);

  // === 포커스된 후보 (책상 앞) ===
  if (hasCandidates && focusedId) {
    const positions = getInterviewCandidatePositions();
    const focusedPos = positions.find((p) => p.focused);
    if (focusedPos) {
      ctx.save();
      ctx.translate(focusedPos.x, focusedPos.y);
      // 그림자
      ctx.fillStyle = "rgba(100, 70, 40, 0.22)";
      ctx.beginPath();
      ctx.ellipse(0, 36, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      const bob = Math.sin(state.clock * 2.4) * 2;
      ctx.translate(0, bob);
      if (!drawChickSprite(focusedPos.candidate.iconPath, 64, -50)) {
        ctx.fillStyle = "#ffd54f";
        ctx.beginPath();
        ctx.arc(0, -20, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      drawStaffBubble(focusedPos.x, focusedPos.y - 20, "interviewee");
    }
  }

  // === 주인공 (면접관, 책상 뒤) ===
  // 주인공 그림자
  ctx.fillStyle = "rgba(100, 70, 40, 0.22)";
  ctx.beginPath();
  ctx.ellipse(IV_PROTAGONIST_X, IV_PROTAGONIST_Y + 48, 32, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // 주인공 병아리
  const bob = Math.sin(state.clock * 2.4) * 2.5;
  ctx.save();
  ctx.translate(IV_PROTAGONIST_X, IV_PROTAGONIST_Y + bob);
  const drewProtagonist = drawChickSprite(PROTAGONIST_CHICK_ICON_PATH, 80, -64);
  if (!drewProtagonist) {
    ctx.fillStyle = "#f4cf48";
    ctx.beginPath();
    ctx.arc(0, -24, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e2b93a";
    ctx.beginPath();
    ctx.arc(0, -24, 24, 0, Math.PI);
    ctx.fill();
  }
  ctx.restore();
  drawStaffBubble(IV_PROTAGONIST_X, IV_PROTAGONIST_Y, "protagonist");

  // === "면접 시작" 안내 (후보 없을 때) ===
  if (!hasCandidates) {
    ctx.fillStyle = "rgba(90, 60, 30, 0.5)";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("대기석이 비어있다...", GAME_WIDTH / 2, 310);
  }
}

function drawFarmBackground() {
  ctx.fillStyle = "#a2af6b";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const glow = ctx.createRadialGradient(195, 372, 80, 195, 372, 340);
  glow.addColorStop(0, "rgba(232, 235, 199, 0.9)");
  glow.addColorStop(0.6, "rgba(214, 223, 183, 0.38)");
  glow.addColorStop(1, "rgba(214, 223, 183, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  for (let index = 0; index < 12; index += 1) {
    const x = 20 + ((index * 31) % (GAME_WIDTH - 40));
    const y = 92 + ((index * 63) % (GAME_HEIGHT - 120));
    ctx.fillStyle = "rgba(120, 136, 83, 0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y, 7, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFarmBoard() {
  for (const cell of FARM_CELL_POSITIONS) {
    drawFarmCell(cell);
    const item = state.farm.board[cell.index];
    if (item) {
      drawFarmItem(item, cell);
    }
  }
}

function drawFarmCell(cell) {
  ctx.save();
  ctx.translate(cell.x, cell.y);

  ctx.fillStyle = "#7d5a2f";
  ctx.fillRect(6, FARM_CELL_SIZE - 6, FARM_CELL_SIZE - 12, 8);

  ctx.fillStyle = "#b6803f";
  roundRect(ctx, 0, 0, FARM_CELL_SIZE, FARM_CELL_SIZE, 18);
  ctx.fill();

  ctx.fillStyle = "#9a632a";
  roundRect(ctx, 6, 6, FARM_CELL_SIZE - 12, FARM_CELL_SIZE - 12, 14);
  ctx.fill();

  ctx.strokeStyle = "rgba(124, 80, 32, 0.22)";
  ctx.lineWidth = 3;
  for (let row = 0; row < 3; row += 1) {
    const y = 18 + row * 16;
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.bezierCurveTo(26, y - 2, 48, y + 2, FARM_CELL_SIZE - 14, y);
    ctx.stroke();
  }

  if (farmDragState.hoverIndex === cell.index && farmDragState.pointerId !== null) {
    ctx.fillStyle = "rgba(255, 247, 220, 0.18)";
    roundRect(ctx, 4, 4, FARM_CELL_SIZE - 8, FARM_CELL_SIZE - 8, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 241, 199, 0.7)";
    ctx.lineWidth = 2;
    roundRect(ctx, 4, 4, FARM_CELL_SIZE - 8, FARM_CELL_SIZE - 8, 14);
    ctx.stroke();
  }

  ctx.restore();
}

function drawFarmItem(item, cell) {
  if (farmDragState.pointerId !== null && farmDragState.sourceIndex === cell.index && farmDragState.distance > FARM_DRAG_THRESHOLD) {
    return;
  }

  ctx.save();
  ctx.translate(cell.x + FARM_CELL_SIZE * 0.5, cell.y + FARM_CELL_SIZE * 0.54);
  const meta = FARM_ITEM_META[item.kind];
  drawFarmItemSprite(meta);
  ctx.restore();
}

function drawFarmItemSprite(meta) {
  if (!meta) {
    return;
  }

  if (meta.id === "seed") {
    drawFarmDirtBase();
    ctx.fillStyle = "#8c6a3b";
    ctx.beginPath();
    ctx.ellipse(0, -2, 8, 11, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b8945f";
    ctx.beginPath();
    ctx.ellipse(0, -4, 4, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (meta.id === "sprout") {
    drawFarmDirtBase();
    ctx.fillStyle = "#7cc05b";
    ctx.beginPath();
    ctx.moveTo(-2, -8);
    ctx.quadraticCurveTo(10, -24, 16, -8);
    ctx.quadraticCurveTo(6, -11, -2, -8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, -8);
    ctx.quadraticCurveTo(-14, -22, -18, -8);
    ctx.quadraticCurveTo(-8, -11, -4, -8);
    ctx.fill();
    ctx.strokeStyle = "#5d7e39";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, -10);
    ctx.stroke();
    return;
  }

  if (meta.id === "flower") {
    drawFarmDirtBase();
    for (let index = 0; index < 5; index += 1) {
      const angle = (Math.PI * 2 * index) / 5;
      ctx.fillStyle = "#f6f3ea";
      ctx.beginPath();
      ctx.ellipse(Math.cos(angle) * 11, -8 + Math.sin(angle) * 8, 7, 6, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#e1bf53";
    ctx.beginPath();
    ctx.arc(0, -8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#6d8a44";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(0, -2);
    ctx.stroke();
    return;
  }

  if (meta.id === "herb") {
    drawBasketBase(meta.accent);
    for (let index = 0; index < 5; index += 1) {
      const x = -18 + index * 9;
      ctx.fillStyle = index % 2 === 0 ? "#76ae55" : "#5c8e46";
      ctx.beginPath();
      ctx.ellipse(x, -18 - (index % 2) * 3, 8, 12, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (meta.id === "truffleBasket") {
    drawBasketBase(meta.accent);
    for (let index = 0; index < 3; index += 1) {
      const x = -14 + index * 14;
      ctx.fillStyle = "#6a4b32";
      ctx.beginPath();
      ctx.ellipse(x, -12, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8e6a48";
      ctx.beginPath();
      ctx.arc(x - 3, -14, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (meta.id === "calf") {
    ctx.save();
    ctx.scale(0.68, 0.68);
    drawCowLike("#c48b69", true);
    ctx.restore();
    return;
  }

  if (meta.id === "cow") {
    ctx.save();
    ctx.scale(0.84, 0.84);
    drawCowLike("#b98a52", false);
    ctx.fillStyle = "#8a643a";
    ctx.beginPath();
    ctx.ellipse(-9, -1, 8, 5, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(7, -7, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (meta.id === "milkCow") {
    drawCowLike("#f1eadf", false);
    ctx.fillStyle = "#5a4a3d";
    ctx.beginPath();
    ctx.ellipse(-10, 0, 9, 6, 0.3, 0, Math.PI * 2);
    ctx.ellipse(8, -8, 8, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d8b2c6";
    ctx.fillRect(-6, 10, 12, 8);
    return;
  }

  if (meta.id === "milkCan") {
    ctx.fillStyle = "#d9dfe7";
    roundRect(ctx, -18, -26, 36, 44, 12);
    ctx.fill();
    ctx.strokeStyle = "#95a4b2";
    ctx.lineWidth = 3;
    roundRect(ctx, -18, -26, 36, 44, 12);
    ctx.stroke();
    ctx.fillStyle = "#f4f7fb";
    roundRect(ctx, -10, -34, 20, 12, 6);
    ctx.fill();
    ctx.fillStyle = "#dd9b6e";
    ctx.fillRect(-12, -4, 24, 4);
    return;
  }

  if (meta.id === "cheeseCrate") {
    ctx.fillStyle = "#b78144";
    roundRect(ctx, -20, -18, 40, 30, 10);
    ctx.fill();
    ctx.fillStyle = "#f0c85f";
    ctx.beginPath();
    ctx.moveTo(-12, 8);
    ctx.lineTo(4, -12);
    ctx.lineTo(18, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ddb24b";
    ctx.beginPath();
    ctx.arc(-2, 1, 3, 0, Math.PI * 2);
    ctx.arc(7, 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFarmDirtBase() {
  ctx.fillStyle = "#8f6439";
  ctx.beginPath();
  ctx.ellipse(0, 8, 18, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6f4d2c";
  ctx.beginPath();
  ctx.arc(-7, 5, 3, 0, Math.PI * 2);
  ctx.arc(7, 10, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBasketBase(fill) {
  ctx.fillStyle = "#7d5734";
  roundRect(ctx, -20, -2, 40, 18, 8);
  ctx.fill();
  ctx.fillStyle = fill;
  roundRect(ctx, -18, -4, 36, 18, 8);
  ctx.fill();
}

function drawCowLike(bodyColor, tiny) {
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, tiny ? 20 : 22, tiny ? 17 : 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f3c7b0";
  ctx.beginPath();
  ctx.ellipse(0, 6, tiny ? 11 : 12, tiny ? 8 : 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#57453b";
  ctx.beginPath();
  ctx.arc(-6, 2, 2.4, 0, Math.PI * 2);
  ctx.arc(6, 2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#876949";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-9, -12);
  ctx.lineTo(-14, -18);
  ctx.moveTo(9, -12);
  ctx.lineTo(14, -18);
  ctx.stroke();
}

function drawFarmDecor() {
  ctx.strokeStyle = "#7a4e23";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(274, 74);
  ctx.lineTo(360, 74);
  ctx.moveTo(274, 102);
  ctx.lineTo(360, 102);
  for (const x of [280, 308, 336, 364]) {
    ctx.moveTo(x, 72);
    ctx.lineTo(x, 104);
  }
  ctx.moveTo(22, 736);
  ctx.lineTo(106, 736);
  ctx.moveTo(22, 764);
  ctx.lineTo(106, 764);
  for (const x of [28, 56, 84, 112]) {
    ctx.moveTo(x, 734);
    ctx.lineTo(x, 766);
  }
  ctx.stroke();

  ctx.fillStyle = "#d8d0bb";
  for (const point of [
    { x: 177, y: 728, r: 9 },
    { x: 193, y: 696, r: 8 },
    { x: 217, y: 718, r: 10 },
  ]) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFarmDragPreview() {
  if (
    state.scene !== SCENE_FARM ||
    farmDragState.pointerId === null ||
    farmDragState.sourceIndex === null ||
    farmDragState.distance <= FARM_DRAG_THRESHOLD
  ) {
    return;
  }

  const item = state.farm.board[farmDragState.sourceIndex];
  if (!item) {
    return;
  }

  const { viewportX, viewportY } = getCanvasPointerMetrics(
    farmDragState.currentClientX,
    farmDragState.currentClientY
  );
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.translate(viewportX, viewportY);
  drawFarmItemSprite(FARM_ITEM_META[item.kind]);
  ctx.restore();
}

function drawBackground() {
  const backgroundImage = getSpriteImage(RESTAURANT_BACKGROUND_IMAGE_PATH);
  if (backgroundImage?.complete && backgroundImage.naturalWidth) {
    const scale = Math.min(GAME_WIDTH / backgroundImage.naturalWidth, GAME_HEIGHT / backgroundImage.naturalHeight);
    const drawWidth = backgroundImage.naturalWidth * scale;
    const drawHeight = backgroundImage.naturalHeight * scale;
    const drawX = state.camera.x + (GAME_WIDTH - drawWidth) * 0.5;
    const drawY = (GAME_HEIGHT - drawHeight) * 0.5;
    ctx.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight);
    return;
  }

  ctx.fillStyle = "#93a97d";
  ctx.fillRect(0, 0, WORLD_WIDTH, GAME_HEIGHT);

  const grassLight = ctx.createRadialGradient(195, 418, 80, 195, 418, 320);
  grassLight.addColorStop(0, "rgba(227, 232, 201, 0.92)");
  grassLight.addColorStop(0.58, "rgba(202, 214, 175, 0.65)");
  grassLight.addColorStop(1, "rgba(202, 214, 175, 0)");
  ctx.fillStyle = grassLight;
  ctx.fillRect(0, 0, WORLD_WIDTH, GAME_HEIGHT);

  const rightGrassLight = ctx.createRadialGradient(500, 438, 96, 500, 438, 300);
  rightGrassLight.addColorStop(0, "rgba(229, 234, 205, 0.72)");
  rightGrassLight.addColorStop(0.58, "rgba(205, 216, 178, 0.36)");
  rightGrassLight.addColorStop(1, "rgba(205, 216, 178, 0)");
  ctx.fillStyle = rightGrassLight;
  ctx.fillRect(0, 0, WORLD_WIDTH, GAME_HEIGHT);

  const centerPatch = ctx.createRadialGradient(198, 470, 120, 198, 470, 360);
  centerPatch.addColorStop(0, "rgba(239, 243, 219, 0.52)");
  centerPatch.addColorStop(0.58, "rgba(220, 228, 196, 0.2)");
  centerPatch.addColorStop(1, "rgba(220, 228, 196, 0)");
  ctx.fillStyle = centerPatch;
  ctx.fillRect(0, 0, WORLD_WIDTH, GAME_HEIGHT);

  const rightCenterPatch = ctx.createRadialGradient(518, 492, 110, 518, 492, 320);
  rightCenterPatch.addColorStop(0, "rgba(239, 243, 219, 0.38)");
  rightCenterPatch.addColorStop(0.58, "rgba(220, 228, 196, 0.16)");
  rightCenterPatch.addColorStop(1, "rgba(220, 228, 196, 0)");
  ctx.fillStyle = rightCenterPatch;
  ctx.fillRect(0, 0, WORLD_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.beginPath();
  ctx.arc(62, 128, 74, 0, Math.PI * 2);
  ctx.arc(334, 168, 66, 0, Math.PI * 2);
  ctx.arc(558, 142, 72, 0, Math.PI * 2);
  ctx.arc(54, 736, 70, 0, Math.PI * 2);
  ctx.arc(338, 726, 68, 0, Math.PI * 2);
  ctx.arc(594, 706, 72, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(102, 126, 88, 0.24)";
  ctx.lineWidth = 2;
  for (const tuft of [
    { x: 58, y: 382, s: 10 },
    { x: 90, y: 610, s: 9 },
    { x: 315, y: 590, s: 11 },
    { x: 338, y: 424, s: 8 },
    { x: 58, y: 520, s: 8 },
    { x: 442, y: 410, s: 10 },
    { x: 488, y: 612, s: 9 },
    { x: 564, y: 538, s: 11 },
    { x: 602, y: 398, s: 8 },
    { x: 618, y: 720, s: 8 },
  ]) {
    ctx.beginPath();
    ctx.moveTo(tuft.x - tuft.s * 0.5, tuft.y + 2);
    ctx.quadraticCurveTo(tuft.x - 2, tuft.y - tuft.s, tuft.x, tuft.y);
    ctx.moveTo(tuft.x, tuft.y + 3);
    ctx.quadraticCurveTo(tuft.x + 1, tuft.y - tuft.s * 0.9, tuft.x + tuft.s * 0.46, tuft.y + 1);
    ctx.stroke();
  }
}

function drawTree(x, y, radius) {
  ctx.fillStyle = "#2b5035";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3b6a44";
  ctx.beginPath();
  ctx.arc(x - radius * 0.24, y - radius * 0.14, radius * 0.76, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1d3423";
  ctx.fillRect(x - 6, y + radius * 0.6, 12, radius * 0.95);
}

function drawRestaurant() {
  drawKitchenProps();
  drawPurchasedFacilities("back");
  drawChef(false);
  drawChefStaffActor();   // stove UI 아래에 그려야 해서 여기
  drawStoves();
  drawTables();
  drawStaffActors("behind");
  drawCustomers("behind");
  drawDecor();
  drawPurchasedFacilities("front");
  drawStaffActors("front");
  drawCustomers("front");
  drawChefSpeechBubble(state.chefActor);
}

function getMenuLaunchBonusPalette(rarity) {
  if (rarity === "epic") {
    return ["#ff7a7a", "#ffd45d", "#7fd6ff", "#b18bff", "#8de58d"];
  }
  if (rarity === "rare") {
    return ["#ff8f65", "#ffd56f", "#7dc8ff", "#8de58d"];
  }
  return ["#ffb56d", "#ffe27d", "#85d3ff", "#8de58d"];
}

function getConfettiSeedValue(seed) {
  const raw = Math.sin(seed * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

function drawMenuLaunchBonusConfetti() {
  if (!isMenuLaunchBonusActive(state)) {
    return;
  }
  const bonus = getMenuLaunchBonus(state);
  if (!bonus) {
    return;
  }
  const colors = getMenuLaunchBonusPalette(bonus.rarity);
  const pieceCount = bonus.rarity === "epic" ? 34 : bonus.rarity === "rare" ? 28 : 22;
  ctx.save();
  for (let index = 0; index < pieceCount; index += 1) {
    const seed = index + Number(bonus.startedAt || 0) * 7.13;
    const xBase = getConfettiSeedValue(seed + 1) * GAME_WIDTH;
    const fallSpeed = 60 + getConfettiSeedValue(seed + 2) * 90;
    const sway = 10 + getConfettiSeedValue(seed + 3) * 18;
    const phase = getConfettiSeedValue(seed + 4) * Math.PI * 2;
    const size = 5 + getConfettiSeedValue(seed + 5) * 5;
    const y = ((state.clock * fallSpeed) + getConfettiSeedValue(seed + 6) * (GAME_HEIGHT + 120)) % (GAME_HEIGHT + 120) - 60;
    const x = xBase + Math.sin(state.clock * 2.6 + phase) * sway;
    const rotation = state.clock * (1.8 + getConfettiSeedValue(seed + 7) * 2.4) + phase;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(-size * 0.5, -size * 0.35, size, size * 0.7);
    ctx.restore();
  }
  ctx.restore();
}

function drawKitchenProps() {
  drawPrepShelf(52, 282);
  drawCoolerChest(72, 220);
  drawIngredientCrate(322, 326);
}

function drawStoves() {
  for (const stove of state.restaurant.stoves) {
    ctx.save();
    ctx.translate(stove.x, stove.y);
    ctx.fillStyle = "rgba(21, 30, 25, 0.16)";
    ctx.beginPath();
    ctx.ellipse(0, 26, 34, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    const drewFacility = drawFacilitySprite(STOVE_FACILITY_ICON_PATH, 70, 70, -34);
    if (!drewFacility) {
      ctx.fillStyle = "#d7ddea";
      roundRect(ctx, -26, -22, 52, 44, 16);
      ctx.fill();

      ctx.fillStyle = "#70839a";
      roundRect(ctx, -22, -18, 44, 30, 14);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -3, 13, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();

      ctx.fillStyle = "#4f5968";
      roundRect(ctx, 14, -6, 16, 4, 2);
      ctx.fill();

      ctx.fillStyle = "#ffdf7b";
      ctx.beginPath();
      ctx.arc(0, 10, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#4a5560";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -2, 15, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }

    const flameHeight = stove.order ? 10 + Math.sin(state.clock * 10 + stove.x) * 2 : 6;
    const flameColor = stove.order ? "#ffbb5d" : "#ffe7a5";
    ctx.fillStyle = flameColor;
    ctx.beginPath();
    ctx.moveTo(-6, 16);
    ctx.quadraticCurveTo(-1, 6 - flameHeight, 4, 16);
    ctx.quadraticCurveTo(-1, 11, -6, 16);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.beginPath();
    ctx.ellipse(-8, -12, 5, 2.8, -0.2, 0, Math.PI * 2);
    ctx.ellipse(8, -10, 4.5, 2.4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    if (stove.order) {
      const recipe = getRecipe(stove.order.recipeId);
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      roundRect(ctx, -38, -62, 76, 26, 12);
      ctx.fill();
      if (!drawRecipeSprite(recipe, -22, -49, 18, "circle")) {
        setCanvasFont(13);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = recipe.accent;
        ctx.fillText(recipe.emoji, -22, -49);
      }
      ctx.fillStyle = "#374438";
      setCanvasFont(10);
      ctx.textAlign = "left";
      ctx.fillText(getRecipeNameByLevel(recipe.id), -6, -48);

      ctx.fillStyle = "rgba(55, 67, 56, 0.18)";
      roundRect(ctx, -28, 28, 56, 8, 999);
      ctx.fill();
      ctx.fillStyle = "#db9151";
      roundRect(ctx, -28, 28, 56 * (stove.progress / stove.total), 8, 999);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.arc(-10, -26 - Math.sin(state.clock * 3 + stove.x * 0.08) * 2, 3.5, 0, Math.PI * 2);
      ctx.arc(4, -32 - Math.sin(state.clock * 3.4 + stove.x * 0.1) * 2, 4.2, 0, Math.PI * 2);
      ctx.fill();

      if (isChefWorkingOnStove(stove)) {
        drawChefStoveEffect(stove);
      }
    }

    ctx.restore();
  }
}

function drawChickSprite(src, size, yOffset = -size * 0.82) {
  const image = getChickImage(src);
  if (!image || !image.complete || !image.naturalWidth) {
    return false;
  }
  ctx.drawImage(image, -size / 2, yOffset, size, size);
  return true;
}

function drawFacilitySprite(src, width, height, yOffset = -height * 0.5) {
  const image = getFacilityImage(src);
  if (!image || !image.complete || !image.naturalWidth) {
    return false;
  }
  ctx.drawImage(image, -width / 2, yOffset, width, height);
  return true;
}

function drawCurrencySprite(src, x, y, size) {
  const image = getCurrencyImage(src);
  if (!image || !image.complete || !image.naturalWidth) {
    return false;
  }
  ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
  return true;
}

function drawRecipeSprite(recipe, x, y, size, shape = "circle") {
  if (!recipe?.iconPath) {
    return false;
  }
  const image = getRecipeImage(recipe.iconPath);
  if (!image || !image.complete || !image.naturalWidth) {
    return false;
  }

  ctx.save();
  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.clip();
  } else {
    roundRect(ctx, x - size / 2, y - size / 2, size, size, Math.max(8, size * 0.22));
    ctx.clip();
  }
  ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
  ctx.restore();
  return true;
}

function drawChefStoveEffect(stove) {
  const whisk = Math.sin(state.chefActor.stirPhase) * 6;
  ctx.strokeStyle = "rgba(255, 246, 214, 0.72)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-6, -2, 18 + whisk * 0.18, Math.PI * 1.08, Math.PI * 1.84);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(8, -4, 15 + whisk * 0.14, Math.PI * 1.18, Math.PI * 1.94);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 219, 131, 0.9)";
  for (let index = 0; index < 3; index += 1) {
    const angle = state.clock * 8 + index * 1.9 + stove.x * 0.02;
    const px = Math.cos(angle) * 10;
    const py = -18 + Math.sin(angle) * 6;
    ctx.beginPath();
    ctx.arc(px, py, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawChefSpeechBubble(actor) {
  if (!actor.line || actor.lineUntil <= state.clock) {
    return;
  }

  const pulse = 1 + Math.sin(state.clock * 5.6) * 0.02;
  setCanvasFont(10, 700);
  const width = Math.min(168, Math.max(104, Math.ceil(ctx.measureText(actor.line).width + 26)));
  const viewportX = actor.x - state.camera.x;
  const clampedViewportX = Math.max(width / 2 + 10, Math.min(GAME_WIDTH - width / 2 - 10, viewportX));
  const bubbleWorldX = clampedViewportX + state.camera.x;
  ctx.save();
  ctx.translate(bubbleWorldX, actor.y - 68);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = "rgba(255, 252, 244, 0.96)";
  roundRect(ctx, -width / 2, -18, width, 30, 14);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-8, 12);
  ctx.lineTo(-1, 22);
  ctx.lineTo(8, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#4a4d3e";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(actor.line, 0, -2);
  ctx.restore();
}

function setStaffBubble(role, line, duration = 3.2) {
  if (!staffBubbles[role]) {
    staffBubbles[role] = { line: "", until: 0 };
  }
  staffBubbles[role].line = line;
  staffBubbles[role].until = state.clock + duration;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function drawStaffBubble(x, y, role) {
  const bubble = staffBubbles[role];
  if (!bubble) return;
  if (!bubble.line || bubble.until <= state.clock) return;
  const isInWorld = role !== "protagonist" && role !== "farmer";
  const drawX = isInWorld ? x - state.camera.x : x;
  setCanvasFont(10, 700);
  const width = Math.min(160, Math.max(88, Math.ceil(ctx.measureText(bubble.line).width + 26)));
  const clampedX = Math.max(width / 2 + 8, Math.min(GAME_WIDTH - width / 2 - 8, drawX));
  ctx.save();
  ctx.translate(clampedX, y - 54);
  ctx.fillStyle = "rgba(255, 252, 244, 0.96)";
  roundRect(ctx, -width / 2, -18, width, 30, 14);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-7, 12);
  ctx.lineTo(0, 22);
  ctx.lineTo(7, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#4a4d3e";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(bubble.line, 0, -2);
  ctx.restore();
}

function drawChef(includeSpeech = true) {
  const actor = state.chefActor;
  ctx.save();
  ctx.translate(actor.x, actor.y);
  const isBusy = actor.mode === "cooking" || actor.mode === "rush";
  const bob = Math.sin(state.clock * (isBusy ? 8.2 : 5.4)) * (isBusy ? 2.3 : 1.3);
  ctx.fillStyle = "rgba(26, 35, 28, 0.16)";
  ctx.beginPath();
  ctx.ellipse(0, 20, actor.activeCount > 1 ? 23 : 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, bob);
  const drewSprite = drawChickSprite(PROTAGONIST_CHICK_ICON_PATH, 62, -48);
  if (!drewSprite) {
    ctx.fillStyle = "#f4cf48";
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f7da76";
    ctx.beginPath();
    ctx.ellipse(-13, 1, 7, 10, -0.4, 0, Math.PI * 2);
    ctx.ellipse(13, 1, 7, 10, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const utensilSwing = isBusy ? Math.sin(actor.stirPhase) * 0.65 : -0.18;
  ctx.save();
  ctx.translate(16, -2);
  ctx.rotate(0.55 + utensilSwing);
  ctx.fillStyle = "#8f6a49";
  roundRect(ctx, -2, -2, 5, 26, 3);
  ctx.fill();
  ctx.fillStyle = "#dde7df";
  roundRect(ctx, -6, 18, 14, 8, 5);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.62)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-8, 4);
  ctx.lineTo(-13, 0);
  ctx.moveTo(-9, 10);
  ctx.lineTo(-15, 10);
  ctx.stroke();
  ctx.restore();

  if (isBusy) {
    ctx.strokeStyle = "rgba(255, 248, 221, 0.68)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-6, -10, 16, Math.PI * 0.9, Math.PI * 1.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(10, -12, 14, Math.PI * 1.55, Math.PI * 1.96);
    ctx.stroke();
  }

  if (actor.activeCount > 1) {
    ctx.fillStyle = "rgba(125, 173, 207, 0.9)";
    ctx.beginPath();
    ctx.ellipse(18, -26, 3.2, 5.8, 0.2, 0, Math.PI * 2);
    ctx.ellipse(24, -18, 2.6, 4.5, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  if (includeSpeech) {
    drawChefSpeechBubble(actor);
  }
}

function drawTables() {
  for (const table of state.restaurant.tables) {
    ctx.save();
    ctx.translate(table.x, table.y);
    ctx.fillStyle = "rgba(20, 26, 21, 0.16)";
    ctx.beginPath();
    ctx.ellipse(0, 28, 42, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    const drewFacility = drawFacilitySprite(TABLE_FACILITY_ICON_PATH, 92, 92, -44);
    if (!drewFacility) {
      ctx.fillStyle = "#5c8d84";
      roundRect(ctx, -34, -20, 68, 40, 16);
      ctx.fill();

      ctx.fillStyle = "#8ab2a8";
      roundRect(ctx, -31, -17, 62, 34, 14);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
      roundRect(ctx, -28, -14, 56, 10, 8);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 246, 223, 0.55)";
      roundRect(ctx, -4, -18, 8, 36, 6);
      ctx.fill();
      roundRect(ctx, -18, -18, 5, 36, 5);
      ctx.fill();
      roundRect(ctx, 13, -18, 5, 36, 5);
      ctx.fill();

      ctx.fillStyle = "#587267";
      roundRect(ctx, -48, -14, 12, 32, 6);
      ctx.fill();
      roundRect(ctx, 36, -14, 12, 32, 6);
      ctx.fill();

      ctx.fillStyle = "#f6edd9";
      ctx.beginPath();
      ctx.arc(-42, -1, 6.5, 0, Math.PI * 2);
      ctx.arc(42, -1, 6.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#3c5a55";
      ctx.fillRect(-26, 18, 8, 18);
      ctx.fillRect(18, 18, 8, 18);

      ctx.fillStyle = "#f7f0df";
      ctx.beginPath();
      ctx.arc(-8, 0, 8, 0, Math.PI * 2);
      ctx.arc(8, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f9d582";
      ctx.beginPath();
      ctx.arc(0, -5, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#64895d";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.lineTo(0, 7);
      ctx.stroke();
    }

    if (table.customer?.recipeId && table.customer.state === "eating") {
      const recipe = getRecipe(table.customer.recipeId);
      if (!drawRecipeSprite(recipe, 0, 0, 26, "circle")) {
        setCanvasFont(13);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(recipe.emoji, 0, 1);
      }
    } else if (table.customer?.recipeId && table.customer.state === "cooking") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      roundRect(ctx, -12, -10, 24, 16, 8);
      ctx.fill();
      setCanvasFont(11);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⌛", 0, -2);
    }

    ctx.restore();
  }
}

function drawCustomers(layer = "behind") {
  const customers = [
    ...state.restaurant.queue,
    ...state.restaurant.tables.map((table) => table.customer).filter(Boolean),
    ...state.restaurant.departingCustomers,
  ]
    .filter((customer) => isFrontCustomer(customer) === (layer === "front"))
    .sort((left, right) => left.y - right.y);

  for (const customer of customers) {
    drawCustomerAt(customer, customer.x, customer.y);
    drawCustomerBubble(customer);
  }
}

function isFrontCustomer(customer) {
  return customer.y >= ENTRANCE_POSITION.y + 22;
}

function drawChefStaffActor() {
  if (getStaffLevel("chef") <= 0) return;
  const activeStoves = getChefActiveStoves();
  const pos = activeStoves.length > 0
    ? getChefTargetPositionForStove(activeStoves[0])
    : getChefHomePosition();
  drawStaffActor({ id: "chef", role: "chef", x: pos.x, y: pos.y });
}

function drawStaffActors(layer = "behind") {
  const actors = [];


  if (getStaffLevel("server") > 0) {
    actors.push({
      id: "server",
      role: "server",
      x: state.staffs.server.x,
      y: state.staffs.server.y,
    });
  }

  if (getStaffLevel("promoter") > 0) {
    actors.push({
      id: "promoter",
      role: "promoter",
      x: state.staffs.promoter.x,
      y: state.staffs.promoter.y,
    });
  }

  actors
    .filter((actor) => (actor.y >= ENTRANCE_POSITION.y + 22) === (layer === "front"))
    .sort((left, right) => left.y - right.y)
    .forEach((actor) => drawStaffActor(actor));
}

function drawStaffActor(actor) {
  const bob = Math.sin(state.clock * 4.5 + actor.x * 0.03) * 1.6;
  const def = getStaffDef(actor.role);
  const candidate = getAssignedStaffCandidate(actor.role);
  const candidateIconPath = candidate?.iconPath || NORMAL_CHICK_ICON_PATH;
  ctx.save();
  ctx.translate(actor.x, actor.y);
  ctx.fillStyle = "rgba(21, 30, 25, 0.16)";
  ctx.beginPath();
  ctx.ellipse(0, 16, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, bob);
  if (drawChickSprite(candidateIconPath, 42, -32)) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    roundRect(ctx, 6, -24, 18, 18, 8);
    ctx.fill();
    setCanvasFont(11);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(def?.icon || "✨", 15, -15);
    ctx.restore();
    return;
  }

  ctx.fillStyle = actor.role === "promoter" ? "#ffa96f" : actor.role === "server" ? "#9ed0f4" : "#f8da58";
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.beginPath();
  ctx.ellipse(-8, 1, 5, 7, -0.3, 0, Math.PI * 2);
  ctx.ellipse(8, 1, 5, 7, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3f301c";
  ctx.beginPath();
  ctx.arc(-3, -2, 1.7, 0, Math.PI * 2);
  ctx.arc(3, -2, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f28b72";
  ctx.beginPath();
  ctx.arc(-6, 3, 2.2, 0, Math.PI * 2);
  ctx.arc(6, 3, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ef9855";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-3, 3.5);
  ctx.lineTo(3, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#70461e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 3, 4, 0.1, Math.PI - 0.1);
  ctx.stroke();

  if (actor.role === "chef") {
    ctx.fillStyle = "#fffdf6";
    roundRect(ctx, -12, -18, 24, 12, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-5, -13, 5, 0, Math.PI * 2);
    ctx.arc(5, -13, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (actor.role === "server") {
    ctx.fillStyle = "#f2f3f5";
    roundRect(ctx, -14, -16, 28, 6, 4);
    ctx.fill();
    ctx.fillStyle = "#b8c4c6";
    roundRect(ctx, -12, -14, 24, 2, 1);
    ctx.fill();
    setCanvasFont(10);
    ctx.fillText("🍽️", 0, -10);
  }

  if (actor.role === "promoter") {
    ctx.fillStyle = "#f8f1df";
    roundRect(ctx, 8, -6, 10, 10, 4);
    ctx.fill();
    ctx.fillStyle = "#db9151";
    ctx.beginPath();
    ctx.moveTo(18, -5);
    ctx.lineTo(25, -9);
    ctx.lineTo(25, 1);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  roundRect(ctx, 6, -24, 18, 18, 8);
  ctx.fill();
  setCanvasFont(11);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(def?.icon || "✨", 15, -15);

  ctx.restore();
  drawStaffBubble(actor.x, actor.y, actor.role);
}

function drawDecor() {
  drawTipBasket(78, 666);
  drawQueueGuides();

  if (state.restaurant.ambience > 0) {
    ctx.fillStyle = "rgba(255, 245, 198, 0.26)";
    ctx.beginPath();
    ctx.arc(322, 260, 74, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255, 249, 217, 0.85)";
  for (let index = 0; index < 5; index += 1) {
    const angle = state.clock * 0.9 + index * 1.3;
    const x = 82 + Math.sin(angle) * 18 + index * 46;
    const y = 178 + Math.cos(angle * 1.1) * 10 + index * 14;
    ctx.beginPath();
    ctx.arc(x, y, 1.8 + (index % 2), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEntranceBack() {
  ctx.save();
  ctx.translate(ENTRANCE_POSITION.x, ENTRANCE_POSITION.y);

  const glow = ctx.createRadialGradient(0, 12, 10, 0, 12, 84);
  glow.addColorStop(0, "rgba(250, 241, 208, 0.24)");
  glow.addColorStop(1, "rgba(250, 241, 208, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 8, 92, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(226, 238, 228, 0.38)";
  roundRect(ctx, -36, -6, 72, 20, 10);
  ctx.fill();
  ctx.restore();
}

function drawEntranceFront() {
  ctx.save();
  ctx.translate(ENTRANCE_POSITION.x, ENTRANCE_POSITION.y);

  ctx.fillStyle = "rgba(15, 19, 16, 0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 34, 78, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#725239";
  roundRect(ctx, -60, -10, 12, 54, 6);
  ctx.fill();
  roundRect(ctx, 48, -10, 12, 54, 6);
  ctx.fill();

  ctx.fillStyle = "#8f6a49";
  roundRect(ctx, -58, -8, 4, 50, 4);
  ctx.fill();
  roundRect(ctx, 50, -8, 4, 50, 4);
  ctx.fill();

  ctx.fillStyle = "#7ea8a0";
  roundRect(ctx, -70, -26, 140, 28, 16);
  ctx.fill();

  ctx.fillStyle = "#d8ebe3";
  roundRect(ctx, -60, -16, 120, 14, 10);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-54, -8);
  ctx.lineTo(54, -8);
  ctx.stroke();

  ctx.fillStyle = "rgba(117, 162, 152, 0.92)";
  ctx.beginPath();
  ctx.moveTo(-70, -18);
  ctx.lineTo(-48, 14);
  ctx.lineTo(-28, -2);
  ctx.lineTo(-40, -18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(70, -18);
  ctx.lineTo(48, 14);
  ctx.lineTo(28, -2);
  ctx.lineTo(40, -18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#6d4f35";
  roundRect(ctx, -44, -52, 88, 24, 9);
  ctx.fill();
  ctx.fillStyle = "#f8f1df";
  setCanvasFont(10);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🐥 삐약 식당", 0, -40);

  const pennantColors = ["#f3b866", "#77b6ab", "#f28b72", "#f0d879"];
  for (let index = 0; index < 4; index += 1) {
    const px = -38 + index * 26;
    ctx.fillStyle = pennantColors[index];
    ctx.beginPath();
    ctx.moveTo(px, -16);
    ctx.lineTo(px + 10, -1);
    ctx.lineTo(px + 20, -16);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#ede2ca";
  ctx.beginPath();
  ctx.arc(-52, 42, 7, 0, Math.PI * 2);
  ctx.arc(52, 42, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 241, 192, 0.85)";
  ctx.beginPath();
  ctx.arc(-36, -2, 3.2, 0, Math.PI * 2);
  ctx.arc(36, -2, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPrepShelf(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(17, 25, 20, 0.14)";
  ctx.beginPath();
  ctx.ellipse(8, 22, 32, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7a573e";
  roundRect(ctx, -18, -8, 52, 14, 6);
  ctx.fill();
  roundRect(ctx, -22, 8, 60, 12, 6);
  ctx.fill();
  ctx.fillRect(-14, 4, 6, 20);
  ctx.fillRect(24, 4, 6, 20);

  ctx.fillStyle = "#e8efe8";
  ctx.beginPath();
  ctx.arc(-6, -12, 6.5, 0, Math.PI * 2);
  ctx.arc(9, -12, 6.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#d6e5e6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(23, -26);
  ctx.lineTo(23, -8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(20, -16, 4.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(31, -24);
  ctx.lineTo(31, -10);
  ctx.stroke();
  ctx.fillStyle = "#f4d079";
  ctx.beginPath();
  ctx.arc(31, -7, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCoolerChest(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(17, 25, 20, 0.12)";
  ctx.beginPath();
  ctx.ellipse(0, 26, 28, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#a6b6ca";
  roundRect(ctx, -28, -16, 56, 40, 14);
  ctx.fill();
  ctx.fillStyle = "#7e8ea4";
  roundRect(ctx, -24, -12, 48, 32, 12);
  ctx.fill();
  ctx.fillStyle = "#dbe3ef";
  roundRect(ctx, -16, 4, 32, 12, 6);
  ctx.fill();
  ctx.fillStyle = "#f0d875";
  ctx.beginPath();
  ctx.arc(0, 10, 7, 0, Math.PI * 2);
  ctx.fill();
  if (!drawCurrencySprite(ACORN_CURRENCY_ICON_PATH, 0, 10, 16)) {
    setCanvasFont(12);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🌰", 0, 10);
  }
  ctx.restore();
}

function drawIngredientCrate(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(17, 25, 20, 0.12)";
  ctx.beginPath();
  ctx.ellipse(0, 20, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8b6546";
  roundRect(ctx, -18, -10, 36, 24, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 240, 219, 0.24)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.lineTo(-12, 10);
  ctx.moveTo(0, -6);
  ctx.lineTo(0, 10);
  ctx.moveTo(12, -6);
  ctx.lineTo(12, 10);
  ctx.stroke();
  setCanvasFont(12);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🥬", -7, 1);
  ctx.fillText("🥕", 7, 2);
  ctx.restore();
}

function drawStandingMenuBoard(x, y) {
  const menuRecipe = getOwnedRecipes()[0]?.recipe || RECIPE_CATALOG[0];

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(17, 25, 20, 0.14)";
  ctx.beginPath();
  ctx.ellipse(0, 40, 26, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6d4f35";
  roundRect(ctx, -18, -28, 36, 56, 8);
  ctx.fill();
  ctx.fillRect(-10, 26, 4, 18);
  ctx.fillRect(6, 26, 4, 18);

  ctx.fillStyle = "#2a3b2d";
  roundRect(ctx, -14, -24, 28, 46, 6);
  ctx.fill();
  ctx.fillStyle = "#eef5df";
  setCanvasFont(8, 700);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("TODAY", 0, -14);
  setCanvasFont(14);
  ctx.fillText(menuRecipe.emoji, 0, 1);
  setCanvasFont(7, 700);
  ctx.fillText(menuRecipe.name, 0, 16);
  ctx.restore();
}

function drawTipBasket(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(17, 25, 20, 0.12)";
  ctx.beginPath();
  ctx.ellipse(0, 20, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#b57c49";
  roundRect(ctx, -20, -4, 40, 18, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(117, 81, 45, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.lineTo(-12, 12);
  ctx.moveTo(0, -2);
  ctx.lineTo(0, 12);
  ctx.moveTo(12, -2);
  ctx.lineTo(12, 12);
  ctx.stroke();

  const visibleAcorns = Math.min(3, 1 + Math.floor(state.metrics.served / 2));
  for (let index = 0; index < visibleAcorns; index += 1) {
    const drawX = -8 + index * 8;
    const drawY = 2 - (index % 2) * 3;
    if (!drawCurrencySprite(ACORN_CURRENCY_ICON_PATH, drawX, drawY, 12)) {
      setCanvasFont(12);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🌰", drawX, drawY);
    }
  }
  setCanvasFont(8, 700);
  ctx.fillStyle = "#f7f0df";
  ctx.fillText("TIP", 0, -14);
  ctx.restore();
}

function drawPlanter(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(17, 25, 20, 0.12)";
  ctx.beginPath();
  ctx.ellipse(0, 14, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9a744f";
  roundRect(ctx, -16, 0, 32, 18, 6);
  ctx.fill();
  ctx.fillStyle = "#6ea26c";
  ctx.beginPath();
  ctx.arc(-8, -2, 9, 0, Math.PI * 2);
  ctx.arc(0, -8, 10, 0, Math.PI * 2);
  ctx.arc(9, -1, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f6da83";
  ctx.beginPath();
  ctx.arc(0, -8, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawQueueGuides() {
  const posts = [
    { x: 150, y: 736 },
    { x: 238, y: 736 },
    { x: 150, y: 804 },
    { x: 238, y: 804 },
  ];

  ctx.strokeStyle = "rgba(244, 231, 198, 0.22)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(posts[0].x, posts[0].y);
  ctx.lineTo(posts[1].x, posts[1].y);
  ctx.moveTo(posts[2].x, posts[2].y);
  ctx.lineTo(posts[3].x, posts[3].y);
  ctx.stroke();

  ctx.fillStyle = "#8b6546";
  for (const post of posts) {
    ctx.fillRect(post.x - 3, post.y - 16, 6, 18);
    ctx.fillStyle = "#f3ddb0";
    ctx.beginPath();
    ctx.arc(post.x, post.y - 18, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8b6546";
  }
}

function drawCustomerAt(customer, x, y) {
  const isSpecial = customer.kind === "special";
  const bob = Math.sin(state.clock * 5.2 + customer.id * 0.8) * 1.8;
  const spritePath = isSpecial ? getCustomerIconPath(customer.profileId) : NORMAL_CHICK_ICON_PATH;

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(21, 30, 25, 0.14)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, bob);
  if (drawChickSprite(spritePath, isSpecial ? 46 : 42, -34)) {
    ctx.restore();
    return;
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.beginPath();
  ctx.ellipse(-11, 1, 7, 10, -0.35, 0, Math.PI * 2);
  ctx.ellipse(11, 1, 7, 10, 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = customer.color;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  if (isSpecial && accent) {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, -2, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = customer.color;
  ctx.beginPath();
  ctx.arc(0, -1, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f6c14f";
  ctx.beginPath();
  ctx.ellipse(-4, -15, 2.5, 5, -0.4, 0, Math.PI * 2);
  ctx.ellipse(0, -17, 2.8, 5.5, 0, 0, Math.PI * 2);
  ctx.ellipse(4, -15, 2.5, 5, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3f301c";
  ctx.beginPath();
  ctx.arc(-4, -2, 1.9, 0, Math.PI * 2);
  ctx.arc(4, -2, 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f28b72";
  ctx.beginPath();
  ctx.arc(-7, 4, 2.4, 0, Math.PI * 2);
  ctx.arc(7, 4, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ef9855";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-4, 4);
  ctx.lineTo(4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#70461e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 4, 5, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.strokeStyle = "#8f5c2c";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-5, 13);
  ctx.lineTo(-7, 18);
  ctx.moveTo(5, 13);
  ctx.lineTo(7, 18);
  ctx.stroke();
  if (isSpecial) {
    ctx.strokeStyle = "rgba(255, 235, 156, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 16.5, 0, Math.PI * 2);
    ctx.stroke();
    setCanvasFont(10);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badge, 14, -14);
  }
  ctx.restore();
}

function drawCustomerBubble(customer) {
  if (customer.state === "awaiting_order") {
    drawOrderBubble(customer);
    return;
  }

  if (customer.state === "order_queued") {
    drawStatusBubble(customer, "order_queued");
    return;
  }

  if (customer.state === "cooking") {
    drawStatusBubble(customer, "cooking");
    return;
  }

  if (customer.state === "eating") {
    drawStatusBubble(customer, "eating");
    return;
  }

  if (customer.state === "leaving" && customer.satisfaction && (customer.feedbackTimer || 0) > 0) {
    drawStatusBubble(customer, {
      icon: customer.satisfaction.emoji,
      text: customer.satisfaction.bubbleText,
      fill: customer.satisfaction.bubbleFill,
      ink: customer.satisfaction.bubbleInk,
    });
  }
}

function drawOrderBubble(customer) {
  const recipe = getRecipe(customer.recipeId);
  const bubble = getOrderBubbleRect(customer);
  const prefersRecipe = customer.preferredRecipes.includes(customer.recipeId);
  const pulse = 1 + Math.sin(state.clock * 5 + customer.id) * 0.04;
  const centerX = bubble.x + bubble.width / 2;
  const centerY = bubble.y + bubble.height / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = "rgba(29, 37, 31, 0.12)";
  roundRect(ctx, -bubble.width / 2, -bubble.height / 2 + 5, bubble.width, bubble.height, 16);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 252, 244, 0.96)";
  roundRect(ctx, -bubble.width / 2, -bubble.height / 2, bubble.width, bubble.height, 14);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, bubble.height / 2 - 2);
  ctx.lineTo(0, bubble.height / 2 + 9);
  ctx.lineTo(7, bubble.height / 2 - 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = recipe.accent;
  ctx.beginPath();
  ctx.arc(-25, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  if (!drawRecipeSprite(recipe, -25, 0, 24, "circle")) {
    ctx.fillStyle = "#fffdf7";
    setCanvasFont(13);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(recipe.emoji, -25, 0.5);
  }

  ctx.fillStyle = "#3e4b39";
  setCanvasFont(10);
  ctx.textAlign = "left";
  ctx.fillText(getRecipeNameByLevel(recipe.id), -6, -6);
  setCanvasFont(8, 600);
  ctx.fillStyle = prefersRecipe ? "#c0674b" : "#8a6f42";
  ctx.fillText(prefersRecipe ? "선호 메뉴 주문!" : "터치해서 주문 접수", -6, 8);
  if (prefersRecipe) {
    ctx.textAlign = "center";
    ctx.fillText("💛", 34, -11);
  }
  ctx.restore();
}

function drawStatusBubble(customer, status) {
  const statusMap = {
    order_queued: { icon: "📝", text: "접수됨" },
    cooking: { icon: "🔥", text: "조리 중" },
    eating: { icon: "😋", text: "맛있다!" },
  };
  const info =
    typeof status === "string" ? statusMap[status] || { icon: "💬", text: status } : status;
  const bubbleText = `${info.icon} ${info.text}`;

  ctx.save();
  ctx.translate(customer.x, customer.y - 44);
  setCanvasFont(11);
  const width = Math.max(80, Math.ceil(ctx.measureText(bubbleText).width + 28));
  ctx.fillStyle = info.fill || "rgba(255, 255, 255, 0.94)";
  roundRect(ctx, -width / 2, -12, width, 24, 12);
  ctx.fill();
  ctx.fillStyle = info.ink || "#3d4c3b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(bubbleText, 0, 1);
  ctx.restore();
}

function roundRect(context, x, y, width, height, radius) {
  const safeRadius = Math.max(0, Math.min(radius, Math.abs(width) * 0.5, Math.abs(height) * 0.5));
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function setCanvasFont(size, weight = 700) {
  ctx.font =
    `${weight} ${size}px "Avenir Next", "Pretendard Variable", ` +
    `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
}
