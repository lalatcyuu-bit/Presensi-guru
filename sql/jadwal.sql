CREATE TABLE jadwal (
    id SERIAL PRIMARY KEY,
    id_kelas INT NOT NULL,
    id_mapel INT NOT NULL,
    id_guru INT NOT NULL,
    day VARCHAR(10) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    CONSTRAINT fk_jadwal_kelas
        FOREIGN KEY (id_kelas)
        REFERENCES kelas(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_jadwal_mapel
        FOREIGN KEY (id_mapel)
        REFERENCES mapel(id)
        ON DELETE CASCADE
);
