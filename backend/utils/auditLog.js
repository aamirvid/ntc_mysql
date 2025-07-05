// backend/utils/auditLog.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'ntcuser',
  password: process.env.MYSQL_PASSWORD || 'yourpassword',
  database: process.env.MYSQL_DATABASE || 'ntc_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Log an audit event.
 * @param {Object} log
 * @param {string} log.user - Username
 * @param {string} log.action - Action type (create, update, delete)
 * @param {string} log.entity - Table/entity name (lr, memo, cash_memo, etc)
 * @param {number} log.entity_id - Entity's id
 * @param {number} log.year - Financial year
 * @param {string} [log.details] - Optional JSON/details string
 */
async function logAudit({ user, action, entity, entity_id, year, details = "" }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user, action, entity, entity_id, year, details) VALUES (?, ?, ?, ?, ?, ?)`,
      [user, action, entity, entity_id, year, details]
    );
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

module.exports = { logAudit };
