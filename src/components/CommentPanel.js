import React from "react";
import "../App.css";

export default function CommentPanel({ comments }) {
  return (
    <div className="commentsPanel">
      <h4 className="commentsTitle">Comments</h4>
      <ul className="commentsList">
        {comments.map((comment, index) => (
          <li key={index} className="commentItem">
            <strong>{comment.userId}:</strong> {comment.text}
            <div className="timestamp">{comment.timestamp}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
