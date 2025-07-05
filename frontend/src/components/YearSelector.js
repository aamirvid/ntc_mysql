// src/components/YearSelector.js
import React, { useEffect, useState } from 'react';
import { Select, MenuItem, FormControl, InputLabel, Box, IconButton, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import api from '../api';
import AddIcon from '@mui/icons-material/Add';
import { toast } from 'react-toastify';
import { getUserRole } from "../auth";


function getIndianFY() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 4 ? y : y - 1;
}

export default function YearSelector({ selectedYear, setSelectedYear, onYearChange }) {
  const [years, setYears] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newYear, setNewYear] = useState('');
  const role = getUserRole();
  const loadYears = async () => {
    const res = await api.get('/years');
    setYears(res.data);
    // Initial selection
    if (!selectedYear && res.data.length) {
      const fy = String(getIndianFY());
      setSelectedYear(res.data.includes(fy) ? fy : res.data[0]);
      if (onYearChange) onYearChange(res.data.includes(fy) ? fy : res.data[0]);
    }
  };

  useEffect(() => { loadYears(); /* eslint-disable-next-line */ }, []);

  // Add new year
  const handleAdd = async () => {
    if (!/^\d{4}$/.test(newYear)) {
      toast.error('Enter valid year');
      return;
    }
    await api.post('/year-admin/add', { year: newYear });
    setAddOpen(false);
    setNewYear('');
    await loadYears();
    setSelectedYear(newYear);
    if (onYearChange) onYearChange(newYear);
    toast.success(`Year ${newYear}-${+newYear + 1} added and selected`);
  };

  // Year change handler
  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
    if (onYearChange) onYearChange(e.target.value, true); // Pass flag that this is user-triggered
    toast.info(`Year switched to ${e.target.value}-${+e.target.value + 1}.`);
  };


  return (
    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 120, ml: 2 }}>
      <FormControl size="small" style={{ minWidth: 110 }}>
        <InputLabel>Year</InputLabel>
        <Select
          value={selectedYear || ''}
          label="Year"
          onChange={handleYearChange}
        >
          {years.map(y => (
            <MenuItem key={y} value={y}>
              {y}-{parseInt(y, 10) + 1}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {role === "admin" && (
        <IconButton color="primary" onClick={() => setAddOpen(true)} title="Add Year">
          <AddIcon />
        </IconButton>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)}>
        <DialogTitle>Add New Year</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Year (YYYY)"
            value={newYear}
            onChange={e => setNewYear(e.target.value.replace(/\D/g, ''))}
            fullWidth
            inputProps={{ maxLength: 4 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
