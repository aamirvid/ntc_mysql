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
  try {
    const [rows] = await pool.query(
      `SELECT * FROM audit_logs WHERE year = ? ORDER BY id DESC LIMIT 1000`,
      [year]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
