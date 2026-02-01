CREATE TABLE jadwal (
  id_jadwal SERIAL PRIMARY KEY,
  id_kelas INT NOT NULL,
  hari VARCHAR(10) NOT NULL,
  jam_mulai TIME NOT NULL,
  jam_selesai TIME NOT NULL,
  guru JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_jadwal_kelas
    FOREIGN KEY (id_kelas)
    REFERENCES kelas(id)
    ON DELETE CASCADE
);
