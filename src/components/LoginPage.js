import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useFlashMessage } from "../FlashMessageContext";
import { db, auth } from "../firebaseConfig";
import "./LoginPage.css";

const LoginPage = () => {
  const [view, setView] = useState("login"); // "login" | "signup" | "forgot" | "forgot-sent"

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Signup fields
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupLsuId, setSignupLsuId] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  // Forgot password
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const navigate = useNavigate();
  const addMessage = useFlashMessage();

  useEffect(() => {
    document.body.classList.add("login-page");
    return () => document.body.classList.remove("login-page");
  }, []);

  const isLsuEmail = (val) => /^[^\s@]+@lsu\.edu$/i.test(val.trim());

  // ─── Sign in ─────────────────────────────────────────────────────────────
  const emailPasswordLogin = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!isLsuEmail(normalizedEmail)) {
      addMessage(
        "danger",
        "Please sign in with your LSU email address (@lsu.edu)."
      );
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );
      const userDoc = await getDoc(doc(db, "users", normalizedEmail));

      if (!userDoc.exists()) {
        addMessage(
          "danger",
          "Your account is not registered. Please contact your instructor."
        );
        await auth.signOut();
        return;
      }

      const userData = userDoc.data();
      const role = (userData.role || "student").toLowerCase();

      if (role !== "student") {
        addMessage("danger", "This portal is for students only.");
        await auth.signOut();
        return;
      }

      localStorage.setItem("role", role);
      localStorage.setItem("userEmail", normalizedEmail);
      localStorage.setItem(
        "userDisplayName",
        result.user.displayName || normalizedEmail
      );
      if (userData.lsuID) localStorage.setItem("LSUID", userData.lsuID);

      addMessage("success", "Welcome back!");
      navigate("/students-home");
    } catch (error) {
      console.error("Login failed:", error);
      const msgs = {
        "auth/user-not-found": "No account found for this email.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/invalid-email": "Please enter a valid LSU email address.",
        "auth/too-many-requests":
          "Too many attempts. Please wait and try again.",
      };
      addMessage(
        "danger",
        msgs[error.code] || "Sign in failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Sign up ─────────────────────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    const normalizedEmail = signupEmail.trim().toLowerCase();
    const trimmedName = signupName.trim();
    const trimmedLsuId = signupLsuId.trim();

    if (!isLsuEmail(normalizedEmail)) {
      addMessage("danger", "Please use your LSU email address (@lsu.edu).");
      return;
    }
    if (!trimmedName) {
      addMessage("danger", "Please enter your full name.");
      return;
    }
    if (!trimmedLsuId) {
      addMessage("danger", "Please enter your LSU ID.");
      return;
    }
    if (signupPassword.length < 6) {
      addMessage("danger", "Password must be at least 6 characters.");
      return;
    }
    if (signupPassword !== signupConfirm) {
      addMessage("danger", "Passwords do not match.");
      return;
    }

    setSignupLoading(true);
    try {
      // Check if a Firestore user doc already exists (e.g. pre-registered by instructor)
      const existingDoc = await getDoc(doc(db, "users", normalizedEmail));
      if (existingDoc.exists()) {
        addMessage(
          "danger",
          "An account with this email already exists. Please sign in."
        );
        setView("login");
        return;
      }

      // Create Firebase Auth account
      const result = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        signupPassword
      );
      await updateProfile(result.user, { displayName: trimmedName });

      // Write user doc to Firestore
      await setDoc(doc(db, "users", normalizedEmail), {
        name: trimmedName,
        email: normalizedEmail,
        lsuID: trimmedLsuId,
        role: "student",
        createdAt: serverTimestamp(),
      });

      // Populate localStorage and navigate
      localStorage.setItem("role", "student");
      localStorage.setItem("userEmail", normalizedEmail);
      localStorage.setItem("userDisplayName", trimmedName);
      localStorage.setItem("LSUID", trimmedLsuId);

      addMessage("success", `Welcome, ${trimmedName}!`);
      navigate("/students-home");
    } catch (error) {
      console.error("Sign-up failed:", error);
      const msgs = {
        "auth/email-already-in-use":
          "An account with this email already exists. Please sign in.",
        "auth/invalid-email": "Please enter a valid LSU email address.",
        "auth/weak-password":
          "Password is too weak. Use at least 6 characters.",
      };
      addMessage(
        "danger",
        msgs[error.code] || "Sign-up failed. Please try again."
      );
    } finally {
      setSignupLoading(false);
    }
  };

  // ─── Forgot password ──────────────────────────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const trimmed = resetEmail.trim().toLowerCase();

    if (!trimmed) {
      addMessage("danger", "Please enter your LSU email address.");
      return;
    }
    if (!isLsuEmail(trimmed)) {
      addMessage(
        "danger",
        "Please enter a valid LSU email address (@lsu.edu)."
      );
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setView("forgot-sent");
    } catch (error) {
      console.error("Password reset failed:", error);
      const msgs = {
        "auth/user-not-found": "No account found for this email address.",
        "auth/invalid-email": "Please enter a valid LSU email address.",
        "auth/too-many-requests":
          "Too many requests. Please wait before trying again.",
      };
      addMessage(
        "danger",
        msgs[error.code] || "Failed to send reset email. Please try again."
      );
    } finally {
      setResetLoading(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const switchTo = (target) => {
    // Pre-fill reset email from login email when switching to forgot
    if (target === "forgot") setResetEmail(email);
    setView(target);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="lsu-login-bg"
      style={{
        backgroundImage: `url(${process.env.PUBLIC_URL}/body-bg3.png)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="lsu-login-card">
        {/* ── Header ── */}
        <div className="lsu-login-header">
          {(view === "login" || view === "signup") && (
            <>
              <img src="/logo.png" alt="PolyFlux logo" className="lsu-logo" />
              <h1 className="lsu-title">PolyFlux</h1>
              <p className="lsu-subtitle">
                {view === "login"
                  ? "Sign in with your LSU account"
                  : "Create your LSU student account"}
              </p>
            </>
          )}
          {view === "forgot" && (
            <>
              <h1 className="lsu-title lsu-title--sm">Reset Password</h1>
              <p className="lsu-subtitle">
                Enter your LSU email and we'll send you a reset link.
              </p>
            </>
          )}
          {view === "forgot-sent" && (
            <>
              <div className="lsu-check-icon">✓</div>
              <h1 className="lsu-title lsu-title--sm">Check Your Email</h1>
            </>
          )}
        </div>

        {/* ════════════════════════════════
            VIEW: login
        ════════════════════════════════ */}
        {view === "login" && (
          <form onSubmit={emailPasswordLogin} noValidate>
            <div className="lsu-field">
              <label htmlFor="lsu-email">LSU Email</label>
              <input
                id="lsu-email"
                type="email"
                placeholder="yourname@lsu.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="lsu-field">
              <div className="lsu-field-row">
                <label htmlFor="lsu-password">Password</label>
                <button
                  type="button"
                  className="lsu-forgot-link"
                  onClick={() => switchTo("forgot")}
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="lsu-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="lsu-btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span
                  className="lsu-spinner"
                  role="status"
                  aria-label="Signing in"
                />
              ) : (
                "Sign In"
              )}
            </button>

            <p className="lsu-switch-text">
              Don't have an account?{" "}
              <button
                type="button"
                className="lsu-switch-link"
                onClick={() => switchTo("signup")}
              >
                Create one
              </button>
            </p>

            <p className="lsu-help-text">
              Having trouble? Contact your instructor or{" "}
              <a href="mailto:helpdesk@lsu.edu">LSU Help Desk</a>.
            </p>
          </form>
        )}

        {/* ════════════════════════════════
            VIEW: signup
        ════════════════════════════════ */}
        {view === "signup" && (
          <form onSubmit={handleSignup} noValidate>
            <div className="lsu-field">
              <label htmlFor="signup-name">Full Name</label>
              <input
                id="signup-name"
                type="text"
                placeholder="Jane Doe"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="lsu-field">
              <label htmlFor="signup-email">LSU Email</label>
              <input
                id="signup-email"
                type="email"
                placeholder="yourname@lsu.edu"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="lsu-field">
              <label htmlFor="signup-lsuid">LSU ID</label>
              <input
                id="signup-lsuid"
                type="text"
                placeholder="e.g. 89012345"
                value={signupLsuId}
                onChange={(e) => setSignupLsuId(e.target.value)}
                required
              />
            </div>

            <div className="lsu-field">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                placeholder="At least 6 characters"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="lsu-field">
              <label htmlFor="signup-confirm">Confirm Password</label>
              <input
                id="signup-confirm"
                type="password"
                placeholder="Re-enter your password"
                value={signupConfirm}
                onChange={(e) => setSignupConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="lsu-btn-primary"
              disabled={signupLoading}
            >
              {signupLoading ? (
                <span
                  className="lsu-spinner"
                  role="status"
                  aria-label="Creating account"
                />
              ) : (
                "Create Account"
              )}
            </button>

            <p className="lsu-switch-text">
              Already have an account?{" "}
              <button
                type="button"
                className="lsu-switch-link"
                onClick={() => switchTo("login")}
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* ════════════════════════════════
            VIEW: forgot — enter email
        ════════════════════════════════ */}
        {view === "forgot" && (
          <form onSubmit={handleForgotPassword} noValidate>
            <div className="lsu-field">
              <label htmlFor="reset-email">LSU Email Address</label>
              <input
                id="reset-email"
                type="email"
                placeholder="yourname@lsu.edu"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="lsu-btn-primary"
              disabled={resetLoading}
            >
              {resetLoading ? (
                <span
                  className="lsu-spinner"
                  role="status"
                  aria-label="Sending"
                />
              ) : (
                "Send Reset Link"
              )}
            </button>

            <button
              type="button"
              className="lsu-back-link"
              onClick={() => switchTo("login")}
            >
              ← Back to sign in
            </button>
          </form>
        )}

        {/* ════════════════════════════════
            VIEW: forgot-sent — confirmation
        ════════════════════════════════ */}
        {view === "forgot-sent" && (
          <div className="lsu-sent-body">
            <p className="lsu-sent-desc">
              A password reset link has been sent to:
            </p>
            <p className="lsu-sent-email">{resetEmail}</p>
            <p className="lsu-sent-note">
              Check your inbox and spam folder. The link expires in 1 hour.
            </p>
            <button
              type="button"
              className="lsu-btn-outline"
              onClick={() => {
                setResetEmail("");
                setView("forgot");
              }}
            >
              Resend to a different email
            </button>
            <button
              type="button"
              className="lsu-back-link"
              onClick={() => switchTo("login")}
            >
              ← Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
