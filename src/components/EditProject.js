import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import "./EditProject.css";

const API_BASE = (className, projectName) =>
  `/api/classroom/${className}/project/${projectName}`;

const MAX_NOTE_SIZE_MB = 10;
const MAX_NOTES = 10;

const formatBytes = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDateForInput = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return isNaN(d) ? "" : d.toISOString().slice(0, 16);
};

const EditProject = () => {
  const { className, projectName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initial = location.state?.projectDetails || {
    description: "",
    dueDate: "",
  };

  // ── Core fields ──────────────────────────────────────────────────────────
  const [projName, setProjName] = useState(projectName || "");
  const [description, setDescription] = useState(initial.description || "");
  const [dueDate, setDueDate] = useState(formatDateForInput(initial.dueDate));
  const [teamFile, setTeamFile] = useState(null);
  const [teamFileName, setTeamFileName] = useState("");

  // ── Existing PDFs fetched from Firestore ─────────────────────────────────
  const [existingDescPdf, setExistingDescPdf] = useState(null); // { name, url }
  const [existingNotes, setExistingNotes] = useState([]); // [{ name, url, size }]
  const [removedDescPdf, setRemovedDescPdf] = useState(false); // flag: teacher removed it
  const [removedNoteUrls, setRemovedNoteUrls] = useState([]); // urls to delete on save

  // ── New uploads ───────────────────────────────────────────────────────────
  const [descPdf, setDescPdf] = useState(null);
  const [descPdfName, setDescPdfName] = useState("");
  const descPdfRef = useRef(null);

  const [notes, setNotes] = useState([]);
  const [noteError, setNoteError] = useState("");
  const notesRef = useRef(null);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [fetchingPdfs, setFetchingPdfs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const minDateLocal = new Date().toISOString().slice(0, 16);

  // ── Fetch existing PDF metadata from Firestore on mount ──────────────────
  useEffect(() => {
    const fetchProjectDoc = async () => {
      try {
        const db = getFirestore();
        const ref = doc(db, "classrooms", className, "Projects", projectName);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (data.description_pdf) setExistingDescPdf(data.description_pdf);
          if (Array.isArray(data.notes)) setExistingNotes(data.notes);
          // Also hydrate text fields if location.state was missing
          if (!initial.description && data.description)
            setDescription(data.description);
          if (!initial.dueDate && data.dueDate) {
            const d = data.dueDate.toDate
              ? data.dueDate.toDate()
              : new Date(data.dueDate);
            setDueDate(formatDateForInput(d));
          }
        }
      } catch (err) {
        console.error("Error fetching project doc:", err);
      } finally {
        setFetchingPdfs(false);
      }
    };
    fetchProjectDoc();
  }, [className, projectName]);

  // ── Team file ──────────────────────────────────────────────────────────────
  const handleTeamFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setTeamFile(file);
    setTeamFileName(file.name);
  };

  // ── Description PDF ────────────────────────────────────────────────────────
  const handleDescPdfChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Description file must be a PDF.");
      if (descPdfRef.current) descPdfRef.current.value = "";
      return;
    }
    setDescPdf(file);
    setDescPdfName(file.name);
    setError("");
  };

  // Remove the NEW upload (not yet saved)
  const removeNewDescPdf = () => {
    setDescPdf(null);
    setDescPdfName("");
    if (descPdfRef.current) descPdfRef.current.value = "";
  };

  // Remove the EXISTING saved PDF (will be deleted on save)
  const removeExistingDescPdf = () => {
    setRemovedDescPdf(true);
    setExistingDescPdf(null);
  };

  // ── Notes PDFs ─────────────────────────────────────────────────────────────
  const handleNotesChange = (e) => {
    setNoteError("");
    const incoming = Array.from(e.target.files);
    if (!incoming.length) return;

    const oversized = incoming.filter(
      (f) => f.size > MAX_NOTE_SIZE_MB * 1024 * 1024
    );
    if (oversized.length) {
      setNoteError(
        `${oversized.map((f) => f.name).join(", ")} exceed${
          oversized.length === 1 ? "s" : ""
        } the ${MAX_NOTE_SIZE_MB} MB limit.`
      );
      if (notesRef.current) notesRef.current.value = "";
      return;
    }
    const nonPdf = incoming.filter((f) => f.type !== "application/pdf");
    if (nonPdf.length) {
      setNoteError("All note files must be PDFs.");
      if (notesRef.current) notesRef.current.value = "";
      return;
    }
    const existingNames = [
      ...existingNotes.map((n) => n.name),
      ...notes.map((n) => n.name),
    ];
    const dupes = incoming.filter((f) => existingNames.includes(f.name));
    if (dupes.length) {
      setNoteError(`Already added: ${dupes.map((f) => f.name).join(", ")}.`);
      if (notesRef.current) notesRef.current.value = "";
      return;
    }
    const totalAfter = existingNotes.length + notes.length + incoming.length;
    if (totalAfter > MAX_NOTES) {
      setNoteError(
        `Total notes cannot exceed ${MAX_NOTES}. You have ${existingNotes.length} saved and ${notes.length} pending.`
      );
      if (notesRef.current) notesRef.current.value = "";
      return;
    }
    setNotes((prev) => [
      ...prev,
      ...incoming.map((f) => ({
        id: `${f.name}-${f.lastModified}`,
        file: f,
        name: f.name,
        size: f.size,
      })),
    ]);
    if (notesRef.current) notesRef.current.value = "";
  };

  const removeNewNote = (id) =>
    setNotes((prev) => prev.filter((n) => n.id !== id));
  const removeExistingNote = (url) => {
    setRemovedNoteUrls((prev) => [...prev, url]);
    setExistingNotes((prev) => prev.filter((n) => n.url !== url));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const form = new FormData();
    form.append("project_name", projName);
    form.append("description", description);
    form.append("due_date", dueDate);
    if (teamFile) form.append("team_file", teamFile);
    if (descPdf) form.append("description_pdf", descPdf);
    if (removedDescPdf) form.append("remove_description_pdf", "true");
    removedNoteUrls.forEach((url) => form.append("remove_note_urls", url));
    notes.forEach((n) => form.append("note_files", n.file));

    try {
      const res = await fetch(`${API_BASE(className, projectName)}/edit`, {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        localStorage.setItem("flashMessage", "Project updated.");
        localStorage.setItem("flashMessageType", "success");
        navigate(`/classroom/${className}/project/${projectName}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update project. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleteOpen(false);
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE(className, projectName)}/delete`, {
        method: "DELETE",
      });
      if (res.ok) {
        localStorage.setItem("flashMessage", "Project deleted.");
        localStorage.setItem("flashMessageType", "success");
        navigate(`/classroom/${className}`);
      } else {
        setError("Failed to delete project. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while deleting the project.");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalNotes = existingNotes.length + notes.length;
  const canAddMoreNotes = totalNotes < MAX_NOTES;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="ep-page">
      {/* ── Delete confirm modal ── */}
      {deleteOpen && (
        <div
          className="ep-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ep-del-title"
        >
          <div className="ep-confirm">
            <div className="ep-confirm-icon" aria-hidden="true">
              ⚠
            </div>
            <h3 id="ep-del-title">Delete this project?</h3>
            <p>
              <strong>{projectName}</strong> and all its teams, whiteboards,
              PDFs, and data will be permanently removed. This cannot be undone.
            </p>
            <div className="ep-confirm-actions">
              <button className="ep-btn-danger" onClick={handleDelete}>
                Yes, delete project
              </button>
              <button
                className="ep-btn-ghost"
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ep-card">
        {/* ── Header ── */}
        <div className="ep-header">
          <button
            className="ep-back-btn"
            type="button"
            onClick={() =>
              navigate(`/classroom/${className}/project/${projectName}`)
            }
          >
            ← Back to project
          </button>
          <h1 className="ep-title">Edit project</h1>
          <p className="ep-subtitle">
            Changes are saved on submit. Removed PDFs are deleted from storage
            permanently.
          </p>
        </div>

        {/* ── Inline error ── */}
        {error && (
          <div className="ep-error" role="alert">
            <span aria-hidden="true">✕</span>
            <span>{error}</span>
            <button
              className="ep-error-close"
              onClick={() => setError("")}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} encType="multipart/form-data" noValidate>
          {/* ════ Project details ════ */}
          <div className="ep-section-label">Project details</div>

          <div className="ep-field">
            <label htmlFor="ep-name">
              Project name{" "}
              <span className="ep-required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="ep-name"
              type="text"
              value={projName}
              onChange={(e) => setProjName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="ep-field">
            <label htmlFor="ep-desc">
              Description{" "}
              <span className="ep-required" aria-hidden="true">
                *
              </span>
            </label>
            <textarea
              id="ep-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="ep-row">
            <div className="ep-field">
              <label htmlFor="ep-due">
                Due date <span className="ep-optional">optional</span>
              </label>
              <input
                id="ep-due"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={minDateLocal}
              />
            </div>

            <div className="ep-field">
              <label>
                Team file{" "}
                <span className="ep-optional">optional · CSV or Excel</span>
              </label>
              <label htmlFor="ep-team" className="ep-file-label">
                <span className="ep-file-icon" aria-hidden="true">
                  ↑
                </span>
                <span className="ep-file-text">
                  {teamFileName || "Replace team file"}
                </span>
                <span className="ep-file-hint">
                  {teamFileName ? "Click to change" : ".csv .xls .xlsx"}
                </span>
              </label>
              <input
                id="ep-team"
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleTeamFileChange}
                className="ep-file-input"
              />
            </div>
          </div>

          {/* ════ Description PDF ════ */}
          <div className="ep-section-divider" />
          <div className="ep-section-label">
            Description PDF
            <span className="ep-optional">
              optional · one file · shown to students as project brief
            </span>
          </div>

          {fetchingPdfs ? (
            <div className="ep-loading-row">
              <span className="ep-loading-spinner" aria-hidden="true" />
              Loading saved files…
            </div>
          ) : (
            <>
              {/* Existing saved PDF */}
              {existingDescPdf && (
                <div className="ep-pdf-pill ep-pdf-pill--saved">
                  <span className="ep-pdf-pill-icon" aria-hidden="true">
                    PDF
                  </span>
                  <div className="ep-pdf-pill-info">
                    <a
                      href={existingDescPdf.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ep-pdf-pill-name ep-pdf-pill-link"
                    >
                      {existingDescPdf.name}
                    </a>
                    <span className="ep-pdf-pill-badge">Saved</span>
                  </div>
                  <button
                    type="button"
                    className="ep-pdf-pill-remove"
                    onClick={removeExistingDescPdf}
                    aria-label={`Remove ${existingDescPdf.name}`}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* New replacement upload */}
              {!existingDescPdf &&
                (descPdf ? (
                  <div className="ep-pdf-pill">
                    <span className="ep-pdf-pill-icon" aria-hidden="true">
                      PDF
                    </span>
                    <span className="ep-pdf-pill-name">{descPdfName}</span>
                    <span className="ep-pdf-pill-size">
                      {formatBytes(descPdf.size)}
                    </span>
                    <button
                      type="button"
                      className="ep-pdf-pill-remove"
                      onClick={removeNewDescPdf}
                      aria-label={`Remove ${descPdfName}`}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="ep-field">
                    <label
                      htmlFor="ep-desc-pdf"
                      className="ep-file-label ep-file-label--pdf"
                    >
                      <span
                        className="ep-file-icon ep-file-icon--pdf"
                        aria-hidden="true"
                      >
                        PDF
                      </span>
                      <span className="ep-file-text">
                        {removedDescPdf
                          ? "Upload replacement PDF"
                          : "Choose description PDF"}
                      </span>
                      <span className="ep-file-hint">.pdf only</span>
                    </label>
                    <input
                      id="ep-desc-pdf"
                      type="file"
                      accept="application/pdf"
                      onChange={handleDescPdfChange}
                      className="ep-file-input"
                      ref={descPdfRef}
                    />
                  </div>
                ))}

              {existingDescPdf && descPdf && (
                <div className="ep-field" style={{ marginTop: "0.5rem" }}>
                  <label
                    htmlFor="ep-desc-pdf"
                    className="ep-file-label ep-file-label--pdf"
                  >
                    <span
                      className="ep-file-icon ep-file-icon--pdf"
                      aria-hidden="true"
                    >
                      PDF
                    </span>
                    <span className="ep-file-text">Upload replacement PDF</span>
                    <span className="ep-file-hint">.pdf only</span>
                  </label>
                  <input
                    id="ep-desc-pdf"
                    type="file"
                    accept="application/pdf"
                    onChange={handleDescPdfChange}
                    className="ep-file-input"
                    ref={descPdfRef}
                  />
                </div>
              )}
            </>
          )}

          {/* ════ Notes PDFs ════ */}
          <div className="ep-section-divider" />
          <div className="ep-section-label">
            Notes
            <span className="ep-optional">
              optional · {totalNotes}/{MAX_NOTES} PDFs · max {MAX_NOTE_SIZE_MB}{" "}
              MB each
            </span>
          </div>
          <p className="ep-section-hint">
            Supplementary materials for students — slides, references, datasets.
            Click a saved file name to preview it. Removing a file deletes it
            from storage on save.
          </p>

          {noteError && (
            <div className="ep-note-error" role="alert">
              <span aria-hidden="true">⚠</span> {noteError}
            </div>
          )}

          {fetchingPdfs ? (
            <div className="ep-loading-row">
              <span className="ep-loading-spinner" aria-hidden="true" />
              Loading saved notes…
            </div>
          ) : (
            <>
              {/* Existing saved notes */}
              {existingNotes.length > 0 && (
                <ul className="ep-notes-list" aria-label="Saved note files">
                  {existingNotes.map((n) => (
                    <li key={n.url} className="ep-pdf-pill ep-pdf-pill--saved">
                      <span className="ep-pdf-pill-icon" aria-hidden="true">
                        PDF
                      </span>
                      <div className="ep-pdf-pill-info">
                        <a
                          href={n.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ep-pdf-pill-name ep-pdf-pill-link"
                        >
                          {n.name}
                        </a>
                        <span className="ep-pdf-pill-badge">Saved</span>
                      </div>
                      {n.size && (
                        <span className="ep-pdf-pill-size">
                          {formatBytes(n.size)}
                        </span>
                      )}
                      <button
                        type="button"
                        className="ep-pdf-pill-remove"
                        onClick={() => removeExistingNote(n.url)}
                        aria-label={`Remove ${n.name}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* New note uploads */}
              {notes.length > 0 && (
                <ul className="ep-notes-list" aria-label="Notes to be added">
                  {notes.map((n) => (
                    <li key={n.id} className="ep-pdf-pill">
                      <span className="ep-pdf-pill-icon" aria-hidden="true">
                        PDF
                      </span>
                      <span className="ep-pdf-pill-name">{n.name}</span>
                      <span className="ep-pdf-pill-size">
                        {formatBytes(n.size)}
                      </span>
                      <button
                        type="button"
                        className="ep-pdf-pill-remove"
                        onClick={() => removeNewNote(n.id)}
                        aria-label={`Remove ${n.name}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add more button */}
              {canAddMoreNotes && (
                <div className="ep-field">
                  <label
                    htmlFor="ep-notes"
                    className="ep-file-label ep-file-label--pdf"
                  >
                    <span
                      className="ep-file-icon ep-file-icon--pdf"
                      aria-hidden="true"
                    >
                      PDF
                    </span>
                    <span className="ep-file-text">
                      {totalNotes === 0 ? "Add note PDFs" : "Add more PDFs"}
                    </span>
                    <span className="ep-file-hint">
                      {totalNotes}/{MAX_NOTES} added
                    </span>
                  </label>
                  <input
                    id="ep-notes"
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={handleNotesChange}
                    className="ep-file-input"
                    ref={notesRef}
                  />
                </div>
              )}

              {existingNotes.length === 0 && notes.length === 0 && (
                <p className="ep-empty-hint">No notes attached yet.</p>
              )}
            </>
          )}

          {/* ── Actions ── */}
          <div className="ep-actions">
            <button
              type="submit"
              className="ep-btn-primary"
              disabled={isSubmitting || isDeleting || fetchingPdfs}
            >
              {isSubmitting ? (
                <>
                  <span className="ep-spinner" aria-hidden="true" /> Saving…
                </>
              ) : (
                "Save changes"
              )}
            </button>
            <button
              type="button"
              className="ep-btn-ghost"
              onClick={() =>
                navigate(`/classroom/${className}/project/${projectName}`)
              }
              disabled={isSubmitting || isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ep-btn-danger-outline"
              onClick={() => setDeleteOpen(true)}
              disabled={isSubmitting || isDeleting}
            >
              {isDeleting ? (
                <>
                  <span
                    className="ep-spinner ep-spinner--danger"
                    aria-hidden="true"
                  />{" "}
                  Deleting…
                </>
              ) : (
                "🗑 Delete project"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProject;
