const pool = require('./db');

class Product {
  // Create a new product
  static async create({
    name,
    description,
    price,
    image_url,
    category,
    quantity,
    short_description,
    full_description,
    sku,
    sale_price,
    cost,
    min_stock_alert,
    status,
    tags,
    keywords,
    manual_url,
    is_published,
    featured,
    weight,
    dimensions,
    meta_title,
    meta_description
  }) {
    const query = `
      INSERT INTO products (
        name, description, price, image_url, category, quantity,
        short_description, full_description, sku, sale_price, cost,
        min_stock_alert, status, tags, keywords, manual_url,
        is_published, featured, weight, dimensions, meta_title, meta_description,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
        NOW(), NOW()
      )
      RETURNING product_id, name, description, price, image_url, category, quantity, status
    `;
    const values = [
      name, description, price, image_url || null, category || null, quantity || 0,
      short_description, full_description, sku, sale_price, cost,
      min_stock_alert || 0, status || 'active', tags, keywords, manual_url,
      is_published === undefined ? true : is_published, featured || false,
      weight, dimensions, meta_title, meta_description
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Find product by ID
  static async findById(product_id) {
    const query = 'SELECT * FROM products WHERE product_id = $1';
    const result = await pool.query(query, [product_id]);
    return result.rows[0];
  }

  // Get all products
  static async getAll(limit = 50, offset = 0, category = null, search = null) {
    let query = 'SELECT * FROM products WHERE 1=1';
    const values = [];
    let index = 1;

    if (category) {
      query += ` AND category = $${index++}`;
      values.push(category);
    }

    if (search) {
      query += ` AND (name ILIKE $${index} OR description ILIKE $${index})`;
      values.push(`%${search}%`);
      index++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${index} OFFSET $${index + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Update product
  static async update(product_id, updates) {
    updates.updated_at = new Date();
    const fields = [];
    const values = [];
    let index = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${index++}`);
      values.push(updates[key]);
    });

    const query = `
      UPDATE products
      SET ${fields.join(', ')}
      WHERE product_id = $${index}
      RETURNING product_id, name, description, price, image_url, category, quantity, updated_at
    `;
    values.push(product_id);
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Delete product
  static async delete(product_id) {
    const query = 'DELETE FROM products WHERE product_id = $1';
    await pool.query(query, [product_id]);
  }

  // Get products by ids (for cart)
  static async getByIds(productIds) {
    const query = `SELECT * FROM products WHERE product_id = ANY($1)`;
    const result = await pool.query(query, [productIds]);
    return result.rows;
  }

  // Check stock and update
  static async checkAndReduceStock(productId, quantity) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const query = 'SELECT quantity FROM products WHERE product_id = $1 FOR UPDATE';
      const result = await client.query(query, [productId]);
      if (result.rows.length === 0) {
        throw new Error('Product not found');
      }
      const currentQuantity = result.rows[0].quantity;
      if (currentQuantity < quantity) {
        throw new Error('Insufficient stock');
      }
      const updateQuery = 'UPDATE products SET quantity = quantity - $2, updated_at = NOW() WHERE product_id = $1';
      await client.query(updateQuery, [productId, quantity]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Stock management with history
  static async updateStock(productId, newQuantity, adminId, changeType, reason) {
    const query = 'SELECT quantity FROM products WHERE product_id = $1';
    const result = await pool.query(query, [productId]);
    const previousQuantity = result.rows[0].quantity;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update product stock
      const updateQuery = 'UPDATE products SET quantity = $1, updated_at = NOW() WHERE product_id = $2';
      await client.query(updateQuery, [newQuantity, productId]);

      // Insert stock history
      const historyQuery = `
        INSERT INTO stock_history (product_id, admin_id, previous_quantity, new_quantity, change_type, reason)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      await client.query(historyQuery, [productId, adminId, previousQuantity, newQuantity, changeType, reason]);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Get stock history
  static async getStockHistory(productId, limit = 50) {
    const query = `
      SELECT sh.*, u.name as admin_name
      FROM stock_history sh
      LEFT JOIN users u ON sh.admin_id = u.user_id
      WHERE sh.product_id = $1
      ORDER BY sh.created_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [productId, limit]);
    return result.rows;
  }

  // Get product images
  static async getImages(productId) {
    const query = 'SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order, created_at';
    const result = await pool.query(query, [productId]);
    return result.rows;
  }

  // Add product image
  static async addImage(productId, imageUrl, altText, isMain = false) {
    const query = 'INSERT INTO product_images (product_id, image_url, alt_text, is_main) VALUES ($1, $2, $3, $4)';
    await pool.query(query, [productId, imageUrl, altText, isMain]);
  }

  // Delete product image
  static async deleteImage(imageId) {
    const query = 'DELETE FROM product_images WHERE image_id = $1';
    await pool.query(query, [imageId]);
  }

  // Get product files
  static async getFiles(productId) {
    const query = 'SELECT * FROM product_files WHERE product_id = $1 ORDER BY created_at';
    const result = await pool.query(query, [productId]);
    return result.rows;
  }

  // Add product file
  static async addFile(productId, fileUrl, fileName, fileType) {
    const query = 'INSERT INTO product_files (product_id, file_url, file_name, file_type) VALUES ($1, $2, $3, $4)';
    await pool.query(query, [productId, fileUrl, fileName, fileType]);
  }

  // Delete product file
  static async deleteFile(fileId) {
    const query = 'DELETE FROM product_files WHERE file_id = $1';
    await pool.query(query, [fileId]);
  }

  // Get low stock alerts
  static async getLowStockAlerts() {
    const query = `
      SELECT product_id, name, quantity, min_stock_alert
      FROM products
      WHERE quantity <= min_stock_alert AND status = 'active'
      ORDER BY quantity ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Soft delete product
  static async softDelete(productId) {
    const query = "UPDATE products SET status = 'deleted', updated_at = NOW() WHERE product_id = $1";
    await pool.query(query, [productId]);
  }

  // Get total count for pagination
  static async getCount(filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM products WHERE 1=1';
    const values = [];
    let index = 1;

    if (filters.category) {
      query += ` AND category = $${index++}`;
      values.push(filters.category);
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query += ` AND status = ANY($${index})`;
        values.push(filters.status);
      } else {
        query += ` AND status = $${index}`;
        values.push(filters.status);
      }
      index++;
    }

    if (filters.search) {
      query += ` AND (name ILIKE $${index} OR description ILIKE $${index} OR sku ILIKE $${index})`;
      values.push(`%${filters.search}%`);
      index++;
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count);
  }

  // Get filtered products
  static async getFiltered(filters = {}, orderBy = 'created_at DESC', limit = 50, offset = 0) {
    let query = 'SELECT * FROM products WHERE 1=1';
    const values = [];
    let index = 1;

    if (filters.category) {
      query += ` AND category = $${index++}`;
      values.push(filters.category);
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query += ` AND status = ANY($${index})`;
        values.push(filters.status);
      } else {
        query += ` AND status = $${index}`;
        values.push(filters.status);
      }
      index++;
    }

    if (filters.search) {
      query += ` AND (name ILIKE $${index} OR description ILIKE $${index} OR sku ILIKE $${index})`;
      values.push(`%${filters.search}%`);
      index++;
    }

    query += ` ORDER BY ${orderBy} LIMIT $${index} OFFSET $${index + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }
}

module.exports = Product;
