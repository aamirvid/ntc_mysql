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
 * Log an audit event, supporting full before/after JSON (and backwards compatible)
 * @param {Object} log
 * @param {string} log.user - Username
 * @param {string} log.action - Action type (create, update, delete, etc)
 * @param {string} log.entity - Table/entity name (lr, memo, cash_memo, etc)
 * @param {string|number} log.entity_no - Business number (LR No, Memo No, etc)
 * @param {number|string} log.year - Financial year
 * @param {Object|null} [log.old_data] - Previous data (object, will be stringified)
 * @param {Object|null} [log.new_data] - New data (object, will be stringified)
 * @param {string} [log.details] - Optional legacy details field
 */
async function logAudit({ user, action, entity, entity_no, year, old_data = null, new_data = null, details = "" }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs
        (user, action, entity, entity_no, year, old_data, new_data, details, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        user,
        action,
        entity,
        entity_no,
        year,
        old_data ? JSON.stringify(old_data) : null,
        new_data ? JSON.stringify(new_data) : null,
        details || ""
      ]
    );
  } catch (err) {
    console.error("Audit log error:", err);
  }
}
module.exports = { logAudit };
