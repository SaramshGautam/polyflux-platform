// import React from "react";
// import { TldrawUiIcon, track, useEditor } from "tldraw";
// import "tldraw/tldraw.css";

// const REACTIONS = [
//   { value: "Like", icon: "check-circle" },
//   { value: "Dislike", icon: "cross-circle" },
//   { value: "Surprised", icon: "warning-triangle" },
//   { value: "Confused", icon: "question-mark-circle" },
// ];

// const ContextToolbarComponent = track(
//   ({ selectedShape, shapeReactions, commentCounts, onReactionClick }) => {
//     const editor = useEditor();
//     const tooltipWidth = 200;

//     // Get the bounding box of the selected shapes in canvas (page) coordinates, accounting for rotation.
//     const selectionRotatedPageBounds = editor.getSelectionRotatedPageBounds();
//     if (!selectionRotatedPageBounds || !selectedShape) return null;

//     //Calculating the center of the selected bounds
//     const centerX =
//       selectionRotatedPageBounds.minX + selectionRotatedPageBounds.width / 2;
//     const centerY = selectionRotatedPageBounds.minY;

//     const viewportCenter = editor.pageToViewport({ x: centerX, y: centerY });

//     const selectedId = selectedShape.id;
//     const selectedShapeReactions = shapeReactions[selectedId] || {};
//     const selectedShapeCommentCount = commentCounts[selectedId] || 0;

//     console.log("Selected shape comment count:", selectedShapeCommentCount);

//     return (
//       <div
//         style={{
//           position: "absolute",
//           pointerEvents: "all",
//           top: viewportCenter.y - 42,
//           left: viewportCenter.x - tooltipWidth / 2,
//           display: "flex",
//           justifyContent: "center",
//           alignItems: "center",
//           zIndex: 10,
//         }}
//       >
//         <div
//           style={{
//             borderRadius: 8,
//             display: "flex",
//             alignItems: "center",
//             boxShadow: "0 0 0 1px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.1)",
//             background: "var(--color-panel)",
//             padding: "5px",
//           }}
//         >
//           {/* Comment Section */}
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "5px",
//             }}
//           >
//             <TldrawUiIcon icon="tool-note" />
//             <span style={{ fontSize: "12px" }}>
//               {selectedShapeCommentCount}
//             </span>
//           </div>

//           {/* Vertical Separator */}
//           <div
//             style={{
//               width: "1px",
//               height: "20px",
//               backgroundColor: "rgba(0, 0, 0, 0.3)",
//               margin: "0 5px", // Adjust spacing around the separator
//             }}
//           ></div>

//           {/* Reactions Section */}
//           <div style={{ display: "flex", gap: "10px" }}>
//             {REACTIONS.map(({ value, icon }) => (
//               <div
//                 key={value}
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: "3px",
//                   cursor: "pointer",
//                   background:
//                     selectedShapeReactions[value] > 0 ? "#d3f9d8" : "#f9f9f9",
//                   borderBottom:
//                     selectedShapeReactions[value] > 0
//                       ? "2px solid #34a853"
//                       : "0px solid #ccc", // Highlight border
//                   padding: "1px",
//                   borderRadius: "4px",
//                 }}
//                 onClick={() => onReactionClick(selectedId, value)}
//               >
//                 <TldrawUiIcon icon={icon} />
//                 <span style={{ fontSize: "12px" }}>
//                   {selectedShapeReactions[value] || 0}
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     );
//   }
// );

// export default ContextToolbarComponent;

import React, { act, useState } from "react";
import { TldrawUiIcon, track, useEditor } from "tldraw";
import "tldraw/tldraw.css";
import CommentBox from "./CommentBox";
import { getAuth } from "firebase/auth";

const REACTIONS = [
  { value: "liked", icon: "check-circle" },
  { value: "disliked", icon: "cross-circle" },
  { value: "surprised", icon: "warning-triangle" },
  { value: "confused", icon: "question-mark-circle" },
];

const ContextToolbarComponent = track(
  ({
    selectedShape,
    shapeReactions,
    commentCounts,
    onReactionClick,
    addComment,
    setSelectedShape,
    setActionHistory,
  }) => {
    const editor = useEditor();
    const tooltipWidth = 200;

    const auth = getAuth();
    const user = auth.currentUser;

    // Local state for showing the CommentBox
    const [showCommentBox, setShowCommentBox] = useState(false);

    // Handle showing the CommentBox when clicking the "tool-note" icon
    const handleCommentClick = () => {
      if (!selectedShape) return;
      setShowCommentBox(true); // Show the CommentBox
    };

    // Handle closing the CommentBox
    const handleCloseCommentBox = () => {
      setShowCommentBox(false); // Hide the CommentBox
    };

    // Get the bounding box of the selected shapes in canvas (page) coordinates
    const selectionRotatedPageBounds = editor.getSelectionRotatedPageBounds();
    if (!selectionRotatedPageBounds || !selectedShape) return null;

    // Calculate the center of the selected bounds
    const centerX =
      selectionRotatedPageBounds.minX + selectionRotatedPageBounds.width / 2;
    const centerY = selectionRotatedPageBounds.minY;

    const viewportCenter = editor.pageToViewport({ x: centerX, y: centerY });

    const selectedId = selectedShape.id;
    const selectedShapeReactions = shapeReactions[selectedId] || {};
    // const selectedShapeCommentCount = commentCounts[selectedId] || 0;

    const handleReactionClick = (reactionType) => {
      if (!user) {
        console.error("User not logged in.");
        return;
      }

      const reactionData = {
        shapeId: selectedId,
        userId: user.displayName || "Anonymous",
        // reactions: selectedShapeReactions,
        reactionType,
        timestamp: new Date().toLocaleString(),
      };

      console.log("Logging reaction data:", reactionData);

      // Pass reactionData to App.js through onReactionClick
      onReactionClick(reactionData);
    };

    const logAction = (action) => {
      console.log("Test");
      // console.log("Initiated by ----", userId);
      console.log("Action ---- ", action);
      setActionHistory((prev) => [
        ...prev,
        { ...action, timestamp: new Date().toLocaleString() },
      ]);
    };

    return (
      <div
        style={{
          position: "absolute",
          pointerEvents: "all",
          top: viewportCenter.y - 42,
          left: viewportCenter.x - tooltipWidth / 2,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <div
          style={{
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.1)",
            background: "var(--color-panel)",
            padding: "10px",
          }}
        >
          {/* Comment Section */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              cursor: "pointer",
            }}
            onClick={handleCommentClick}
          >
            <TldrawUiIcon icon="tool-note" />
            <span style={{ fontSize: "12px" }}>
              {/* {selectedShapeCommentCount} */}
              {commentCounts[selectedShape.id] || 0}
            </span>
          </div>

          {/* Vertical Separator */}
          <div
            style={{
              width: "1px",
              height: "20px",
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              margin: "0 5px", // Adjust spacing around the separator
            }}
          ></div>

          {/* Reactions Section */}
          <div style={{ display: "flex", gap: "10px" }}>
            {REACTIONS.map(({ value, icon }) => (
              <div
                key={value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  cursor: "pointer",
                  background:
                    selectedShapeReactions[value] > 0 ? "#e8f8e0" : "#f9f9f9",
                  fontWeight:
                    selectedShapeReactions[value] > 0 ? "bold" : "normal",
                  color:
                    selectedShapeReactions[value] > 0 ? "#5c9e43" : "#6c757d",

                  boxShadow:
                    selectedShapeReactions[value] > 0
                      ? "0px 0px 8px rgba(131, 204, 113, 0.4)"
                      : "none",
                  transition: "box-shadow 0.3s ease-in-out",
                }}
                onClick={() => handleReactionClick(value)}
              >
                <TldrawUiIcon icon={icon} />
                <span style={{ fontSize: "12px" }}>
                  {selectedShapeReactions[value] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Render the CommentBox when the state is true */}
        {showCommentBox && (
          <CommentBox
            selectedShape={selectedShape}
            addComment={addComment}
            showCommentBox={showCommentBox}
            onClose={handleCloseCommentBox}
            logAction={logAction}
          />
        )}
      </div>
    );
  }
);

export default ContextToolbarComponent;
