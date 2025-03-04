import React, { useEffect, useRef, useState } from "react";

export default function CommentBox({
  selectedShape,
  // addCommentIcon,
  addComment,
  showCommentBox,
  onClose,
  logAction,
}) {
  const [commentData, setCommentData] = useState({
    userId: "User123",
    timestamp: new Date().toLocaleString(),
    text: "",
  });

  const commentInputRef = useRef(null);

  useEffect(() => {
    if (showCommentBox && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [showCommentBox]);

  const handleCommentSubmit = (e) => {
    e.preventDefault();

    if (!selectedShape) return;

    addComment(selectedShape.id, commentData);

    // Clear comment data and close comment box
    setCommentData({ ...commentData, text: "" });

    // addCommentIcon(selectedShape.id);
    logAction({ userId: commentData.userId, action: "added a comment" });
    onClose();
  };

  const handleClear = () => {
    setCommentData({ ...commentData, text: "" });
  };

  if (!showCommentBox) return null;

  return (
    <div className="commentBox">
      <button onClick={onClose} className="closeButton">
        ×
      </button>

      <h4 className="commentBoxTitle">Add Comment</h4>
      <form onSubmit={handleCommentSubmit}>
        <label className="label">
          User ID:
          <input
            type="text"
            value={commentData.userId}
            onChange={(e) =>
              setCommentData({ ...commentData, userId: e.target.value })
            }
            className="input"
          />
        </label>
        <label className="label">
          Time:
          <input
            type="text"
            value={commentData.timestamp}
            readOnly
            className="input"
          />
        </label>
        <label className="label">
          Comment:
          <textarea
            ref={commentInputRef}
            value={commentData.text}
            onChange={(e) =>
              setCommentData({ ...commentData, text: e.target.value })
            }
            className="textarea"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                handleCommentSubmit(e); // Submit on Enter
              }
            }}
          />
        </label>
        <button type="submit" className="button">
          Submit
        </button>
        <button type="button" onClick={handleClear} className="clearButton">
          Clear
        </button>
      </form>
    </div>
  );
}
