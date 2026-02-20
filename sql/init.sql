-- Kerovic Products Table (SQLite / Turso)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,  -- stored in cents, e.g. 1250 = $12.50
  image_url TEXT,
  category TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
