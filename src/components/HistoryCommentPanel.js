import React, { useState } from "react";
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

  return (
    <div className="panelContainer">
      {/* Toggle Button positioned at the bottom-left corner of the panel */}
      <button onClick={togglePanel} className="toggle-collapse-button">
        {isPanelCollapsed ? "<<" : ">>"}
      </button>

      {/* Toggle between History and Comment view */}
      <ToggleButtonGroup
        isViewingHistory={isViewingHistory}
        setIsViewingHistory={setIsViewingHistory}
      />

      {isViewingHistory ? (
        <HistoryPanel actionHistory={actionHistory} />
      ) : (
        <CommentPanel comments={comments[selectedShape?.id] || []} />
      )}
    </div>
  );
};

export default HistoryCommentPanel;
