import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
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

const assistantName = "Poly";

const welcomeMessage = `Hey there! 👋 I'm ${assistantName}, your project assistant. Ask me about the materials for this project and I’ll help you understand them faster.`;

const materialMeta = (source = "") => {
  const name = typeof source === "string" ? source : source.name || "";
  const ext = (name.split(".").pop() || "").toLowerCase();

  const map = {
    pdf: { label: "PDF", icon: "📄", color: "#dc2626" },
    ppt: { label: "PPT", icon: "📊", color: "#f59e0b" },
    pptx: { label: "PPT", icon: "📊", color: "#f59e0b" },
    doc: { label: "DOC", icon: "📝", color: "#3b82f6" },
    docx: { label: "DOC", icon: "📝", color: "#3b82f6" },
    png: { label: "IMAGE", icon: "🖼️", color: "#10b981" },
    jpg: { label: "IMAGE", icon: "🖼️", color: "#10b981" },
    jpeg: { label: "IMAGE", icon: "🖼️", color: "#10b981" },
    webp: { label: "IMAGE", icon: "🖼️", color: "#10b981" },
    mp4: { label: "VIDEO", icon: "🎬", color: "#8b5cf6" },
    mov: { label: "VIDEO", icon: "🎬", color: "#8b5cf6" },
    webm: { label: "VIDEO", icon: "🎬", color: "#8b5cf6" },
  };

  return map[ext] || { label: "FILE", icon: "📁", color: "#6b7280" };
};

const sourceType = (source = "") => {
  const name = typeof source === "string" ? source : source.name || source.title || "";
  const ext = (name.split(".").pop() || "").toLowerCase();

  if (["pdf"].includes(ext)) return "pdf";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  if (["doc", "docx"].includes(ext)) return "doc";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (["mp4", "mov", "webm", "m4v"].includes(ext)) return "video";
  if (/youtube\.com|vimeo\.com|youtu\.be/i.test(name)) return "video";
  return "other";
};

export const createPreviewPopup = (fileName = "Preview") => {
  const previewWindow = window.open("", "_blank", "noopener,noreferrer");

  if (!previewWindow) {
    return null;
  }

  previewWindow.document.title = fileName;
  previewWindow.document.body.style.margin = "0";
  previewWindow.document.body.style.background = "#111827";
  previewWindow.document.body.style.display = "grid";
  previewWindow.document.body.style.placeItems = "center";
  previewWindow.document.body.innerHTML = `
    <div style="font-family: sans-serif; color: #fff; text-align: center; padding: 24px;">
      Loading ${fileName}...
    </div>
  `;

  return previewWindow;
};

const openGoogleViewer = (url) => {
  const googleViewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
  window.open(googleViewerUrl, "_blank", "noopener,noreferrer");
};

export const openBlobPreview = async (url, fileName) => {
  const ext = (fileName.split(".").pop() || "").toLowerCase();

  if (["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext)) {
    openGoogleViewer(url);
    return;
  }

  const previewWindow = createPreviewPopup(fileName);

  if (!previewWindow) {
    console.warn("Popup blocked; file preview was not opened.");
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Preview fetch failed: ${response.status}`);

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const mimeType = response.headers.get("content-type") || blob.type || "application/octet-stream";
    const isImage = mimeType.startsWith("image/");
    const isVideo = mimeType.startsWith("video/");

    previewWindow.document.title = fileName;
    previewWindow.document.body.style.margin = "0";
    previewWindow.document.body.style.background = "#111827";
    previewWindow.document.body.style.display = "grid";
    previewWindow.document.body.style.placeItems = "center";

    if (isImage) {
      previewWindow.document.body.innerHTML = `
        <img
          src="${blobUrl}"
          alt="${fileName}"
          style="max-width:100vw; max-height:100vh; object-fit:contain; display:block;"
        />
      `;
      return;
    }

    if (isVideo) {
      previewWindow.document.body.innerHTML = `
        <video
          controls
          autoplay
          style="max-width:100vw; max-height:100vh; background:black;"
        >
          <source src="${blobUrl}" type="${mimeType}" />
        </video>
      `;
      return;
    }

    previewWindow.document.body.innerHTML = `
      <div style="font-family: sans-serif; color: #fff; text-align: center; padding: 24px; line-height: 1.6;">
        <p style="margin: 0 0 12px; font-weight: 600;">This file type is not browser-viewable.</p>
        <a href="${url}" target="_blank" rel="noreferrer" style="color: #93c5fd;">Open file directly</a>
      </div>
    `;
  } catch (error) {
    previewWindow.document.body.innerHTML = `
      <div style="font-family: sans-serif; color: #fff; text-align: center; padding: 24px; line-height: 1.6;">
        <p style="margin: 0 0 12px; font-weight: 600;">Unable to preview this file.</p>
        <a href="${url}" target="_blank" rel="noreferrer" style="color: #93c5fd;">Open file directly</a>
      </div>
    `;
  }
};

const openMaterialPreview = async (item) => {
  if (!item || !item.url) return;

  const url = item.url;
  const name = item.name || item.title || "Material";
  const ext = (name.split(".").pop() || "").toLowerCase();

  if (["pdf"].includes(ext)) {
    try {
      await openBlobPreview(url, name);
      return;
    } catch {
      const googleViewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
      window.open(googleViewerUrl, "_blank", "noopener,noreferrer");
      return;
    }
  }

  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    try {
      await openBlobPreview(url, name);
      return;
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
  }

  if (["doc", "docx", "ppt", "pptx"].includes(ext)) {
    try {
      await openBlobPreview(url, name);
      return;
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
  }

  if (["mp4", "mov", "webm", "m4v"].includes(ext)) {
    try {
      await openBlobPreview(url, name);
      return;
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
  }

  if (/youtube\.com|vimeo\.com|youtu\.be/i.test(url)) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    await openBlobPreview(url, name);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

const handleMaterialDownload = async (item) => {
  if (!item || !item.url) return;

  const isVideo = /(\.mp4|\.mov|\.webm|youtube\.com|vimeo\.com)/i.test(
    item.name || ""
  );

  if (isVideo) {
    window.open(item.url, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    const response = await fetch(item.url);
    if (!response.ok) throw new Error("Download failed");

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = item.name || "download";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.warn("Download failed, opening file instead:", err);
    window.open(item.url, "_blank", "noopener,noreferrer");
  }
};

export default function AIChatPanel({
  courseId,
  projectName,
  isCollapsed,
  onToggle,
}) {
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: "ai",
      text: welcomeMessage,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [wakingUp, setWakingUp] = useState(false); // backend cold-start likely in progress
  const [sources, setSources] = useState([]); // loaded PDF names from Firestore
  const [ingesting, setIngesting] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  // Stable per-message id (array index isn't safe as a React key once a
  // message's own text keeps changing while it streams in).
  const nextMsgId = useRef(1);

  // Per-answer source citations (msg.sources) come back from the backend as
  // plain filename strings — ChromaDB only stores the name, not a URL. This
  // maps each name back to the material object (with its real Firebase
  // Storage URL) from the materials list already loaded for the context
  // bar, so a citation can open the same way a materials chip does.
  const materialsByName = useMemo(() => {
    const map = {};
    for (const item of sources) {
      if (item?.name) map[item.name] = item;
    }
    return map;
  }, [sources]);

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

  // ── Auto-grow the textarea as the student types ────────────────────────────
  // Reset to "auto" first so scrollHeight reflects the *current* content
  // (otherwise a previous inline height sticks around when text shrinks).
  // CSS max-height caps the actual rendered growth and switches to a
  // scrollbar once the cap is hit.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  // ── Focus input when panel opens ───────────────────────────────────────────
  useEffect(() => {
    if (!isCollapsed) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isCollapsed]);

  useEffect(() => {
    document.body.classList.toggle("ai-panel-open", !isCollapsed);
    return () => document.body.classList.remove("ai-panel-open");
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
        const visibleSourceItems = [
          ...descPdf.map((p) => ({ name: p.name, url: p.url })),
          ...notePdfs.map((p) => ({ name: p.name, url: p.url })),
          ...documentMaterials
            .filter((m) => m.visibleToStudents)
            .map((m) => ({
              name: m.title || m.fileName,
              url: m.url,
            })),
        ];
        setSources(visibleSourceItems.filter((item) => item.url && item.name));

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
  const contextPreviewItems = Object.values(
    (sources || []).reduce((acc, source) => {
      const type = sourceType(source);
      if (!acc[type]) acc[type] = source;
      return acc;
    }, {})
  );
  const visibleSources = showAllSources ? sources : contextPreviewItems;

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: nextMsgId.current++, role: "user", text: question },
    ]);
    setLoading(true);
    setWakingUp(false);

    // If this takes more than a few seconds, the backend is very likely
    // cold-starting (see AI_BASE) — let the student know that's expected
    // rather than leaving them staring at a silent typing indicator.
    const wakeTimer = setTimeout(() => setWakingUp(true), 6000);

    // Last few turns of the conversation so far (not including the question
    // just typed, which is sent separately below) — lets the backend handle
    // follow-ups like "what about the second part?" instead of treating
    // every message as standalone.
    const recentHistory = messages
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.text }));

    // Placeholder bubble the streamed tokens get appended into as they
    // arrive, so the student sees the answer build up instead of waiting
    // for the whole thing at once.
    const aiId = nextMsgId.current++;
    setMessages((prev) => [
      ...prev,
      { id: aiId, role: "ai", text: "", streaming: true },
    ]);

    let gotFirstToken = false;

    try {
      const res = await fetch(
        `${AI_BASE}/api/chatbot/ask-stream/${backendCourseId(
          courseId,
          projectName
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, history: recentHistory }),
        }
      );
      if (!res.ok || !res.body) throw new Error("Stream request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // The backend streams newline-delimited JSON events
      // ({"type":"token","text":...} / {"type":"done","sources":...}) —
      // buffer partial lines across chunk boundaries and process only the
      // complete ones.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;

          const event = JSON.parse(line);
          if (event.type === "token") {
            if (!gotFirstToken) {
              gotFirstToken = true;
              clearTimeout(wakeTimer);
              setWakingUp(false);
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId ? { ...m, text: m.text + event.text } : m
              )
            );
          } else if (event.type === "done") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId
                  ? {
                      ...m,
                      sources: event.sources,
                      webReference: event.web_reference,
                      streaming: false,
                    }
                  : m
              )
            );
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? {
                ...m,
                text: "Sorry, I couldn't reach my brain just now — I might be waking up from a nap. Give it a few seconds and try again?",
                streaming: false,
              }
            : m
        )
      );
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
          isCollapsed ? "Open Poly Assistant" : "Close Poly Assistant"
        }
        title="Poly Assistant"
      >
        <span className="ai-toggle-icon" aria-hidden="true">
          <FontAwesomeIcon icon={faRobot} />
        </span>
        {isCollapsed && (
          <span className="ai-toggle-label">Poly Assistant</span>
        )}
      </button>

      {/* ── Sidebar ── */}
      <aside
        className={`ai-sidebar${isCollapsed ? " ai-sidebar--collapsed" : ""}`}
        aria-label="Poly Assistant"
        aria-hidden={isCollapsed}
      >
        {/* Header */}
        <div className="ai-sidebar-header">
          <div className="ai-sidebar-header-left">
            <span className="ai-sidebar-icon" aria-hidden="true"></span>
            <div>
              <div className="ai-sidebar-title">Poly Assistant</div>
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

        {/* Source context bar — shows which materials are active in the chat */}
        {(sources.length > 0 || ingesting) && (
          <div className="ai-context-bar">
            {ingesting ? (
              <span className="ai-context-loading">
                <span className="ai-context-dot" />
                Indexing course materials…
              </span>
            ) : (
              <>
                <span className="ai-context-label">Project Materials</span>
                {visibleSources.map((source, index) => {
                  const meta = materialMeta(source);
                  const label = typeof source === "string" ? source : source.name || source.title;
                  const href = typeof source === "string" ? undefined : source.url;

                  if (href) {
                    return (
                      <button
                        key={`${label}-${index}`}
                        type="button"
                        className="ai-context-chip"
                        title={label}
                        onClick={() => openMaterialPreview(source)}
                      >
                        <span
                          className="ai-context-icon"
                          style={{ background: meta.color }}
                          aria-hidden="true"
                        >
                          {meta.icon}
                        </span>
                        <span>{label}</span>
                      </button>
                    );
                  }

                  return (
                    <span
                      key={`${label}-${index}`}
                      className="ai-context-chip"
                      title={label}
                    >
                      <span
                        className="ai-context-icon"
                        style={{ background: meta.color }}
                        aria-hidden="true"
                      >
                        {meta.icon}
                      </span>
                      <span>{label}</span>
                    </span>
                  );
                })}
                {sources.length > contextPreviewItems.length && (
                  <button
                    type="button"
                    className="ai-context-toggle"
                    onClick={() => setShowAllSources((prev) => !prev)}
                  >
                    {showAllSources ? "Show less" : `+${sources.length - contextPreviewItems.length} more`}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="ai-messages" role="log" aria-live="polite">
          {messages.map((msg) => (
            <div key={msg.id} className={`ai-msg ai-msg--${msg.role}`}>
              {msg.role === "ai" && (
                <span className="ai-msg-avatar" aria-hidden="true">
                  <FontAwesomeIcon icon={faRobot} />
                </span>
              )}
              {msg.role === "ai" && msg.streaming && !msg.text ? (
                <div className="ai-msg-bubble ai-msg-bubble--typing">
                  <span />
                  <span />
                  <span />
                </div>
              ) : (
                <div className="ai-msg-bubble">
                  {msg.role === "ai" ? (
                    <div className="ai-msg-markdown">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.text}</p>
                  )}
                  {msg.sources?.length > 0 && (
                    <p className="ai-sources">
                      <span aria-hidden="true">📄</span>{" "}
                      {msg.sources.map((name, i) => {
                        const material = materialsByName[name];
                        return (
                          <React.Fragment key={`${name}-${i}`}>
                            {i > 0 && ", "}
                            {material ? (
                              <button
                                type="button"
                                className="ai-source-link"
                                onClick={() => openMaterialPreview(material)}
                                title={`Open ${name}`}
                              >
                                {name}
                              </button>
                            ) : (
                              name
                            )}
                          </React.Fragment>
                        );
                      })}
                    </p>
                  )}
                  {msg.webReference && (
                    <p className="ai-web-reference">
                      <span aria-hidden="true">🌐</span>{" "}
                      <a
                        href={msg.webReference.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {msg.webReference.title} (Wikipedia)
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
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
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter inserts a newline like a normal
              // multi-line editor instead of submitting.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask about course material…"
            disabled={loading || ingesting}
            aria-label="Ask a question"
            rows={1}
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
