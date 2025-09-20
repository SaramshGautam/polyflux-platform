import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig";

export default function ProtectedRoute({ children }) {
  const [ok, setOk] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/login");
        return;
      }
      await u.reload();
      if (!u.emailVerified) {
        await auth.signOut();
        // clear any stale localStorage
        ["role", "userEmail", "photoURL", "LSUID"].forEach((k) =>
          localStorage.removeItem(k)
        );
        navigate("/verify-email", { state: { email: u.email } });
        return;
      }
      setOk(true);
    });
    return unsub;
  }, [navigate]);

  if (!ok) return null; // or a spinner
  return children;
}
