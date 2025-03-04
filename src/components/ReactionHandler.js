export const handleReactions = ({
  reactionId,
  selectedShape,
  shapeReactions,
  setShapeReactions,
  editor,
}) => {
  if (!selectedShape) return;

  const updatedReactions = {
    ...shapeReactions[selectedShape.id],
    [reactionId]: (shapeReactions[selectedShape.id]?.[reactionId] || 0) + 1,
  };

  setShapeReactions((prev) => ({
    ...prev,
    [selectedShape.id]: updatedReactions,
  }));

  logAction({
    action: `Reaction ${reactionId} added to shape ${selectedShape.id}`,
  });
};

export const logAction = (action) => {
  console.log(action);
};
