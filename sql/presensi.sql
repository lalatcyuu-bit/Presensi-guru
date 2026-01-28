CREATE TABLE presensi (
  id_presensi SERIAL PRIMARY KEY,
  id_jadwal INT NOT NULL REFERENCES jadwal(id_jadwal) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  status status_presensi NOT NULL,
  bukti_foto TEXT,
  status_approve status_approve DEFAULT 'pending',
  id_user_piket INT REFERENCES users(id_user),
  waktu_input TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  waktu_approve TIMESTAMP
);
