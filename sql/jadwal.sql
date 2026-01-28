CREATE TABLE jadwal (
  id_jadwal SERIAL PRIMARY KEY,
  id_user_km INT NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
  id_guru INT NOT NULL REFERENCES guru(id_guru) ON DELETE CASCADE,
  id_mapel INT NOT NULL REFERENCES mapel(id_mapel) ON DELETE CASCADE,
  hari hari_enum NOT NULL,
  jam_mulai TIME NOT NULL,
  jam_selesai TIME NOT NULL
);
