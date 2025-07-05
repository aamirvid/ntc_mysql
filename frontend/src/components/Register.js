import React, { useState } from "react";
import api from "../api";

export default function Register({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!username || !password) {
      setError("Username and password required");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    try {
      await api.post("/register", { username, password, role });
      setMessage("User registered! You can now log in.");
      setUsername("");
      setPassword("");
      setConfirm("");
      setRole("user");
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <form onSubmit={handleRegister} style={{ maxWidth: 320, margin: "40px auto", padding: 24, borderRadius: 8, boxShadow: "0 4px 16px #0002", background: "#fff" }}>
      <h2>Register</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: 12, padding: 8, borderRadius: 4, border: "1px solid #bbb" }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: 12, padding: 8, borderRadius: 4, border: "1px solid #bbb" }}
      />
      <input
        type="password"
        placeholder="Confirm Password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: 12, padding: 8, borderRadius: 4, border: "1px solid #bbb" }}
      />
      <select
        value={role}
        onChange={e => setRole(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: 12, padding: 8, borderRadius: 4, border: "1px solid #bbb" }}
      >
        <option value="admin">Admin</option>
        <option value="clerk">Clerk</option>
        <option value="low">Low Access</option>
      </select>
      <button type="submit" style={{ width: "100%", padding: 10, borderRadius: 4, background: "#1565c0", color: "#fff", fontWeight: "bold", border: "none" }}>
        Register
      </button>
      {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}
      {message && <div style={{ color: "green", marginTop: 10 }}>{message}</div>}
    </form>
  );
}
