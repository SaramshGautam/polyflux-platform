import React, { useState, useEffect } from "react";
// import { useNavigate, Routes, Route } from "react-router-dom";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "./Navbar.css";
import Breadcrumbs from "./Breadcrumbs";
import HowToUse from "./HowToUse";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isInWhiteboard = location.pathname.startsWith("/whiteboard");

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const role = localStorage.getItem("role");
  const photoURL = localStorage.getItem("photoURL");
  const displayName = localStorage.getItem("displayName") || "";

  const homeRoute =
    role === "teacher"
      ? "/teachers-home"
      : role === "student"
      ? "/students-home"
      : "/";

  const handleProfileClick = () => {
    setIsProfileOpen((prev) => !prev); // Toggle profile dropdown visibility
  };

  const handleLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("photoURL");
    navigate("/"); // Redirect to login page
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.closest(".navbar") === null) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="navbar">
      <div className="navbar-left">
        {/* Logo and links */}
        <img
          src="/logo.png"
          alt="App logo"
          style={{ width: "20px", marginRight: "7px" }}
        />
        <div className="navbar-title" onClick={() => navigate(homeRoute)}>
          PolyFlux
        </div>
        <div className="navbar-links">
          {/* <a href="#about">About</a> */}
          {/* <a href="#contact">Contact</a> */}
          {role === "teacher" && (
            <Link to="/how-to-use" title="Open PolyFlux Teacher Guide">
              How to Use
            </Link>
          )}
        </div>
        <div className="divider" aria-hidden="true" />
        {/* <div className="navbar-breadcrumbs">
          <Breadcrumbs />
        </div> */}
      </div>
      <div className="navbar-right">
        <ul className="nav-item dropdown">
          <li className="nav-link dropdown-toggle" onClick={handleProfileClick}>
            {/* {photoURL ? (
              <img
                src={photoURL}
                alt="Profile"
                className="profile-picture"
                style={{
                  width: "35px",
                  height: "35px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  cursor: "pointer",
                  border: "2px solid white",
                }}
              />
            ) : (
              <i
                className="bi bi-person"
                style={{ fontSize: "24px", color: "white" }}
              ></i>
            )} */}

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Initials avatar */}
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "14px",
                  background: "rgba(255,255,255,0.18)",
                  border: "2px solid white",
                  color: "white",
                  userSelect: "none",
                }}
                title={displayName || "User"}
              >
                {displayName}
              </div>
            </div>
          </li>
          {/* Dropdown Menu */}
          <ul className={`dropdown-menu ${isProfileOpen ? "show" : ""}`}>
            {/* Optional: show guide in dropdown too (teachers only) */}
            {role === "teacher" && (
              <li>
                <Link
                  className="dropdown-item btn btn-dark btn-sm"
                  to="/how-to-use"
                >
                  📘 How to Use
                </Link>
              </li>
            )}
            <li>
              <button
                className="dropdown-item btn btn-dark btn-sm"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right me-2"></i> Logout
              </button>
            </li>

            {isInWhiteboard && (
              <li>
                <a
                  className="dropdown-item btn btn-dark btn-sm"
                  href="https://lsu.qualtrics.com/jfe/form/SV_ea1qXwTavlQNfv0"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="bi bi-send me-2"></i>
                  Submit Feedback
                </a>
              </li>
            )}
          </ul>
        </ul>
      </div>
    </div>
  );
};

export default Navbar;
