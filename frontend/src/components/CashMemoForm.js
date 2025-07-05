import React, { useState, useEffect } from "react";
import api from "../api";
import {
  Box,
  Typography,
  Paper,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Button,
  List,
  ListItem,
  Divider,
} from "@mui/material";
import { toast } from "react-toastify";
import "./EntryGlass.css";

export default function CashMemoForm({ selectedYear }) {
  const [form, setForm] = useState({
    lr_id: "",
    hamali: "0",
    bc: "5.00",
    landing: "0",
    lc: "0",
    freight_type: "",
  });
  const [lrFreight, setLrFreight] = useState(""); // Holds freight from LR
  const [cashMemos, setCashMemos] = useState([]);
  const [lrs, setLrs] = useState([]);

  // Compute total using only Topay freight
  const total =
    (parseFloat(form.hamali) || 0) +
    (parseFloat(form.bc) || 0) +
    (parseFloat(form.landing) || 0) +
    (parseFloat(form.lc) || 0) +
    (form.freight_type === "Topay" ? (parseFloat(lrFreight) || 0) : 0);

  // Fetch LRs and CashMemos for the selected year
  useEffect(() => {
    if (!selectedYear) return;
    async function fetchData() {
      try {
        const lrRes = await api.get(`/lrs?year=${selectedYear}`);
        setLrs(lrRes.data);
        const cmRes = await api.get(`/cashmemos?year=${selectedYear}`);
        setCashMemos(cmRes.data);
      } catch (e) {
        toast.error("Failed to load data");
      }
    }
    fetchData();
    // Reset form on year change
    setForm({
      lr_id: "",
      hamali: "0",
      bc: "5.00",
      landing: "0",
      lc: "0",
      freight_type: "",
    });
    setLrFreight("");
  }, [selectedYear]);

  // When LR changes, set freight and freight_type from LR
  const handleLrChange = (e) => {
    const lr_id = e.target.value;
    setForm((f) => ({ ...f, lr_id }));
    const selectedLr = lrs.find((l) => String(l.id) === String(lr_id));
    setLrFreight(selectedLr ? selectedLr.freight : "");
    setForm((f) => ({
      ...f,
      freight_type: selectedLr ? selectedLr.freight_type : "",
    }));
  };

  // Handle other input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // On submit, always use LR's freight only for Topay
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/cashmemos?year=${selectedYear}`, {
        ...form,
        lr_id: parseInt(form.lr_id),
        hamali: parseFloat(form.hamali) || 0,
        bc: parseFloat(form.bc) || 0,
        landing: parseFloat(form.landing) || 0,
        lc: parseFloat(form.lc) || 0,
        freight: form.freight_type === "Topay" ? parseFloat(lrFreight) || 0 : 0,
        cash_memo_total: total,
      });
      // Reload list after save
      const cmRes = await api.get(`/cashmemos?year=${selectedYear}`);
      setCashMemos(cmRes.data);
      setForm({
        lr_id: "",
        hamali: "0",
        bc: "5.00",
        landing: "0",
        lc: "0",
        freight_type: "",
      });
      setLrFreight("");
      toast.success("Cash Memo saved!");
    } catch (err) {
      toast.error(
        err?.response?.data?.error || err?.response?.data?.message || "Failed to save cash memo"
      );
    }
  };

  return (
    <Box maxWidth={600} mx="auto" mt={4} mb={5}>
      <Paper className="entry-glass-card" elevation={0}>
        <Typography className="entry-section-title" sx={{ mb: 2 }}>
          Cash Memo Entry
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
            mb: 3,
          }}
        >
          <FormControl sx={{ minWidth: 160 }} required>
            <InputLabel>Select L.R.</InputLabel>
            <Select
              label="Select L.R."
              name="lr_id"
              value={form.lr_id}
              onChange={handleLrChange}
              required
            >
              <MenuItem value="">
                <em>--Choose L.R.--</em>
              </MenuItem>
              {lrs.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.lr_no}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Hamali"
            name="hamali"
            type="number"
            required
            value={form.hamali}
            onChange={handleChange}
            sx={{ minWidth: 120 }}
          />
          <TextField
            label="BC (Billty Charge)"
            name="bc"
            type="number"
            required
            value={form.bc}
            onChange={handleChange}
            sx={{ minWidth: 120 }}
          />
          <TextField
            label="Landing"
            name="landing"
            type="number"
            required
            value={form.landing}
            onChange={handleChange}
            sx={{ minWidth: 120 }}
          />
          <TextField
            label="LC (Loading Charge)"
            name="lc"
            type="number"
            required
            value={form.lc}
            onChange={handleChange}
            sx={{ minWidth: 120 }}
          />
          <TextField
            label="Freight"
            name="freight"
            type="number"
            value={lrFreight}
            InputProps={{ readOnly: true }}
            sx={{ minWidth: 120, bgcolor: "#f5f5f5" }}
          />
          <TextField
            label="Total"
            value={total.toFixed(2)}
            InputProps={{ readOnly: true }}
            sx={{ minWidth: 120 }}
          />
          <Button
            type="submit"
            variant="contained"
            className="accent-btn"
            sx={{ ml: 1, minWidth: 120, alignSelf: "flex-end" }}
            disabled={
              !form.lr_id ||
              form.hamali === "" ||
              form.bc === "" ||
              form.landing === "" ||
              form.lc === ""
            }
          >
            Save Cash Memo
          </Button>
        </Box>
      </Paper>

      <Paper className="entry-glass-card" elevation={0} sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Existing Cash Memos
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <List>
          {cashMemos.map((c) => {
            const total =
              (parseFloat(c.hamali) || 0) +
              (parseFloat(c.bc) || 0) +
              (parseFloat(c.landing) || 0) +
              (parseFloat(c.lc) || 0) +
              (c.freight_type === "Topay" ? (parseFloat(c.freight) || 0) : 0);
            return (
              <ListItem
                key={c.id}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  px: 0,
                }}
              >
                <span>
                  <b>L.R. {c.lr_no || c.lr_id}</b>
                </span>
                <span>
                  Total: <b>₹{total.toFixed(2)}</b>
                </span>
              </ListItem>
            );
          })}
        </List>
      </Paper>
    </Box>
  );
}
