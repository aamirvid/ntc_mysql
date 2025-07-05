import React, { useEffect, useState } from "react";
import {
  Paper, Box, Grid, Button, Table, TableBody,
  TableCell, TableContainer, TableFooter, TableHead, TableRow, Typography,
  MenuItem, Select, InputLabel, FormControl
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enIN } from "date-fns/locale";
import api from "../../api";
import { format } from "date-fns";
import { formatDateIndian } from "../../utils/formatDate";

export default function DeliveryReport({ selectedYear }) {
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [memoNo, setMemoNo] = useState("");
  const [truckNo, setTruckNo] = useState("");
  const [allMemos, setAllMemos] = useState([]);
  const [allTrucks, setAllTrucks] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deliveryPerson, setDeliveryPerson] = useState("");
  const [allDeliveryPersons, setAllDeliveryPersons] = useState([]);

  useEffect(() => {
    if (!selectedYear) return;
    setAllMemos([]);
    setAllDeliveryPersons([]);
    api.get("/reports/delivery", { params: { year: selectedYear } })
      .then(res => {
        setAllMemos(res.data.allMemos || []);
        setAllDeliveryPersons(res.data.allDeliveryPersons || []);
      })
      .catch(() => {});
  }, [selectedYear]);

  const clearFilters = () => {
    setFromDate(null);
    setToDate(null);
    setDeliveryPerson("");
    setMemoNo("");
    setReport(null);
    setError("");
  };

  const fetchReport = async () => {
    setLoading(true);
    setError("");
    setReport(null);

    let params = { year: selectedYear };
    if (fromDate && toDate) {
      params.from = format(fromDate, "yyyy-MM-dd");
      params.to = format(toDate, "yyyy-MM-dd");
    }
    if (memoNo) params.memo_no = memoNo;
    if (deliveryPerson) params.delivered_by = deliveryPerson;

    try {
      const res = await api.get("/reports/delivery", { params });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load report.");
    }
    setLoading(false);
  };

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Delivery Report
      </Typography>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={4}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
            <DatePicker
              label="Delivery From"
              value={fromDate}
              onChange={setFromDate}
              slotProps={{ textField: { size: "small", fullWidth: true } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
            <DatePicker
              label="Delivery To"
              value={toDate}
              onChange={setToDate}
              slotProps={{ textField: { size: "small", fullWidth: true } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Delivery Person</InputLabel>
            <Select
              label="Delivery Person"
              value={deliveryPerson}
              onChange={e => setDeliveryPerson(e.target.value)}
              displayEmpty
            >
              <MenuItem value=""><em>All</em></MenuItem>
              {allDeliveryPersons.map(name => (
                <MenuItem key={name} value={name}>{name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
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
                <TableCell>LR No</TableCell>
                <TableCell>LR Date</TableCell>
                <TableCell>From</TableCell>
                <TableCell>Memo No</TableCell>
                <TableCell>Arrival Date</TableCell>
                <TableCell>Truck No</TableCell>
                <TableCell>Consignor</TableCell>
                <TableCell>Consignee</TableCell>
                <TableCell align="right">Pkgs</TableCell>
                <TableCell>Content</TableCell>
                <TableCell>Freight Type</TableCell>
                <TableCell align="right">Freight</TableCell>
                <TableCell align="right">Refund</TableCell>
                <TableCell>Cash Memo No</TableCell>
                <TableCell align="right">Cash Memo Total</TableCell>
                <TableCell>Delivery Date & Time</TableCell>
                <TableCell>Delivery Man</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.rows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row.lr_no}</TableCell>
                  <TableCell>{formatDateIndian(row.lr_date)}</TableCell>
                  <TableCell>{row.from_city}</TableCell>
                  <TableCell>{row.memo_no}</TableCell>
                  <TableCell>{formatDateIndian(row.arrival_date)}</TableCell>
                  <TableCell>{row.truck_no}</TableCell>
                  <TableCell>{row.consignor}</TableCell>
                  <TableCell>{row.consignee}</TableCell>
                  <TableCell align="right">{row.pkgs}</TableCell>
                  <TableCell>{row.content}</TableCell>
                  <TableCell>{row.freight_type}</TableCell>
                  <TableCell align="right">{Number(row.freight).toFixed(2)}</TableCell>
                  <TableCell align="right">{Number(row.refund).toFixed(2)}</TableCell>
                  <TableCell>{row.cash_memo_no || ""}</TableCell>
                  <TableCell align="right">
                    {typeof row.true_cash_memo_total === "number"
                      ? row.true_cash_memo_total.toFixed(2)
                      : (row.cash_memo_total ? Number(row.cash_memo_total).toFixed(2) : "")}
                  </TableCell>
                  <TableCell>
                    {row.delivered_at ?
                      new Date(row.delivered_at).toLocaleString("en-IN", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      }) : ""
                    }
                  </TableCell>
                  <TableCell>{row.delivered_by || ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={8} align="right"><b>Totals ({report.totals.total_lrs} LRs):</b></TableCell>
                <TableCell align="right"><b>{report.totals.total_pkgs}</b></TableCell>
                <TableCell colSpan={2}></TableCell>
                <TableCell align="right"><b>{report.totals.total_freight.toFixed(2)}</b></TableCell>
                <TableCell align="right"><b>{report.totals.total_refund.toFixed(2)}</b></TableCell>
                <TableCell></TableCell>
                <TableCell align="right"><b>{report.totals.total_cash_memo.toFixed(2)}</b></TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
