const express = require("express");
const router = express.Router();
const { hashKey, compareKey } = require("../utils/hash");
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'ntcuser',
  password: process.env.MYSQL_PASSWORD || 'yourpassword',
  database: process.env.MYSQL_DATABASE || 'ntc_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// -- DEV/TEST ONLY: Inject fake admin user for all requests to this router --
router.use((req, res, next) => {
  req.user = { username: "admin", role: "admin" }; // REMOVE for production!
  next();
});

// -- Admin check --
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({ error: "Admin only." });
}

// -- Admin sets or updates the key --
router.post("/admin/app-key", requireAdmin, async (req, res) => {
  const { key_type, key, usage_limit } = req.body;
  const updated_by = req.user?.username || "admin";
  if (!key_type || !key || !usage_limit || isNaN(usage_limit)) {
    return res.status(400).json({ error: "Missing key_type, key, or usage_limit." });
  }
  const key_hash = hashKey(key);

  try {
    // Insert or update using MySQL's ON DUPLICATE KEY UPDATE
    await pool.query(
      `INSERT INTO app_keys (key_type, key_hash, usage_limit, usage_count, updated_by, updated_at)
      VALUES (?, ?, ?, 0, ?, NOW())
      ON DUPLICATE KEY UPDATE 
        key_hash = VALUES(key_hash), 
        usage_limit = VALUES(usage_limit), 
        usage_count = 0, 
        updated_by = VALUES(updated_by), 
        updated_at = NOW()`,
      [key_type, key_hash, usage_limit, updated_by]
    );

    // Audit log (optional): insert into audit_logs
    await pool.query(
      `INSERT INTO audit_logs (user, action, entity, entity_id, year, details) VALUES (?, ?, ?, ?, ?, ?)`,
      [updated_by, "update", "app_key", 0, null, `Set ${key_type} key, usage_limit=${usage_limit}`]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("SQL error in /admin/app-key:", err);
    return res.status(500).json({ error: "Failed to set key." });
  }
});

// -- Validate delete key and increment usage if valid --
router.post("/app-key/validate", async (req, res) => {
  const { key_type, key } = req.body;
  const user = req.user?.username || ""; // For audit log
  if (!key_type || !key) return res.status(400).json({ error: "Missing key_type or key." });

  try {
    const [rows] = await pool.query(`SELECT * FROM app_keys WHERE key_type = ?`, [key_type]);
    const row = rows[0];
    if (!row) {
      return res.status(400).json({ error: "Key not set." });
    }
    if (!compareKey(key, row.key_hash)) {
      // Invalid key, log the failed attempt
      await pool.query(
        `INSERT INTO audit_logs (user, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
        [user, "delete_key_fail", "app_key", row.id, `Invalid key attempt for ${key_type}`]
      );
      return res.status(401).json({ error: "Invalid or expired key.", usage_left: Math.max(0, row.usage_limit - row.usage_count) });
    }
    if (row.usage_count >= row.usage_limit) {
      return res.status(403).json({ error: "Delete key usage limit exhausted.", usage_left: 0 });
    }

    // Valid, increment usage count
    await pool.query(
      `UPDATE app_keys SET usage_count = usage_count + 1 WHERE id = ?`,
      [row.id]
    );
    // Log usage
    await pool.query(
      `INSERT INTO audit_logs (user, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [user, "delete_key_use", "app_key", row.id, `Used delete key (${row.usage_count + 1}/${row.usage_limit})`]
    );

    return res.json({
      valid: true,
      usage_left: Math.max(0, row.usage_limit - row.usage_count - 1),
      usage_limit: row.usage_limit
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

// -- Get delete key usage status --
router.get("/app-key/status", async (req, res) => {
  const { key_type } = req.query;
  if (!key_type) return res.status(400).json({ error: "Missing key_type" });

  try {
    const [rows] = await pool.query(`SELECT usage_limit, usage_count FROM app_keys WHERE key_type = ?`, [key_type]);
    const row = rows[0];
    if (!row) return res.json({ usage_left: 0, usage_limit: 0 });
    return res.json({ usage_left: Math.max(0, row.usage_limit - row.usage_count), usage_limit: row.usage_limit });
  } catch (err) {
    return res.json({ usage_left: 0, usage_limit: 0 });
  }
});

module.exports = router;
