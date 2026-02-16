-- =====================================================
-- TABEL: users
-- Menyimpan data user (Admin, KM, Piket)
-- DEPENDENCIES: roles, kelas (harus dibuat dulu!)
-- =====================================================

-- CREATE TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    no_hp VARCHAR(20),
    foto_profil TEXT,
    status BOOLEAN DEFAULT true,
    is_profile_complete BOOLEAN DEFAULT false,
    id_role INTEGER NOT NULL,
    id_kelas INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- FOREIGN KEYS
    CONSTRAINT fk_user_role FOREIGN KEY (id_role) 
        REFERENCES roles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_kelas FOREIGN KEY (id_kelas) 
        REFERENCES kelas(id) ON DELETE SET NULL,
    
    -- CONSTRAINTS
    CONSTRAINT chk_username_length CHECK (LENGTH(username) >= 3)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(id_role);
CREATE INDEX IF NOT EXISTS idx_users_kelas ON users(id_kelas);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER
DROP TRIGGER IF EXISTS trg_update_users_timestamp ON users;
CREATE TRIGGER trg_update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_timestamp();

-- COMMENTS
-- COMMENT ON TABLE users IS 'Tabel untuk menyimpan data user dengan berbagai role';
-- COMMENT ON COLUMN users.id IS 'Primary key auto increment';
-- COMMENT ON COLUMN users.name IS 'Nama lengkap user';
-- COMMENT ON COLUMN users.username IS 'Username untuk login (unique, min 3 karakter)';
-- COMMENT ON COLUMN users.password IS 'Password yang sudah di-hash dengan bcrypt';
-- COMMENT ON COLUMN users.no_hp IS 'Nomor HP user (optional)';
-- COMMENT ON COLUMN users.foto_profil IS 'URL foto profil dari Cloudinary';
-- COMMENT ON COLUMN users.status IS 'Status aktif user (true = aktif, false = nonaktif)';
-- COMMENT ON COLUMN users.is_profile_complete IS 'Flag apakah user sudah melengkapi profil';
-- COMMENT ON COLUMN users.id_role IS 'Foreign key ke tabel roles';
-- COMMENT ON COLUMN users.id_kelas IS 'Foreign key ke tabel kelas (hanya untuk role KM)';

-- SEED DATA
-- Password untuk semua user: 'password123'
-- Hash bcrypt: $2b$10$rZ7qGZxH5FKPfZ7qGZxH5OqGZxH5FKPfZ7qGZxH5FKPfZ7qGZxH5O
-- NOTE: Hash ini adalah CONTOH! Di production, generate hash yang benar dengan bcrypt.hash()

-- INSERT INTO users (name, username, password, id_role, id_kelas, is_profile_complete) VALUES 
--     ('Admin Utama', 'admin', '$2b$10$rZ7qGZxH5FKPfZ7qGZxH5OqGZxH5FKPfZ7qGZxH5FKPfZ7qGZxH5O', 1, NULL, true),
--     ('Budi Santoso', 'km_rpl1', '$2b$10$rZ7qGZxH5FKPfZ7qGZxH5OqGZxH5FKPfZ7qGZxH5FKPfZ7qGZxH5O', 2, 1, true),
--     ('Siti Aminah', 'km_rpl2', '$2b$10$rZ7qGZxH5FKPfZ7qGZxH5OqGZxH5FKPfZ7qGZxH5FKPfZ7qGZxH5O', 2, 2, true),
--     ('Ahmad Piket', 'piket1', '$2b$10$rZ7qGZxH5FKPfZ7qGZxH5OqGZxH5FKPfZ7qGZxH5FKPfZ7qGZxH5O', 3, NULL, true)
-- ON CONFLICT (username) DO NOTHING;

-- VERIFY
-- SELECT 'Tabel users berhasil dibuat dengan ' || COUNT(*) || ' data' AS status FROM users;
-- SELECT '  Username: admin, km_rpl1, km_rpl2, piket1' AS info;
-- SELECT '  Password: password123 (untuk semua user)' AS info;