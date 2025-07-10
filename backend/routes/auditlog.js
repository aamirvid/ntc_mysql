const express = require('express');
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

router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  const year = parseInt(req.query.year);
  const page = parseInt(req.query.page) || 1;
  const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 50, 200)); // 1–200 rows per page (to avoid abuse)
  const offset = (page - 1) * limit;

  if (!year) {
    return res.status(400).json({ error: "Year is required" });
  }

  try {
    // Get total count for pagination UI
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM audit_logs WHERE year = ?`, [year]
    );

    // Get the paginated records
    const [rows] = await pool.query(
      `SELECT * FROM audit_logs WHERE year = ? ORDER BY id DESC LIMIT ? OFFSET ?`,
      [year, limit, offset]
    );

    res.json({
      total,
      page,
      limit,
      results: rows,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
