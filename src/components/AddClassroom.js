import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AddClassroom.css";

const API_URL = "https://flask-app-l7rilyhu2a-uc.a.run.app/addclassroom";

const SEMESTERS = [
  "Spring 2025",
  "Summer 2025",
  "Fall 2025",
  "Spring 2026",
  "Summer 2026",
  "Fall 2026",
];

const AddClassroom = () => {
  const navigate = useNavigate();

  const [className, setClassName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [semester, setSemester] = useState("");
  const [studentFile, setStudentFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const role = localStorage.getItem("role");
  const userEmail = localStorage.getItem("userEmail");

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!className || !courseId || !semester || !studentFile) {
      setError("Please fill in all fields and attach a student file.");
      return;
    }

    const formData = new FormData();
    formData.append("class_name", className);
    formData.append("course_id", courseId);
    formData.append("semester", semester);
    formData.append("student_file", studentFile);
    formData.append("role", role);
    formData.append("userEmail", userEmail);

    try {
      setIsSubmitting(true);
      const response = await axios.post(API_URL, formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
      });

      // Pass success message to TeacherHome via localStorage
      localStorage.setItem(
        "flashMessage",
        response.data.message || "Classroom created."
      );
      localStorage.setItem("flashMessageType", "success");
      navigate("/teachers-home");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        "Failed to create classroom. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ac-page">
      <div className="ac-card">
        {/* ── Header ── */}
        <div className="ac-header">
          <button
            className="ac-back-btn"
            type="button"
            onClick={() => navigate("/teachers-home")}
            aria-label="Back to dashboard"
          >
            ← Back
          </button>
          <h1 className="ac-title">Add classroom</h1>
          <p className="ac-subtitle">
            Fill in the details and upload your class roster to get started.
          </p>
        </div>

        {/* ── Inline error ── */}
        {error && (
          <div className="ac-error" role="alert">
            <span className="ac-error-icon" aria-hidden="true">
              ✕
            </span>
            <span>{error}</span>
            <button
              className="ac-error-close"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} encType="multipart/form-data" noValidate>
          <div className="ac-row">
            <div className="ac-field">
              <label htmlFor="class_name">Class name</label>
              <input
                id="class_name"
                type="text"
                placeholder="e.g. Intro to Fluid Mechanics"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="ac-field">
              <label htmlFor="course_id">Course ID</label>
              <input
                id="course_id"
                type="text"
                placeholder="e.g. ME 3333"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="ac-field">
            <label htmlFor="semester">Semester</label>
            <select
              id="semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              required
            >
              <option value="">Select a semester</option>
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* ── File upload ── */}
          <div className="ac-field">
            <label>Student roster</label>
            <label htmlFor="student_file" className="ac-file-label">
              <span className="ac-file-icon" aria-hidden="true">
                ↑
              </span>
              <span className="ac-file-text">
                {fileName ? fileName : "Choose CSV or Excel file"}
              </span>
              <span className="ac-file-hint">
                {fileName ? "Click to change" : ".csv, .xls, .xlsx"}
              </span>
            </label>
            <input
              id="student_file"
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileChange}
              className="ac-file-input"
              required
            />
          </div>

          {/* ── Actions ── */}
          <div className="ac-actions">
            <button
              type="submit"
              className="ac-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="ac-spinner" aria-hidden="true" />
                  Uploading…
                </>
              ) : (
                "Create classroom"
              )}
            </button>
            <button
              type="button"
              className="ac-btn-ghost"
              onClick={() => navigate("/teachers-home")}
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

export default AddClassroom;
