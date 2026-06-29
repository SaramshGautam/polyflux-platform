import React, { useState, useEffect } from "react";
import "./TeachersHome.css";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const TeacherHome = () => {
  const [classrooms, setClassrooms] = useState({
    groupedClassrooms: {},
    sortedSemesters: [],
  });
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);
  const [teacherNames, setTeacherNames] = useState({});
  const [toasts, setToasts] = useState([]);

  const navigate = useNavigate();
  const auth = getAuth();

  // ─── Toast helpers ──────────────────────────────────────────────────────
  const showToast = (type, msg) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, msg }]);
    setTimeout(() => dismissToast(id), 4500);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toastIcon = (type) => {
    if (type === "success") return "✓";
    if (type === "danger") return "✕";
    return "⚠";
  };

  // ─── Auth ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
      } else {
        setUserEmail(null);
        setClassrooms({ groupedClassrooms: {}, sortedSemesters: [] });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  // ─── Pick up flash messages left by other pages (e.g. after redirect) ──
  useEffect(() => {
    const message = localStorage.getItem("flashMessage");
    const messageType = localStorage.getItem("flashMessageType");
    if (message) {
      showToast(messageType === "error" ? "danger" : "success", message);
      localStorage.removeItem("flashMessage");
      localStorage.removeItem("flashMessageType");
    }
  }, []);

  // ─── Semester sort ──────────────────────────────────────────────────────
  const sortSemesters = (semesters) => {
    const order = { Fall: 1, Summer: 2, Spring: 3 };
    return [...semesters].sort((a, b) => {
      const [semA, yearA] = a.split(" ");
      const [semB, yearB] = b.split(" ");
      if (yearB !== yearA) return parseInt(yearB) - parseInt(yearA);
      return order[semA] - order[semB];
    });
  };

  // ─── Fetch classrooms ───────────────────────────────────────────────────
  useEffect(() => {
    if (!userEmail) return;

    const fetchClassrooms = async () => {
      try {
        setLoading(true);
        const db = getFirestore();
        const snapshot = await getDocs(collection(db, "classrooms"));

        const mine = snapshot.docs
          .filter((d) => d.data().teacherEmail === userEmail)
          .map((d) => ({ id: d.id, ...d.data() }));

        const grouped = mine.reduce((acc, classroom) => {
          const { semester } = classroom;
          if (!acc[semester]) acc[semester] = [];
          acc[semester].push(classroom);
          return acc;
        }, {});

        const sortedSemesters = sortSemesters(Object.keys(grouped));

        // Fetch instructor display names
        const emails = [...new Set(mine.map((c) => c.teacherEmail))];
        const names = {};
        await Promise.all(
          emails.map(async (email) => {
            try {
              const snap = await getDoc(doc(db, "users", email));
              names[email] = snap.exists() ? snap.data().name : "Unknown";
            } catch {
              names[email] = "Unknown";
            }
          })
        );

        setTeacherNames(names);
        setClassrooms({ groupedClassrooms: grouped, sortedSemesters });
      } catch (error) {
        console.error("Error fetching classrooms:", error);
        showToast("danger", "Couldn't load classrooms. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    fetchClassrooms();
  }, [userEmail]);

  // ─── Render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="teacher-dashboard">
        <p>Loading your classrooms…</p>
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="teacher-dashboard">
        <p>No user signed in. Please sign in to continue.</p>
      </div>
    );
  }

  const { groupedClassrooms, sortedSemesters } = classrooms;

  return (
    <div className="teacher-dashboard mt-4">
      {/* ── Toasts ── */}
      <div
        className="lsu-toast-container"
        aria-live="polite"
        aria-atomic="false"
      >
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

      <h1 className="dashboard-title center-title mb-4">Teacher's Dashboard</h1>

      <div className="classrooms-list">
        {sortedSemesters.length > 0 ? (
          sortedSemesters.map((semester, semesterIndex) => (
            <div key={semester} className="semester-section">
              <h4 className={semester === "Fall 2025" ? "fall-2025" : ""}>
                {semester}
              </h4>

              <div className="classrooms-grid">
                {groupedClassrooms[semester].map((classroom) => (
                  <div
                    key={classroom.id}
                    className="classroom-card"
                    onClick={() => navigate(`/classroom/${classroom.classID}`)}
                  >
                    <div className="card-title">
                      <h4>
                        {classroom.courseID} — {classroom.class_name}
                      </h4>
                    </div>
                    <div className="card-text">
                      {teacherNames[classroom.teacherEmail] ||
                        classroom.teacherEmail ||
                        "—"}
                    </div>
                  </div>
                ))}

                {/* Add classroom card appears after the latest semester */}
                {semesterIndex === 0 && (
                  <div
                    className="classroom-card add-classroom-card"
                    onClick={() => navigate("/add-classroom")}
                  >
                    <h4>+ Add classroom</h4>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          /* Empty state — no classrooms yet */
          <div className="classrooms-grid">
            <div
              className="classroom-card add-classroom-card"
              onClick={() => navigate("/add-classroom")}
            >
              <h4>+ Add classroom</h4>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherHome;
