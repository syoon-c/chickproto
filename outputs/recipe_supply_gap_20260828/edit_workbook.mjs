import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const dir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dir, "..", "..");
const sourcePath = path.join(dir, "source.xlsx");
const outputPath = path.join(dir, "프로토타입_레시피리스트.xlsx");
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));

const configContext = { window: {} };
vm.runInNewContext(await fs.readFile(path.join(projectRoot, "src", "game-config.js"), "utf8"), configContext, {
  filename: "src/game-config.js",
});
const { CORE_PROGRESSION, THEME_NAMES } = configContext.window.CHICK_CONFIG;

const recipeSheet = workbook.worksheets.getItem("레시피 목록");
const recipeRows = recipeSheet.getRange("C5:I55").values;
const demand = new Map();
for (const row of recipeRows) {
  const recipeName = String(row[0] || "").trim();
  if (!recipeName) continue;
  const ingredients = row.slice(2).map((value) => String(value || "").trim()).filter(Boolean);
  const distinct = new Set(ingredients);
  for (const ingredient of ingredients) {
    if (ingredient === "물") continue;
    const entry = demand.get(ingredient) || { recipeCount: 0, slots: 0, recipes: [] };
    entry.slots += 1;
    demand.set(ingredient, entry);
  }
  for (const ingredient of distinct) {
    if (ingredient === "물") continue;
    const entry = demand.get(ingredient);
    entry.recipeCount += 1;
    entry.recipes.push(recipeName);
  }
}

const supply = new Map();
for (const chick of CORE_PROGRESSION) {
  chick.rewardIngredients.forEach((ingredient, index) => {
    const isSingle = chick.rewardIngredients.length === 1;
    const chance = isSingle ? 1 : index === 0 ? 0.7 : 0.3;
    const entry = supply.get(ingredient.name) || {
      baseOrSingleCount: 0,
      specialCount: 0,
      strength: 0,
      firstThemeId: Number.POSITIVE_INFINITY,
      sources: [],
    };
    if (isSingle || index === 0) entry.baseOrSingleCount += 1;
    else entry.specialCount += 1;
    entry.strength += chance;
    entry.firstThemeId = Math.min(entry.firstThemeId, Number(chick.themeId));
    entry.sources.push({
      themeId: Number(chick.themeId),
      themeName: THEME_NAMES[chick.themeId] || `테마 ${chick.themeId}`,
      chickName: chick.customerName,
      chance,
      slotLabel: isSingle ? "단일 100%" : index === 0 ? "기본 70%" : "특별 30%",
    });
    supply.set(ingredient.name, entry);
  });
}

function classify(slots, strength) {
  if (slots > 0 && strength <= 0) return "획득 경로 없음";
  if (slots <= 0 && strength > 0) return "레시피 미사용";
  const burden = slots / strength;
  if (burden >= 5) return "매우 부족";
  if (burden >= 3) return "부족";
  if (burden >= 1.5) return "보통";
  return "여유";
}

const statusOrder = { "획득 경로 없음": 0, "매우 부족": 1, "부족": 2, "레시피 미사용": 3, "보통": 4, "여유": 5 };
const comparison = [...new Set([...demand.keys(), ...supply.keys()])].map((ingredient) => {
  const demandEntry = demand.get(ingredient) || { recipeCount: 0, slots: 0, recipes: [] };
  const supplyEntry = supply.get(ingredient) || {
    baseOrSingleCount: 0, specialCount: 0, strength: 0, firstThemeId: Number.POSITIVE_INFINITY, sources: [],
  };
  const burden = supplyEntry.strength > 0 ? demandEntry.slots / supplyEntry.strength : null;
  const status = classify(demandEntry.slots, supplyEntry.strength);
  const recommendation = status === "획득 경로 없음" ? "드랍 경로 추가"
    : status === "매우 부족" ? "기본 70% 드랍 경로 추가"
      : status === "부족" ? "중복 드랍 경로 검토"
        : status === "레시피 미사용" ? "레시피 추가 또는 드랍 재배치"
          : "유지";
  return {
    ingredient,
    status,
    recommendation,
    burden,
    ...demandEntry,
    ...supplyEntry,
    firstThemeName: Number.isFinite(supplyEntry.firstThemeId) ? THEME_NAMES[supplyEntry.firstThemeId] : "",
    sourceText: supplyEntry.sources
      .sort((a, b) => a.themeId - b.themeId || b.chance - a.chance || a.chickName.localeCompare(b.chickName, "ko"))
      .map((source) => `${source.themeName}·${source.chickName}(${source.slotLabel})`)
      .join(", "),
  };
}).sort((a, b) => statusOrder[a.status] - statusOrder[b.status]
  || (b.burden ?? -1) - (a.burden ?? -1)
  || b.strength - a.strength
  || a.ingredient.localeCompare(b.ingredient, "ko"));

const unused = comparison.filter((row) => row.status === "레시피 미사용");
const missing = comparison.filter((row) => row.status === "획득 경로 없음");
const short = comparison.filter((row) => row.status === "매우 부족" || row.status === "부족");
const topBurdenValue = Math.max(...comparison.filter((row) => row.burden != null).map((row) => row.burden));
const topBurden = comparison.filter((row) => row.burden === topBurdenValue);

const sheet = workbook.worksheets.add("수급 대비 분석");
sheet.showGridLines = false;
sheet.freezePanes.freezeRows(10);
sheet.mergeCells("A1:L1");
sheet.mergeCells("A2:L2");
sheet.getRange("A1").values = [["병아리 드랍 · 레시피 수급 분석"]];
sheet.getRange("A2").values = [[`물 제외 · 병아리 ${CORE_PROGRESSION.length}마리 · 레시피 ${recipeRows.filter((row) => row[0]).length}개 기준`]];
sheet.getRange("A1:L1").format = {
  fill: "#6F8A3B",
  font: { bold: true, color: "#FFFFFF", size: 18 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sheet.getRange("A2:L2").format = {
  fill: "#EDF3D5",
  font: { color: "#52632D", size: 10 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sheet.getRange("A1:L1").format.rowHeight = 34;
sheet.getRange("A2:L2").format.rowHeight = 22;

const cardRanges = [
  { header: "A4:D4", body: "A5:D6", title: "레시피 미사용", value: `${unused.length}종 · ${unused.slice(0, 5).map((row) => row.ingredient).join(", ")} 외`, color: "#A47D47", pale: "#F4E8D4", text: "#6A4A28" },
  { header: "E4:H4", body: "E5:H6", title: "획득 경로 없음", value: missing.length ? `${missing.length}종 · ${missing.map((row) => row.ingredient).join(", ")}` : "0종", color: "#B14C3F", pale: "#F7DDD7", text: "#743129" },
  { header: "I4:L4", body: "I5:L6", title: "수급 부담 상위", value: `${topBurden.map((row) => row.ingredient).join(", ")} · 지수 ${topBurdenValue.toFixed(1)}`, color: "#5E7C2E", pale: "#E8F2CF", text: "#40551D" },
];
for (const card of cardRanges) {
  sheet.mergeCells(card.header);
  sheet.mergeCells(card.body);
  sheet.getRange(card.header.split(":")[0]).values = [[card.title]];
  sheet.getRange(card.body.split(":")[0]).values = [[card.value]];
  sheet.getRange(card.header).format = {
    fill: card.color,
    font: { bold: true, color: "#FFFFFF", size: 11 },
    horizontalAlignment: "center",
  };
  sheet.getRange(card.body).format = {
    fill: card.pale,
    font: { bold: true, color: card.text, size: 11 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "outside", style: "medium", color: card.color },
  };
}
sheet.getRange("A5:L6").format.rowHeight = 27;

sheet.mergeCells("A8:L8");
sheet.getRange("A8").values = [["환산 공급력 = 단일 드랍 1.0 + 기본 70% 0.7 + 특별 30% 0.3 · 부담 지수 = 필요 슬롯 ÷ 환산 공급력 · 5 이상 매우 부족 / 3 이상 부족"]];
sheet.getRange("A8:L8").format = {
  fill: "#F5F2E8",
  font: { color: "#6D664F", size: 9 },
  horizontalAlignment: "left",
  verticalAlignment: "center",
};

sheet.getRange("A10:L10").values = [[
  "판정", "재료", "사용 레시피 수", "필요 슬롯", "기본·단일 병아리", "특별 병아리", "환산 공급력", "부담 지수",
  "첫 등장 테마", "드랍 병아리", "사용 레시피", "검토 방향",
]];
const startRow = 11;
const endRow = startRow + comparison.length - 1;
sheet.getRange(`A${startRow}:L${endRow}`).values = comparison.map((row) => [
  row.status,
  row.ingredient,
  row.recipeCount,
  row.slots,
  row.baseOrSingleCount,
  row.specialCount,
  Number(row.strength.toFixed(2)),
  null,
  row.firstThemeName,
  row.sourceText,
  row.recipes.join(", "),
  row.recommendation,
]);
sheet.getRange(`H${startRow}`).formulas = [[`=IF(OR(D${startRow}=0,G${startRow}=0),"",D${startRow}/G${startRow})`]];
sheet.getRange(`H${startRow}:H${endRow}`).fillDown();

const table = sheet.tables.add(`A10:L${endRow}`, true, "RecipeSupplyDemandAnalysis");
table.style = "TableStyleMedium4";
table.showFilterButton = true;
sheet.getRange(`C${startRow}:H${endRow}`).format.horizontalAlignment = "right";
sheet.getRange(`G${startRow}:H${endRow}`).format.numberFormat = "0.0";
sheet.getRange(`A${startRow}:L${endRow}`).format.verticalAlignment = "center";
sheet.getRange(`J${startRow}:K${endRow}`).format.wrapText = true;
sheet.getRange(`A${startRow}:L${endRow}`).format.rowHeight = 36;
sheet.getRange(`H${startRow}:H${endRow}`).conditionalFormats.add("dataBar", { color: "#D07B48", gradient: true });
sheet.getRange(`A${startRow}:A${endRow}`).conditionalFormats.add("containsText", { text: "획득 경로 없음", format: { fill: "#F4B7AD", font: { bold: true, color: "#7D231B" } } });
sheet.getRange(`A${startRow}:A${endRow}`).conditionalFormats.add("containsText", { text: "매우 부족", format: { fill: "#F7C9BE", font: { bold: true, color: "#8A2F23" } } });
sheet.getRange(`A${startRow}:A${endRow}`).conditionalFormats.add("containsText", { text: "부족", format: { fill: "#F6D9A8", font: { bold: true, color: "#744B18" } } });
sheet.getRange(`A${startRow}:A${endRow}`).conditionalFormats.add("containsText", { text: "레시피 미사용", format: { fill: "#F3E2C8", font: { bold: true, color: "#6A4A28" } } });
sheet.getRange(`A${startRow}:A${endRow}`).conditionalFormats.add("containsText", { text: "여유", format: { fill: "#DCEBC3", font: { bold: true, color: "#40551D" } } });

const widths = { A: 15, B: 15, C: 15, D: 12, E: 17, F: 13, G: 14, H: 12, I: 19, J: 64, K: 64, L: 25 };
for (const [column, width] of Object.entries(widths)) sheet.getRange(`${column}:${column}`).format.columnWidth = width;

const check = await workbook.inspect({
  kind: "table",
  range: `수급 대비 분석!A1:L${Math.min(endRow, 30)}`,
  include: "values,formulas",
  tableMaxRows: 30,
  tableMaxCols: 12,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

for (const sheetName of ["레시피 목록", "설정", "재료 사용 분석", "수급 대비 분석"]) {
  const image = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(dir, `after-${sheetName}.png`), new Uint8Array(await image.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
await fs.writeFile(path.join(dir, "supply-analysis.json"), JSON.stringify({
  recipeCount: recipeRows.filter((row) => row[0]).length,
  chickCount: CORE_PROGRESSION.length,
  comparisonCount: comparison.length,
  unusedCount: unused.length,
  missingCount: missing.length,
  shortageCount: short.length,
  topBurden: topBurden.map((row) => ({ ingredient: row.ingredient, burden: row.burden })),
  rows: comparison,
}, null, 2));
console.log(`SUPPLY_GAP_WORKBOOK_OK chicks=${CORE_PROGRESSION.length} recipes=${recipeRows.filter((row) => row[0]).length} unused=${unused.length} missing=${missing.length} shortage=${short.length} top=${topBurden.map((row) => row.ingredient).join("/")}`);
