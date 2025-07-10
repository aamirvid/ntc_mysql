// src/components/LrList.js

import React, { useEffect, useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Box, TextField, Pagination, InputAdornment, Typography, CircularProgress,
  Menu, MenuItem, Checkbox, ListItemText, Button, Tooltip
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import api from "../api";
import { toast } from "react-toastify";
import DeleteKeyDialog from "./DeleteKeyDialog";
import { getUserRole } from "../auth";
import { formatDateIndian } from "../utils/formatDate";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

const pageSize = 20;

// All fields (except IDs) from LR, Memo, Cash Memo
const allColumns = [
  // LR
  { id: "memo_id", label: "Memo ID" },
  { id: "lr_no", label: "LR No", always: true },
  { id: "lr_date", label: "LR Date" },
  { id: "from_city", label: "From City" },
  { id: "to_city", label: "To City" },
  { id: "consignor", label: "Consignor" },
  { id: "consignee", label: "Consignee" },
  { id: "pkgs", label: "Pkgs" },
  { id: "content", label: "Content" },
  { id: "freight_type", label: "Freight Type" },
  { id: "freight", label: "Freight" },
  { id: "weight", label: "Weight" },
  { id: "dd_rate", label: "DD Rate" },
  { id: "dd_total", label: "DD Total" },
  { id: "pm_no", label: "PM No" },
  { id: "refund", label: "Refund" },
  { id: "remarks", label: "Remarks" },
  { id: "status", label: "Status" },
  { id: "has_cash_memo", label: "Has Cash Memo" },
  { id: "delivered_by", label: "Delivered By" },
  { id: "delivered_at", label: "Delivered At" },
  { id: "created_by", label: "Created By" },
  { id: "created_at", label: "Created At" },
  { id: "updated_by", label: "Updated By" },
  { id: "updated_at", label: "Updated At" },
  // Memo
  { id: "memo_no", label: "Memo No" },
  { id: "memo_date", label: "Memo Date" },
  { id: "arrival_date", label: "Arrival Date" },
  { id: "truck_no", label: "Truck No" },
  { id: "driver_owner", label: "Driver/Owner" },
  // Cash Memo
  { id: "cash_memo_no", label: "Cash Memo No" },
  { id: "hamali", label: "Hamali" },
  { id: "bc", label: "BC" },
  { id: "landing", label: "Landing" },
  { id: "lc", label: "LC" },
  { id: "cash_memo_total", label: "Cash Memo Total" },
];
const nonEditableFields = [
  "status",
  "delivered_at",
  "delivered_by",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "cash_memo_no",
  "cash_memo_total",
  "memo_no",
  "memo_date",
  "arrival_date",
  "truck_no",
  "driver_owner"
];

const freightTypes = ["Topay", "Paid", "TBB", "FOC"];
const statusOptions = ["Pending", "Delivered", "Cancelled"];

function getDefaultColumns() {
  // All except memo_id by default (user can add/hide more)
  return allColumns.filter(c => c.id !== "memo_id").map(c => c.id);
}

export default function LrList({ selectedYear, currentUser }) {
  const [lrs, setLrs] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editRow, setEditRow] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem("ntc_lrlist_columns");
    return saved ? JSON.parse(saved) : getDefaultColumns();
  });
  const [sortField, setSortField] = useState("lr_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const role = getUserRole();
  const navigate = useNavigate();

  // Table columns based on user choice, always show "always:true"
  const visibleColumns = useMemo(() => {
    return allColumns.filter(col => col.always || columns.includes(col.id));
  }, [columns]);

  useEffect(() => {
    localStorage.setItem("ntc_lrlist_columns", JSON.stringify(columns));
  }, [columns]);

  // Fetch LRs
  const fetchLrs = () => {
    if (!selectedYear) return;
    setLoading(true);
    api
      .get(
        `/lrs/search?year=${selectedYear}&lr_no=${search}&page=${page}&limit=${pageSize}&sortField=${sortField}&sortOrder=${sortOrder}`
      )
      .then(res => {
        setLrs(res.data.results || []);
        setTotal(res.data.total || 0);
      })
      .catch(() => toast.error("Could not load LRs."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1); // Reset to first page on search/year change
  }, [search, selectedYear, sortField, sortOrder]);

  useEffect(() => {
    fetchLrs();
    // eslint-disable-next-line
  }, [selectedYear, search, page, sortField, sortOrder]);

  // Start editing a row
  const handleEdit = row => {
    setEditingId(row.lr_no); // uses LR No as unique id
    setEditRow({
      ...row,
      lr_date: row.lr_date ? dayjs(row.lr_date).format("YYYY-MM-DD") : "",
      memo_date: row.memo_date ? dayjs(row.memo_date).format("YYYY-MM-DD") : "",
      arrival_date: row.arrival_date ? dayjs(row.arrival_date).format("YYYY-MM-DD") : "",
      delivered_at: row.delivered_at ? dayjs(row.delivered_at).format("YYYY-MM-DDTHH:mm") : "",
      created_at: row.created_at ? dayjs(row.created_at).format("YYYY-MM-DDTHH:mm") : "",
      updated_at: row.updated_at ? dayjs(row.updated_at).format("YYYY-MM-DDTHH:mm") : "",
    });
    setOverrideDDTotal(false);
  };

  // Used to prevent overwrite of manually entered DD Total
  const [overrideDDTotal, setOverrideDDTotal] = useState(false);

  const handleCancel = () => {
    setEditingId(null);
    setEditRow({});
    setOverrideDDTotal(false);
  };

  const handleSave = async row => {
    try {
      await api.put(`/lrs/${row.id}?year=${selectedYear}`, {
        ...row,
        ...editRow,
        lr_no: row.lr_no, // required for audit
        memo_id: row.memo_id, // not editable, pass original
      });
      toast.success("LR updated!");
      setEditingId(null);
      fetchLrs();
    } catch (e) {
      toast.error(e.response?.data?.error || "Update failed");
    }
  };

  const handleDeleteDialog = row => {
    setDeleteTarget(row);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/lrs/${deleteTarget.id}?year=${selectedYear}`);
      toast.success("LR deleted.");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchLrs();
    } catch (e) {
      toast.error(e.response?.data?.error || "Delete failed");
    }
  };

  // DD Rate/Total logic
  const handleEditChange = (field, value) => {
    let newEdit = { ...editRow, [field]: value };

    if ((field === "dd_rate" || field === "pkgs") && !overrideDDTotal) {
      const rate = parseFloat(field === "dd_rate" ? value : newEdit.dd_rate) || 0;
      const pkgs = parseFloat(field === "pkgs" ? value : newEdit.pkgs) || 0;
      newEdit.dd_total = (rate * pkgs).toFixed(2);
    }
    if (field === "dd_total") setOverrideDDTotal(true);

    setEditRow(newEdit);
  };

  const handleColumnMenuOpen = event => setAnchorEl(event.currentTarget);
  const handleColumnMenuClose = () => setAnchorEl(null);
  const handleColumnToggle = colId => {
    setColumns(cols =>
      cols.includes(colId)
        ? cols.filter(id => id !== colId)
        : [...cols, colId]
    );
  };

  const handleSort = colId => {
    if (sortField === colId) {
      setSortOrder(order => (order === "asc" ? "desc" : "asc"));
    } else {
      setSortField(colId);
      setSortOrder("asc");
    }
  };

  const pageCount = Math.ceil(total / pageSize);

  return (
    <Box sx={{
      maxWidth: 1500,
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
              background: "linear-gradient(90deg, #00c6ff 0%, #0072ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 0,
            }}
          >
            LR Register
          </Typography>
          <Box>
            <TextField
              label="Search LR No"
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{
                width: 230,
                borderRadius: "16px",
                background: "rgba(255,255,255,0.67)",
                ".MuiOutlinedInput-root": { borderRadius: "16px" }
              }}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#00c6ff", opacity: 0.7 }} />
                  </InputAdornment>
                ),
                style: { borderRadius: 16 }
              }}
            />
            <Tooltip title="Choose columns">
              <IconButton onClick={handleColumnMenuOpen} sx={{ ml: 1 }}>
                <AddIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleColumnMenuClose}
              PaperProps={{ style: { minWidth: 220, borderRadius: 16 } }}
            >
              {allColumns
                .filter(col => !col.always)
                .map(col => (
                  <MenuItem
                    key={col.id}
                    onClick={() => handleColumnToggle(col.id)}
                  >
                    <Checkbox checked={columns.includes(col.id)} />
                    <ListItemText primary={col.label} />
                  </MenuItem>
                ))}
            </Menu>
          </Box>
        </Box>

        <TableContainer sx={{
          borderRadius: 4,
          background: "rgba(255,255,255,0.67)",
          boxShadow: "0 1px 8px 0 rgba(44,62,80,0.07)",
          overflow: "auto"
        }}>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  background: "linear-gradient(90deg, #f2fcfe 0%, #e0f7fa 100%)",
                  "& th": { fontWeight: 600, cursor: "pointer" }
                }}
              >
                {visibleColumns.map(col => (
                  <TableCell
                    key={col.id}
                    onClick={() => handleSort(col.id)}
                    sx={{
                      userSelect: "none",
                      position: "relative",
                      minWidth: 90,
                    }}
                  >
                    {col.label}
                    {sortField === col.id && (
                      <Box
                        component="span"
                        sx={{
                          fontSize: "0.9em",
                          position: "absolute",
                          right: 4,
                          top: "50%",
                          transform: "translateY(-55%)",
                          color: "#0099ff"
                        }}
                      >
                        {sortOrder === "asc" ? "▲" : "▼"}
                      </Box>
                    )}
                  </TableCell>
                ))}
                {(role === "admin" || role === "clerk") && (
                  <TableCell align="center">Actions</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + 1} align="center">
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : (
                lrs.map(row => (
                  <TableRow
                    key={row.lr_no}
                    hover
                    sx={{
                      transition: "background 0.15s",
                      "&:hover": { background: "rgba(0,198,255,0.08)" }
                    }}
                  >
                    {visibleColumns.map(col => {
                      // Inline edit logic (for sensible fields only)
                      if (editingId === row.lr_no) {
  // Lock non-editable fields
  if (nonEditableFields.includes(col.id)) {
    return (
      <TableCell key={col.id} style={{ opacity: 0.75, background: "#f9f9f9" }}>
        {row[col.id]}
      </TableCell>
    );
  }
  // Editable fields (keep your cases as before)
  switch (col.id) {
    case "lr_date":
    case "memo_date":
    case "arrival_date":
      return (
        <TableCell key={col.id}>
          <TextField
            type="date"
            value={editRow[col.id]}
            onChange={e => handleEditChange(col.id, e.target.value)}
            size="small"
          />
        </TableCell>
      );
    case "from_city":
    case "to_city":
    case "consignor":
    case "consignee":
    case "content":
    case "remarks":
    case "pm_no":
      return (
        <TableCell key={col.id}>
          <TextField
            value={editRow[col.id]}
            onChange={e => handleEditChange(col.id, e.target.value)}
            size="small"
          />
        </TableCell>
      );
    case "pkgs":
    case "weight":
    case "freight":
    case "dd_rate":
    case "dd_total":
    case "refund":
      return (
        <TableCell key={col.id}>
          <TextField
            type="number"
            value={editRow[col.id]}
            onChange={e => handleEditChange(col.id, e.target.value)}
            size="small"
          />
        </TableCell>
      );
    case "freight_type":
      return (
        <TableCell key={col.id}>
          <TextField
            select
            value={editRow.freight_type}
            onChange={e => handleEditChange("freight_type", e.target.value)}
            size="small"
            SelectProps={{ native: true }}
          >
            <option value=""></option>
            {freightTypes.map(ft => (
              <option value={ft} key={ft}>{ft}</option>
            ))}
          </TextField>
        </TableCell>
      );
    default:
      return (
        <TableCell key={col.id}>
          {row[col.id]}
        </TableCell>
      );
  }
}

                       else {
                        // Not editing
                        // Special formatting for date/times
                        if (
                          ["lr_date", "memo_date", "arrival_date"].includes(col.id) &&
                          row[col.id]
                        )
                          return (
                            <TableCell key={col.id}>
                              {formatDateIndian(row[col.id])}
                            </TableCell>
                          );
                        if (
                          ["delivered_at", "created_at", "updated_at"].includes(col.id) &&
                          row[col.id]
                        )
                          return (
                            <TableCell key={col.id}>
                              {formatDateIndian(row[col.id])}
                            </TableCell>
                          );
                        if (col.id === "has_cash_memo")
                          return (
                            <TableCell key={col.id}>
                              {row[col.id] === 1 || row[col.id] === true ? "Yes" : "No"}
                            </TableCell>
                          );
                        return (
                          <TableCell key={col.id}>{row[col.id]}</TableCell>
                        );
                      }
                    })}
                    {(role === "admin" || role === "clerk") && (
                      <TableCell align="center">
                        {editingId === row.lr_no ? (
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
                            <Tooltip title="Edit">
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
                                disabled={editingId !== null}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Full Edit">
                              <IconButton
                                size="small"
                                sx={{
                                  color: "#0072ff",
                                  background: "rgba(0,114,255,0.08)",
                                  borderRadius: 2,
                                  ml: 0.5,
                                  "&:hover": {
                                    background: "rgba(0,114,255,0.18)"
                                  }
                                }}
                                onClick={() => navigate(`/lrs/${row.id}/edit?year=${selectedYear}&memo=${row.memo_id}`)}
                                disabled={editingId !== null}
                              >
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
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
                                disabled={editingId !== null}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
              {!loading && !lrs.length && (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + 1} align="center">
                    No LRs found.
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
