const pool = require('../db');
const { uploadImage, deleteImage, getPublicIdFromUrl } = require('../utils/cloudinary');

/* =======================
   CREATE PRESENSI (ADMIN)
======================= */
exports.createPresensi = async (req, res) => {
  try {
    const { id_jadwal, status, diabsen_oleh, memberikan_tugas, catatan } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Foto wajib diupload' });
    }

    const fotoLink = await uploadImage(req.file, 'presensi');

    const result = await pool.query(
      `INSERT INTO presensi_guru
       (id_jadwal, status, foto_bukti, diabsen_oleh, memberikan_tugas, catatan)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id_jadwal, status, fotoLink, diabsen_oleh, memberikan_tugas || null, catatan || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
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
      SELECT p.*, j.hari, j.jam_mulai, j.jam_selesai, j.guru
      FROM presensi_guru p
      JOIN jadwal j ON j.id_jadwal = p.id_jadwal
      ORDER BY p.tanggal DESC
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
      `SELECT * FROM presensi_guru WHERE id_presensi = $1`,
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
    const { status, catatan } = req.body;
    const idPresensi = req.params.id;

    // 1️⃣ ambil data lama
    const oldData = await pool.query(
      `SELECT foto_bukti FROM presensi_guru WHERE id_presensi = $1`,
      [idPresensi]
    );

    if (!oldData.rowCount) {
      return res.status(404).json({ message: 'Presensi tidak ditemukan' });
    }

    let fotoBaru = null;

    // 2️⃣ kalau upload foto baru
    if (req.file) {
      // hapus foto lama
      const fotoLama = oldData.rows[0].foto_bukti;
      if (fotoLama) {
        const publicId = getPublicIdFromUrl(fotoLama);
        await deleteImage(publicId);
      }

      // upload foto baru
      fotoBaru = await uploadImage(req.file, 'presensi');
    }

    // 3️⃣ update DB
    const result = await pool.query(
      `UPDATE presensi_guru
       SET status = COALESCE($1, status),
           catatan = COALESCE($2, catatan),
           foto_bukti = COALESCE($3, foto_bukti),
           updated_at = CURRENT_TIMESTAMP
       WHERE id_presensi = $4
         AND status_approve = 'Pending'
       RETURNING *`,
      [status, catatan || null, fotoBaru, idPresensi]
    );

    if (!result.rowCount) {
      return res.status(400).json({
        message: 'Presensi sudah di-approve atau tidak bisa diupdate'
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   DELETE PRESENSI
======================= */
exports.deletePresensi = async (req, res) => {
  try {
    // Ambil data presensi dulu untuk hapus foto
    const presensi = await pool.query(
      `SELECT foto_bukti FROM presensi_guru WHERE id_presensi = $1`,
      [req.params.id]
    );

    if (!presensi.rowCount) {
      return res.status(404).json({ message: 'Presensi tidak ditemukan' });
    }

    // Hapus foto dari Cloudinary
    const fotoUrl = presensi.rows[0].foto_bukti;
    if (fotoUrl) {
      const publicId = getPublicIdFromUrl(fotoUrl);
      await deleteImage(publicId);
    }

    // Hapus dari database
    await pool.query(
      `DELETE FROM presensi_guru WHERE id_presensi = $1`,
      [req.params.id]
    );

    res.json({ message: 'Presensi berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   APPROVE PRESENSI
======================= */
exports.approvePresensi = async (req, res) => {
  try {
    const idPresensi = parseInt(req.params.id, 10);
    const { status_approve } = req.body;

    if (isNaN(idPresensi)) {
      return res.status(400).json({ message: 'ID presensi tidak valid' });
    }

    if (!['Approved', 'Rejected'].includes(status_approve)) {
      return res.status(400).json({ message: 'Status tidak valid' });
    }

    const approved_by = req.user.id;

    const result = await pool.query(
      `UPDATE presensi_guru
       SET status_approve = $1,
           approved_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id_presensi = $3
         AND status_approve = 'Pending'
       RETURNING *`,
      [status_approve, approved_by, idPresensi]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'Presensi tidak ditemukan atau sudah diproses'
      });
    }

    res.json({
      message: 'Presensi berhasil diproses',
      data: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};