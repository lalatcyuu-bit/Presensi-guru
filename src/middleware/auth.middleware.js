const jwt = require('jsonwebtoken');
const pool = require('../db');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Token tidak ada' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.id_kelas) {
      const kelasResult = await pool.query(
        `SELECT k.tingkat, jr.nama_jurusan AS jurusan
         FROM kelas k
         LEFT JOIN jurusan jr ON jr.id = k.id_jurusan
         WHERE k.id = $1`,
        [decoded.id_kelas]
      );
      if (kelasResult.rows[0]) {
        decoded.tingkat = kelasResult.rows[0].tingkat;
        decoded.jurusan = kelasResult.rows[0].jurusan;
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid' });
  }
};