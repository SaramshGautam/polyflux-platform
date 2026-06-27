import React, { useEffect, useState } from "react";
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
