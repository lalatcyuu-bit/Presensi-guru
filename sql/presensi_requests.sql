-- ============================================
-- Migration: Tabel presensi_requests
-- Fitur: KM request presensi yang sudah lewat hari + jam 23:59
-- ============================================
CREATE TABLE IF NOT EXISTS presensi_requests (
    id SERIAL PRIMARY KEY,
    id_jadwal INTEGER NOT NULL REFERENCES jadwal(id_jadwal) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    -- tanggal jadwal yang diminta
    id_kelas INTEGER NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    alasan_reject TEXT DEFAULT NULL,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    -- diisi saat Approved, window 24 jam dihitung dari sini
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Satu request per jadwal+tanggal+user (bisa request ulang setelah reject karena status bisa berubah)
    UNIQUE (id_jadwal, tanggal, requested_by)
);

-- Index untuk query admin (list semua request)
CREATE INDEX IF NOT EXISTS idx_presensi_requests_status ON presensi_requests(status);

CREATE INDEX IF NOT EXISTS idx_presensi_requests_id_kelas ON presensi_requests(id_kelas);

CREATE INDEX IF NOT EXISTS idx_presensi_requests_requested_by ON presensi_requests(requested_by);

CREATE INDEX IF NOT EXISTS idx_presensi_requests_tanggal ON presensi_requests(tanggal);

-- ============================================
-- CATATAN LOGIKA MUTUAL EXCLUSION:
-- - Kalau ada presensi_requests (Pending/Approved) untuk id_jadwal+tanggal tertentu
--   → tombol "Buka" di admin di-disable (cek di frontend)
-- - Kalau ada jadwal_dibuka untuk id_jadwal+tanggal tertentu
--   → tombol "Request" di KM tidak muncul (cek di query getPresensi & getRiwayat)
-- ============================================