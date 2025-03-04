import React from "react";
import "./ReactionTooltip.css";

const ReactionTooltip = ({ reactions, position, visible }) => {
  console.log("Tooltip Props:", { reactions, position, visible }); // Debug log

  if (!visible) return null;

  return (
    <div
      className="reaction-tooltip"
      style={{
        position: "absolute",
        top: `${position.y}px`,
        left: `${position.x}px`,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        color: "white",
        padding: "8px",
        borderRadius: "4px",
        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.2)",
        zIndex: 1000,
      }}
    >
      {Object.entries(reactions).map(([reaction, count]) => (
        <div key={reaction} className="reaction-item">
          {reaction} <span className="reaction-count">{count}</span>
        </div>
      ))}
    </div>
  );
};

export default ReactionTooltip;
