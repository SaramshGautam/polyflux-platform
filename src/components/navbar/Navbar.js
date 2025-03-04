import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const role = localStorage.getItem("role"); // Get role from localStorage
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
        <div className="navbar-title" onClick={() => navigate(homeRoute)}>
          collaBOARD
        </div>
        <div className="navbar-links">
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>
      </div>
      <div className="navbar-right">
        {/* Dropdown for logout */}
        <ul className="nav-item dropdown">
          <li className="nav-link dropdown-toggle" onClick={handleProfileClick}>
            <i className="bi bi-person" style={{ fontSize: "24px", color: "white" }}></i>
          </li>
          {/* Dropdown Menu */}
          <ul className={`dropdown-menu ${isProfileOpen ? "show" : ""}`}>
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
