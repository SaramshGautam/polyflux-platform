import React from "react";
import { TldrawUiMenuItem, useEditor } from "tldraw";

const CommentMenu = ({ selectedShape, setShowCommentBox }) => {
  const handleCommentClick = () => {
    if (!selectedShape) return;
    setShowCommentBox(true);
  };

  return (
    <TldrawUiMenuItem
      id="comment"
      label="Comment 💬"
      icon="💬"
      readonlyOk
      onSelect={handleCommentClick}
      className="menu-item-comment"
    />
  );
};

export default CommentMenu;
