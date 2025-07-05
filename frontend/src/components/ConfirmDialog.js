// src/components/ConfirmDialog.js
import React, { useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Paper,
  useTheme,
} from "@mui/material";

export default function ConfirmDialog({
  open,
  title,
  content,
  onClose,
  okText = "OK",
  cancelText = "Cancel",
  disableButtons = false,
}) {
  const okRef = useRef();
  const cancelRef = useRef();
  const theme = useTheme();

  // Focus OK button by default
  useEffect(() => {
    if (open && okRef.current) okRef.current.focus();
  }, [open]);

  // Handle keyboard: Enter/Escape/Tab
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (document.activeElement === cancelRef.current) {
        onClose(false);
      } else {
        onClose(true);
      }
    } else if (e.key === "Escape") {
      onClose(false);
    } else if (e.key === "Tab") {
      // Move focus between OK and Cancel
      if (document.activeElement === okRef.current && !e.shiftKey) {
        e.preventDefault();
        cancelRef.current?.focus();
      } else if (document.activeElement === cancelRef.current && e.shiftKey) {
        e.preventDefault();
        okRef.current?.focus();
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      onKeyDown={handleKeyDown}
      maxWidth="xs"
      fullWidth
      PaperProps={{ className: "glass-card", elevation: 0 }}
    >
      <DialogTitle>
        <span
          style={{
            fontWeight: 700,
            background: "linear-gradient(90deg,#13adc7,#38ef7d)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            color: "transparent",
            fontSize: "1.12rem",
          }}
        >
          {title}
        </span>
      </DialogTitle>
      <DialogContent>
        <Typography>{content}</Typography>
      </DialogContent>
      <DialogActions>
        <Button
          ref={cancelRef}
          onClick={() => onClose(false)}
          disabled={disableButtons}
          color="inherit"
          sx={{ fontWeight: 600 }}
        >
          {cancelText}
        </Button>
        <Button
          variant="contained"
          ref={okRef}
          onClick={() => onClose(true)}
          className="accent-btn"
          disabled={disableButtons}
        >
          {okText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
