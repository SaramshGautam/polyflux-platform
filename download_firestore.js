import admin from "firebase-admin";
import fs from "fs";
import path from "path";

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "creative-assistant-j",
});

const db = admin.firestore();

const outDir = "./shapes_dump";
fs.mkdirSync(outDir, { recursive: true });

const shapesRef = db
  .collection("classrooms")
  .doc("Eval3333")
  .collection("Projects")
  .doc("ConditionC1")
  .collection("teams")
  .doc("TeamC")
  .collection("shapes");

const snap = await shapesRef.get();
console.log(`Found ${snap.size} shape documents`);

for (const doc of snap.docs) {
  const filePath = path.join(outDir, `${doc.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(doc.data(), null, 2));
}

console.log("✅ Shapes downloaded to ./shapes_dump/");

// import admin from "firebase-admin";
// import fs from "fs";
// import path from "path";

// admin.initializeApp({
//   credential: admin.credential.applicationDefault(),
//   projectId: "creative-assistant-j",
// });

// const db = admin.firestore();

// const outDir = "./bot_logs_dump";
// fs.mkdirSync(outDir, { recursive: true });

// const botLogsRef = db
//   .collection("classrooms")
//   .doc("Eval3333")
//   .collection("Projects")
//   .doc("ConditionC2")
//   .collection("teams")
//   .doc("TeamE")
//   .collection("bot_logs");

// const snap = await botLogsRef.get();
// console.log(`Found ${snap.size} bot_logs documents`);

// // Function to escape CSV values
// function escapeCSV(value) {
//   if (value === null || value === undefined) return "";
//   const str = String(value);
//   if (str.includes(",") || str.includes('"') || str.includes("\n")) {
//     return `"${str.replace(/"/g, '""')}"`;
//   }
//   return str;
// }

// // Function to convert timestamp
// function formatTimestamp(createdAt) {
//   if (!createdAt) return "";
//   if (createdAt._seconds) {
//     return new Date(createdAt._seconds * 1000).toISOString();
//   }
//   return createdAt;
// }

// // Prepare CSV data
// const csvRows = [];
// const headers = [
//   "id",
//   "event",
//   "clientTs",
//   "canvasId",
//   "appUserId",
//   "firebaseUid",
//   "role",
//   "variant",
//   "sessionId",
//   "createdAt",
//   "createdAt_seconds",
//   "createdAt_nanoseconds",
//   "payload_role",
//   "payload_phase",
//   "payload_chipsCount",
//   "payload_triggerId",
//   "payload_triggerLabel",
//   "payload_source",
//   "payload_hasSnippet",
//   "payload_textPreview",
//   "payload_dedupeKey",
//   "payload_tailShapeIdsCount",
//   "meta_href",
// ];
// csvRows.push(headers.join(","));

// // Process each document
// for (const doc of snap.docs) {
//   const data = doc.data();

//   // Save individual JSON files
//   const filePath = path.join(outDir, `${doc.id}.json`);
//   fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

//   // Extract data for CSV
//   const row = [
//     escapeCSV(doc.id),
//     escapeCSV(data.event),
//     escapeCSV(data.clientTs),
//     escapeCSV(data.canvasId),
//     escapeCSV(data.appUserId),
//     escapeCSV(data.firebaseUid),
//     escapeCSV(data.role),
//     escapeCSV(data.variant),
//     escapeCSV(data.sessionId),
//     escapeCSV(formatTimestamp(data.createdAt)),
//     escapeCSV(data.createdAt?._seconds),
//     escapeCSV(data.createdAt?._nanoseconds),
//     escapeCSV(data.payload?.role),
//     escapeCSV(data.payload?.phase),
//     escapeCSV(data.payload?.chipsCount),
//     escapeCSV(data.payload?.triggerId),
//     escapeCSV(data.payload?.triggerLabel),
//     escapeCSV(data.payload?.source),
//     escapeCSV(data.payload?.hasSnippet),
//     escapeCSV(data.payload?.textPreview),
//     escapeCSV(data.payload?.dedupeKey),
//     escapeCSV(data.payload?.tailShapeIdsCount),
//     escapeCSV(data.meta?.href),
//   ];

//   csvRows.push(row.join(","));
// }

// // Write CSV file
// const csvPath = path.join(outDir, "bot_logs.csv");
// fs.writeFileSync(csvPath, csvRows.join("\n"));

// console.log(`✅ Bot logs downloaded to ${outDir}/`);
// console.log(`✅ CSV file created: ${csvPath}`);
// console.log(`📊 Total records: ${snap.size}`);
