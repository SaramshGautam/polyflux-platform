import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { FlashMessageProvider } from "./FlashMessageContext";

if (process.env.NODE_ENV === "production") {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
}

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
