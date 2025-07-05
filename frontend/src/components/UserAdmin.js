import React, { useEffect, useState } from "react";
import api from "../api";

// Register User form for admins, with role selection
function RegisterUser({ onRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("user");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage(""); setError("");
    if (!username || !password) return setError("Username and password required");
    if (password !== confirm) return setError("Passwords do not match");
    try {
      await api.post("/register", { username, password, role });
      setMessage("User registered!");
      setUsername(""); setPassword(""); setConfirm(""); setRole("user");
      if (onRegister) onRegister();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to register user");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 16, background: "#f7f7fa", padding: 12, borderRadius: 6 }}>
      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" style={{ marginRight: 8 }} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" style={{ marginRight: 8 }} />
      <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm Password" style={{ marginRight: 8 }} />
      <select value={role} onChange={e => setRole(e.target.value)} style={{ marginRight: 8 }}>
        <option value="admin">Admin</option>
        <option value="clerk">Clerk</option>
        <option value="low">Low Access</option>
      </select>
      <button type="submit">Register User</button>
      {error && <span style={{ color: "red", marginLeft: 8 }}>{error}</span>}
      {message && <span style={{ color: "green", marginLeft: 8 }}>{message}</span>}
    </form>
  );
}

export default function UserAdmin() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [role, setRole] = useState({});
  // For password change:
  const [pwUser, setPwUser] = useState(null);        // Which user's password box is open
  const [newPassword, setNewPassword] = useState(""); // The new password value
  const [pwMsg, setPwMsg] = useState("");            // Success message

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
      setError("");
    } catch {
      setError("Access denied or failed to load users.");
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      await api.put(`/users/${id}/role`, { role: newRole });
      loadUsers();
    } catch {
      setError("Failed to update role.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure?")) {
      try {
        await api.delete(`/users/${id}`);
        loadUsers();
      } catch {
        setError("Failed to delete user.");
      }
    }
  };

  const handleChangePassword = async (id) => {
    try {
      await api.put(`/users/${id}/password`, { password: newPassword });
      setPwMsg("Password changed!");
      setNewPassword("");
      setPwUser(null);
      setTimeout(() => setPwMsg(""), 2000);
    } catch {
      setPwMsg("Failed to change password.");
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: 20, background: "#fff", borderRadius: 10 }}>
      <h2>User Management</h2>
      <RegisterUser onRegister={loadUsers} />
      {error && <div style={{ color: "red" }}>{error}</div>}
      <table style={{ width: "100%", marginTop: 20, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#eee" }}>
            <th style={{ padding: 8 }}>Username</th>
            <th style={{ padding: 8 }}>Role</th>
            <th style={{ padding: 8 }}>Set Role</th>
            <th style={{ padding: 8 }}>Change Password</th>
            <th style={{ padding: 8 }}>Delete</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td style={{ padding: 8 }}>{u.username}</td>
              <td style={{ padding: 8 }}>{u.role}</td>
              <td style={{ padding: 8 }}>
                <select
                  value={role[u.id] ?? u.role}
                  onChange={e => {
                    setRole({ ...role, [u.id]: e.target.value });
                    handleRoleChange(u.id, e.target.value);
                  }}
                >
                  <option value="admin">Admin</option>
                  <option value="clerk">Clerk</option>
                  <option value="low">Low Access</option>
                </select>
              </td>
              <td style={{ padding: 8 }}>
                <button onClick={() => setPwUser(u.id)}>Change Password</button>
                {pwUser === u.id && (
                  <div>
                    <input
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      style={{ marginRight: 4 }}
                    />
                    <button onClick={() => handleChangePassword(u.id)}>
                      Save
                    </button>
                    {pwMsg && <span style={{ color: "green", marginLeft: 6 }}>{pwMsg}</span>}
                  </div>
                )}
              </td>
              <td style={{ padding: 8 }}>
                <button style={{ color: "red", background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => handleDelete(u.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
