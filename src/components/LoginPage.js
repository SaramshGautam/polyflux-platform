import React, { useState, useEffect } from "react";
// import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useFlashMessage } from "../FlashMessageContext"; // Import the flash message hook
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
// import firebaseConfig from "../firebaseConfig";
import { app, db, auth, googleProvider, storage } from "../firebaseConfig";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";

// Firebase configuration

// Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// const provider = new GoogleAuthProvider();
// const db = getFirestore(app);

const LoginPage = () => {
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();
  const addMessage = useFlashMessage(); // Get the flash message function from context
  const [email, setEmail] = useState("");
  // Add 'login-page' class to the body when the component mounts
  useEffect(() => {
    document.body.classList.add("login-page");
    return () => {
      document.body.classList.remove("login-page");
    };
  }, []);

  const handleEmailSignIn = async () => {
    if (!email.endsWith("@lsu.edu")) {
      addMessage("danger", "Only LSU email addresses are allowed.");
      return;
    }

    const actionCodeSettings = {
      // url: "https://colla-board.vercel.app//finishSignIn", // Adjust for deployed domain later
      url: "https://polyflux-platform.vercel.app//finishSignIn",
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
      addMessage("info", "Sign-in link sent. Check your LSU email.");
    } catch (error) {
      console.error("Email sign-in failed:", error);
      addMessage("danger", "Could not send sign-in link. Please try again.");
    }
  };

  const googleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userEmail = user.email;
      const userName = user.displayName;
      const photoURL = user.photoURL;

      // Fetch role & LSUID from Firestore
      const userDoc = await getDoc(doc(db, "users", userEmail));
      if (!userDoc.exists()) {
        // Use flash message to alert user not found
        addMessage("danger", "User not found in the database.");
        return;
      }

      const userData = userDoc.data();
      const role = userData.role;
      const LSUID = userData.lsuID || null; // Ensure LSUID is retrieved

      // Store user data in localStorage
      localStorage.setItem("role", role);
      localStorage.setItem("userEmail", userEmail);
      localStorage.setItem("photoURL", photoURL);
      if (LSUID) {
        localStorage.setItem("LSUID", LSUID);
      }

      // Debugging Logs
      console.log("User Email:", userEmail);
      console.log("User Role:", role);
      console.log("LSUID:", LSUID);

      // Show welcome flash message in the top right corner
      addMessage("success", `Welcome, ${userName}!`);

      // Navigate based on role
      navigate(role === "teacher" ? "/teachers-home" : "/students-home");
    } catch (error) {
      console.error("Google login failed:", error);
      addMessage("danger", "Google login failed. Please try again.");
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center min-vh-100"
      // style={{ backgroundColor: "#f0f0f0" }}
      style={{
        backgroundImage: 'url("/body-bg3.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="login-container p-4 bg-white rounded shadow text-center">
        <h2
          className="mb-4"
          style={{ fontWeight: 700, fontSize: "28px", color: "#333" }}
        >
          Welcome to PolyFlux
        </h2>
        <img
          src="/logo.png"
          alt="App logo"
          style={{ width: "150px", marginBottom: "20px" }}
        />

        {/* <h2 className="text-center mb-4">PolyFlux</h2> */}

        <p className="mb-4 text-muted">Collaborate. Create. Reflect.</p>

        {/* Local flash messages (if any) */}
        {message && (
          <div
            className={`alert ${
              message.includes("failed") ? "alert-danger" : "alert-info"
            }`}
            role="alert"
          >
            <strong>{message}</strong>
          </div>
        )}

        <div className="mb-3">
          {/* Google Login Button - Centered */}
          <div className="d-flex justify-content-center">
            <button className="googlebutton" onClick={googleLogin}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid"
                viewBox="0 0 256 262"
              >
                <path
                  fill="#4285F4"
                  d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                ></path>
                <path
                  fill="#34A853"
                  d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                ></path>
                <path
                  fill="#FBBC05"
                  d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                ></path>
                <path
                  fill="#EB4335"
                  d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                ></path>
              </svg>
              Login with Google
            </button>
          </div>

          <div className="mt-4">
            <input
              className="form-control mb-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your LSU email"
            />
            {/* <button onClick={handleEmailSignIn}>Send Sign-In Link</button> */}
            <button
              className="btn btn-primary w-100"
              onClick={handleEmailSignIn}
            >
              Send Sign-In Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
