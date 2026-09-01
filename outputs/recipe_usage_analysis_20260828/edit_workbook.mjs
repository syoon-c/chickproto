import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const dir = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(dir, "source.xlsx");
const outputPath = path.join(dir, "프로토타입_레시피리스트.xlsx");
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const recipeSheet = workbook.worksheets.getItem("레시피 목록");
const recipeRows = recipeSheet.getRange("C5:I55").values;

const ingredientUsage = new Map();
for (const row of recipeRows) {
  const recipeName = String(row[0] || "").trim();
  if (!recipeName) continue;
  const ingredients = row.slice(2).map((value) => String(value || "").trim()).filter(Boolean);
  const distinct = new Set(ingredients);
  for (const ingredient of ingredients) {
    if (ingredient === "물") continue;
    const entry = ingredientUsage.get(ingredient) || { ingredient, recipeCount: 0, slotCount: 0, recipes: [] };
    entry.slotCount += 1;
    ingredientUsage.set(ingredient, entry);
  }
  for (const ingredient of distinct) {
    if (ingredient === "물") continue;
    const entry = ingredientUsage.get(ingredient);
    entry.recipeCount += 1;
    entry.recipes.push(recipeName);
  }
}

const usageRows = [...ingredientUsage.values()].sort((a, b) =>
  b.recipeCount - a.recipeCount || b.slotCount - a.slotCount || a.ingredient.localeCompare(b.ingredient, "ko"));
const highestRecipeCount = Math.max(...usageRows.map((row) => row.recipeCount));
const lowestRecipeCount = Math.min(...usageRows.map((row) => row.recipeCount));
const highest = usageRows.filter((row) => row.recipeCount === highestRecipeCount);
const lowest = usageRows.filter((row) => row.recipeCount === lowestRecipeCount);
const highestLabel = `${highest.map((row) => row.ingredient).join(", ")} · ${highestRecipeCount}개 레시피`;
const lowestLabel = `${lowest.map((row) => row.ingredient).join(", ")} · 각 ${lowestRecipeCount}개 레시피`;

const analysisSheet = workbook.worksheets.add("재료 사용 분석");
analysisSheet.showGridLines = false;
analysisSheet.freezePanes.freezeRows(10);
analysisSheet.mergeCells("A1:F1");
analysisSheet.mergeCells("A2:F2");
analysisSheet.getRange("A1").values = [["재료 사용 분석"]];
analysisSheet.getRange("A2").values = [[`물 제외 · ${usageRows.length}종 · 현재 레시피 ${recipeRows.filter((row) => row[0]).length}개 기준`]];
analysisSheet.getRange("A1:F1").format = {
  fill: "#6F8A3B",
  font: { bold: true, color: "#FFFFFF", size: 18 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
analysisSheet.getRange("A2:F2").format = {
  fill: "#EDF3D5",
  font: { color: "#52632D", size: 10 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
analysisSheet.getRange("A1:F1").format.rowHeight = 34;
analysisSheet.getRange("A2:F2").format.rowHeight = 22;

analysisSheet.mergeCells("A4:C4");
analysisSheet.mergeCells("A5:C6");
analysisSheet.mergeCells("D4:F4");
analysisSheet.mergeCells("D5:F6");
analysisSheet.getRange("A4").values = [["가장 많이 사용"]];
analysisSheet.getRange("A5").values = [[highestLabel]];
analysisSheet.getRange("D4").values = [["가장 적게 사용"]];
analysisSheet.getRange("D5").values = [[lowestLabel]];
analysisSheet.getRange("A4:C4").format = {
  fill: "#5E7C2E",
  font: { bold: true, color: "#FFFFFF", size: 11 },
  horizontalAlignment: "center",
};
analysisSheet.getRange("A5:C6").format = {
  fill: "#E8F2CF",
  font: { bold: true, color: "#40551D", size: 13 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "outside", style: "medium", color: "#8AA557" },
};
analysisSheet.getRange("D4:F4").format = {
  fill: "#A47D47",
  font: { bold: true, color: "#FFFFFF", size: 11 },
  horizontalAlignment: "center",
};
analysisSheet.getRange("D5:F6").format = {
  fill: "#F4E8D4",
  font: { bold: true, color: "#6A4A28", size: 11 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "outside", style: "medium", color: "#C69A62" },
};
analysisSheet.getRange("A5:F6").format.rowHeight = 27;

analysisSheet.mergeCells("A8:F8");
analysisSheet.getRange("A8").values = [["사용 레시피 수는 같은 요리에 중복된 재료를 1회로 계산하며, 총 투입 슬롯은 중복 수량까지 포함합니다."]];
analysisSheet.getRange("A8:F8").format = {
  fill: "#F5F2E8",
  font: { color: "#6D664F", size: 9 },
  horizontalAlignment: "left",
  verticalAlignment: "center",
};

analysisSheet.getRange("A10:F10").values = [["순위", "재료", "사용 레시피 수", "총 투입 슬롯", "레시피 사용률", "사용 레시피"]];
const dataStartRow = 11;
const dataEndRow = dataStartRow + usageRows.length - 1;
analysisSheet.getRange(`A${dataStartRow}:F${dataEndRow}`).values = usageRows.map((row, index) => [
  index + 1,
  row.ingredient,
  row.recipeCount,
  row.slotCount,
  null,
  row.recipes.join(", "),
]);
analysisSheet.getRange(`E${dataStartRow}`).formulas = [[`=C${dataStartRow}/COUNTA('레시피 목록'!$C$5:$C$55)`]];
analysisSheet.getRange(`E${dataStartRow}:E${dataEndRow}`).fillDown();

const usageTable = analysisSheet.tables.add(`A10:F${dataEndRow}`, true, "IngredientUsageAnalysis");
usageTable.style = "TableStyleMedium4";
usageTable.showFilterButton = true;
analysisSheet.getRange(`A${dataStartRow}:A${dataEndRow}`).format.horizontalAlignment = "center";
analysisSheet.getRange(`C${dataStartRow}:E${dataEndRow}`).format.horizontalAlignment = "right";
analysisSheet.getRange(`E${dataStartRow}:E${dataEndRow}`).format.numberFormat = "0.0%";
analysisSheet.getRange(`F${dataStartRow}:F${dataEndRow}`).format.wrapText = true;
analysisSheet.getRange(`A${dataStartRow}:F${dataEndRow}`).format.verticalAlignment = "center";
analysisSheet.getRange(`A${dataStartRow}:F${dataEndRow}`).format.rowHeight = 32;
analysisSheet.getRange(`C${dataStartRow}:D${dataEndRow}`).conditionalFormats.add("dataBar", {
  color: "#8DBB4C",
  gradient: true,
});

const widths = { A: 8, B: 16, C: 16, D: 15, E: 15, F: 72 };
for (const [column, width] of Object.entries(widths)) {
  analysisSheet.getRange(`${column}:${column}`).format.columnWidth = width;
}

const check = await workbook.inspect({
  kind: "table",
  range: `재료 사용 분석!A1:F${Math.min(dataEndRow, 25)}`,
  include: "values,formulas",
  tableMaxRows: 25,
  tableMaxCols: 6,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 200 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

for (const sheetName of ["레시피 목록", "설정", "재료 사용 분석"]) {
  const image = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(dir, `after-${sheetName}.png`), new Uint8Array(await image.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
await fs.writeFile(path.join(dir, "analysis.json"), JSON.stringify({
  recipeCount: recipeRows.filter((row) => row[0]).length,
  ingredientCount: usageRows.length,
  highest: highest.map(({ ingredient, recipeCount, slotCount }) => ({ ingredient, recipeCount, slotCount })),
  lowest: lowest.map(({ ingredient, recipeCount, slotCount }) => ({ ingredient, recipeCount, slotCount })),
  rows: usageRows,
}, null, 2));
console.log(`INGREDIENT_USAGE_WORKBOOK_OK recipes=${recipeRows.filter((row) => row[0]).length} ingredients=${usageRows.length} top=${highestLabel} low=${lowest.length}`);
