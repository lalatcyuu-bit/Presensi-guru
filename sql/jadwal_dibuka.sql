-- Tabel untuk tracking jadwal yang dibuka admin per tanggal
-- Pakai tabel terpisah karena jadwal bersifat weekly recurring,
-- satu jadwal bisa dibuka untuk beberapa tanggal berbeda
CREATE TABLE IF NOT EXISTS jadwal_dibuka (
    id SERIAL PRIMARY KEY,
    id_jadwal INT NOT NULL REFERENCES jadwal(id_jadwal) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    opened_by INT,
    opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (id_jadwal, tanggal)
);

CREATE INDEX IF NOT EXISTS idx_jadwal_dibuka_jadwal ON jadwal_dibuka (id_jadwal);

CREATE INDEX IF NOT EXISTS idx_jadwal_dibuka_tanggal ON jadwal_dibuka (tanggal);