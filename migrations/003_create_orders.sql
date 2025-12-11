-- Create orders table
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');

CREATE TABLE orders (
  order_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id),
  guest_email VARCHAR(255),
  shipping_address JSONB,
  billing_address JSONB,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_id VARCHAR(255), -- Stripe payment intent id
  status order_status DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
