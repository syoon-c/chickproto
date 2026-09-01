import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const dir = path.dirname(fileURLToPath(import.meta.url));
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(dir, "source.xlsx")));
const summary = await workbook.inspect({
  kind: "workbook,sheet,table,computedStyle",
  sheetId: "레시피 목록",
  range: "A1:N12",
  maxChars: 9000,
  tableMaxRows: 12,
  tableMaxCols: 14,
});
console.log(summary.ndjson);
for (const sheetName of ["레시피 목록", "설정"]) {
  const image = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(dir, `before-${sheetName}.png`), new Uint8Array(await image.arrayBuffer()));
}
