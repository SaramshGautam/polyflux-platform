import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const EditStudent = () => {
  // studentId is now expected to be the actual email (e.g., "gracia@gmail.com")
  const { className, studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState({
    firstName: "",
    lastName: "",
    email: "",
    lsuId: "",
  });

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        console.log(`Fetching data for student: ${studentId}`);
        const response = await axios.get(
          // `http://localhost:5000/api/classroom/${className}/edit_student/${studentId}`
          `https://flask-app-l7rilyhu2a-uc.a.run.app/api/classroom/${className}/edit_student/${studentId}`
        );
        console.log("Student Data Fetched:", response.data.student); // Debugging log
        setStudent(response.data.student);
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.error("Student not found.");
        } else if (error.response && error.response.status === 400) {
          console.error("Invalid email format.");
        } else {
          console.error("Unexpected error fetching student data:", error);
        }
      }
    };

    fetchStudentData();
  }, [className, studentId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStudent((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.put(
        // `http://localhost:5000/api/classroom/${className}/edit_student/${studentId}`,
        `https://flask-app-l7rilyhu2a-uc.a.run.app/api/classroom/${className}/edit_student/${studentId}`,
        student
      );
      navigate(`/classroom/${className}/manage-students`);
    } catch (error) {
      console.error("Error updating student data:", error);
    }
  };

  return (
    <div className="container form-container mt-4">
      <h1 className="form-title fw-bold mb-4 fs-4">
        Edit Student: {student.firstName} {student.lastName}
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="first_name" className="form-label">
            <i className="bi bi-person-fill"></i> First Name:
          </label>
          <input
            type="text"
            name="firstName"
            id="first_name"
            className="form-control"
            value={student.firstName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="last_name" className="form-label">
            <i className="bi bi-person-fill"></i> Last Name:
          </label>
          <input
            type="text"
            name="lastName"
            id="last_name"
            className="form-control"
            value={student.lastName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">
            <i className="bi bi-envelope"></i> Email:
          </label>
          <input
            type="email"
            name="email"
            id="email"
            className="form-control"
            value={student.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="lsuId" className="form-label">
            <i className="bi bi-card-list"></i> LSU ID:
          </label>
          <input
            type="text"
            name="lsuId"
            id="lsuId"
            className="form-control"
            value={student.lsuId || ""}
            onChange={handleChange}
            required
          />
        </div>
        <div className="d-flex justify-content-start gap-3 mt-4">
          <button type="submit" className="btn action-btn">
            <i className="bi bi-check-circle"></i> Save Changes
          </button>
          <button
            type="button"
            className="btn back-btn"
            onClick={() => navigate(`/classroom/${className}/manage-students`)}
          >
            <i className="bi bi-arrow-left"></i> Back to Manage Students
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditStudent;
