import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

const Project = () => {
  const { className, projectName } = useParams();
  const [projectDetails, setProjectDetails] = useState({});
  const [teams, setTeams] = useState([]);
  const [studentTeamAssigned, setStudentTeamAssigned] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('role'));
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        const db = getFirestore();
    
        // Fetch project details
        const projectRef = doc(db, 'classrooms', className, 'Projects', projectName);
        const projectDoc = await getDoc(projectRef);
    
        if (projectDoc.exists()) {
          const projectData = projectDoc.data();
          const dueDate = projectData.dueDate
            ? (projectData.dueDate.toDate
                ? projectData.dueDate.toDate().toLocaleDateString()
                : new Date(projectData.dueDate).toLocaleDateString())
            : 'No due date set.';
          setProjectDetails({
            description: projectData.description || 'No description provided.',
            dueDate,
          });
        }
    
        // Fetch teams
        const teamsRef = collection(db, 'classrooms', className, 'Projects', projectName, 'teams');
        const teamsSnapshot = await getDocs(teamsRef);
    
        const teamsData = [];
        teamsSnapshot.forEach((teamDoc) => {
          const teamData = teamDoc.data();
          console.log(`Raw Team Data for ${teamDoc.id}:`, teamData);
    
          const teamMembers = Object.keys(teamData); // Extract LSUIDs as keys
          teamsData.push({
            name: teamDoc.id,
            members: teamMembers,
          });
        });
    
        setTeams(teamsData);
        console.log('Fetched Teams:', teamsData);
    
        // 🔹 Check student team assignment using LSUID instead of email
        if (role === 'student') {
          const studentLSUID = localStorage.getItem('LSUID'); // Use LSUID now
          console.log('Retrieved LSUID from localStorage:', studentLSUID);
    
          if (studentLSUID) {
            const assignedTeam = teamsData.find((team) =>
              team.members.includes(studentLSUID) // Match LSUID, not email
            );
    
            console.log('Assigned Team:', assignedTeam);
            setStudentTeamAssigned(assignedTeam ? assignedTeam.name : null);
          } else {
            console.error('LSUID not found in localStorage.');
          }
        }
      } catch (error) {
        console.error('Error fetching project details or teams:', error);
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
    <>
      <h1 className="project-title">{projectName}</h1>
      <p><strong>Description:</strong> {projectDetails.description}</p>
      <p><strong>Due Date:</strong> {projectDetails.dueDate}</p>

      {/* Buttons for Teachers */}
      {role === 'teacher' && (
        <div className="d-flex gap-3 mt-3">
          <button className="btn action-btn" onClick={handleEditProjectClick}>
            <i className="bi bi-pencil-fill me-2"></i> Edit Project
          </button>
          <button className="btn action-btn" onClick={handleManageTeams}>
            <i className="bi bi-people me-2"></i> Manage Teams
          </button>
        </div>
      )}

      <h2 className="teams-header mt-4">Teams</h2>
      {teams.length > 0 ? (
        <div className="team-list">
          {role === 'student' ? (
            studentTeamAssigned ? (
              <div className="team-card">
                <span className="team-name">
                  <i className="bi bi-people-fill me-2"></i> {studentTeamAssigned}
                </span>
                <div className="team-actions">
                  <Link to={`/classroom/${className}/project/${projectName}/team/${studentTeamAssigned}`} className="btn btn-view">
                    View Team
                  </Link>
                  <button className="btn btn-whiteboard" onClick={() => handleWhiteboardClick(studentTeamAssigned)}>
                    <i className="bi bi-tv"></i> Whiteboard
                  </button>
                </div>
              </div>
            ) : (
              <p className="no-team-message">You are not assigned to any team.</p>
            )
          ) : (
            teams.map((team) => (
              <div key={team.name} className="team-card">
                <span className="team-name">
                  <i className="bi bi-people-fill me-2"></i> {team.name}
                </span>
                <div className="team-actions">
                  <Link to={`/classroom/${className}/project/${projectName}/team/${team.name}`} className="btn btn-view">
                    View Team
                  </Link>
                  <button className="btn btn-whiteboard" onClick={() => handleWhiteboardClick(team.name)}>
                    <i className="bi bi-tv"></i> Whiteboard
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <p className="no-teams-message">No teams available.</p>
      )}

      <Link to={`/classroom/${className}`} className="btn back-btn" >
        <i className="bi bi-arrow-left me-2"></i> Back to Classroom
      </Link>
    </>
  );
};

export default Project;
