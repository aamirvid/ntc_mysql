// backend/routes/deliveryPersons.js
const express = require("express");
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const mysql = require('mysql2/promise');
require('dotenv').config();

const router = express.Router();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'ntcuser',
  password: process.env.MYSQL_PASSWORD || 'yourpassword',
  database: process.env.MYSQL_DATABASE || 'ntc_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// GET all
router.get("/", authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, is_active, created_at FROM delivery_persons ORDER BY name ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new
router.post("/", authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const { name, is_active = 1 } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ error: "Name required" });
  try {
    const [result] = await pool.query(
      `INSERT INTO delivery_persons (name, is_active) VALUES (?, ?)`,
      [name.trim(), is_active ? 1 : 0]
    );
    const [rows] = await pool.query(
      `SELECT id, name, is_active, created_at FROM delivery_persons WHERE id = ?`,
      [result.insertId]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.message && err.message.includes("Duplicate")) {
      return res.status(400).json({ error: "Name already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT edit
router.put("/:id", authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const { name, is_active } = req.body;
  const { id } = req.params;
  if (!name || !name.trim()) return res.status(400).json({ error: "Name required" });
  try {
    const [result] = await pool.query(
      `UPDATE delivery_persons SET name = ?, is_active = ? WHERE id = ?`,
      [name.trim(), is_active ? 1 : 0, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
    res.json({ updated: result.affectedRows > 0 });
  } catch (err) {
    if (err.message && err.message.includes("Duplicate")) {
      return res.status(400).json({ error: "Name already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete("/:id", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const [result] = await pool.query(
      `DELETE FROM delivery_persons WHERE id = ?`,
      [req.params.id]
    );
    res.json({ deleted: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
