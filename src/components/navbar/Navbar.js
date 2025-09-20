import React, { useState, useEffect } from "react";
// import { useNavigate, Routes, Route } from "react-router-dom";
import { useNavigate, Link } from "react-router-dom";
import "./Navbar.css";
import HowToUse from "./HowToUse";

const Navbar = () => {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const role = localStorage.getItem("role");
  const photoURL = localStorage.getItem("photoURL");
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
      </div>
      <div className="navbar-right">
        {/* Dropdown for logout */}
        {/* <button
          onClick={() => {
            const panel = document.querySelector(".inactivity-panel");
            if (panel) {
              panel.style.display =
                panel.style.display === "none" ? "block" : "none";
            }
          }}
          style={{
            background: "none",
            border: "none",
            color: "white",
            fontSize: "20px",
            cursor: "pointer",
            marginRight: "10px",
          }}
          title="Toggle Inactivity Monitor"
        >
          🕒
        </button> */}
        <ul className="nav-item dropdown">
          <li className="nav-link dropdown-toggle" onClick={handleProfileClick}>
            {photoURL ? (
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
            )}
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
          </ul>
        </ul>
      </div>
    </div>
  );
};

export default Navbar;
