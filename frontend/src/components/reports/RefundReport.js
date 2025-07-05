import React, { useState } from "react";
import {
  Paper, Box, Grid, Button, Table, TableBody,
  TableCell, TableContainer, TableFooter, TableHead, TableRow, Typography, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enIN } from "date-fns/locale";
import api from "../../api";
import { format } from "date-fns";
import { formatDateIndian } from "../../utils/formatDate";

export default function RefundReport({ selectedYear }) {
  const [activeFilter, setActiveFilter] = useState("memo");
  const [memoFrom, setMemoFrom] = useState(null);
  const [memoTo, setMemoTo] = useState(null);
  const [arrivalFrom, setArrivalFrom] = useState(null);
  const [arrivalTo, setArrivalTo] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clearFilters = () => {
    setMemoFrom(null);
    setMemoTo(null);
    setArrivalFrom(null);
    setArrivalTo(null);
    setReport(null);
    setError("");
  };

  const fetchReport = async () => {
    setLoading(true);
    setError("");
    setReport(null);

    let params = { year: selectedYear };
    if (activeFilter === "memo") {
      if (!memoFrom || !memoTo) {
        setError("Please select both Memo From and To dates.");
        setLoading(false);
        return;
      }
      params.from = format(memoFrom, "yyyy-MM-dd");
      params.to = format(memoTo, "yyyy-MM-dd");
      params.filter = "memo";
    } else if (activeFilter === "arrival") {
      if (!arrivalFrom || !arrivalTo) {
        setError("Please select both Arrival From and To dates.");
        setLoading(false);
        return;
      }
      params.from = format(arrivalFrom, "yyyy-MM-dd");
      params.to = format(arrivalTo, "yyyy-MM-dd");
      params.filter = "arrival";
    }

    try {
      const res = await api.get("/reports/refund", { params });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load report.");
    }
    setLoading(false);
  };

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Refund Report
      </Typography>

      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <FormLabel component="legend">Select Date Filter</FormLabel>
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
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
            <DatePicker
              label="Memo From"
              value={memoFrom}
              onChange={setMemoFrom}
              disabled={activeFilter !== "memo"}
              slotProps={{ textField: { size: "small", fullWidth: true } }}
              openTo="day"
              views={["year", "month", "day"]}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
            <DatePicker
              label="Memo To"
              value={memoTo}
              onChange={setMemoTo}
              disabled={activeFilter !== "memo"}
              slotProps={{ textField: { size: "small", fullWidth: true } }}
              openTo="day"
              views={["year", "month", "day"]}
            />
          </LocalizationProvider>
        </Grid>

        {/* Arrival Date Range */}
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
            <DatePicker
              label="Arrival From"
              value={arrivalFrom}
              onChange={setArrivalFrom}
              disabled={activeFilter !== "arrival"}
              slotProps={{ textField: { size: "small", fullWidth: true } }}
              openTo="day"
              views={["year", "month", "day"]}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
            <DatePicker
              label="Arrival To"
              value={arrivalTo}
              onChange={setArrivalTo}
              disabled={activeFilter !== "arrival"}
              slotProps={{ textField: { size: "small", fullWidth: true } }}
              openTo="day"
              views={["year", "month", "day"]}
            />
          </LocalizationProvider>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
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
                <TableCell>LR Number</TableCell>
                <TableCell>LR Date</TableCell>
                <TableCell>Consignor</TableCell>
                <TableCell>Consignee</TableCell>
                <TableCell align="right">Pkgs</TableCell>
                <TableCell align="right">Freight</TableCell>
                <TableCell align="right">Refund</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.rows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row.lr_no}</TableCell>
                  <TableCell>{formatDateIndian(row.lr_date)}</TableCell>
                  <TableCell>{row.consignor}</TableCell>
                  <TableCell>{row.consignee}</TableCell>
                  <TableCell align="right">{row.pkgs}</TableCell>
                  <TableCell align="right">{Number(row.freight).toFixed(2)}</TableCell>
                  <TableCell align="right">{Number(row.refund).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} align="right"><b>Totals ({report.totals.total_lrs} LRs):</b></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell align="right"><b>{report.totals.total_pkgs}</b></TableCell>
                <TableCell align="right"><b>{report.totals.total_freight.toFixed(2)}</b></TableCell>
                <TableCell align="right"><b>{report.totals.total_refund.toFixed(2)}</b></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
