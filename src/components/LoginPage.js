import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebaseConfig";
import "./LoginPage.css";

const ROLE_ROUTES = {
  student: "/students-home",
  teacher: "/teachers-home",
  admin: "/admin-home",
};

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

  // Toasts
  const [toasts, setToasts] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add("login-page");
    return () => document.body.classList.remove("login-page");
  }, []);

  // ─── Toast helpers ────────────────────────────────────────────────────────
  const showToast = (type, msg) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, msg }]);
    setTimeout(() => dismissToast(id), 4500);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toastIcon = (type) => {
    if (type === "success") return "✓";
    if (type === "danger") return "✕";
    return "⚠";
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const isLsuEmail = (val) => /^[^\s@]+@lsu\.edu$/i.test(val.trim());

  const switchTo = (target) => {
    if (target === "forgot") setResetEmail(email);
    setView(target);
  };

  // ─── Sign in ─────────────────────────────────────────────────────────────
  const emailPasswordLogin = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!isLsuEmail(normalizedEmail)) {
      showToast(
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
        showToast(
          "danger",
          "Your account is not registered. Please contact your instructor."
        );
        await auth.signOut();
        return;
      }

      const userData = userDoc.data();
      const role = (userData.role || "student").toLowerCase();
      const destination = ROLE_ROUTES[role];

      if (!destination) {
        showToast(
          "danger",
          "Unrecognised account role. Please contact support."
        );
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

      showToast(
        "success",
        role === "teacher"
          ? `Welcome back, ${result.user.displayName || "Professor"}!`
          : "Welcome back!"
      );

      // Small delay so the user sees the toast before navigating
      setTimeout(() => navigate(destination), 600);
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
      showToast(
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
      showToast("danger", "Please use your LSU email address (@lsu.edu).");
      return;
    }
    if (!trimmedName) {
      showToast("danger", "Please enter your full name.");
      return;
    }
    if (!trimmedLsuId) {
      showToast("danger", "Please enter your LSU ID.");
      return;
    }
    if (signupPassword.length < 6) {
      showToast("danger", "Password must be at least 6 characters.");
      return;
    }
    if (signupPassword !== signupConfirm) {
      showToast("danger", "Passwords do not match.");
      return;
    }

    setSignupLoading(true);
    try {
      const existingDoc = await getDoc(doc(db, "users", normalizedEmail));
      if (existingDoc.exists()) {
        showToast(
          "danger",
          "An account with this email already exists. Please sign in."
        );
        setView("login");
        return;
      }

      const result = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        signupPassword
      );
      await updateProfile(result.user, { displayName: trimmedName });

      await setDoc(doc(db, "users", normalizedEmail), {
        name: trimmedName,
        email: normalizedEmail,
        lsuID: trimmedLsuId,
        role: "student",
        createdAt: serverTimestamp(),
      });

      localStorage.setItem("role", "student");
      localStorage.setItem("userEmail", normalizedEmail);
      localStorage.setItem("userDisplayName", trimmedName);
      localStorage.setItem("LSUID", trimmedLsuId);

      showToast("success", `Welcome, ${trimmedName}!`);
      setTimeout(() => navigate("/students-home"), 600);
    } catch (error) {
      console.error("Sign-up failed:", error);
      const msgs = {
        "auth/email-already-in-use":
          "An account with this email already exists. Please sign in.",
        "auth/invalid-email": "Please enter a valid LSU email address.",
        "auth/weak-password":
          "Password is too weak. Use at least 6 characters.",
      };
      showToast(
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
      showToast("danger", "Please enter your LSU email address.");
      return;
    }
    if (!isLsuEmail(trimmed)) {
      showToast("danger", "Please enter a valid LSU email address (@lsu.edu).");
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
      showToast(
        "danger",
        msgs[error.code] || "Failed to send reset email. Please try again."
      );
    } finally {
      setResetLoading(false);
    }
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
        {/* ── Toast container ── */}
        <div
          className="lsu-toast-container"
          aria-live="polite"
          aria-atomic="false"
        >
          {toasts.map(({ id, type, msg }) => (
            <div
              key={id}
              className={`lsu-toast lsu-toast--${type}`}
              role="alert"
            >
              <span className="lsu-toast-icon" aria-hidden="true">
                {toastIcon(type)}
              </span>
              <span className="lsu-toast-msg">{msg}</span>
              <button
                className="lsu-toast-close"
                onClick={() => dismissToast(id)}
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

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
