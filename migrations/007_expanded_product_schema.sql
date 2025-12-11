-- Expand products table with additional fields for admin panel requirements
ALTER TABLE products
ADD COLUMN short_description TEXT,
ADD COLUMN full_description TEXT,
ADD COLUMN sku VARCHAR(100),
ADD COLUMN sale_price DECIMAL(10, 2),
ADD COLUMN cost DECIMAL(10, 2),
ADD COLUMN min_stock_alert INTEGER DEFAULT 0,
ADD COLUMN status VARCHAR(50) DEFAULT 'active',
ADD COLUMN tags TEXT,
ADD COLUMN keywords TEXT,
ADD COLUMN manual_url VARCHAR(500),
ADD COLUMN is_published BOOLEAN DEFAULT TRUE,
ADD COLUMN featured BOOLEAN DEFAULT FALSE,
ADD COLUMN weight DECIMAL(8, 2),
ADD COLUMN dimensions VARCHAR(100),
ADD COLUMN meta_title VARCHAR(255),
ADD COLUMN meta_description TEXT;

-- Create product_images table
CREATE TABLE product_images (
  image_id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  is_main BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create product_files table
CREATE TABLE product_files (
  file_id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create stock_history table
CREATE TABLE stock_history (
  history_id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES users(user_id),
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  change_type VARCHAR(50), -- 'add', 'remove', 'sale', 'adjustment'
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create refunds table
CREATE TABLE refunds (
  refund_id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES users(user_id),
  refund_amount DECIMAL(10, 2) NOT NULL,
  refund_reason TEXT,
  payment_intent_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add payment_status to orders if not exists
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50);

-- Add indexes for performance
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_quantity ON products(quantity);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_admin_logs_action ON admin_logs(action);
CREATE INDEX idx_admin_logs_timestamp ON admin_logs(timestamp);
