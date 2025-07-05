const mysql = require('mysql2/promise');

require('dotenv').config();

function getFinancialYearSuffix(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 4 ? y : y - 1;
}

/**
 * Creates all tables for a given financial year if not exists.
 * Also ensures suggestion tables are present (these are NOT year-specific).
 * @param {number} [year]
 */
async function ensureTables(year) {
  const FY = year || getFinancialYearSuffix();
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'ntcuser',
    password: process.env.MYSQL_PASSWORD || 'yourpassword',
    database: process.env.MYSQL_DATABASE || 'ntc_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Memo table for the FY
  await pool.query(`
    CREATE TABLE IF NOT EXISTS memo_${FY} (
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

  // LR table for the FY
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lr_${FY} (
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
      FOREIGN KEY(memo_id) REFERENCES memo_${FY}(id)
    )
  `);

  // Cash memo table for the FY
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cash_memo_${FY} (
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
      FOREIGN KEY(lr_id) REFERENCES lr_${FY}(id)
    )
  `);

  // Suggestion tables (shared for all years)
  await pool.query(`CREATE TABLE IF NOT EXISTS cities (
    id   INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS consignors (
    id   INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS consignees (
    id   INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS contents (
    id   INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS audit_logs (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    user        VARCHAR(100),
    action      VARCHAR(100) NOT NULL,
    entity      VARCHAR(100) NOT NULL,
    entity_id   INT NOT NULL,
    year        INT,
    details     TEXT,
    timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS delivery_persons (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL UNIQUE,
      is_active TINYINT DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user'
    )
  `);

  // App-wide keys table for delete key and other security keys in the future
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_keys (
      id INT PRIMARY KEY AUTO_INCREMENT,
      key_type VARCHAR(100) NOT NULL UNIQUE,
      key_hash VARCHAR(255) NOT NULL,
      usage_limit INT NOT NULL,
      usage_count INT NOT NULL DEFAULT 0,
      updated_by VARCHAR(100),
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.end();
}

module.exports = { ensureTables };
