import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchCommentsForShape } from "../utils/firestoreHelpers";
import "../App.css";

// export default function CommentPanel({ comments }) {
//   return (
//     <div className="commentsPanel">
//       <h4 className="commentsTitle">Comments</h4>
//       <ul className="commentsList">
//         {comments.map((comment, index) => (
//           <li key={index} className="commentItem">
//             <strong>{comment.userId}:</strong> {comment.text}
//             <div className="timestamp">{comment.timestamp}</div>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

const CommentPanel = ({ selectedShape }) => {
  const [comments, setComments] = useState([]);
  // console.log(selectedShape.id);
  const { className, projectName, teamName } = useParams();

  useEffect(() => {
    if (!selectedShape) {
      return;
    }
    if (selectedShape) {
      fetchCommentsForShape(selectedShape.id, {
        className,
        projectName,
        teamName,
      }).then(setComments);
    }
  }, [selectedShape]);

  // return (
  //   <div className="commentPanel">
  //     <h4>Comments</h4>
  //     {comments.length === 0 ? (
  //       <p>No comments yet.</p>
  //     ) : (
  //       <ul>
  //         {comments.map((comment, index) => (
  //           <li key={index}>
  //             <strong>{comment.userId}</strong>: {comment.text} <br />
  //             <small>{new Date(comment.timestamp).toLocaleString()}</small>
  //           </li>
  //         ))}
  //       </ul>
  //     )}
  //   </div>
  // );
  return (
    <div className="historyPanel">
      <h4 className="historyTitle">Comments</h4>
      {comments.length === 0 ? (
        <p className="historyEmpty">No comments yet.</p>
      ) : (
        <ul className="historyList">
          {comments
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Sort by most recent
            .map((comment, index) => (
              <li key={index} className="historyItem">
                <strong>{comment.userId || "Unknown User"}</strong>:{" "}
                {comment.text}
                <div className="timestamp">
                  {new Date(comment.timestamp).toLocaleString()}
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};

export default CommentPanel;
