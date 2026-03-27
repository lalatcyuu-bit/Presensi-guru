CREATE TABLE presensi_guru (
  id_presensi SERIAL PRIMARY KEY,
  id_jadwal INT REFERENCES jadwal(id_jadwal),
  tanggal DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) CHECK (status IN ('Hadir', 'Tidak Hadir')),
  foto_bukti TEXT NOT NULL,
  diabsen_oleh INT REFERENCES users(id_user),
  status_approve VARCHAR(20) DEFAULT 'Pending'
    CHECK (status_approve IN ('Pending', 'Approved', 'Rejected')),
  approved_by INT REFERENCES users(id_user),
  catatan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id_jadwal, tanggal)
);

// harus di ubah menjadi null
ALTER TABLE presensi_guru
ALTER COLUMN foto_bukti DROP NOT NULL;