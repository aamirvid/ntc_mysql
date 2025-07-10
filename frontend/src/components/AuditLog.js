// src/components/AuditLog.js
import React, { useEffect, useState } from "react";
import api from "../api";
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Paper,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import "./MemoSectionGlass.css"; // For gradient title

export default function AuditLog({ selectedYear }) {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(20); // Page size

  // Fetch logs for current page/year
  useEffect(() => {
    if (!selectedYear) return;
    api.get(`/auditlog?year=${selectedYear}&page=${page}&limit=${limit}`)
      .then(res => {
        setLogs(res.data.results || []);
        setTotalPages(res.data.totalPages || 1);
        setError("");
      })
      .catch(() => setError("Failed to load audit log"));
  }, [selectedYear, page, limit]);

  // Reset page when year or filter changes
  useEffect(() => { setPage(1); }, [actionFilter, selectedYear]);

  // Filter logs by action
  const filteredLogs = logs.filter(log =>
    actionFilter === "all" ? true : log.action === actionFilter
  );

  // Find all unique action types for the filter dropdown
  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort();

  if (error) return <Box color="red">{error}</Box>;

  return (
    <Box className="glass-card" sx={{ mt: 5, mb: 4, p: { xs: 2, md: 3 } }}>
      <Typography variant="subtitle1" className="memo-form-title" sx={{ mb: 3 }}>
        Audit Log
      </Typography>
      {/* Pagination & Filter Controls */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Filter Action</InputLabel>
          <Select
            label="Filter Action"
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
          >
            <MenuItem value="all">All Actions</MenuItem>
            {uniqueActions.map(action => (
              <MenuItem value={action} key={action}>
                {capitalize(action)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box flex="1" />
        <Button
          size="small"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          variant="outlined"
        >
          Prev
        </Button>
        <Typography variant="body2" sx={{ minWidth: 60, textAlign: "center" }}>
          Page {page} / {totalPages}
        </Typography>
        <Button
          size="small"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          variant="outlined"
        >
          Next
        </Button>
      </Box>
      <TableContainer component={Paper} elevation={0} sx={{ background: "none", boxShadow: "none" }}>
        <Table size="small" sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Entity</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>No</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Old → New</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.map((log, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  {new Date(log.timestamp || log.created_at).toLocaleString()}
                </TableCell>
                <TableCell>{log.user}</TableCell>
                <TableCell>
                  <Chip
                    label={capitalize(log.action)}
                    size="small"
                    color={chipColor(log.action)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{log.entity}</TableCell>
                <TableCell>
                  {log.entity_no ?? log.entity_id ?? ""}
                </TableCell>
                <TableCell>
                  <DiffView oldData={log.old_data} newData={log.new_data} />
                </TableCell>
                <TableCell
                  style={{
                    maxWidth: 280,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: "1.02em"
                  }}
                >
                  {formatDetails(log.details)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function DiffView({ oldData, newData }) {
  // If neither, show blank
  if (!oldData && !newData) return null;

  // Show key changes or all fields changed
  try {
    const oldObj = oldData ? JSON.parse(oldData) : null;
    const newObj = newData ? JSON.parse(newData) : null;

    if (!oldObj && newObj) {
      return <span style={{ color: "#08c" }}>{objectSummary(newObj)}</span>;
    }
    if (oldObj && !newObj) {
      return <span style={{ color: "#d00" }}>{objectSummary(oldObj)}</span>;
    }
    // Show keys that changed
    const diffs = [];
    for (const key of new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])) {
      const oldVal = oldObj ? oldObj[key] : undefined;
      const newVal = newObj ? newObj[key] : undefined;
      if (String(oldVal) !== String(newVal)) {
        diffs.push(
          <div key={key}>
            <span style={{ color: "#888" }}>{key}: </span>
            <span style={{ color: "#d00", textDecoration: "line-through" }}>{String(oldVal)}</span>
            {" → "}
            <span style={{ color: "#090" }}>{String(newVal)}</span>
          </div>
        );
      }
    }
    if (!diffs.length) return <span style={{ color: "#090" }}>No change</span>;
    return <>{diffs}</>;
  } catch {
    return null;
  }
}

function formatDetails(details) {
  if (!details) return "";
  try {
    const parsed = typeof details === "string" ? JSON.parse(details) : details;
    if (typeof parsed === "object" && parsed !== null) {
      return Object.entries(parsed)
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(", ");
    }
    return String(parsed);
  } catch {
    return details;
  }
}

function objectSummary(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(", ");
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

function chipColor(action) {
  switch (action) {
    case "delete":
      return "error";
    case "update":
      return "warning";
    case "create":
      return "success";
    default:
      return "default";
  }
}
