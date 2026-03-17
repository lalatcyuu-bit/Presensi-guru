CREATE TABLE kalender_akademik (
    id SERIAL PRIMARY KEY,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    jam_mulai TIME NULL,
    jam_selesai TIME NULL,
    tipe VARCHAR(50) NOT NULL DEFAULT 'libur',
    keterangan TEXT NULL
);