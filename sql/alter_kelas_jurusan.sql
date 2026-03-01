-- =====================================================
-- ALTER TABLE: kelas
-- Menghubungkan kelas ke tabel jurusan via FK
-- Jalankan SETELAH jurusan.sql dan kelas.sql
-- =====================================================

-- 1. Tambah kolom id_jurusan
ALTER TABLE kelas ADD COLUMN IF NOT EXISTS id_jurusan INT;

-- INDEX
CREATE INDEX IF NOT EXISTS idx_kelas_id_jurusan ON kelas(id_jurusan);

-- 2. Isi id_jurusan berdasarkan kolom jurusan yang sudah ada
UPDATE kelas k
SET id_jurusan = j.id
FROM jurusan j
WHERE k.jurusan = j.nama_jurusan;

-- 3. Tambah FK constraint
ALTER TABLE kelas
    ADD CONSTRAINT fk_kelas_jurusan
    FOREIGN KEY (id_jurusan) REFERENCES jurusan(id);

-- 4. Drop kolom jurusan lama
ALTER TABLE kelas DROP COLUMN IF EXISTS jurusan;

-- VERIFY
-- SELECT k.name, k.tingkat, k.id_jurusan, j.kode_jurusan FROM kelas k JOIN jurusan j ON j.id = k.id_jurusan;