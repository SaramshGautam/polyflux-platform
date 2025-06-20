import React, { useEffect } from "react";
import {
  getAuth,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

const FinishSignIn = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const email = window.localStorage.getItem("emailForSignIn");

    if (isSignInWithEmailLink(auth, window.location.href)) {
      signInWithEmailLink(auth, email, window.location.href)
        .then((result) => {
          localStorage.removeItem("emailForSignIn");
          // redirect after sign-in (optional: fetch role from Firestore here)
          navigate("/students-home");
        })
        .catch((error) => {
          console.error("Error signing in with email link", error);
        });
    }
  }, []);

  //   return <div>Completing sign-in...</div>;
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f9f9f9",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "30px 40px",
          borderRadius: "12px",
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.1)",
          textAlign: "center",
        }}
      >
        <h2 style={{ marginBottom: "10px", color: "#333" }}>Almost there...</h2>
        <p style={{ color: "#777" }}>We're completing your sign-in process.</p>
        <div
          style={{
            marginTop: "20px",
            width: "40px",
            height: "40px",
            border: "4px solid #eee",
            borderTop: "4px solid #007bff",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto",
          }}
        />
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default FinishSignIn;
