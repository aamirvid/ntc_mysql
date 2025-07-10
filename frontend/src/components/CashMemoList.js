// src/components/CashMemoList.js

import React, { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Box, TextField, Pagination, InputAdornment, Typography, Button, CircularProgress
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import { formatDateIndian } from "../utils/formatDate";
import api from "../api";
import { toast } from "react-toastify";
import DeleteKeyDialog from "./DeleteKeyDialog";
import { getUserRole } from "../auth";

const pageSize = 20;

export default function CashMemoList({ selectedYear, currentUser }) {
  const [cashMemos, setCashMemos] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editRow, setEditRow] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const role = getUserRole();

  // Fetch list
  const fetchCashMemos = () => {
    if (!selectedYear) return;
    setLoading(true);
    api
      .get(`/cashmemos/list?year=${selectedYear}&search=${search}&page=${page}&pageSize=${pageSize}`)
      .then(res => {
        setCashMemos(res.data.data || []);
        setTotal(res.data.total || 0);
      })
      .catch(() => toast.error("Could not load cash memos."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1); // Reset to first page on search/year change
  }, [search, selectedYear]);

  useEffect(() => {
    fetchCashMemos();
    // eslint-disable-next-line
  }, [selectedYear, search, page]);

  // Start editing a row
  const handleEdit = row => {
    setEditingId(row.id);
    setEditRow({
      hamali: row.hamali ?? "",
      bc: row.bc ?? "",
      landing: row.landing ?? "",
      lc: row.lc ?? "",
      cash_memo_total: row.cash_memo_total ?? "",
      updated_by: currentUser?.username || ""
    });
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingId(null);
    setEditRow({});
  };

  // Save edit
  const handleSave = async row => {
    try {
      await api.put(`/cashmemos/${row.id}?year=${selectedYear}`, {
        ...editRow
      });
      toast.success("Cash Memo updated!");
      setEditingId(null);
      fetchCashMemos();
    } catch (e) {
      toast.error(e.response?.data?.error || "Update failed");
    }
  };

  // Open delete dialog
  const handleDeleteDialog = row => {
    setDeleteTarget(row);
    setDeleteDialogOpen(true);
  };

  // Confirm delete after key
  const handleDelete = async () => {
    try {
      await api.delete(`/cashmemos/${deleteTarget.id}?year=${selectedYear}`);
      toast.success("Cash Memo deleted.");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchCashMemos();
    } catch (e) {
      toast.error(e.response?.data?.error || "Delete failed");
    }
  };

  // Handle input changes during edit
  const handleEditChange = (field, value) => {
    setEditRow(prev => ({ ...prev, [field]: value }));
  };

  // Calculate pages
  const pageCount = Math.ceil(total / pageSize);

  return (
    <Box sx={{
      maxWidth: 1200,
      margin: "0 auto",
      mt: 4,
      px: 2,
    }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: "32px",
          background: "rgba(255,255,255,0.38)",
          boxShadow: "0 8px 32px 0 rgba(31,38,135,0.10)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(150,190,250,0.18)",
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              letterSpacing: 1,
              background: "linear-gradient(90deg, #1c92d2 0%, #38ef7d 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 0,
            }}
          >
            Cash Memo Register
          </Typography>
          <TextField
            label="Search Cash Memo No"
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{
              width: 260,
              borderRadius: "16px",
              background: "rgba(255,255,255,0.67)",
              ".MuiOutlinedInput-root": { borderRadius: "16px" }
            }}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#1c92d2", opacity: 0.7 }} />
                </InputAdornment>
              ),
              style: { borderRadius: 16 }
            }}
          />
        </Box>

        <TableContainer sx={{
          borderRadius: 4,
          background: "rgba(255,255,255,0.67)",
          boxShadow: "0 1px 8px 0 rgba(44,62,80,0.07)",
          overflow: "hidden"
        }}>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  background: "linear-gradient(90deg, #f2fcfe 0%, #e0f7fa 100%)",
                  "& th": { fontWeight: 600 }
                }}
              >
                <TableCell>Cash Memo No</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Hamali</TableCell>
                <TableCell>BC</TableCell>
                <TableCell>Landing</TableCell>
                <TableCell>LC</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Updated By</TableCell>
                {(role === "admin" || role === "clerk") && (
                  <TableCell align="center">Actions</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : (
                cashMemos.map(row => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{
                      transition: "background 0.15s",
                      "&:hover": { background: "rgba(28,146,210,0.08)" }
                    }}
                  >
                    <TableCell>{row.cash_memo_no}</TableCell>
                    <TableCell>
                      {row.created_at
                        ? formatDateIndian(row.created_at)
                        : ""}
                    </TableCell>
                    {/* Inline Editing: */}
                    <TableCell>
                      {editingId === row.id ? (
                        <TextField
                          value={editRow.hamali}
                          onChange={e =>
                            handleEditChange("hamali", e.target.value)
                          }
                          size="small"
                          type="number"
                          inputProps={{ min: 0 }}
                        />
                      ) : (
                        row.hamali
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === row.id ? (
                        <TextField
                          value={editRow.bc}
                          onChange={e =>
                            handleEditChange("bc", e.target.value)
                          }
                          size="small"
                          type="number"
                          inputProps={{ min: 0 }}
                        />
                      ) : (
                        row.bc
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === row.id ? (
                        <TextField
                          value={editRow.landing}
                          onChange={e =>
                            handleEditChange("landing", e.target.value)
                          }
                          size="small"
                          type="number"
                          inputProps={{ min: 0 }}
                        />
                      ) : (
                        row.landing
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === row.id ? (
                        <TextField
                          value={editRow.lc}
                          onChange={e =>
                            handleEditChange("lc", e.target.value)
                          }
                          size="small"
                          type="number"
                          inputProps={{ min: 0 }}
                        />
                      ) : (
                        row.lc
                      )}
                    </TableCell>
                    <TableCell>
                      {/* Show sum of fields + Topay if needed */}
                      {(
                        (parseFloat(editingId === row.id ? editRow.hamali : row.hamali) || 0) +
                        (parseFloat(editingId === row.id ? editRow.bc : row.bc) || 0) +
                        (parseFloat(editingId === row.id ? editRow.landing : row.landing) || 0) +
                        (parseFloat(editingId === row.id ? editRow.lc : row.lc) || 0) +
                        (row.freight_type === "Topay"
                          ? parseFloat(row.freight) || 0
                          : 0)
                      ).toFixed(2)}
                    </TableCell>
                    <TableCell>{row.created_by}</TableCell>
                    <TableCell>{row.updated_by}</TableCell>
                    {(role === "admin" || role === "clerk") && (
                      <TableCell align="center">
                        {editingId === row.id ? (
                          <>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleSave(row)}
                              sx={{ mr: 0.5 }}
                            >
                              <SaveIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="inherit"
                              onClick={handleCancel}
                            >
                              <CancelIcon />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton
                              size="small"
                              sx={{
                                color: "#11998e",
                                background: "rgba(17,153,142,0.10)",
                                borderRadius: 2,
                                ml: 0.5,
                                "&:hover": {
                                  background: "rgba(17,153,142,0.22)"
                                }
                              }}
                              onClick={() => handleEdit(row)}
                              title="Edit"
                              disabled={editingId !== null}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              sx={{
                                color: "#e74c3c",
                                background: "rgba(231,76,60,0.10)",
                                borderRadius: 2,
                                ml: 0.5,
                                "&:hover": {
                                  background: "rgba(231,76,60,0.19)"
                                }
                              }}
                              onClick={() => handleDeleteDialog(row)}
                              title="Delete"
                              disabled={editingId !== null}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
              {!loading && !cashMemos.length && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    No cash memos found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, v) => setPage(v)}
            color="primary"
            shape="rounded"
            siblingCount={0}
            boundaryCount={2}
          />
        </Box>
      </Paper>
      {/* Delete dialog */}
      <DeleteKeyDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onSuccess={handleDelete}
        currentUser={currentUser?.username}
      />
    </Box>
  );
}
