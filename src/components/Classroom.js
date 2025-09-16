import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import "./Classroom.css";
const Classroom = () => {
  const { className } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [role] = useState(localStorage.getItem("role"));
  const [userEmail] = useState(localStorage.getItem("userEmail"));
  const db = getFirestore();
  const [loading, setLoading] = useState(true);
  const [courseDetails, setCourseDetails] = useState({}); // Store course details (course name, course ID)

  useEffect(() => {
    const fetchClassroomData = async () => {
      try {
        // Fetch course details like course ID and course name
        const courseRef = collection(db, "classrooms");
        const courseSnapshot = await getDocs(courseRef);
        const courseData = courseSnapshot.docs
          .find((doc) => doc.id === className)
          ?.data();

        // Set course details
        if (courseData) {
          setCourseDetails({
            courseId: courseData.courseID,
            courseName: courseData.class_name,
          });
        }

        // Fetch projects for the classroom
        const projectsRef = collection(db, "classrooms", className, "Projects");
        const querySnapshot = await getDocs(projectsRef);
        const projectsData = querySnapshot.docs.map((doc) => ({
          projectName: doc.data().projectName,
          description: doc.data().description,
          dueDate: doc.data().dueDate,
        }));

        setProjects(projectsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching classroom data:", error);
      }
    };

    fetchClassroomData();
  }, [className, db]);

  // Helpers (add above the component return)

  const toDateObj = (val) => {
    if (!val) return null;

    // Firestore Timestamp (client SDK)
    if (typeof val?.toDate === "function") return val.toDate();

    // Firestore-like { seconds, nanoseconds }
    if (typeof val === "object" && val.seconds != null) {
      return new Date(val.seconds * 1000);
    }

    // ISO or other string
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDueDate = (val) => {
    const d = toDateObj(val);
    if (!d) return "No due date set";

    const now = new Date();
    const diffMs = d.setSeconds(0, 0) - now.setSeconds(0, 0);
    const oneDay = 24 * 60 * 60 * 1000;

    const dtf = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const pretty = dtf.format(d);

    if (diffMs < -oneDay) return `Past due (was ${pretty})`;
    if (diffMs < 0) return `Past due (was ${pretty})`; // same-day past
    if (diffMs < oneDay) return `Due today (${pretty})`;

    const days = Math.round(diffMs / oneDay);
    if (days === 1) return `Due tomorrow (${pretty})`;
    if (days <= 7) return `Due in ${days} days (${pretty})`;

    return `Due ${pretty}`;
  };

  return (
    <div className="classroom-page">
      <h1 className="classroom-title">
        {courseDetails.courseName} ({courseDetails.courseId})
      </h1>

      {role === "teacher" && (
        <div className="button-group">
          <button
            className="btn action-btn"
            onClick={() => navigate(`/classroom/${className}/add-project`)}
          >
            <i className="bi bi-folder-plus me-2"></i> Add Project
          </button>
          <button
            className="btn action-btn"
            onClick={() => navigate(`/classroom/${className}/manage-students`)}
          >
            <i className="bi bi-people me-2"></i> Manage Students
          </button>
          <button
            className="btn action-btn"
            onClick={() => navigate(`/classroom/${className}/edit`)}
          >
            <i className="bi bi-pencil-square me-2"></i> Edit Classroom
          </button>
        </div>
      )}

      <h2 className="section-title">Projects</h2>

      {loading ? (
        <p>Loading projects...</p>
      ) : (
        <div className="projects-grid">
          {projects.length > 0 ? (
            projects.map((project, index) => (
              <div
                key={index}
                className="project-card"
                onClick={() =>
                  navigate(
                    `/classroom/${className}/project/${project.projectName}`
                  )
                }
              >
                <h5>{project.projectName}</h5>
                <p className="project-description">
                  <strong>Description:</strong>{" "}
                  {project.description
                    ? project.description.length > 100
                      ? `${project.description.substring(0, 100)}...`
                      : project.description
                    : "No description provided"}
                </p>

                {/* <p className="project-due-date">
                  <strong>Due Date:</strong>{" "}
                  {new Date(project.dueDate).toLocaleDateString()}
                </p> */}
                <p className="project-due-date">
                  <strong>Due:</strong> {formatDueDate(project.dueDate)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-muted">No projects available.</p>
          )}
        </div>
      )}

      <button
        className="btn back-btn mt-3"
        onClick={() =>
          navigate(role === "teacher" ? "/teachers-home" : "/students-home")
        }
      >
        <i className="bi bi-arrow-left"></i> Back to Dashboard
      </button>
    </div>
  );
};

export default Classroom;
