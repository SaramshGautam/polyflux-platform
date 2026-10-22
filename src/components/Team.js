import React, { useEffect, useState } from "react";
import { FLASK_API_URL } from "../config/api";
import { useParams, useNavigate } from "react-router-dom";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import "./Team.css";

const Team = () => {
  const { className, projectName, teamName } = useParams();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // ── Instructor-facing AI alignment check ──────────────────────────────────
  const role = localStorage.getItem("role");
  const [alignment, setAlignment] = useState(null); // { status, aligned, score, message } | { error }
  const [checkingAlignment, setCheckingAlignment] = useState(false);

  const runAlignmentCheck = async () => {
    setCheckingAlignment(true);
    setAlignment(null);
    try {
      const res = await fetch(
        `${FLASK_API_URL}/api/classroom/${className}/project/${projectName}/team/${teamName}/check_alignment`
      );
      const data = await res.json();
      setAlignment(data);
    } catch (e) {
      setAlignment({ error: "Could not reach the AI backend. It may be starting up — try again shortly." });
    } finally {
      setCheckingAlignment(false);
    }
  };

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setLoading(true);
        const db = getFirestore();
        const decodedClassName = decodeURIComponent(className);
        const decodedProjectName = decodeURIComponent(projectName);
        const decodedTeamName = decodeURIComponent(teamName);

        const teamRef = doc(
          db,
          "classrooms",
          decodedClassName,
          "Projects",
          decodedProjectName,
          "teams",
          decodedTeamName
        );
        const teamSnapshot = await getDoc(teamRef);

        if (teamSnapshot.exists()) {
          const members = [];
          const teamData = teamSnapshot.data();

          for (const [LSUID] of Object.entries(teamData)) {
            const userSnapshot = await getDoc(doc(db, "users", LSUID));
            if (userSnapshot.exists()) {
              const userData = userSnapshot.data();
              members.push({
                LSUID,
                name: userData.name || "Unknown",
              });
            } else {
              members.push({ LSUID, name: "Unknown" });
            }
          }
          setTeamMembers(members);
        } else {
          setError(`No members found in team "${decodedTeamName}"`);
        }
      } catch (err) {
        setError("An error occurred while fetching team details.");
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, [className, projectName, teamName]);

  const getInitial = (name) => {
    if (!name || name === "Unknown") return "?";
    const display = typeof name === "object" ? `${name.firstName || ""}` : name;
    return display.charAt(0).toUpperCase();
  };

  const getDisplayName = (name) => {
    if (!name) return "Unknown";
    if (typeof name === "object") return `${name.lastName}, ${name.firstName}`;
    return name;
  };

  return (
    <div className="team-container mt-2 pt-2">
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : teamMembers.length > 0 ? (
        <>
          {/* ── Title ── */}
          <h1 className="dashboard-title mb-2">
            <i className="bi bi-person-workspace" /> {teamName}
          </h1>
          <h3 className="section-title mb-4">
            {projectName} · {decodeURIComponent(className)}
          </h3>

          {/* ── Members card ── */}
          <div className="team-members mb-4">
            <h5>Team Members</h5>
            <ul>
              {teamMembers.map((member, idx) => (
                <li key={idx} data-initial={getInitial(member.name)}>
                  <strong>{getDisplayName(member.name)}</strong>
                </li>
              ))}
            </ul>
          </div>

          {/* ── AI alignment check (instructor-only) ── */}
          {role === "teacher" && (
            <div className="team-alignment-card mb-4">
              <div className="team-alignment-header">
                <h5>AI Alignment Check</h5>
                <button
                  className="btn action-btn"
                  onClick={runAlignmentCheck}
                  disabled={checkingAlignment}
                >
                  <i className="bi bi-stars me-2" />
                  {checkingAlignment ? "Checking…" : "Check Alignment"}
                </button>
              </div>

              {checkingAlignment && (
                <p className="team-alignment-hint">
                  Comparing this team's whiteboard text and board image to the
                  project description — this can take a minute, especially
                  the first check, since reading the board image needs its
                  own model to wake up.
                </p>
              )}

              {!checkingAlignment && alignment?.error && (
                <p className="team-alignment-error">{alignment.error}</p>
              )}

              {!checkingAlignment && alignment?.status === "not_enough_content" && (
                <p className="team-alignment-hint">{alignment.message}</p>
              )}

              {!checkingAlignment && alignment?.status === "ok" && (
                <div
                  className={`team-alignment-result ${
                    alignment.aligned ? "is-aligned" : "is-off-track"
                  }`}
                >
                  <p className="team-alignment-verdict">
                    {alignment.aligned
                      ? "✅ On track — this team's work lines up with the project description."
                      : "⚠️ Possibly off-track from the project description."}
                    {typeof alignment.score === "number" && (
                      <span className="team-alignment-score">
                        {" "}
                        (similarity: {alignment.score.toFixed(2)})
                      </span>
                    )}
                  </p>
                  {alignment.message && (
                    <p className="team-alignment-note">
                      AI suggestion for the team: “{alignment.message}”
                    </p>
                  )}
                  {alignment.image_caption && (
                    <p className="team-alignment-caption">
                      AI read the board image as: “{alignment.image_caption}”
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="action-buttons mb-2">
            <button
              className="btn action-btn"
              onClick={() =>
                navigate(`/whiteboard/${className}/${projectName}/${teamName}`)
              }
            >
              <i className="bi bi-tv me-2" /> Open Whiteboard
            </button>
            <button
              className="btn back-btn"
              onClick={() =>
                navigate(`/classroom/${className}/project/${projectName}`)
              }
            >
              <i className="bi bi-arrow-left me-2" /> Back to Project
            </button>
          </div>
        </>
      ) : (
        <p>No team data available.</p>
      )}
    </div>
  );
};

export default Team;
