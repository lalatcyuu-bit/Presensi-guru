CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    id_role INT NOT NULL,
    id_kelas INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_role
        FOREIGN KEY (id_role)
        REFERENCES roles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_class
        FOREIGN KEY (id_kelas)
        REFERENCES kelas(id)
        ON DELETE SET NULL
);

ALTER TABLE users
ADD COLUMN no_hp VARCHAR(20);
ADD COLUMN foto_profil TEXT; 