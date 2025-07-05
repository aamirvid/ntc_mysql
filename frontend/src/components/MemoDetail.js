import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Divider,
  Grid,
  Chip,
} from "@mui/material";
import api from "../api";
import { toast } from "react-toastify";
import DeleteKeyDialog from "./DeleteKeyDialog"; // <-- NEW
import "./EntryGlass.css";
import { formatDateIndian } from "../utils/formatDate";
import { getUserRole } from "../auth"; // <-- Needed for role check

export default function MemoDetail({ selectedYear, currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [memo, setMemo] = useState(null);
  const [lrs, setLrs] = useState([]);
  const [cashMemos, setCashMemos] = useState([]);
  const [loading, setLoading] = useState(true);

  // For delete key dialog
  const [deleteKeyOpen, setDeleteKeyOpen] = useState(false);
  const [lrToDelete, setLrToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Totals
  const [totals, setTotals] = useState({
    count: 0,
    pkgs: 0,
    topay: 0,
    paid: 0,
    cashMemoTotal: 0,
  });

  // Load memo and LRs
  const fetchDetails = () => {
    if (!id || !selectedYear) return;
    setLoading(true);
    api
      .get(`/memos/${id}/details?year=${selectedYear}`)
      .then((res) => {
        setMemo(res.data.memo);
        setLrs(res.data.lrs);
        setCashMemos(res.data.cashMemos);
        // Calculate totals
        let count = res.data.lrs.length;
        let pkgs = 0;
        let topay = 0;
        let paid = 0;
        let cashMemoTotal = 0;
        res.data.lrs.forEach((lr) => {
          pkgs += parseInt(lr.pkgs) || 0;
          if (lr.freight_type === "Topay") topay += parseFloat(lr.freight) || 0;
          if (lr.freight_type === "Paid") paid += parseFloat(lr.freight) || 0;
          const cm = res.data.cashMemos.find((c) => c.lr_id === lr.id);
          if (cm) cashMemoTotal +=
            (parseFloat(cm.hamali) || 0) +
            (parseFloat(cm.bc) || 0) +
            (parseFloat(cm.landing) || 0) +
            (parseFloat(cm.lc) || 0) +
            (lr.freight_type === "Topay" ? (parseFloat(lr.freight) || 0) : 0);
        });
        setTotals({ count, pkgs, topay, paid, cashMemoTotal });
      })
      .catch((err) => {
        toast.error("Error loading memo details");
        setMemo(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchDetails, [id, selectedYear]);

  // Delete handler (opens delete key dialog)
  const handleDelete = lr => {
    setLrToDelete(lr);
    setDeleteKeyOpen(true);
  };

  // Confirm delete (after delete key validated)
  const doDelete = async () => {
    if (!lrToDelete) return;
    setDeleting(true);
    try {
      await api.delete(
        `/lrs/${lrToDelete.id}?year=${selectedYear}`
      );
      toast.success("L.R. deleted.");
      fetchDetails(); // refresh list
    } catch (e) {
      toast.error("Error deleting L.R.");
    }
    setDeleting(false);
    setDeleteKeyOpen(false);
    setLrToDelete(null);
  };

  if (loading) return <Box p={3}><Typography>Loading...</Typography></Box>;
  if (!memo) return <Box p={3}><Typography>No memo found.</Typography></Box>;

  // --- Button Styles ---
  const backBtnSx = {
    mb: 3,
    fontWeight: 700,
    borderRadius: "20px",
    background: "linear-gradient(90deg, #13adc7 0%, #5efce8 100%)",
    color: "#fff",
    px: 3,
    py: 1,
    boxShadow: "0 2px 8px 0 rgba(19,173,199,0.11)",
    textTransform: "none",
    "&:hover": {
      background: "linear-gradient(90deg, #11998e 0%, #38ef7d 100%)",
      color: "#fff"
    }
  };

  const deleteBtnSx = {
    borderRadius: "12px",
    fontWeight: 600,
    px: 2.5,
    borderColor: "#ff595e",
    color: "#ff595e",
    background: "rgba(255,89,94,0.08)",
    textTransform: "none",
    "&:hover": {
      borderColor: "#c9184a",
      color: "#fff",
      background: "linear-gradient(90deg,#ff595e,#ffbd69)"
    }
  };

  const editBtnSx = {
    borderRadius: "12px",
    fontWeight: 600,
    px: 2.5,
    borderColor: "#13adc7",
    color: "#13adc7",
    background: "rgba(19,173,199,0.10)",
    textTransform: "none",
    "&:hover": {
      borderColor: "#11998e",
      color: "#11998e",
      background: "rgba(19,173,199,0.14)"
    }
  };

  const role = getUserRole();

  return (
    <div className="entry-glass-card">
      <Button
        startIcon={<span style={{
          display: "inline-block",
          transform: "translateY(1px) scaleX(-1)"
        }}>←</span>}
        onClick={() => navigate(-1)}
        sx={backBtnSx}
      >
        Back to List
      </Button>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 4 },
          mx: "auto",
          maxWidth: 950,
          borderRadius: "24px",
          boxShadow: "0 4px 20px 0 rgba(19,173,199,0.13)",
          background: "rgba(255,255,255,0.98)",
          border: "1.5px solid rgba(19,173,199,0.12)",
          backdropFilter: "blur(11px)",
          color: "#232c3d",
          mb: 2,
          transition: "background 0.3s, color 0.3s"
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            fontWeight: 700,
            mb: 2,
            background: "linear-gradient(90deg, #13adc7 0%, #5efce8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            color: "transparent"
          }}
        >
          Memo #{memo.memo_no} <Chip label={selectedYear} size="small" sx={{ ml: 1 }}/>
        </Typography>
       <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Typography><b>Date:</b> {formatDateIndian(memo.memo_date)}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Typography>
            <b>Arrival:</b> {formatDateIndian(memo.arrival_date)}
            {memo.arrival_time &&
              <>
                <br />
                <b>Time:</b>{" "}
                {
                  // Format "HH:mm:ss" or "HH:mm" or "13:30" into "01:30 PM"
                  (() => {
                    const t = memo.arrival_time;
                    if (!t) return null;
                    // Accept "HH:mm:ss" or "HH:mm"
                    const [hh, mm] = t.split(":");
                    const d = new Date();
                    d.setHours(Number(hh), Number(mm), 0, 0);
                    return d.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });
                  })()
                }
              </>
            }
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Typography><b>Truck No:</b> {memo.truck_no}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Typography><b>Driver/Owner:</b> {memo.driver_owner}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Typography><b>Total Hire:</b> ₹{memo.total_lorry_hire}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Typography><b>Advance:</b> ₹{memo.advance_lorry_hire}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Typography><b>Balance:</b> ₹{memo.balance_lorry_hire}</Typography>
        </Grid>
      </Grid>

      </Paper>
      <Divider sx={{ my: 2 }} />
      <Typography
        variant="subtitle1"
        gutterBottom
        sx={{ fontWeight: 600, ml: 1, color: "#059bbf" }}
      >
        Lorry Receipts (LRs)
      </Typography>
      <TableContainer component={Paper} elevation={0} sx={{
        borderRadius: "18px",
        background: "rgba(255,255,255,0.97)",
        boxShadow: "0 2px 8px 0 rgba(19,173,199,0.09)",
        border: "1px solid rgba(19,173,199,0.08)"
      }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>LR No</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>From</TableCell>
              <TableCell>To</TableCell>
              <TableCell>Consignor</TableCell>
              <TableCell>Consignee</TableCell>
              <TableCell>Pkgs</TableCell>
              <TableCell>Content</TableCell>
              <TableCell>Freight Type</TableCell>
              <TableCell>Freight</TableCell>
              <TableCell>Cash Memo No</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lrs.map((lr) => {
              const cm = cashMemos.find((c) => c.lr_id === lr.id) || {};
              const total =
              (parseFloat(cm.hamali) || 0) +
              (parseFloat(cm.bc) || 0) +
              (parseFloat(cm.landing) || 0) +
              (parseFloat(cm.lc) || 0) +
              (lr.freight_type === "Topay" ? (parseFloat(lr.freight) || 0) : 0);

              return (
                <TableRow key={lr.id}>
                  <TableCell>{lr.lr_no}</TableCell>
                  <TableCell>{formatDateIndian(lr.lr_date)}</TableCell>
                  <TableCell>{lr.from_city}</TableCell>
                  <TableCell>{lr.to_city}</TableCell>
                  <TableCell>{lr.consignor}</TableCell>
                  <TableCell>{lr.consignee}</TableCell>
                  <TableCell>{lr.pkgs}</TableCell>
                  <TableCell>{lr.content}</TableCell>
                  <TableCell>{lr.freight_type}</TableCell>
                  <TableCell>{lr.freight}</TableCell>
                  <TableCell>{cm.cash_memo_no}</TableCell>
                  <TableCell>₹{total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={editBtnSx}
                      onClick={() => navigate(`/lrs/${lr.id}/edit?year=${selectedYear}&memo=${memo.id}`)}
                    >
                      Edit
                    </Button>
                    {(role === "admin" || role === "clerk") && (
                      <Button
                        size="small"
                        variant="outlined"
                        sx={deleteBtnSx}
                        onClick={() => handleDelete(lr)}
                        disabled={deleting}
                      >
                        Delete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ mt: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4} md={2}><Typography><b>Total LRs:</b> {totals.count}</Typography></Grid>
          <Grid item xs={12} sm={4} md={2}><Typography><b>Total Topay:</b> ₹{totals.topay.toFixed(2)}</Typography></Grid>
          <Grid item xs={12} sm={4} md={2}><Typography><b>Total Paid:</b> ₹{totals.paid.toFixed(2)}</Typography></Grid>
          <Grid item xs={12} sm={4} md={2}><Typography><b>Total Packages:</b> {totals.pkgs}</Typography></Grid>
          <Grid item xs={12} sm={4} md={2}><Typography><b>Total Cash Memo Total:</b> ₹{totals.cashMemoTotal.toFixed(2)}</Typography></Grid>
        </Grid>
      </Box>
      <DeleteKeyDialog
        open={deleteKeyOpen}
        onClose={() => { setDeleteKeyOpen(false); setLrToDelete(null); }}
        onSuccess={doDelete}
        currentUser={currentUser || ""}
      />
    </div>
  );
}
