CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  account_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  business_name TEXT,
  phone TEXT,
  category TEXT NOT NULL,
  page_name TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  steps TEXT,
  preferred_reply TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('standard', 'emergency')),
  status TEXT NOT NULL DEFAULT 'new',
  screenshot_keys TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_priority_created
  ON support_tickets(priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_email
  ON support_tickets(account_email);
