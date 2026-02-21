-- =====================================================
-- TABEL: jurusan
-- Menyimpan data jurusan sekolah
-- =====================================================

-- CREATE TABLE
CREATE TABLE IF NOT EXISTS jurusan (
    id SERIAL PRIMARY KEY,
    nama_jurusan VARCHAR(100) NOT NULL,
    kode_jurusan VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_jurusan_kode ON jurusan(kode_jurusan);
CREATE INDEX IF NOT EXISTS idx_jurusan_nama ON jurusan(nama_jurusan);

-- TRIGGER FUNCTION (untuk auto update timestamp)
CREATE OR REPLACE FUNCTION update_jurusan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER
DROP TRIGGER IF EXISTS trg_update_jurusan_timestamp ON jurusan;
CREATE TRIGGER trg_update_jurusan_timestamp
    BEFORE UPDATE ON jurusan
    FOR EACH ROW
    EXECUTE FUNCTION update_jurusan_timestamp();

-- COMMENTS
-- COMMENT ON TABLE jurusan IS 'Tabel untuk menyimpan data jurusan';
-- COMMENT ON COLUMN jurusan.id IS 'Primary key auto increment';
-- COMMENT ON COLUMN jurusan.nama_jurusan IS 'Nama lengkap jurusan (contoh: Rekayasa Perangkat Lunak)';
-- COMMENT ON COLUMN jurusan.kode_jurusan IS 'Kode singkat jurusan (contoh: RPL, TKJ)';

-- SEED DATA
INSERT INTO jurusan (nama_jurusan, kode_jurusan) VALUES
    ('Teknik Komputer dan Jaringan',            'TKJ'),
    ('Rekayasa Perangkat Lunak',                'RPL'),
    ('Akuntansi dan Keuangan Lembaga',          'AKL'),
    ('Otomatisasi dan Tata Kelola Perkantoran', 'OTKP'),
    ('Bisnis Daring dan Pemasaran',             'BDP')
ON CONFLICT (kode_jurusan) DO NOTHING;

-- VERIFY
-- SELECT 'Tabel jurusan berhasil dibuat dengan ' || COUNT(*) || ' data' AS status FROM jurusan;