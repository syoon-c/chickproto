import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

if (html.includes("promotion-gauge") || html.includes("promotion-fill")) {
  throw new Error("Promotion gauge markup still exists");
}

if (!/function promotionThreshold\(\)\s*\{\s*return 1;\s*\}/.test(game)) {
  throw new Error("Promotion threshold is not fixed to one click");
}

const promoteBlock = game.match(/function promote\(\)\s*\{([\s\S]*?)\r?\n\}\r?\n\r?\nfunction chooseCustomer/);
if (!promoteBlock) throw new Error("Could not locate promote()");

if (!promoteBlock[1].includes("state.promotion.queued += 1;")) {
  throw new Error("A promotion click does not add exactly one queued guest");
}
if (!promoteBlock[1].includes("trySpawnQueuedGuest();")) {
  throw new Error("Promotion does not immediately try to spawn the queued guest");
}
if (promoteBlock[1].includes("state.promotion.progress += 1")) {
  throw new Error("Legacy multi-click promotion progress still exists");
}

console.log("SINGLE_CLICK_PROMOTION_OK threshold=1 gauge=removed queuedPerClick=1");
