// import React from "react";
// import "../App.css";

// export default function HistoryPanel({ actionHistory }) {
//   return (
//     <div className="historyPanel">
//       <h4 className="historyTitle">Action History</h4>
//       <ul className="historyList">
//         {actionHistory.map((action, index) => (
//           <li key={index} className="historyItem">
//             <strong>{action.userId}</strong> {action.action}
//             <div className="timestamp">{action.timestamp}</div>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

import React from "react";
import "../App.css";

export default function HistoryPanel({ actionHistory = [] }) {
  return (
    <div className="historyPanel">
      <h4 className="historyTitle">Action History</h4>

      {actionHistory.length === 0 ? (
        <p className="historyEmpty">No actions recorded yet.</p>
      ) : (
        <ul className="historyList">
          {actionHistory.map((action, index) => {
            console.log(`--- action timestamp --- ${action.timestamp}`);
            // Convert timestamp to readable format
            const formattedTimestamp = action.timestamp?.seconds
              ? new Date(action.timestamp.seconds * 1000).toLocaleString()
              : "Unknown Time";

            console.log(`--- Formatted Timestamp --- ${formattedTimestamp}`);

            return (
              <li key={index} className="historyItem">
                <strong>{action.userId || "Unknown User"}</strong>{" "}
                {action.action}
                <div className="timestamp">{formattedTimestamp}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
