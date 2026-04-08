CREATE TABLE IF NOT EXISTS app_config ( key VARCHAR(100) PRIMARY KEY, value BOOLEAN NOT NULL DEFAULT true );


INSERT INTO app_config (key, value) VALUES ('bulk_approval_enabled', true) ON CONFLICT (key) DO NOTHING;