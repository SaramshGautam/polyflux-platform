import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import "./EditClassroom.css";

const SEMESTERS = [
  "Spring 2025",
  "Summer 2025",
  "Fall 2025",
  "Spring 2026",
  "Summer 2026",
  "Fall 2026",
];

const EditClassroom = () => {
  const { className } = useParams();
  const navigate = useNavigate();
  const db = getFirestore();

  const [classroomData, setClassroomData] = useState({
    className: "",
    courseId: "",
    semester: "",
  });
  const [studentFile, setStudentFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ── Fetch classroom data ──────────────────────────────────────────────────
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const snap = await getDoc(doc(db, "classrooms", className));
        if (snap.exists()) {
          const d = snap.data();
          setClassroomData({
            className: d.class_name || "",
            courseId: d.courseID || "",
            semester: d.semester || "",
          });
        } else {
          setError("Classroom not found.");
        }
      } catch {
        setError("Failed to fetch classroom details.");
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [className, db]);

  // ── File change ───────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (![".csv", ".xls", ".xlsx"].includes(ext)) {
      setError("Invalid file format. Please upload a CSV or Excel file.");
      setStudentFile(null);
      setFileName("");
      return;
    }
    setError("");
    setStudentFile(file);
    setFileName(file.name);
  };

  // ── Update ────────────────────────────────────────────────────────────────
  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !classroomData.className ||
      !classroomData.courseId ||
      !classroomData.semester
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "classrooms", className), {
        class_name: classroomData.className,
        courseID: classroomData.courseId,
        semester: classroomData.semester,
      });

      if (studentFile) {
        const formData = new FormData();
        formData.append("student_file", studentFile);
        await axios.post(
          `https://flask-app-l7rilyhu2a-uc.a.run.app/update-students/${className}`,
          formData,
          {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
      }

      localStorage.setItem("flashMessage", "Classroom updated successfully.");
      localStorage.setItem("flashMessageType", "success");
      navigate(`/classroom/${className}`);
    } catch {
      setError("Failed to update classroom. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleteOpen(false);
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "classrooms", className));
      localStorage.setItem("flashMessage", "Classroom deleted.");
      localStorage.setItem("flashMessageType", "success");
      navigate("/teachers-home");
    } catch {
      setError("Failed to delete classroom. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const set = (key) => (e) =>
    setClassroomData((p) => ({ ...p, [key]: e.target.value }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ec-page">
      {/* ── Delete confirm modal ── */}
      {deleteOpen && (
        <div
          className="ec-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ec-del-title"
        >
          <div className="ec-confirm">
            <div className="ec-confirm-icon" aria-hidden="true">
              ⚠
            </div>
            <h3 id="ec-del-title">Delete this classroom?</h3>
            <p>
              <strong>{classroomData.className}</strong> and all its projects,
              teams, and student data will be permanently removed. This cannot
              be undone.
            </p>
            <div className="ec-confirm-actions">
              <button className="ec-btn-danger" onClick={handleDelete}>
                Yes, delete classroom
              </button>
              <button
                className="ec-btn-ghost"
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ec-card">
        {/* ── Header ── */}
        <div className="ec-header">
          <button
            className="ec-back-btn"
            type="button"
            onClick={() => navigate("/teachers-home")}
          >
            ← Back to dashboard
          </button>
          <h1 className="ec-title">Edit classroom</h1>
          <p className="ec-subtitle">
            {loading
              ? "Loading…"
              : `${classroomData.courseId} · ${classroomData.semester}`}
          </p>
        </div>

        {/* ── Inline error ── */}
        {error && (
          <div className="ec-error" role="alert">
            <span aria-hidden="true">✕</span>
            <span>{error}</span>
            <button
              className="ec-error-close"
              onClick={() => setError("")}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleUpdate} encType="multipart/form-data" noValidate>
          <div className="ec-section-label">Classroom details</div>

          <div className="ec-row">
            <div className="ec-field">
              <label htmlFor="ec-classname">
                Class name{" "}
                <span className="ec-required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="ec-classname"
                type="text"
                placeholder="e.g. Intro to Fluid Mechanics"
                value={classroomData.className}
                onChange={set("className")}
                required
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="ec-field">
              <label htmlFor="ec-courseid">
                Course ID{" "}
                <span className="ec-required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="ec-courseid"
                type="text"
                placeholder="e.g. ME 3333"
                value={classroomData.courseId}
                onChange={set("courseId")}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="ec-row">
            <div className="ec-field">
              <label htmlFor="ec-semester">
                Semester{" "}
                <span className="ec-required" aria-hidden="true">
                  *
                </span>
              </label>
              <select
                id="ec-semester"
                value={classroomData.semester}
                onChange={set("semester")}
                required
                disabled={loading}
              >
                <option value="">Select a semester</option>
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="ec-field">
              <label>
                Student roster{" "}
                <span className="ec-optional">
                  optional · replaces existing
                </span>
              </label>
              <label htmlFor="ec-file" className="ec-file-label">
                <span className="ec-file-icon" aria-hidden="true">
                  ↑
                </span>
                <span className="ec-file-text">
                  {fileName || "Upload updated roster"}
                </span>
                <span className="ec-file-hint">
                  {fileName ? "Click to change" : ".csv .xls .xlsx"}
                </span>
              </label>
              <input
                id="ec-file"
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileChange}
                className="ec-file-input"
                disabled={loading}
              />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="ec-actions">
            <button
              type="submit"
              className="ec-btn-primary"
              disabled={isSubmitting || isDeleting || loading}
            >
              {isSubmitting ? (
                <>
                  <span className="ec-spinner" aria-hidden="true" /> Saving…
                </>
              ) : (
                "Save changes"
              )}
            </button>
            <button
              type="button"
              className="ec-btn-ghost"
              onClick={() => navigate("/teachers-home")}
              disabled={isSubmitting || isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ec-btn-danger-outline"
              onClick={() => setDeleteOpen(true)}
              disabled={isSubmitting || isDeleting || loading}
            >
              {isDeleting ? (
                <>
                  <span
                    className="ec-spinner ec-spinner--danger"
                    aria-hidden="true"
                  />{" "}
                  Deleting…
                </>
              ) : (
                "🗑 Delete classroom"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditClassroom;
