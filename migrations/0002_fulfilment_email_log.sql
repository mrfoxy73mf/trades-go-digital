CREATE TABLE IF NOT EXISTS fulfilment_email_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  message_kind TEXT NOT NULL CHECK (message_kind IN ('buyer_fulfilment', 'seller_notification')),
  recipient TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (session_id, message_kind),
  FOREIGN KEY (session_id) REFERENCES fulfilment_orders(session_id)
);

CREATE INDEX IF NOT EXISTS idx_fulfilment_email_log_session
  ON fulfilment_email_log(session_id);
