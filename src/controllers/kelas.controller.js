const pool = require('../db');

/* =======================
   CREATE KELAS
======================= */
exports.createKelas = async (req, res) => {
    try {
        const { name, tingkat, jurusan } = req.body;

        if (!name || !tingkat || !jurusan) {
            return res.status(400).json({ message: 'Data tidak lengkap' });
        }

        // Cek apakah nama kelas sudah ada
        const cekKelas = await pool.query(
            `SELECT id FROM kelas WHERE name = $1`,
            [name]
        );

        if (cekKelas.rowCount > 0) {
            return res.status(400).json({ message: 'Nama kelas sudah dipakai' });
        }

        const result = await pool.query(
            `INSERT INTO kelas (name, tingkat, jurusan)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [name, tingkat, jurusan]
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
======================= */
exports.getKelas = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, tingkat, jurusan
       FROM kelas
       ORDER BY tingkat ASC, name ASC`
        );

        res.json(result.rows);
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
            `SELECT id, name, tingkat, jurusan
       FROM kelas
       WHERE id = $1`,
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
        const { name, tingkat, jurusan } = req.body;
        const { id } = req.params;

        if (!name || !tingkat || !jurusan) {
            return res.status(400).json({ message: 'Data tidak lengkap' });
        }

        // Cek apakah nama kelas sudah dipakai oleh kelas lain
        const cekNama = await pool.query(
            `SELECT id FROM kelas WHERE name = $1 AND id != $2`,
            [name, id]
        );

        if (cekNama.rowCount > 0) {
            return res.status(400).json({ message: 'Nama kelas sudah dipakai' });
        }

        const result = await pool.query(
            `UPDATE kelas
       SET name = $1,
           tingkat = $2,
           jurusan = $3
       WHERE id = $4
       RETURNING *`,
            [name, tingkat, jurusan, id]
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
        // Cek apakah kelas masih dipakai di users
        const cekUsers = await pool.query(
            `SELECT id FROM users WHERE id_kelas = $1 LIMIT 1`,
            [req.params.id]
        );

        if (cekUsers.rowCount > 0) {
            return res.status(400).json({
                message: 'Kelas tidak bisa dihapus, masih ada user yang terdaftar'
            });
        }

        // Cek apakah kelas masih dipakai di jadwal
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