CREATE TABLE IF NOT EXISTS app_runtime_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_runtime_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages app runtime config"
ON app_runtime_config
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

