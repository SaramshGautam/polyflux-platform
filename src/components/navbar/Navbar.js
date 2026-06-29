import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "./Navbar.css";

// Derive a human-readable page title from the current URL path
function usePageTitle() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);

  if (parts.length === 0) return null;

  const decode = (s) => decodeURIComponent(s).replace(/-/g, " ");

  // /whiteboard/:classId/:projectName/:teamName
  if (parts[0] === "whiteboard" && parts.length >= 4) {
    return {
      label: decode(parts[2]),
      sub: `${decode(parts[1])} · ${decode(parts[3])}`,
    };
  }
  // /classroom/:classId/project/:projectName
  if (parts[0] === "classroom" && parts[2] === "project") {
    return { label: decode(parts[3] || ""), sub: decode(parts[1]) };
  }
  // /classroom/:classId  (anything under classroom)
  if (parts[0] === "classroom") {
    return { label: decode(parts[1] || ""), sub: "Classroom" };
  }

  const titleMap = {
    "teachers-home": "Teacher Dashboard",
    "students-home": "Student Dashboard",
    "add-classroom": "Add Classroom",
    "add-project": "Add Project",
    "how-to-use": "How to Use",
    "manage-teams": "Manage Teams",
  };
  const key = parts[parts.length - 1];
  if (titleMap[key]) return { label: titleMap[key], sub: null };

  return null;
}

// Simple breadcrumbs from path segments
function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const parts = location.pathname.split("/").filter(Boolean);

  if (parts.length <= 1) return null;

  const decode = (s) => decodeURIComponent(s).replace(/-/g, " ");

  // Build crumbs — skip "project" and "whiteboard" as labels, use them as separators
  const crumbs = [];
  let path = "";
  parts.forEach((part, i) => {
    path += `/${part}`;
    const skip = [
      "project",
      "whiteboard",
      "manage-students",
      "manage-teams",
    ].includes(part);
    if (!skip) {
      crumbs.push({ label: decode(part), path, last: i === parts.length - 1 });
    }
  });

  if (crumbs.length <= 1) return null;

  return (
    <nav className="nb-breadcrumbs" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <span key={c.path} className="nb-crumb">
          {i > 0 && (
            <span className="nb-crumb-sep" aria-hidden="true">
              /
            </span>
          )}
          {c.last ? (
            <span className="nb-crumb-current">{c.label}</span>
          ) : (
            <button className="nb-crumb-link" onClick={() => navigate(c.path)}>
              {c.label}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = usePageTitle();

  const isInWhiteboard = location.pathname.startsWith("/whiteboard");
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const role = localStorage.getItem("role");
  const displayName =
    localStorage.getItem("userDisplayName") ||
    localStorage.getItem("displayName") ||
    "";
  const userEmail = localStorage.getItem("userEmail") || "";
  const initial = (displayName || "?").charAt(0).toUpperCase();

  const homeRoute =
    role === "teacher"
      ? "/teachers-home"
      : role === "student"
      ? "/students-home"
      : "/";

  const handleLogout = () => {
    [
      "role",
      "photoURL",
      "userEmail",
      "displayName",
      "userDisplayName",
      "LSUID",
    ].forEach((k) => localStorage.removeItem(k));
    navigate("/");
  };

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".navbar")) setIsProfileOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      {/* ── Left — logo + title + breadcrumbs ── */}
      <div className="nb-left">
        <img
          src="/logo.png"
          alt="PolyFlux logo"
          className="nb-logo"
          onClick={() => navigate(homeRoute)}
        />
        <button className="nb-brand" onClick={() => navigate(homeRoute)}>
          PolyFlux
        </button>

        {role === "teacher" && (
          <>
            <div className="nb-divider" aria-hidden="true" />
            <Link
              to="/how-to-use"
              className="nb-link"
              title="Open PolyFlux Teacher Guide"
            >
              How to Use
            </Link>
          </>
        )}

        {/* Page title + breadcrumbs — hidden on very small screens */}
        {pageTitle && (
          <>
            <div className="nb-divider" aria-hidden="true" />
            <div className="nb-page-info">
              <span className="nb-page-title">{pageTitle.label}</span>
              {pageTitle.sub && (
                <span className="nb-page-sub">{pageTitle.sub}</span>
              )}
            </div>
          </>
        )}

        <Breadcrumbs />
      </div>

      {/* ── Right — email + avatar (sits LEFT of the AI toggle) ── */}
      <div className="nb-right">
        <div className="nb-profile-wrap">
          <button
            className="nb-avatar-row"
            onClick={() => setIsProfileOpen((p) => !p)}
            aria-label="Profile menu"
            aria-expanded={isProfileOpen}
          >
            <div className="nb-user-info">
              {displayName && (
                <span className="nb-user-name">{displayName}</span>
              )}
              {userEmail && <span className="nb-user-email">{userEmail}</span>}
            </div>
            <div className="nb-avatar">{initial}</div>
          </button>

          {isProfileOpen && (
            <ul className="nb-dropdown" role="menu">
              <li className="nb-dropdown-name" role="presentation">
                <span>{displayName || "User"}</span>
                <span className="nb-dropdown-role">{role}</span>
              </li>
              <li className="nb-dropdown-divider" />

              {role === "teacher" && (
                <li role="menuitem">
                  <Link
                    className="nb-dropdown-item"
                    to="/how-to-use"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    📘 How to Use
                  </Link>
                </li>
              )}

              {isInWhiteboard && (
                <li role="menuitem">
                  <a
                    className="nb-dropdown-item"
                    href="https://lsu.qualtrics.com/jfe/form/SV_ea1qXwTavlQNfv0"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    📤 Submit Feedback
                  </a>
                </li>
              )}

              <li role="menuitem">
                <button
                  className="nb-dropdown-item nb-dropdown-item--danger"
                  onClick={handleLogout}
                >
                  → Log out
                </button>
              </li>
            </ul>
          )}
        </div>

        {/* Spacer only on whiteboard — reserves room for the fixed AI toggle pill */}
        {isInWhiteboard && <div className="nb-ai-spacer" aria-hidden="true" />}
      </div>
    </nav>
  );
};

export default Navbar;
