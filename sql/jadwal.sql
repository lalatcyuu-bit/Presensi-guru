-- =====================================================
-- TABEL: jadwal
-- Menyimpan jadwal pelajaran per kelas
-- Field guru: Object berisi data guru & mapel dalam JSONB
-- DEPENDENCIES: kelas (harus dibuat dulu!)
-- =====================================================

-- CREATE TABLE
CREATE TABLE IF NOT EXISTS jadwal (
    id_jadwal SERIAL PRIMARY KEY,
    id_kelas INTEGER NOT NULL,
    hari VARCHAR(20) NOT NULL,
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    guru JSONB NOT NULL, -- Format: {id_guru, nama_guru, mapel: {id_mapel, nama_mapel}}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- FOREIGN KEYS
    CONSTRAINT fk_jadwal_kelas FOREIGN KEY (id_kelas) 
        REFERENCES kelas(id) ON DELETE RESTRICT,
    
    -- CONSTRAINTS
    CONSTRAINT chk_jam_valid CHECK (jam_mulai < jam_selesai),
    CONSTRAINT chk_hari_valid CHECK (
        hari IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu')
    ),
    CONSTRAINT chk_guru_is_object CHECK (jsonb_typeof(guru) = 'object')
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_jadwal_kelas ON jadwal(id_kelas);
CREATE INDEX IF NOT EXISTS idx_jadwal_hari ON jadwal(hari);
CREATE INDEX IF NOT EXISTS idx_jadwal_jam_mulai ON jadwal(jam_mulai);
CREATE INDEX IF NOT EXISTS idx_jadwal_guru ON jadwal USING GIN(guru);

-- TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_jadwal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER
DROP TRIGGER IF EXISTS trg_update_jadwal_timestamp ON jadwal;
CREATE TRIGGER trg_update_jadwal_timestamp
    BEFORE UPDATE ON jadwal
    FOR EACH ROW
    EXECUTE FUNCTION update_jadwal_timestamp();

-- COMMENTS
-- COMMENT ON TABLE jadwal IS 'Tabel untuk menyimpan jadwal pelajaran per kelas';
-- COMMENT ON COLUMN jadwal.id_jadwal IS 'Primary key auto increment';
-- COMMENT ON COLUMN jadwal.id_kelas IS 'Foreign key ke tabel kelas';
-- COMMENT ON COLUMN jadwal.hari IS 'Hari jadwal (Senin - Minggu)';
-- COMMENT ON COLUMN jadwal.jam_mulai IS 'Jam mulai pelajaran (format TIME)';
-- COMMENT ON COLUMN jadwal.jam_selesai IS 'Jam selesai pelajaran (format TIME)';
-- COMMENT ON COLUMN jadwal.guru IS 'Data guru dan mapel dalam format JSONB';

-- SEED DATA - XII RPL 1 HARI SENIN
INSERT INTO jadwal (id_kelas, hari, jam_mulai, jam_selesai, guru) VALUES 
    (1, 'Senin', '07:00:00', '08:30:00', 
     '{"id_guru": 1, "nama_guru": "Pak Budi Setiawan", "mapel": {"id_mapel": 1, "nama_mapel": "Pemrograman Web"}}'::jsonb),
    
    (1, 'Senin', '08:30:00', '10:00:00', 
     '{"id_guru": 1, "nama_guru": "Pak Budi Setiawan", "mapel": {"id_mapel": 2, "nama_mapel": "Basis Data"}}'::jsonb),
    
    (1, 'Senin', '10:15:00', '11:45:00', 
     '{"id_guru": 3, "nama_guru": "Pak Agus Wijaya", "mapel": {"id_mapel": 4, "nama_mapel": "Matematika"}}'::jsonb),
    
    (1, 'Senin', '12:30:00', '14:00:00', 
     '{"id_guru": 4, "nama_guru": "Bu Dewi Lestari", "mapel": {"id_mapel": 5, "nama_mapel": "Bahasa Indonesia"}}'::jsonb)
ON CONFLICT DO NOTHING;

-- SEED DATA - XII RPL 1 HARI SELASA
INSERT INTO jadwal (id_kelas, hari, jam_mulai, jam_selesai, guru) VALUES 
    (1, 'Selasa', '07:00:00', '08:30:00', 
     '{"id_guru": 2, "nama_guru": "Bu Ratna Sari", "mapel": {"id_mapel": 3, "nama_mapel": "Pemrograman Mobile"}}'::jsonb),
    
    (1, 'Selasa', '08:30:00', '10:00:00', 
     '{"id_guru": 5, "nama_guru": "Pak Rudi Hartono", "mapel": {"id_mapel": 7, "nama_mapel": "Jaringan Komputer"}}'::jsonb)
ON CONFLICT DO NOTHING;

-- VERIFY
-- SELECT 'Tabel jadwal berhasil dibuat dengan ' || COUNT(*) || ' data' AS status FROM jadwal;

-- CONTOH STRUKTUR JSONB untuk field guru:
-- {
--   "id_guru": 1,
--   "nama_guru": "Pak Budi Setiawan",
--   "mapel": {
--     "id_mapel": 1,
--     "nama_mapel": "Pemrograman Web"
--   }
-- }