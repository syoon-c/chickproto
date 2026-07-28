import fs from "node:fs/promises";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUT = "C:/Users/Soyoon Bang/Desktop/ChickProto/진짜병아리_문제점_정리_2026-07-28.pptx";
const RENDER_DIR = "C:/Users/Soyoon Bang/Desktop/ChickProto/.ppt-build/renders";

const C = {
  bg: "#FFFDF7",
  ink: "#201D16",
  muted: "#6B6558",
  yellow: "#F4C542",
  pale: "#FFF1B8",
  soft: "#F5F0E3",
  white: "#FFFFFF",
};
const FONT = "Malgun Gothic";

function addText(slide, name, text, position, fontSize, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name,
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontSize,
    typeface: FONT,
    color: options.color ?? C.ink,
    bold: options.bold ?? false,
    alignment: options.alignment ?? "left",
    verticalAlignment: options.verticalAlignment ?? "top",
    autoFit: options.autoFit ?? "shrinkText",
  };
  return shape;
}

function addAccent(slide, left = 42, top = 40, width = 76) {
  slide.shapes.add({
    geometry: "rect",
    name: "yellow-accent",
    position: { left, top, width, height: 8 },
    fill: C.yellow,
    line: { style: "solid", fill: C.yellow, width: 0 },
  });
}

function addFooter(slide, page) {
  addText(
    slide,
    `page-${page}`,
    String(page).padStart(2, "0"),
    { left: 1170, top: 664, width: 68, height: 24 },
    14,
    { color: C.muted, alignment: "right" },
  );
}

function addNotes(slide) {
  slide.speakerNotes.textFrame.setText(
    "[Sources]\n- Slack #진짜병아리 채널, 2026-07-28 KST 대화 및 테스트 피드백 스레드",
  );
  slide.speakerNotes.setVisible(true);
}

function addProblemColumn(slide, number, title, bullets, x, y, w, h) {
  addText(
    slide,
    `problem-${number}-number`,
    String(number).padStart(2, "0"),
    { left: x, top: y, width: 70, height: 44 },
    28,
    { bold: true, color: C.yellow },
  );
  addText(
    slide,
    `problem-${number}-title`,
    title,
    { left: x + 74, top: y - 2, width: w - 74, height: 58 },
    30,
    { bold: true },
  );
  addText(
    slide,
    `problem-${number}-bullets`,
    bullets.map((v) => `• ${v}`).join("\n\n"),
    { left: x + 74, top: y + 72, width: w - 78, height: h - 72 },
    22,
    { color: C.muted },
  );
}

function addSlideTitle(slide, title, page) {
  addAccent(slide);
  addText(
    slide,
    `slide-${page}-title`,
    title,
    { left: 42, top: 66, width: 1150, height: 72 },
    46,
    { bold: true },
  );
  addFooter(slide, page);
}

const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });

// 1. Codex Grid slide 01 hierarchy: eyebrow → dominant title → subtitle.
{
  const slide = deck.slides.add();
  slide.background.fill = C.bg;
  addAccent(slide, 42, 42, 96);
  addText(
    slide,
    "cover-eyebrow",
    "진짜병아리 · 프로토타입 점검",
    { left: 42, top: 68, width: 600, height: 44 },
    24,
    { bold: true, color: C.muted },
  );
  addText(
    slide,
    "cover-title",
    "해결해야 할 문제\n6가지",
    { left: 42, top: 182, width: 980, height: 260 },
    72,
    { bold: true, verticalAlignment: "bottom" },
  );
  addText(
    slide,
    "cover-subtitle",
    "2026.07.28 채널 피드백 종합\n개인 이름 없이 의견과 해결 방향만 정리",
    { left: 42, top: 500, width: 720, height: 106 },
    26,
    { color: C.muted },
  );
  addFooter(slide, 1);
  addNotes(slide);
}

// 2. Codex Grid slide 05 hierarchy: full-width title → two equal text columns.
{
  const slide = deck.slides.add();
  slide.background.fill = C.bg;
  addSlideTitle(slide, "핵심 경험부터 선명하게 만들어야 합니다", 2);
  addProblemColumn(
    slide,
    1,
    "레시피 획득이 밋밋함",
    [
      "자동 제작 결과처럼 느껴져 발견의 성취감이 약함",
      "뽑기식 연출과 히든 레시피로 기대감 강화",
      "병아리 특성과 재료·레시피를 연결",
    ],
    42,
    190,
    555,
    410,
  );
  slide.shapes.add({
    geometry: "rect",
    name: "center-rule-2",
    position: { left: 630, top: 188, width: 2, height: 414 },
    fill: C.soft,
    line: { style: "solid", fill: C.soft, width: 0 },
  });
  addProblemColumn(
    slide,
    2,
    "카페의 역할이 불명확함",
    [
      "꾸미기와 케이크 제작 사이에서 중심 경험이 흐려짐",
      "가구와 기능을 줄이고 작은 디저트 가게로 정리",
      "케이크 연구·레시피 발견을 핵심 후보로 검토",
    ],
    670,
    190,
    568,
    410,
  );
  addNotes(slide);
}

// 3. Codex Grid slide 11 hierarchy: claim → two large comparison blocks → details.
{
  const slide = deck.slides.add();
  slide.background.fill = C.bg;
  addSlideTitle(slide, "복잡도를 줄이고, 성장 이유를 보여줘야 합니다", 3);
  addText(
    slide,
    "slide-3-claim",
    "많이 넣는 것보다 핵심 경험을 돋보이게 하는 정리가 우선입니다.",
    { left: 42, top: 142, width: 1120, height: 54 },
    24,
    { color: C.muted },
  );
  slide.shapes.add({
    geometry: "roundRect",
    name: "problem-3-band",
    position: { left: 42, top: 235, width: 580, height: 112 },
    fill: C.pale,
    line: { style: "solid", fill: C.pale, width: 0 },
    borderRadius: "rounded-xl",
  });
  slide.shapes.add({
    geometry: "roundRect",
    name: "problem-4-band",
    position: { left: 657, top: 235, width: 581, height: 112 },
    fill: C.soft,
    line: { style: "solid", fill: C.soft, width: 0 },
    borderRadius: "rounded-xl",
  });
  addText(
    slide,
    "problem-3-title",
    "03  화면·시스템이 과밀함",
    { left: 72, top: 267, width: 510, height: 54 },
    30,
    { bold: true },
  );
  addText(
    slide,
    "problem-4-title",
    "04  장기 목표가 부족함",
    { left: 687, top: 267, width: 510, height: 54 },
    30,
    { bold: true },
  );
  addText(
    slide,
    "problem-3-details",
    "• 팝업·재료·직원·설비가 동시에 노출됨\n\n• 가구 수와 반복 클릭을 축소\n\n• 직원 기능을 설비·테마에 통합",
    { left: 72, top: 380, width: 520, height: 220 },
    22,
    { color: C.muted },
  );
  addText(
    slide,
    "problem-4-details",
    "• 돈을 버는 이유와 최종 목표가 약함\n\n• 승급·구역 개방·외형 변화로 성장 시각화\n\n• 식당 등급 또는 요리 대결 검토",
    { left: 687, top: 380, width: 520, height: 220 },
    22,
    { color: C.muted },
  );
  addNotes(slide);
}

// 4. Return to the two-column hierarchy with a different title/claim silhouette.
{
  const slide = deck.slides.add();
  slide.background.fill = C.bg;
  addSlideTitle(slide, "반복 루프에는 변화와 개연성이 필요합니다", 4);
  addProblemColumn(
    slide,
    5,
    "반복 플레이가 지루해질 수 있음",
    [
      "성장 루프는 명확하지만 동일 패턴이 계속 반복됨",
      "확장·돌발 이벤트로 루프 안팎의 변수 추가",
      "대기 시간 개입은 선택형으로 설계해 터치 피로 방지",
    ],
    42,
    190,
    555,
    410,
  );
  slide.shapes.add({
    geometry: "rect",
    name: "center-rule-4",
    position: { left: 630, top: 188, width: 2, height: 414 },
    fill: C.soft,
    line: { style: "solid", fill: C.soft, width: 0 },
  });
  addProblemColumn(
    slide,
    6,
    "재료 획득 설정의 근거가 약함",
    [
      "손님 병아리가 재료를 두고 가는 이유가 불분명함",
      "캐릭터 외형·설정과 고유 재료를 연결",
      "드롭 빈도를 낮춰 화면 혼잡과 희소성을 함께 개선",
    ],
    670,
    190,
    568,
    410,
  );
  addNotes(slide);
}

// 5. Codex Grid slide 13 hierarchy: four-point 2×2 flat grid.
{
  const slide = deck.slides.add();
  slide.background.fill = C.bg;
  addSlideTitle(slide, "내일 회의에서는 네 가지를 먼저 합의합니다", 5);
  const items = [
    ["01", "레시피 획득", "발견 방식 · 연출 · 히든 조건"],
    ["02", "카페 정체성", "꾸미기 vs 케이크 연구"],
    ["03", "구조 정리", "직원 · 설비 · 가구 축소 범위"],
    ["04", "성장 목표", "승급 · 구역 · 시각적 보상"],
  ];
  const positions = [
    [42, 205],
    [657, 205],
    [42, 420],
    [657, 420],
  ];
  items.forEach(([n, title, body], i) => {
    const [x, y] = positions[i];
    addText(
      slide,
      `priority-${n}`,
      n,
      { left: x, top: y, width: 74, height: 46 },
      28,
      { bold: true, color: C.yellow },
    );
    addText(
      slide,
      `priority-${n}-title`,
      title,
      { left: x + 82, top: y - 3, width: 470, height: 54 },
      30,
      { bold: true },
    );
    addText(
      slide,
      `priority-${n}-body`,
      body,
      { left: x + 82, top: y + 60, width: 470, height: 60 },
      22,
      { color: C.muted },
    );
  });
  addText(
    slide,
    "meeting-note",
    "바로 확정하기보다 각 항목의 선택지를 확인하고, 후속 정리 기준을 만드는 회의",
    { left: 42, top: 622, width: 1100, height: 38 },
    20,
    { color: C.muted },
  );
  addNotes(slide);
}

await fs.mkdir(RENDER_DIR, { recursive: true });
for (const [index, slide] of deck.slides.items.entries()) {
  const png = await deck.export({ slide, format: "png", scale: 1.5 });
  const path = `${RENDER_DIR}/slide-${String(index + 1).padStart(2, "0")}.png`;
  await fs.writeFile(path, new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(
    `${RENDER_DIR}/slide-${String(index + 1).padStart(2, "0")}.layout.json`,
    await layout.text(),
  );
}

const montage = await deck.export({ format: "webp", montage: true, scale: 1 });
await fs.writeFile(
  `${RENDER_DIR}/montage.webp`,
  new Uint8Array(await montage.arrayBuffer()),
);

const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(OUT);

