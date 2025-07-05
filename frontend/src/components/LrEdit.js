import React, { useEffect, useState, useRef } from "react";
import {
  Paper,
  Grid,
  TextField,
  Button,
  Typography,
  MenuItem,
  Divider,
  Box
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { toast } from "react-toastify";
import SuggestInput from "./SuggestInput";
import { mapLrFields } from '../utils/mapLrFields';
import "./EntryGlass.css";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enIN } from "date-fns/locale";
import CashMemoPrint from "./CashMemoPrint";

const freightTypes = ["Topay", "Paid", "TBB", "FOC"];

// ---- DATE FORMATTER (YYYY-MM-DD) ----
function formatDateOnly(d) {
  if (!d) return null;
  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString().slice(0, 10);
}

export default function LrEdit({ selectedYear }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const memoId = searchParams.get("memo");
  const navigate = useNavigate();

  const [lr, setLr] = useState(null);
  const [originalLr, setOriginalLr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ddTotalManuallyEdited, setDdTotalManuallyEdited] = useState(false);

  const [cashMemo, setCashMemo] = useState(null);
  const [originalCashMemo, setOriginalCashMemo] = useState(null);
  const [cashMemoLoading, setCashMemoLoading] = useState(true);

  const [cmFields, setCmFields] = useState({
    hamali: "",
    bc: "5.00",
    landing: "",
    lc: "",
  });

  const [saveCmLoading, setSaveCmLoading] = useState(false);

  const lrNoRef = useRef();

  const [isEditingLrSection, setIsEditingLrSection] = useState(false);
  const [isEditingCashMemoSection, setIsEditingCashMemoSection] = useState(false);

  // Key state to force remount for print
  const [printData, setPrintData] = useState(null);
  const [printKey, setPrintKey] = useState(0);

  // ---- Fetch LR ----
  useEffect(() => {
    if (!id || !selectedYear) return;
    setLoading(true);
    api.get(`/lrs/${id}?year=${selectedYear}`)
      .then((res) => {
        const mapped = mapLrFields(res.data);
        const initialLr = {
          ...mapped,
          lrDate: mapped.lrDate ? new Date(mapped.lrDate) : new Date(),
          memoId: memoId || res.data.memo_id || "",
        };
        setLr(initialLr);
        setOriginalLr(initialLr); // store a copy
        setDdTotalManuallyEdited(false);
      })
      .catch(() => {
        toast.error("Failed to load LR details");
      })
      .finally(() => setLoading(false));
  }, [id, selectedYear, memoId]);

  // ---- Fetch CashMemo ----
  useEffect(() => {
    if (!id || !selectedYear) return;
    setCashMemoLoading(true);
    api.get(`/cashmemos?year=${selectedYear}&lr_id=${id}`)
      .then(res => {
        const cm = res.data && res.data.length > 0 ? res.data[0] : null;
        setCashMemo(cm);
        setOriginalCashMemo(cm); // store a copy
        if (cm) {
          setCmFields({
            hamali: cm.hamali || "",
            bc: cm.bc || "5.00",
            landing: cm.landing || "",
            lc: cm.lc || "",
          });
        } else {
          setCmFields({
            hamali: "",
            bc: "5.00",
            landing: "",
            lc: "",
          });
        }
      })
      .catch(() => {
        setCashMemo(null);
        setOriginalCashMemo(null);
        setCmFields({
          hamali: "",
          bc: "5.00",
          landing: "",
          lc: "",
        });
      })
      .finally(() => setCashMemoLoading(false));
  }, [id, selectedYear]);

  // ---- Handlers ----
  const handleSave = async () => {
    if (!lr.lrNo || !lr.lrDate || !lr.from || !lr.to) {
      toast.error("Fill all required fields.");
      return;
    }
    let finalDdTotal = lr.ddTotal;
    if (!ddTotalManuallyEdited && (lr.ddRate || lr.pkgs)) {
      const ddRate = parseFloat(lr.ddRate) || 0;
      const pkgs = parseFloat(lr.pkgs) || 0;
      finalDdTotal = (ddRate * pkgs).toFixed(2);
    }
    try {
      await api.put(
        `/lrs/${id}?year=${selectedYear}`,
        {
          lr_no: lr.lrNo,
          lr_date: formatDateOnly(lr.lrDate), // <<-- KEY LINE: Send YYYY-MM-DD
          from_city: lr.from,
          to_city: lr.to,
          consignor: lr.consignor,
          consignee: lr.consignee,
          pkgs: lr.pkgs === "" ? 0 : parseInt(lr.pkgs, 10) || 0,
          content: lr.content,
          freight_type: lr.freightType,
          freight: lr.freight === "" ? 0 : parseFloat(lr.freight) || 0,
          weight: lr.weight === "" ? 0 : parseFloat(lr.weight) || 0,
          dd_rate: lr.ddRate === "" ? 0 : parseFloat(lr.ddRate) || 0,
          dd_total: finalDdTotal === "" ? 0 : parseFloat(finalDdTotal) || 0,
          pm_no: lr.pmNo,
          refund: lr.refund === "" ? 0 : parseFloat(lr.refund) || 0,
          remarks: lr.remarks,
          status: lr.status,
          memo_id: lr.memoId || memoId,
        }
      );
      toast.success("L.R. updated.");
      setIsEditingLrSection(false);
      setOriginalLr({ ...lr }); // Update original with saved version
    } catch (e) {
      toast.error(
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        "Failed to update L.R."
      );
    }
  };

  const handleCmField = (field, value) => setCmFields(f => ({ ...f, [field]: value }));

  const handleSaveCashMemo = async () => {
    setSaveCmLoading(true);
    try {
      let res;
      if (cashMemo) {
        await api.put(
          `/cashmemos/${cashMemo.id}?year=${selectedYear}`,
          { ...cmFields }
        );
        toast.success("Cash Memo updated.");
      } else {
        await api.post(
          `/cashmemos?year=${selectedYear}`,
          { ...cmFields, lr_id: id }
        );
        toast.success("Cash Memo created.");
      }
      // Refresh cash memo state after change
      res = await api.get(`/cashmemos?year=${selectedYear}&lr_id=${id}`);
      const cm = res.data && res.data.length > 0 ? res.data[0] : null;
      setCashMemo(cm);
      setOriginalCashMemo(cm); // Update original with saved version
      if (cm) {
        setCmFields({
          hamali: cm.hamali || "",
          bc: cm.bc || "5.00",
          landing: cm.landing || "",
          lc: cm.lc || "",
        });
      }

      // Print logic: Use latest LR/cash memo
      let userObj = null;
      try { userObj = JSON.parse(localStorage.getItem("ntc-user")); } catch {}
      let username = "Unknown";
      if (userObj && userObj.username) username = userObj.username;
      let latestLr = lr;
      try {
        const res = await api.get(`/lrs/${id}?year=${selectedYear}`);
        latestLr = { ...latestLr, ...mapLrFields(res.data) };
      } catch {}
      // --- START PRINT CODE HERE ---
      doPrintCashMemo({ cm, latestLr, username });
      // --- END PRINT CODE ---
      setIsEditingCashMemoSection(false);
    } catch (e) {
      toast.error(
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        "Failed to save cash memo."
      );
    }
    setSaveCmLoading(false);
  };

  // Cancel handlers (revert to originals)
  const handleCancelLr = () => {
    setLr(originalLr ? { ...originalLr } : lr);
    setIsEditingLrSection(false);
  };

  const handleCancelCashMemo = () => {
    if (originalCashMemo) {
      setCmFields({
        hamali: originalCashMemo.hamali || "",
        bc: originalCashMemo.bc || "5.00",
        landing: originalCashMemo.landing || "",
        lc: originalCashMemo.lc || "",
      });
    } else {
      setCmFields({
        hamali: "",
        bc: "5.00",
        landing: "",
        lc: "",
      });
    }
    setIsEditingCashMemoSection(false);
  };

  // Custom handlers for pkgs/dd_rate/dd_total
  const handlePkgsChange = (value) => {
    setLr(lr => {
      let ddTotal = lr.ddTotal;
      if (!ddTotalManuallyEdited) {
        const pkgs = parseFloat(value) || 0;
        const ddRate = parseFloat(lr.ddRate) || 0;
        ddTotal = (ddRate * pkgs).toFixed(2);
      }
      return { ...lr, pkgs: value, ddTotal };
    });
  };
  const handleDdRateChange = (value) => {
    setLr(lr => {
      let ddTotal = lr.ddTotal;
      if (!ddTotalManuallyEdited) {
        const pkgs = parseFloat(lr.pkgs) || 0;
        const ddRate = parseFloat(value) || 0;
        ddTotal = (ddRate * pkgs).toFixed(2);
      }
      return { ...lr, ddRate: value, ddTotal };
    });
  };
  const handleDdTotalChange = (value) => {
    setDdTotalManuallyEdited(true);
    setLr(lr => ({ ...lr, ddTotal: value }));
  };

  useEffect(() => {
    setDdTotalManuallyEdited(false);
  }, [id]);

  const handleField = (field, value) => setLr(lr => ({ ...lr, [field]: value }));

  if (loading || !lr)
    return (
      <Box p={3}>
        <Typography>Loading...</Typography>
      </Box>
    );

  // Cash Memo Total (Freight only if Topay)
  const cashMemoTotal = (
    (parseFloat(cmFields.hamali) || 0) +
    (parseFloat(cmFields.bc) || 0) +
    (parseFloat(cmFields.landing) || 0) +
    (parseFloat(cmFields.lc) || 0) +
    ((lr.freightType === "Topay") ? (parseFloat(lr.freight) || 0) : 0)
  ).toFixed(2);

  function doPrintCashMemo({ cm, latestLr, username }) {
    const today = new Date().toLocaleDateString();
    const qrValue = latestLr?.lr_no || latestLr?.lrNo || "";
    import("qrcode").then(QRCode => {
      QRCode.toDataURL(qrValue, { width: 128 }, (err, url) => {
        if (err) {
          alert("QR code generation failed!");
          return;
        }
        const safe = (val) => (val == null ? "" : val);

        const trueTotal = (
          (parseFloat(cm.hamali) || 0) +
          (parseFloat(cm.bc) || 0) +
          (parseFloat(cm.landing) || 0) +
          (parseFloat(cm.lc) || 0) +
          ((latestLr.freight_type === "Topay" || latestLr.freightType === "Topay")
            ? (parseFloat(latestLr.freight) || 0) : 0)
        ).toFixed(2);

        const htmlString = `
          <div style="display:flex;flex-direction:row;gap:32px;padding:32px;background:white;">
            ${[1, 2].map(
              () => `
                <div style="border:1px dashed #888;padding:16px;width:340px;box-sizing:border-box;">
                  <div style="font-size:18px;margin-bottom:12px;">Cash Memo No: <b>${safe(cm.cash_memo_no)}</b></div>
                  <div style="font-size:14px;margin-bottom:6px;">Date: ${today}</div>
                  <div style="font-size:16px;"><b>LR No:</b> ${safe(latestLr.lr_no || latestLr.lrNo)}</div>
                  <div><b>Pkgs:</b> ${safe(latestLr.pkgs)}</div>
                  <div><b>PM No:</b> ${safe(latestLr.pm_no || latestLr.pmNo)}</div>
                  <div><b>Truck No:</b> ${safe(latestLr.truck_no || latestLr.truckNo)}</div>
                  <div><b>Consignee:</b> ${safe(latestLr.consignee)}</div>
                  <div><b>Consignor:</b> ${safe(latestLr.consignor)}</div>
                  <div><b>Freight:</b> ${
                    (latestLr.freight_type === "Topay" || latestLr.freightType === "Topay")
                      ? "₹" + safe(latestLr.freight)
                      : safe(latestLr.freight_type || latestLr.freightType)
                  }</div>
                  <div><b>Hamali:</b> ${safe(cm.hamali)}</div>
                  <div><b>BC:</b> ${safe(cm.bc)}</div>
                  <div><b>Landing:</b> ${safe(cm.landing)}</div>
                  <div><b>LC:</b> ${safe(cm.lc)}</div>
                  <div><b>Total:</b> ₹${trueTotal}</div>
                  <div><b>User:</b> ${safe(username)}</div>
                  <div style="margin-top:12px;text-align:center;">
                    <img src="${url}" alt="QR Code" style="width:64px;height:64px;" />
                  </div>
                </div>
              `
            ).join("")}
          </div>
        `;
        const printWindow = window.open("", "_blank", `width=800,height=600,left=200,top=100,popup_${Date.now()}`);
        if (!printWindow) {
          alert("Pop-up was blocked. Please allow pop-ups for printing.");
          return;
        }
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Content</title>
            </head>
            <body>
              ${htmlString}
            </body>
          </html>
        `);
        printWindow.document.close();

        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        };
      });
    });
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enIN}>
      <div className="entry-glass-card">
        <Button
          startIcon={<span style={{
            display: "inline-block",
            transform: "translateY(1px) scaleX(-1)"
          }}>←</span>}
          onClick={() => navigate(-1)}
          sx={{
            mb: 3,
            fontWeight: 700,
            borderRadius: "20px",
            background: "linear-gradient(90deg, #13adc7 0%, #5efce8 100%)",
            color: "#fff",
            px: 3,
            py: 1,
            boxShadow: "0 2px 8px 0 rgba(19,173,199,0.11)",
            textTransform: "none",
            "&:hover": {
              background: "linear-gradient(90deg, #11998e 0%, #38ef7d 100%)",
              color: "#fff"
            }
          }}
        >
          Back to Memo
        </Button>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 4 },
            background: "transparent",
            boxShadow: "none"
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontWeight: 700,
              mb: 2,
              background: "linear-gradient(90deg, #13adc7 0%, #5efce8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              color: "transparent"
            }}
          >
            Edit Lorry Receipt (L.R.)
          </Typography>
          <Grid container spacing={2}>
            {/* All LR fields as before */}
            <Grid item xs={12} sm={4} md={2}>
              <TextField
                inputRef={lrNoRef}
                label="LR No"
                value={lr.lrNo}
                onChange={e => handleField("lrNo", e.target.value)}
                fullWidth
                required
                disabled={!isEditingLrSection}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <DatePicker
                label="Date"
                value={lr.lrDate}
                onChange={d => handleField("lrDate", d)}
                slotProps={{
                  textField: { fullWidth: true, required: true, disabled: !isEditingLrSection }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <SuggestInput
                label="From"
                type="cities"
                value={lr.from || ""}
                onChange={v => handleField("from", v)}
                required
                fullWidth
                disabled={!isEditingLrSection}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <SuggestInput
                label="To"
                type="cities"
                value={lr.to || ""}
                onChange={v => handleField("to", v)}
                required
                fullWidth
                disabled={!isEditingLrSection}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <SuggestInput
                label="Consignor"
                type="consignors"
                value={lr.consignor || ""}
                onChange={v => handleField("consignor", v)}
                required
                fullWidth
                disabled={!isEditingLrSection}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <SuggestInput
                label="Consignee"
                type="consignees"
                value={lr.consignee || ""}
                onChange={v => handleField("consignee", v)}
                required
                fullWidth
                disabled={!isEditingLrSection}
              />
            </Grid>
            <Grid item xs={12} sm={3} md={1}>
              <TextField
                label="Pkgs"
                value={lr.pkgs}
                onChange={e => handlePkgsChange(e.target.value)}
                type="number"
                fullWidth
                disabled={!isEditingLrSection}
              />
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
              <SuggestInput
                label="Content"
                type="contents"
                value={lr.content || ""}
                onChange={v => handleField("content", v)}
                required
                fullWidth
                disabled={!isEditingLrSection}
              />
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
              <TextField
                label="Freight"
                type="number"
                value={lr.freight}
                onChange={e => handleField("freight", e.target.value)}
                fullWidth
                disabled={!isEditingLrSection}
              />
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
              <TextField
                label="Freight Type"
                select
                value={lr.freightType || "Topay"}
                onChange={e => handleField("freightType", e.target.value)}
                fullWidth
                disabled={!isEditingLrSection}
              >
                {freightTypes.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3} md={1}>
              <TextField
                label="Weight"
                value={lr.weight}
                onChange={e => handleField("weight", e.target.value)}
                type="number"
                fullWidth
                disabled={!isEditingLrSection}
              />
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
              <TextField
                label="DD Rate"
                value={lr.ddRate}
                onChange={e => handleDdRateChange(e.target.value)}
                type="number"
                fullWidth
                disabled={!isEditingLrSection}
              />
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
              <TextField
                label="DD Total"
                value={lr.ddTotal}
                onChange={e => handleDdTotalChange(e.target.value)}
                type="number"
                fullWidth
                disabled={!isEditingLrSection}
              />
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
              <TextField
                label="PM No"
                value={lr.pmNo}
                onChange={e => handleField("pmNo", e.target.value)}
                fullWidth
                disabled={!isEditingLrSection}
              />
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
              <TextField
                label="Refund"
                value={lr.refund}
                onChange={e => handleField("refund", e.target.value)}
                fullWidth
                disabled={!isEditingLrSection}
              />
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
              <TextField
                label="Remarks"
                value={lr.remarks}
                onChange={e => handleField("remarks", e.target.value)}
                fullWidth
                disabled={!isEditingLrSection}
              />
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Box display="flex" gap={2} mb={2}>
            {!isEditingLrSection && (
              <Button
                variant="outlined"
                color="primary"
                sx={{ mr: 2 }}
                onClick={() => {
                  setIsEditingLrSection(true);
                  setIsEditingCashMemoSection(false);
                }}
                disabled={isEditingCashMemoSection}
              >
                Edit LR
              </Button>
            )}
            {isEditingLrSection && (
              <>
                <Button
                  variant="contained"
                  sx={{
                    background: "linear-gradient(90deg,#13adc7 0%,#5efce8 100%)",
                    color: "#fff",
                    fontWeight: 600,
                    borderRadius: "8px",
                    boxShadow: "0 2px 12px 0 rgba(19,173,199,0.13)"
                  }}
                  onClick={handleSave}
                >
                  Save LR
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleCancelLr}
                >
                  Cancel
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              color="secondary"
              sx={{
                borderRadius: "8px",
                fontWeight: 500,
                borderColor: "#a96fd6",
                color: "#a96fd6",
                textTransform: "none"
              }}
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          </Box>
          {/* Cash Memo Section */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Cash Memo Details
          </Typography>
          {cashMemoLoading ? (
            <Typography>Loading cash memo...</Typography>
          ) : (
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={2}>
                <TextField
                  label="Hamali"
                  type="number"
                  value={cmFields.hamali}
                  onChange={e => handleCmField("hamali", e.target.value)}
                  fullWidth
                  disabled={!isEditingCashMemoSection}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  label="B.C."
                  type="number"
                  value={cmFields.bc}
                  onChange={e => handleCmField("bc", e.target.value)}
                  fullWidth
                  disabled={!isEditingCashMemoSection}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  label="Landing"
                  type="number"
                  value={cmFields.landing}
                  onChange={e => handleCmField("landing", e.target.value)}
                  fullWidth
                  disabled={!isEditingCashMemoSection}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  label="L.C."
                  type="number"
                  value={cmFields.lc}
                  onChange={e => handleCmField("lc", e.target.value)}
                  fullWidth
                  disabled={!isEditingCashMemoSection}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  label="Total"
                  type="number"
                  value={cashMemoTotal}
                  InputProps={{ readOnly: true }}
                  fullWidth
                  helperText="Auto calculated"
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={2} display="flex" alignItems="center">
                {!isEditingCashMemoSection && (
                  <Button
                    variant="outlined"
                    color="primary"
                    sx={{ mt: 1 }}
                    onClick={() => {
                      setIsEditingCashMemoSection(true);
                      setIsEditingLrSection(false);
                    }}
                    disabled={isEditingLrSection}
                  >
                    Edit Cash Memo
                  </Button>
                )}
                {isEditingCashMemoSection && (
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={async () => {
                        if (!saveCmLoading) await handleSaveCashMemo();
                      }}
                      sx={{ mr: 2, mt: 1 }}
                      disabled={saveCmLoading}
                    >
                      Save Cash Memo
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={handleCancelCashMemo}
                      sx={{ mt: 1 }}
                      disabled={saveCmLoading}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </Grid>
            </Grid>
          )}
          {/* Print pop-up only when needed */}
          {printData && (
            <CashMemoPrint key={printKey} {...printData} onAfterPrint={() => setPrintData(null)} />
          )}

        </Paper>
      </div>
    </LocalizationProvider>
  );
}
