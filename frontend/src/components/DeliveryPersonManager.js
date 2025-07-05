// src/components/DeliveryPersonManager.js
import React, { useEffect, useState } from "react";
import {
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Box, Typography, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Switch, Chip
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import api from "../api";
import { toast } from "react-toastify";

export default function DeliveryPersonManager() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);

  // --- Glassy card styles (matches the rest of app)
  const glassPaper = {
    background: "rgba(255,255,255,0.90)",
    borderRadius: "20px",
    boxShadow: "0 2px 18px 0 rgba(19,173,199,0.10)",
    border: "1.5px solid rgba(19,173,199,0.15)",
    backdropFilter: "blur(10px)",
    padding: "24px 18px 12px 18px",
    margin: "0 auto 32px auto",
    maxWidth: 700
  };
  const glassDialog = {
    background: "rgba(255,255,255,0.96)",
    borderRadius: 18,
    boxShadow: "0 2px 18px 0 rgba(19,173,199,0.13)",
    border: "1.5px solid rgba(19,173,199,0.14)",
    backdropFilter: "blur(13px)"
  };

  // Fetch list
  const fetchList = () => {
    api.get("/delivery-persons")
      .then(res => setList(res.data))
      .catch(() => toast.error("Failed to load delivery persons"));
  };
  useEffect(fetchList, []);

  // Open Add Dialog
  const handleAdd = () => {
    setEditing(null);
    setName("");
    setIsActive(true);
    setOpen(true);
  };

  // Open Edit Dialog
  const handleEdit = (row) => {
    setEditing(row);
    setName(row.name);
    setIsActive(Boolean(row.is_active));
    setOpen(true);
  };

  // Save/Add
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      if (editing) {
        await api.put(`/delivery-persons/${editing.id}`, { name: name.trim(), is_active: isActive ? 1 : 0 });
        toast.success("Updated!");
      } else {
        await api.post("/delivery-persons", { name: name.trim(), is_active: isActive ? 1 : 0 });
        toast.success("Added!");
      }
      setOpen(false);
      fetchList();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed");
    }
  };

  // Delete with confirmation
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this delivery person?")) return;
    try {
      await api.delete(`/delivery-persons/${id}`);
      toast.success("Deleted!");
      fetchList();
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  return (
    <Box p={{ xs: 1, sm: 2 }} sx={{ width: "100%", maxWidth: 850, mx: "auto" }}>
      <Typography variant="h6" gutterBottom sx={{
        fontWeight: 700,
        background: "linear-gradient(90deg, #13adc7 0%, #5efce8 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        color: "transparent",
      }}>
        Delivery Persons
      </Typography>
      <Paper sx={glassPaper}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1" fontWeight={500}>Manage delivery persons below.</Typography>
          <Button variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            sx={{
              background: "linear-gradient(90deg, #11998e 0%, #38ef7d 100%)",
              color: "#fff", fontWeight: 600,
              borderRadius: "14px", boxShadow: "0 2px 9px #13adc727"
            }}>
            Add
          </Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 110 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map(row => (
                <TableRow key={row.id}>
                  <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
                  <TableCell>
                    {row.is_active
                      ? <Chip label="Active" color="success" size="small" />
                      : <Chip label="Inactive" color="default" size="small" />}
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEdit(row)} size="small"><EditIcon color="primary" /></IconButton>
                    <IconButton onClick={() => handleDelete(row.id)} size="small" color="error"><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!list.length && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ color: "#b0bec5", fontStyle: "italic" }}>No delivery persons.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "18px",
            boxShadow: "0 4px 18px 0 rgba(19,173,199,0.13)",
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(9px)",
            px: 2,
            py: 1,
            mx: 'auto'
          }
        }}
      >
        <DialogTitle sx={{
          textAlign: "center",
          fontWeight: 700,
          letterSpacing: 0.3,
          color: "#029dbd"
        }}>
          {editing ? "Edit Delivery Person" : "Add Delivery Person"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <TextField
            label="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            fullWidth
            sx={{ mt: 1, minWidth: 280 }}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
          />
          <Box display="flex" alignItems="center" mt={2}>
            <Switch
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              inputProps={{ 'aria-label': 'Active switch' }}
            />
            <Typography sx={{ ml: 1 }}>{isActive ? "Active" : "Inactive"}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{
          display: "flex",
          justifyContent: "center",
          gap: 2,
          pb: 2
        }}>
          <Button
            onClick={() => setOpen(false)}
            color="secondary"
            variant="outlined"
            sx={{
              borderRadius: "8px",
              fontWeight: 500,
              borderColor: "#a96fd6",
              color: "#a96fd6",
              textTransform: "none"
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              background: "linear-gradient(90deg,#13adc7 0%,#5efce8 100%)",
              color: "#fff",
              fontWeight: 600,
              borderRadius: "8px",
              boxShadow: "0 2px 12px 0 rgba(19,173,199,0.14)"
            }}
          >
            {editing ? "Save" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
