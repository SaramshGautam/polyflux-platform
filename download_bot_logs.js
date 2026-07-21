import admin from "firebase-admin";
import fs from "fs";
import path from "path";

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "creative-assistant-j",
});

const db = admin.firestore();

// ---- Config ----
const CLASSROOM_ID = "Eval3333";
const PROJECT_ID = "ConditionC2";
const TEAM_IDS = [
  "TeamA",
  "TeamB",
  "TeamC",
  "TeamD",
  "TeamE",
  "TeamF",
  "TeamG",
];

const outDir = "./bot_logs_dump";
fs.mkdirSync(outDir, { recursive: true });

// ---- CSV helpers ----
function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatTimestamp(createdAt) {
  if (!createdAt) return "";
  if (createdAt._seconds) {
    return new Date(createdAt._seconds * 1000).toISOString();
  }
  return createdAt;
}

const headers = [
  "team",
  "id",
  "event",
  "clientTs",
  "canvasId",
  "appUserId",
  "firebaseUid",
  "role",
  "variant",
  "sessionId",
  "createdAt",
  "createdAt_seconds",
  "createdAt_nanoseconds",
  "payload_role",
  "payload_phase",
  "payload_chipsCount",
  "payload_triggerId",
  "payload_triggerLabel",
  "payload_source",
  "payload_hasSnippet",
  "payload_textPreview",
  "payload_dedupeKey",
  "payload_tailShapeIdsCount",
  "meta_href",
];

const csvRows = [headers.join(",")];
let totalRecords = 0;

// ---- Main loop over all 7 teams ----
for (const teamId of TEAM_IDS) {
  const botLogsRef = db
    .collection("classrooms")
    .doc(CLASSROOM_ID)
    .collection("Projects")
    .doc(PROJECT_ID)
    .collection("teams")
    .doc(teamId)
    .collection("bot_logs");

  const snap = await botLogsRef.get();
  console.log(`[${teamId}] Found ${snap.size} bot_logs documents`);

  if (snap.empty) continue;

  // Per-team output folder for the raw JSON docs
  const teamDir = path.join(outDir, teamId);
  fs.mkdirSync(teamDir, { recursive: true });

  for (const doc of snap.docs) {
    const data = doc.data();

    // Save individual JSON file
    const filePath = path.join(teamDir, `${doc.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    // Add row to the combined CSV
    const row = [
      escapeCSV(teamId),
      escapeCSV(doc.id),
      escapeCSV(data.event),
      escapeCSV(data.clientTs),
      escapeCSV(data.canvasId),
      escapeCSV(data.appUserId),
      escapeCSV(data.firebaseUid),
      escapeCSV(data.role),
      escapeCSV(data.variant),
      escapeCSV(data.sessionId),
      escapeCSV(formatTimestamp(data.createdAt)),
      escapeCSV(data.createdAt?._seconds),
      escapeCSV(data.createdAt?._nanoseconds),
      escapeCSV(data.payload?.role),
      escapeCSV(data.payload?.phase),
      escapeCSV(data.payload?.chipsCount),
      escapeCSV(data.payload?.triggerId),
      escapeCSV(data.payload?.triggerLabel),
      escapeCSV(data.payload?.source),
      escapeCSV(data.payload?.hasSnippet),
      escapeCSV(data.payload?.textPreview),
      escapeCSV(data.payload?.dedupeKey),
      escapeCSV(data.payload?.tailShapeIdsCount),
      escapeCSV(data.meta?.href),
    ];

    csvRows.push(row.join(","));
    totalRecords++;
  }
}

// ---- Write combined CSV ----
const csvPath = path.join(outDir, "bot_logs_all_teams.csv");
fs.writeFileSync(csvPath, csvRows.join("\n"));

console.log(`✅ Bot logs downloaded to ${outDir}/<TeamX>/`);
console.log(`✅ Combined CSV written: ${csvPath}`);
console.log(
  `📊 Total records across ${TEAM_IDS.length} teams: ${totalRecords}`
);
