const pool = require('../db');
const { uploadToDrive } = require('../utils/gdrive');

/* =======================
   CREATE PRESENSI
======================= */
exports.createPresensi = async (req, res) => {
  try {
    const { id_jadwal, status, diabsen_oleh, catatan } = req.body;

    if (!id_jadwal || !status || !diabsen_oleh) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Foto bukti wajib diupload' });
    }

    // upload foto → Google Drive
    const fotoLink = await uploadToDrive(req.file);

    const result = await pool.query(
      `INSERT INTO presensi_guru
       (id_jadwal, status, foto_bukti, diabsen_oleh, catatan)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id_jadwal, status, fotoLink, diabsen_oleh, catatan || null]
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
   GET ALL
======================= */
exports.getPresensi = async (req, res) => {
  const result = await pool.query(`
    SELECT p.*, j.hari, j.jam_mulai, j.jam_selesai, j.guru
    FROM presensi_guru p
    JOIN jadwal j ON j.id_jadwal = p.id_jadwal
    ORDER BY p.tanggal DESC
  `);
  res.json(result.rows);
};

/* =======================
   GET BY ID
======================= */
exports.getPresensiById = async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM presensi_guru WHERE id_presensi = $1`,
    [req.params.id]
  );

  if (!result.rowCount) {
    return res.status(404).json({ message: 'Presensi tidak ditemukan' });
  }

  res.json(result.rows[0]);
};

/* =======================
   UPDATE (PENDING ONLY)
======================= */
exports.updatePresensi = async (req, res) => {
  const { status, catatan } = req.body;

  const result = await pool.query(
    `UPDATE presensi_guru
     SET status = $1,
         catatan = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id_presensi = $3
       AND status_approve = 'Pending'
     RETURNING *`,
    [status, catatan || null, req.params.id]
  );

  if (!result.rowCount) {
    return res.status(400).json({
      message: 'Presensi sudah di-approve atau tidak ditemukan'
    });
  }

  res.json(result.rows[0]);
};

exports.deletePresensi = async (req, res) => {
  await pool.query(
    `DELETE FROM presensi WHERE id_presensi = $1`,
    [req.params.id]
  );

  res.json({ message: 'Presensi berhasil dihapus' });
};

exports.approvePresensiGuru = async (req, res) => {
  const idPresensi = parseInt(req.params.id, 10);
  const { status_approve } = req.body;

  if (isNaN(idPresensi)) {
    return res.status(400).json({ message: 'ID presensi tidak valid' });
  }

  if (!['Approved', 'Rejected'].includes(status_approve)) {
    return res.status(400).json({ message: 'Status tidak valid' });
  }

  // 🔥 DARI TOKEN
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

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: 'Presensi tidak ditemukan atau sudah diproses'
    });
  }

  res.json({
    message: 'Presensi berhasil diproses',
    data: result.rows[0]
  });
};

// get presensi
// exports.getDataApproved = async (req, res) => {
//   const result = await pool.query(`
//     SELECT 
//       pg.id_presensi,
//       pg.tanggal,
//       pg.status,
//       pg.foto_bukti,
//       pg.status_approve,
//       pg.catatan,
//       pg.created_at,
//       pg.updated_at,

//       -- guru yang absen
//       g.nama_guru AS diabsen_oleh_nama,

//       -- user yang approve (piket)
//       u.name AS approved_by_nama

//     FROM presensi_guru pg
//     LEFT JOIN guru g ON pg.diabsen_oleh = g.id_guru
//     LEFT JOIN users u ON pg.approved_by = u.id
//     ORDER BY pg.created_at DESC
//   `);

//   res.json({
//     data: result.rows
//   });
// };

