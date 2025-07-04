import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import "./InactivityMonitor.css"; // Style this floating panel

export default function InactivityMonitor({
  className,
  projectName,
  teamName,
}) {
  const [threshold, setThreshold] = useState(2 * 60 * 1000); // 2 minutes default
  const [activityData, setActivityData] = useState([]);

  // useEffect(() => {
  //   const fetchActivity = async () => {
  //     // const ref = collection(
  //     //   db,
  //     //   `classrooms/${className}/Projects/${projectName}/teams/${teamName}/activity`
  //     // );

  //     const ref = collection(
  //       db,
  //       "classrooms",
  //       className,
  //       "Projects",
  //       projectName,
  //       "teams",
  //       teamName,
  //       "activity"
  //     );
  //     const snapshot = await getDocs(ref);
  //     const now = Date.now();
  //     const data = snapshot.docs.map((doc) => {
  //       const lastActive = doc.data().lastActive || 0;
  //       const inactive = now - lastActive > threshold;
  //       return {
  //         id: doc.id,
  //         lastActive,
  //         inactive,
  //       };
  //     });
  //     setActivityData(data);
  //   };

  //   const interval = setInterval(fetchActivity, 30000); // refresh every 30s
  //   fetchActivity(); // initial fetch

  //   return () => clearInterval(interval);
  // }, [className, projectName, teamName, threshold]);

  useEffect(() => {
    const fetchDummyActivity = () => {
      const now = Date.now();
      const dummyData = [
        {
          id: "alice@example.com",
          lastActive: now - 100000,
          inactive: now - 100000 > threshold,
          // id: "You were nudged by the teacher due to inactivity.",
          // timestamp: now - 500000,
        },
        {
          id: "bob@example.com",
          lastActive: now - 500000,
          inactive: now - 500000 > threshold,
        },
        {
          id: "carol@example.com",
          lastActive: now - 2000000,
          inactive: now - 2000000 > threshold,
        },
      ];
      setActivityData(dummyData);
    };

    const interval = setInterval(fetchDummyActivity, 30000);
    fetchDummyActivity();
    return () => clearInterval(interval);
  }, []);

  const handleNudge = async (id) => {
    const msg = `👋 Nudge sent to ${id}`;
    alert(msg); // or use toast
    const logRef = doc(
      db,
      `classrooms/${className}/Projects/${projectName}/teams/${teamName}/nudgeLog/${id}`
    );
    await updateDoc(logRef, { lastNudged: Date.now() });
  };

  return (
    <div className="inactivity-panel">
      <h4>⏱️ Inactivity Monitor</h4>
      <label>Threshold:</label>
      <select onChange={(e) => setThreshold(Number(e.target.value))}>
        <option value={60000}>1 minute</option>
        <option value={120000}>2 minutes</option>
        <option value={300000}>5 minutes</option>
        <option value={900000}>15 minutes</option>
        <option value={1800000}>30 minutes</option>
        <option value={3600000}>1 hour</option>
        <option value={7200000}>2 hours</option>
        <option value={14400000}>4 hours</option>
        <option value={28800000}>8 hours</option>
        <option value={86400000}>1 day</option>
        <option value={172800000}>2 days</option>
        <option value={259200000}>3 days</option>
      </select>
      {/* <h4>🔔 Notifications</h4> */}
      {/* <p>Recent nudges or updates relevant to your activity.</p> */}
      <ul>
        {activityData.map((user) => (
          <li key={user.id}>
            👤 {user.id} —{" "}
            {user.inactive ? (
              <>
                ⚠️ Inactive{" "}
                <button onClick={() => handleNudge(user.id)}>Nudge</button>
              </>
            ) : (
              "✅ Active"
            )}
          </li>

          //  {activityData.map((note, idx) => (
          // <li key={idx}>🔔 {note.id}</li>
        ))}
      </ul>
    </div>
  );
}
