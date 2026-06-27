import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./StudentHome.css";

const StudentHome = () => {
  const [classrooms, setClassrooms] = useState({
    groupedClassrooms: {},
    sortedSemesters: [],
  });
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);
  const navigate = useNavigate();

  // ─── Read email from localStorage ───────────────────────────────────────
  useEffect(() => {
    const stored = (localStorage.getItem("userEmail") || "")
      .trim()
      .toLowerCase();
    setUserEmail(stored || null);
    setLoading(false);
  }, []);

  // ─── Semester sort: latest year first; Fall > Summer > Spring ───────────
  const sortSemesters = (semesters) => {
    const order = { Fall: 1, Summer: 2, Spring: 3 };
    return [...semesters].sort((a, b) => {
      if (!a || a === "undefined") return 1;
      if (!b || b === "undefined") return -1;
      const [sA, yA] = a.split(" ");
      const [sB, yB] = b.split(" ");
      const nA = parseInt(yA, 10);
      const nB = parseInt(yB, 10);
      if (isNaN(nA)) return 1;
      if (isNaN(nB)) return -1;
      if (nA !== nB) return nB - nA;
      return (order[sA] ?? 99) - (order[sB] ?? 99);
    });
  };

  // ─── Fetch classrooms this student is enrolled in ────────────────────────
  useEffect(() => {
    if (!userEmail) return;

    const fetchClassrooms = async () => {
      try {
        setLoading(true);
        const db = getFirestore();
        const classroomsSnap = await getDocs(collection(db, "classrooms"));
        const studentClassrooms = [];

        for (const classDoc of classroomsSnap.docs) {
          const classroom = classDoc.data();
          const studentsSnap = await getDocs(
            collection(db, `classrooms/${classDoc.id}/students`)
          );

          // Match by document ID (email) OR by email field on the student doc
          const enrolled = studentsSnap.docs.some((sDoc) => {
            const docId = sDoc.id.trim().toLowerCase();
            const fieldVal = (sDoc.data().email || "").trim().toLowerCase();
            return docId === userEmail || fieldVal === userEmail;
          });

          if (enrolled) {
            const teacherDoc = classroom.teacherEmail
              ? await getDoc(doc(db, "users", classroom.teacherEmail))
              : null;
            const teacherName = teacherDoc?.exists()
              ? teacherDoc.data().name
              : "Unknown";

            studentClassrooms.push({
              id: classDoc.id,
              teacherName,
              ...classroom,
            });
          }
        }

        // Group by semester
        const grouped = studentClassrooms.reduce((acc, c) => {
          const key = c.semester || "undefined";
          if (!acc[key]) acc[key] = [];
          acc[key].push(c);
          return acc;
        }, {});

        setClassrooms({
          groupedClassrooms: grouped,
          sortedSemesters: sortSemesters(Object.keys(grouped)),
        });
      } catch (err) {
        console.error("Error fetching classrooms:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClassrooms();
  }, [userEmail]);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="student-home-page">
      {loading ? (
        <p className="student-home-state">Loading...</p>
      ) : userEmail ? (
        <>
          <h1 className="student-home-title">
            <i className="bi bi-person-badge" /> Student Dashboard
          </h1>

          <div className="assigned-classrooms">
            {classrooms.sortedSemesters.length > 0 ? (
              classrooms.sortedSemesters.map((semester) => (
                <div key={semester} className="semester-section">
                  <h2 className="section-title">
                    {semester === "undefined" ? "No Semester" : semester}
                  </h2>

                  <div className="classrooms-grid">
                    {classrooms.groupedClassrooms[semester].map((classroom) => (
                      <div
                        key={classroom.id}
                        className="classroom-card"
                        onClick={() =>
                          navigate(`/classroom/${classroom.id}`, {
                            state: {
                              from: "student-home",
                              viewMode: "student",
                            },
                          })
                        }
                      >
                        <h5 className="card-title">
                          {classroom.courseID} — {classroom.class_name}
                        </h5>
                        <p className="card-instructor">
                          Instructor: {classroom.teacherName}
                        </p>
                        <span className="card-hint">View projects →</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted">
                No classrooms assigned yet. Contact your instructor if this
                looks wrong.
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="student-home-state">
          No user logged in. Please sign in to continue.
        </p>
      )}
    </div>
  );
};

export default StudentHome;
