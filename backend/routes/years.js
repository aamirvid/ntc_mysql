// backend/routes/years.js
const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'ntcuser',
  password: process.env.MYSQL_PASSWORD || 'yourpassword',
  database: process.env.MYSQL_DATABASE || 'ntc_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// GET /api/years — list all financial years found in DB
router.get('/', authenticateToken, requireRole(['admin', 'clerk', 'low']), async (req, res) => {
  try {
    // Show all tables in database
    const [rows] = await pool.query("SHOW TABLES");
    // MySQL returns: [{ 'Tables_in_ntc_db': 'memo_2023' }, ...]
    const tables = rows.map(r => Object.values(r)[0]);
    // Pick years from table names like memo_2023, lr_2024, etc.
    const years = Array.from(
      new Set(
        tables
          .map(name => name.match(/_(20\d{2})$/))
          .filter(m => m)
          .map(m => m[1])
      )
    ).sort((a, b) => b - a);
    res.json(years);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
