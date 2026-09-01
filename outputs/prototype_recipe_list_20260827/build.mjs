import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(outputDir, "..", "..");
const configSource = await fs.readFile(path.join(projectRoot, "src", "game-config.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(configSource, context, { filename: "src/game-config.js" });

const { RECIPE_PROGRESSION } = context.window.CHICK_CONFIG;
const recipes = RECIPE_PROGRESSION.map((route, index) => {
  const ingredients = route.ingredientRequirements.map((ingredient) => ingredient.name);
  const actualPrice = route.hasPrototypePriceOverride
    ? Number(route.foodPrice)
    : Math.max(Number(route.foodPrice), Number(route.minimumFoodPrice || 0));
  return {
    order: index + 1,
    id: Number(route.recipeId),
    name: route.recipeName,
    ingredients,
    combination: ingredients.join(" + "),
    price: actualPrice,
    iconRecipeId: Number(route.baseRecipeId),
  };
});

const workbook = Workbook.create();
const recipeSheet = workbook.worksheets.add("레시피 목록");
const settingsSheet = workbook.worksheets.add("설정");

recipeSheet.showGridLines = false;
recipeSheet.freezePanes.freezeRows(4);
recipeSheet.mergeCells("A1:N1");
recipeSheet.mergeCells("A2:N2");
recipeSheet.getRange("A1").values = [["프로토타입 레시피 리스트"]];
recipeSheet.getRange("A2").values = [[`현재 프로토타입 적용 기준 · 총 ${recipes.length}종 · 2026-08-27`]];
recipeSheet.getRange("A1:N1").format = {
  fill: "#6F8A3B",
  font: { bold: true, color: "#FFFFFF", size: 18 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
recipeSheet.getRange("A2:N2").format = {
  fill: "#EDF3D5",
  font: { color: "#52632D", size: 10 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
recipeSheet.getRange("A1:N1").format.rowHeight = 34;
recipeSheet.getRange("A2:N2").format.rowHeight = 22;

const headers = [[
  "순서", "레시피 ID", "요리명", "재료 수", "재료 1", "재료 2", "재료 3", "재료 4", "재료 5",
  "조합", "기본 판매가(원)", "기본 조리시간(초)", "Lv.2 판매가(원)", "아이콘 기준 ID",
]];
recipeSheet.getRange("A4:N4").values = headers;
const rows = recipes.map((recipe) => [
  recipe.order,
  recipe.id,
  recipe.name,
  recipe.ingredients.length,
  recipe.ingredients[0] || "",
  recipe.ingredients[1] || "",
  recipe.ingredients[2] || "",
  recipe.ingredients[3] || "",
  recipe.ingredients[4] || "",
  recipe.combination,
  recipe.price,
  null,
  null,
  recipe.iconRecipeId,
]);
recipeSheet.getRange(`A5:N${recipes.length + 4}`).values = rows;
recipeSheet.getRange("L5").formulas = [["=MAX('설정'!$B$6,MIN('설정'!$B$7,ROUND((K5/'설정'!$B$5+'설정'!$B$4)/'설정'!$B$8,0)*'설정'!$B$8))"]];
recipeSheet.getRange(`L5:L${recipes.length + 4}`).fillDown();
recipeSheet.getRange("M5").formulas = [["=ROUND(K5*(1+'설정'!$B$9),0)"]];
recipeSheet.getRange(`M5:M${recipes.length + 4}`).fillDown();

const table = recipeSheet.tables.add(`A4:N${recipes.length + 4}`, true, "PrototypeRecipes");
table.style = "TableStyleMedium4";
table.showBandedColumns = false;
table.showFilterButton = true;

recipeSheet.getRange(`A5:B${recipes.length + 4}`).format.horizontalAlignment = "center";
recipeSheet.getRange(`D5:I${recipes.length + 4}`).format.horizontalAlignment = "center";
recipeSheet.getRange(`K5:N${recipes.length + 4}`).format.horizontalAlignment = "right";
recipeSheet.getRange(`A4:N${recipes.length + 4}`).format.verticalAlignment = "center";
recipeSheet.getRange(`A4:N${recipes.length + 4}`).format.wrapText = false;
recipeSheet.getRange(`K5:K${recipes.length + 4}`).format.numberFormat = "#,##0\"원\"";
recipeSheet.getRange(`L5:L${recipes.length + 4}`).format.numberFormat = "0.0\"초\"";
recipeSheet.getRange(`M5:M${recipes.length + 4}`).format.numberFormat = "#,##0\"원\"";
recipeSheet.getRange(`A5:N${recipes.length + 4}`).format.rowHeight = 21;

const widths = {
  A: 7, B: 10, C: 24, D: 8, E: 13, F: 13, G: 13, H: 13, I: 13,
  J: 44, K: 15, L: 17, M: 15, N: 13,
};
for (const [column, width] of Object.entries(widths)) {
  recipeSheet.getRange(`${column}:${column}`).format.columnWidth = width;
}

settingsSheet.showGridLines = false;
settingsSheet.mergeCells("A1:C1");
settingsSheet.getRange("A1").values = [["프로토타입 계산 설정"]];
settingsSheet.getRange("A1:C1").format = {
  fill: "#8B6A43",
  font: { bold: true, color: "#FFFFFF", size: 15 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
settingsSheet.getRange("A3:C8").values = [
  ["항목", "값", "설명"],
  ["조리 기본시간", 2, "판매가 비례 시간에 더하는 초"],
  ["초당 가격", 20, "판매가 20원마다 조리시간 1초"],
  ["최소 조리시간", 4, "초"],
  ["최대 조리시간", 24, "초"],
  ["조리시간 단위", 0.5, "0.5초 단위 반올림"],
];
settingsSheet.getRange("A9:C9").values = [["레벨업 가격 상승률", 0.1, "레벨당 10%"]];
settingsSheet.getRange("A3:C9").format.borders = { preset: "inside", style: "thin", color: "#D8CCB9" };
settingsSheet.getRange("A3:C3").format = {
  fill: "#E9D9BC",
  font: { bold: true, color: "#5B4026" },
  horizontalAlignment: "center",
};
settingsSheet.getRange("B4:B8").format.numberFormat = "0.0";
settingsSheet.getRange("B9").format.numberFormat = "0%";
settingsSheet.getRange("A4:A9").format.font = { bold: true, color: "#6A5139" };
settingsSheet.getRange("A1:C1").format.rowHeight = 30;
settingsSheet.getRange("A:A").format.columnWidth = 22;
settingsSheet.getRange("B:B").format.columnWidth = 12;
settingsSheet.getRange("C:C").format.columnWidth = 38;
settingsSheet.freezePanes.freezeRows(3);

const inspection = await workbook.inspect({
  kind: "table",
  range: `레시피 목록!A1:N12`,
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 14,
});
console.log(inspection.ndjson);
const formulaErrors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(formulaErrors.ndjson);

for (const sheetName of ["레시피 목록", "설정"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(outputDir, `${sheetName}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path.join(outputDir, "프로토타입_레시피리스트.xlsx"));
console.log(`RECIPE_WORKBOOK_OK recipes=${recipes.length}`);
