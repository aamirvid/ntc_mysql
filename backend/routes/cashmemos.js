const express = require('express');
const { ensureTables } = require('../utils/initDb');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { logAudit } = require('../utils/auditLog');
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

function getFinancialYearSuffix(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 4 ? y : y - 1;
}

router.use((req, res, next) => {
  let year = parseInt(req.query.year);
  if (isNaN(year)) year = getFinancialYearSuffix();
  req.finYear = year;
  ensureTables(year);
  next();
});

// GET all cash memos for the year
router.get('/', async (req, res) => {
  const FY = req.finYear;
  const { lr_id, cash_memo_no } = req.query;
  let sql = `SELECT * FROM cash_memo_${FY}`;
  let params = [];
  if (lr_id) {
    sql += " WHERE lr_id = ?";
    params.push(lr_id);
  } else if (cash_memo_no) {
    sql += " WHERE cash_memo_no = ?";
    params.push(cash_memo_no);
  }
  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET paginated, searchable cash memos
router.get('/list', authenticateToken, requireRole(['admin', 'clerk', 'low']), async (req, res) => {
  const FY = req.finYear;
  const { search = "", page = 1, pageSize = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = "1=1";
  let params = [];
  if (search && search.trim() !== "") {
    where += " AND cash_memo_no LIKE ?";
    params.push(`%${search.trim()}%`);
  }

  try {
    // Get total count for pagination
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM cash_memo_${FY} WHERE ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;

    // Fetch paginated rows
    const [rows] = await pool.query(
      `SELECT * FROM cash_memo_${FY} WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset]
    );

    res.json({ data: rows, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET cash memo by id
router.get('/:id', async (req, res) => {
  const FY = req.finYear;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM cash_memo_${FY} WHERE id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET cash memo by LR ID
router.get('/by-lr-id/:lr_id', authenticateToken, requireRole(['admin', 'clerk', 'low']), async (req, res) => {
  const FY = req.finYear;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM cash_memo_${FY} WHERE lr_id = ?`,
      [req.params.lr_id]
    );
    if (!rows[0]) return res.status(404).json({ error: "No cash memo for this LR." });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to get the next available cash memo number (atomic & safe)
async function getNextCashMemoNo(FY) {
  // Use a single UPDATE to increment and get the new value (atomic)
  await pool.query(`
    UPDATE cash_memo_sequence_${FY} SET last_no = last_no + 1 WHERE id=1
  `);
  const [rows] = await pool.query(
    `SELECT last_no FROM cash_memo_sequence_${FY} WHERE id=1`
  );
  return rows[0].last_no;
}

// POST create cash memo
router.post('/', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const FY = req.finYear;
  const { lr_id, hamali, bc, landing, lc } = req.body;
  const username = req.user?.username || "system";
  try {
    // Check if cash memo already exists for this LR
    const [existingRows] = await pool.query(
      `SELECT id FROM cash_memo_${FY} WHERE lr_id = ?`,
      [lr_id]
    );
    if (existingRows[0]) {
      return res.status(400).json({ error: "Cash memo already exists for this L.R." });
    }
    // Fetch LR's freight and freight_type (only used in total if Topay)
    const [lrRows] = await pool.query(
      `SELECT freight, freight_type FROM lr_${FY} WHERE id = ?`,
      [lr_id]
    );
    if (!lrRows[0]) {
      return res.status(400).json({ error: "LR not found for this cash memo." });
    }
    const { freight, freight_type } = lrRows[0];
    const nextNo = await getNextCashMemoNo(FY);
    const totalFreight = freight_type === "Topay" ? parseFloat(freight) || 0 : 0;
    const cashMemoTotal =
      (parseFloat(hamali) || 0) +
      (parseFloat(bc) || 0) +
      (parseFloat(landing) || 0) +
      (parseFloat(lc) || 0) +
      totalFreight;

    const [result] = await pool.query(
      `INSERT INTO cash_memo_${FY} 
        (cash_memo_no, lr_id, hamali, bc, landing, lc, cash_memo_total, created_by, updated_by, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        nextNo, lr_id, hamali, bc, landing, lc,
        cashMemoTotal, username, username
      ]
    );
    await pool.query(
      `UPDATE lr_${FY} SET has_cash_memo = 1 WHERE id = ?`,
      [lr_id]
    );
    // Fetch new row for audit
    const [newRows] = await pool.query(`SELECT * FROM cash_memo_${FY} WHERE id = ?`, [result.insertId]);
    const newData = newRows[0] || null;
    await logAudit({
      user: username,
      action: "create",
      entity: "cash_memo",
      entity_no: nextNo,
      year: FY,
      old_data: null,
      new_data: newData
    });
    res.json({ id: result.insertId, cash_memo_no: nextNo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update cash memo
router.put('/:id', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const FY = req.finYear;
  const { hamali, bc, landing, lc } = req.body;
  const username = req.user?.username || "system";
  try {
    // Get old row for audit
    const [oldRows] = await pool.query(
      `SELECT * FROM cash_memo_${FY} WHERE id = ?`,
      [req.params.id]
    );
    if (!oldRows[0]) {
      return res.status(400).json({ error: "Cash memo not found" });
    }
    const oldData = oldRows[0];
    const cashMemoNo = oldData.cash_memo_no;
    const lr_id = oldData.lr_id;
    // Get LR's freight info for total
    const [lrRows] = await pool.query(
      `SELECT freight, freight_type FROM lr_${FY} WHERE id = ?`,
      [lr_id]
    );
    if (!lrRows[0]) {
      return res.status(400).json({ error: "LR not found" });
    }
    const { freight, freight_type } = lrRows[0];
    const totalFreight = freight_type === "Topay" ? parseFloat(freight) || 0 : 0;
    const cashMemoTotal =
      (parseFloat(hamali) || 0) +
      (parseFloat(bc) || 0) +
      (parseFloat(landing) || 0) +
      (parseFloat(lc) || 0) +
      totalFreight;

    const [updateRes] = await pool.query(
      `UPDATE cash_memo_${FY} SET 
        hamali=?, bc=?, landing=?, lc=?, cash_memo_total=?, updated_by=?, updated_at=NOW()
        WHERE id=?`,
      [hamali, bc, landing, lc, cashMemoTotal, username, req.params.id]
    );
    // Fetch new row for audit
    const [newRows] = await pool.query(`SELECT * FROM cash_memo_${FY} WHERE id = ?`, [req.params.id]);
    const newData = newRows[0] || null;
    await logAudit({
      user: username,
      action: "update",
      entity: "cash_memo",
      entity_no: cashMemoNo,
      year: FY,
      old_data: oldData,
      new_data: newData
    });
    res.json({ updated: updateRes.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE cash memo
router.delete('/:id', authenticateToken, requireRole(['admin','clerk']), async (req, res) => {
  const FY = req.finYear;
  try {
    // Fetch old row for audit
    const [oldRows] = await pool.query(
      `SELECT * FROM cash_memo_${FY} WHERE id = ?`,
      [req.params.id]
    );
    if (!oldRows[0]) {
      return res.status(404).json({ error: "Cash memo not found" });
    }
    const oldData = oldRows[0];
    const cashMemoNo = oldData.cash_memo_no;
    const lrId = oldData.lr_id;
    // Delete the cash memo
    const [delRes] = await pool.query(
      `DELETE FROM cash_memo_${FY} WHERE id = ?`,
      [req.params.id]
    );
    // Set has_cash_memo = 0 for that LR
    await pool.query(
      `UPDATE lr_${FY} SET has_cash_memo = 0 WHERE id = ?`,
      [lrId]
    );
    await logAudit({
      user: req.user?.username || "system",
      action: "delete",
      entity: "cash_memo",
      entity_no: cashMemoNo,
      year: FY,
      old_data: oldData,
      new_data: null
    });
    res.json({ deleted: delRes.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
