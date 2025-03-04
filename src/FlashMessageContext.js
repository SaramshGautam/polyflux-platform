import React, { createContext, useState, useContext } from "react";

const FlashMessageContext = createContext();

export const FlashMessageProvider = ({ children }) => {
  const [message, setMessage] = useState(null);

  const addMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <FlashMessageContext.Provider value={addMessage}>
      {children}
      {message && (
        <div
          className={`alert alert-${message.type} position-fixed end-0 m-3`}
          role="alert"
          style={{ top: '70px', zIndex: 1050 }} 
        >
          {message.text}
        </div>
      )}
    </FlashMessageContext.Provider>
  );
};

export const useFlashMessage = () => {
  return useContext(FlashMessageContext);
};
