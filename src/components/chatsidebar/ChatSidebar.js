import React from "react";
import "./ChatSidebar.css";

const ChatSidebar = ({ messages, isOpen, toggleSidebar }) => {
  return (
    <div className={`chat-sidebar ${isOpen ? "open" : ""}`}>
      <div className="chat-sidebar-header">
        <h3>Chat History</h3>
        <button className="close-btn" onClick={toggleSidebar}>
          &times;
        </button>
      </div>
      <div className="chat-sidebar-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-sidebar-message ${msg.sender}`}>
            {msg.text.split("\n").map((line, i) => (
              <p key={i} style={{ margin: 0 }}>
                {line}
              </p>
            ))}
            {msg.image_urls && (
              <div className="chat-sidebar-images">
                {msg.image_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`img-${i}`}
                    className="chat-sidebar-image"
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatSidebar;
