import React, { useEffect, useState } from "react";
import defaultTeamPreview from "../utils/teamA.png";
import TeamCard from "./TeamCard";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import "./Project.css";

const Project = () => {
  const { className, projectName, teamName } = useParams();
  const [projectDetails, setProjectDetails] = useState({});
  const [teams, setTeams] = useState([]);
  const [studentTeamAssigned, setStudentTeamAssigned] = useState(null);
  const [role] = useState(localStorage.getItem("role"));
  const [notifying, setNotifying] = useState(false);
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
            setProjectDetails({
              description:
                projectData.description || "No description provided.",
              dueDate: due.toLocaleDateString(),
              dueTime: due.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            });
          } else {
            setProjectDetails({
              description:
                projectData.description || "No description provided.",
              dueDate: "No due date set.",
              dueTime: "",
            });
          }
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
          teamsData.push({
            name: teamDoc.id,
            members: Object.keys(teamDoc.data()),
          });
        });

        teamsData.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base",
          })
        );
        setTeams(teamsData);

        // Check student's assigned team
        if (role === "student") {
          const studentEmail = localStorage.getItem("userEmail");
          if (studentEmail) {
            const assignedTeam = teamsData.find((team) =>
              team.members.includes(studentEmail)
            );
            setStudentTeamAssigned(assignedTeam ? assignedTeam.name : null);
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

  const handleNotifyStudents = async () => {
    const yes = window.confirm(
      "Notify all students now? They'll receive an email to log in and set their passwords."
    );
    if (!yes) return;

    setNotifying(true);
    try {
      const payload = {
        role: localStorage.getItem("role") || "",
        userEmail: localStorage.getItem("userEmail") || "",
      };
      const res = await fetch(
        `https://flask-app-l7rilyhu2a-uc.a.run.app/api/classroom/${className}/notify_students`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error("Request failed:", res.status, errText);
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

      const sent = (data.results || []).filter((r) => r.sent).length;
      const total = (data.results || []).length;
      alert(`Emails sent: ${sent}/${total}`);
    } catch (err) {
      alert(`Notify failed: ${err.message}`);
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="classroom-page">
      {/* ── Title ── */}
      <h1 className="project-title">{projectName}</h1>

      {/* ── Project info strip ── */}
      <section className="project-info">
        <div className="info-item">
          <strong>Description</strong>
          <p>{projectDetails.description}</p>
        </div>
        <div className="info-item">
          <strong>Due Date</strong>
          <p>
            {projectDetails.dueDate}
            {projectDetails.dueTime && ` at ${projectDetails.dueTime}`}
          </p>
        </div>
      </section>

      {/* ── Teacher actions ── */}
      {role === "teacher" && (
        <div className="button-group">
          <button
            className="btn action-btn"
            onClick={() =>
              navigate(`/classroom/${className}/project/${projectName}/edit`, {
                state: { projectDetails },
              })
            }
          >
            <i className="bi bi-pencil-fill me-2" /> Edit Project
          </button>
          <button
            className="btn action-btn"
            onClick={() =>
              navigate(
                `/classroom/${className}/project/${projectName}/manage-teams`
              )
            }
          >
            <i className="bi bi-people me-2" /> Manage Teams
          </button>
          <button
            className="btn action-btn"
            onClick={handleNotifyStudents}
            disabled={notifying}
          >
            <i className="bi bi-envelope me-2" />
            {notifying ? "Notifying…" : "Notify Students"}
          </button>
        </div>
      )}

      {/* ── Teams section ── */}
      <section className="teams-section mt-4">
        <h2>Teams</h2>

        {teams.length > 0 ? (
          <div className="teams-list">
            {role === "student" ? (
              studentTeamAssigned ? (
                <TeamCard
                  className={className}
                  projectName={projectName}
                  team={{ name: studentTeamAssigned, members: [] }}
                  previewUrl={localStorage.getItem(
                    `preview-${className}-${projectName}-${studentTeamAssigned}`
                  )}
                  onWhiteboardClick={handleWhiteboardClick}
                />
              ) : (
                <p className="text-muted">
                  You are not assigned to any team yet.
                </p>
              )
            ) : (
              teams.map((team) => (
                <TeamCard
                  key={team.name}
                  className={className}
                  projectName={projectName}
                  team={team}
                  previewUrl={localStorage.getItem(
                    `preview-${className}-${projectName}-${team.name}`
                  )}
                  onWhiteboardClick={handleWhiteboardClick}
                />
              ))
            )}
          </div>
        ) : (
          <p className="text-muted">No teams available.</p>
        )}
      </section>

      {/* ── Back button ── */}
      <Link to={`/classroom/${className}`} className="btn back-btn mt-3">
        <i className="bi bi-arrow-left me-2" /> Back to Classroom
      </Link>
    </div>
  );
};

export default Project;
