const express = require('express');
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

// GET suggestions for a type (with search query)
router.get('/:type', async (req, res) => {
  const { type } = req.params;
  const q = req.query.q || '';
  const valid = ['cities', 'consignors', 'consignees', 'contents'];
  if (!valid.includes(type)) return res.status(400).json({ error: 'Invalid type' });

  try {
    const [rows] = await pool.query(
      `SELECT name FROM ${type} WHERE name LIKE ? ORDER BY name LIMIT 5`,
      [`${q}%`]
    );
    res.json(rows.map(r => r.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add new suggestion (if not exists)
router.post('/:type', async (req, res) => {
  const { type } = req.params;
  const { name } = req.body;
  const valid = ['cities', 'consignors', 'consignees', 'contents'];
  if (!valid.includes(type)) return res.status(400).json({ error: 'Invalid type' });
  if (!name || name.length < 1) return res.status(400).json({ error: 'Name required' });

  try {
    // MySQL: Use INSERT IGNORE to prevent duplicate entry errors.
    const [result] = await pool.query(
      `INSERT IGNORE INTO ${type} (name) VALUES (?)`,
      [name]
    );
    res.json({ added: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
