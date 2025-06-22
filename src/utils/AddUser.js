import React, { useState } from "react";
import { db } from "../firebaseConfig";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { getDocs, collection, query, where } from "firebase/firestore";

import "./AddUser.css";

const AddUser = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("student");
  const [message, setMessage] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const handleFindUser = async (e) => {
    e.preventDefault();
    if (!searchEmail) {
      setMessage("⚠️ Please enter an email to search.");
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("email", ">=", searchEmail),
        where("email", "<=", searchEmail + "\uf8ff")
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setMessage(`No user found with email: ${searchEmail}`);
        setSearchResults([]);
        return;
      }
      const results = querySnapshot.docs.map((doc) => doc.id);
      setSearchResults(results);
      if (results.length === 0) {
        setMessage(`No user found with email: ${searchEmail}`);
      } else {
        setMessage(`User found: ${results.join(", ")}`);
        setSearchEmail("");
        setSearchResults(results);
      }
    } catch (error) {
      console.error("Error finding user:", error);
      setMessage("❌ Error finding user.");
      return;
    }
  };

  const handleDeleteUser = async (e) => {
    e.preventDefault();
    if (!searchEmail) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (!searchEmail) {
      setMessage("Please enter an email to delete.");
      return;
    }

    try {
      await deleteDoc(doc(db, "users", searchEmail));
      setMessage(`🗑️ User with email ${searchEmail} deleted.`);
      setSearchEmail("");
    } catch (error) {
      console.error("Error deleting user:", error);
      setMessage("❌ Error deleting user.");
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!email || !role) {
      setMessage("Please fill in all fields.");
      return;
    }

    try {
      const userRef = doc(db, "users", email);
      await setDoc(userRef, { email, name, role });

      setMessage(`✅ ${email} added as ${role}`);
      setEmail("");
      setRole("student");
    } catch (error) {
      console.error("Error adding user:", error);
      setMessage("❌ Error adding user.");
    }
  };

  return (
    // <div style={{ padding: "2rem", maxWidth: "500px", margin: "0 auto" }}>
    <div className="adduser-page">
      <h2 className="adduser-title">Add New User</h2>
      <form onSubmit={handleAddUser} className="adduser-form">
        <div style={{ marginBottom: "1rem" }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label>Name:</label>
          <input
            type="mane"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label>Role:</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit">Add User</button>
      </form>
      <h3 className="adduser-title">Delete User</h3>
      <div className="adduser-form">
        <label>Search by Email:</label>
        <input
          type="email"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          placeholder="Enter email to delete"
        />
        {/* <button onClick={handleDeleteUser}>Delete User</button> */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button onClick={handleFindUser}>Find User</button>
          <button onClick={handleDeleteUser}>Delete User</button>
        </div>
        {searchResults.length > 0 && (
          <div className="search-results">
            <h4>Search Results:</h4>
            <p>Click an email to select:</p>
            <ul>
              {searchResults.map((email, index) => (
                <li key={index}>
                  <button onClick={() => setSearchEmail(email)}>{email}</button>
                </li>
              ))}
            </ul>
            {/* <ul>
              {searchResults.map((result) => (
                <li key={result}>{result}</li>
              ))}
            </ul> */}
          </div>
        )}
      </div>
      {message && <p className="adduser-message">{message}</p>}
    </div>
  );
};

export default AddUser;
