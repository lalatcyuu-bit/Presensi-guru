const pool = require('../db');


exports.createMapel = async (req, res) => {
  const { nama_mapel } = req.body;

  if (!nama_mapel) {
    return res.status(400).json({ message: 'nama_mapel wajib diisi' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO mapel (nama_mapel)
       VALUES ($1)
       RETURNING *`,
      [nama_mapel]
    );

    res.status(201).json({
      message: 'Mapel berhasil ditambahkan',
      data: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMapel = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_mapel, nama_mapel
       FROM mapel
       ORDER BY nama_mapel ASC`
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
