// backend/controllers/suggestionsController.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function openDb() {
  return new sqlite3.Database(path.join(__dirname, '../data/ntc.sqlite'));
}

// Get suggestions
exports.getSuggestions = (req, res) => {
  const { type } = req.params;
  const { q = '' } = req.query;

  const validTables = ['cities', 'consignors', 'consignees', 'contents'];
  if (!validTables.includes(type)) return res.status(400).json({ error: 'Invalid type' });

  const db = openDb();
  db.all(
    `SELECT name FROM ${type} WHERE name LIKE ? ORDER BY name LIMIT 10`,
    [`${q}%`],
    (err, rows) => {
      db.close();
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(r => r.name));
    }
  );
};

// Add new suggestion
exports.addSuggestion = (req, res) => {
  const { type } = req.params;
  const { name } = req.body;

  const validTables = ['cities', 'consignors', 'consignees', 'contents'];
  if (!validTables.includes(type)) return res.status(400).json({ error: 'Invalid type' });
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });

  const db = openDb();
  db.run(
    `INSERT OR IGNORE INTO ${type} (name) VALUES (?)`,
    [name.trim()],
    function (err) {
      db.close();
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ success: true, id: this.lastID });
    }
  );
};
