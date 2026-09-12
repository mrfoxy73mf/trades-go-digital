CREATE TABLE IF NOT EXISTS safework_orders (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, input_json TEXT NOT NULL,
 amount INTEGER NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('test','live')),
 session_id TEXT UNIQUE, checkout_url TEXT, status TEXT NOT NULL DEFAULT 'unpaid',
 document_html TEXT, attempts INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0,
 lease_id TEXT, created_at INTEGER NOT NULL, paid_at INTEGER
);
CREATE TABLE IF NOT EXISTS safework_rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
