CREATE TABLE guru (
  id_guru SERIAL PRIMARY KEY,
  nama_guru VARCHAR(100) NOT NULL,
  nip VARCHAR(30) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE guru_mapel (
  id_guru_mapel SERIAL PRIMARY KEY,
  id_guru INT REFERENCES guru(id_guru) ON DELETE CASCADE,
  id_mapel INT REFERENCES mapel(id_mapel) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id_guru, id_mapel)
);
