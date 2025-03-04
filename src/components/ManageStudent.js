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

  // Fetch students from the backend
  useEffect(() => {
    if (!className) return;

    const fetchStudents = async (classID) => {
      try {
        // const response = await axios.get(`http://localhost:5000/api/classroom/${classID}/manage_students`);
        const response = await axios.get(
          `https://flask-app-jqwkqdscaq-uc.a.run.app/api/classroom/${classID}/manage_students`
        );

        console.log("Fetched Students:", response.data.students);

        // Ensure each student object has an LSU ID
        const updatedStudents = response.data.students.map((student) => ({
          ...student,
          email: student.email || student.id, // Ensure email exists
          lsuId: student.lsuId || "", // Ensure LSU ID exists
        }));

        setStudents(updatedStudents);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching students:", error);
        setLoading(false);
        addMessage("danger", "Failed to fetch students.");
      }
    };

    fetchStudents(className);
  }, [className, addMessage]);

  // Handle deleting a student using LSU ID
  const handleDelete = async (lsuId) => {
    if (!lsuId) {
      console.error("Error: LSU ID is undefined");
      addMessage("danger", "Unable to delete student: Missing LSU ID.");
      return;
    }

    try {
      console.log("Sending delete request for LSU ID:", lsuId);

      const response = await axios.post(
        // `http://localhost:5000/api/classroom/${className}/delete_student/${lsuId}`
        `https://flask-app-jqwkqdscaq-uc.a.run.app/api/classroom/${className}/delete_student/${lsuId}`
      );

      addMessage("success", response.data.message);

      // Update state after deletion by filtering out the deleted student (using LSU ID)
      setStudents((prevStudents) =>
        prevStudents.filter((student) => student.lsuId !== lsuId)
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

      {/* Add Student Button */}
      <button
        className="btn btn-dark mb-3"
        onClick={() => navigate(`/classroom/${className}/add-student`)}
      >
        <i className="bi bi-person-plus"></i> Add New Student
      </button>

      {/* Students List */}
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
                key={student.lsuId} // Use LSU ID as unique key
                className="list-group-item d-flex justify-content-between align-items-center mb-2"
              >
                <div className="d-flex flex-column">
                  {student.lastName}, {student.firstName}
                </div>
                <div className="d-flex align-items-center gap-2">
                  {/* Edit Button */}
                  <button
                    className="btn btn-sm btn-edit"
                    onClick={() =>
                      navigate(
                        `/classroom/${className}/manage-students/${encodeURIComponent(
                          student.email
                        )}/edit`
                      )
                    }
                  >
                    <i className="bi bi-pencil"></i> Edit
                  </button>

                  {/* Delete Button */}
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDelete(student.lsuId)}
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

      {/* Back Button */}
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
