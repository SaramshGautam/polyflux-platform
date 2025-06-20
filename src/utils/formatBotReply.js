/**
 * Clean and format bot reply text for chatbot UI.
 * Strips markdown syntax and structures output for readability.
 */

export function formatBotReply(rawText) {
  if (!rawText) return "";

  // 1. Remove bold markers like **text**
  let cleanText = rawText.replace(/\*\*(.*?)\*\*/g, "$1");

  // 2. Add spacing before sections like "Day 1: ..."
  cleanText = cleanText.replace(/(Day \d+:.*?)\n?/g, "\n\n$1\n");

  // 3. Replace markdown-style bullet points with clean bullets
  cleanText = cleanText.replace(/^- /gm, "• ");
  cleanText = cleanText.replace(/^ {2}- /gm, "    - "); // Nested

  // 4. Remove any long horizontal lines (--- or ***)
  cleanText = cleanText.replace(/^[-*]{3,}$/gm, "");

  // 5. Normalize multiple blank lines to max two
  cleanText = cleanText.replace(/\n{3,}/g, "\n\n");

  return cleanText.trim();
}
