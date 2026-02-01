const pool = require('../db');

exports.createPresensi = async (req, res) => {
  const { id_jadwal, status, foto_bukti, diabsen_oleh, catatan } = req.body;

  if (!id_jadwal || !status || !foto_bukti || !diabsen_oleh) {
    return res.status(400).json({ message: 'Data tidak lengkap' });
  }

  const jadwal = await pool.query(
    `SELECT id_jadwal FROM jadwal WHERE id_jadwal = $1`,
    [id_jadwal]
  );

  if (jadwal.rowCount === 0) {
    return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
  }

  const result = await pool.query(
    `INSERT INTO presensi_guru
     (id_jadwal, status, foto_bukti, diabsen_oleh, catatan)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id_jadwal, status, foto_bukti, diabsen_oleh, catatan || null]
  );

  res.status(201).json(result.rows[0]);
};

exports.getPresensi = async (req, res) => {
  const result = await pool.query(`SELECT * FROM presensi`);
  res.json(result.rows);
};

exports.getPresensiById = async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM presensi WHERE id_presensi = $1`,
    [req.params.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Presensi tidak ditemukan' });
  }

  res.json(result.rows[0]);
};

exports.updatePresensi = async (req, res) => {
  const { status, foto_bukti, catatan } = req.body;

  const result = await pool.query(
    `UPDATE presensi
     SET status = $1,
         foto_bukti = $2,
         catatan = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id_presensi = $4
       AND status_approve = 'Pending'
     RETURNING *`,
    [status, foto_bukti, catatan || null, req.params.id]
  );

  if (result.rowCount === 0) {
    return res.status(400).json({ message: 'Tidak bisa diupdate' });
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
  const { id } = req.params;
  const { status_approve, approved_by } = req.body;

  if (!['Approved', 'Rejected'].includes(status_approve)) {
    return res.status(400).json({ message: 'Status approve tidak valid' });
  }

  const result = await pool.query(
    `UPDATE presensi_guru
     SET status_approve = $1,
         approved_by = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id_presensi = $3
     RETURNING *`,
    [status_approve, approved_by, id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Presensi tidak ditemukan' });
  }

  res.json(result.rows[0]);
};