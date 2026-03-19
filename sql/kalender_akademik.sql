CREATE TABLE kalender_akademik (
    id SERIAL PRIMARY KEY,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    jam_mulai TIME,
    jam_selesai TIME,
    tipe VARCHAR(50) DEFAULT 'libur',
    keterangan VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tanggal_valid CHECK (tanggal_mulai <= tanggal_selesai),
    CONSTRAINT chk_jam_valid CHECK (
        jam_mulai IS NULL
        OR jam_selesai IS NULL
        OR jam_mulai < jam_selesai
    )
);