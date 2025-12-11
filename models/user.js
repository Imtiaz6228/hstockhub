const pool = require('./db');
const bcrypt = require('bcryptjs');

class User {
  // Create a new user
  static async create({ email, password, name, is_admin = false }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (email, password, name, is_admin, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING user_id, email, name, is_admin
    `;
    const values = [email, hashedPassword, name, is_admin];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Find user by email
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  // Find user by ID
  static async findById(user_id) {
    const query = 'SELECT user_id, email, name, is_admin, created_at FROM users WHERE user_id = $1';
    const result = await pool.query(query, [user_id]);
    return result.rows[0];
  }

  // Update user
  static async update(user_id, updates) {
    const fields = [];
    const values = [];
    let index = 1;

    Object.keys(updates).forEach(key => {
      if (key !== 'user_id') {
        fields.push(`${key} = $${index++}`);
        values.push(updates[key]);
      }
    });

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE user_id = $${index}
      RETURNING user_id, email, name, is_admin
    `;
    values.push(user_id);
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Verify password
  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Get all users (for admin)
  static async getAll(limit = 50, offset = 0) {
    const query = 'SELECT user_id, email, name, is_admin, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  // Delete user
  static async delete(user_id) {
    const query = 'DELETE FROM users WHERE user_id = $1';
    await pool.query(query, [user_id]);
  }
}

module.exports = User;
