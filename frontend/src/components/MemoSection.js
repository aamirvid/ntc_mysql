import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import {
  TextField,
  Button,
  Typography,
  Box,
  Grid, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import { DatePicker, TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enIN } from "date-fns/locale";
import { toast } from 'react-toastify';
import ConfirmDialog from './ConfirmDialog';
import './MemoSectionGlass.css';
import { mapLrFields } from '../utils/mapLrFields';

// --- DATE FORMATTER (YYYY-MM-DD) ---
function formatDateOnly(d) {
  if (!d) return null;
  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString().slice(0, 10);
}
// --- TIME FORMATTER (HH:mm:ss) ---
function formatTimeOnly(d) {
  if (!d) return null;
  // Always outputs in 24h format
  return d.toLocaleTimeString("en-GB", { hour12: false });
}
// Parse TIME string (MySQL) to Date object for TimePicker
function parseArrivalTime(str) {
  if (!str || str === "00:00:00") return null;
  const [h, m, s] = str.split(":").map(Number);
  if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
  const d = new Date();
  d.setHours(h, m, s, 0);
  return d;
}

export default function MemoSection({
  memo,
  setMemo,
  selectedMemo,
  setSelectedMemo,
  mode,
  setMode,
  setSubmittedLrs,
  setCashMemos,
  selectedYear,
  setLr,
  setSelectedLr,
  setIsEditingLr
}) {
  const memoNoRef = useRef();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lookupData, setLookupData] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();
  const [importSummary, setImportSummary] = useState(null);
  

  // Calculate balance on change
  useEffect(() => {
    const t = parseFloat(memo.total_lorry_hire) || 0;
    const a = parseFloat(memo.advance_lorry_hire) || 0;
    setMemo(m => ({
      ...m,
      balance_lorry_hire: (t - a).toFixed(2)
    }));
    // eslint-disable-next-line
  }, [memo.total_lorry_hire, memo.advance_lorry_hire]);

  // Clear memo form
  const clearForm = () => {
    setMemo({
      memo_no: '',
      memo_date: new Date(),
      arrival_date: new Date(),
      arrival_time: null,
      truck_no: '',
      total_lorry_hire: '',
      advance_lorry_hire: '',
      balance_lorry_hire: '0.00',
      driver_owner: ''
    });
    setSelectedMemo(null);
    setMode('new');
    setSubmittedLrs([]);
    setCashMemos([]);
    setLr && setLr({
      lrNo: '',
      lrDate: new Date(),
      from: '',
      to: '',
      consignor: '',
      consignee: '',
      pkgs: '',
      content: '',
      freightType: 'Topay',
      freight: '',
      weight: '',
      ddRate: '',
      ddTotal: '0.00',
      pmNo: '',
      remarks: '',
      hamali: '',
      bc: '5.00',
      landing: '',
      lc: '',
      cashMemoTotal: '0.00',
      cashMemoNo: ''
    });
    setSelectedLr && setSelectedLr(null);
    setIsEditingLr && setIsEditingLr(false);
    setTimeout(() => memoNoRef.current?.focus(), 10);
  };

  // Lookup Memo
  const handleBlur = async e => {
    const no = e.target.value.trim();
    if (!no) return;
    if (mode === "edit" && selectedMemo?.id) return;

    try {
      const yearParam = selectedYear ? `?year=${selectedYear}` : "";
      const { data } = await api.get(
        `/memos/lookup/${no}${yearParam}`
      );
      setLookupData({ memoNo: no, data });
      setConfirmOpen(true);
    } catch (err) {
      if (err.response?.status === 404) {
        setSelectedMemo(null);
        setMode('new');
        setSubmittedLrs([]);
        setCashMemos([]);
      } else {
        toast.error(`Lookup error: ${err.message}`);
      }
    }
  };

  // Handle confirm dialog for lookup
  const handleConfirm = confirmed => {
    setConfirmOpen(false);
    if (confirmed && lookupData) {
      const { data } = lookupData;

      // LOG: see what is actually returned and parsed
      const arrival_time_parsed = parseArrivalTime(data.memo.arrival_time);
      console.log("Loaded arrival_time raw:", data.memo.arrival_time, "Parsed:", arrival_time_parsed);

      setMemo({
        memo_no: data.memo.memo_no || '',
        memo_date: data.memo.memo_date ? new Date(data.memo.memo_date) : null,
        arrival_date: data.memo.arrival_date ? new Date(data.memo.arrival_date) : null,
        arrival_time: arrival_time_parsed, // <--- Guaranteed fix
        truck_no: data.memo.truck_no || '',
        total_lorry_hire: data.memo.total_lorry_hire?.toString() || '',
        advance_lorry_hire: data.memo.advance_lorry_hire?.toString() || '',
        balance_lorry_hire: (
          (parseFloat(data.memo.total_lorry_hire) || 0) -
          (parseFloat(data.memo.advance_lorry_hire) || 0)
        ).toFixed(2),
        driver_owner: data.memo.driver_owner || ''
      });
      setSelectedMemo(data.memo);
      setMode('view');

      // ---- UPDATED mapping: use mapLrFields ----
      const mapped = data.lrs.map(lrRow => {
        const cm = data.cashMemos.find(c => c.lr_id === lrRow.id) || {};
        return mapLrFields({
          ...lrRow,
          cashMemoNo: cm.cash_memo_no?.toString() || '',
          cashMemoTotal: (
            (parseFloat(cm.hamali) || 0) +
            (parseFloat(cm.bc) || 0) +
            (parseFloat(cm.landing) || 0) +
            (parseFloat(cm.lc) || 0) +
            (lrRow.freight_type === 'Topay'
              ? (parseFloat(lrRow.freight) || 0)
              : 0)
          ).toFixed(2),
        });
      });
      setSubmittedLrs(mapped);
      setCashMemos(data.cashMemos);
    } else if (!confirmed) {
      clearForm();
    }
    setLookupData(null);
  };

  // Save or update Memo
  const handleSaveOrUpdate = async () => {
    if (
      !memo.memo_no ||
      !memo.truck_no ||
      !memo.total_lorry_hire ||
      !memo.advance_lorry_hire ||
      !memo.memo_date ||
      !memo.arrival_date ||
      !memo.arrival_time
    ) {
      toast.error('Please fill all required memo fields.');
      return;
    }
    try {
      let saved;
      const payload = {
        memo_no: memo.memo_no,
        memo_date: formatDateOnly(memo.memo_date),
        arrival_date: formatDateOnly(memo.arrival_date),
        arrival_time: memo.arrival_time ? formatTimeOnly(memo.arrival_time) : null,
        truck_no: memo.truck_no,
        total_lorry_hire: parseFloat(memo.total_lorry_hire),
        advance_lorry_hire: parseFloat(memo.advance_lorry_hire),
        driver_owner: memo.driver_owner
      };
      if (mode === "edit" && selectedMemo?.id) {
        const res = await api.put(
          `/memos/${selectedMemo.id}?year=${selectedYear}`,
          payload
        );
        saved = res.data;
        toast.success('Memo updated!');
        setSelectedMemo(saved);
        setMode("view");
      } else if (mode === "new" && !selectedMemo) {
        const res = await api.post(
          `/memos?year=${selectedYear}`,
          payload
        );
        saved = res.data;
        toast.success('Memo saved!');
        setSelectedMemo(saved);
        setMode("view");
      }
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message
      );
    }
  };

  let buttonText = "Save Memo";
  if (mode === "view" && selectedMemo?.id) buttonText = "Edit Memo";
  else if (mode === "edit" && selectedMemo?.id) buttonText = "Update Memo";

  const handleButtonClick = () => {
    if (mode === "view" && selectedMemo?.id) {
      setMode("edit");
    } else {
      handleSaveOrUpdate();
    }
  };

  const isFieldLocked = mode === "view";

  return (
    <Box className="memo-glass-form" sx={{ mb: 2 }}>
      <Typography variant="subtitle1" className="memo-form-title" sx={{ mb: 2 }}>
        Memo Details
      </Typography>
      <Grid container spacing={2} alignItems="center" flexWrap="wrap">
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Memo No"
            value={memo.memo_no}
            onChange={e => setMemo({ ...memo, memo_no: e.target.value })}
            onBlur={handleBlur}
            required
            disabled={mode !== "new"}
            inputRef={memoNoRef}
            className="memo-glass-input"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
            <DatePicker
              label="Memo Date"
              value={memo.memo_date}
              onChange={d => setMemo({ ...memo, memo_date: d })}
              disabled={isFieldLocked}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  className: "memo-glass-input",
                },
              }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
            <DatePicker
              label="Arrival Date"
              value={memo.arrival_date}
              onChange={d => setMemo({ ...memo, arrival_date: d })}
              disabled={isFieldLocked}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  className: "memo-glass-input",
                },
              }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
            <TimePicker
              label="Arrival Time"
              value={memo.arrival_time || null}
              onChange={t => setMemo({ ...memo, arrival_time: t })}
              disabled={isFieldLocked}
              ampm
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  className: "memo-glass-input",
                },
              }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Truck No"
            value={memo.truck_no}
            onChange={e => setMemo({ ...memo, truck_no: e.target.value })}
            required
            disabled={isFieldLocked}
            className="memo-glass-input"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Total Lorry Hire"
            type="number"
            value={memo.total_lorry_hire}
            onChange={e => setMemo({ ...memo, total_lorry_hire: e.target.value })}
            required
            disabled={isFieldLocked}
            className="memo-glass-input"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Advance Lorry Hire"
            type="number"
            value={memo.advance_lorry_hire}
            onChange={e => setMemo({ ...memo, advance_lorry_hire: e.target.value })}
            required
            disabled={isFieldLocked}
            className="memo-glass-input"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Balance Lorry Hire"
            type="number"
            value={memo.balance_lorry_hire}
            InputProps={{ readOnly: true }}
            disabled
            className="memo-glass-input"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Driver/Owner"
            value={memo.driver_owner}
            onChange={e => setMemo({ ...memo, driver_owner: e.target.value })}
            disabled={isFieldLocked}
            className="memo-glass-input"
            fullWidth
          />
        </Grid>
        {/* Buttons Row */}
        <Grid item xs={12} className="memo-btn-row">
          <Button
            className="memo-glass-btn"
            variant="contained"
            color={isFieldLocked ? "secondary" : "primary"}
            onClick={handleButtonClick}
            sx={{ mr: 2 }}
          >
            {buttonText}
          </Button>
          <Button
            className="memo-glass-btn"
            variant="outlined"
            color="error"
            onClick={clearForm}
          >
            New Memo
          </Button>
          {selectedMemo?.id && (
            <Button
              className="memo-glass-btn"
              variant="outlined"
              color="primary"
              onClick={() => setImportOpen(true)}
              sx={{ ml: 2 }}
            >
              Bulk Import LRs (Excel)
            </Button>
          )}
        </Grid>
      </Grid>
      <ConfirmDialog
        open={confirmOpen}
        title="Load Memo?"
        content={
          lookupData
            ? `Memo ${lookupData.memoNo} exists. Load its details and L.R.s?`
            : ""
        }
        onClose={handleConfirm}
      />
      <Dialog open={importOpen} onClose={() => setImportOpen(false)}>
        <DialogTitle>Bulk Import LRs</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Upload Excel file (ignore first 2 rows). Only LR details will be imported.
          </Typography>
          <input type="file" ref={fileRef} accept=".xls,.xlsx" />
          {importing && <CircularProgress size={32} sx={{ ml: 2 }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)} disabled={importing}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!fileRef.current.files[0]) return toast.error("Select file first");
              setImporting(true);
              const formData = new FormData();
              formData.append("file", fileRef.current.files[0]);
              formData.append("memo_id", selectedMemo.id);
              try {
                const res = await api.post(`/lrs/bulk-import?year=${selectedYear}`, formData, {
                  headers: { "Content-Type": "multipart/form-data" },
                });
                toast.success(
                  `Imported ${res.data.inserted} LRs, skipped ${res.data.duplicates} duplicates.`
                );
                setImportSummary(res.data);
                setImportOpen(false);
                // Reload the LRs if any were imported
                if (res.data.inserted > 0) {
                  const lrRes = await api.get(`/lrs?memo_id=${selectedMemo.id}&year=${selectedYear}`);
                  setSubmittedLrs(lrRes.data);
                }
              } catch (err) {
                toast.error(err.response?.data?.error || err.message || "Import failed");
              }
              setImporting(false);
            }}
            disabled={importing}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!importSummary}
        onClose={() => setImportSummary(null)}
        maxWidth="sm"
      >
        <DialogTitle>Bulk Import Result</DialogTitle>
        <DialogContent>
          <Typography>
            Imported: <b>{importSummary?.inserted || 0}</b><br />
            Skipped (duplicates): <b>{importSummary?.duplicates || 0}</b>
          </Typography>
          {importSummary?.skippedLrNos?.length > 0 && (
            <>
              <Typography sx={{ mt: 2 }}>
                <b>Skipped LR Numbers:</b>
              </Typography>
              <Box sx={{ maxHeight: 120, overflowY: "auto" }}>
                {importSummary.skippedLrNos.map((no, idx) =>
                  <span key={no}>{no}{idx < importSummary.skippedLrNos.length - 1 ? ", " : ""}</span>
                )}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportSummary(null)}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
