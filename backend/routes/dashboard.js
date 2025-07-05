const express = require('express');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const db = require('../db');
const router = express.Router();

// Allow all logged-in users to see their dashboard
router.get('/', authenticateToken, requireRole(['admin', 'clerk', 'low']), async (req, res) => {
  const year = req.query.year || (new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1);
  // Count memos, LRs, etc. (customize as needed)
  const [memoCount] = await db.all(`SELECT COUNT(*) as count FROM memo_${year}`);
  const [lrPending] = await db.all(`SELECT COUNT(*) as count FROM lr_${year} WHERE status = 'Pending'`);
  const [deliveriesToday] = await db.all(`SELECT COUNT(*) as count FROM lr_${year} WHERE delivered_at >= CURDATE()`);
  const [cashMemos] = await db.all(`SELECT COUNT(*) as count FROM cash_memo_${year}`);

  res.json({
    memoCount: memoCount?.count || 0,
    lrPending: lrPending?.count || 0,
    deliveriesToday: deliveriesToday?.count || 0,
    cashMemos: cashMemos?.count || 0,
    user: req.user.username,
    role: req.user.role,
  });
});

module.exports = router;
