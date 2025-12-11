const pool = require('./db');

class Coupon {
  // Create a new coupon
  static async create({ code, discount_type, discount_value, max_uses, expires_at, is_active = true }) {
    const query = `
      INSERT INTO coupons (code, discount_type, discount_value, max_uses, uses, expires_at, is_active, created_at)
      VALUES ($1, $2, $3, $4, 0, $5, $6, NOW())
      RETURNING coupon_id, code, discount_type, discount_value, max_uses, uses, expires_at, is_active
    `;
    const values = [code, discount_type, discount_value, max_uses, expires_at, is_active];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Find coupon by code
  static async findByCode(code) {
    const query = `SELECT * FROM coupons WHERE code = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())`;
    const result = await pool.query(query, [code]);
    return result.rows[0];
  }

  // Apply coupon (increment uses)
  static async apply(coupon_id) {
    const query = `UPDATE coupons SET uses = uses + 1 WHERE coupon_id = $1 AND (max_uses IS NULL OR uses < max_uses)`;
    const result = await pool.query(query, [coupon_id]);
    return result.rowCount > 0;
  }

  // Get all coupons (for admin)
  static async getAll(limit = 50, offset = 0) {
    const query = 'SELECT * FROM coupons ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  // Update coupon
  static async update(coupon_id, updates) {
    const fields = [];
    const values = [];
    let index = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${index++}`);
      values.push(updates[key]);
    });

    const query = `
      UPDATE coupons
      SET ${fields.join(', ')}
      WHERE coupon_id = $${index}
      RETURNING coupon_id, code, discount_type, discount_value, max_uses, uses, expires_at, is_active
    `;
    values.push(coupon_id);
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Delete coupon
  static async delete(coupon_id) {
    const query = 'DELETE FROM coupons WHERE coupon_id = $1';
    await pool.query(query, [coupon_id]);
  }

  // Validate coupon
  static async validate(code) {
    const coupon = await this.findByCode(code);
    if (!coupon) return null;
    if (coupon.max_uses && coupon.uses >= coupon.max_uses) return null;
    return coupon;
  }

  // Calculate discount
  static calculateDiscount(coupon, total) {
    let discount = 0;
    if (coupon.discount_type === 'percent') {
      discount = (total * coupon.discount_value) / 100;
    } else if (coupon.discount_type === 'fixed') {
      discount = Math.min(coupon.discount_value, total);
    }
    return discount;
  }
}

module.exports = Coupon;
