const express = require('express');
const { ensureTables } = require('../utils/initDb');
const { logAudit } = require('../utils/auditLog');
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

function getFinancialYearSuffix(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 4 ? y : y - 1;
}

// Set year and ensure tables
router.use((req, res, next) => {
  let year = parseInt(req.query.year);
  if (isNaN(year)) year = getFinancialYearSuffix();
  req.finYear = year;
  ensureTables(year);
  next();
});

// ---------- LOOKUP ROUTE (by memo_no) ----------
router.get('/lookup/:no', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const FY = req.finYear;
  try {
    const [memoRows] = await pool.query(`SELECT * FROM memo_${FY} WHERE memo_no = ?`, [req.params.no]);
    if (!memoRows[0]) return res.status(404).json({ error: 'Memo not found' });

    const [lrs] = await pool.query(`SELECT * FROM lr_${FY} WHERE memo_id = ?`, [memoRows[0].id]);
    const ids = lrs.map(l => l.id);

    let cashRows = [];
    if (ids.length > 0) {
      [cashRows] = await pool.query(
        `SELECT * FROM cash_memo_${FY} WHERE lr_id IN (${ids.map(() => '?').join(',')})`, ids
      );
    }

    const cmMap = {};
    cashRows.forEach(cm => { cmMap[cm.lr_id] = cm; });

    const lrsWithCm = lrs.map(lr => {
      const cm = cmMap[lr.id] || {};
      const trueFreight = (lr.freight_type === "Topay" ? parseFloat(lr.freight) || 0 : 0);
      const true_cash_memo_total =
        (parseFloat(cm.hamali) || 0) +
        (parseFloat(cm.bc) || 0) +
        (parseFloat(cm.landing) || 0) +
        (parseFloat(cm.lc) || 0) +
        trueFreight;
      return {
        ...lr,
        cashMemo: { ...cm, true_cash_memo_total }
      };
    });
    res.json({ memo: memoRows[0], lrs: lrsWithCm, cashMemos: cashRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- LIST/PAGINATED/SEARCH ----------
router.get('/list', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const FY = req.finYear;
  const search = (req.query.search || '').trim();
  const sort = req.query.sort === 'asc' ? 'ASC' : 'DESC';
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const offset = (page - 1) * pageSize;
  let where = '';
  let params = [];

  if (search) {
    where = ' WHERE memo_no LIKE ?';
    params.push(`%${search}%`);
  }

  try {
    const [countRow] = await pool.query(`SELECT COUNT(*) as total FROM memo_${FY}${where}`, params);
    const [rows] = await pool.query(
      `SELECT * FROM memo_${FY}${where} ORDER BY id ${sort} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    res.json({
      total: countRow[0].total,
      data: rows,
      page,
      pageSize
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- GET ALL MEMOS (for quick lists, not paged) ----------
router.get('/', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const FY = req.finYear;
  try {
    const [rows] = await pool.query(`SELECT * FROM memo_${FY} ORDER BY id DESC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- MEMO DETAILS: /:id/details ----------
router.get('/:id/details', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const FY = req.finYear;
  const memoId = req.params.id;
  try {
    const [memoRows] = await pool.query(`SELECT * FROM memo_${FY} WHERE id = ?`, [memoId]);
    if (!memoRows[0]) return res.status(404).json({ error: 'Memo not found' });

    const [lrs] = await pool.query(`SELECT * FROM lr_${FY} WHERE memo_id = ?`, [memoId]);
    const lrIds = lrs.map(lr => lr.id);

    let cashMemos = [];
    if (lrIds.length > 0) {
      [cashMemos] = await pool.query(
        `SELECT * FROM cash_memo_${FY} WHERE lr_id IN (${lrIds.map(() => '?').join(',')})`, lrIds
      );
    }

    const cmMap = {};
    cashMemos.forEach(cm => { cmMap[cm.lr_id] = cm; });
    const lrsWithCm = lrs.map(lr => {
      const cm = cmMap[lr.id] || {};
      const trueFreight = (lr.freight_type === "Topay" ? parseFloat(lr.freight) || 0 : 0);
      const true_cash_memo_total =
        (parseFloat(cm.hamali) || 0) +
        (parseFloat(cm.bc) || 0) +
        (parseFloat(cm.landing) || 0) +
        (parseFloat(cm.lc) || 0) +
        trueFreight;
      return {
        ...lr,
        cashMemo: { ...cm, true_cash_memo_total }
      };
    });

    res.json({ memo: memoRows[0], lrs: lrsWithCm, cashMemos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- GET SINGLE MEMO BY ID ----------
router.get('/:id', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const FY = req.finYear;
  try {
    const [rows] = await pool.query(`SELECT * FROM memo_${FY} WHERE id = ?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- CREATE MEMO ----------
router.post('/', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const FY = req.finYear;
  const {
    memo_no, memo_date, arrival_date, arrival_time, truck_no, total_lorry_hire,
    advance_lorry_hire, driver_owner
  } = req.body;
  const username = req.user?.username || 'system';
  try {
    const [result] = await pool.query(
      `INSERT INTO memo_${FY} 
        (memo_no, memo_date, arrival_date, arrival_time, truck_no, total_lorry_hire, advance_lorry_hire, driver_owner, created_by, updated_by, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [memo_no, memo_date, arrival_date, arrival_time, truck_no, total_lorry_hire, advance_lorry_hire, driver_owner, username, username]
    );
    // Fetch the full row after insert for audit
    const [newRows] = await pool.query(`SELECT * FROM memo_${FY} WHERE id = ?`, [result.insertId]);
    const newData = newRows[0] || null;
    await logAudit({
      user: username,
      action: 'create',
      entity: 'memo',
      entity_no: memo_no,
      year: FY,
      old_data: null,
      new_data: newData
    });
    res.json(newData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ---------- UPDATE MEMO ----------
router.put('/:id', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const FY = req.finYear;
  const {
    memo_no, memo_date, arrival_date, arrival_time, truck_no, total_lorry_hire,
    advance_lorry_hire, driver_owner
  } = req.body;
  const username = req.user?.username || 'system';
  try {
    // Fetch old row for audit
    const [oldRows] = await pool.query(`SELECT * FROM memo_${FY} WHERE id = ?`, [req.params.id]);
    if (!oldRows[0]) return res.status(404).json({ error: 'Memo not found' });
    const oldData = oldRows[0];
    await pool.query(
      `UPDATE memo_${FY} SET 
        memo_no=?, memo_date=?, arrival_date=?, arrival_time=?, truck_no=?, total_lorry_hire=?, advance_lorry_hire=?, driver_owner=?, updated_by=?, updated_at=NOW()
        WHERE id=?`,
      [memo_no, memo_date, arrival_date, arrival_time, truck_no, total_lorry_hire, advance_lorry_hire, driver_owner, username, req.params.id]
    );
    // Fetch new row for audit
    const [newRows] = await pool.query(`SELECT * FROM memo_${FY} WHERE id = ?`, [req.params.id]);
    const newData = newRows[0] || null;
    await logAudit({
      user: username,
      action: 'update',
      entity: 'memo',
      entity_no: memo_no,
      year: FY,
      old_data: oldData,
      new_data: newData
    });
    res.json(newData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- DELETE MEMO AND ALL RELATED DATA ----------
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const FY = req.finYear;
  try {
    // Fetch old memo for audit
    const [memoRows] = await pool.query(`SELECT * FROM memo_${FY} WHERE id = ?`, [req.params.id]);
    if (!memoRows[0]) return res.status(404).json({ error: 'Memo not found' });
    const oldData = memoRows[0];
    const memoNo = oldData.memo_no;

    // Get all LRs under this memo
    const [lrs] = await pool.query(`SELECT id FROM lr_${FY} WHERE memo_id = ?`, [req.params.id]);
    const lrIds = lrs.map(lr => lr.id);

    if (lrIds.length > 0) {
      await pool.query(
        `DELETE FROM cash_memo_${FY} WHERE lr_id IN (${lrIds.map(() => '?').join(',')})`,
        lrIds
      );
    }
    await pool.query(`DELETE FROM lr_${FY} WHERE memo_id = ?`, [req.params.id]);
    const [delRes] = await pool.query(`DELETE FROM memo_${FY} WHERE id = ?`, [req.params.id]);
    await logAudit({
      user: req.user?.username || 'system',
      action: 'delete',
      entity: 'memo',
      entity_no: memoNo,
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
