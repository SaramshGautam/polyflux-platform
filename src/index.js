import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { FlashMessageProvider } from "./FlashMessageContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <FlashMessageProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </FlashMessageProvider>
  </React.StrictMode>
);
