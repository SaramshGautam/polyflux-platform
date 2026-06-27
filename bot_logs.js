/**
 * Export Firestore bot_logs -> analysis-ready CSVs + JSON dump
 *
 * ✅ Writes:
 *  1) bot_logs_data.csv        (one row per bot log)
 *  2) bot_logs_timeline.csv    (chronological view)
 *  3) bot_logs_summary.csv     (counts by event/role/user/variant)
 *  4) bot_logs_messages.csv    (only send_message-like rows with text)
 *  5) ./bot_logs_dump/*.json   (one JSON per log doc)
 *
 * How to run:
 *   - Save as: export_bot_logs.mjs
 *   - Run: node export_bot_logs.mjs
 *
 * Notes:
 *  - Works with your schema from screenshot:
 *      appUserId, canvasId, clientTs, createdAt, event, firebaseUid,
 *      meta.href, payload(hasImages/hasTexts/targetsCount/text), role, sessionId, variant
 */

import admin from "firebase-admin";
import fs from "fs";
import path from "path";

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "creative-assistant-j",
});

const db = admin.firestore();

// ---------------------------
// CONFIG (edit these)
// ---------------------------
const CONDITION = "ConditionC2";
const TEAM = "TeamG";
const CLASSROOM = "Eval3333";

// Output folder
const outDir = "./bot_logs_dump/GroupG";

// Collection reference
const botLogsRef = db
  .collection("classrooms")
  .doc(CLASSROOM)
  .collection("Projects")
  .doc(CONDITION)
  .collection("teams")
  .doc(TEAM)
  .collection("bot_logs");

// ---------------------------
// Helpers
// ---------------------------
fs.mkdirSync(outDir, { recursive: true });

function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toSec(ts) {
  if (!ts) return "";
  // Firestore Timestamp
  if (ts._seconds) return ts._seconds;
  if (ts.seconds) return ts.seconds;
  if (typeof ts.toDate === "function")
    return Math.floor(ts.toDate().getTime() / 1000);
  // numeric seconds
  if (typeof ts === "number") {
    // if it's milliseconds, convert
    if (ts > 10_000_000_000) return Math.floor(ts / 1000);
    return ts;
  }
  return "";
}

function toISOFromSec(sec) {
  if (sec === "" || sec === null || sec === undefined) return "";
  const n = Number(sec);
  if (!Number.isFinite(n)) return "";
  return new Date(n * 1000).toISOString();
}

function toISO(ts) {
  const sec = toSec(ts);
  return sec === "" ? "" : toISOFromSec(sec);
}

// safe nested getter
function get(obj, dottedPath, fallback = "") {
  return (
    dottedPath.split(".").reduce((cur, key) => cur?.[key], obj) ?? fallback
  );
}

function asInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function isSendMessageEvent(eventName) {
  const e = (eventName || "").toLowerCase();
  return (
    e.includes("send_message") ||
    e.includes("sendmessage") ||
    e.includes("bot_message") ||
    e.includes("assistant_message") ||
    e.includes("chat_message")
  );
}

// ---------------------------
// MAIN
// ---------------------------
const snap = await botLogsRef.get();
console.log(`Found ${snap.size} bot_logs documents`);
if (snap.empty) {
  console.log("⚠️ No bot logs found. Exiting.");
  process.exit(0);
}

// ---------------------------
// 1) bot_logs_data.csv (one row per log doc)
// ---------------------------
const dataHeaders = [
  "condition",
  "team",
  "logId",

  "createdAtISO",
  "createdAtSec",

  "clientTsMs",
  "clientTsISO",

  "event",
  "appUserId",
  "firebaseUid",
  "canvasId",
  "href",

  "role",
  "variant",
  "sessionId",

  "payload_text",
  "payload_hasImages",
  "payload_hasTexts",
  "payload_targetsCount",

  "payload_json", // full payload (stringified)
];

const dataRows = [dataHeaders.join(",")];

// We'll also build a timeline list for a dedicated timeline csv
const timeline = [];

// Summary counters
const stats = {
  total: snap.size,
  byEvent: {},
  byRole: {},
  byVariant: {},
  byUser: {},
  bySession: {},
  sendMessageCount: 0,
  hasTextCount: 0,
  hasImagesCount: 0,
};

for (const doc of snap.docs) {
  const data = doc.data();

  // Save individual JSON
  const jsonPath = path.join(outDir, `${doc.id}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");

  const createdAtSec = toSec(data.createdAt);
  const createdAtISO = toISOFromSec(createdAtSec);

  const clientTsMs = data.clientTs ?? ""; // in screenshot it looks like ms number
  const clientTsSec = toSec(clientTsMs); // converts ms->sec if needed
  const clientTsISO = clientTsSec !== "" ? toISOFromSec(clientTsSec) : "";

  const event = data.event || "";
  const appUserId = data.appUserId || "";
  const firebaseUid = data.firebaseUid || "";
  const canvasId = data.canvasId || "";
  const href = get(data, "meta.href", "");

  const role = data.role || "";
  const variant = data.variant || "";
  const sessionId = data.sessionId || "";

  const payloadText = get(data, "payload.text", "");
  const payloadHasImages = asInt(get(data, "payload.hasImages", 0), 0);
  const payloadHasTexts = asInt(get(data, "payload.hasTexts", 0), 0);
  const payloadTargetsCount = asInt(get(data, "payload.targetsCount", 0), 0);

  const payloadObj = data.payload ?? {};
  let payloadJson = "";
  try {
    payloadJson = JSON.stringify(payloadObj);
  } catch {
    payloadJson = "";
  }

  // --- add to main csv ---
  const row = [
    CONDITION,
    TEAM,
    doc.id,

    createdAtISO,
    createdAtSec,

    clientTsMs,
    clientTsISO,

    event,
    appUserId,
    firebaseUid,
    canvasId,
    href,

    role,
    variant,
    sessionId,

    payloadText,
    payloadHasImages,
    payloadHasTexts,
    payloadTargetsCount,

    payloadJson,
  ].map(escapeCSV);

  dataRows.push(row.join(","));

  // --- timeline event ---
  // choose best timestamp: createdAtSec if present else clientTsSec
  const sortSec =
    createdAtSec !== ""
      ? Number(createdAtSec)
      : clientTsSec !== ""
      ? Number(clientTsSec)
      : 0;

  timeline.push({
    sortSec,
    timestampISO: sortSec ? toISOFromSec(sortSec) : "",
    logId: doc.id,
    event,
    appUserId,
    role,
    variant,
    sessionId,
    textPreview: (payloadText || "").slice(0, 120),
    hasImages: payloadHasImages,
    hasTexts: payloadHasTexts,
    targetsCount: payloadTargetsCount,
  });

  // --- stats ---
  stats.byEvent[event || "unknown"] =
    (stats.byEvent[event || "unknown"] || 0) + 1;
  stats.byRole[role || "unknown"] = (stats.byRole[role || "unknown"] || 0) + 1;
  stats.byVariant[variant || "unknown"] =
    (stats.byVariant[variant || "unknown"] || 0) + 1;
  stats.byUser[appUserId || "unknown"] =
    (stats.byUser[appUserId || "unknown"] || 0) + 1;
  stats.bySession[sessionId || "unknown"] =
    (stats.bySession[sessionId || "unknown"] || 0) + 1;

  if (isSendMessageEvent(event)) stats.sendMessageCount++;
  if ((payloadText || "").trim().length > 0) stats.hasTextCount++;
  if (payloadHasImages > 0) stats.hasImagesCount++;
}

// Write main CSV
const dataCsvPath = path.join(outDir, "bot_logs_data.csv");
fs.writeFileSync(dataCsvPath, dataRows.join("\n"), "utf8");
console.log(`✅ CSV created: ${dataCsvPath}`);

// ---------------------------
// 2) bot_logs_timeline.csv
// ---------------------------
timeline.sort((a, b) => a.sortSec - b.sortSec);

const timelineHeaders = [
  "condition",
  "team",
  "timestampISO",
  "timestampSec",
  "logId",
  "event",
  "appUserId",
  "role",
  "variant",
  "sessionId",
  "hasImages",
  "hasTexts",
  "targetsCount",
  "textPreview",
];

const timelineRows = [timelineHeaders.join(",")];

for (const e of timeline) {
  timelineRows.push(
    [
      CONDITION,
      TEAM,
      e.timestampISO,
      e.sortSec,
      e.logId,
      e.event,
      e.appUserId,
      e.role,
      e.variant,
      e.sessionId,
      e.hasImages,
      e.hasTexts,
      e.targetsCount,
      e.textPreview,
    ]
      .map(escapeCSV)
      .join(",")
  );
}

const timelineCsvPath = path.join(outDir, "bot_logs_timeline.csv");
fs.writeFileSync(timelineCsvPath, timelineRows.join("\n"), "utf8");
console.log(`✅ Timeline CSV created: ${timelineCsvPath}`);

// ---------------------------
// 3) bot_logs_messages.csv (send_message-like only)
// ---------------------------
const msgHeaders = [
  "condition",
  "team",
  "timestampISO",
  "timestampSec",
  "logId",
  "event",
  "appUserId",
  "role",
  "variant",
  "sessionId",
  "text",
  "hasImages",
  "hasTexts",
  "targetsCount",
  "href",
];

const msgRows = [msgHeaders.join(",")];

for (const doc of snap.docs) {
  const data = doc.data();
  const event = data.event || "";
  if (!isSendMessageEvent(event)) continue;

  const createdAtSec = toSec(data.createdAt);
  const createdAtISO = toISOFromSec(createdAtSec);

  const payloadText = get(data, "payload.text", "");
  const payloadHasImages = asInt(get(data, "payload.hasImages", 0), 0);
  const payloadHasTexts = asInt(get(data, "payload.hasTexts", 0), 0);
  const payloadTargetsCount = asInt(get(data, "payload.targetsCount", 0), 0);

  msgRows.push(
    [
      CONDITION,
      TEAM,
      createdAtISO,
      createdAtSec,
      doc.id,
      event,
      data.appUserId || "",
      data.role || "",
      data.variant || "",
      data.sessionId || "",
      payloadText,
      payloadHasImages,
      payloadHasTexts,
      payloadTargetsCount,
      get(data, "meta.href", ""),
    ]
      .map(escapeCSV)
      .join(",")
  );
}

const msgCsvPath = path.join(outDir, "bot_logs_messages.csv");
fs.writeFileSync(msgCsvPath, msgRows.join("\n"), "utf8");
console.log(`✅ Messages CSV created: ${msgCsvPath}`);

// ---------------------------
// 4) bot_logs_summary.csv
// ---------------------------
const summaryLines = [];
summaryLines.push("Metric,Value");
summaryLines.push(`Condition,${escapeCSV(CONDITION)}`);
summaryLines.push(`Team,${escapeCSV(TEAM)}`);
summaryLines.push(`Total Logs,${stats.total}`);
summaryLines.push(`Send Message Events,${stats.sendMessageCount}`);
summaryLines.push(`Logs With Text,${stats.hasTextCount}`);
summaryLines.push(`Logs With Images,${stats.hasImagesCount}`);
summaryLines.push("");

summaryLines.push("Event,Count");
for (const [k, v] of Object.entries(stats.byEvent).sort(
  (a, b) => b[1] - a[1]
)) {
  summaryLines.push(`${escapeCSV(k)},${v}`);
}
summaryLines.push("");

summaryLines.push("Role,Count");
for (const [k, v] of Object.entries(stats.byRole).sort((a, b) => b[1] - a[1])) {
  summaryLines.push(`${escapeCSV(k)},${v}`);
}
summaryLines.push("");

summaryLines.push("Variant,Count");
for (const [k, v] of Object.entries(stats.byVariant).sort(
  (a, b) => b[1] - a[1]
)) {
  summaryLines.push(`${escapeCSV(k)},${v}`);
}
summaryLines.push("");

summaryLines.push("AppUserId,Count");
for (const [k, v] of Object.entries(stats.byUser).sort((a, b) => b[1] - a[1])) {
  summaryLines.push(`${escapeCSV(k)},${v}`);
}
summaryLines.push("");

summaryLines.push("SessionId,Count");
for (const [k, v] of Object.entries(stats.bySession).sort(
  (a, b) => b[1] - a[1]
)) {
  summaryLines.push(`${escapeCSV(k)},${v}`);
}

const summaryCsvPath = path.join(outDir, "bot_logs_summary.csv");
fs.writeFileSync(summaryCsvPath, summaryLines.join("\n"), "utf8");
console.log(`✅ Summary CSV created: ${summaryCsvPath}`);

// ---------------------------
// DONE
// ---------------------------
console.log("\n" + "=".repeat(60));
console.log("📊 BOT LOGS EXPORT COMPLETE");
console.log("=".repeat(60));
console.log(`Output folder: ${path.resolve(outDir)}`);
console.log("Files created:");
console.log("  1) bot_logs_data.csv");
console.log("  2) bot_logs_timeline.csv");
console.log("  3) bot_logs_summary.csv");
console.log("  4) bot_logs_messages.csv");
console.log("  5) *.json (one per log)");
console.log("=".repeat(60));
