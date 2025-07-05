import React, { useState, useEffect } from "react";
import api from "../../api";
import { Paper, Typography, TextField, Button, Grid } from "@mui/material";
import { toast } from "react-toastify";

export default function DeleteKeySettings({ currentUser }) {
  const [key, setKey] = useState("");
  const [usageLimit, setUsageLimit] = useState(10);
  const [loading, setLoading] = useState(false);

  // Optional: Could add status fetching for current limit
  useEffect(() => {
    api.get("/app-key/status", { params: { key_type: "delete" } })
      .then(res => {
        if (res.data.usage_limit > 0) setUsageLimit(res.data.usage_limit);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!key || !usageLimit) {
      toast.error("Enter key and usage limit");
      return;
    }
    setLoading(true);
    try {
      await api.post("/admin/app-key", {
        key_type: "delete",
        key,
        usage_limit: usageLimit,
        // current user is auto-set by backend if you pass user auth!
      });
      toast.success("Delete key set/updated!");
      setKey("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to set key");
    }
    setLoading(false);
  };

  return (
    <Paper sx={{ p: 3, mt: 3, maxWidth: 480 }}>
      <Typography variant="h6" gutterBottom>Set Delete Key (Admin Only)</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Delete Key (Password)"
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Usage Limit"
            type="number"
            value={usageLimit}
            onChange={e => setUsageLimit(e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
          >
            Set/Update Key
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
}
