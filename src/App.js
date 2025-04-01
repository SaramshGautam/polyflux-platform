import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useParams } from "react-router-dom";

// Importing pages
import LoginPage from "./components/LoginPage";
import TeachersHome from "./components/TeachersHome";
import StudentsHome from "./components/StudentsHome";
import Classroom from "./components/Classroom";
import AddProject from "./components/AddProject";
import AddStudent from "./components/AddStudent";
import AddClassroom from "./components/AddClassroom";
import ManageTeams from "./components/ManageTeam";
import Project from "./components/Project";
import EditProject from "./components/EditProject";
import EditStudent from "./components/EditStudent";
import ManageStudent from "./components/ManageStudent";
import EditClassroom from "./components/EditClassroom";
import Team from "./components/Team";
import "./style.css";

// import firebaseConfig from "./firebaseConfig";

// Firebase imports
// import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDocs,
  collection,
  orderBy,
  query,
} from "firebase/firestore";
import { app, db, auth, googleProvider, storage } from "./firebaseConfig";
import {
  Tldraw,
  DefaultToolbar,
  TldrawUiMenuItem,
  useTools,
  useIsToolSelected,
  DefaultToolbarContent,
} from "tldraw";
import { useSyncDemo } from "@tldraw/sync";
import "tldraw/tldraw.css";
import "./App.css";
import CustomContextMenu from "./components/CustomContextMenu";
import Navbar from "./components/navbar/Navbar";
import ContextToolbarComponent from "./components/ContextToolbarComponent";
import CustomActionsMenu from "./components/CustomActionsMenu";

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const googleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken(); // Get ID token

      // Send the ID token to the backend for validation
      // const response = await fetch("http://localhost:5000/api/login", {
      const response = await fetch(
        "https://flask-app-jqwkqdscaq-uc.a.run.app/api/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idToken: idToken }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Handle successful login based on the role
        if (data.role === "teacher") {
          navigate("/teachers-home");
        } else if (data.role === "student") {
          navigate("/students-home");
        }
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Google login failed:", error);
    }
  };

  return (
    <Routes>
      {/* Login Page */}
      <Route path="/" element={<LoginPage onLogin={googleLogin} />} />

      {/* Teacher's Home */}
      <Route
        path="/teachers-home"
        element={
          <>
            <Navbar />
            <TeachersHome />
          </>
        }
      />

      {/* Student's Home */}
      <Route
        path="/students-home"
        element={
          <>
            <Navbar />
            <StudentsHome />
          </>
        }
      />

      {/* Classroom Management */}
      <Route
        path="/classroom/:className"
        element={
          <>
            <Navbar />
            <Classroom />
          </>
        }
      />
      <Route
        path="/classroom/:className/add-project"
        element={
          <>
            <Navbar />
            <AddProject />
          </>
        }
      />
      <Route
        path="/classroom/:className/add-student"
        element={
          <>
            <Navbar />
            <AddStudent />
          </>
        }
      />
      <Route
        path="/classroom/:className/project/:projectName"
        element={
          <>
            <Navbar />
            <Project />
          </>
        }
      />
      <Route
        path="/classroom/:className/project/:projectName/edit"
        element={
          <>
            <Navbar />
            <EditProject />
          </>
        }
      />
      <Route
        path="/classroom/:className/project/:projectName/team/:teamName"
        element={
          <>
            <Navbar />
            <Team />
          </>
        }
      />
      <Route
        path="/classroom/:className/edit"
        element={
          <>
            <Navbar />
            <EditClassroom />
          </>
        }
      />

      {/* Manage Students */}
      <Route
        path="/classroom/:className/manage-students"
        element={
          <>
            <Navbar />
            <ManageStudent />
          </>
        }
      />
      <Route
        path="/classroom/:className/manage-students/:studentId/edit"
        element={
          <>
            <Navbar />
            <EditStudent />
          </>
        }
      />
      <Route
        path="/classroom/:className/manage-students/add-student"
        element={
          <>
            <Navbar />
            <AddStudent />
          </>
        }
      />
      <Route
        path="/classroom/:className/project/:projectName/manage-teams"
        element={
          <>
            <Navbar />
            <ManageTeams />
          </>
        }
      />

      {/* Add Classroom */}
      <Route
        path="/add-classroom"
        element={
          <>
            <Navbar />
            <AddClassroom />
          </>
        }
      />

      {/* Collaborative Whiteboard */}
      <Route
        path="/whiteboard/:className/:projectName/:teamName"
        element={<CollaborativeWhiteboard />}
      />
    </Routes>
  );
};

const CollaborativeWhiteboard = () => {
  const { className, projectName, teamName } = useParams();
  const roomId = `collaBoard-${className}-${projectName}-${teamName}`;
  const store = useSyncDemo({ roomId }); // Use the unique roomId

  const [shapeReactions, setShapeReactions] = useState({});
  const [selectedShape, setSelectedShape] = useState(null);
  const [commentCounts, setCommentCounts] = useState({});
  const [comments, setComments] = useState({});
  const [actionHistory, setActionHistory] = useState([]);

  const fetchActionHistory = async (userContext, setActionHistory) => {
    if (!userContext) return;

    console.log(`---- User Context --- ${userContext}`);

    const { className, projectName, teamName } = userContext;
    const historyRef = collection(
      db,
      `classrooms/${className}/Projects/${projectName}/teams/${teamName}/history`
    );

    try {
      const q = query(historyRef, orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      const historyLogs = querySnapshot.docs.map((doc) => doc.data());
      console.log("History Logs ---- \n", historyLogs);

      setActionHistory(historyLogs);
    } catch (error) {
      console.error("❌ Error fetching history:", error);
    }
  };

  // Fetch logs when component mounts
  useEffect(() => {
    if (!className || !projectName || !teamName) return;

    const userContext = { className, projectName, teamName };
    fetchActionHistory(userContext, setActionHistory);
  }, [className, projectName, teamName]);

  const components = {
    Navbar: Navbar,
    ContextMenu: CustomContextMenu,
    InFrontOfTheCanvas: ContextToolbarComponent,
    Toolbar: DefaultToolbar,
    // Toolbar: CustomToolbar,
    ActionsMenu: CustomActionsMenu,
  };

  const addComment = (shapeId, commentData) => {
    console.log("Adding comment for shapeId:", shapeId);

    const commentDataWithTime = {
      ...commentData,
      timestamp: new Date().toLocaleString(),
    };

    setComments((prevComments) => {
      const updatedComments = {
        ...prevComments,
        [shapeId]: [...(prevComments[shapeId] || []), commentDataWithTime],
      };
      return updatedComments;
    });

    setCommentCounts((prevCounts) => {
      const updatedCounts = {
        ...prevCounts,
        [shapeId]: (prevCounts[shapeId] || 0) + 1,
      };
      return updatedCounts;
    });
  };

  return (
    <div className="main-container" style={{ position: "fixed", inset: 0 }}>
      <Navbar />
      <Tldraw
        store={store}
        // tools={customTools}
        // overrides={uiOverrides}
        components={{
          ContextMenu: (props) => (
            <CustomContextMenu
              {...props}
              shapeReactions={shapeReactions}
              setShapeReactions={setShapeReactions}
              selectedShape={selectedShape}
              setSelectedShape={setSelectedShape}
              commentCounts={commentCounts}
              setCommentCounts={setCommentCounts}
              comments={comments}
              setComments={setComments}
              actionHistory={actionHistory}
              setActionHistory={setActionHistory}
            />
          ),
          InFrontOfTheCanvas: (props) => (
            <ContextToolbarComponent
              {...props}
              selectedShape={selectedShape}
              setShapeReactions={setShapeReactions}
              shapeReactions={shapeReactions}
              commentCounts={commentCounts}
              // onReactionClick={handleReactionClick}
              addComment={addComment}
              setActionHistory={setActionHistory}
              fetchActionHistory={fetchActionHistory}
            />
          ),
          // Toolbar: CustomToolbar,
          ActionsMenu: (props) => <CustomActionsMenu {...props} />,
        }}
      />
    </div>
  );
};
export default App;
