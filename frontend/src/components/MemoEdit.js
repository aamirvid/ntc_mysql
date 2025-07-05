import React, { useEffect, useState } from "react";
import {
  Paper, Typography, Grid, TextField, Button, Box, Divider
} from "@mui/material";
import { DatePicker, TimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import api from "../api";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enIN } from "date-fns/locale";

// --- TIME HELPERS ---
function formatTimeOnly(d) {
  if (!d) return null;
  // Always outputs in 24h format for MySQL TIME
  return d.toLocaleTimeString("en-GB", { hour12: false });
}
function parseArrivalTime(str) {
  if (!str) return null;
  const [h, m, s] = str.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, s || 0, 0);
  return d;
}

export default function MemoEdit({ selectedYear }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [memo, setMemo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load memo by id
  useEffect(() => {
    if (!id || !selectedYear) return;
    setLoading(true);
    api.get(`/memos/${id}?year=${selectedYear}`)
      .then(res => setMemo({
        ...res.data,
        memo_date: res.data.memo_date ? new Date(res.data.memo_date) : null,
        arrival_date: res.data.arrival_date ? new Date(res.data.arrival_date) : null,
        arrival_time: res.data.arrival_time ? parseArrivalTime(res.data.arrival_time) : null, // <-- ADDED
        total_lorry_hire: res.data.total_lorry_hire?.toString() || "",
        advance_lorry_hire: res.data.advance_lorry_hire?.toString() || "",
        balance_lorry_hire: res.data.balance_lorry_hire?.toString() || "",
      }))
      .catch(() => {
        toast.error("Could not load memo");
        setMemo(null);
      })
      .finally(() => setLoading(false));
  }, [id, selectedYear]);

  // Always update balance when total/advance change
  useEffect(() => {
    if (!memo) return;
    const t = parseFloat(memo.total_lorry_hire) || 0;
    const a = parseFloat(memo.advance_lorry_hire) || 0;
    setMemo(m => m ? { ...m, balance_lorry_hire: (t - a).toFixed(2) } : m);
  }, [memo?.total_lorry_hire, memo?.advance_lorry_hire]);

  if (loading) return <Box p={3}><Typography>Loading...</Typography></Box>;
  if (!memo) return <Box p={3}><Typography>Memo not found.</Typography></Box>;

  // Submit/save
  const handleSave = async () => {
    if (
      !memo.memo_no || !memo.truck_no || !memo.memo_date ||
      !memo.arrival_date || !memo.arrival_time ||
      !memo.total_lorry_hire || !memo.advance_lorry_hire
    ) {
      toast.error("Fill all required fields");
      return;
    }
    try {
      await api.put(
        `/memos/${id}?year=${selectedYear}`,
        {
          ...memo,
          memo_date: memo.memo_date ? memo.memo_date.toISOString().slice(0, 10) : null,
          arrival_date: memo.arrival_date ? memo.arrival_date.toISOString().slice(0, 10) : null,
          arrival_time: memo.arrival_time ? formatTimeOnly(memo.arrival_time) : null,
        }
      );
      toast.success("Memo updated!");
      navigate(`/memos/${id}`);
    } catch (err) {
      toast.error("Update failed: " + (err.response?.data?.error || err.message));
    }
  };

  // Cancel: back to detail
  const handleCancel = () => navigate(`/memos/${id}`);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
      <Box p={2}>
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>Edit Memo #{memo.memo_no}</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <TextField
                label="Memo No"
                value={memo.memo_no}
                onChange={e => setMemo({ ...memo, memo_no: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <DatePicker
                label="Memo Date"
                value={memo.memo_date}
                onChange={d => setMemo({ ...memo, memo_date: d })}
                renderInput={params => (
                  <TextField
                    {...params}
                    fullWidth
                    required
                  />
                )}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <DatePicker
                label="Arrival Date"
                value={memo.arrival_date}
                onChange={d => setMemo({ ...memo, arrival_date: d })}
                renderInput={params => (
                  <TextField
                    {...params}
                    fullWidth
                    required
                  />
                )}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TimePicker
                label="Arrival Time"
                value={memo.arrival_time}
                onChange={t => setMemo({ ...memo, arrival_time: t })}
                ampm
                renderInput={params => (
                  <TextField
                    {...params}
                    fullWidth
                    required
                  />
                )}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                label="Truck No"
                value={memo.truck_no}
                onChange={e => setMemo({ ...memo, truck_no: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                label="Total Lorry Hire"
                type="number"
                value={memo.total_lorry_hire}
                onChange={e => setMemo({ ...memo, total_lorry_hire: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                label="Advance Lorry Hire"
                type="number"
                value={memo.advance_lorry_hire}
                onChange={e => setMemo({ ...memo, advance_lorry_hire: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                label="Balance Lorry Hire"
                value={memo.balance_lorry_hire}
                InputProps={{ readOnly: true }}
                fullWidth
                disabled
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                label="Driver/Owner"
                value={memo.driver_owner}
                onChange={e => setMemo({ ...memo, driver_owner: e.target.value })}
                fullWidth
              />
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Button
              onClick={handleSave}
              variant="contained"
              color="primary"
              sx={{ mr: 2 }}
            >
              Save
            </Button>
            <Button
              onClick={handleCancel}
              variant="outlined"
              color="secondary"
            >
              Cancel
            </Button>
          </Box>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
}
