import React, { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography } from "@mui/material";
import api from "../api";

export default function DeleteKeyDialog({ open, onClose, onSuccess, currentUser }) {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState({ usage_left: "-", usage_limit: "-" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      api.get("/app-key/status", { params: { key_type: "delete" } })
        .then(res => setStatus(res.data))
        .catch(() => setStatus({ usage_left: "-", usage_limit: "-" }));
      setKey("");
      setError("");
    }
  }, [open]);

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/app-key/validate", {
        key_type: "delete",
        key,
        user: currentUser || "",
      });
      if (res.data.valid) {
        onSuccess(); // Perform delete action in parent component!
        onClose();
      } else {
        setError("Unknown error.");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Invalid or expired key");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Enter Delete Key</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 1 }}>This action requires the delete key.</Typography>
        <TextField
          label="Delete Key"
          type="password"
          fullWidth
          value={key}
          onChange={e => setKey(e.target.value)}
          autoFocus
          onKeyDown={e => e.key === "Enter" && handleConfirm()}
          sx={{ mb: 2 }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Uses left: <b>{status.usage_left}</b> of <b>{status.usage_limit}</b>
        </Typography>
        {error && (
          <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={loading || !key}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
