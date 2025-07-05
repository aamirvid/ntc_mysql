import React from "react";
import { AppBar, Toolbar, Typography, Box, IconButton, Button, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import YearSelector from "./YearSelector";
import { getUserRole } from "../auth";
import { LogOut, UserCog, FileText, ListChecks, Users, ClipboardList, Sun, Moon } from "lucide-react";
import "./NavbarGlass.css";
import { useThemeMode } from '../ThemeModeContext';

export default function Navbar({ selectedYear, setSelectedYear }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const role = getUserRole();
  const { mode, toggleMode } = useThemeMode();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      className="glass-navbar"
      sx={{
        borderRadius: "0 0 24px 24px",
        boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.08)",
        background: "rgba(255,255,255,0.45)",
        backdropFilter: "blur(8px)",
        color: theme.palette.text.primary,
      }}
    >
      <Toolbar sx={{ minHeight: 72, display: "flex", alignItems: "center", gap: 2 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            letterSpacing: 1,
            flexGrow: 1,
            cursor: "pointer",
            userSelect: "none",
            background: "linear-gradient(90deg, #1c92d2 0%, #f2fcfe 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
          onClick={() => navigate("/")}
        >
          NTC Transport
        </Typography>

        <Button className="nav-btn" startIcon={<FileText size={20} />} onClick={() => navigate("/")}>
          Dashboard
        </Button>
        <Button className="nav-btn" startIcon={<ListChecks size={20} />} onClick={() => navigate("/entry")}>
          Memo Entry
        </Button>
        {(role === "admin" || role === "clerk") && (
          <Button className="nav-btn" startIcon={<ClipboardList size={20} />} onClick={() => navigate("/memos")}>
            Memo List
          </Button>
        )}
        {(role === "admin" || role === "clerk") && (
          <Button className="nav-btn" startIcon={<Users size={20} />} onClick={() => navigate("/delivery-persons")}>
            Delivery Persons
          </Button>
        )}
        {(role === "admin" || role === "clerk") && (
          <Button className="nav-btn" startIcon={<ClipboardList size={20} />} onClick={() => navigate("/deliveries")}>
            Deliver LRs
          </Button>
        )}
        {role === "admin" && (
          <Button className="nav-btn" startIcon={<ClipboardList size={20} />} onClick={() => navigate("/auditlog")}>
            Audit Log
          </Button>
        )}

        {/* Year Selector */}
        <Box sx={{ mx: 2 }}>
          <YearSelector selectedYear={selectedYear} setSelectedYear={setSelectedYear} />
        </Box>

        {/* Theme toggle icon */}
        <IconButton onClick={toggleMode} title="Toggle light/dark mode" sx={{ ml: 1 }}>
          {mode === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </IconButton>

        {/* Logout button */}
        {role && (
          <IconButton
            sx={{
              ml: 2,
              borderRadius: "2xl",
              background: "rgba(255,255,255,0.4)",
              boxShadow: "0 2px 8px rgba(44,62,80,0.08)",
              '&:hover': { background: "rgba(255,255,255,0.7)" },
              transition: "background 0.2s",
            }}
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
            title="Logout"
          >
            <LogOut size={20} />
          </IconButton>
        )}
      </Toolbar>
    </AppBar>
  );
}
