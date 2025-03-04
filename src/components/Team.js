import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

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
  
        // Fetch the team members from the 'teams' subcollection
        const teamRef = doc(
          db,
          'classrooms',
          decodedClassName,
          'Projects',
          decodedProjectName,
          'teams',
          decodedTeamName
        );
  
        const teamSnapshot = await getDoc(teamRef);
  
        if (teamSnapshot.exists()) {
          const members = [];
          const teamData = teamSnapshot.data();
  
          // Loop through each LSUID in the team
          for (const [LSUID, _] of Object.entries(teamData)) {
            // Fetch student details from the 'users' collection
            const userRef = doc(db, 'users', LSUID);
            const userSnapshot = await getDoc(userRef);
  
            if (userSnapshot.exists()) {
              const userData = userSnapshot.data();
              members.push({
                LSUID: LSUID,
                name: userData.name || "Unknown Name", // Get name in "Last, First" format
              });
            } else {
              members.push({ LSUID: LSUID, name: "Unknown Name" });
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

  const handleWhiteboardClick = () => {
    navigate(`/whiteboard/${className}/${projectName}/${teamName}`);
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
          <h1 className="dashboard-title mb-4">
            <i className="bi bi-person-workspace"></i> Team: {teamName}
          </h1>
          <h3 className="section-title mb-3">Project: {projectName}</h3>

          <div className="team-members mb-4">
  <h5 className="mb-3">Team Members</h5>
  {teamMembers.length > 0 ? (
    <ul>
      {teamMembers.map((member, idx) => (
        <li key={idx}>
          <strong>
            {typeof member.name === "object"
              ? `${member.name.lastName}, ${member.name.firstName}`
              : member.name}
          </strong>
          
        </li>
      ))}
    </ul>
  ) : (
    <p>No members in this team.</p>
  )}
</div>



          {/* Whiteboard Button */}
          <div className="action-buttons mb-4">
            <button
              onClick={handleWhiteboardClick}
              className="btn action-btn" 
            >
              <i className="bi bi-tv"></i> Open Whiteboard
            </button>
          </div>

          <div className="action-buttons mb-4">
          <button
            type="button"
            className="btn back-btn"
            onClick={() => navigate(`/classroom/${className}/project/${projectName}`)}
          >
            <i className="bi bi-arrow-left me-2"></i> Back to Project
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
