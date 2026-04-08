-- =====================================================
-- TABEL: presensi_guru
-- Menyimpan data presensi guru yang diinput oleh KM
-- DEPENDENCIES: jadwal, users (harus dibuat dulu!)
-- =====================================================

-- CREATE TABLE
CREATE TABLE IF NOT EXISTS presensi_guru (
    id_presensi SERIAL PRIMARY KEY,
    id_jadwal INTEGER NOT NULL,
    tanggal DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL,
    foto_bukti TEXT,
    diabsen_oleh INTEGER NOT NULL,
    memberikan_tugas BOOLEAN,
    catatan TEXT,
    status_approve VARCHAR(20) DEFAULT 'Pending',
    approved_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- FOREIGN KEYS
    CONSTRAINT fk_presensi_jadwal FOREIGN KEY (id_jadwal) 
        REFERENCES jadwal(id_jadwal) ON DELETE CASCADE,
    CONSTRAINT fk_presensi_diabsen FOREIGN KEY (diabsen_oleh) 
        REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_presensi_approved FOREIGN KEY (approved_by) 
        REFERENCES users(id) ON DELETE SET NULL,
    
    -- CONSTRAINTS
    CONSTRAINT chk_status_valid CHECK (
        status IN ('Hadir', 'Tidak Hadir')
    ),
    CONSTRAINT chk_approve_valid CHECK (
        status_approve IN ('Pending', 'Approved', 'Rejected')
    ),
    
    -- Prevent duplicate presensi untuk jadwal yang sama di hari yang sama
    CONSTRAINT uniq_presensi_jadwal_tanggal UNIQUE (id_jadwal, tanggal)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_presensi_jadwal ON presensi_guru(id_jadwal);
CREATE INDEX IF NOT EXISTS idx_presensi_tanggal ON presensi_guru(tanggal);
CREATE INDEX IF NOT EXISTS idx_presensi_status_approve ON presensi_guru(status_approve);
CREATE INDEX IF NOT EXISTS idx_presensi_diabsen ON presensi_guru(diabsen_oleh);
CREATE INDEX IF NOT EXISTS idx_presensi_approved_by ON presensi_guru(approved_by);
CREATE INDEX IF NOT EXISTS idx_presensi_status ON presensi_guru(status);

-- TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_presensi_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER
DROP TRIGGER IF EXISTS trg_update_presensi_timestamp ON presensi_guru;
CREATE TRIGGER trg_update_presensi_timestamp
    BEFORE UPDATE ON presensi_guru
    FOR EACH ROW
    EXECUTE FUNCTION update_presensi_timestamp();

-- COMMENTS
-- COMMENT ON TABLE presensi_guru IS 'Tabel untuk menyimpan data presensi guru yang diinput oleh KM';
-- COMMENT ON COLUMN presensi_guru.id_presensi IS 'Primary key auto increment';
-- COMMENT ON COLUMN presensi_guru.id_jadwal IS 'Foreign key ke tabel jadwal';
-- COMMENT ON COLUMN presensi_guru.tanggal IS 'Tanggal presensi (default hari ini)';
-- COMMENT ON COLUMN presensi_guru.status IS 'Status kehadiran guru (Hadir / Tidak Hadir)';
-- COMMENT ON COLUMN presensi_guru.foto_bukti IS 'URL foto bukti dari Google Drive atau Cloudinary';
-- COMMENT ON COLUMN presensi_guru.diabsen_oleh IS 'Foreign key ke users (KM yang input presensi)';
-- COMMENT ON COLUMN presensi_guru.memberikan_tugas IS 'Boolean: true jika guru memberikan tugas saat tidak hadir';
-- COMMENT ON COLUMN presensi_guru.catatan IS 'Catatan tambahan dari KM';
-- COMMENT ON COLUMN presensi_guru.status_approve IS 'Status approval (Pending / Approved / Rejected)';
-- COMMENT ON COLUMN presensi_guru.approved_by IS 'Foreign key ke users (Piket/Admin yang approve)';

-- SEED DATA (OPTIONAL - Kosongkan jika tidak perlu sample presensi)
-- Biasanya tabel presensi tidak perlu seed data karena akan diisi saat runtime

-- VERIFY
-- SELECT 'Tabel presensi_guru berhasil dibuat' AS status;
-- SELECT 'CATATAN: Tabel ini kosong, akan diisi oleh KM saat runtime' AS info;

ALTER TABLE presensi_guru
ADD COLUMN is_opened_by_admin BOOLEAN DEFAULT false;