CREATE TABLE IF NOT EXISTS safework_feedback (
  order_id TEXT PRIMARY KEY,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comments TEXT NOT NULL DEFAULT '',
  contact_allowed INTEGER NOT NULL DEFAULT 0 CHECK (contact_allowed IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES safework_orders(id) ON DELETE CASCADE
);

