const pool = require('./db');

class AdminLog {
  // Log admin action
  static async log({ admin_id, action, target_type, target_id, details }) {
    const query = `
      INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;
    const values = [admin_id, action, target_type, target_id, JSON.stringify(details) || null];
    await pool.query(query, values);
  }

  // Get logs by admin
  static async getByAdmin(admin_id, limit = 100, offset = 0) {
    const query = 'SELECT * FROM admin_logs WHERE admin_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3';
    const result = await pool.query(query, [admin_id, limit, offset]);
    return result.rows;
  }

  // Get all logs (for super admin)
  static async getAll(limit = 100, offset = 0) {
    const query = 'SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT $1 OFFSET $2';
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  // Get logs by date range
  static async getByDateRange(startDate, endDate, limit = 100, offset = 0) {
    const query = 'SELECT * FROM admin_logs WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC LIMIT $3 OFFSET $4';
    const result = await pool.query(query, [startDate, endDate, limit, offset]);
    return result.rows;
  }
}

module.exports = AdminLog;
