import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const EditProject = () => {
  const { className, projectName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialProjectDetails = location.state?.projectDetails || {
    description: '',
    dueDate: '',
  };

  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    projectName: projectName || '',
    description: initialProjectDetails.description,
    dueDate: formatDateForInput(initialProjectDetails.dueDate),
    teamFile: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const form = new FormData();
    form.append('project_name', formData.projectName);
    form.append('description', formData.description);
    form.append('due_date', formData.dueDate);
    if (formData.teamFile) {
      form.append('team_file', formData.teamFile);
    }

    fetch(`/api/classroom/${className}/project/${projectName}/edit`, {
      method: 'POST',
      body: form,
    })
      .then((response) => {
        if (response.ok) {
          navigate(`/classroom/${className}/project/${projectName}`);
        } else {
          alert('Failed to update project. Please try again.');
        }
      })
      .catch((error) => {
        console.error('Error updating project:', error);
        alert('An error occurred. Please try again.');
      });
  };

  // **Delete Project Function**
  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this project? This action cannot be undone."
    );
    if (!confirmDelete) return;
  
    try {
      const response = await fetch(`/api/classroom/${className}/project/${projectName}/delete`, {
        method: 'DELETE',
      });
  
      if (response.ok) {
        navigate(`/classroom/${className}`); // Navigate back to the classroom after deletion
      } else {
        alert('Failed to delete project. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('An error occurred while deleting the project.');
    }
  };  

  return (
    <div className="container form-container mt-4">
      <h1 className="form-title">Edit Project</h1>

      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div className="mb-3">
          <label htmlFor="projectName" className="form-label">Project Name</label>
          <input
            type="text"
            id="projectName"
            name="projectName"
            className="form-control"
            value={formData.projectName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor="description" className="form-label">Project Description</label>
          <textarea
            id="description"
            name="description"
            className="form-control"
            rows="4"
            value={formData.description}
            onChange={handleChange}
            required
          ></textarea>
        </div>

        <div className="mb-3">
          <label htmlFor="dueDate" className="form-label">Due Date</label>
          <input
            type="datetime-local"
            id="dueDate"
            name="dueDate"
            className="form-control"
            value={formData.dueDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor="teamFile" className="form-label">Upload Team File (CSV/Excel) (Optional)</label>
          <input
            type="file"
            id="teamFile"
            name="teamFile"
            className="form-control"
            onChange={handleChange}
          />
        </div>

        <div className="d-flex justify-content-start gap-3">
          <button type="submit" className="btn action-btn">
            <i className="bi bi-save"></i> Update
          </button>
          <button
            type="button"
            className="btn back-btn" 
            onClick={() => navigate(`/classroom/${className}/project/${projectName}`)}
          >
            <i className="bi bi-arrow-left"></i> Back to Project
          </button>
          <button
            type="button"
            className="btn delete-btn"
            onClick={handleDelete}
          >
            <i className="bi bi-trash"></i> Delete Project
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProject;
