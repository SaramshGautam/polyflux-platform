import React, { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./AddProject.css";

const API_URL = (className) =>
  `https://flask-app-l7rilyhu2a-uc.a.run.app/api/add_project/${className}`;

const MAX_NOTE_SIZE_MB = 10;
const MAX_NOTES = 10;

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AddProject = () => {
  const { className } = useParams();
  const navigate = useNavigate();

  // ── Core fields ──────────────────────────────────────────────────────────
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [teamFile, setTeamFile] = useState(null);
  const [teamFileName, setTeamFileName] = useState("");

  // ── PDF: description (single) ────────────────────────────────────────────
  const [descPdf, setDescPdf] = useState(null);
  const [descPdfName, setDescPdfName] = useState("");
  const descPdfRef = useRef(null);

  // ── PDFs: notes (multiple) ───────────────────────────────────────────────
  // Each entry: { id, file, name, size }
  const [notes, setNotes] = useState([]);
  const [noteError, setNoteError] = useState("");
  const notesRef = useRef(null);

  // ── Submit state ─────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [missingFields, setMissingFields] = useState([]);

  const role = localStorage.getItem("role") || "";
  const userEmail = localStorage.getItem("userEmail") || "";
  const minDateLocal = new Date().toISOString().slice(0, 16);

  // ── Team file ─────────────────────────────────────────────────────────────
  const handleTeamFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setTeamFile(file);
    setTeamFileName(file.name);
  };

  // ── Description PDF ───────────────────────────────────────────────────────
  const handleDescPdfChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Description file must be a PDF.");
      descPdfRef.current.value = "";
      return;
    }
    setDescPdf(file);
    setDescPdfName(file.name);
    setError("");
  };

  const removeDescPdf = () => {
    setDescPdf(null);
    setDescPdfName("");
    if (descPdfRef.current) descPdfRef.current.value = "";
  };

  // ── Notes PDFs ────────────────────────────────────────────────────────────
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

    const existing = notes.map((n) => n.name);
    const dupes = incoming.filter((f) => existing.includes(f.name));
    if (dupes.length) {
      setNoteError(`Already added: ${dupes.map((f) => f.name).join(", ")}.`);
      if (notesRef.current) notesRef.current.value = "";
      return;
    }

    const combined = [
      ...notes,
      ...incoming.map((f) => ({
        id: `${f.name}-${f.lastModified}`,
        file: f,
        name: f.name,
        size: f.size,
      })),
    ];

    if (combined.length > MAX_NOTES) {
      setNoteError(`You can attach at most ${MAX_NOTES} note files.`);
      if (notesRef.current) notesRef.current.value = "";
      return;
    }

    setNotes(combined);
    if (notesRef.current) notesRef.current.value = "";
  };

  const removeNote = (id) =>
    setNotes((prev) => prev.filter((n) => n.id !== id));

  // ── Submit ────────────────────────────────────────────────────────────────
  const submitForm = async () => {
    setConfirmOpen(false);
    setIsSubmitting(true);
    setError("");

    const formData = new FormData();
    formData.append("project_name", projectName);
    formData.append("description", description);
    if (dueDate) formData.append("due_date", dueDate);
    if (teamFile) formData.append("team_file", teamFile);
    if (descPdf) formData.append("description_pdf", descPdf);
    notes.forEach((n) => formData.append("note_files", n.file));
    formData.append("role", role);
    formData.append("userEmail", userEmail);

    try {
      const response = await axios.post(API_URL(className), formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
      });
      localStorage.setItem(
        "flashMessage",
        response.data.message || "Project created."
      );
      localStorage.setItem("flashMessageType", "success");
      navigate(`/classroom/${className}`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const missing = [
      !dueDate && "Due date",
      !teamFile && "Team CSV/Excel file",
      !descPdf && "Description PDF",
      notes.length === 0 && "Note files",
    ].filter(Boolean);

    if (missing.length > 0) {
      setMissingFields(missing);
      setConfirmOpen(true);
      return;
    }

    submitForm();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ap-page">
      {/* ── Confirm modal ── */}
      {confirmOpen && (
        <div
          className="ap-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ap-confirm-title"
        >
          <div className="ap-confirm">
            <h3 id="ap-confirm-title">Some optional fields are empty</h3>
            <p>You left the following blank:</p>
            <ul className="ap-missing-list">
              {missingFields.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p>You can add these later. Continue without them?</p>
            <div className="ap-confirm-actions">
              <button className="ap-btn-primary" onClick={submitForm}>
                Continue anyway
              </button>
              <button
                className="ap-btn-ghost"
                onClick={() => setConfirmOpen(false)}
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ap-card">
        {/* ── Header ── */}
        <div className="ap-header">
          <button
            className="ap-back-btn"
            type="button"
            onClick={() => navigate(`/classroom/${className}`)}
          >
            ← Back
          </button>
          <h1 className="ap-title">Add project</h1>
          <p className="ap-subtitle">
            Fill in the details below. All file uploads are optional and can be
            added later.
          </p>
        </div>

        {/* ── Inline error ── */}
        {error && (
          <div className="ap-error" role="alert">
            <span className="ap-error-icon" aria-hidden="true">
              ✕
            </span>
            <span>{error}</span>
            <button
              className="ap-error-close"
              onClick={() => setError("")}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} encType="multipart/form-data" noValidate>
          {/* ════ Section: Basic info ════ */}
          <div className="ap-section-label">Project details</div>

          <div className="ap-field">
            <label htmlFor="project_name">
              Project name{" "}
              <span className="ap-required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="project_name"
              type="text"
              placeholder="e.g. Bridge Load Analysis"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="ap-field">
            <label htmlFor="description">
              Description{" "}
              <span className="ap-required" aria-hidden="true">
                *
              </span>
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="What should students accomplish in this project?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="ap-row">
            <div className="ap-field">
              <label htmlFor="due_date">
                Due date <span className="ap-optional">optional</span>
              </label>
              <input
                id="due_date"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={minDateLocal}
              />
            </div>

            <div className="ap-field">
              <label>
                Team file{" "}
                <span className="ap-optional">optional · CSV or Excel</span>
              </label>
              <label htmlFor="team_file" className="ap-file-label">
                <span className="ap-file-icon" aria-hidden="true">
                  ↑
                </span>
                <span className="ap-file-text">
                  {teamFileName || "Choose file"}
                </span>
                <span className="ap-file-hint">
                  {teamFileName ? "Click to change" : ".csv .xls .xlsx"}
                </span>
              </label>
              <input
                id="team_file"
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleTeamFileChange}
                className="ap-file-input"
              />
            </div>
          </div>

          {/* ════ Section: Description PDF ════ */}
          <div className="ap-section-divider" />
          <div className="ap-section-label">
            Description PDF
            <span className="ap-optional">optional · one file</span>
          </div>
          <p className="ap-section-hint">
            A single PDF that students see as the official project brief —
            problem statement, rubric, deliverables, etc.
          </p>

          <div className="ap-field">
            {descPdf ? (
              <div className="ap-pdf-pill">
                <span className="ap-pdf-pill-icon" aria-hidden="true">
                  PDF
                </span>
                <span className="ap-pdf-pill-name">{descPdfName}</span>
                <span className="ap-pdf-pill-size">
                  {formatBytes(descPdf.size)}
                </span>
                <button
                  type="button"
                  className="ap-pdf-pill-remove"
                  onClick={removeDescPdf}
                  aria-label={`Remove ${descPdfName}`}
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <label
                  htmlFor="desc_pdf"
                  className="ap-file-label ap-file-label--pdf"
                >
                  <span
                    className="ap-file-icon ap-file-icon--pdf"
                    aria-hidden="true"
                  >
                    PDF
                  </span>
                  <span className="ap-file-text">Choose description PDF</span>
                  <span className="ap-file-hint">.pdf only</span>
                </label>
                <input
                  id="desc_pdf"
                  type="file"
                  accept="application/pdf"
                  onChange={handleDescPdfChange}
                  className="ap-file-input"
                  ref={descPdfRef}
                />
              </>
            )}
          </div>

          {/* ════ Section: Note PDFs ════ */}
          <div className="ap-section-divider" />
          <div className="ap-section-label">
            Notes
            <span className="ap-optional">
              optional · up to {MAX_NOTES} PDFs · max {MAX_NOTE_SIZE_MB} MB each
            </span>
          </div>
          <p className="ap-section-hint">
            Supplementary materials — lecture slides, reference papers,
            datasets, any extra resources students need.
          </p>

          {noteError && (
            <div className="ap-note-error" role="alert">
              <span aria-hidden="true">⚠</span> {noteError}
            </div>
          )}

          {/* Existing notes list */}
          {notes.length > 0 && (
            <ul className="ap-notes-list" aria-label="Attached note files">
              {notes.map((n) => (
                <li key={n.id} className="ap-pdf-pill">
                  <span className="ap-pdf-pill-icon" aria-hidden="true">
                    PDF
                  </span>
                  <span className="ap-pdf-pill-name">{n.name}</span>
                  <span className="ap-pdf-pill-size">
                    {formatBytes(n.size)}
                  </span>
                  <button
                    type="button"
                    className="ap-pdf-pill-remove"
                    onClick={() => removeNote(n.id)}
                    aria-label={`Remove ${n.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add more notes button — hidden once limit reached */}
          {notes.length < MAX_NOTES && (
            <div className="ap-field">
              <label
                htmlFor="note_files"
                className="ap-file-label ap-file-label--pdf"
              >
                <span
                  className="ap-file-icon ap-file-icon--pdf"
                  aria-hidden="true"
                >
                  PDF
                </span>
                <span className="ap-file-text">
                  {notes.length === 0 ? "Choose note PDFs" : "Add more PDFs"}
                </span>
                <span className="ap-file-hint">
                  {notes.length}/{MAX_NOTES} added
                </span>
              </label>
              <input
                id="note_files"
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleNotesChange}
                className="ap-file-input"
                ref={notesRef}
              />
            </div>
          )}

          {/* ── Actions ── */}
          <div className="ap-actions">
            <button
              type="submit"
              className="ap-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="ap-spinner" aria-hidden="true" /> Creating…
                </>
              ) : (
                "Create project"
              )}
            </button>
            <button
              type="button"
              className="ap-btn-ghost"
              onClick={() => navigate(`/classroom/${className}`)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProject;
