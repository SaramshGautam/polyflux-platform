import React, { useState, useRef, useEffect } from "react";
import "./AIChatPanel.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot } from "@fortawesome/free-solid-svg-icons";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const AI_BASE = "https://canvas-ai-backend-l7rilyhu2a-uc.a.run.app";

export default function AIChatPanel({
  courseId,
  projectName,
  isCollapsed,
  onToggle,
}) {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hi! Ask me anything about the course material your professor uploaded.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState([]); // loaded PDF names from Firestore
  const [ingesting, setIngesting] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

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
        const allPdfs = [...descPdf, ...notePdfs];

        if (allPdfs.length === 0) return;

        // Show the source names in the UI
        setSources(allPdfs.map((p) => p.name).filter(Boolean));

        // Trigger ingest so the AI backend has the latest PDFs indexed
        setIngesting(true);
        try {
          await fetch(`${AI_BASE}/api/ingest`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              course_id: courseId,
              documents: allPdfs.map((p) => ({ name: p.name, url: p.url })),
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

    try {
      const res = await fetch(`${AI_BASE}/api/chatbot/ask/${courseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
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
          text: "Could not reach the AI backend. Please try again.",
        },
      ]);
    } finally {
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
          isCollapsed ? "Open Study Assistant" : "Close Study Assistant"
        }
        title="Study Assistant"
      >
        <span className="ai-toggle-icon" aria-hidden="true">
          <FontAwesomeIcon icon={faRobot} />
        </span>
        {isCollapsed && (
          <span className="ai-toggle-label">Study Assistant</span>
        )}
      </button>

      {/* ── Sidebar ── */}
      <aside
        className={`ai-sidebar${isCollapsed ? " ai-sidebar--collapsed" : ""}`}
        aria-label="Study Assistant"
        aria-hidden={isCollapsed}
      >
        {/* Header */}
        <div className="ai-sidebar-header">
          <div className="ai-sidebar-header-left">
            <span className="ai-sidebar-icon" aria-hidden="true"></span>
            <div>
              <div className="ai-sidebar-title">Study Assistant</div>
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
