const pool = require('../db');

exports.createGuru = async (req, res) => {
  const { nama_guru, nip } = req.body;

  if (!nama_guru) {
    return res.status(400).json({ message: 'nama_guru wajib diisi' });
  }

  try {
    // cek NIP jika diisi
    if (nip) {
      const cek = await pool.query(
        'SELECT id_guru FROM guru WHERE nip = $1',
        [nip]
      );

      if (cek.rowCount > 0) {
        return res.status(409).json({ message: 'NIP sudah terdaftar' });
      }
    }

    const result = await pool.query(
      `INSERT INTO guru (nama_guru, nip)
       VALUES ($1, $2)
       RETURNING *`,
      [nama_guru, nip || null]
    );

    res.status(201).json({
      message: 'Guru berhasil ditambahkan',
      data: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
