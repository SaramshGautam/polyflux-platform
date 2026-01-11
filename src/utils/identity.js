import { auth } from "../firebaseConfig";

// const ls = (k) => (localStorage.getItem(k) || "").trim();
const ls = (k) => {
  try {
    const v = localStorage.getItem(k);
    return (typeof v === "string" ? v : "").trim();
  } catch {
    return "";
  }
};

export function getActorIdentity() {
  //   const u = auth.currentUser;

  // Prefer what YOU control (participantQuickLogin sets these)
  const storedEmail = ls("userEmail").toLowerCase();
  const storedName = ls("userDisplayName"); // participantId like P014
  //   console.log("Stored identity:", { storedEmail, storedName });

  // Fall back to auth user (Google / email-password)
  //   const authEmail = (u?.email || "").trim().toLowerCase();
  //   const authName = (u?.displayName || "").trim();

  // Pick best available
  //   const email = storedEmail || authEmail || "";
  const email = storedEmail || "";
  const displayName = storedName || "";

  // Stable ID: prefer email (even for anon participants, you stored it)
  const actorId = String(email || "anon")
    .trim()
    .toLowerCase();

  // Display name: prefer participantId; else displayName; else email; else Anonymous
  const actorName = displayName || email || "Anonymous";

  return {
    actorId,
    actorName,
    // uid: u?.uid || null,
    email: email || null,
    // photoURL: u?.photoURL || ls("photoURL") || null,
  };
}
