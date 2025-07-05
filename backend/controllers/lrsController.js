const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function openDb() {
  return new sqlite3.Database(path.join(__dirname, '../data/ntc.sqlite'));
}

// GET all L.R.s
function getAllLrs(req, res) {
  const FY = req.finYear, db = openDb();
  db.all(`SELECT * FROM lr_${FY} ORDER BY created_at DESC`, [], (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
}

// POST /api/lrs — create new L.R.
function createLr(req, res) {
  const {
    memo_id, lr_no, lr_date, from_city = '', to_city = '',
    consignor = '', consignee = '', pkgs, content = '',
    freight_type, freight = 0, weight = 0, dd_rate = 0, dd_total = 0,
    pm_no = '', remarks = '', created_by = 'unknown'
  } = req.body;

  const FY = req.finYear, db = openDb();
  const sql = `
    INSERT INTO lr_${FY} (
      memo_id, lr_no, lr_date,
      from_city, to_city,
      consignor, consignee,
      pkgs, content,
      freight_type, freight, weight,
      dd_rate, dd_total,
      pm_no, remarks,
      created_by, created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
  `;
  db.run(sql, [
    memo_id, lr_no, lr_date,
    from_city, to_city,
    consignor, consignee,
    pkgs, content,
    freight_type, freight, weight,
    dd_rate, dd_total,
    pm_no, remarks,
    created_by
  ], function (err) {
    db.close();
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT')
        return res.status(400).json({ error: 'Duplicate LR No' });
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID });
  });
}

// GET /lookup/:lr_no
function lookupLr(req, res) {
  const FY = req.finYear, db = openDb();
  db.get(
    `SELECT lr.*, m.memo_no
       FROM lr_${FY} AS lr
       JOIN memo_${FY} AS m
         ON lr.memo_id = m.id
      WHERE lr.lr_no = ?`,
    [req.params.lr_no],
    (err, row) => {
      db.close();
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'L.R. not found' });
      res.json(row);
    }
  );
}

// PUT /api/lrs/:id — update existing L.R.
function updateLr(req, res) {
  const {
    memo_id, lr_no, lr_date, from_city, to_city,
    consignor, consignee, pkgs, content,
    freight_type, freight = 0, weight = 0, dd_rate = 0, dd_total = 0,
    pm_no = '', remarks = '', updated_by = 'unknown'
  } = req.body;

  const FY = req.finYear, db = openDb();
  const sql = `
    UPDATE lr_${FY} SET
      memo_id=?, lr_no=?, lr_date=?,
      from_city=?, to_city=?,
      consignor=?, consignee=?,
      pkgs=?, content=?,
      freight_type=?, freight=?, weight=?,
      dd_rate=?, dd_total=?,
      pm_no=?, remarks=?,
      updated_by=?, updated_at=datetime('now')
    WHERE id=?
  `;
  db.run(sql, [
    memo_id, lr_no, lr_date,
    from_city, to_city,
    consignor, consignee,
    pkgs, content,
    freight_type, freight, weight,
    dd_rate, dd_total,
    pm_no, remarks,
    updated_by,
    req.params.id
  ], function (err) {
    db.close();
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'L.R. not found' });
    res.json({ updated: this.changes });
  });
}

// DELETE /api/lrs/:id
function deleteLr(req, res) {
  const FY = req.finYear, db = openDb();
  db.run(
    `DELETE FROM lr_${FY} WHERE id = ?`,
    [req.params.id],
    function (err) {
      db.close();
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'L.R. not found' });
      res.json({ deleted: this.changes });
    }
  );
}

module.exports = {
  getAllLrs,
  createLr,
  lookupLr,
  updateLr,
  deleteLr
};
