import React, { useState, useEffect } from "react";
import "./ChatBot.css";
import { formatBotReply } from "../utils/formatBotReply";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot } from "@fortawesome/free-solid-svg-icons";
import Draggable from "react-draggable";
import { Rnd } from "react-rnd";

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleExternalTrigger = (e) => {
      if (e.detail) {
        setUserInput(e.detail);
        setIsOpen(true);
      }
      setIsOpen(true);
    };

    window.addEventListener("trigger-chatbot", handleExternalTrigger);
    return () => {
      window.removeEventListener("trigger-chatbot", handleExternalTrigger);
    };
  }, []);

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
            image_urls: data.image_urls || null,
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
      {/* <Draggable
        position={position}
        onDrag={(e, data) => setPosition({ x: data.x, y: data.y })}
      >
        <div className="chatbot-toggle" onClick={() => setIsOpen(!isOpen)}>
          <FontAwesomeIcon icon={faRobot} />
        </div>
      </Draggable> */}

      {/* <Draggable handle=".chatbot-input"> */}

      <Rnd
        // position={position}
        // bounds="parent"
        className="chatbot-rnd"
        default={{
          x: window.innerWidth - 400 - 20,
          y: window.innerHeight - 540 - 20,
        }}
        size={{ width: 400, height: 500 }}
        // onDragStop={(e, d) => setPosition({ x: d.x, y: d.y })}
        dragHandleClassName="chatbot-toggle"
        enableResizing={{
          topLeft: true,
          bottomRight: false,
          top: true,
          right: false,
          bottom: false,
          left: false,
          topRight: false,
          bottomLeft: false,
        }}
        // minWidth={300}
        // minHeight={400}
        maxWidth={600}
        maxHeight={800}
      >
        <div className="chatbot-toggle" onClick={() => setIsOpen(!isOpen)}>
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

                  {msg.image_urls && Array.isArray(msg.image_urls) && (
                    <div
                      className="chatbot-image-grid"
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(120px, 1fr))",
                        gap: "10px",
                        marginTop: "10px",
                      }}
                    >
                      {msg.image_urls.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Generated visual ${i + 1}`}
                          style={{
                            width: "100%",
                            borderRadius: "6px",
                            objectFit: "cover",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="chatbot-message bot">Thinking...</div>
              )}
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
      </Rnd>
      {/* </Draggable> */}
    </>
  );
};

export default ChatBot;
