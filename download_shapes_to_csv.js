import admin from "firebase-admin";
import fs from "fs";
import path from "path";

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "creative-assistant-j",
});

const db = admin.firestore();

const outDir = "./shapes_dump/GroupA-formative";
fs.mkdirSync(outDir, { recursive: true });

const shapesRef = db
  .collection("classrooms")
  .doc("CSC7999")
  .collection("Projects")
  .doc("Project Number 1")
  .collection("teams")
  .doc("Team 1")
  .collection("shapes");

const snap = await shapesRef.get();
console.log(`Found ${snap.size} shape documents`);

// --------------------------
// Helpers
// --------------------------

// Function to escape CSV values
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

// Function to format timestamp
function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000).toISOString();
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toISOString();
  }
  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString();
  }
  return "";
}

// Get image URL (your screenshot shows top-level "url")
function getImageUrl(data) {
  return (
    data?.url || // ✅ matches your Firestore screenshot
    data?.previewUrl ||
    data?.asset?.url ||
    data?.asset?.src ||
    data?.props?.url ||
    data?.props?.src ||
    ""
  );
}

// If it's an image shape, inject URL into "text" field for analysis
function getTextForCsv(data) {
  const shapeType = (data?.shapeType || "").toLowerCase();
  const baseText = data?.text || "";
  if (shapeType === "image") {
    const url = getImageUrl(data);
    if (!url) return baseText;
    if (!baseText || baseText.trim().length === 0) return url;
    return `${baseText} | ${url}`;
  }
  return baseText;
}

// --------------------------
// Main CSV
// --------------------------
const csvRows = [];
const headers = [
  "shapeId",
  "shapeType",
  "color",
  "teamName",
  "text", // <-- for image shapes, this will contain the URL
  "createdAt",
  "createdAt_timestamp",
  "createdBy",
  "updatedAt",
  "updatedAt_timestamp",
  "position_x",
  "position_y",
  "reactions_confused",
  "reactions_dislike",
  "reactions_like",
  "reactions_surprised",
  "comments_count",
  "has_comments",
];
csvRows.push(headers.join(","));

for (const doc of snap.docs) {
  const data = doc.data();
  const textForCsv = getTextForCsv(data);

  // Save individual JSON files
  const filePath = path.join(outDir, `${doc.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  // Count comments
  const commentsCount = data.comments ? Object.keys(data.comments).length : 0;
  const hasComments = commentsCount > 0;

  // Extract data for CSV
  const row = [
    escapeCSV(doc.id),
    escapeCSV(data.shapeType),
    escapeCSV(data.color),
    escapeCSV(data.teamName),
    escapeCSV(textForCsv),
    escapeCSV(formatTimestamp(data.createdAt)),
    escapeCSV(data.createdAt?._seconds || data.createdAt?.seconds || ""),
    escapeCSV(data.createdBy),
    escapeCSV(formatTimestamp(data.updatedAt)),
    escapeCSV(data.updatedAt?._seconds || data.updatedAt?.seconds || ""),
    escapeCSV(data.position?.x),
    escapeCSV(data.position?.y),
    escapeCSV(data.reactions?.confused || 0),
    escapeCSV(data.reactions?.dislike || 0),
    escapeCSV(data.reactions?.like || 0),
    escapeCSV(data.reactions?.surprised || 0),
    escapeCSV(commentsCount),
    escapeCSV(hasComments),
  ];

  csvRows.push(row.join(","));
}

// Write main CSV file
const csvPath = path.join(outDir, "shapes_data.csv");
fs.writeFileSync(csvPath, csvRows.join("\n"));

console.log(`✅ Shapes downloaded to ${outDir}/`);
console.log(`✅ CSV file created: ${csvPath}`);
console.log(`📊 Total shapes: ${snap.size}`);

// --------------------------
// 1) Timeline CSV
// --------------------------
const timelineCsv = [];
timelineCsv.push("timestamp,shapeId,shapeType,createdBy,action,text_preview");

const timeline = [];
for (const doc of snap.docs) {
  const data = doc.data();
  const textForCsv = getTextForCsv(data);

  const createdTimestamp =
    data.createdAt?._seconds || data.createdAt?.seconds || 0;
  const updatedTimestamp =
    data.updatedAt?._seconds || data.updatedAt?.seconds || 0;

  // Creation event
  timeline.push({
    timestamp: createdTimestamp,
    shapeId: doc.id,
    shapeType: data.shapeType,
    createdBy: data.createdBy,
    action: "created",
    textPreview: (textForCsv || "").substring(0, 50),
  });

  // Update event (if different from creation)
  if (updatedTimestamp > createdTimestamp) {
    timeline.push({
      timestamp: updatedTimestamp,
      shapeId: doc.id,
      shapeType: data.shapeType,
      createdBy: data.createdBy,
      action: "updated",
      textPreview: (textForCsv || "").substring(0, 50),
    });
  }
}

// Sort by timestamp
timeline.sort((a, b) => a.timestamp - b.timestamp);

for (const event of timeline) {
  const row = [
    escapeCSV(new Date(event.timestamp * 1000).toISOString()),
    escapeCSV(event.shapeId),
    escapeCSV(event.shapeType),
    escapeCSV(event.createdBy),
    escapeCSV(event.action),
    escapeCSV(event.textPreview),
  ];
  timelineCsv.push(row.join(","));
}

fs.writeFileSync(
  path.join(outDir, "shapes_timeline.csv"),
  timelineCsv.join("\n")
);
console.log(`✅ Timeline CSV created: shapes_timeline.csv`);

// --------------------------
// 2) Summary statistics CSV
// --------------------------
const stats = {
  totalShapes: snap.size,
  shapeTypes: {},
  creators: {},
  totalReactions: { confused: 0, dislike: 0, like: 0, surprised: 0 },
  totalComments: 0,
  shapesWithText: 0,
  shapesWithReactions: 0,
  shapesWithComments: 0,
};

for (const doc of snap.docs) {
  const data = doc.data();
  const textForCsv = getTextForCsv(data);

  // Count shape types
  const type = data.shapeType || "unknown";
  stats.shapeTypes[type] = (stats.shapeTypes[type] || 0) + 1;

  // Count creators
  const creator = data.createdBy || "unknown";
  stats.creators[creator] = (stats.creators[creator] || 0) + 1;

  // Count reactions
  if (data.reactions) {
    stats.totalReactions.confused += data.reactions.confused || 0;
    stats.totalReactions.dislike += data.reactions.dislike || 0;
    stats.totalReactions.like += data.reactions.like || 0;
    stats.totalReactions.surprised += data.reactions.surprised || 0;

    if (Object.values(data.reactions).some((v) => v > 0)) {
      stats.shapesWithReactions++;
    }
  }

  // Count comments
  if (data.comments) {
    const commentCount = Object.keys(data.comments).length;
    stats.totalComments += commentCount;
    if (commentCount > 0) stats.shapesWithComments++;
  }

  // Count text (for image shapes, this includes URL, which is fine for "has text")
  if (textForCsv && textForCsv.trim().length > 0) {
    stats.shapesWithText++;
  }
}

// Write summary stats
const summaryLines = [
  "Metric,Value",
  `Total Shapes,${stats.totalShapes}`,
  `Shapes with Text,${stats.shapesWithText}`,
  `Shapes with Reactions,${stats.shapesWithReactions}`,
  `Shapes with Comments,${stats.shapesWithComments}`,
  `Total Comments,${stats.totalComments}`,
  `Total Likes,${stats.totalReactions.like}`,
  `Total Dislikes,${stats.totalReactions.dislike}`,
  `Total Confused,${stats.totalReactions.confused}`,
  `Total Surprised,${stats.totalReactions.surprised}`,
  "",
  "Shape Type,Count",
];

for (const [type, count] of Object.entries(stats.shapeTypes)) {
  summaryLines.push(`${type},${count}`);
}

summaryLines.push("");
summaryLines.push("Creator,Count");
for (const [creator, count] of Object.entries(stats.creators)) {
  summaryLines.push(`${creator},${count}`);
}

fs.writeFileSync(
  path.join(outDir, "shapes_summary.csv"),
  summaryLines.join("\n")
);
console.log(`✅ Summary statistics created: shapes_summary.csv`);

// --------------------------
// 3) Reactions CSV
// --------------------------
const reactionsCsv = [];
reactionsCsv.push(
  "shapeId,shapeType,text_preview,confused,dislike,like,surprised,total_reactions"
);

for (const doc of snap.docs) {
  const data = doc.data();
  const textForCsv = getTextForCsv(data);

  if (data.reactions) {
    const confused = data.reactions.confused || 0;
    const dislike = data.reactions.dislike || 0;
    const like = data.reactions.like || 0;
    const surprised = data.reactions.surprised || 0;
    const total = confused + dislike + like + surprised;

    if (total > 0) {
      const row = [
        escapeCSV(doc.id),
        escapeCSV(data.shapeType),
        escapeCSV((textForCsv || "").substring(0, 50)),
        confused,
        dislike,
        like,
        surprised,
        total,
      ];
      reactionsCsv.push(row.join(","));
    }
  }
}

fs.writeFileSync(
  path.join(outDir, "shapes_reactions.csv"),
  reactionsCsv.join("\n")
);
console.log(`✅ Reactions CSV created: shapes_reactions.csv`);

// --------------------------
// 4) Comments CSV
// --------------------------
const commentsCsv = [];
commentsCsv.push(
  "shapeId,shapeType,shape_text_preview,comment_key,comment_text"
);

for (const doc of snap.docs) {
  const data = doc.data();
  const textForCsv = getTextForCsv(data);

  if (data.comments) {
    for (const [commentKey, commentData] of Object.entries(data.comments)) {
      const row = [
        escapeCSV(doc.id),
        escapeCSV(data.shapeType),
        escapeCSV((textForCsv || "").substring(0, 30)),
        escapeCSV(commentKey),
        escapeCSV(commentData?.text || commentData),
      ];
      commentsCsv.push(row.join(","));
    }
  }
}

fs.writeFileSync(
  path.join(outDir, "shapes_comments.csv"),
  commentsCsv.join("\n")
);
console.log(`✅ Comments CSV created: shapes_comments.csv`);

console.log("\n" + "=".repeat(60));
console.log("📊 SUMMARY");
console.log("=".repeat(60));
console.log(`Total Shapes: ${stats.totalShapes}`);
console.log(`Shape Types: ${Object.keys(stats.shapeTypes).join(", ")}`);
console.log(`Creators: ${Object.keys(stats.creators).join(", ")}`);
console.log(
  `Total Reactions: ${Object.values(stats.totalReactions).reduce(
    (a, b) => a + b,
    0
  )}`
);
console.log(`Total Comments: ${stats.totalComments}`);
console.log("=".repeat(60));
console.log("\n📁 Files created:");
console.log("  1. shapes_data.csv - Main dataset with all shape info");
console.log("  2. shapes_timeline.csv - Chronological events (create/update)");
console.log("  3. shapes_summary.csv - Summary statistics");
console.log("  4. shapes_reactions.csv - Shapes with reactions");
console.log("  5. shapes_comments.csv - All comments extracted");
console.log("  6. Individual JSON files for each shape");
console.log("=".repeat(60));
