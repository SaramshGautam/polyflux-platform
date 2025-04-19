import React, { useState, useEffect } from "react";
import ToggleButtonGroup from "./ToggleButtonGroup";
import HistoryPanel from "./HistoryPanel";
import CommentPanel from "./CommentPanel";

const HistoryCommentPanel = ({
  actionHistory,
  comments,
  selectedShape,
  isPanelCollapsed,
  togglePanel,
}) => {
  const [isViewingHistory, setIsViewingHistory] = useState(true);

  // useEffect(() => {
  //   setIsViewingHistory(!selectedShape); // Show comments if a shape is selected, otherwise show history
  // }, [selectedShape]);

  return (
    <div className="panelContainer">
      {/* Toggle Button positioned at the bottom-left corner of the panel */}
      <button
        onClick={togglePanel}
        className={`toggle-collapse-button ${
          isPanelCollapsed ? "collapsed" : ""
        }`}
      ></button>

      {/* Toggle between History and Comment view */}
      <ToggleButtonGroup
        isViewingHistory={isViewingHistory}
        setIsViewingHistory={setIsViewingHistory}
      />

      {isViewingHistory ? (
        <HistoryPanel actionHistory={actionHistory} />
      ) : (
        // <CommentPanel comments={comments[selectedShape?.id] || []} />
        <CommentPanel selectedShape={selectedShape} />
      )}
    </div>
  );
};

export default HistoryCommentPanel;
