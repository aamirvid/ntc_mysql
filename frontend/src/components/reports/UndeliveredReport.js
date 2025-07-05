import React, { useState, useEffect, useCallback } from "react";
import {
  Paper,
  Box,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Divider,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import debounce from "lodash.debounce";
import api from "../../api";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enIN } from "date-fns/locale";
import { formatDateIndian } from "../../utils/formatDate";

export default function UndeliveredReport({ selectedYear }) {
  const [filters, setFilters] = useState({
    lr_no: "",
    consignor: "",
    consignee: "",
    memo_from_date: null,
    memo_to_date: null,
    arrival_from_date: null,
    arrival_to_date: null,
    lr_from_date: null,
    lr_to_date: null,
  });
  const [results, setResults] = useState([]);
  const [totals, setTotals] = useState({
    lrs: 0,
    pkgs: 0,
    ddTotal: 0,
    refund: 0,
    cashMemoTotal: 0,
  });
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  const debouncedSearch = useCallback(
    debounce((newFilters, newPage, newYear) => {
      handleSearch(newFilters, newPage, newYear);
    }, 400),
    []
  );

  useEffect(() => {
    if (selectedYear) {
      debouncedSearch(filters, page, selectedYear);
    } else {
      setResults([]);
      setTotals({ lrs: 0, pkgs: 0, ddTotal: 0, refund: 0, cashMemoTotal: 0 });
      setTotalRows(0);
    }
    return () => debouncedSearch.cancel();
  }, [filters, page, selectedYear]);

  useEffect(() => {
    setFilters({
      lr_no: "",
      consignor: "",
      consignee: "",
      memo_from_date: null,
      memo_to_date: null,
      arrival_from_date: null,
      arrival_to_date: null,
      lr_from_date: null,
      lr_to_date: null,
    });
    setResults([]);
    setTotals({ lrs: 0, pkgs: 0, ddTotal: 0, refund: 0, cashMemoTotal: 0 });
    setTotalRows(0);
    setPage(1);
  }, [selectedYear]);

  const handleFilter = (field, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [field]: value }));
  };

  const getParamDate = (d) => (d ? d.toISOString().split("T")[0] : undefined);

  const handleSearch = async (
    currFilters = filters,
    currPage = page,
    currYear = selectedYear
  ) => {
    setLoading(true);
    const params = {
      ...currFilters,
      memo_from_date: getParamDate(currFilters.memo_from_date),
      memo_to_date: getParamDate(currFilters.memo_to_date),
      arrival_from_date: getParamDate(currFilters.arrival_from_date),
      arrival_to_date: getParamDate(currFilters.arrival_to_date),
      lr_from_date: getParamDate(currFilters.lr_from_date),
      lr_to_date: getParamDate(currFilters.lr_to_date),
      status: "pending", // Show only undelivered LRs!
      year: currYear,
      page: currPage,
      limit,
    };
    const query = Object.entries(params)
      .filter(([k, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    try {
      const { data } = await api.get(`/lrs/search?${query}`);
      setResults(data.results);
      setTotalRows(data.total);

      let total = { lrs: 0, pkgs: 0, ddTotal: 0, refund: 0, cashMemoTotal: 0 };
      data.results.forEach((row) => {
        total.lrs += 1;
        total.pkgs += parseInt(row.pkgs) || 0;
        total.ddTotal += parseFloat(row.dd_total) || 0;
        total.refund += parseFloat(row.refund) || 0;
        total.cashMemoTotal +=
          (parseFloat(row.hamali) || 0) +
          (parseFloat(row.bc) || 0) +
          (parseFloat(row.landing) || 0) +
          (parseFloat(row.lc) || 0) +
          (row.freight_type === "Topay" ? (parseFloat(row.freight) || 0) : 0);

      });
      setTotals(total);
    } finally {
      setLoading(false);
    }
  };

  const handlePage = (next) => setPage((p) => Math.max(1, p + next));

  const handleClear = () => {
    setFilters({
      lr_no: "",
      consignor: "",
      consignee: "",
      memo_from_date: null,
      memo_to_date: null,
      arrival_from_date: null,
      arrival_to_date: null,
      lr_from_date: null,
      lr_to_date: null,
    });
    setResults([]);
    setTotals({ lrs: 0, pkgs: 0, ddTotal: 0, refund: 0, cashMemoTotal: 0 });
    setTotalRows(0);
    setPage(1);
  };

  // Util for display with tooltip
  const ellipsisWithTooltip = (text = "") =>
    text && text.length > 12 ? (
      <span title={text}>{text.slice(0, 12) + ".."}</span>
    ) : (
      text
    );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
    <Box p={2}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Undelivered L.R. Report
      </Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={2}>
            <TextField
              label="LR No"
              value={filters.lr_no}
              onChange={(e) => handleFilter("lr_no", e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              label="Consignor"
              value={filters.consignor}
              onChange={(e) => handleFilter("consignor", e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              label="Consignee"
              value={filters.consignee}
              onChange={(e) => handleFilter("consignee", e.target.value)}
              fullWidth
            />
          </Grid>
        </Grid>
        <Divider sx={{ my: 2 }}>Memo Dates</Divider>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="Memo Date From"
              value={filters.memo_from_date}
              onChange={(d) => handleFilter("memo_from_date", d)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="Memo Date To"
              value={filters.memo_to_date}
              onChange={(d) => handleFilter("memo_to_date", d)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="Arrival Date From"
              value={filters.arrival_from_date}
              onChange={(d) => handleFilter("arrival_from_date", d)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="Arrival Date To"
              value={filters.arrival_to_date}
              onChange={(d) => handleFilter("arrival_to_date", d)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
        </Grid>
        <Divider sx={{ my: 2 }}>L.R. Dates</Divider>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="L.R. Date From"
              value={filters.lr_from_date}
              onChange={(d) => handleFilter("lr_from_date", d)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="L.R. Date To"
              value={filters.lr_to_date}
              onChange={(d) => handleFilter("lr_to_date", d)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} display="flex" alignItems="center" gap={1}>
            <Button variant="outlined" onClick={handleClear} color="secondary">
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>LR No</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Consignor</TableCell>
                <TableCell>Consignee</TableCell>
                <TableCell>Pkgs</TableCell>
                <TableCell>Freight Type</TableCell>
                <TableCell>Freight</TableCell>
                <TableCell>DD Total</TableCell>
                <TableCell>Refund</TableCell>
                <TableCell>Memo No</TableCell>
                <TableCell>Memo Date</TableCell>
                <TableCell>Arrival Date</TableCell>
                <TableCell>Truck No</TableCell>
                <TableCell>Cash Memo No</TableCell>
                <TableCell>Cash Memo Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.lr_no}</TableCell>
                  <TableCell>
                    {row.lr_date && formatDateIndian(row.lr_date)}
                  </TableCell>
                  <TableCell>{ellipsisWithTooltip(row.consignor)}</TableCell>
                  <TableCell>{ellipsisWithTooltip(row.consignee)}</TableCell>
                  <TableCell>{row.pkgs}</TableCell>
                  <TableCell>{row.freight_type}</TableCell>
                  <TableCell>{row.freight}</TableCell>
                  <TableCell>{row.dd_total}</TableCell>
                  <TableCell>{row.refund}</TableCell>
                  <TableCell>{row.memo_no}</TableCell>
                  <TableCell>
                    {row.memo_date &&
                      formatDateIndian(row.memo_date)}
                  </TableCell>
                  <TableCell>
                    {row.arrival_date &&
                      formatDateIndian(row.arrival_date)}
                  </TableCell>
                  <TableCell>{row.truck_no}</TableCell>
                  <TableCell>{row.cash_memo_no}</TableCell>
                  <TableCell>
                    {(
                      (parseFloat(row.hamali) || 0) +
                      (parseFloat(row.bc) || 0) +
                      (parseFloat(row.landing) || 0) +
                      (parseFloat(row.lc) || 0) +
                      (row.freight_type === "Topay" ? (parseFloat(row.freight) || 0) : 0)
                    ).toFixed(2)}
                  </TableCell>

                </TableRow>
              ))}
              {!results.length && (
                <TableRow>
                  <TableCell colSpan={15} align="center" sx={{ color: "#888" }}>
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {results.length > 0 && (
              <tfoot>
                <TableRow>
                  <TableCell>
                    <b>Total:</b> {totals.lrs}
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell>
                    <b>{totals.pkgs}</b>
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell>
                    <b>{totals.ddTotal.toFixed(2)}</b>
                  </TableCell>
                  <TableCell>
                    <b>{totals.refund.toFixed(2)}</b>
                  </TableCell>
                  <TableCell colSpan={4}></TableCell>
                  <TableCell />
                  <TableCell>
                    <b>{totals.cashMemoTotal.toFixed(2)}</b>
                  </TableCell>
                </TableRow>
              </tfoot>
            )}
          </Table>
        </TableContainer>
        {totalRows > limit && (
          <Box display="flex" justifyContent="center" gap={2} py={2}>
            <Button onClick={() => handlePage(-1)} disabled={page === 1}>
              Prev
            </Button>
            <Typography>
              Page {page} / {Math.ceil(totalRows / limit)}
            </Typography>
            <Button
              onClick={() => handlePage(1)}
              disabled={page * limit >= totalRows}
            >
              Next
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
    </LocalizationProvider>
  );
}
