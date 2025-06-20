import React, { useState } from "react";
import "./ChatBot.css";
import { formatBotReply } from "../utils/formatBotReply";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot } from "@fortawesome/free-solid-svg-icons";

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!userInput.trim()) return;

    const newMessages = [...messages, { sender: "user", text: userInput }];
    setMessages(newMessages);
    setUserInput("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/chatgpt-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
      });

      const data = await response.json();
      if (data.reply) {
        setMessages([
          ...newMessages,
          {
            sender: "bot",
            text: formatBotReply(data.reply),
            image_url: data.image_url || null,
          },
        ]);
      } else {
        setMessages([
          ...newMessages,
          { sender: "bot", text: "Something went wrong." },
        ]);
      }
    } catch (error) {
      console.error(error);
      setMessages([
        ...newMessages,
        { sender: "bot", text: "Error connecting to server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="chatbot-toggle" onClick={() => setIsOpen(!isOpen)}>
        {/* 💬 */}
        {/* 🤖 */}

        <FontAwesomeIcon icon={faRobot} />
      </div>

      {isOpen && (
        <div className="chatbot-container">
          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chatbot-message ${msg.sender}`}>
                {msg.text.split("\n").map((line, i) => (
                  <p key={i} style={{ margin: 0 }}>
                    {line}
                  </p>
                ))}

                {msg.image_url && (
                  <img
                    src={msg.image_url}
                    alt="Generated visual"
                    style={{
                      maxWidth: "100%",
                      marginTop: "10px",
                      borderRadius: "6px",
                    }}
                  />
                )}
              </div>
            ))}
            {loading && <div className="chatbot-message bot">Typing...</div>}
          </div>

          <div className="chatbot-input">
            <input
              type="text"
              placeholder="Ask me something..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button onClick={handleSend}>Send</button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
