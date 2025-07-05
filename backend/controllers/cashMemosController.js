const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function openDb() {
  return new sqlite3.Database(path.join(__dirname, '../data/ntc.sqlite'));
}

// GET all cash memos for selected FY
function getAllCashMemos(req, res) {
  const FY = req.finYear, db = openDb();
  db.all(
    `SELECT * FROM cash_memo_${FY} ORDER BY created_at DESC`,
    [],
    (err, rows) => {
      db.close();
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
}

// POST (create cash memo)
function createCashMemo(req, res) {
  const { lr_id, hamali, bc, landing, lc, freight = 0, created_by = 'unknown' } = req.body;
  const FY = req.finYear;
  const db = openDb();

  // 1) find max existing cash_memo_no
  db.get(
    `SELECT COALESCE(MAX(cash_memo_no), 0) AS max_no FROM cash_memo_${FY}`,
    [],
    (err, row) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: err.message });
      }
      const nextNo = row.max_no + 1;
      const sql = `
        INSERT INTO cash_memo_${FY}
          (cash_memo_no, lr_id, hamali, bc, landing, lc, freight, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;
      db.run(
        sql,
        [nextNo, lr_id, hamali, bc, landing, lc, freight, created_by],
        function (err2) {
          db.close();
          if (err2) return res.status(500).json({ error: err2.message });
          res.status(201).json({ id: this.lastID, cash_memo_no: nextNo });
        }
      );
    }
  );
}

// PUT /api/cashmemos/:id → update an existing cash memo
function updateCashMemo(req, res) {
  const { hamali, bc, landing, lc, freight = 0, updated_by = 'unknown' } = req.body;
  const FY = req.finYear, db = openDb();
  const sql = `
    UPDATE cash_memo_${FY}
       SET hamali   = ?,
           bc       = ?,
           landing  = ?,
           lc       = ?,
           freight  = ?,
           updated_by   = ?,
           updated_at   = datetime('now')
     WHERE id = ?
  `;
  db.run(sql,
    [hamali, bc, landing, lc, freight, updated_by, req.params.id],
    function(err) {
      db.close();
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Cash memo not found' });
      res.json({ updated: this.changes });
    }
  );
}

module.exports = {
  getAllCashMemos,
  createCashMemo,
  updateCashMemo
};
