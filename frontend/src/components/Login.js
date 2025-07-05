import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import Register from "./Register";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Fade,
} from "@mui/material";
import "./EntryGlass.css";

export default function Login({ setIsLoggedIn, setUsername, setCurrentUser }) {
  const [username, setUser] = useState("");
  const [password, setPass] = useState("");
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(false);

  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/");
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/login", { username, password });
      if (!res.data || !res.data.token) {
        throw new Error("No token returned from server");
      }
      // Save JWT and user info
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("ntc-user", JSON.stringify(res.data));
      setIsLoggedIn(true);
      setUsername(res.data.username);
      setCurrentUser(res.data); // full user object
      navigate("/"); // Go to dashboard
    } catch (err) {
      // Handle error with message from backend if possible
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        setError("Invalid username or password.");
      } else {
        setError(
          err.response?.data?.message ||
            "An error occurred. Please try again."
        );
      }
    }
  };

  if (showRegister) {
    return (
      <Fade in>
        <Box minHeight="70vh" display="flex" alignItems="center" justifyContent="center">
          <Paper
            className="entry-glass-card"
            elevation={0}
            sx={{
              maxWidth: 600,
              width: 600,
              mx: "auto",
              my: 6,
              p: { xs: 3, md: 5 },
            }}
          >
            <Register onSuccess={() => setShowRegister(false)} />
            <Box textAlign="center" mt={2}>
              <Button
                variant="text"
                sx={{ color: "#13adc7", fontWeight: 600 }}
                onClick={() => setShowRegister(false)}
              >
                Already have an account? Login
              </Button>
            </Box>
          </Paper>
        </Box>
      </Fade>
    );
  }

  return (
    <Box minHeight="70vh" display="flex" alignItems="center" justifyContent="center">
      <Paper
        className="entry-glass-card"
        elevation={0}
        sx={{
          maxWidth: 400,
          width: 400,
          mx: "auto",
          my: 6,
          p: { xs: 3, md: 5 },
        }}
      >
        <Typography
          className="entry-section-title"
          variant="h5"
          sx={{ textAlign: "center", mb: 3 }}
        >
          Login
        </Typography>
        <Box
          component="form"
          onSubmit={handleLogin}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            alignItems: "stretch",
          }}
        >
          <TextField
            label="Username"
            value={username}
            onChange={e => setUser(e.target.value)}
            autoFocus
            fullWidth
            required
            autoComplete="username"
          />
          <TextField
            label="Password"
            value={password}
            onChange={e => setPass(e.target.value)}
            type="password"
            fullWidth
            required
            autoComplete="current-password"
          />
          <Button
            type="submit"
            variant="contained"
            className="accent-btn"
            fullWidth
            sx={{ fontWeight: 700, mt: 1 }}
          >
            Login
          </Button>
          {error && (
            <Typography sx={{ color: "red", mt: 1, textAlign: "center" }}>
              {error}
            </Typography>
          )}
          <Box textAlign="center" mt={2}>
            <Button
              onClick={() => setShowRegister(true)}
              variant="text"
              sx={{ color: "#13adc7", fontWeight: 600 }}
              type="button"
            >
              Create a new account
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
