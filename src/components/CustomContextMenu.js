// import React, { useState, useEffect } from "react";
// import {
//   DefaultContextMenu,
//   TldrawUiMenuGroup,
//   DefaultContextMenuContent,
//   useEditor,
// } from "tldraw";
// // import { nanoid } from "nanoid";
// import "../App.css";
// import HistoryCommentPanel from "./HistoryCommentPanel";
// import ToggleExpandButton from "./ToggleExpandButton";
// import ReactionTooltip from "./tooltip/ReactionTooltip";
// import ReactionsMenu from "./ReactionsMenu";

// import CommentIconWithCounter from "./CommentIconWithCounter";
// import CommentBox from "./CommentBox";
// import CommentMenu from "./CommentMenu";

// export default function CustomContextMenu({
//   shapeReactions,
//   setShapeReactions,
//   selectedShape,
//   setSelectedShape,
//   commentCounts,
//   setCommentCounts,
//   comments,
//   setComments,
//   actionHistory,
//   ...props
// }) {
//   const editor = useEditor();
//   const [showCommentBox, setShowCommentBox] = useState(false);
//   const [comments, setComments] = useState({});
//   const [actionHistory, setActionHistory] = useState([]);
//   const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
//   const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

//   useEffect(() => {
//     const unsubscribe = editor.store.listen(({ changes }) => {
//       if (changes.selectedIds) {
//         const selectedIds = editor.getSelectedShapeIds();
//         if (selectedIds.length === 0) {
//           setSelectedShape(null);
//         } else {
//           const shape = editor.getShape(selectedIds[0]);
//           if (shape) {
//             setSelectedShape(shape);

//             const geometry = editor.getShapeGeometry(shape);
//             if (geometry) {
//               const bounds = geometry.bounds;
//               const adjustedPosition = {
//                 x: bounds.minX + bounds.width / 2,
//                 y: bounds.minY - 10,
//               };
//               setTooltipPosition(adjustedPosition);
//             }
//           }
//         }
//       }
//     });

//     return () => unsubscribe();
//   }, [editor, setSelectedShape]);

//   const handleReactionSelect = (id, reactionType) => {
//     if (!selectedShape) return;

//     setShapeReactions((prevReactions) => {
//       const currentReactions = prevReactions[selectedShape.id] || {
//         Like: 0,
//         Dislike: 0,
//         Confused: 0,
//         Surprised: 0,
//       };

//       const updatedReactions = {
//         ...currentReactions,
//         [reactionType]: currentReactions[reactionType] + 1,
//       };

//       return {
//         ...prevReactions,
//         [selectedShape.id]: updatedReactions,
//       };
//     });

//     console.log("--- Updated Shape Reactions ---", shapeReactions);
//   };

//   const togglePanel = () => {
//     setIsPanelCollapsed(!isPanelCollapsed);
//   };

//   const logAction = (action) => {
//     setActionHistory((prevHistory) => [
//       ...prevHistory,
//       { ...action, timestamp: new Date().toLocaleString() },
//     ]);
//   };

//   const handleContextMenu = (event) => {
//     event.preventDefault();
//     const point = editor.screenToPage({ x: event.clientX, y: event.clientY });
//     const shape = editor.getShapeAtPoint(point);

//     if (shape) {
//       setSelectedShape(shape);
//       editor.select(shape.id);

//       console.log("Shape ID:", shape.id);
//     }
//   };

//   const addComment = (shapeId, commentData) => {
//     console.log("Adding comment for shapeId:", shapeId);

//     const commentDataWithTime = {
//       ...commentData,
//       timestamp: new Date().toLocaleString(),
//     };

//     setComments((prevComments) => {
//       const updatedComments = {
//         ...prevComments,
//         [shapeId]: [...(prevComments[shapeId] || []), commentDataWithTime],
//       };
//       return updatedComments;
//     });

//     setCommentCounts((prevCounts) => {
//       const updatedCounts = {
//         ...prevCounts,
//         [shapeId]: (prevCounts[shapeId] || 0) + 1,
//       };
//       return updatedCounts;
//     });
//   };

//   const renderCommentIconWithCounter = (shapeId) => {
//     const shapeComments = comments[shapeId] || [];
//     if (shapeComments.length === 0) return null;

//     const shape = editor.getShape(shapeId);
//     if (!shape) {
//       console.error("[ERROR] Shape not found for ID:", shapeId);
//       return null;
//     }

//     const position = editor.screenToPage({ x: shape.x, y: shape.y });

//     return (
//       <CommentIconWithCounter
//         shapeId={shapeId}
//         count={shapeComments.length}
//         x={position.x}
//         y={position.y}
//       />
//     );
//   };

//   return (
//     <div onContextMenu={handleContextMenu}>
//       {/* {Object.keys(shapeReactions).map((shapeId) => {
//         // const shape = editor.getShape(shapeId);
//         return (
//           <div key={shapeId} className="shape-container">
//             <div className="shape">{shapeId}</div>
//           </div>
//         );
//       })} */}
//       <DefaultContextMenu {...props}>
//         <TldrawUiMenuGroup id="reactions">
//           <div
//             style={{
//               backgroundColor: "lightblue",
//               padding: "5px",
//               fontWeight: "bold",
//               position: "relative",
//             }}
//             className="menu-item-react"
//           >
//             <ReactionsMenu
//               onReactionSelect={(reactionType) => {
//                 if (selectedShape) {
//                   handleReactionSelect(selectedShape.id, reactionType);
//                 }
//               }}
//             />
//           </div>
//           <div
//             style={{
//               backgroundColor: "#f0f8ff",
//               padding: "5px",
//               fontWeight: "bold",
//             }}
//             className="menu-item-comment"
//           ></div>
//           <CommentMenu
//             selectedShape={selectedShape}
//             setShowCommentBox={setShowCommentBox}
//           />
//         </TldrawUiMenuGroup>

//         <DefaultContextMenuContent />
//       </DefaultContextMenu>
//       <div className="panelContainerWrapper">
//         {!isPanelCollapsed && (
//           <HistoryCommentPanel
//             actionHistory={actionHistory}
//             comments={comments}
//             selectedShape={selectedShape}
//             isPanelCollapsed={isPanelCollapsed}
//             togglePanel={togglePanel}
//           />
//         )}
//         {isPanelCollapsed && (
//           <ToggleExpandButton
//             isPanelCollapsed={isPanelCollapsed}
//             togglePanel={togglePanel}
//           />
//         )}
//       </div>
//       {/* <CommentBox
//         selectedShape={selectedShape}
//         addComment={addComment}
//         showCommentBox={showCommentBox}
//         onClose={() => setShowCommentBox(false)}
//         logAction={logAction}
//       />
//       {Object.keys(comments).map((shapeId) => (
//         <div key={shapeId} style={{ position: "relative" }}>
//           {renderCommentIconWithCounter(shapeId)}
//         </div>
//       ))} */}
//     </div>
//   );
// }

import React, { useState, useEffect, useContext } from "react";
import {
  DefaultContextMenu,
  TldrawUiMenuGroup,
  DefaultContextMenuContent,
  useEditor,
} from "tldraw";
import axios from "axios";
// import { nanoid } from "nanoid";
import "../App.css";
import HistoryCommentPanel from "./HistoryCommentPanel";
import ToggleExpandButton from "./ToggleExpandButton";
import ReactionTooltip from "./tooltip/ReactionTooltip";
import ReactionsMenu from "./ReactionsMenu";

import CommentIconWithCounter from "./CommentIconWithCounter";
import CommentBox from "./CommentBox";
import CommentMenu from "./CommentMenu";

import { registerShape, deleteShape } from "../utils/registershapes";
import { useParams } from "react-router-dom";
import { auth } from "../firebaseConfig";
import { getSuggestedQuery } from "@testing-library/react";

export default function CustomContextMenu({
  shapeReactions,
  setShapeReactions,
  selectedShape,
  setSelectedShape,
  commentCounts,
  setCommentCounts,
  comments,
  setComments,
  actionHistory,
  setActionHistory,
  ...props
}) {
  const editor = useEditor();
  const [showCommentBox, setShowCommentBox] = useState(false);
  // const [comments, setComments] = useState({});
  // const [actionHistory, setActionHistory] = useState([]);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const { className, projectName, teamName } = useParams();

  useEffect(() => {
    if (!editor || !className || !projectName || !teamName) return;

    const userId = auth.currentUser ? auth.currentUser.displayName : "anon";
    const userContext = { className, projectName, teamName, userId };

    const logShapeAddition = async (newShape) => {
      if (!newShape) {
        console.error("Shape data is missing!");
        return;
      }

      if (!className || !projectName || !teamName) {
        console.error(
          "Missing parameters: className, projectName, or teamName"
        );
        return;
      }

      // const userId = auth.currentUser.displayName;
      // const userId = auth.currentUser ? auth.currentUser.displayName : "anon";
      // const userContext = { className, projectName, teamName, userId };
      // const timestamp = new Date().toLocaleString();

      console.log("Adding shape log:", newShape.id);

      await registerShape(newShape, userContext);

      setActionHistory((perv) => [
        ...perv.filter((entry) => entry.shapeId !== newShape.id),
        {
          userId,
          action: `added a ${newShape.type}`,
          shapeId: newShape.id,
          timestamp: new Date().toLocaleString(),
        },
      ]);
    };

    const handleShapeDeletion = async (deletedShapeID) => {
      if (!deletedShapeID) {
        console.error("Missing shape ID!");
        return;
      }
      // console.log(`--- shape to be deleted --- ${deletedShapeID.id}`);

      if (!className || !projectName || !teamName) {
        console.error(
          "Missing parameters: className, projectName, or teamName"
        );
        return;
      }

      const userContext = {
        className,
        projectName,
        teamName,
        userId: auth.currentUser ? auth.currentUser.displayName : "anon",
      };

      await deleteShape(deletedShapeID.id, userContext);

      setActionHistory((prev) => [
        ...prev,
        {
          userId: auth.currentUser ? auth.currentUser.displayName : "anon",
          action: `deleted the shape`,
          shapeId: deletedShapeID.id,
          timestamp: new Date().toLocaleString(),
        },
      ]);
    };

    const shapeCreateHandler = editor.sideEffects.registerAfterCreateHandler(
      "shape",
      logShapeAddition
    );
    const shapeDeleteHandler = editor.sideEffects.registerAfterDeleteHandler(
      "shape",
      handleShapeDeletion
    );

    return () => {
      shapeCreateHandler();
      shapeDeleteHandler();
    };
  }, [editor, className, projectName, teamName]);

  useEffect(() => {
    const updateSelectedShape = () => {
      console.log("Updating selected shape...");
      const selectedIds = editor.getSelectedShapeIds();
      console.log("Selected IDs:", selectedIds);

      if (selectedIds.length === 0) {
        console.log("No shape selected.");
        setSelectedShape(null);
      } else {
        const shapeId = selectedIds[0];
        const shape = editor.getShape(shapeId);
        if (shape) {
          console.log("Selected shape:", shape);
          setSelectedShape(shape);

          // Update tooltip position
          const selectionRotatedPageBounds =
            editor.getSelectionRotatedPageBounds();
          if (selectionRotatedPageBounds) {
            const centerX =
              selectionRotatedPageBounds.minX +
              selectionRotatedPageBounds.width / 2;
            const centerY = selectionRotatedPageBounds.minY;

            const viewportPosition = editor.pageToViewport({
              x: centerX,
              y: centerY,
            });

            setTooltipPosition({
              x: viewportPosition.x,
              y: viewportPosition.y - 42, // Position above the selection
            });
          }
        }
      }
    };

    // Listen for both left and right clicks
    const pointerDownHandler = (event) => {
      console.log("Pointer down event:", event);

      const shape = editor.getShapeAtPoint(
        editor.screenToPage({ x: event.clientX, y: event.clientY })
      );
      if (shape) {
        console.log("Shape selected:", shape);
        editor.select(shape.id); // Ensure the shape is selected
        updateSelectedShape();
      }
    };

    editor.on("pointerdown", pointerDownHandler);

    // Also update when selection changes
    const unsubscribe = editor.store.listen(({ changes }) => {
      if (changes.selectedIds) {
        updateSelectedShape();
      }
    });

    return () => {
      editor.off("pointerdown", pointerDownHandler);
      unsubscribe();
    };
  }, [editor]);

  const handleReactionSelect = (id, reactionType) => {
    if (!selectedShape) return;

    setShapeReactions((prevReactions) => {
      const currentReactions = prevReactions[selectedShape.id] || {
        Like: 0,
        Dislike: 0,
        Confused: 0,
        Surprised: 0,
      };

      const updatedReactions = {
        ...currentReactions,
        [reactionType]: currentReactions[reactionType] + 1,
      };

      return {
        ...prevReactions,
        [selectedShape.id]: updatedReactions,
      };
    });

    console.log("--- Updated Shape Reactions ---", shapeReactions);
  };

  const togglePanel = () => {
    setIsPanelCollapsed(!isPanelCollapsed);
  };

  // const logAction = (action) => {
  //   setActionHistory((prevHistory) => [
  //     ...prevHistory,
  //     { ...action, timestamp: new Date().toLocaleString() },
  //   ]);
  // };

  const handleContextMenu = (event) => {
    event.preventDefault();
    const point = editor.screenToPage({ x: event.clientX, y: event.clientY });
    const shape = editor.getShapeAtPoint(point);

    if (shape) {
      setSelectedShape(shape);
      editor.select(shape.id);

      console.log("Shape ID:", shape.id);
    }
  };

  // const addComment = (shapeId, commentData) => {
  //   console.log("Adding comment for shapeId:", shapeId);

  //   const commentDataWithTime = {
  //     ...commentData,
  //     timestamp: new Date().toLocaleString(),
  //   };

  //   setComments((prevComments) => {
  //     const updatedComments = {
  //       ...prevComments,
  //       [shapeId]: [...(prevComments[shapeId] || []), commentDataWithTime],
  //     };
  //     return updatedComments;
  //   });

  //   setCommentCounts((prevCounts) => {
  //     const updatedCounts = {
  //       ...prevCounts,
  //       [shapeId]: (prevCounts[shapeId] || 0) + 1,
  //     };
  //     return updatedCounts;
  //   });
  // };

  return (
    <div onContextMenu={handleContextMenu}>
      <DefaultContextMenu {...props}>
        <TldrawUiMenuGroup id="reactions">
          <div
            style={{
              backgroundColor: "lightblue",
              padding: "5px",
              fontWeight: "bold",
              position: "relative",
            }}
            className="menu-item-react"
          >
            <ReactionsMenu
              onReactionSelect={(reactionType) => {
                if (selectedShape) {
                  handleReactionSelect(selectedShape.id, reactionType);
                }
              }}
            />
          </div>
          <div
            style={{
              backgroundColor: "#f0f8ff",
              padding: "5px",
              fontWeight: "bold",
            }}
            className="menu-item-comment"
          ></div>
          <CommentMenu
            selectedShape={selectedShape}
            setShowCommentBox={setShowCommentBox}
          />
        </TldrawUiMenuGroup>

        <DefaultContextMenuContent />
      </DefaultContextMenu>
      <div className="panelContainerWrapper">
        {!isPanelCollapsed && (
          <HistoryCommentPanel
            actionHistory={actionHistory}
            comments={comments}
            selectedShape={selectedShape}
            isPanelCollapsed={isPanelCollapsed}
            togglePanel={togglePanel}
          />
        )}
        {isPanelCollapsed && (
          <ToggleExpandButton
            isPanelCollapsed={isPanelCollapsed}
            togglePanel={togglePanel}
          />
        )}
      </div>
      {/* <CommentBox
        selectedShape={selectedShape}
        addComment={addComment}
        showCommentBox={showCommentBox}
        onClose={() => setShowCommentBox(false)}
        logAction={logAction}
      /> */}
      {/* {Object.keys(comments).map((shapeId) => (
        <div key={shapeId} style={{ position: "relative" }}>
          {renderCommentIconWithCounter(shapeId)}
        </div>
      ))} */}
    </div>
  );
}
