import React from "react";

const ToggleExpandButton = ({ isPanelCollapsed, togglePanel }) => (
  <div className="toggle-expand-container">
    <button
      onClick={togglePanel}
      className={`toggle-expand-button ${isPanelCollapsed ? "collapsed" : ""}`}
    ></button>
    <div className="panel-label">History/Comment Panel</div>
  </div>
);

export default ToggleExpandButton;
