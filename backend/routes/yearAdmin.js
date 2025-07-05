// backend/routes/yearAdmin.js
const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'ntcuser',
  password: process.env.MYSQL_PASSWORD || 'yourpassword',
  database: process.env.MYSQL_DATABASE || 'ntc_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Add new year: create tables
router.post('/add', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { year } = req.body;
  if (!/^\d{4}$/.test(year)) return res.status(400).json({ error: 'Invalid year' });
  try {
    // MEMO table (use same schema as initDb.js)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS memo_${year} (
        id                 INT PRIMARY KEY AUTO_INCREMENT,
        memo_no            VARCHAR(100) NOT NULL UNIQUE,
        memo_date          DATE NOT NULL DEFAULT (CURRENT_DATE),
        arrival_date       DATE NOT NULL,
        arrival_time       TIME,
        truck_no           VARCHAR(50),
        total_lorry_hire   DECIMAL(10,2) NOT NULL,
        advance_lorry_hire DECIMAL(10,2) NOT NULL,
        balance_lorry_hire DECIMAL(10,2) GENERATED ALWAYS AS (total_lorry_hire - advance_lorry_hire) STORED,
        driver_owner       VARCHAR(100),
        created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by         VARCHAR(100),
        updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by         VARCHAR(100)
      )
    `);

    // LR table (use same schema as initDb.js)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lr_${year} (
        id              INT PRIMARY KEY AUTO_INCREMENT,
        memo_id         INT NOT NULL,
        lr_no           VARCHAR(100) NOT NULL UNIQUE,
        lr_date         DATE NOT NULL,
        from_city       VARCHAR(100),
        to_city         VARCHAR(100),
        consignor       VARCHAR(100),
        consignee       VARCHAR(100),
        pkgs            INT,
        content         VARCHAR(100),
        freight_type    VARCHAR(20),
        freight         DECIMAL(10,2),
        weight          DECIMAL(10,2),
        dd_rate         DECIMAL(10,2),
        dd_total        DECIMAL(10,2),
        pm_no           VARCHAR(100),
        refund          DECIMAL(10,2),
        remarks         VARCHAR(255),
        status          VARCHAR(50) DEFAULT 'Pending',
        has_cash_memo   TINYINT DEFAULT 0,
        delivered_by    VARCHAR(100),
        delivered_at    DATETIME,
        created_by      VARCHAR(100),
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by      VARCHAR(100),
        updated_at      DATETIME,
        FOREIGN KEY(memo_id) REFERENCES memo_${year}(id)
      )
    `);

    // CASH MEMO table (use same schema as initDb.js)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cash_memo_${year} (
        id              INT PRIMARY KEY AUTO_INCREMENT,
        cash_memo_no    INT NOT NULL UNIQUE,
        lr_id           INT NOT NULL,
        hamali          DECIMAL(10,2),
        bc              DECIMAL(10,2),
        landing         DECIMAL(10,2),
        lc              DECIMAL(10,2),
        cash_memo_total DECIMAL(10,2),
        created_by      VARCHAR(100),
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by      VARCHAR(100),
        updated_at      DATETIME,
        FOREIGN KEY(lr_id) REFERENCES lr_${year}(id)
      )
    `);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
