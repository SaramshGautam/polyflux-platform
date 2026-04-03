import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useFlashMessage } from "../FlashMessageContext";

const ManageStudent = () => {
  const navigate = useNavigate();
  const { className } = useParams();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const addMessage = useFlashMessage();

  useEffect(() => {
    if (!className) return;

    const fetchStudents = async (classID) => {
      try {
        const response = await axios.get(
          `https://flask-app-l7rilyhu2a-uc.a.run.app/api/classroom/${classID}/manage_students`
        );

        console.log("Fetched Students:", response.data.students);

        const updatedStudents = response.data.students.map((student) => ({
          ...student,
          email: student.email || "",
          lsuId: student.lsuId || "", // now optional
        }));

        setStudents(updatedStudents);
      } catch (error) {
        console.error("Error fetching students:", error);
        addMessage("danger", "Failed to fetch students.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents(className);
  }, [className, addMessage]);

  // Delete using email instead of LSU ID
  const handleDelete = async (email) => {
    if (!email) {
      console.error("Error: email is undefined");
      addMessage("danger", "Unable to delete student: Missing email.");
      return;
    }

    try {
      console.log("Sending delete request for email:", email);

      const encodedEmail = encodeURIComponent(email);

      const response = await axios.post(
        `https://flask-app-l7rilyhu2a-uc.a.run.app/api/classroom/${className}/delete_student/${encodedEmail}`
      );

      addMessage("success", response.data.message);

      setStudents((prevStudents) =>
        prevStudents.filter((student) => student.email !== email)
      );
    } catch (error) {
      console.error("Error deleting student:", error);
      const errorMsg =
        (error.response && error.response.data && error.response.data.error) ||
        "Error deleting student.";
      addMessage("danger", errorMsg);
    }
  };

  return (
    <div className="mt-2 pt-2">
      <h1 className="classroom-heading fw-bold mb-4 fs-4">
        Manage Students for Classroom:{" "}
        <span className="text-dark">{className}</span>
      </h1>

      <button
        className="btn btn-dark mb-3"
        onClick={() => navigate(`/classroom/${className}/add-student`)}
      >
        <i className="bi bi-person-plus"></i> Add New Student
      </button>

      <div className="card border-dark">
        <div
          className="card-header"
          style={{ backgroundColor: "rgb(65, 107, 139)", color: "white" }}
        >
          <h2 className="h5">Students List</h2>
        </div>

        <ul className="list-group list-group-flush">
          {loading ? (
            <li className="list-group-item text-center text-muted">
              <i className="bi bi-hourglass-split"></i> Loading students...
            </li>
          ) : students.length > 0 ? (
            students.map((student) => (
              <li
                key={
                  student.email || `${student.firstName}-${student.lastName}`
                }
                className="list-group-item d-flex justify-content-between align-items-center mb-2"
              >
                <div className="d-flex flex-column">
                  <div>
                    {student.lastName}, {student.firstName}
                  </div>
                  <small className="text-muted">{student.email}</small>
                  {student.lsuId && (
                    <small className="text-muted">
                      LSU ID: {student.lsuId}
                    </small>
                  )}
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-sm btn-edit"
                    onClick={() =>
                      navigate(
                        `/classroom/${className}/manage-students/${encodeURIComponent(
                          student.email
                        )}/edit`
                      )
                    }
                    disabled={!student.email}
                  >
                    <i className="bi bi-pencil"></i> Edit
                  </button>

                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDelete(student.email)}
                    disabled={!student.email}
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li className="list-group-item text-center text-muted">
              No students in this classroom.
            </li>
          )}
        </ul>
      </div>

      <button
        className="btn back-btn"
        onClick={() => navigate(`/classroom/${className}`)}
      >
        <i className="bi bi-arrow-left"></i> Back to Classroom
      </button>
    </div>
  );
};

export default ManageStudent;
