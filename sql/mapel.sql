-- =====================================================
-- TABEL: mapel
-- Menyimpan data mata pelajaran
-- =====================================================

-- CREATE TABLE
CREATE TABLE IF NOT EXISTS mapel (
    id_mapel SERIAL PRIMARY KEY,
    nama_mapel VARCHAR(255) NOT NULL,
    kode_mapel VARCHAR(20) NOT NULL UNIQUE,
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- CONSTRAINTS
    CONSTRAINT chk_kode_mapel_uppercase CHECK (kode_mapel = UPPER(kode_mapel))
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_mapel_status ON mapel(status);
CREATE INDEX IF NOT EXISTS idx_mapel_kode ON mapel(kode_mapel);
CREATE INDEX IF NOT EXISTS idx_mapel_nama ON mapel(nama_mapel);

-- TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_mapel_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER
DROP TRIGGER IF EXISTS trg_update_mapel_timestamp ON mapel;
CREATE TRIGGER trg_update_mapel_timestamp
    BEFORE UPDATE ON mapel
    FOR EACH ROW
    EXECUTE FUNCTION update_mapel_timestamp();

-- COMMENTS
-- COMMENT ON TABLE mapel IS 'Tabel untuk menyimpan data mata pelajaran';
-- COMMENT ON COLUMN mapel.id_mapel IS 'Primary key auto increment';
-- COMMENT ON COLUMN mapel.nama_mapel IS 'Nama mata pelajaran (contoh: Pemrograman Web)';
-- COMMENT ON COLUMN mapel.kode_mapel IS 'Kode mata pelajaran (contoh: PWEB) - harus uppercase';
-- COMMENT ON COLUMN mapel.status IS 'Status aktif mapel (true = aktif, false = nonaktif)';

-- SEED DATA
INSERT INTO mapel (nama_mapel, kode_mapel, status) VALUES 
    ('Pemrograman Web', 'PWEB', true),
    ('Basis Data', 'BD', true),
    ('Pemrograman Mobile', 'PMOB', true),
    ('Matematika', 'MTK', true),
    ('Bahasa Indonesia', 'BIND', true),
    ('Bahasa Inggris', 'BING', true),
    ('Jaringan Komputer', 'JARKOM', true)
ON CONFLICT (kode_mapel) DO NOTHING;

-- VERIFY
-- SELECT 'Tabel mapel berhasil dibuat dengan ' || COUNT(*) || ' data' AS status FROM mapel;