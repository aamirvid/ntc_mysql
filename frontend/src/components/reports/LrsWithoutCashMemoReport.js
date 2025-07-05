import React, { useEffect, useState } from "react";
import {
  Paper, Box, Grid, Button, Table, TableBody,
  TableCell, TableContainer, TableFooter, TableHead, TableRow, Typography,
  Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, MenuItem, Select, InputLabel
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enIN } from "date-fns/locale";
import api from "../../api";
import { format } from "date-fns";
import { formatDateIndian } from "../../utils/formatDate";

export default function LrsWithoutCashMemoReport({ selectedYear }) {
  const [activeFilter, setActiveFilter] = useState("memo");
  const [memoFrom, setMemoFrom] = useState(null);
  const [memoTo, setMemoTo] = useState(null);
  const [arrivalFrom, setArrivalFrom] = useState(null);
  const [arrivalTo, setArrivalTo] = useState(null);
  const [memoNo, setMemoNo] = useState("");
  const [truckNo, setTruckNo] = useState("");
  const [allMemos, setAllMemos] = useState([]);
  const [allTrucks, setAllTrucks] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch dropdown options on mount or when year changes
  useEffect(() => {
    if (!selectedYear) return;
    setAllMemos([]);
    setAllTrucks([]);
    api.get("/reports/no-cash-memo", { params: { year: selectedYear } })
      .then(res => {
        setAllMemos(res.data.allMemos || []);
        setAllTrucks(res.data.allTrucks || []);
      })
      .catch(() => {});
  }, [selectedYear]);

  const clearFilters = () => {
    setMemoFrom(null);
    setMemoTo(null);
    setArrivalFrom(null);
    setArrivalTo(null);
    setMemoNo("");
    setTruckNo("");
    setReport(null);
    setError("");
  };

  const fetchReport = async () => {
    setLoading(true);
    setError("");
    setReport(null);

    let params = { year: selectedYear };
    if (activeFilter === "memo" && memoFrom && memoTo) {
      params.from = format(memoFrom, "yyyy-MM-dd");
      params.to = format(memoTo, "yyyy-MM-dd");
      params.filter = "memo";
    } else if (activeFilter === "arrival" && arrivalFrom && arrivalTo) {
      params.from = format(arrivalFrom, "yyyy-MM-dd");
      params.to = format(arrivalTo, "yyyy-MM-dd");
      params.filter = "arrival";
    }
    if (memoNo) params.memo_no = memoNo;
    if (truckNo) params.truck_no = truckNo;

    try {
      const res = await api.get("/reports/no-cash-memo", { params });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load report.");
    }
    setLoading(false);
  };

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        LRs Without Cash Memo Report
      </Typography>

      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <FormLabel component="legend">Date Filter</FormLabel>
        <RadioGroup
          row
          value={activeFilter}
          onChange={e => setActiveFilter(e.target.value)}
        >
          <FormControlLabel value="memo" control={<Radio />} label="Memo Date" />
          <FormControlLabel value="arrival" control={<Radio />} label="Arrival Date" />
        </RadioGroup>
      </FormControl>

      <Grid container spacing={2} alignItems="center">
        {/* Memo Date Range */}
        <Grid item xs={12} sm={6} md={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
            <DatePicker
              label="Memo From"
              value={memoFrom}
              onChange={setMemoFrom}
              disabled={activeFilter !== "memo"}
              slotProps={{ textField: { size: "small", fullWidth: true } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
            <DatePicker
              label="Memo To"
              value={memoTo}
              onChange={setMemoTo}
              disabled={activeFilter !== "memo"}
              slotProps={{ textField: { size: "small", fullWidth: true } }}
            />
          </LocalizationProvider>
        </Grid>
        {/* Arrival Date Range */}
        <Grid item xs={12} sm={6} md={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
            <DatePicker
              label="Arrival From"
              value={arrivalFrom}
              onChange={setArrivalFrom}
              disabled={activeFilter !== "arrival"}
              slotProps={{ textField: { size: "small", fullWidth: true } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
            <DatePicker
              label="Arrival To"
              value={arrivalTo}
              onChange={setArrivalTo}
              disabled={activeFilter !== "arrival"}
              slotProps={{ textField: { size: "small", fullWidth: true } }}
            />
          </LocalizationProvider>
        </Grid>
        {/* Memo No Dropdown */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Memo No</InputLabel>
            <Select
              label="Memo No"
              value={memoNo}
              onChange={e => setMemoNo(e.target.value)}
              displayEmpty
            >
              <MenuItem value=""><em>All</em></MenuItem>
              {allMemos.map(m => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        {/* Truck No Dropdown */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Truck No</InputLabel>
            <Select
              label="Truck No"
              value={truckNo}
              onChange={e => setTruckNo(e.target.value)}
              displayEmpty
            >
              <MenuItem value=""><em>All</em></MenuItem>
              {allTrucks.map(t => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Button
            variant="contained"
            onClick={fetchReport}
            disabled={loading}
            sx={{ minWidth: 120, mr: 2 }}
          >
            Generate
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={clearFilters}
            disabled={loading}
          >
            Clear
          </Button>
        </Grid>
      </Grid>

      {error && (
        <Typography color="error" mb={2}>{error}</Typography>
      )}

      {loading && (
        <Typography>Loading...</Typography>
      )}

      {report && (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Memo No</TableCell>
                <TableCell>Memo Date</TableCell>
                <TableCell>Arrival Date</TableCell>
                <TableCell>Truck No</TableCell>
                <TableCell>LR No</TableCell>
                <TableCell>LR Date</TableCell>
                <TableCell>Consignor</TableCell>
                <TableCell>Consignee</TableCell>
                <TableCell align="right">Pkgs</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.rows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row.memo_no}</TableCell>
                  <TableCell>{formatDateIndian(row.memo_date)}</TableCell>
                  <TableCell>{formatDateIndian(row.arrival_date)}</TableCell>
                  <TableCell>{row.truck_no}</TableCell>
                  <TableCell>{row.lr_no}</TableCell>
                  <TableCell>{formatDateIndian(row.lr_date)}</TableCell>
                  <TableCell>{row.consignor}</TableCell>
                  <TableCell>{row.consignee}</TableCell>
                  <TableCell align="right">{row.pkgs}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={8} align="right"><b>Totals ({report.totals.total_lrs} LRs):</b></TableCell>
                <TableCell align="right"><b>{report.totals.total_pkgs}</b></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
