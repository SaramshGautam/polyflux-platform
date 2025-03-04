import React, { useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const AddStudent = () => {
  const { className } = useParams();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [lsuId, setLsuId] = useState(""); // New state for LSU ID
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate(); // Use navigate hook

  const handleFirstNameChange = (event) => setFirstName(event.target.value);
  const handleLastNameChange = (event) => setLastName(event.target.value);
  const handleEmailChange = (event) => setEmail(event.target.value);
  const handleLsuIdChange = (event) => setLsuId(event.target.value); // Handler for LSU ID

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    // Prepare student data to send
    const studentData = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      lsu_id: lsuId, // Including LSU ID in the data
    };

    try {
      // Make sure the URL is correctly formed
      // await axios.post(`http://localhost:5000/api/classroom/${className}/add_student`, studentData);
      await axios.post(
        `https://flask-app-jqwkqdscaq-uc.a.run.app/api/classroom/${className}/add_student`,
        studentData
      );
      alert(`Student ${firstName} ${lastName} added successfully!`);
    } catch (error) {
      console.error("Error adding student:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackClick = () => {
    navigate(`/classroom/${className}/manage-students`); // Navigate programmatically
  };

  return (
    <div className="container form-container mt-4">
      <h1 className="form-title fw-bold mb-4 fs-4">
        <i className="bi bi-person-plus-fill me-2"></i> Add New Student
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="first_name" className="form-label">
            <i className="bi bi-person-fill"></i> First Name
          </label>
          <input
            type="text"
            name="first_name"
            id="first_name"
            className="form-control"
            required
            value={firstName}
            onChange={handleFirstNameChange}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="last_name" className="form-label">
            <i className="bi bi-person-fill"></i> Last Name
          </label>
          <input
            type="text"
            name="last_name"
            id="last_name"
            className="form-control"
            required
            value={lastName}
            onChange={handleLastNameChange}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">
            <i className="bi bi-envelope"></i> Email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            className="form-control"
            required
            value={email}
            onChange={handleEmailChange}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="lsu_id" className="form-label">
            <i className="bi bi-card-text"></i> LSU ID
          </label>
          <input
            type="text"
            name="lsu_id"
            id="lsu_id"
            className="form-control"
            required
            value={lsuId}
            onChange={handleLsuIdChange} // Handling LSU ID change
          />
        </div>
        <div className="d-flex justify-content-start gap-3 mt-4">
          <button
            type="submit"
            className="btn action-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span
                className="spinner-border spinner-border-sm"
                aria-hidden="true"
              ></span>
            ) : (
              <i className="bi bi-plus-circle"></i>
            )}
            <span>{isSubmitting ? "Adding..." : "Add Student"}</span>
          </button>
          <button
            type="button"
            className="btn back-btn"
            onClick={handleBackClick}
          >
            <i className="bi bi-arrow-left"></i> Back to Manage Students
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddStudent;
