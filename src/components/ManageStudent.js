import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./ManageStudent.css";

const API = "https://flask-app-l7rilyhu2a-uc.a.run.app";

const ManageStudent = () => {
  const navigate = useNavigate();
  const { className } = useParams();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null); // { email, name }
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState("");

  // ── Toasts ──────────────────────────────────────────────────────────────
  const showToast = (type, msg) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, type, msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  };
  const toastIcon = (t) => (t === "success" ? "✓" : t === "danger" ? "✕" : "⚠");

  // ── Fetch students ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!className) return;
    const fetch_ = async () => {
      try {
        const res = await axios.get(
          `${API}/api/classroom/${className}/manage_students`
        );
        setStudents(
          res.data.students.map((s) => ({
            ...s,
            email: s.email || "",
            lsuId: s.lsuId || "",
          }))
        );
      } catch {
        showToast("danger", "Failed to fetch students.");
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [className]);

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget?.email) return;
    setIsDeleting(true);
    try {
      const res = await axios.post(
        `${API}/api/classroom/${className}/delete_student/${encodeURIComponent(
          deleteTarget.email
        )}`
      );
      showToast("success", res.data.message || "Student removed.");
      setStudents((p) => p.filter((s) => s.email !== deleteTarget.email));
    } catch (err) {
      showToast(
        "danger",
        err?.response?.data?.error || "Error deleting student."
      );
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.lsuId && s.lsuId.toLowerCase().includes(q))
    );
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="ms-page">
      {/* ── Toasts ── */}
      <div className="lsu-toast-container" aria-live="polite">
        {toasts.map(({ id, type, msg }) => (
          <div key={id} className={`lsu-toast lsu-toast--${type}`} role="alert">
            <span className="lsu-toast-icon" aria-hidden="true">
              {toastIcon(type)}
            </span>
            <span className="lsu-toast-msg">{msg}</span>
            <button
              className="lsu-toast-close"
              onClick={() => setToasts((p) => p.filter((t) => t.id !== id))}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <div
          className="ms-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ms-del-title"
        >
          <div className="ms-confirm">
            <div className="ms-confirm-icon" aria-hidden="true">
              ⚠
            </div>
            <h3 id="ms-del-title">Remove this student?</h3>
            <p>
              <strong>{deleteTarget.name}</strong> will be removed from this
              classroom and all associated teams. This cannot be undone.
            </p>
            <div className="ms-confirm-actions">
              <button
                className="ms-btn-danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span
                      className="ms-spinner ms-spinner--white"
                      aria-hidden="true"
                    />{" "}
                    Removing…
                  </>
                ) : (
                  "Yes, remove student"
                )}
              </button>
              <button
                className="ms-btn-ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="ms-header">
        <button
          className="ms-back-btn"
          onClick={() => navigate(`/classroom/${className}`)}
        >
          ← Back to classroom
        </button>
        <div className="ms-header-row">
          <div>
            <h1 className="ms-title">Students</h1>
            <p className="ms-subtitle">
              {className}
              {!loading &&
                ` · ${students.length} student${
                  students.length !== 1 ? "s" : ""
                }`}
            </p>
          </div>
          <button
            className="ms-btn-primary"
            onClick={() => navigate(`/classroom/${className}/add-student`)}
          >
            + Add student
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="ms-search-wrap">
        <span className="ms-search-icon" aria-hidden="true">
          ⌕
        </span>
        <input
          className="ms-search"
          type="text"
          placeholder="Search by name, email, or LSU ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="ms-search-clear"
            onClick={() => setSearch("")}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Student list ── */}
      <div className="ms-card">
        {loading ? (
          <div className="ms-state">
            <span className="ms-loading-spinner" aria-hidden="true" />
            Loading students…
          </div>
        ) : filtered.length === 0 ? (
          <div className="ms-state">
            {search
              ? `No students match "${search}".`
              : "No students in this classroom yet."}
          </div>
        ) : (
          <ul className="ms-list" aria-label="Student list">
            {filtered.map((student) => (
              <li
                key={
                  student.email || `${student.firstName}-${student.lastName}`
                }
                className="ms-row"
              >
                <div className="ms-avatar" aria-hidden="true">
                  {(student.firstName?.charAt(0) || "?").toUpperCase()}
                </div>
                <div className="ms-info">
                  <span className="ms-name">
                    {student.lastName}, {student.firstName}
                  </span>
                  <span className="ms-email">{student.email}</span>
                  {student.lsuId && (
                    <span className="ms-lsuid">LSU ID: {student.lsuId}</span>
                  )}
                </div>
                <div className="ms-actions">
                  <button
                    className="ms-btn-edit"
                    onClick={() =>
                      navigate(
                        `/classroom/${className}/manage-students/${encodeURIComponent(
                          student.email
                        )}/edit`
                      )
                    }
                    disabled={!student.email}
                    aria-label={`Edit ${student.firstName} ${student.lastName}`}
                  >
                    ✎ Edit
                  </button>
                  <button
                    className="ms-btn-remove"
                    onClick={() =>
                      setDeleteTarget({
                        email: student.email,
                        name: `${student.firstName} ${student.lastName}`,
                      })
                    }
                    disabled={!student.email}
                    aria-label={`Remove ${student.firstName} ${student.lastName}`}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Bottom back button ── */}
      <button
        className="ms-back-btn-bottom"
        onClick={() => navigate(`/classroom/${className}`)}
      >
        ← Back to classroom
      </button>
    </div>
  );
};

export default ManageStudent;
