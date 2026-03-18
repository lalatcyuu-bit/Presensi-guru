const pool = require('../db');
const { getWIBDate, getWIBDayName } = require('../utils/timezone');

module.exports = async function isLibur(req, res, next) {
  try {
    const hariIni = getWIBDayName(); // ✅ WIB, bukan new Date().getDay()

    if (hariIni === 'Sabtu' || hariIni === 'Minggu') {
      return res.status(400).json({
        message: 'Hari ini tidak ada KBM (Weekend)'
      });
    }

    const tanggal = getWIBDate(); // ✅ WIB, bukan toISOString().slice(0,10)

    const result = await pool.query(
      `SELECT 1
       FROM kalender_akademik
       WHERE $1::date BETWEEN tanggal_mulai AND tanggal_selesai
       LIMIT 1`,
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