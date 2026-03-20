const pool = require('../db');
const { getWIBDate, getWIBDayName, getWIBTimeString } = require('../utils/timezone');

module.exports = async function isLibur(req, res, next) {
  try {
    const hariIni = getWIBDayName();

    if (hariIni === 'Sabtu' || hariIni === 'Minggu') {
      return res.status(400).json({
        message: 'Hari ini tidak ada KBM (Weekend)'
      });
    }

    const tanggal = getWIBDate();
    const jamSekarang = getWIBTimeString(); // format HH:MM:SS

    const result = await pool.query(
      `SELECT tipe, jam_mulai, jam_selesai, keterangan
       FROM kalender_akademik
       WHERE $1::date BETWEEN tanggal_mulai AND tanggal_selesai`,
      [tanggal]
    );

    if (result.rowCount === 0) {
      return next();
    }

    for (const row of result.rows) {
      const jamMulai = row.jam_mulai;
      const jamSelesai = row.jam_selesai;

      // Tidak ada jam = seharian tidak ada KBM
      if (!jamMulai || !jamSelesai) {
        return res.status(400).json({
          message: `Hari ini tidak ada KBM${row.keterangan ? ` (${row.keterangan})` : ''}`
        });
      }

      // Ada jam = cek apakah jam sekarang dalam range
      if (jamSekarang >= jamMulai && jamSekarang <= jamSelesai) {
        return res.status(400).json({
          message: `Presensi tidak tersedia saat ini${row.keterangan ? ` (${row.keterangan})` : ''}`
        });
      }
    }

    next();

  } catch (err) {
    console.error('CHECK LIBUR ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};