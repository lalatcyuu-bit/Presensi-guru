const pool = require('../db');

/* =======================
   CREATE MAPEL
======================= */
exports.createMapel = async (req, res) => {
  const { nama_mapel, kode_mapel, status } = req.body;

  if (!nama_mapel || !kode_mapel) {
    return res.status(400).json({
      message: 'nama_mapel dan kode_mapel wajib diisi'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO mapel (nama_mapel, kode_mapel, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nama_mapel, kode_mapel.toUpperCase(), status ?? true]
    );

    res.status(201).json({
      message: 'Mapel berhasil ditambahkan',
      data: result.rows[0]
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        message: 'Kode mapel sudah digunakan'
      });
    }

    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   GET MAPEL
   ?all=true → ambil semua
======================= */
exports.getMapel = async (req, res) => {
  const { all } = req.query;

  try {
    const query = all
      ? `SELECT id_mapel, nama_mapel, kode_mapel, status FROM mapel`
      : `SELECT id_mapel, nama_mapel, kode_mapel, status
         FROM mapel
         WHERE status = true`;

    const result = await pool.query(`${query} ORDER BY nama_mapel ASC`);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   GET MAPEL BY ID
======================= */
exports.getMapelById = async (req, res) => {
  const result = await pool.query(
    `SELECT id_mapel, nama_mapel, kode_mapel, status
     FROM mapel
     WHERE id_mapel = $1`,
    [req.params.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Mapel tidak ditemukan' });
  }

  res.json(result.rows[0]);
};

/* =======================
   UPDATE MAPEL
======================= */
exports.updateMapel = async (req, res) => {
  const { nama_mapel, kode_mapel, status } = req.body;

  if (!nama_mapel || !kode_mapel) {
    return res.status(400).json({
      message: 'nama_mapel dan kode_mapel wajib diisi'
    });
  }

  try {
    const result = await pool.query(
      `UPDATE mapel
       SET nama_mapel = $1,
           kode_mapel = $2,
           status = $3
       WHERE id_mapel = $4
       RETURNING *`,
      [nama_mapel, kode_mapel.toUpperCase(), status, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Mapel tidak ditemukan' });
    }

    res.json({
      message: 'Mapel berhasil diperbarui',
      data: result.rows[0]
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        message: 'Kode mapel sudah digunakan'
      });
    }

    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   NON-AKTIFKAN MAPEL
======================= */
exports.nonAktifkanMapel = async (req, res) => {
  const result = await pool.query(
    `UPDATE mapel
     SET status = false
     WHERE id_mapel = $1
     RETURNING *`,
    [req.params.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Mapel tidak ditemukan' });
  }

  res.json({
    message: 'Mapel berhasil dinonaktifkan',
    data: result.rows[0]
  });
};

/* =======================
   DELETE MAPEL
======================= */
exports.deleteMapel = async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM mapel WHERE id_mapel = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Mapel tidak ditemukan' });
    }

    res.json({
      message: 'Mapel berhasil dihapus',
      data: result.rows[0]
    });

  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        message: 'Mapel tidak dapat dihapus karena masih digunakan oleh guru'
      });
    }

    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
