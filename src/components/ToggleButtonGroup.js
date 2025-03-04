import React from "react";
import "../App.css";

export default function ToggleButtonGroup({
  isViewingHistory,
  setIsViewingHistory,
}) {
  return (
    <div className="toggleButtonContainer">
      <button
        onClick={() => setIsViewingHistory(true)}
        className={isViewingHistory ? "active-button" : "toggle-button"}
      >
        Action History
      </button>
      <button
        onClick={() => setIsViewingHistory(false)}
        className={!isViewingHistory ? "active-button" : "toggle-button"}
      >
        Comments
      </button>
    </div>
  );
}
