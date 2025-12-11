const pool = require('./db');
const Product = require('./product');

class Order {
  // Create a new order
  static async create({ user_id, guest_email, shipping_address, billing_address, total_amount, payment_id }) {
    const query = `
      INSERT INTO orders (user_id, guest_email, shipping_address, billing_address, total_amount, payment_id, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
      RETURNING order_id, user_id, guest_email, shipping_address, billing_address, total_amount, payment_id, status, created_at
    `;
    const values = [user_id || null, guest_email || null, JSON.stringify(shipping_address), JSON.stringify(billing_address), total_amount, payment_id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Add order items
  static async addItems(order_id, items) {
    const values = items.map(item => `(${order_id}, ${item.product_id}, ${item.quantity}, ${item.price})`).join(', ');
    const query = `
      INSERT INTO order_items (order_id, product_id, quantity, price)
      VALUES ${values}
    `;
    await pool.query(query);
  }

  // Find order by ID
  static async findById(order_id) {
    const query = 'SELECT * FROM orders WHERE order_id = $1';
    const result = await pool.query(query, [order_id]);
    if (result.rows.length === 0) return null;

    const order = result.rows[0];
    const itemsQuery = 'SELECT oi.*, p.name, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.product_id WHERE oi.order_id = $1';
    const itemsResult = await pool.query(itemsQuery, [order_id]);
    order.items = itemsResult.rows;
    return order;
  }

  // Update order status
  static async updateStatus(order_id, status) {
    const query = 'UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2 RETURNING *';
    const result = await pool.query(query, [status, order_id]);
    return result.rows[0];
  }

  // Get orders by user or all for admin
  static async getByUser(user_id, limit = 50, offset = 0) {
    const query = 'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    const result = await pool.query(query, [user_id, limit, offset]);
    return result.rows;
  }

  // Get all orders (for admin)
  static async getAll(limit = 50, offset = 0, status = null) {
    let query = 'SELECT * FROM orders WHERE 1=1';
    const values = [];
    let index = 1;

    if (status) {
      query += ` AND status = $${index++}`;
      values.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${index} OFFSET $${index + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Calculate total revenue
  static async getTotalRevenue(startDate = null, endDate = null) {
    let query = "SELECT SUM(total_amount) AS revenue FROM orders WHERE status = 'completed'";
    const values = [];

    if (startDate && endDate) {
      query += " AND created_at BETWEEN $1 AND $2";
      values.push(startDate, endDate);
    }

    const result = await pool.query(query, values);
    return result.rows[0].revenue || 0;
  }

  // Get order statistics
  static async getOrderStats() {
    const query = `
      SELECT status, COUNT(*) AS count
      FROM orders
      GROUP BY status
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Update payment status
  static async updatePaymentStatus(order_id, payment_status, payment_intent_id = null) {
    const query = 'UPDATE orders SET payment_status = $1, payment_intent_id = $2, updated_at = NOW() WHERE order_id = $3 RETURNING *';
    const result = await pool.query(query, [payment_status, payment_intent_id, order_id]);
    return result.rows[0];
  }

  // Mark order as delivered with date
  static async markAsDelivered(order_id) {
    const query = "UPDATE orders SET status = 'delivered', delivery_date = NOW(), updated_at = NOW() WHERE order_id = $1 RETURNING *";
    const result = await pool.query(query, [order_id]);
    return result.rows[0];
  }

  // Get orders for admin dashboard stats
  static async getDashboardStats() {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Orders today
    const todayQuery = "SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURRENT_DATE";
    const todayOrders = await pool.query(todayQuery);

    // Orders 7 days
    const sevenDayQuery = "SELECT COUNT(*) as count FROM orders WHERE created_at >= $1";
    const sevenDayOrders = await pool.query(sevenDayQuery, [sevenDaysAgo]);

    // Orders 30 days
    const thirtyDayQuery = "SELECT COUNT(*) as count FROM orders WHERE created_at >= $1";
    const thirtyDayOrders = await pool.query(thirtyDayQuery, [thirtyDaysAgo]);

    // Revenue daily/monthly
    const revenueQuery = `
      SELECT
        SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN total_amount ELSE 0 END) as daily_revenue,
        SUM(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN total_amount ELSE 0 END) as monthly_revenue
      FROM orders
      WHERE status = 'completed'
    `;
    const revenueStats = await pool.query(revenueQuery);

    // Pending orders
    const pendingQuery = "SELECT COUNT(*) as count FROM orders WHERE status = 'pending'";
    const pendingOrders = await pool.query(pendingQuery);

    // Delivered orders
    const deliveredQuery = "SELECT COUNT(*) as count FROM orders WHERE status = 'delivered'";
    const deliveredOrders = await pool.query(deliveredQuery);

    // Recent orders
    const recentQuery = `
      SELECT o.*, u.name as customer_name, u.email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      ORDER BY o.created_at DESC LIMIT 5
    `;
    const recentOrders = await pool.query(recentQuery);

    return {
      todayOrders: todayOrders.rows[0].count,
      sevenDayOrders: sevenDayOrders.rows[0].count,
      thirtyDayOrders: thirtyDayOrders.rows[0].count,
      dailyRevenue: revenueStats.rows[0].daily_revenue || 0,
      monthlyRevenue: revenueStats.rows[0].monthly_revenue || 0,
      pendingOrders: pendingOrders.rows[0].count,
      deliveredOrders: deliveredOrders.rows[0].count,
      recentOrders: recentOrders.rows
    };
  }

  // Search orders for admin
  static async searchOrders(searchTerm = '', statusFilter = '', dateFilter = '', limit = 50, offset = 0) {
    let query = `
      SELECT o.*, u.name as customer_name, u.email as customer_email,
             COALESCE(u.name, o.guest_email) as display_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      WHERE 1=1
    `;
    const values = [];
    let index = 1;

    if (searchTerm) {
      query += ` AND (u.name ILIKE $${index} OR u.email ILIKE $${index} OR o.guest_email ILIKE $${index} OR o.order_id::text = $${index})`;
      values.push(`%${searchTerm}%`);
      index += 1;
    }

    if (statusFilter) {
      query += ` AND o.status = $${index}`;
      values.push(statusFilter);
      index += 1;
    }

    if (dateFilter) {
      const today = new Date();
      let startDate;
      switch (dateFilter) {
        case 'today':
          startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
          break;
        case 'week':
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
          break;
        default:
          startDate = null;
      }
      if (startDate) {
        query += ` AND o.created_at >= $${index}`;
        values.push(startDate);
        index += 1;
      }
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${index} OFFSET $${index + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Process refund
  static async processRefund(order_id, refund_amount, reason, admin_id, payment_intent_id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create refund record
      const refundQuery = `
        INSERT INTO refunds (order_id, admin_id, refund_amount, refund_reason, payment_intent_id)
        VALUES ($1, $2, $3, $4, $5) RETURNING *
      `;
      await client.query(refundQuery, [order_id, admin_id, refund_amount, reason, payment_intent_id]);

      // Update order refund status
      const updateQuery = "UPDATE orders SET refund_status = 'refunded', updated_at = NOW() WHERE order_id = $1";
      await client.query(updateQuery, [order_id]);

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Get refunds for an order
  static async getRefunds(order_id) {
    const query = `
      SELECT r.*, u.name as admin_name
      FROM refunds r
      LEFT JOIN users u ON r.admin_id = u.user_id
      WHERE r.order_id = $1
      ORDER BY r.created_at DESC
    `;
    const result = await pool.query(query, [order_id]);
    return result.rows;
  }
}

module.exports = Order;
