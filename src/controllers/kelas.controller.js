const pool = require('../db');
const XLSX = require('xlsx');

/* =======================
   CREATE KELAS
======================= */
exports.createKelas = async (req, res) => {
    try {
        const { name, tingkat, id_jurusan } = req.body;

        if (!name || !tingkat || !id_jurusan) {
            return res.status(400).json({ message: 'Data tidak lengkap' });
        }

        const validTingkat = ['X', 'XI', 'XII'];
        if (!validTingkat.includes(tingkat)) {
            return res.status(400).json({ message: 'Tingkat tidak valid. Pilih X, XI, atau XII' });
        }

        const cekJurusan = await pool.query(
            `SELECT id FROM jurusan WHERE id = $1`,
            [id_jurusan]
        );
        if (cekJurusan.rowCount === 0) {
            return res.status(404).json({ message: 'Jurusan tidak ditemukan' });
        }

        const cekKelas = await pool.query(
            `SELECT id FROM kelas WHERE name = $1`,
            [name]
        );
        if (cekKelas.rowCount > 0) {
            return res.status(400).json({ message: 'Nama kelas sudah dipakai' });
        }

        const result = await pool.query(
            `INSERT INTO kelas (name, tingkat, id_jurusan)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [name, tingkat, id_jurusan]
        );

        res.status(201).json({
            message: 'Kelas berhasil dibuat',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('CREATE KELAS ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/* =======================
   GET ALL KELAS
   Query params:
   - ?search=      cari nama kelas (case-insensitive)
   - ?tingkat=     filter X | XI | XII
   - ?id_jurusan=  filter by jurusan
   - ?all=true     ambil semua tanpa pagination (untuk dropdown)
   - ?page=        halaman (default 1)
   - ?limit=       item per halaman (default 10)
======================= */
exports.getKelas = async (req, res) => {
    try {
        const search = req.query.search || null;
        const tingkat = req.query.tingkat || null;
        const id_jurusan = req.query.id_jurusan ? parseInt(req.query.id_jurusan, 10) : null;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
        const offset = (page - 1) * limit;

        const params = [];
        const where = [];

        if (search) {
            params.push(`%${search}%`);
            where.push(`k.name ILIKE $${params.length}`);
        }

        if (tingkat) {
            params.push(tingkat);
            where.push(`k.tingkat = $${params.length}`);
        }

        if (id_jurusan) {
            params.push(id_jurusan);
            where.push(`k.id_jurusan = $${params.length}`);
        }

        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        const baseFrom = `
            FROM kelas k
            LEFT JOIN jurusan j ON j.id = k.id_jurusan
            ${whereClause}
        `;

        // Ambil semua tanpa pagination (untuk dropdown)
        if (req.query.all === 'true') {
            const result = await pool.query(
                `SELECT
                    k.id,
                    k.name,
                    k.tingkat,
                    k.id_jurusan,
                    j.nama_jurusan,
                    j.kode_jurusan
                 ${baseFrom}
                 ORDER BY k.tingkat ASC, k.name ASC`,
                params
            );
            return res.json({ data: result.rows });
        }

        // Hitung total untuk pagination
        const countResult = await pool.query(
            `SELECT COUNT(*) AS total ${baseFrom}`,
            params
        );
        const total = parseInt(countResult.rows[0].total, 10);
        const totalPages = Math.ceil(total / limit);

        // Ambil data dengan pagination
        params.push(limit);
        const limitIndex = params.length;
        params.push(offset);
        const offsetIndex = params.length;

        const result = await pool.query(
            `SELECT
                k.id,
                k.name,
                k.tingkat,
                k.id_jurusan,
                j.nama_jurusan,
                j.kode_jurusan
             ${baseFrom}
             ORDER BY k.id DESC
             LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
            params
        );

        res.json({
            data: result.rows,
            pagination: {
                page,
                perPage: limit,
                totalItems: total,
                totalPages
            }
        });
    } catch (err) {
        console.error('GET KELAS ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/* =======================
   GET KELAS BY ID
======================= */
exports.getKelasById = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                k.id,
                k.name,
                k.tingkat,
                k.id_jurusan,
                j.nama_jurusan,
                j.kode_jurusan
             FROM kelas k
             LEFT JOIN jurusan j ON j.id = k.id_jurusan
             WHERE k.id = $1`,
            [req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Kelas tidak ditemukan' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('GET KELAS BY ID ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/* =======================
   UPDATE KELAS
======================= */
exports.updateKelas = async (req, res) => {
    try {
        const { name, tingkat, id_jurusan } = req.body;
        const { id } = req.params;

        if (!name || !tingkat || !id_jurusan) {
            return res.status(400).json({ message: 'Data tidak lengkap' });
        }

        const validTingkat = ['X', 'XI', 'XII'];
        if (!validTingkat.includes(tingkat)) {
            return res.status(400).json({ message: 'Tingkat tidak valid. Pilih X, XI, atau XII' });
        }

        const cekJurusan = await pool.query(
            `SELECT id FROM jurusan WHERE id = $1`,
            [id_jurusan]
        );
        if (cekJurusan.rowCount === 0) {
            return res.status(404).json({ message: 'Jurusan tidak ditemukan' });
        }

        const cekNama = await pool.query(
            `SELECT id FROM kelas WHERE name = $1 AND id != $2`,
            [name, id]
        );
        if (cekNama.rowCount > 0) {
            return res.status(400).json({ message: 'Nama kelas sudah dipakai' });
        }

        const result = await pool.query(
            `UPDATE kelas
             SET name = $1, tingkat = $2, id_jurusan = $3
             WHERE id = $4
             RETURNING *`,
            [name, tingkat, id_jurusan, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Kelas tidak ditemukan' });
        }

        res.json({
            message: 'Kelas berhasil diupdate',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('UPDATE KELAS ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/* =======================
   DELETE KELAS
======================= */
exports.deleteKelas = async (req, res) => {
    try {
        const cekUsers = await pool.query(
            `SELECT id FROM users WHERE id_kelas = $1 LIMIT 1`,
            [req.params.id]
        );
        if (cekUsers.rowCount > 0) {
            return res.status(400).json({
                message: 'Kelas tidak bisa dihapus, masih ada user yang terdaftar'
            });
        }

        const cekJadwal = await pool.query(
            `SELECT id_jadwal FROM jadwal WHERE id_kelas = $1 LIMIT 1`,
            [req.params.id]
        );
        if (cekJadwal.rowCount > 0) {
            return res.status(400).json({
                message: 'Kelas tidak bisa dihapus, masih ada jadwal yang terdaftar'
            });
        }

        const result = await pool.query(
            `DELETE FROM kelas WHERE id = $1`,
            [req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Kelas tidak ditemukan' });
        }

        res.json({ message: 'Kelas berhasil dihapus' });
    } catch (err) {
        console.error('DELETE KELAS ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/* =======================
   GET ALL JURUSAN
   Untuk dropdown di form kelas
======================= */
exports.getJurusan = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, nama_jurusan, kode_jurusan
             FROM jurusan
             ORDER BY nama_jurusan ASC`
        );
        res.json({ data: result.rows });
    } catch (err) {
        console.error('GET JURUSAN ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/* =======================
   IMPORT KELAS EXCEL
======================= */
exports.importKelas = async (req, res) => {
    try {

        if (!req.file) {
            return res.status(400).json({ message: 'File wajib diupload' });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        if (!data.length) {
            return res.status(400).json({ message: 'File kosong' });
        }

        const validTingkat = ['X', 'XI', 'XII'];

        const inserted = [];
        const skipped = [];

        for (const row of data) {

            const name = row.name?.trim();
            const tingkat = row.tingkat?.trim();
            const jurusanCode = row.jurusan?.trim();

            // VALIDASI
            if (!name || !tingkat || !jurusanCode) {
                skipped.push({ row, reason: 'Data tidak lengkap' });
                continue;
            }

            if (!validTingkat.includes(tingkat)) {
                skipped.push({ row, reason: 'Tingkat tidak valid' });
                continue;
            }

            // CARI JURUSAN BY KODE
            const jurusanResult = await pool.query(
                `SELECT id FROM jurusan WHERE LOWER(kode_jurusan) = LOWER($1)`,
                [jurusanCode]
            );

            if (!jurusanResult.rowCount) {
                skipped.push({ row, reason: 'Jurusan tidak ditemukan' });
                continue;
            }

            const id_jurusan = jurusanResult.rows[0].id;

            // CEK DUPLIKAT
            const cek = await pool.query(
                `SELECT id FROM kelas WHERE LOWER(name) = LOWER($1)`,
                [name]
            );

            if (cek.rowCount > 0) {
                skipped.push({ row, reason: 'Kelas sudah ada' });
                continue;
            }

            // INSERT
            const result = await pool.query(
                `INSERT INTO kelas (name, tingkat, id_jurusan)
                 VALUES ($1, $2, $3)
                 RETURNING *`,
                [name, tingkat, id_jurusan]
            );

            inserted.push(result.rows[0]);
        }

        res.json({
            message: 'Import selesai',
            total: data.length,
            berhasil: inserted.length,
            gagal: skipped.length,
            inserted,
            skipped
        });

    } catch (err) {
        console.error('IMPORT KELAS ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};