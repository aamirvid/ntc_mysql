// src/components/DeliveryMarking.js
import React, { useState, useEffect, useRef } from "react";
import {
  Paper, Box, Typography, Grid, TextField, Button, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider, Chip
} from "@mui/material";
import { toast } from "react-toastify";
import api from "../api";
import "../styles/main.css";
import { formatDateIndian } from "../utils/formatDate";

// --- Add these helpers for MySQL date/datetime ---
function formatDateOnly(d) {
  if (!d) return null;
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d; // already ok
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString().slice(0, 10);
}
function toMySQLDateTime(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export default function DeliveryMarking({ selectedYear }) {
  const [persons, setPersons] = useState([]);
  const [person, setPerson] = useState("");
  const [cmInput, setCmInput] = useState("");
  const [lrInput, setLrInput] = useState("");
  const [preview, setPreview] = useState(null);
  const [batch, setBatch] = useState([]);
  const [totals, setTotals] = useState({ count: 0, pkgs: 0, cashMemoTotal: 0, hamali: 0 });
  const [activeField, setActiveField] = useState("cm");
  const cmRef = useRef();
  const lrRef = useRef();
  const addBtnRef = useRef();

  useEffect(() => {
    api.get("/delivery-persons")
      .then(res => setPersons(res.data.filter(p => p.is_active)))
      .catch(() => toast.error("Failed to load delivery persons"));
  }, []);

  useEffect(() => {
    let count = batch.length, pkgs = 0, cashMemoTotal = 0, hamali = 0;
    batch.forEach(row => {
      pkgs += parseInt(row.lr.pkgs) || 0;
      const cm = row.cashMemo || {};
      const hamaliVal = parseFloat(cm.hamali) || 0;
      const bc = parseFloat(cm.bc) || 0;
      const landing = parseFloat(cm.landing) || 0;
      const lc = parseFloat(cm.lc) || 0;
      const freight = row.lr.freight_type === "Topay" ? (parseFloat(row.lr.freight) || 0) : 0;
      cashMemoTotal += hamaliVal + bc + landing + lc + freight;
      hamali += hamaliVal;
    });
    setTotals({ count, pkgs, cashMemoTotal, hamali });
  }, [batch]);


  useEffect(() => {
    setPreview(null);
    setCmInput("");
    setLrInput("");
    setActiveField("cm");
    setTimeout(() => cmRef.current && cmRef.current.focus(), 100);
  }, [person]);

  // --- Fetch by Cash Memo Number ---
  const fetchByCashMemo = async () => {
    if (!person) {
      toast.error("Select a delivery person first!");
      setTimeout(() => cmRef.current && cmRef.current.focus(), 100);
      return;
    }
    setPreview(null);
    if (!cmInput.trim()) return;
    try {
      const { data: cmList } = await api.get(
        `/cashmemos?cash_memo_no=${encodeURIComponent(cmInput.trim())}&year=${selectedYear}`
      );
      const cashMemo = cmList[0];
      if (!cashMemo) throw new Error();
      const { data: lr } = await api.get(
        `/lrs/${cashMemo.lr_id}?year=${selectedYear}`
      );
      setPreview({ lr, cashMemo });
      setActiveField("cm");
      setTimeout(() => addBtnRef.current && addBtnRef.current.focus(), 100);
    } catch {
      toast.error("Cash Memo not found");
      setPreview(null);
      setActiveField("cm");
      setTimeout(() => cmRef.current && cmRef.current.focus(), 100);
    }
  };

  // --- Fetch by LR Number ---
  const fetchByLr = async () => {
    if (!person) {
      toast.error("Select a delivery person first!");
      setTimeout(() => lrRef.current && lrRef.current.focus(), 100);
      return;
    }
    setPreview(null);
    if (!lrInput.trim()) return;
    try {
      const { data: lr } = await api.get(
        `/lrs/lookup/${encodeURIComponent(lrInput.trim())}?year=${selectedYear}`
      );
      const { data: cashMemos } = await api.get(
        `/cashmemos?lr_id=${lr.id}&year=${selectedYear}`
      );
      const cashMemo = cashMemos[0] || {};
      setPreview({ lr, cashMemo });
      setActiveField("lr");
      setTimeout(() => addBtnRef.current && addBtnRef.current.focus(), 100);
    } catch {
      toast.error("LR not found");
      setPreview(null);
      setActiveField("lr");
      setTimeout(() => lrRef.current && lrRef.current.focus(), 100);
    }
  };

  const handleAddToBatch = () => {
    if (!person) {
      toast.error("Select a delivery person before adding!");
      setTimeout(() => {
        if (activeField === "cm") cmRef.current && cmRef.current.focus();
        else lrRef.current && lrRef.current.focus();
      }, 100);
      return;
    }
    if (!preview) return;
    if (batch.some(row => row.lr.id === preview.lr.id)) {
      toast.warning("Already added to batch");
      return;
    }
    if (preview.lr.status === "Delivered") {
      toast.error("This LR is already delivered");
      return;
    }
    setBatch([...batch, { ...preview }]);
    setPreview(null);
    setCmInput("");
    setLrInput("");
    setTimeout(() => {
      if (activeField === "cm") cmRef.current && cmRef.current.focus();
      else lrRef.current && lrRef.current.focus();
    }, 100);
  };

  const handleRemove = idx => setBatch(batch => batch.filter((_, i) => i !== idx));

  const handleCmKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      setActiveField("cm");
      fetchByCashMemo();
    }
  };
  const handleLrKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      setActiveField("lr");
      fetchByLr();
    }
  };

  const handleCmInput = (v) => {
    setCmInput(v);
    setLrInput("");
    setPreview(null);
    setActiveField("cm");
  };
  const handleLrInput = (v) => {
    setLrInput(v);
    setCmInput("");
    setPreview(null);
    setActiveField("lr");
  };

  const handlePerson = (e) => setPerson(e.target.value);

  const handleSubmitAll = async () => {
    if (!batch.length || !person) {
      toast.error("Please select delivery person and add at least one LR");
      return;
    }
    try {
      await Promise.all(batch.map(row => {
        const payload = {
          ...row.lr,
          lr_date: formatDateOnly(row.lr.lr_date), // always overwrite
          status: "Delivered",
          delivered_by: person,
          delivered_at: toMySQLDateTime(new Date()), // <-- KEY CHANGE
        };
        console.log('Sending payload:', payload);
        return api.put(
          `/lrs/${row.lr.id}?year=${selectedYear}`,
          payload
        );
      }));
      toast.success("Marked as delivered!");
      setBatch([]);
    } catch(err) {
      toast.error("Error marking as delivered");
      console.error("Delivery API error:", err, err.response?.data);
    }
  };


  // --- Handle QR ---
  const handleQr = async val => {
    if (!person) {
      toast.error("Select a delivery person first!");
      return;
    }
    setPreview(null);
    setCmInput("");
    setLrInput(val);
    setActiveField("lr");
    await fetchByLr();
  };

  // --- GLASSY STYLES ---
  const glassPaper = {
    background: "rgba(255,255,255,0.85)",
    borderRadius: "18px",
    boxShadow: "0 4px 20px 0 rgba(19,173,199,0.10)",
    border: "1.5px solid rgba(19,173,199,0.15)",
    backdropFilter: "blur(9px)",
    marginBottom: 3,
    padding: "24px 20px",
  };
  const glassPaperDark = {
    background: "rgba(30,38,56,0.94)",
    color: "#fff",
    border: "1.5px solid rgba(19,173,199,0.17)",
  };
  const glassTable = {
    background: "rgba(255,255,255,0.92)",
    borderRadius: "14px",
    boxShadow: "0 1.5px 7px 0 rgba(44,146,210,0.07)",
    border: "1px solid rgba(44,146,210,0.11)",
    backdropFilter: "blur(8px)",
  };

  const isDark = document.body.classList.contains("dark") || document.body.dataset.theme === "dark";
  const mergedPaper = isDark ? { ...glassPaper, ...glassPaperDark } : glassPaper;
  const mergedTable = isDark ? { ...glassTable, background: "rgba(30,38,56,0.99)", color: "#fff" } : glassTable;

  return (
    <Box p={{ xs: 1, sm: 2 }}>
      <Typography variant="h6" mb={2} sx={{
        fontWeight: 700,
        background: "linear-gradient(90deg, #13adc7 0%, #5efce8 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        color: "transparent",
      }}>Mark L.R. as Delivered</Typography>
      <Paper sx={mergedPaper}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Delivery Person"
              value={person}
              onChange={handlePerson}
              fullWidth
              required
              sx={{ minWidth: 200 }}
              autoFocus
            >
              {persons.map(p => (
                <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Cash Memo Number"
              value={cmInput}
              onChange={e => handleCmInput(e.target.value)}
              inputRef={cmRef}
              fullWidth
              onKeyDown={handleCmKeyDown}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="LR Number"
              value={lrInput}
              onChange={e => handleLrInput(e.target.value)}
              inputRef={lrRef}
              fullWidth
              onKeyDown={handleLrKeyDown}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              variant="contained"
              sx={{
                height: "100%",
                borderRadius: "14px",
                fontWeight: 600,
                background: "linear-gradient(90deg, #11998e 0%, #38ef7d 100%)",
                color: "#fff",
                boxShadow: "0 2px 12px 0 rgba(19,173,199,0.13)",
              }}
              ref={addBtnRef}
              disabled={!preview || !person}
              onClick={handleAddToBatch}
            >
              Add to List
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Preview Card */}
      {preview && (
        <Paper
          sx={{
            mb: 3,
            p: 2,
            borderRadius: "16px",
            background: "#eafcff",
            maxWidth: "100%",
            boxShadow: "0 1.5px 12px #19adc320",
            mx: "auto",
          }}
        >
          <Typography
            variant="subtitle1"
            fontWeight="bold"
            gutterBottom
            sx={{ color: "#029dbd" }}
          >
            Review LR Details Before Adding
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 0,
              flexWrap: "wrap",
            }}
          >
            {/* Left column */}
            <Box sx={{ flex: 1, minWidth: 240 }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, border: 0 }}>LR No</TableCell>
                    <TableCell sx={{ border: 0 }}>{preview.lr.lr_no}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, border: 0 }}>Consignor</TableCell>
                    <TableCell sx={{ border: 0 }}>{preview.lr.consignor}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, border: 0 }}>Pkgs</TableCell>
                    <TableCell sx={{ border: 0 }}>{preview.lr.pkgs}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, border: 0 }}>Freight Type</TableCell>
                    <TableCell sx={{ border: 0 }}>{preview.lr.freight_type}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, border: 0 }}>Hamali</TableCell>
                    <TableCell sx={{ border: 0 }}>{preview.cashMemo?.hamali || 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, border: 0 }}>LC</TableCell>
                    <TableCell sx={{ border: 0 }}>{preview.cashMemo?.lc || 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, border: 0 }}>CashMemo No</TableCell>
                    <TableCell sx={{ border: 0 }}>{preview.cashMemo?.cash_memo_no || ""}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
            {/* Right column */}
            <Box sx={{ flex: 1, minWidth: 240 }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, border: 0 }}>Date</TableCell>
                    <TableCell sx={{ border: 0 }}>{formatDateIndian(preview.lr.lr_date)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, border: 0 }}>Consignee</TableCell>
                    <TableCell sx={{ border: 0 }}>{preview.lr.consignee}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, border: 0 }}>Content</TableCell>
                    <TableCell sx={{ border: 0 }}>{preview.lr.content}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, border: 0 }}>Freight</TableCell>
                    <TableCell sx={{ border: 0 }}>{preview.lr.freight}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, border: 0 }}>Landing</TableCell>
                    <TableCell sx={{ border: 0 }}>{preview.cashMemo?.landing || 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, border: 0 }}>BC</TableCell>
                    <TableCell sx={{ border: 0 }}>{preview.cashMemo?.bc || 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, border: 0 }}>Total</TableCell>
                    <TableCell sx={{ border: 0 }}>
                      ₹{
                        ((parseFloat(preview.cashMemo?.hamali) || 0) +
                        (parseFloat(preview.cashMemo?.bc) || 0) +
                        (parseFloat(preview.cashMemo?.landing) || 0) +
                        (parseFloat(preview.cashMemo?.lc) || 0) +
                        (preview.lr.freight_type === "Topay" ? (parseFloat(preview.lr.freight) || 0) : 0)
                        ).toFixed(2)
                      }
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Box>
          {preview.lr.status === "Delivered" && (
            <Box mt={2}><Chip color="success" label="Already Delivered" /></Box>
          )}
        </Paper>
      )}

      {/* Table of Batch */}
      <Paper sx={{ ...mergedPaper, p: 0 }}>
        <Typography variant="subtitle2" mb={1} sx={{
          fontWeight: 600,
          background: "linear-gradient(90deg, #11998e 0%, #38ef7d 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          color: "transparent",
          px: 2,
          pt: 2
        }}>
          LRs To Be Marked Delivered
        </Typography>
        <TableContainer sx={mergedTable}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>LR No</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Consignor</TableCell>
                <TableCell>Consignee</TableCell>
                <TableCell>Pkgs</TableCell>
                <TableCell>Content</TableCell>
                <TableCell>Freight Type</TableCell>
                <TableCell>Freight</TableCell>
                <TableCell>Hamali</TableCell>
                <TableCell>Landing</TableCell>
                <TableCell>LC</TableCell>
                <TableCell>BC</TableCell>
                <TableCell>CashMemo No</TableCell>
                <TableCell>Total</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {batch.map((row, idx) => {
                const cm = row.cashMemo || {};
                const hamali = parseFloat(cm.hamali) || 0;
                const bc = parseFloat(cm.bc) || 0;
                const landing = parseFloat(cm.landing) || 0;
                const lc = parseFloat(cm.lc) || 0;
                const freight = row.lr.freight_type === "Topay" ? (parseFloat(row.lr.freight) || 0) : 0;
                const total = hamali + bc + landing + lc + freight;
                return (
                  <TableRow key={row.lr.id}>
                    <TableCell>{row.lr.lr_no}</TableCell>
                    <TableCell>{formatDateIndian(row.lr.lr_date)}</TableCell>
                    <TableCell>{row.lr.consignor}</TableCell>
                    <TableCell>{row.lr.consignee}</TableCell>
                    <TableCell>{row.lr.pkgs}</TableCell>
                    <TableCell>{row.lr.content}</TableCell>
                    <TableCell>{row.lr.freight_type}</TableCell>
                    <TableCell>{row.lr.freight}</TableCell>
                    <TableCell>{hamali}</TableCell>
                    <TableCell>{landing}</TableCell>
                    <TableCell>{lc}</TableCell>
                    <TableCell>{bc}</TableCell>
                    <TableCell>{cm.cash_memo_no || ""}</TableCell>
                    <TableCell>₹{total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button color="error" size="small" onClick={() => handleRemove(idx)}>Remove</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!batch.length && (
                <TableRow>
                  <TableCell colSpan={15} style={{ textAlign: "center", color: "#bbb" }}>No LRs added yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider sx={{ my: 1 }} />
        <Box display="flex" justifyContent="flex-end" gap={4} mt={1} px={2}>
          <Typography>Total LRs: {totals.count}</Typography>
          <Typography>Total Pkgs: {totals.pkgs}</Typography>
          <Typography>Total Hamali: ₹{totals.hamali.toFixed(2)}</Typography>
          <Typography>Total Cash Memo Total: ₹{totals.cashMemoTotal.toFixed(2)}</Typography>
        </Box>
        <Box display="flex" justifyContent="flex-end" mt={2} px={2} pb={2}>
          <Button
            variant="contained"
            color="success"
            disabled={!batch.length || !person}
            sx={{
              borderRadius: "14px",
              fontWeight: 600,
              background: "linear-gradient(90deg, #11998e 0%, #38ef7d 100%)",
              color: "#fff",
              boxShadow: "0 2px 12px 0 rgba(19,173,199,0.13)",
            }}
            onClick={handleSubmitAll}
          >
            Mark All As Delivered
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
