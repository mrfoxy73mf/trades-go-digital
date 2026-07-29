CREATE TABLE IF NOT EXISTS fulfilment_orders (
  session_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  business_name TEXT,
  fulfilment_type TEXT NOT NULL CHECK (fulfilment_type IN ('licence_download', 'managed_installation')),
  amount_total INTEGER NOT NULL,
  currency TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  access_token TEXT NOT NULL UNIQUE,
  token_expires_at TEXT NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  form_submitted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS installation_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  contact_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  phone TEXT,
  agency_address TEXT,
  preferred_domain TEXT,
  administrator_email TEXT NOT NULL,
  branding_notes TEXT,
  hosting_notes TEXT,
  integration_notes TEXT,
  preferred_start_date TEXT,
  additional_notes TEXT,
  accepted_scope INTEGER NOT NULL CHECK (accepted_scope = 1),
  submitted_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES fulfilment_orders(session_id)
);

CREATE INDEX IF NOT EXISTS idx_fulfilment_orders_email
  ON fulfilment_orders(customer_email);

