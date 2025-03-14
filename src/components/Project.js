import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";

const Project = () => {
  const { className, projectName } = useParams();
  const [projectDetails, setProjectDetails] = useState({});
  const [teams, setTeams] = useState([]);
  const [studentTeamAssigned, setStudentTeamAssigned] = useState(null);
  const [role, setRole] = useState(localStorage.getItem("role"));
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        const db = getFirestore();

        // Fetch project details
        const projectRef = doc(
          db,
          "classrooms",
          className,
          "Projects",
          projectName
        );
        const projectDoc = await getDoc(projectRef);

        if (projectDoc.exists()) {
          const projectData = projectDoc.data();
          if (projectData.dueDate) {
            const due = projectData.dueDate.toDate
              ? projectData.dueDate.toDate()
              : new Date(projectData.dueDate);
            const formattedDate = due.toLocaleDateString();
            const formattedTime = due.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            setProjectDetails({
              description:
                projectData.description || "No description provided.",
              dueDate: formattedDate,
              dueTime: formattedTime,
            });
          } else {
            setProjectDetails({
              description:
                projectData.description || "No description provided.",
              dueDate: "No due date set.",
              dueTime: "",
            });
          }
        } else {
          console.warn("No project data found.");
        }

        // Fetch teams
        const teamsRef = collection(
          db,
          "classrooms",
          className,
          "Projects",
          projectName,
          "teams"
        );
        const teamsSnapshot = await getDocs(teamsRef);

        const teamsData = [];
        teamsSnapshot.forEach((teamDoc) => {
          const teamData = teamDoc.data();
          const teamMembers = Object.keys(teamData);
          teamsData.push({
            name: teamDoc.id,
            members: teamMembers,
          });
        });

        setTeams(teamsData);

        // Check student team assignment using email
        if (role === "student") {
          const studentEmail = localStorage.getItem("userEmail");
          if (studentEmail) {
            const assignedTeam = teamsData.find((team) =>
              team.members.includes(studentEmail)
            );
            setStudentTeamAssigned(assignedTeam ? assignedTeam.name : null);
          } else {
            console.error("Email not found in localStorage.");
          }
        }
      } catch (error) {
        console.error("Error fetching project details or teams:", error);
      }
    };

    fetchProjectDetails();
  }, [className, projectName, role]);

  const handleWhiteboardClick = (teamName) => {
    navigate(`/whiteboard/${className}/${projectName}/${teamName}`);
  };

  const handleManageTeams = () => {
    navigate(`/classroom/${className}/project/${projectName}/manage-teams`);
  };

  const handleEditProjectClick = () => {
    navigate(`/classroom/${className}/project/${projectName}/edit`, {
      state: { projectDetails },
    });
  };

  return (
    <div className="classroom-page">
      <header>
        <h1 className="project-title">Project: {projectName}</h1>
      </header>

      <section className="project-info">
        <div className="info-item">
          <strong>Description:</strong>
          <p>{projectDetails.description}</p>
        </div>
        <div className="info-item">
          <strong>Due Date:</strong>
          <p>
            {projectDetails.dueDate}
            {projectDetails.dueTime && ` at ${projectDetails.dueTime}`}
          </p>
        </div>
      </section>

      {role === "teacher" && (
        <div className="button-group mt-3">
          <button className="btn action-btn" onClick={handleEditProjectClick}>
            <i className="bi bi-pencil-fill me-2"></i> Edit Project
          </button>
          <button className="btn action-btn" onClick={handleManageTeams}>
            <i className="bi bi-people me-2"></i> Manage Teams
          </button>
        </div>
      )}

      <section className="teams-section mt-4">
        <h2>Teams</h2>
        {teams.length > 0 ? (
          <div className="teams-list">
            {role === "student" ? (
              studentTeamAssigned ? (
                <div
                  className={`card team-card ${
                    role === "student" ? "student" : ""
                  }`}
                >
                  <div className="card-body">
                    <h5 className="card-title">
                      <i className="bi bi-people-fill me-2"></i>{" "}
                      {studentTeamAssigned}
                    </h5>
                    <div className="d-flex justify-content-around">
                      <Link
                        to={`/classroom/${className}/project/${projectName}/team/${studentTeamAssigned}`}
                        className="btn btn-view"
                      >
                        View Team
                      </Link>
                      <button
                        className="btn btn-whiteboard"
                        onClick={() =>
                          handleWhiteboardClick(studentTeamAssigned)
                        }
                      >
                        <i className="bi bi-tv"></i> Whiteboard
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted">
                  You are not assigned to any team yet.
                </p>
              )
            ) : (
              teams.map((team) => (
                <div key={team.name} className="card team-card">
                  <div className="card-body">
                    <h5 className="card-title">
                      <i className="bi bi-people-fill me-2"></i> {team.name}
                    </h5>
                    <div className="d-flex justify-content-around">
                      <Link
                        to={`/classroom/${className}/project/${projectName}/team/${team.name}`}
                        className="btn btn-view"
                      >
                        View Team
                      </Link>
                      <button
                        className="btn btn-whiteboard"
                        onClick={() => handleWhiteboardClick(team.name)}
                      >
                        <i className="bi bi-tv"></i> Whiteboard
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <p className="text-muted">No teams available.</p>
        )}
      </section>

      <Link to={`/classroom/${className}`} className="btn back-btn mt-3">
        <i className="bi bi-arrow-left me-2"></i> Back to Classroom
      </Link>
    </div>
  );
};

export default Project;
