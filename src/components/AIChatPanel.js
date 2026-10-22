import React, { useState, useRef, useEffect } from "react";
import { AI_BACKEND_URL } from "../config/api";
import "./AIChatPanel.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot } from "@fortawesome/free-solid-svg-icons";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";

const AI_BASE = AI_BACKEND_URL;

// The ai-backend keys its ingested content by `${className}__${projectName}`
// (see backend/app.py's project_course_id()) — NOT courseId alone. courseId
// here is the classroom's Firestore doc id (used to look up uploaded PDFs);
// this derived key is what must be sent to the ai-backend itself.
const backendCourseId = (courseId, projectName) =>
  projectName ? `${courseId}__${projectName}` : courseId;

export default function AIChatPanel({
  courseId,
  projectName,
  isCollapsed,
  onToggle,
}) {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hey there! 👋 I'm your PolyFlux Assistant — ask me anything about the material your professor has uploaded for this project, and I'll do my best to help you work through it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [wakingUp, setWakingUp] = useState(false); // backend cold-start likely in progress
  const [sources, setSources] = useState([]); // loaded PDF names from Firestore
  const [ingesting, setIngesting] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // ── Pre-warm the AI backend on mount ────────────────────────────────────────
  // Best-effort only: if the Cloud Run instance is cold, this kicks off its
  // (slow) model load in the background so it's more likely to be ready by
  // the time the student actually asks something.
  useEffect(() => {
    fetch(`${AI_BASE}/`).catch(() => {});
  }, []);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Focus input when panel opens ───────────────────────────────────────────
  useEffect(() => {
    if (!isCollapsed) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isCollapsed]);

  // ── On mount: fetch PDF metadata from Firestore & trigger ingest ───────────
  useEffect(() => {
    if (!courseId || !projectName) return;

    const fetchAndIngest = async () => {
      try {
        const db = getFirestore();
        const snap = await getDoc(
          doc(db, "classrooms", courseId, "Projects", projectName)
        );
        if (!snap.exists()) return;

        const data = snap.data() || {};
        const descPdf = data.description_pdf ? [data.description_pdf] : [];
        const notePdfs = Array.isArray(data.notes) ? data.notes : [];

        // Materials library (Project page "Materials" section) — only the
        // document items (PDF/PPTX/DOCX); video links have no extractable
        // text. These are included in what the AI can draw on even when a
        // teacher has marked them private — "private" only controls whether
        // a *student* can see/open the file, not whether the assistant can
        // use it to answer questions.
        const materialsSnap = await getDocs(
          collection(
            db,
            "classrooms",
            courseId,
            "Projects",
            projectName,
            "materials"
          )
        );
        const documentMaterials = materialsSnap.docs
          .map((d) => d.data())
          .filter((m) => m.type === "document" && m.url);

        const allDocuments = [
          ...descPdf,
          ...notePdfs,
          ...documentMaterials.map((m) => ({
            name: m.fileName || m.title,
            url: m.url,
          })),
        ];

        if (allDocuments.length === 0) return;

        // Show the source names in the UI — legacy description/notes PDFs
        // were always student-visible; for the new materials library, only
        // list items the teacher actually marked visible, so a private
        // file's existence/title is never hinted at in the chat panel.
        const visibleSourceNames = [
          ...descPdf.map((p) => p.name),
          ...notePdfs.map((p) => p.name),
          ...documentMaterials
            .filter((m) => m.visibleToStudents)
            .map((m) => m.title),
        ];
        setSources(visibleSourceNames.filter(Boolean));

        // Trigger ingest so the AI backend has the latest material indexed
        setIngesting(true);
        try {
          await fetch(`${AI_BASE}/api/chatbot/ingest`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              course_id: backendCourseId(courseId, projectName),
              documents: allDocuments.map((p) => ({
                name: p.name,
                url: p.url,
              })),
            }),
          });
        } catch (e) {
          console.warn(
            "Ingest call failed (chatbot will use previously indexed data):",
            e
          );
        } finally {
          setIngesting(false);
        }
      } catch (e) {
        console.warn("Could not fetch project PDFs from Firestore:", e);
      }
    };

    fetchAndIngest();
  }, [courseId, projectName]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setLoading(true);
    setWakingUp(false);

    // If this takes more than a few seconds, the backend is very likely
    // cold-starting (see AI_BASE) — let the student know that's expected
    // rather than leaving them staring at a silent typing indicator.
    const wakeTimer = setTimeout(() => setWakingUp(true), 6000);

    try {
      const res = await fetch(
        `${AI_BASE}/api/chatbot/ask/${backendCourseId(courseId, projectName)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        }
      );
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: data.answer, sources: data.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Sorry, I couldn't reach my brain just now — I might be waking up from a nap. Give it a few seconds and try again?",
        },
      ]);
    } finally {
      clearTimeout(wakeTimer);
      setWakingUp(false);
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Toggle button ── */}
      <button
        className={`ai-toggle-btn${
          isCollapsed ? "" : " ai-toggle-btn--active"
        }`}
        onClick={onToggle}
        aria-label={
          isCollapsed ? "Open PolyFlux Assistant" : "Close PolyFlux Assistant"
        }
        title="PolyFlux Assistant"
      >
        <span className="ai-toggle-icon" aria-hidden="true">
          <FontAwesomeIcon icon={faRobot} />
        </span>
        {isCollapsed && (
          <span className="ai-toggle-label">PolyFlux Assistant</span>
        )}
      </button>

      {/* ── Sidebar ── */}
      <aside
        className={`ai-sidebar${isCollapsed ? " ai-sidebar--collapsed" : ""}`}
        aria-label="PolyFlux Assistant"
        aria-hidden={isCollapsed}
      >
        {/* Header */}
        <div className="ai-sidebar-header">
          <div className="ai-sidebar-header-left">
            <span className="ai-sidebar-icon" aria-hidden="true"></span>
            <div>
              <div className="ai-sidebar-title">PolyFlux Assistant</div>
              <div className="ai-sidebar-course">{projectName || courseId}</div>
            </div>
          </div>
          <button
            className="ai-sidebar-close"
            onClick={onToggle}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Source context bar — shows which PDFs are loaded */}
        {(sources.length > 0 || ingesting) && (
          <div className="ai-context-bar">
            {ingesting ? (
              <span className="ai-context-loading">
                <span className="ai-context-dot" />
                Indexing course materials…
              </span>
            ) : (
              <>
                <span className="ai-context-label">📄 Context:</span>
                <span className="ai-context-files">{sources.join(" · ")}</span>
              </>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="ai-messages" role="log" aria-live="polite">
          {messages.map((msg, i) => (
            <div key={i} className={`ai-msg ai-msg--${msg.role}`}>
              {msg.role === "ai" && (
                <span className="ai-msg-avatar" aria-hidden="true">
                  <FontAwesomeIcon icon={faRobot} />
                </span>
              )}
              <div className="ai-msg-bubble">
                <p>{msg.text}</p>
                {msg.sources?.length > 0 && (
                  <p className="ai-sources">
                    <span aria-hidden="true">📄</span> {msg.sources.join(", ")}
                  </p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="ai-msg ai-msg--ai">
              <span className="ai-msg-avatar" aria-hidden="true">
                <FontAwesomeIcon icon={faRobot} />
              </span>
              <div className="ai-msg-bubble ai-msg-bubble--typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
          {loading && wakingUp && (
            <p className="ai-waking-hint">
              Still here — just waking up my brain, this can take a minute the
              first time. ☕
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="ai-input-row">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask about course material…"
            disabled={loading || ingesting}
            aria-label="Ask a question"
          />
          <button
            className="ai-send-btn"
            onClick={sendMessage}
            disabled={loading || ingesting || !input.trim()}
            aria-label="Send message"
          >
            ↑
          </button>
        </div>
      </aside>
    </>
  );
}
