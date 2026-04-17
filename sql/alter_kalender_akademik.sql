ALTER TABLE kalender_akademik
ADD COLUMN target_type VARCHAR(20) DEFAULT 'global',
ADD COLUMN target_value JSONB;