const express = require('express');
const { ensureTables } = require('../utils/initDb');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { logAudit } = require('../utils/auditLog');
const mysql = require('mysql2/promise');
const multer = require("multer");
const XLSX = require("xlsx");
const upload = multer({ dest: "uploads/" });
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

function parseExcelDate(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val)) return val;
  if (typeof val === 'number' && val > 40000) {
    const utc_days = Math.floor(val - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return new Date(date_info.getUTCFullYear(), date_info.getUTCMonth(), date_info.getUTCDate());
  }
  if (typeof val === 'string') {
    const match = val.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
      let [, d, m, y] = match;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    if (/^\d{4}[\-\/]\d{2}[\-\/]\d{2}$/.test(val.trim())) {
      return new Date(val.trim());
    }
  }
  return null;
}

function normalizeFreightType(val) {
  if (!val) return "Topay";
  val = val.toString().trim().toUpperCase();
  if (val === "TOPAY" || val === "TO PAY") return "Topay";
  if (val === "PAID") return "Paid";
  if (val === "TBB") return "TBB";
  if (val === "FOC") return "FOC";
  return "Topay";
}

router.use((req, res, next) => {
  let year = parseInt(req.query.year);
  if (isNaN(year)) year = getFinancialYearSuffix();
  req.finYear = year;
  ensureTables(year);
  next();
});

// SEARCH LRs by fields, with optional pagination, including memo fields and cash memo total calculation
router.get('/search', authenticateToken, requireRole(['admin', 'clerk', 'low']), async (req, res) => {
  try {
    const {
      lr_no, consignor, consignee, year, page = 1, limit = 20,
      memo_from_date, memo_to_date, arrival_from_date, arrival_to_date, lr_from_date, lr_to_date
    } = req.query;
    if (!year) return res.status(400).json({ error: "Year is required" });

    const lrTable = `lr_${year}`;
    const memoTable = `memo_${year}`;
    const cashMemoTable = `cash_memo_${year}`;
    let where = [];
    let params = [];

    if (lr_no) { where.push(`lr.lr_no LIKE ?`); params.push(`%${lr_no}%`); }
    if (consignor) { where.push(`lr.consignor LIKE ?`); params.push(`%${consignor}%`); }
    if (consignee) { where.push(`lr.consignee LIKE ?`); params.push(`%${consignee}%`); }
    if (lr_from_date) { where.push(`DATE(lr.lr_date) >= DATE(?)`); params.push(lr_from_date); }
    if (lr_to_date) { where.push(`DATE(lr.lr_date) <= DATE(?)`); params.push(lr_to_date); }
    if (req.query.status) { where.push(`lr.status = ?`); params.push(req.query.status); }
    if (memo_from_date) { where.push(`DATE(memo.memo_date) >= DATE(?)`); params.push(memo_from_date); }
    if (memo_to_date) { where.push(`DATE(memo.memo_date) <= DATE(?)`); params.push(memo_to_date); }
    if (arrival_from_date) { where.push(`DATE(memo.arrival_date) >= DATE(?)`); params.push(arrival_from_date); }
    if (arrival_to_date) { where.push(`DATE(memo.arrival_date) <= DATE(?)`); params.push(arrival_to_date); }

    let whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const selectSql = `
      SELECT 
        lr.*, 
        memo.memo_no, memo.memo_date, memo.arrival_date, memo.truck_no, memo.driver_owner,
        cash.cash_memo_no, cash.hamali, cash.bc, cash.landing, cash.lc, cash.cash_memo_total
      FROM ${lrTable} lr
      LEFT JOIN ${memoTable} memo ON lr.memo_id = memo.id
      LEFT JOIN ${cashMemoTable} cash ON lr.id = cash.lr_id
      ${whereSql}
      ORDER BY lr.lr_date DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(selectSql, [...params, parseInt(limit), offset]);
    rows.forEach(row => {
      const trueFreight = (row.freight_type === "Topay" ? parseFloat(row.freight) || 0 : 0);
      row.true_cash_memo_total =
        (parseFloat(row.hamali) || 0) +
        (parseFloat(row.bc) || 0) +
        (parseFloat(row.landing) || 0) +
        (parseFloat(row.lc) || 0) +
        trueFreight;
    });

    const countSql = `SELECT COUNT(*) as total FROM ${lrTable} lr LEFT JOIN ${memoTable} memo ON lr.memo_id = memo.id ${whereSql}`;
    const [countRow] = await pool.query(countSql, params);

    res.json({ results: rows, total: countRow[0].total });
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

// LOOKUP by LR No (returns LR and memo number)
router.get('/lookup/:no', authenticateToken, requireRole(['admin', 'clerk', 'low']), async (req, res) => {
  const FY = req.finYear;
  try {
    const [rows] = await pool.query(`SELECT * FROM lr_${FY} WHERE lr_no = ?`, [req.params.no]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const [memoRows] = await pool.query(`SELECT memo_no FROM memo_${FY} WHERE id = ?`, [rows[0].memo_id]);
    res.json({ ...rows[0], memo_no: memoRows[0] ? memoRows[0].memo_no : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: By LR No (returns LR and its cash memo)
router.get('/by-lr-no/:no', authenticateToken, requireRole(['admin', 'clerk', 'low']), async (req, res) => {
  const FY = req.query.year || req.finYear;
  if (!FY) return res.status(400).json({ error: "Year required" });
  try {
    const [lrRows] = await pool.query(`SELECT * FROM lr_${FY} WHERE lr_no = ?`, [req.params.no]);
    if (!lrRows[0]) return res.status(404).json({ error: 'LR not found' });
    const [cashMemoRows] = await pool.query(`SELECT * FROM cash_memo_${FY} WHERE lr_id = ?`, [lrRows[0].id]);
    res.json({ lr: lrRows[0], cashMemo: cashMemoRows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: By Cash Memo No (returns LR and cash memo)
router.get('/by-cash-memo/:no', authenticateToken, requireRole(['admin', 'clerk', 'low']), async (req, res) => {
  const FY = req.query.year || req.finYear;
  if (!FY) return res.status(400).json({ error: "Year required" });
  try {
    const [cashMemoRows] = await pool.query(`SELECT * FROM cash_memo_${FY} WHERE cash_memo_no = ?`, [req.params.no]);
    if (!cashMemoRows[0]) return res.status(404).json({ error: 'Cash memo not found' });
    const [lrRows] = await pool.query(`SELECT * FROM lr_${FY} WHERE id = ?`, [cashMemoRows[0].lr_id]);
    if (!lrRows[0]) return res.status(404).json({ error: "LR not found" });
    res.json({ lr: lrRows[0], cashMemo: cashMemoRows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Single LR by ID
router.get('/:id', authenticateToken, requireRole(['admin', 'clerk', 'low']), async (req, res) => {
  const FY = req.finYear;
  try {
    const [rows] = await pool.query(`SELECT * FROM lr_${FY} WHERE id = ?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Detailed LR info with memo and cash memo fields (compute true_cash_memo_total)
router.get('/:id/details', authenticateToken, requireRole(['admin', 'clerk', 'low']), async (req, res) => {
  const { year } = req.query;
  if (!year) return res.status(400).json({ error: "Year required" });
  const lrTable = `lr_${year}`;
  const memoTable = `memo_${year}`;
  const cashTable = `cash_memo_${year}`;
  const id = req.params.id;
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        lr.*,
        memo.memo_no, memo.memo_date, memo.arrival_date, memo.truck_no, memo.driver_owner,
        memo.total_lorry_hire, memo.advance_lorry_hire, memo.balance_lorry_hire,
        memo.created_by AS memo_created_by, memo.created_at AS memo_created_at,
        memo.updated_by AS memo_updated_by, memo.updated_at AS memo_updated_at,
        cash.id AS cash_memo_id, cash.cash_memo_no, cash.hamali, cash.bc, cash.landing, cash.lc, 
        cash.cash_memo_total,
        cash.created_by AS cash_created_by, cash.created_at AS cash_created_at,
        cash.updated_by AS cash_updated_by, cash.updated_at AS cash_updated_at
      FROM ${lrTable} lr
      LEFT JOIN ${memoTable} memo ON lr.memo_id = memo.id
      LEFT JOIN ${cashTable} cash ON lr.id = cash.lr_id
      WHERE lr.id = ?
      `,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const row = rows[0];
    const trueFreight = (row.freight_type === "Topay" ? parseFloat(row.freight) || 0 : 0);
    row.true_cash_memo_total =
      (parseFloat(row.hamali) || 0) +
      (parseFloat(row.bc) || 0) +
      (parseFloat(row.landing) || 0) +
      (parseFloat(row.lc) || 0) +
      trueFreight;
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: All LRs for the year or by memo_id
router.get('/', authenticateToken, requireRole(['admin', 'clerk', 'low']), async (req, res) => {
  const FY = req.finYear;
  const { memo_id } = req.query;
  let sql = `SELECT * FROM lr_${FY}`;
  let params = [];
  if (memo_id) {
    sql += " WHERE memo_id = ?";
    params.push(memo_id);
  }
  sql += " ORDER BY id DESC";
  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BULK IMPORT LRs via Excel
router.post(
  "/bulk-import",
  authenticateToken,
  requireRole(["admin", "clerk"]),
  upload.single("file"),
  async (req, res) => {
    const FY = req.finYear;
    const memoId = req.body.memo_id;
    if (!memoId || !req.file) {
      return res.status(400).json({ error: "Memo ID and Excel file required" });
    }
    try {
      const workbook = XLSX.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const dataRows = rows.slice(1);
      let inserted = 0, duplicates = 0;
      let skippedLrNos = [];

      for (let i = 0; i < dataRows.length; ++i) {
        const row = dataRows[i];
        const lr_no = row[2] ? row[2].toString().trim() : "";
        const lr_date_obj = row[3] ? parseExcelDate(row[3]) : null;
        const lr_date_db = lr_date_obj ? lr_date_obj.toISOString().slice(0, 10) : null;

        if (!lr_no) continue;
        if (!lr_date_db) {
          skippedLrNos.push(`${lr_no} (Invalid Date: ${row[3]})`);
          continue;
        }

        // Check for duplicate by lr_no in the same year
        const [existsRows] = await pool.query(
          `SELECT 1 FROM lr_${FY} WHERE lr_no = ?`,
          [lr_no]
        );
        if (existsRows[0]) {
          duplicates++;
          skippedLrNos.push(`${lr_no} (Duplicate)`);
          continue;
        }

        try {
          await pool.query(
            `INSERT INTO lr_${FY} 
              (memo_id, lr_no, lr_date, from_city, to_city, consignor, consignee, pkgs, weight, pm_no, freight_type, created_by, updated_by, created_at, updated_at, status, has_cash_memo)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 'pending', 0)`,
            [
              memoId,
              lr_no,
              lr_date_db,
              row[4] ? row[4].toString().trim() : "",
              row[5] ? row[5].toString().trim() : "",
              row[7] ? row[7].toString().trim() : "",
              row[9] ? row[9].toString().trim() : "",
              row[11] ? parseInt(row[11], 10) : "",
              row[13] ? parseFloat(row[13]) : "",
              row[14] ? row[14].toString().trim() : "",
              normalizeFreightType(row[6]),
              req.user.username,
              req.user.username
            ]
          );
          inserted++;
        } catch (err) {
          skippedLrNos.push(`${lr_no} (DB Error: ${err.message})`);
        }
      }

      res.json({ inserted, duplicates, skippedLrNos });
    } catch (err) {
      res.status(500).json({ error: err.message || "Import failed" });
    }
  }
);

// MARK as Delivered (batch or single)
router.post('/mark-delivered', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const { year, lr_ids, delivered_by } = req.body;
  if (!year || !Array.isArray(lr_ids) || !lr_ids.length || !delivered_by)
    return res.status(400).json({ error: "Missing required data" });
  const FY = year;
  const now = new Date();
  let updatedCount = 0;
  for (const lr_id of lr_ids) {
    const [result] = await pool.query(
      `UPDATE lr_${FY} SET status = 'delivered', delivered_by = ?, delivered_at = ?, updated_by = ?, updated_at = NOW()
       WHERE id = ? AND (status IS NULL OR status != 'delivered')`,
      [delivered_by, now, req.user.username, lr_id]
    );
    if (result.affectedRows) updatedCount++;
    // Audit log for each delivered LR
    logAudit({
      user: req.user.username,
      action: 'mark-delivered',
      entity: 'lr',
      entity_id: lr_id,
      year: FY,
      details: JSON.stringify({ delivered_by, date: now })
    });
  }
  res.json({ updated: updatedCount, total: lr_ids.length });
});

// POST: Create new LR
router.post('/', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const FY = req.finYear;
  const {
    memo_id, lr_no, lr_date, from_city, to_city, consignor, consignee, pkgs,
    content, freight_type, freight, weight, dd_rate, dd_total, pm_no, refund, remarks
  } = req.body;
  const username = req.user?.username || 'system';
  try {
    const [result] = await pool.query(
      `INSERT INTO lr_${FY} 
        (memo_id, lr_no, lr_date, from_city, to_city, consignor, consignee, pkgs, content, freight_type, freight, weight, dd_rate, dd_total, pm_no, refund, remarks, created_by, updated_by, created_at, updated_at, status, has_cash_memo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 'pending', 0)`,
      [memo_id, lr_no, lr_date, from_city, to_city, consignor, consignee, pkgs, content, freight_type, freight, weight, dd_rate, dd_total, pm_no, refund, remarks, username, username]
    );
    logAudit({
      user: username,
      action: 'create',
      entity: 'lr',
      entity_id: result.insertId,
      year: FY,
      details: JSON.stringify(req.body)
    });
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Update only the LR (no cash memo logic here)
router.put('/:id', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const FY = req.finYear;
  const {
    memo_id, lr_no, lr_date, from_city, to_city, consignor, consignee, pkgs,
    content, freight_type, freight, weight, dd_rate, dd_total, pm_no, refund, remarks,
    status, delivered_by, delivered_at
  } = req.body;
  const username = req.user?.username || 'system';
  try {
    const [result] = await pool.query(
      `UPDATE lr_${FY} SET 
        memo_id=?, lr_no=?, lr_date=?, from_city=?, to_city=?, consignor=?, consignee=?, pkgs=?, content=?, freight_type=?, freight=?, weight=?, dd_rate=?, dd_total=?, pm_no=?, refund=?, remarks=?, updated_by=?, updated_at=NOW(), status=?, delivered_by=?, delivered_at=?
        WHERE id=?`,
      [memo_id, lr_no, lr_date, from_city, to_city, consignor, consignee, pkgs, content, freight_type, freight, weight, dd_rate, dd_total, pm_no, refund, remarks, username, status, delivered_by, delivered_at, req.params.id]
    );
    logAudit({
      user: username,
      action: 'update',
      entity: 'lr',
      entity_id: req.params.id,
      year: FY,
      details: JSON.stringify(req.body)
    });
    res.json({ updated: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Delete LR AND its cash memo
router.delete('/:id', authenticateToken, requireRole(['admin','clerk']), async (req, res) => {
  const FY = req.finYear;
  try {
    // First, delete the cash memo (child)
    await pool.query(`DELETE FROM cash_memo_${FY} WHERE lr_id = ?`, [req.params.id]);
    // Then delete the LR (parent)
    const [result] = await pool.query(`DELETE FROM lr_${FY} WHERE id = ?`, [req.params.id]);
    logAudit({
      user: req.user.username,
      action: 'delete',
      entity: 'lr',
      entity_id: req.params.id,
      year: FY,
      details: ''
    });
    res.json({ deleted: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
