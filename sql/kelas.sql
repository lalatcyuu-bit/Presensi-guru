-- =====================================================
-- TABEL: kelas
-- Menyimpan data kelas sekolah
-- =====================================================

-- CREATE TABLE
CREATE TABLE IF NOT EXISTS kelas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    tingkat VARCHAR(20) NOT NULL,
    jurusan VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_kelas_name ON kelas(name);
CREATE INDEX IF NOT EXISTS idx_kelas_tingkat ON kelas(tingkat);

-- TRIGGER FUNCTION (untuk auto update timestamp)
CREATE OR REPLACE FUNCTION update_kelas_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER
DROP TRIGGER IF EXISTS trg_update_kelas_timestamp ON kelas;
CREATE TRIGGER trg_update_kelas_timestamp
    BEFORE UPDATE ON kelas
    FOR EACH ROW
    EXECUTE FUNCTION update_kelas_timestamp();

-- COMMENTS
-- COMMENT ON TABLE kelas IS 'Tabel untuk menyimpan data kelas';
-- COMMENT ON COLUMN kelas.id IS 'Primary key auto increment';
-- COMMENT ON COLUMN kelas.name IS 'Nama kelas (contoh: XII RPL 1)';
-- COMMENT ON COLUMN kelas.tingkat IS 'Tingkat kelas (contoh: X, XI, XII)';
-- COMMENT ON COLUMN kelas.jurusan IS 'Jurusan kelas (contoh: Rekayasa Perangkat Lunak)';

-- SEED DATA
INSERT INTO kelas (name, tingkat, jurusan) VALUES 
    ('XII RPL 1', 'XII', 'Rekayasa Perangkat Lunak'),
    ('XII RPL 2', 'XII', 'Rekayasa Perangkat Lunak'),
    ('XII TKJ 1', 'XII', 'Teknik Komputer dan Jaringan'),
    ('XI RPL 1', 'XI', 'Rekayasa Perangkat Lunak')
ON CONFLICT (name) DO NOTHING;

-- VERIFY
-- SELECT 'Tabel kelas berhasil dibuat dengan ' || COUNT(*) || ' data' AS status FROM kelas;