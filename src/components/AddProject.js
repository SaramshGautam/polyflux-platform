import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const AddProject = () => {
  const { className } = useParams();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [teamFile, setTeamFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [role] = useState(localStorage.getItem("role"));
  const [userEmail] = useState(localStorage.getItem("userEmail"));

  const handleFileChange = (e) => {
    setTeamFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const optionalMissing = !dueDate || dueDate.trim() === "" || !teamFile;
    if (optionalMissing) {
      const confirmed = window.confirm(
        [
          "You left one or more optional fields blank:",
          !dueDate ? "- Due Date" : null,
          !teamFile ? "- Team CSV/Excel file" : null,
          "",
          "Proceed anyway?",
        ]
          .filter(Boolean)
          .join("\n")
      );
      if (!confirmed) return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("project_name", projectName);
    formData.append("description", description);
    if (dueDate) formData.append("due_date", dueDate);
    if (teamFile) formData.append("team_file", teamFile);

    formData.append("role", role || "");
    formData.append("userEmail", userEmail || "");

    try {
      // const response = await axios.post(
      //   `http://localhost:5000/api/add_project/${className}`,
      //   formData,
      //   {
      const response = await axios.post(
        `https://flask-app-l7rilyhu2a-uc.a.run.app/api/add_project/${className}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            // Authorization: `Bearer ${role}:${userEmail}`,
            Accept: "application/json",
            // "Access-Control-Allow-Origin": "https://colla-board.vercel.app/",
          },
        }
      );

      setErrorMessage("");
      // alert(response.data.message);
      alert(response.data.message || "Project added.");
      navigate(`/classroom/${className}`);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Something went wrong!"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const minDateLocal = new Date().toISOString().slice(0, 16);

  return (
    <div className="container form-container mt-4">
      <h1 className="form-title">Add New Project</h1>

      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div className="mb-3">
          <label htmlFor="project_name" className="form-label">
            Project Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            id="project_name"
            className="form-control"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor="description" className="form-label">
            Project Description <span className="text-danger">*</span>
          </label>
          <textarea
            id="description"
            className="form-control"
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor="due_date" className="form-label">
            Due Date <small className="text-muted">(optional)</small>
          </label>
          <input
            type="datetime-local"
            id="due_date"
            className="form-control"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            min={minDateLocal}
            // required
            // min={new Date().toISOString().slice(0, 16)}
          />
        </div>

        <div className="mb-3">
          <label htmlFor="team_file" className="form-label">
            Team CSV/Excel File <small className="text-muted">(optional)</small>
          </label>
          <input
            type="file"
            id="team_file"
            className="form-control"
            accept=".csv, .xls, .xlsx"
            onChange={handleFileChange}
          />
        </div>

        {errorMessage && (
          <div className="alert alert-danger">{errorMessage}</div>
        )}

        <div className="d-flex justify-content-start gap-3">
          <button
            type="submit"
            className="btn action-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm"></span>{" "}
                Uploading...
              </>
            ) : (
              <>
                <i className="bi bi-upload"></i> Upload
              </>
            )}
          </button>
          <button
            type="button"
            className="btn back-btn"
            onClick={() => navigate(`/classroom/${className}`)}
          >
            <i className="bi bi-arrow-left"></i> Back to Classroom
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProject;
