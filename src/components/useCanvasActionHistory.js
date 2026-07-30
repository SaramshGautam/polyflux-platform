import { useEffect, useState, useCallback } from "react";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

// ─────────────────────────────────────────────────────────────
// Helpers for formatting entries (pure, UI-agnostic)
// ─────────────────────────────────────────────────────────────

export function normalizeHistoryTimestamp(rawTs) {
  if (!rawTs) return null;

  // Firestore Timestamp
  if (rawTs.toDate) {
    return rawTs.toDate().toISOString();
  }

  // ISO string or Date
  if (typeof rawTs === "string") {
    return rawTs;
  }
  if (rawTs instanceof Date) {
    return rawTs.toISOString();
  }

  // Fallback: unknown
  return null;
}

/**
 * Canonical history entry:
 * {
 *   id: string           // doc id
 *   userId: string
 *   verb: "added" | "updated" | "deleted"
 *   action: string       // same as verb, for backward compat
 *   shapeType: string
 *   shapeId: string
 *   text?: string
 *   imageUrl?: string
 *   timestamp: string | null   // ISO
 * }
 */

// ─────────────────────────────────────────────────────────────
// Hook: build action history from shapes collection
// ─────────────────────────────────────────────────────────────

function mapShapeSnapshotToEntries(snapshot) {
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();

    const ts = normalizeHistoryTimestamp(
      data.createdAt || data.updatedAt || null
    );

    const displayName = data.createdBy || data.displayName || "";
    const userId = displayName || data.userId || "Unknown User";
    const shapeType = data.shapeType || "shape";
    const shapeId = data.shapeId || docSnap.id;
    const text = data.text || "";
    const imageUrl = data.url || "";
    const verb = "added";

    return {
      id: docSnap.id,
      userId,
      displayName,
      verb,
      action: verb,
      shapeType,
      shapeId,
      text,
      imageUrl,
      timestamp: ts,
    };
  });
}

export function useCanvasActionHistory({ className, projectName, teamName }) {
  const [actionHistory, setActionHistory] = useState([]);

  const buildShapesQuery = useCallback(() => {
    if (!className || !projectName || !teamName) return null;

    const shapesRef = collection(
      db,
      "classrooms",
      className,
      "Projects",
      projectName,
      "teams",
      teamName,
      "shapes"
    );

    return query(shapesRef, orderBy("createdAt", "desc"));
  }, [className, projectName, teamName]);

  const fetchActionHistory = useCallback(async () => {
    const shapesQuery = buildShapesQuery();
    if (!shapesQuery) return;

    try {
      const snapshot = await getDocs(shapesQuery);
      setActionHistory(mapShapeSnapshotToEntries(snapshot));
    } catch (err) {
      console.error("❌ Error fetching action history from shapes:", err);
    }
  }, [buildShapesQuery]);

  useEffect(() => {
    const shapesQuery = buildShapesQuery();
    if (!shapesQuery) return undefined;

    const unsubscribe = onSnapshot(
      shapesQuery,
      (snapshot) => {
        setActionHistory(mapShapeSnapshotToEntries(snapshot));
      },
      (err) => {
        console.error("❌ Error subscribing to action history from shapes:", err);
      }
    );

    return () => unsubscribe();
  }, [buildShapesQuery]);

  // Local append helper (if you later want optimistic updates)
  const appendHistoryEntry = useCallback((entry) => {
    setActionHistory((prev) => [entry, ...prev]);
  }, []);

  return {
    actionHistory,
    setActionHistory, // still exposed if you need to tweak
    fetchActionHistory, // can be called from toolbar etc.
    appendHistoryEntry,
  };
}
