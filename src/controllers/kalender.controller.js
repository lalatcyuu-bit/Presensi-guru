const pool = require('../db');

/*
========================
CREATE KALENDER
========================
*/
exports.createKalender = async (req, res) => {
  try {
    const { tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai, tipe, keterangan } = req.body;

    if (!tanggal_mulai || !tanggal_selesai) {
      return res.status(400).json({ message: 'tanggal_mulai dan tanggal_selesai wajib diisi' });
    }

    const result = await pool.query(
      `INSERT INTO kalender_akademik
      (tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai, tipe, keterangan)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        tanggal_mulai,
        tanggal_selesai,
        jam_mulai || null,
        jam_selesai || null,
        tipe || 'libur',
        keterangan || null
      ]
    );

    res.status(201).json({
      message: 'Kalender berhasil dibuat',
      data: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


/*
========================
GET LIST KALENDER
========================
*/
exports.getKalender = async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT *
      FROM kalender_akademik
      ORDER BY tanggal_mulai ASC
    `);

    res.json({
      total: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


/*
========================
UPDATE KALENDER
========================
*/
exports.updateKalender = async (req, res) => {
  try {

    const { id } = req.params;
    const { tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai, tipe, keterangan } = req.body;

    const result = await pool.query(
      `
      UPDATE kalender_akademik
      SET
        tanggal_mulai = $1,
        tanggal_selesai = $2,
        jam_mulai = $3,
        jam_selesai = $4,
        tipe = $5,
        keterangan = $6
      WHERE id = $7
      RETURNING *
      `,
      [
        tanggal_mulai,
        tanggal_selesai,
        jam_mulai || null,
        jam_selesai || null,
        tipe || 'libur',
        keterangan || null,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Data kalender tidak ditemukan' });
    }

    res.json({
      message: 'Kalender berhasil diupdate',
      data: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


/*
========================
DELETE KALENDER
========================
*/
exports.deleteKalender = async (req, res) => {
  try {

    const result = await pool.query(
      `DELETE FROM kalender_akademik WHERE id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    res.json({ message: 'Kalender berhasil dihapus' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


/*
========================
CEK HARI INI LIBUR
========================
*/
exports.checkLiburHariIni = async (req, res) => {
  try {

    const today = new Date();
    const day = today.getDay(); // 0 Minggu, 6 Sabtu

    if (day === 0 || day === 6) {
      return res.json({
        libur: true,
        tipe: 'weekend',
        keterangan: 'Sabtu/Minggu'
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM kalender_akademik
      WHERE CURRENT_DATE BETWEEN tanggal_mulai AND tanggal_selesai
      `
    );

    if (result.rows.length > 0) {
      return res.json({
        libur: true,
        tipe: 'kalender',
        data: result.rows
      });
    }

    res.json({
      libur: false
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};