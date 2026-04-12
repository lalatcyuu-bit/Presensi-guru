CREATE TABLE activity_logs (
  id         SERIAL PRIMARY KEY,
  action     VARCHAR(50)  NOT NULL,
  actor      VARCHAR(100) NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Seed data
INSERT INTO activity_logs (action, actor, created_at) VALUES
  ('disabled', 'Admin', NOW() - INTERVAL '17 minutes'),
  ('enabled',  'Admin', NOW() - INTERVAL '30 minutes');