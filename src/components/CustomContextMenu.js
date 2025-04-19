import React, { useState, useEffect, useContext } from "react";
import {
  DefaultContextMenu,
  TldrawUiMenuGroup,
  DefaultContextMenuContent,
  useEditor,
} from "tldraw";
// import { nanoid } from "nanoid";
import "tldraw/tldraw.css";
import "../App.css";
import HistoryCommentPanel from "./HistoryCommentPanel";
import ToggleExpandButton from "./ToggleExpandButton";

// import CommentMenu from "./CommentMenu";

import { registerShape, deleteShape } from "../utils/registershapes";
import { useParams } from "react-router-dom";
import { auth } from "../firebaseConfig";

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
  // togglePanel,
  ...props
}) {
  const editor = useEditor();
  const [showCommentBox, setShowCommentBox] = useState(false);
  // const [comments, setComments] = useState({});
  // const [actionHistory, setActionHistory] = useState([]);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(true);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const { className, projectName, teamName } = useParams();

  useEffect(() => {
    if (!editor || !className || !projectName || !teamName) return;

    //Logs the shape starting position
    let startPosition = {};

    const handleShapeMoveStart = () => {
      const shape = editor.getActiveShape();
      if (shape) {
        startPosition = shape.getCenter();
      }
      // console.log(`Shape Position: ${startPosition}`);
    };

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

      const text = newShape.props?.text || "";
      // console.log(`Shape Text ${text}`);
      // console.log("Adding shape log:", newShape.id);

      await registerShape(newShape, userContext);

      setActionHistory((prev) => [
        {
          userId,
          action: `added a ${newShape.type}`,
          shapeId: newShape.id,
          timestamp: new Date().toLocaleString(),
        },
        ...prev.filter((entry) => entry.shapeId !== newShape.id),
      ]);
    };

    const handleShapeDeletion = async (deletedShapeID) => {
      if (!deletedShapeID) {
        console.error("Missing shape ID!");
        return;
      }

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
        {
          userId: auth.currentUser ? auth.currentUser.displayName : "anon",
          action: `deleted`,
          shapeId: deletedShapeID.id,
          timestamp: new Date().toLocaleString(),
        },
        ...prev,
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
    const updateSelectedShape = (shape) => {
      if (!shape) {
        // console.log("No shape selected.");
        setSelectedShape(null);
      } else {
        if (shape) {
          // console.log("Selected shape:", shape);
          setSelectedShape(shape);
        }
      }
    };

    // Also update when selection changes
    const unsubscribe = editor.store.listen(({ changes }) => {
      if (changes.selectedIds) {
        updateSelectedShape(selectedShape);
      }
    });

    const handleClickOutside = (event) => {
      if (
        !editor.getShapeAtPoint(
          editor.screenToPage({ x: event.clientX, y: event.clientY })
        )
      ) {
        // console.log("User clicked outside. Deselecting shape.");
        // setSelectedShape(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      // editor.off("pointerdown", pointerDownHandler);
      unsubscribe();
    };
  }, [editor, setSelectedShape]);

  const togglePanel = () => {
    setIsPanelCollapsed(!isPanelCollapsed);
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    const point = editor.screenToPage({ x: event.clientX, y: event.clientY });
    const shape = editor.getShapeAtPoint(point);

    if (shape) {
      setSelectedShape(shape);
      editor.select(shape.id);

      // console.log("Shape ID:", shape.id);
    }
  };

  return (
    <div onContextMenu={handleContextMenu}>
      <DefaultContextMenu {...props}>
        <TldrawUiMenuGroup id="reactions"></TldrawUiMenuGroup>

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
    </div>
  );
}
