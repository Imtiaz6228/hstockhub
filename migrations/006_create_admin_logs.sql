-- Create admin_logs table
CREATE TABLE admin_logs (
  admin_log_id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES users(user_id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL, -- e.g. 'user', 'product', 'order'
  target_id INTEGER NOT NULL,
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);
