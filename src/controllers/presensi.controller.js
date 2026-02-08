const pool = require('../db');
const { uploadToDrive } = require('../utils/gdrive');

/* =======================
   CREATE PRESENSI (ADMIN)
======================= */
exports.createPresensi = async (req, res) => {
  try {
    const { id_jadwal, status, diabsen_oleh, memberikan_tugas, catatan } = req.body;

    if (!id_jadwal || !status || !diabsen_oleh) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    // Validasi foto untuk status Hadir
    if (status === 'Hadir' && !req.file) {
      return res.status(400).json({ message: 'Foto bukti wajib untuk status Hadir' });
    }

    // Upload foto jika ada
    let fotoLink = null;
    if (req.file) {
      fotoLink = await uploadToDrive(req.file);
    }

    const result = await pool.query(
      `INSERT INTO presensi_guru
       (id_jadwal, status, foto_bukti, diabsen_oleh, memberikan_tugas, catatan)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id_jadwal, status, fotoLink, diabsen_oleh, memberikan_tugas || null, catatan || null]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Presensi hari ini sudah ada' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   GET ALL (dengan join detail)
======================= */
exports.getPresensi = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        j.hari, 
        j.jam_mulai, 
        j.jam_selesai, 
        j.guru,
        k.name AS kelas_name,
        k.tingkat,
        k.jurusan,
        u1.name AS diabsen_oleh_name,
        u2.name AS approved_by_name
      FROM presensi_guru p
      JOIN jadwal j ON j.id_jadwal = p.id_jadwal
      JOIN kelas k ON k.id = j.id_kelas
      LEFT JOIN users u1 ON u1.id = p.diabsen_oleh
      LEFT JOIN users u2 ON u2.id = p.approved_by
      ORDER BY p.tanggal DESC, j.jam_mulai ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   GET BY ID
======================= */
exports.getPresensiById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         p.*,
         j.hari, 
         j.jam_mulai, 
         j.jam_selesai, 
         j.guru,
         k.name AS kelas_name
       FROM presensi_guru p
       JOIN jadwal j ON j.id_jadwal = p.id_jadwal
       JOIN kelas k ON k.id = j.id_kelas
       WHERE p.id_presensi = $1`,
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Presensi tidak ditemukan' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   UPDATE (PENDING ONLY)
======================= */
exports.updatePresensi = async (req, res) => {
  try {
    const { status, memberikan_tugas, catatan } = req.body;

    const result = await pool.query(
      `UPDATE presensi_guru
       SET status = $1,
           memberikan_tugas = $2,
           catatan = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id_presensi = $4
         AND status_approve = 'Pending'
       RETURNING *`,
      [status, memberikan_tugas || null, catatan || null, req.params.id]
    );

    if (!result.rowCount) {
      return res.status(400).json({
        message: 'Presensi sudah di-approve atau tidak ditemukan'
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   APPROVE / REJECT
======================= */
exports.approvePresensi = async (req, res) => {
  try {
    const { status_approve, approved_by } = req.body;

    if (!['Approved', 'Rejected'].includes(status_approve)) {
      return res.status(400).json({ message: 'Status tidak valid' });
    }

    const result = await pool.query(
      `UPDATE presensi_guru
       SET status_approve = $1,
           approved_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id_presensi = $3
       RETURNING *`,
      [status_approve, approved_by, req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Presensi tidak ditemukan' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   DELETE
======================= */
exports.deletePresensi = async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM presensi_guru WHERE id_presensi = $1 RETURNING *`,
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Presensi tidak ditemukan' });
    }

    res.json({ message: 'Presensi berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};