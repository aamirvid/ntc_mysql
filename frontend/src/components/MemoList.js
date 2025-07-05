import React, { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Box, TextField, Pagination, InputAdornment, Typography
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { toast } from "react-toastify";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { getUserRole } from "../auth";
import { formatDateIndian } from "../utils/formatDate";
import DeleteKeyDialog from "./DeleteKeyDialog"; // NEW

export default function MemoList({ selectedYear, currentUser }) {
  const [memos, setMemos] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);

  // For DeleteKeyDialog
  const [deleteKeyOpen, setDeleteKeyOpen] = useState(false);
  const [toDelete, setToDelete] = useState({ id: null, memo_no: "" });
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();

  const fetchMemos = () => {
    if (!selectedYear) return;
    api
      .get(`/memos/list?year=${selectedYear}&search=${search}&page=${page}&pageSize=${pageSize}`)
      .then(res => {
        setMemos(res.data.data);
        setTotal(res.data.total);
      });
  };

  useEffect(() => {
    fetchMemos();
    // eslint-disable-next-line
  }, [selectedYear, search, page, pageSize]);

  const role = getUserRole();

  const handleDelete = (id, memo_no) => {
    setToDelete({ id, memo_no });
    setDeleteKeyOpen(true);
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/memos/${toDelete.id}?year=${selectedYear}`);
      toast.success("Memo deleted.");
      fetchMemos();
    } catch (err) {
      toast.error("Could not delete memo.");
    } finally {
      setDeleting(false);
      setDeleteKeyOpen(false);
      setToDelete({ id: null, memo_no: "" });
    }
  };

  return (
    <Box sx={{
      maxWidth: 1100,
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
            Memo Register
          </Typography>
          <TextField
            label="Search Memo No"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
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
                <TableCell>Memo No</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Truck No</TableCell>
                <TableCell>Driver/Owner</TableCell>
                <TableCell>Total Hire</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {memos.map(memo => (
                <TableRow
                  key={memo.id}
                  hover
                  sx={{
                    transition: "background 0.15s",
                    "&:hover": { background: "rgba(28,146,210,0.08)" }
                  }}
                >
                  <TableCell>{memo.memo_no}</TableCell>
                  <TableCell>{formatDateIndian(memo.memo_date)}</TableCell>
                  <TableCell>{memo.truck_no}</TableCell>
                  <TableCell>{memo.driver_owner}</TableCell>
                  <TableCell>₹{memo.total_lorry_hire}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      sx={{
                        color: "#1c92d2",
                        background: "rgba(28,146,210,0.10)",
                        borderRadius: 2,
                        ml: 0.5,
                        "&:hover": {
                          background: "rgba(28,146,210,0.18)"
                        }
                      }}
                      onClick={() => navigate(`/memos/${memo.id}`)}
                      title="View"
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
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
                      onClick={() => navigate(`/memos/${memo.id}/edit`)}
                      title="Edit"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {role === "admin" && (
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
                        onClick={() => handleDelete(memo.id, memo.memo_no)}
                        title="Delete"
                        disabled={deleting}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!memos.length && (
                <TableRow>
                  <TableCell colSpan={6}>No memos found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Pagination
            count={Math.ceil(total / pageSize)}
            page={page}
            onChange={(_, value) => setPage(value)}
            variant="outlined"
            shape="rounded"
            color="primary"
          />
        </Box>
      </Paper>
      <DeleteKeyDialog
        open={deleteKeyOpen}
        onClose={() => setDeleteKeyOpen(false)}
        onSuccess={doDelete}
        currentUser={currentUser || ""}
      />
    </Box>
  );
}
