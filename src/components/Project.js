import React, { useEffect, useState } from "react";
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
  const { className, projectName } = useParams();
  const [projectDetails, setProjectDetails] = useState({});
  const [teams, setTeams] = useState([]);
  const [studentTeamAssigned, setStudentTeamAssigned] = useState(null);
  const [role] = useState(localStorage.getItem("role"));
  const [notifying, setNotifying] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const navigate = useNavigate();

  // ─── Toast helpers ──────────────────────────────────────────────────────
  const showToast = (type, msg) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, msg }]);
    setTimeout(() => dismissToast(id), 4500);
  };
  const dismissToast = (id) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));
  const toastIcon = (type) =>
    type === "success" ? "✓" : type === "danger" ? "✕" : "⚠";

  // ─── Fetch project + teams ──────────────────────────────────────────────
  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        const db = getFirestore();

        const projectRef = doc(
          db,
          "classrooms",
          className,
          "Projects",
          projectName
        );
        const projectDoc = await getDoc(projectRef);

        if (projectDoc.exists()) {
          const data = projectDoc.data();
          if (data.dueDate) {
            const due = data.dueDate.toDate
              ? data.dueDate.toDate()
              : new Date(data.dueDate);
            setProjectDetails({
              description: data.description || "No description provided.",
              dueDate: due.toLocaleDateString(),
              dueTime: due.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            });
          } else {
            setProjectDetails({
              description: data.description || "No description provided.",
              dueDate: "No due date set.",
              dueTime: "",
            });
          }
        }

        const teamsRef = collection(
          db,
          "classrooms",
          className,
          "Projects",
          projectName,
          "teams"
        );
        const teamsSnapshot = await getDocs(teamsRef);

        const teamsData = teamsSnapshot.docs.map((d) => ({
          name: d.id,
          members: Object.keys(d.data()),
        }));

        teamsData.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base",
          })
        );
        setTeams(teamsData);

        if (role === "student") {
          const studentEmail = localStorage.getItem("userEmail");
          if (studentEmail) {
            const assignedTeam = teamsData.find((t) =>
              t.members.includes(studentEmail)
            );
            setStudentTeamAssigned(assignedTeam ? assignedTeam.name : null);
          }
        }
      } catch (error) {
        console.error("Error fetching project details or teams:", error);
        showToast("danger", "Couldn't load project details. Please refresh.");
      }
    };

    fetchProjectDetails();
  }, [className, projectName, role]);

  const handleWhiteboardClick = (teamName) => {
    navigate(`/whiteboard/${className}/${projectName}/${teamName}`);
  };

  // ─── Notify students ────────────────────────────────────────────────────
  const handleNotifyStudents = async () => {
    setConfirmOpen(false);
    setNotifying(true);
    try {
      const res = await fetch(
        `https://flask-app-l7rilyhu2a-uc.a.run.app/api/classroom/${className}/notify_students`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: localStorage.getItem("role") || "",
            userEmail: localStorage.getItem("userEmail") || "",
          }),
          credentials: "include",
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error("Notify failed:", res.status, errText);
        showToast("danger", "Failed to send notifications. Please try again.");
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : await res.text();
      const sent = (data.results || []).filter((r) => r.sent).length;
      const total = (data.results || []).length;
      showToast("success", `Emails sent to ${sent} of ${total} students.`);
    } catch (err) {
      showToast("danger", `Notify failed: ${err.message}`);
    } finally {
      setNotifying(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="classroom-page">
      {/* ── Toasts ── */}
      <div className="lsu-toast-container" aria-live="polite">
        {toasts.map(({ id, type, msg }) => (
          <div key={id} className={`lsu-toast lsu-toast--${type}`} role="alert">
            <span className="lsu-toast-icon" aria-hidden="true">
              {toastIcon(type)}
            </span>
            <span className="lsu-toast-msg">{msg}</span>
            <button
              className="lsu-toast-close"
              onClick={() => dismissToast(id)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* ── Confirm modal ── */}
      {confirmOpen && (
        <div
          className="proj-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="proj-confirm">
            <h3 id="confirm-title">Notify all students?</h3>
            <p>They'll receive an email to log in and set their passwords.</p>
            <div className="proj-confirm-actions">
              <button className="btn action-btn" onClick={handleNotifyStudents}>
                Send emails
              </button>
              <button
                className="btn back-btn"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Title ── */}
      <h1 className="project-title">{projectName}</h1>

      {/* ── Project info strip ── */}
      <section className="project-info">
        <div className="info-item">
          <strong>Description</strong>
          <p>{projectDetails.description}</p>
        </div>
        <div className="info-item">
          <strong>Due date</strong>
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
            <i className="bi bi-pencil-fill" /> Edit project
          </button>
          <button
            className="btn action-btn"
            onClick={() =>
              navigate(
                `/classroom/${className}/project/${projectName}/manage-teams`
              )
            }
          >
            <i className="bi bi-people" /> Manage teams
          </button>
          <button
            className="btn action-btn"
            onClick={() => setConfirmOpen(true)}
            disabled={notifying}
          >
            <i className="bi bi-envelope" />
            {notifying ? "Notifying…" : "Notify students"}
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
                  You haven't been assigned to a team yet.
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
          <p className="text-muted">No teams yet.</p>
        )}
      </section>

      {/* ── Back button ── */}
      <Link to={`/classroom/${className}`} className="btn back-btn mt-3">
        <i className="bi bi-arrow-left" /> Back to classroom
      </Link>
    </div>
  );
};

export default Project;
