import React, { useEffect, useRef, useState } from "react";
import CashMemoPrint from "./CashMemoPrint";
import api from "../api";
import {
  TextField,
  Button,
  Grid,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import SuggestInput from "./SuggestInput";
import { toast } from "react-toastify";
import errorMessages from "../utils/errorMessages";
import ConfirmDialog from "./ConfirmDialog";
import { enIN } from "date-fns/locale";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// ---- DATE FORMATTER (YYYY-MM-DD) ----
function formatDateOnly(d) {
  if (!d) return null;
  // Accept both JS Date and string
  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString().slice(0, 10);
}

// Parse date in multiple formats (for incoming)
function parseDateSafe(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
    const [d, m, y] = val.split("/").map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return new Date(val);
  }
  return new Date(val);
}

export default function LrSection({
  lr,
  setLr,
  selectedMemo,
  selectedLr,
  setSelectedLr,
  isEditing,
  setIsEditing,
  cashMemos,
  setCashMemos,
  submittedLrs,
  setSubmittedLrs,
  selectedYear,
  currentUser,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lookupData, setLookupData] = useState(null);
  const [isDdTotalManual, setIsDdTotalManual] = useState(false);
  const lrNumberRef = useRef();
  const [printData, setPrintData] = useState(null);
  const [showCashMemoFields, setShowCashMemoFields] = useState(false);
  const [hasCashMemoInDb, setHasCashMemoInDb] = useState(false);

  const parseOrZero = (val) => (val === "" || val == null ? 0 : parseFloat(val) || 0);

  function validateLR() {
    return (
      !!selectedMemo &&
      lr.lrNo &&
      lr.from &&
      lr.to &&
      lr.consignor &&
      lr.consignee &&
      lr.pkgs
    );
  }

  useEffect(() => {
    if (isEditing && selectedLr && selectedLr.id) {
      api
        .get(`/cashmemos?lr_id=${selectedLr.id}&year=${selectedYear}`)
        .then(({ data }) => {
          setHasCashMemoInDb(data && data.length > 0);
        })
        .catch(() => setHasCashMemoInDb(false));
    } else {
      setHasCashMemoInDb(false);
    }
  }, [isEditing, selectedLr, selectedYear]);

  // Show fields for new or edit cash memo, set BC to 5.00 only for new memo
  const handleShowCashMemoFields = () => {
    setShowCashMemoFields(true);
    if (!isEditing && (!lr.bc || lr.bc === "")) {
      setLr((prev) => ({ ...prev, bc: "5.00" }));
    }
  };

  useEffect(() => {
    let total =
      parseOrZero(lr.hamali) +
      parseOrZero(lr.bc) +
      parseOrZero(lr.landing) +
      parseOrZero(lr.lc);
    if (lr.freightType === "Topay") {
      total += parseOrZero(lr.freight);
    }
    setLr((prev) => ({ ...prev, cashMemoTotal: total.toFixed(2) }));
    // eslint-disable-next-line
  }, [
    lr.hamali,
    lr.bc,
    lr.landing,
    lr.lc,
    lr.freightType,
    lr.freight,
    setLr,
  ]);




  const handleDdTotalChange = (e) => {
    setLr((prev) => ({ ...prev, ddTotal: e.target.value }));
    setIsDdTotalManual(true);
  };

  const handleDdRateChange = (e) => {
    const value = e.target.value;
    let ddTotal = "";
    if (value !== "" && value !== "0") {
      const pkgs = parseFloat(lr.pkgs) || 0;
      const ddRate = parseFloat(value) || 0;
      ddTotal = (ddRate * pkgs).toFixed(2);
    }
    setLr((prev) => ({
      ...prev,
      ddRate: value,
      ddTotal: ddTotal // This ensures ddTotal is recalculated on each keystroke!
    }));
    setIsDdTotalManual(false);
  };

  const handleBlur = async (e) => {
    const no = e.target.value.trim();
    if (!no || !selectedMemo) return;
    if (isEditing && selectedLr && selectedLr.lr_no === no) {
      return;
    }
    try {
      const { data } = await api.get(
        `/lrs/lookup/${no}?year=${selectedYear}`
      );
      setLookupData({ lrNo: no, data });
      setConfirmOpen(true);
    } catch (err) {
      if (err.response?.status === 404) {
        setSelectedLr(null);
        setIsEditing(false);
      } else if (err.code === "ERR_NETWORK") {
        toast.error(errorMessages.network);
      } else {
        toast.error(
          errorMessages.unexpected +
            (err.response?.data?.error ? " (" + err.response.data.error + ")" : "")
        );
      }
    }
  };

  const handleConfirm = (confirmed) => {
    setConfirmOpen(false);
    if (confirmed && lookupData) {
      const { data, lrNo } = lookupData;
      if (data.memo_no !== selectedMemo.memo_no) {
        toast.error(`L.R. ${lrNo} belongs to Memo ${data.memo_no}. Cannot edit here.`);
        setLr((prev) => ({ ...prev, lrNo: "" }));
        setIsEditing(false);
        setSelectedLr(null);
        setTimeout(() => {
          lrNumberRef.current?.focus();
        }, 10);
        return;
      }
      api.get(`/cashmemos?lr_id=${data.id}&year=${selectedYear}`)
        .then(({ data: cms }) => {
          const cm = cms && cms.length > 0 ? cms[0] : {};
          const isManual =
          (!data.dd_rate || data.dd_rate === "0" || data.dd_rate === "") &&
          !!data.dd_total &&
          data.dd_total !== "0" &&
          data.dd_total !== "0.00";
        setIsDdTotalManual(isManual);

          setLr({
            lrNo: data.lr_no,
            lrDate: parseDateSafe(data.lr_date),
            from: data.from_city,
            to: data.to_city,
            consignor: data.consignor,
            consignee: data.consignee,
            pkgs: data.pkgs?.toString() || "",
            content: data.content || "",
            freightType: data.freight_type || "Topay",
            freight: data.freight?.toString() || "",
            weight: data.weight?.toString() || "",
            ddRate: data.dd_rate?.toString() || "",
            ddTotal: data.dd_total?.toString() || "",
            pmNo: data.pm_no || "",
            refund: data.refund?.toString() || "",
            remarks: data.remarks || "",
            status: data.status || "",
            hamali: cm.hamali?.toString() || "",
            bc: cm.bc?.toString() || "",
            landing: cm.landing?.toString() || "",
            lc: cm.lc?.toString() || "",
            cashMemoNo: cm.cash_memo_no?.toString() || "",
            cashMemoTotal: (
              parseOrZero(cm.hamali) +
              parseOrZero(cm.bc) +
              parseOrZero(cm.landing) +
              parseOrZero(cm.lc) +
              (data.freight_type === "Topay" ? parseOrZero(data.freight) : 0)
            ).toFixed(2),
            
          });
          setSelectedLr(data);
          setIsEditing(true);
          setShowCashMemoFields(false);
          setTimeout(() => {
            lrNumberRef.current?.focus();
          }, 10);
        });
    } else if (!confirmed) {
      resetForm();
    }
    setLookupData(null);
  };

  // --- MAIN SUBMIT (Saves LR and Cash Memo, with correct date format) ---
  const handleSubmit = async () => {
    if (!validateLR()) {
      toast.error(errorMessages.requiredFields);
      return;
    }
    let lrId;
    const isDDTotalManual =
      !!lr.ddTotal && (!lr.ddRate || lr.ddRate === "0" || lr.ddRate === "");
    const lrPayload = {
      memo_id: selectedMemo.id,
      lr_no: lr.lrNo,
      lr_date: formatDateOnly(lr.lrDate), // <-- CRITICAL: MySQL expects YYYY-MM-DD!
      from_city: lr.from,
      to_city: lr.to,
      consignor: lr.consignor,
      consignee: lr.consignee,
      pkgs: parseInt(lr.pkgs, 10),
      content: lr.content,
      freight_type: lr.freightType,
      freight: parseOrZero(lr.freight),
      weight: parseOrZero(lr.weight),
      dd_rate: isDDTotalManual ? 0 : parseOrZero(lr.ddRate),
      dd_total: parseOrZero(lr.ddTotal),
      pm_no: lr.pmNo,
      refund: parseOrZero(lr.refund),
      remarks: lr.remarks,
      status: lr.status,
    };

    try {
      // Save or update LR first
      if (isEditing && selectedLr) {
        await api.put(
          `/lrs/${selectedLr.id}?year=${selectedYear}`,
          lrPayload
        );
        lrId = selectedLr.id;
      } else {
        const lrRes = await api.post(
          `/lrs?year=${selectedYear}`,
          { ...lrPayload, created_by: currentUser }
        );
        lrId = lrRes.data.id;
      }

      // If cash memo fields shown, save/update cash memo & print
      if (showCashMemoFields) {
        const { data: cms } = await api
          .get(`/cashmemos?lr_id=${lrId}&year=${selectedYear}`)
          .catch(() => ({ data: [] }));

        const cashMemoPayload = {
          lr_id: lrId,
          hamali: parseOrZero(lr.hamali),
          bc: parseOrZero(lr.bc),
          landing: parseOrZero(lr.landing),
          lc: parseOrZero(lr.lc),
          cash_memo_total: parseOrZero(lr.cashMemoTotal),
          created_by: currentUser,
          updated_by: currentUser,
        };

        let cashMemoObj = {};
        if (cms && cms.length > 0) {
          const updatedCashMemo = await api.put(
            `/cashmemos/${cms[0].id}?year=${selectedYear}`,
            cashMemoPayload
          );
          cashMemoObj = { ...cms[0], ...cashMemoPayload, ...updatedCashMemo.data };
        } else {
          const { data: newCashMemo } = await api.post(
            `/cashmemos?year=${selectedYear}`,
            cashMemoPayload
          );
          cashMemoObj = { ...cashMemoPayload, ...newCashMemo };
        }

        const { data: allCashMemos } = await api.get(`/cashmemos?year=${selectedYear}`);
        setCashMemos(allCashMemos);

        setPrintData({
          cashMemo: { ...cashMemoObj, cash_memo_no: cashMemoObj.cash_memo_no || "" },
          lr: { ...lrPayload },
          memo: selectedMemo,
          user: (currentUser && typeof currentUser === "object" && currentUser.username)
            ? currentUser.username
            : (typeof currentUser === "string" ? currentUser : "Unknown"),
        });

        toast.success(isEditing ? "Cash Memo updated & printing..." : "Cash Memo added & printing...");
      } else {
        toast.success(isEditing ? "L.R. updated!" : "L.R. saved!");
      }
      setTimeout(() => {
        lrNumberRef.current?.focus();
      }, 10);
      resetForm();
    } catch (err) {
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else if (err.code === "ERR_NETWORK") {
        toast.error(errorMessages.network);
      } else {
        toast.error(
          errorMessages.unexpected +
            (err.message ? " (" + err.message + ")" : "")
        );
      }
    }
  };

  const resetForm = () => {
    setLr({
      lrNo: "",
      lrDate: new Date(),
      from: "",
      to: "",
      consignor: "",
      consignee: "",
      pkgs: "",
      content: "",
      freightType: "Topay",
      freight: "",
      weight: "",
      ddRate: "",
      ddTotal: "0.00",
      pmNo: "",
      refund: "",
      remarks: "",
      status: "",
      hamali: "",
      bc: "5.00",
      landing: "",
      lc: "",
      cashMemoTotal: "0.00",
      cashMemoNo: "",
    });
    setIsEditing(false);
    setSelectedLr(null);
    setIsDdTotalManual(false);
    setShowCashMemoFields(false);
    setHasCashMemoInDb(false);
  };

  const handleFreightKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleAfterPrint = () => setPrintData(null);

  let showAddOrEditCashMemoButton = !showCashMemoFields && validateLR();

  const mainButtonLabel =
    showCashMemoFields
      ? isEditing
        ? "Update LR & Cash Memo"
        : "Submit LR & Cash Memo"
      : isEditing
        ? "Update LR"
        : "Submit LR";

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
      <Paper className="memo-glass-form" elevation={0} style={{ padding: 20, marginBottom: 20 }}>
        <Typography variant="subtitle1" className="memo-form-title" sx={{ mb: 2 }}>
          LR & Cash Memo Entry
        </Typography>
        <Grid container spacing={2} style={{ position: "relative" }}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              id="lr-number-field"
              inputRef={lrNumberRef}
              label="LR Number"
              value={lr.lrNo}
              onChange={(e) => setLr({ ...lr, lrNo: e.target.value })}
              onBlur={handleBlur}
              fullWidth
              required
              disabled={!selectedMemo}
              className="memo-glass-input"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="LR Date"
              value={lr.lrDate}
              onChange={d => setLr({ ...lr, lrDate: d })}
              slotProps={{
                textField: {
                  fullWidth: true,
                  className: "memo-glass-input",
                  disabled: !selectedMemo,
                }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SuggestInput
              label="From"
              type="cities"
              value={lr.from}
              onChange={val => setLr({ ...lr, from: val })}
              fullWidth
              required
              disabled={!selectedMemo}
              className="memo-glass-input"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SuggestInput
              label="To"
              type="cities"
              value={lr.to}
              onChange={val => setLr({ ...lr, to: val })}
              fullWidth
              required
              disabled={!selectedMemo}
              className="memo-glass-input"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SuggestInput
              label="Consignor"
              type="consignors"
              value={lr.consignor}
              onChange={val => setLr({ ...lr, consignor: val })}
              fullWidth
              required
              disabled={!selectedMemo}
              className="memo-glass-input"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SuggestInput
              label="Consignee"
              type="consignees"
              value={lr.consignee}
              onChange={val => setLr({ ...lr, consignee: val })}
              fullWidth
              required
              disabled={!selectedMemo}
              className="memo-glass-input"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Packages"
              type="number"
              value={lr.pkgs}
              onChange={e => setLr({ ...lr, pkgs: e.target.value })}
              fullWidth
              required
              disabled={!selectedMemo}
              className="memo-glass-input"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SuggestInput
              label="Content"
              type="contents"
              value={lr.content}
              onChange={val => setLr({ ...lr, content: val })}
              fullWidth
              disabled={!selectedMemo}
              className="memo-glass-input"
            />
          </Grid>
          <Grid item xs={12}>
            <Divider style={{ margin: "10px 0 16px 0" }} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth disabled={!selectedMemo} className="memo-glass-input">
              <InputLabel>Freight Type</InputLabel>
              <Select
                value={lr.freightType}
                label="Freight Type"
                onChange={e => setLr({ ...lr, freightType: e.target.value })}
                inputProps={{ tabIndex: 0, className: "memo-glass-input" }}
              >
                <MenuItem value="Topay">To Pay</MenuItem>
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="TBB">TBB</MenuItem>
                <MenuItem value="FOC">FOC</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Freight"
              type="number"
              value={lr.freight}
              onChange={e => setLr({ ...lr, freight: e.target.value })}
              fullWidth
              disabled={!selectedMemo}
              onKeyDown={handleFreightKeyDown}
              className="memo-glass-input"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Weight"
              type="number"
              value={lr.weight}
              onChange={e => setLr({ ...lr, weight: e.target.value })}
              fullWidth
              disabled={!selectedMemo}
              className="memo-glass-input"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="DD Rate"
              type="number"
              value={lr.ddRate}
              onChange={handleDdRateChange}
              fullWidth
              disabled={!selectedMemo}
              className="memo-glass-input"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="DD Total"
              type="number"
              value={lr.ddTotal}
              onChange={handleDdTotalChange}
              fullWidth
              disabled={!selectedMemo}
              className="memo-glass-input"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="P.M. No"
              value={lr.pmNo}
              onChange={e => setLr({ ...lr, pmNo: e.target.value })}
              fullWidth
              disabled={!selectedMemo}
              className="memo-glass-input"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Refund"
              type="number"
              value={lr.refund}
              onChange={e => setLr({ ...lr, refund: e.target.value })}
              fullWidth
              disabled={!selectedMemo}
              className="memo-glass-input"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Remarks"
              value={lr.remarks}
              onChange={e => setLr({ ...lr, remarks: e.target.value })}
              fullWidth
              disabled={!selectedMemo}
              className="memo-glass-input"
            />
          </Grid>
          {showCashMemoFields && (
            <>
              <Grid item xs={12}>
                <Divider style={{ margin: "16px 0 8px 0" }} />
                <Typography variant="subtitle2" style={{ color: "#2c537f" }}>
                  Cash Memo Details
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Hamali"
                  type="number"
                  value={lr.hamali}
                  onChange={e => setLr({ ...lr, hamali: e.target.value })}
                  fullWidth
                  disabled={!selectedMemo}
                  className="memo-glass-input"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="B.C."
                  type="number"
                  value={lr.bc}
                  onChange={e => setLr({ ...lr, bc: e.target.value })}
                  fullWidth
                  disabled={!selectedMemo}
                  className="memo-glass-input"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Landing"
                  type="number"
                  value={lr.landing}
                  onChange={e => setLr({ ...lr, landing: e.target.value })}
                  fullWidth
                  disabled={!selectedMemo}
                  className="memo-glass-input"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="L.C."
                  type="number"
                  value={lr.lc}
                  onChange={e => setLr({ ...lr, lc: e.target.value })}
                  fullWidth
                  disabled={!selectedMemo}
                  className="memo-glass-input"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Cash Memo Total"
                  type="number"
                  value={lr.cashMemoTotal}
                  InputProps={{ readOnly: true }}
                  fullWidth
                  className="memo-glass-input"
                />
              </Grid>
            </>
          )}
          <Grid container item xs={12} justifyContent="flex-end" spacing={2} style={{ marginTop: 24 }}>
            <Grid item>
              {showAddOrEditCashMemoButton && (
                <Button
                  className="memo-glass-btn"
                  variant="outlined"
                  color="secondary"
                  onClick={handleShowCashMemoFields}
                >
                  {hasCashMemoInDb ? "Edit Cash Memo" : "Add Cash Memo"}
                </Button>
              )}
            </Grid>
            <Grid item>
              <Button
                className="memo-glass-btn"
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={!validateLR()}
              >
                {mainButtonLabel}
              </Button>
            </Grid>
            <Grid item>
              <Button
                className="memo-glass-btn"
                variant="outlined"
                color="error"
                onClick={resetForm}
              >
                New LR
              </Button>
            </Grid>
          </Grid>
        </Grid>
        {printData && (
          <CashMemoPrint {...printData} onAfterPrint={handleAfterPrint} />
        )}
        <ConfirmDialog
          open={confirmOpen}
          title="Load LR?"
          content={
            lookupData
              ? `L.R. ${lookupData.lrNo} is Already Present. Load for editing?`
              : ""
          }
          onClose={handleConfirm}
        />
      </Paper>
    </LocalizationProvider>
  );
}
