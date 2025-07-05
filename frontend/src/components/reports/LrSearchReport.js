import React, { useState, useEffect, useCallback } from "react";
import {
  Paper, Box, Grid, TextField, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Divider, IconButton, Collapse
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { useNavigate } from "react-router-dom";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import api from "../../api";
import debounce from "lodash.debounce";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enIN } from "date-fns/locale";
import { formatDateIndian } from "../../utils/formatDate"; // Adjust path as needed


export default function LrSearchReport({ selectedYear, userRole }) {
  const [filters, setFilters] = useState({
    lr_no: "", consignor: "", consignee: "",
    memo_from_date: null, memo_to_date: null,
    arrival_from_date: null, arrival_to_date: null,
    lr_from_date: null, lr_to_date: null,
  });
  const [results, setResults] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [totals, setTotals] = useState({ lrs: 0, pkgs: 0, topay: 0, paid: 0, ddTotal: 0, refund: 0 });
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 20;
  const navigate = useNavigate();

  // -- UPDATED: Always pass selectedYear as argument to debounce/search
  const debouncedSearch = useCallback(
    debounce((newFilters, newPage, newYear) => {
      handleSearch(newFilters, newPage, newYear);
    }, 400),
    [] // do NOT include dependencies here; debounce should be created only once!
  );

  // Main effect: filters, page, or year changes
  useEffect(() => {
    const hasAny = Object.entries(filters).some(
      ([k, v]) => v && (typeof v === "string" ? v.trim() : true)
    );
    if (hasAny && selectedYear) {
      debouncedSearch(filters, page, selectedYear); // always pass latest year
    } else {
      setResults([]);
      setTotals({ lrs: 0, pkgs: 0, topay: 0, paid: 0, ddTotal: 0, refund: 0 });
      setTotalRows(0);
    }
    return () => debouncedSearch.cancel();
    // Only filters, page, selectedYear in deps!
  }, [filters, page, selectedYear]); // <-- don't include debouncedSearch in deps

  // Reset everything when year changes
  useEffect(() => {
    setFilters({
      lr_no: "", consignor: "", consignee: "",
      memo_from_date: null, memo_to_date: null,
      arrival_from_date: null, arrival_to_date: null,
      lr_from_date: null, lr_to_date: null
    });
    setResults([]);
    setTotals({ lrs: 0, pkgs: 0, topay: 0, paid: 0, ddTotal: 0, refund: 0 });
    setTotalRows(0);
    setPage(1);
  }, [selectedYear]);

  const handleFilter = (field, value) => {
    setPage(1);
    setFilters(f => ({ ...f, [field]: value }));
  };

  const getParamDate = (d) => d ? d.toISOString().split("T")[0] : undefined;

  // -- UPDATED: Accept year as argument
  const handleSearch = async (currFilters = filters, currPage = page, currYear = selectedYear) => {
    setLoading(true);
    const params = {
      ...currFilters,
      memo_from_date: getParamDate(currFilters.memo_from_date),
      memo_to_date: getParamDate(currFilters.memo_to_date),
      arrival_from_date: getParamDate(currFilters.arrival_from_date),
      arrival_to_date: getParamDate(currFilters.arrival_to_date),
      lr_from_date: getParamDate(currFilters.lr_from_date),
      lr_to_date: getParamDate(currFilters.lr_to_date),
      year: currYear,      // Always uses current year!
      page: currPage,
      limit
    };
    const query = Object.entries(params).filter(([k, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    try {
      const { data } = await api.get(`/lrs/search?${query}`);
      setResults(data.results);
      setTotalRows(data.total);

      // Totals calculation
      let total = { lrs: 0, pkgs: 0, topay: 0, paid: 0, ddTotal: 0, refund: 0 };
      data.results.forEach(row => {
        total.lrs += 1;
        total.pkgs += parseInt(row.pkgs) || 0;
        if (row.freight_type === "Topay") total.topay += parseFloat(row.freight) || 0;
        if (row.freight_type === "Paid") total.paid += parseFloat(row.freight) || 0;
        total.ddTotal += parseFloat(row.dd_total) || 0;
        total.refund += parseFloat(row.refund) || 0;
      });
      setTotals(total);
    } finally {
      setLoading(false);
    }
  };

  const handlePage = (next) => setPage(p => Math.max(1, p + next));

  const handleClear = () => {
    setFilters({
      lr_no: "", consignor: "", consignee: "",
      memo_from_date: null, memo_to_date: null,
      arrival_from_date: null, arrival_to_date: null,
      lr_from_date: null, lr_to_date: null
    });
    setResults([]);
    setTotals({ lrs: 0, pkgs: 0, topay: 0, paid: 0, ddTotal: 0, refund: 0 });
    setTotalRows(0);
    setPage(1);
  };

  // Expand/collapse row
  const handleExpandRow = async (rowId) => {
    setExpandedRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
    // Optionally: fetch more details here if needed (eg: /lrs/:id/details)
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
    <Box p={2}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>L.R. Search Report</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          {/* LR Basic Filters */}
          <Grid item xs={12} sm={2}><TextField label="LR No" value={filters.lr_no} onChange={e => handleFilter("lr_no", e.target.value)} fullWidth /></Grid>
          <Grid item xs={12} sm={2}><TextField label="Consignor" value={filters.consignor} onChange={e => handleFilter("consignor", e.target.value)} fullWidth /></Grid>
          <Grid item xs={12} sm={2}><TextField label="Consignee" value={filters.consignee} onChange={e => handleFilter("consignee", e.target.value)} fullWidth /></Grid>
        </Grid>
        <Divider sx={{ my: 2 }}>Memo Dates</Divider>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="Memo Date From"
              value={filters.memo_from_date}
              onChange={d => handleFilter("memo_from_date", d)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="Memo Date To"
              value={filters.memo_to_date}
              onChange={d => handleFilter("memo_to_date", d)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="Arrival Date From"
              value={filters.arrival_from_date}
              onChange={d => handleFilter("arrival_from_date", d)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="Arrival Date To"
              value={filters.arrival_to_date}
              onChange={d => handleFilter("arrival_to_date", d)}
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
              onChange={d => handleFilter("lr_from_date", d)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="L.R. Date To"
              value={filters.lr_to_date}
              onChange={d => handleFilter("lr_to_date", d)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} display="flex" alignItems="center" gap={1}>
            <Button variant="outlined" onClick={handleClear} color="secondary">Clear</Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell />
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
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map(row => (
                <React.Fragment key={row.id}>
                  <TableRow>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleExpandRow(row.id)}
                        aria-label={expandedRows[row.id] ? "Collapse" : "Expand"}
                      >
                        {expandedRows[row.id] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{row.lr_no}</TableCell>
                    <TableCell>{row.lr_date && formatDateIndian(row.lr_date)}</TableCell>
                    <TableCell>{row.consignor}</TableCell>
                    <TableCell>{row.consignee}</TableCell>
                    <TableCell>{row.pkgs}</TableCell>
                    <TableCell>{row.freight_type}</TableCell>
                    <TableCell>{row.freight}</TableCell>
                    <TableCell>{row.dd_total}</TableCell>
                    <TableCell>{row.refund}</TableCell>
                    <TableCell>{row.memo_no}</TableCell>
                    <TableCell>{row.memo_date && formatDateIndian(row.memo_date)}</TableCell>
                    <TableCell>{row.arrival_date && formatDateIndian(row.arrival_date)}</TableCell>
                    <TableCell>{row.truck_no}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        sx={{ borderRadius: "10px", fontWeight: 600, px: 2, background: "linear-gradient(90deg, #13adc7 0%, #5efce8 100%)" }}
                        onClick={() => navigate(`/lrs/${row.id}/edit?year=${selectedYear}&memo=${row.memo_id}`)}
                      >
                        View/Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                  {/* Expandable row */}
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={15}>
                      <Collapse in={expandedRows[row.id]} timeout="auto" unmountOnExit>
                        <Box margin={2}>
                          <Typography variant="subtitle1" gutterBottom>LR, Memo & Cash Memo Details</Typography>
                          <Grid container spacing={2}>
                            {/* Show more fields below as desired */}
                            <Grid item xs={12} sm={6} md={3}><b>LR Content:</b> {row.content}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>LR Weight:</b> {row.weight}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>LR PM No:</b> {row.pm_no}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>LR Status:</b> {row.status}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>Created By:</b> {row.created_by}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>Created At:</b> {row.created_at ? formatDateIndian(row.created_at) : ""}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>Updated By:</b> {row.updated_by}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>Updated At:</b> {row.updated_at ? formatDateIndian(row.updated_at) : ""}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>LR Remarks:</b> {row.remarks}</Grid>

                            {/* Memo Fields */}
                            <Grid item xs={12} sm={6} md={3}><b>Memo No:</b> {row.memo_no}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>Memo Date:</b> {row.memo_date && formatDateIndian(row.memo_date)}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>Arrival Date:</b> {row.arrival_date && formatDateIndian(row.arrival_date)}</Grid>
                            {/* Cash Memo Fields */}
                            <Grid item xs={12} sm={6} md={3}><b>Cash Memo No:</b> {row.cash_memo_no}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>Hamali:</b> {row.hamali}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>B/C:</b> {row.bc}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>Landing:</b> {row.landing}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>L/C:</b> {row.lc}</Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <b>CM Total:</b>{" "}
                              {typeof row.true_cash_memo_total === "number"
                                ? row.true_cash_memo_total.toFixed(2)
                                : (
                                  (parseFloat(row.hamali) || 0) +
                                  (parseFloat(row.bc) || 0) +
                                  (parseFloat(row.landing) || 0) +
                                  (parseFloat(row.lc) || 0) +
                                  (row.freight_type === "Topay" ? (parseFloat(row.freight) || 0) : 0)
                                ).toFixed(2)
                              }
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}><b>CM Created By:</b> {row.cash_memo_created_by}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>CM Created At:</b> {row.cash_memo_created_at && formatDateIndian(row.cash_memo_created_at)}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>CM Updated By:</b> {row.cash_memo_updated_by}</Grid>
                            <Grid item xs={12} sm={6} md={3}><b>CM Updated At:</b> {row.cash_memo_updated_at && formatDateIndian(row.cash_memo_updated_at)}</Grid>
                            {/* Add any additional LR, memo, or cash memo fields here */}
                          </Grid>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
              {!results.length && (
                <TableRow>
                  <TableCell colSpan={15} align="center" sx={{ color: "#888" }}>No results found.</TableCell>
                </TableRow>
              )}
            </TableBody>
            {results.length > 0 && (
              <tfoot>
                <TableRow>
                  <TableCell />
                  <TableCell><b>Total:</b> {totals.lrs}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell><b>{totals.pkgs}</b></TableCell>
                  <TableCell />
                  <TableCell><b>Topay:</b> ₹{totals.topay.toFixed(2)}<br /><b>Paid:</b> ₹{totals.paid.toFixed(2)}</TableCell>
                  <TableCell><b>{totals.ddTotal.toFixed(2)}</b></TableCell>
                  <TableCell><b>{totals.refund.toFixed(2)}</b></TableCell>
                  <TableCell colSpan={6} />
                </TableRow>
              </tfoot>
            )}
          </Table>
        </TableContainer>
        {/* Pagination Controls */}
        {totalRows > limit && (
          <Box display="flex" justifyContent="center" gap={2} py={2}>
            <Button onClick={() => handlePage(-1)} disabled={page === 1}>Prev</Button>
            <Typography>Page {page} / {Math.ceil(totalRows / limit)}</Typography>
            <Button onClick={() => handlePage(1)} disabled={page >= Math.ceil(totalRows / limit)}>Next</Button>
          </Box>
        )}
      </Paper>
    </Box>
    </LocalizationProvider>
  );
}
