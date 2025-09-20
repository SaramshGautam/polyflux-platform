import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function AccountCreatedSuccess() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const email = state?.email || "";

  return (
    <div
      className="d-flex justify-content-center align-items-center min-vh-100"
      style={{
        backgroundImage: 'url("/body-bg3.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="login-container p-4 bg-white rounded shadow text-center">
        <h2
          className="mb-2"
          style={{ fontWeight: 700, fontSize: "28px", color: "#333" }}
        >
          Account created successfully
        </h2>

        <p className="mb-3 text-muted">
          Your account <strong>{email || " "}</strong> has been created. You can
          now sign in with your credentials.
        </p>

        <button className="btn btn-primary w-100" onClick={() => navigate("/")}>
          Go to Login
        </button>
      </div>
    </div>
  );
}
