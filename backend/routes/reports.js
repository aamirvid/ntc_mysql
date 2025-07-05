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

// --- Door Delivery Report ---
router.get('/door-delivery', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const { memo_id, year } = req.query;
  if (!memo_id || !year) return res.status(400).json({ error: "memo_id and year required" });
  try {
    const [memoRows] = await pool.query(`SELECT arrival_date FROM memo_${year} WHERE id=?`, [memo_id]);
    if (!memoRows[0]) return res.status(404).json({ error: 'Memo not found' });
    const [lrs] = await pool.query(
      `SELECT lr_no, lr_date, ? as arrival_date, consignor, consignee, pkgs, dd_rate, dd_total
      FROM lr_${year}
      WHERE memo_id=? AND dd_total IS NOT NULL AND dd_total > 0`,
      [memoRows[0].arrival_date, memo_id]
    );
    const totals = {
      lrs: lrs.length,
      pkgs: lrs.reduce((s, l) => s + (parseInt(l.pkgs) || 0), 0),
      dd_total: lrs.reduce((s, l) => s + (parseFloat(l.dd_total) || 0), 0)
    };
    res.json({ arrival_date: memoRows[0].arrival_date, lrs, totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Truck-wise Report ---
router.get('/truck', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const { memo_id, year } = req.query;
  if (!memo_id || !year) return res.status(400).json({ error: "memo_id and year required" });
  try {
    const [memoRows] = await pool.query(`SELECT truck_no FROM memo_${year} WHERE id=?`, [memo_id]);
    if (!memoRows[0]) return res.status(404).json({ error: 'Memo not found' });
    const [lrs] = await pool.query(
      `SELECT lr_no, lr_date, from_city, to_city, consignor, consignee, pkgs, content,
             freight_type, freight, weight, dd_rate, dd_total, pm_no, refund, remarks
      FROM lr_${year}
      WHERE memo_id=?`,
      [memo_id]
    );
    const totals = {
      lrs: lrs.length,
      pkgs: lrs.reduce((s, l) => s + (parseInt(l.pkgs) || 0), 0),
      topay: lrs.filter(l => l.freight_type === "Topay").reduce((s, l) => s + (parseFloat(l.freight) || 0), 0),
      paid: lrs.filter(l => l.freight_type === "Paid").reduce((s, l) => s + (parseFloat(l.freight) || 0), 0),
      weight: lrs.reduce((s, l) => s + (parseFloat(l.weight) || 0), 0),
      dd_total: lrs.reduce((s, l) => s + (parseFloat(l.dd_total) || 0), 0),
      refund: lrs.reduce((s, l) => s + (parseFloat(l.refund) || 0), 0),
    };
    res.json({ truck_no: memoRows[0].truck_no, lrs, totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Monthly Report ---
router.get('/monthly', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const { from, to, year } = req.query;
  if (!from || !to || !year) {
    return res.status(400).json({ error: 'Missing from, to, or year parameter.' });
  }
  try {
    const memoTable = `memo_${year}`;
    const lrTable = `lr_${year}`;
    const dateField = req.query.filter === "arrival" ? "arrival_date" : "memo_date";
    const [memos] = await pool.query(
      `SELECT id, memo_no, memo_date, arrival_date, truck_no, balance_lorry_hire
      FROM ${memoTable}
      WHERE ${dateField} BETWEEN ? AND ?
      ORDER BY ${dateField} ASC, ${dateField} ASC`,
      [from, to]
    );
    let totalTopay = 0, totalPaid = 0, totalRefund = 0, totalBalanceLorryHire = 0, totalDD = 0;
    const result = [];
    for (const memo of memos) {
      const [lrRows] = await pool.query(
        `SELECT freight_type, freight, refund, dd_total FROM ${lrTable} WHERE memo_id = ?`,
        [memo.id]
      );
      let sumTopay = 0, sumPaid = 0, sumRefund = 0, sumDD = 0;
      for (const lr of lrRows) {
        if (lr.freight_type === 'Topay') sumTopay += Number(lr.freight) || 0;
        if (lr.freight_type === 'Paid') sumPaid += Number(lr.freight) || 0;
        sumRefund += Number(lr.refund) || 0;
        sumDD += Number(lr.dd_total) || 0;
      }
      totalTopay += sumTopay;
      totalPaid += sumPaid;
      totalRefund += sumRefund;
      totalBalanceLorryHire += Number(memo.balance_lorry_hire) || 0;
      totalDD += sumDD;
      result.push({
        memo_date: memo.memo_date,
        arrival_date: memo.arrival_date,
        truck_no: memo.truck_no,
        memo_no: memo.memo_no,
        total_topay: sumTopay,
        total_paid: sumPaid,
        total_refund: sumRefund,
        balance_lorry_hire: Number(memo.balance_lorry_hire) || 0,
        total_dd: sumDD,
      });
    }
    res.json({
      rows: result,
      totals: {
        total_memos: memos.length,
        total_topay: totalTopay,
        total_paid: totalPaid,
        total_refund: totalRefund,
        total_balance_lorry_hire: totalBalanceLorryHire,
        total_dd: totalDD,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// --- Refund Report ---
router.get('/refund', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const { from, to, year, filter } = req.query;
  if (!from || !to || !year) {
    return res.status(400).json({ error: 'Missing from, to, or year parameter.' });
  }
  try {
    const memoTable = `memo_${year}`;
    const lrTable = `lr_${year}`;
    const dateField = filter === "arrival" ? "arrival_date" : "memo_date";
    const [lrs] = await pool.query(
      `
      SELECT lr.lr_no, lr.lr_date, lr.consignor, lr.consignee, lr.pkgs, lr.freight, lr.refund
      FROM ${lrTable} lr
      JOIN ${memoTable} memo ON lr.memo_id = memo.id
      WHERE memo.${dateField} BETWEEN ? AND ?
        AND lr.refund > 0
      ORDER BY memo.${dateField} ASC, memo.${dateField} ASC, lr.lr_date ASC
      `,
      [from, to]
    );
    let totalLrs = lrs.length;
    let totalPkgs = 0, totalFreight = 0, totalRefund = 0;
    lrs.forEach(lr => {
      totalPkgs += Number(lr.pkgs) || 0;
      totalFreight += Number(lr.freight) || 0;
      totalRefund += Number(lr.refund) || 0;
    });
    res.json({
      rows: lrs,
      totals: {
        total_lrs: totalLrs,
        total_pkgs: totalPkgs,
        total_freight: totalFreight,
        total_refund: totalRefund,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// --- No Cash Memo Report ---
router.get('/no-cash-memo', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const { year, from, to, filter, memo_no, truck_no } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'Missing year parameter.' });
  }
  try {
    const memoTable = `memo_${year}`;
    const lrTable = `lr_${year}`;
    let where = "lr.has_cash_memo = 0";
    let params = [];
    if (from && to) {
      const dateField = filter === "arrival" ? "memo.arrival_date" : "memo.memo_date";
      where += ` AND ${dateField} BETWEEN ? AND ?`;
      params.push(from, to);
    }
    if (memo_no) {
      where += " AND memo.memo_no = ?";
      params.push(memo_no);
    }
    if (truck_no) {
      where += " AND memo.truck_no = ?";
      params.push(truck_no);
    }
    const [lrs] = await pool.query(
      `
      SELECT lr.lr_no, lr.lr_date, lr.consignor, lr.consignee, lr.pkgs,
             memo.memo_no, memo.memo_date, memo.arrival_date, memo.truck_no
      FROM ${lrTable} lr
      JOIN ${memoTable} memo ON lr.memo_id = memo.id
      WHERE ${where}
      ORDER BY memo.memo_date ASC, memo.arrival_date ASC, lr.lr_date ASC
      `,
      params
    );
    const [allMemos] = await pool.query(`SELECT DISTINCT memo_no FROM ${memoTable} ORDER BY memo_no ASC`);
    const [allTrucks] = await pool.query(`SELECT DISTINCT truck_no FROM ${memoTable} WHERE truck_no IS NOT NULL AND truck_no != '' ORDER BY truck_no ASC`);
    const totalLrs = lrs.length;
    let totalPkgs = 0;
    lrs.forEach(lr => {
      totalPkgs += Number(lr.pkgs) || 0;
    });
    res.json({
      rows: lrs,
      totals: {
        total_lrs: totalLrs,
        total_pkgs: totalPkgs,
      },
      allMemos: allMemos.map(m => m.memo_no),
      allTrucks: allTrucks.map(t => t.truck_no),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// --- Delivery Report ---
router.get('/delivery', authenticateToken, requireRole(['admin', 'clerk']), async (req, res) => {
  const { year, from, to, memo_no, delivered_by } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'Missing year parameter.' });
  }
  try {
    const memoTable = `memo_${year}`;
    const lrTable = `lr_${year}`;
    const cashMemoTable = `cash_memo_${year}`;
    let where = "LOWER(lr.status) = 'delivered'";
    let params = [];
    if (from && to) {
      where += " AND DATE(lr.delivered_at) BETWEEN ? AND ?";
      params.push(from, to);
    }
    if (memo_no) {
      where += " AND memo.memo_no = ?";
      params.push(memo_no);
    }
    if (delivered_by) {
      where += " AND lr.delivered_by = ?";
      params.push(delivered_by);
    }
    const [lrs] = await pool.query(
      `
      SELECT 
        lr.lr_no, lr.lr_date, lr.from_city, memo.memo_no, memo.arrival_date, memo.truck_no,
        lr.consignor, lr.consignee, lr.pkgs, lr.content, lr.freight_type, lr.freight, lr.refund,
        cm.cash_memo_no, cm.hamali, cm.bc, cm.landing, cm.lc,
        lr.delivered_at, lr.delivered_by
      FROM ${lrTable} lr
      JOIN ${memoTable} memo ON lr.memo_id = memo.id
      LEFT JOIN ${cashMemoTable} cm ON cm.lr_id = lr.id
      WHERE ${where}
      ORDER BY lr.delivered_at ASC, lr.lr_no ASC
      `,
      params
    );
    const [allMemos] = await pool.query(`SELECT DISTINCT memo_no FROM ${memoTable} ORDER BY memo_no ASC`);
    const [allPersons] = await pool.query(
      `SELECT DISTINCT delivered_by FROM ${lrTable} WHERE delivered_by IS NOT NULL AND delivered_by != '' ORDER BY delivered_by ASC`
    );

    let totalLrs = lrs.length, totalPkgs = 0, totalFreight = 0, totalRefund = 0, totalCashMemo = 0;
    lrs.forEach(lr => {
      totalPkgs += Number(lr.pkgs) || 0;
      totalFreight += Number(lr.freight) || 0;
      totalRefund += Number(lr.refund) || 0;

      // Calculate "true" cash memo total using only LR's freight if Topay
      const trueFreight = (lr.freight_type === "Topay" ? parseFloat(lr.freight) || 0 : 0);
      lr.true_cash_memo_total =
        (parseFloat(lr.hamali) || 0) +
        (parseFloat(lr.bc) || 0) +
        (parseFloat(lr.landing) || 0) +
        (parseFloat(lr.lc) || 0) +
        trueFreight;

      totalCashMemo += lr.true_cash_memo_total;
    });

    res.json({
      rows: lrs,
      totals: {
        total_lrs: totalLrs,
        total_pkgs: totalPkgs,
        total_freight: totalFreight,
        total_refund: totalRefund,
        total_cash_memo: totalCashMemo,
      },
      allMemos: allMemos.map(m => m.memo_no),
      allDeliveryPersons: allPersons.map(p => p.delivered_by)
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
