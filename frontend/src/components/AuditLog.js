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
} from "@mui/material";
import "./MemoSectionGlass.css"; // For gradient title

export default function AuditLog({ selectedYear }) {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedYear) return;
    api.get(`/auditlog?year=${selectedYear}`)
      .then(res => setLogs(res.data))
      .catch(() => setError("Failed to load audit log"));
  }, [selectedYear]);

  if (error) return <Box color="red">{error}</Box>;

  return (
    <Box className="glass-card" sx={{ mt: 5, mb: 4, p: { xs: 2, md: 3 } }}>
      <Typography variant="subtitle1" className="memo-form-title" sx={{ mb: 3 }}>
        Audit Log
      </Typography>
      <TableContainer component={Paper} elevation={0} sx={{ background: "none", boxShadow: "none" }}>
        <Table size="small" sx={{ minWidth: 600 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Entity</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Entity ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  {new Date(log.timestamp || log.created_at).toLocaleString()}
                </TableCell>
                <TableCell>{log.user}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.entity}</TableCell>
                <TableCell>
                  {log.entity_no ?? log.entity_id ?? ""}
                </TableCell>
                <TableCell
                  style={{
                    maxWidth: 350,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: "1.03em"
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
