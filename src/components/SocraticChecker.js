import React, { useEffect, useRef, useState } from "react";

// const AI_BASE = "http://localhost:8000";
const AI_BASE = "https://canvas-ai-backend-l7rilyhu2a-uc.a.run.app";
// const AI_BASE = "http://smic1.hpc.lsu.edu:8000";
const CHECK_INTERVAL_MS = 90000; // check every 90 seconds

export default function SocraticChecker({ editor, assignmentId }) {
  const [nudge, setNudge] = useState(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const getCanvasText = () => {
    if (!editor) return "";
    const shapes = editor.getCurrentPageShapes();
    return shapes
      .filter((s) => s.props?.text || s.props?.richText)
      .map((s) => s.props.text || "")
      .join(" ")
      .trim();
  };

  const runCheck = async () => {
    const text = getCanvasText();
    if (!text || text.length < 30) return; // not enough content yet

    try {
      const res = await fetch(`${AI_BASE}/api/socratic/check/${assignmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvas_content: text }),
      });
      const data = await res.json();
      if (!data.aligned && data.message) {
        setNudge(data.message);
        setVisible(true);
      }
    } catch (e) {
      console.warn("Socratic check failed:", e);
    }
  };

  useEffect(() => {
    if (!editor || !assignmentId) return;
    timerRef.current = setInterval(runCheck, CHECK_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [editor, assignmentId]);

  if (!visible || !nudge) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 140,
        left: "50%",
        transform: "translateX(-50%)",
        background: "white",
        border: "1px solid #e5e7eb",
        borderLeft: "4px solid #4f46e5",
        borderRadius: 10,
        padding: "12px 16px",
        maxWidth: 420,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        zIndex: 1000,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <span style={{ fontSize: 20 }}>🧠</span>
      <div style={{ flex: 1 }}>
        <p
          style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#4f46e5" }}
        >
          AI Check-in
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            color: "#374151",
            lineHeight: 1.5,
          }}
        >
          {nudge}
        </p>
      </div>
      <button
        onClick={() => setVisible(false)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 16,
          color: "#9ca3af",
          padding: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
