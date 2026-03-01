-- =====================================================
-- TABEL: roles
-- Menyimpan data role user (Admin, KM, Piket, KS)
-- =====================================================

-- CREATE TABLE
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- -- COMMENTS
-- COMMENT ON TABLE roles IS 'Tabel untuk menyimpan jenis role user dalam sistem';
-- COMMENT ON COLUMN roles.id IS 'Primary key auto increment';
-- COMMENT ON COLUMN roles.name IS 'Nama role (contoh: Admin, KM, Piket)';

-- SEED DATA
INSERT INTO roles (name) VALUES 
    ('admin'),
    ('km'),        -- Ketua Murid
    ('piket'),
    ('ks')         -- Kepala Sekolah
ON CONFLICT (name) DO NOTHING;

-- VERIFY
-- SELECT 'Tabel roles berhasil dibuat dengan ' || COUNT(*) || ' data' AS status FROM roles;