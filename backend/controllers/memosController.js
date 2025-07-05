const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function openDb() {
  return new sqlite3.Database(path.join(__dirname, '../data/ntc.sqlite'));
}

// GET all memos
function getAllMemos(req, res) {
  const FY = req.finYear, db = openDb();
  db.all(`SELECT * FROM memo_${FY} ORDER BY created_at DESC`, [], (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
}

// GET one memo by ID
function getMemoById(req, res) {
  const FY = req.finYear, db = openDb();
  db.get(`SELECT * FROM memo_${FY} WHERE id = ?`, [req.params.id], (err, row) => {
    db.close();
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Memo not found' });
    res.json(row);
  });
}

// POST /api/memos — create new
function createMemo(req, res) {
  const {
    memo_no, memo_date, arrival_date,
    truck_no = '', total_lorry_hire, advance_lorry_hire, driver_owner = ''
  } = req.body;

  const FY = req.finYear, db = openDb();
  const sql = `
    INSERT INTO memo_${FY}
      (memo_no, memo_date, arrival_date, truck_no,
       total_lorry_hire, advance_lorry_hire, driver_owner, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,datetime('now'))
  `;
  db.run(sql, [
    memo_no, memo_date, arrival_date,
    truck_no, total_lorry_hire,
    advance_lorry_hire, driver_owner
  ], function (err) {
    db.close();
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT')
        return res.status(400).json({ error: 'memo_no must be unique' });
      return res.status(500).json({ error: err.message });
    }
    // return the newly created row
    const id = this.lastID;
    openDb().get(`SELECT * FROM memo_${FY} WHERE id = ?`, [id], (e, row) => {
      if (e) return res.status(500).json({ error: e.message });
      res.status(201).json(row);
    });
  });
}

// PUT /api/memos/:id — update existing
function updateMemo(req, res) {
  const {
    memo_no, memo_date, arrival_date,
    truck_no = '', total_lorry_hire, advance_lorry_hire, driver_owner = ''
  } = req.body;

  const FY = req.finYear, db = openDb();
  const sql = `
    UPDATE memo_${FY}
    SET
      memo_no = ?,
      memo_date = ?,
      arrival_date = ?,
      truck_no = ?,
      total_lorry_hire = ?,
      advance_lorry_hire = ?,
      driver_owner = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `;
  db.run(sql, [
    memo_no, memo_date, arrival_date,
    truck_no, total_lorry_hire,
    advance_lorry_hire, driver_owner,
    req.params.id
  ], function (err) {
    db.close();
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT')
        return res.status(400).json({ error: 'memo_no must be unique' });
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0)
      return res.status(404).json({ error: 'Memo not found' });
    openDb().get(`SELECT * FROM memo_${FY} WHERE id = ?`, [req.params.id], (e, row) => {
      if (e) return res.status(500).json({ error: e.message });
      res.json(row);
    });
  });
}

// DELETE /api/memos/:id
function deleteMemo(req, res) {
  const FY = req.finYear, db = openDb();
  db.run(`DELETE FROM memo_${FY} WHERE id = ?`, [req.params.id], function (err) {
    db.close();
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ error: 'Memo not found' });
    res.json({ deleted: this.changes });
  });
}

// GET /api/memos/lookup/:memo_no
function lookupMemo(req, res) {
  const FY = req.finYear, db = openDb();
  db.get(`SELECT * FROM memo_${FY} WHERE memo_no = ?`, [req.params.memo_no], (err, memoRow) => {
    if (err) { db.close(); return res.status(500).json({ error: err.message }); }
    if (!memoRow) { db.close(); return res.status(404).json({ error: 'Memo not found' }); }

    db.all(`SELECT * FROM lr_${FY} WHERE memo_id = ?`, [memoRow.id], (err2, lrs) => {
      if (err2) { db.close(); return res.status(500).json({ error: err2.message }); }
      const ids = lrs.map(l => l.id).join(',') || 'NULL';
      db.all(`SELECT * FROM cash_memo_${FY} WHERE lr_id IN (${ids})`, [], (err3, cashRows) => {
        db.close();
        if (err3) return res.status(500).json({ error: err3.message });
        res.json({ memo: memoRow, lrs, cashMemos: cashRows });
      });
    });
  });
}

module.exports = {
  getAllMemos,
  getMemoById,
  createMemo,
  updateMemo,
  deleteMemo,
  lookupMemo
};
