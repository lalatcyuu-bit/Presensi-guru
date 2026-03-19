-- =====================================================
-- TABEL: guru
-- Menyimpan data guru dan mapel yang diajar
-- Field mapel: Array ID mapel dalam format JSONB
-- =====================================================

-- CREATE TABLE
CREATE TABLE IF NOT EXISTS guru (
    id_guru SERIAL PRIMARY KEY,
    nama_guru VARCHAR(255) NOT NULL,
    nip VARCHAR(50) UNIQUE,
    mapel JSONB NOT NULL, -- Format: [1, 2, 3] (array of mapel IDs)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- CONSTRAINTS
    CONSTRAINT chk_mapel_not_empty CHECK (jsonb_array_length(mapel) > 0),
    CONSTRAINT chk_mapel_is_array CHECK (jsonb_typeof(mapel) = 'array')
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_guru_nama ON guru(nama_guru);
CREATE INDEX IF NOT EXISTS idx_guru_nip ON guru(nip);
CREATE INDEX IF NOT EXISTS idx_guru_mapel ON guru USING GIN(mapel);

-- TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_guru_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER
DROP TRIGGER IF EXISTS trg_update_guru_timestamp ON guru;
CREATE TRIGGER trg_update_guru_timestamp
    BEFORE UPDATE ON guru
    FOR EACH ROW
    EXECUTE FUNCTION update_guru_timestamp();

-- COMMENTS
-- COMMENT ON TABLE guru IS 'Tabel untuk menyimpan data guru dan mapel yang diajar';
-- COMMENT ON COLUMN guru.id_guru IS 'Primary key auto increment';
-- COMMENT ON COLUMN guru.nama_guru IS 'Nama lengkap guru';
-- COMMENT ON COLUMN guru.nip IS 'Nomor Induk Pegawai (optional)';
-- COMMENT ON COLUMN guru.mapel IS 'Array ID mapel yang diajar dalam format JSONB: [1,2,3]';

-- SEED DATA
INSERT INTO guru (nama_guru, nip, mapel) VALUES 
    ('Pak Budi Setiawan', '198501012010011001', '[1, 2]'::jsonb),           
    ('Bu Ratna Sari', '198703152011012002', '[3]'::jsonb),                 
    ('Pak Agus Wijaya', '199001202012011003', '[4]'::jsonb),                
    ('Bu Dewi Lestari', '198805102013012001', '[5, 6]'::jsonb),             
    ('Pak Rudi Hartono', '199205252014011002', '[7]'::jsonb)              
ON CONFLICT DO NOTHING;

-- VERIFY
-- SELECT 'Tabel guru berhasil dibuat dengan ' || COUNT(*) || ' data' AS status FROM guru;

-- CONTOH QUERY untuk JOIN dengan mapel
-- SELECT 
--   g.id_guru,
--   g.nama_guru,
--   g.nip,
--   COALESCE(
--     json_agg(
--       json_build_object(
--         'id_mapel', m.id_mapel,
--         'nama_mapel', m.nama_mapel
--       )
--     ) FILTER (WHERE m.id_mapel IS NOT NULL),
--     '[]'
--   ) AS mapel_detail
-- FROM guru g
-- LEFT JOIN mapel m ON m.id_mapel = ANY (
--   SELECT jsonb_array_elements_text(g.mapel)::int
-- )
-- GROUP BY g.id_guru;