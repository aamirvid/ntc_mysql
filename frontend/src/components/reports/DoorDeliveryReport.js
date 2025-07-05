import React, { useState, useEffect } from "react";
import api from "../../api";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enIN } from "date-fns/locale";
import { formatDateIndian } from "../../utils/formatDate";
import {
  Button,
  Paper,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  TextField
} from "@mui/material";

export default function DoorDeliveryReport({ selectedYear }) {
  const [arrivalDate, setArrivalDate] = useState(null);
  const [memos, setMemos] = useState([]);
  const [selectedMemoId, setSelectedMemoId] = useState("");
  const [lrs, setLrs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMemos([]);
    setSelectedMemoId("");
    setLrs([]);
    if (!selectedYear) return;
    api.get(`/memos?year=${selectedYear}`)
      .then(res => setMemos(res.data))
      .catch(() => setMemos([]));
  }, [selectedYear]);

  // Filter memos by arrival date
  const memosForDate = arrivalDate
    ? memos.filter(
        m =>
          m.arrival_date &&
          m.arrival_date.slice(0, 10) === arrivalDate.toISOString().slice(0, 10)
      )
    : [];

  const handleShowReport = () => {
    setLrs([]);
    if (!selectedMemoId) return;
    setLoading(true);
    api
      .get(`/lrs?year=${selectedYear}&memo_id=${selectedMemoId}`)
      .then(res => {
        // Only include LRs with dd_total > 0
        setLrs(res.data.filter(lr => Number(lr.dd_total) > 0));
      })
      .finally(() => setLoading(false));
  };

  const totalLrs = lrs.length;
  const totalPkgs = lrs.reduce((sum, lr) => sum + Number(lr.pkgs || 0), 0);
  const totalDdTotal = lrs.reduce((sum, lr) => sum + Number(lr.dd_total || 0), 0);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
    <Paper sx={{ p: 3, maxWidth: 900, mx: "auto", mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Door Delivery Report
      </Typography>
      <Box display="flex" gap={2} mb={2}>
        
          <DatePicker
            label="Arrival Date"
            value={arrivalDate}
            onChange={d => {
              setArrivalDate(d);
              setSelectedMemoId("");
              setLrs([]);
            }}
            renderInput={params => <TextField {...params} />}
          />
       
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Memo & Truck No.</InputLabel>
          <Select
            value={selectedMemoId}
            label="Memo & Truck No."
            onChange={e => setSelectedMemoId(e.target.value)}
            disabled={!arrivalDate || memosForDate.length === 0}
          >
            {memosForDate.map(m => (
              <MenuItem key={m.id} value={m.id}>
                {m.memo_no} / {m.truck_no}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={handleShowReport}
          disabled={!selectedMemoId || loading}
        >
          Show Report
        </Button>
      </Box>
      {lrs.length > 0 && (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>LR No</TableCell>
                <TableCell>LR Date</TableCell>
                <TableCell>Arrival Date</TableCell>
                <TableCell>Consignor</TableCell>
                <TableCell>Consignee</TableCell>
                <TableCell>Pkgs</TableCell>
                <TableCell>DD Rate</TableCell>
                <TableCell>DD Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lrs.map(lr => (
                <TableRow key={lr.id}>
                  <TableCell>{lr.lr_no}</TableCell>
                  <TableCell>{formatDateIndian(lr.lr_date)}</TableCell> {/* <-- */}
                  <TableCell>
                    {arrivalDate ? formatDateIndian(arrivalDate) : ""}
                  </TableCell>
                  <TableCell>{lr.consignor}</TableCell>
                  <TableCell>{lr.consignee}</TableCell>
                  <TableCell>{lr.pkgs}</TableCell>
                  <TableCell>{lr.dd_rate}</TableCell>
                  <TableCell>{lr.dd_total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ mt: 2, fontWeight: "bold" }}>
            Total LRs: {totalLrs} &nbsp; | &nbsp;
            Total Pkgs: {totalPkgs} &nbsp; | &nbsp;
            Total DD Total: {totalDdTotal}
          </Box>
        </>
      )}
      {lrs.length === 0 && selectedMemoId && !loading && (
        <Typography sx={{ mt: 2 }}>
          No door delivery records found for this memo.
        </Typography>
      )}
    </Paper>
    </LocalizationProvider>
  );
}
