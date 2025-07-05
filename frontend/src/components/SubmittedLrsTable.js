import React, { useState } from 'react';
import DeleteKeyDialog from "./DeleteKeyDialog";
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableFooter, Paper, IconButton, Typography, Tooltip
} from '@mui/material';
import './SubmittedLrsTable.css';
import { formatDateIndian } from '../utils/formatDate';

export default function SubmittedLrsTable({ submittedLrs, onDelete, currentUser }) {
  const [deleteKeyOpen, setDeleteKeyOpen] = useState(false);
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = idx => {
    if (deleting) return;
    setPendingDeleteIdx(idx);
    setDeleteKeyOpen(true);
  };

  const handleDeleteKeySuccess = async () => {
    const idx = pendingDeleteIdx;
    setPendingDeleteIdx(null);
    setDeleteKeyOpen(false);
    if (idx !== null && !deleting) {
      setDeleting(true);
      try {
        await onDelete(idx);
      } finally {
        setDeleting(false);
      }
    }
  };

  // Calculate all totals
  const totalLrs = submittedLrs.length;
  const totalPkgs = submittedLrs.reduce((sum, r) => sum + (parseInt(r.pkgs) || 0), 0);

  let totalTopay = 0, totalPaid = 0;
  submittedLrs.forEach(r => {
    const val = parseFloat(r.freight) || 0;
    if (r.freightType === "Topay") totalTopay += val;
    if (r.freightType === "Paid") totalPaid += val;
  });

  const totalRefund = submittedLrs.reduce((sum, r) => sum + (parseFloat(r.refund) || 0), 0);
  const totalDd = submittedLrs.reduce((sum, r) => sum + (parseFloat(r.ddTotal) || 0), 0);
  const grandTotal = submittedLrs.reduce((sum, r) => {
    const t =
      (parseFloat(r.hamali) || 0) +
      (parseFloat(r.bc) || 0) +
      (parseFloat(r.landing) || 0) +
      (parseFloat(r.lc) || 0) +
      (r.freightType === "Topay" ? parseFloat(r.freight) || 0 : 0);
    return sum + t;
  }, 0);

  return (
    <Paper elevation={3} style={{ padding: 20 }}>
      <Typography variant="subtitle1" className="memo-form-title" sx={{ mb: 2 }}>
        Submitted LRs
      </Typography>
      <TableContainer>
        <Table className="glass-table">
          <TableHead>
            <TableRow>
              <TableCell>LR No</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>From</TableCell>
              <TableCell>Consignor</TableCell>
              <TableCell>Consignee</TableCell>
              <TableCell>Pkgs</TableCell>
              <TableCell>Freight Type</TableCell>
              <TableCell>Freight</TableCell>
              <TableCell>Refund</TableCell>
              <TableCell>DD Rate</TableCell>
              <TableCell>DD Total</TableCell>
              <TableCell>Cash Memo No</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submittedLrs.map((row, idx) => (
              <TableRow key={row.id || idx}>
                <TableCell>{row.lrNo || ""}</TableCell>
                <TableCell>{row.lrDate ? formatDateIndian(row.lrDate) : ""}</TableCell>
                <TableCell>{row.from || ""}</TableCell>
                <TableCell>{row.consignor || ""}</TableCell>
                <TableCell>{row.consignee || ""}</TableCell>
                <TableCell>{row.pkgs || ""}</TableCell>
                <TableCell>{row.freightType || ""}</TableCell>
                <TableCell>{row.freight || ""}</TableCell>
                <TableCell>{row.refund || ""}</TableCell>
                <TableCell>{row.ddRate || ""}</TableCell>
                <TableCell>{row.ddTotal || ""}</TableCell>
                <TableCell>{row.cashMemoNo || ""}</TableCell>
                <TableCell>
                  ₹{
                    (
                      (parseFloat(row.hamali) || 0) +
                      (parseFloat(row.bc) || 0) +
                      (parseFloat(row.landing) || 0) +
                      (parseFloat(row.lc) || 0) +
                      (row.freightType === "Topay" ? parseFloat(row.freight) || 0 : 0)
                    ).toFixed(2)
                  }
                </TableCell>
                <TableCell>
                  <Tooltip title="Delete">
                    <span>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(idx)}
                        disabled={deleting}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className='totals-row'>
              <TableCell sx={{ fontWeight: 600 }}>
                {totalLrs > 0 ? `Total: ${totalLrs}` : ""}
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell sx={{ fontWeight: 600 }}>
                {totalPkgs > 0 ? totalPkgs : ""}
              </TableCell>
              <TableCell />
              <TableCell sx={{ fontWeight: 600 }}>
                {totalTopay > 0 ? `TOPAY: ₹${totalTopay.toFixed(2)}` : ""}
                {totalPaid > 0 ? <><br /><br />PAID: ₹{totalPaid.toFixed(2)}</> : ""}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                {totalRefund > 0 ? `₹${totalRefund.toFixed(2)}` : ""}
              </TableCell>
              <TableCell />
              <TableCell sx={{ fontWeight: 600 }}>
                {totalDd > 0 ? `₹${totalDd.toFixed(2)}` : ""}
              </TableCell>
              <TableCell />
              <TableCell sx={{ fontWeight: 700 }}>
                ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
      <DeleteKeyDialog
        open={deleteKeyOpen}
        onClose={() => { setDeleteKeyOpen(false); setPendingDeleteIdx(null); }}
        onSuccess={handleDeleteKeySuccess}
        currentUser={currentUser || ""}
      />
    </Paper>
  );
}
