export const handleCommentClick = (selectedShape, setShowCommentBox) => {
  if (!selectedShape) return;
  setShowCommentBox(true);
};

export const addComment = (selectedShape, commentData, setComments) => {
  if (!selectedShape) return;

  setComments((prev) => ({
    ...prev,
    [selectedShape.id]: [
      ...(prev[selectedShape.id] || []),
      { ...commentData, timestamp: new Date().toISOString() },
    ],
  }));
};
