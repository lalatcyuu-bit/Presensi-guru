const pool = require('../db');

module.exports = async function isLibur(req, res, next) {
  try {

    const today = new Date();
    const day = today.getDay(); // 0 Minggu, 6 Sabtu

    // Weekend otomatis libur
    if (day === 0 || day === 6) {
      return res.status(400).json({
        message: 'Hari ini tidak ada KBM (Weekend)'
      });
    }

    const tanggal = today.toISOString().slice(0,10);

    const result = await pool.query(
      `
      SELECT 1
      FROM kalender_akademik
      WHERE $1 BETWEEN tanggal_mulai AND tanggal_selesai
      LIMIT 1
      `,
      [tanggal]
    );

    if (result.rowCount > 0) {
      return res.status(400).json({
        message: 'Hari ini tidak ada KBM (Kalender Akademik)'
      });
    }

    next();

  } catch (err) {
    console.error('CHECK LIBUR ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};