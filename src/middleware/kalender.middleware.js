const pool = require('../db');
const { getWIBDate, getWIBDayName, getWIBTimeString } = require('../utils/timezone');

module.exports = async function isLibur(req, res, next) {
  try {
    const hariIni = getWIBDayName();

    // if (hariIni === 'Sabtu' || hariIni === 'Minggu') {
    //   return res.status(400).json({
    //     message: 'Hari ini tidak ada KBM (Weekend)'
    //   });
    // }

    const tanggal = getWIBDate();
    const jamSekarang = getWIBTimeString();

    const result = await pool.query(
      `SELECT
        tipe,
        target_type,
        target_value,
        TO_CHAR(jam_mulai,  'HH24:MI:SS') AS jam_mulai,
        TO_CHAR(jam_selesai,'HH24:MI:SS') AS jam_selesai,
        keterangan
       FROM kalender_akademik
       WHERE $1::date BETWEEN tanggal_mulai AND tanggal_selesai`,
      [tanggal]
    );

    if (result.rowCount === 0) {
      return next();
    }

    const { id_kelas, tingkat, jurusan } = req.user || {};

    for (const row of result.rows) {
      const { target_type, target_value } = row;

      let cocok = false;

      if (target_type === 'global') {
        cocok = true;
      } else if (target_type === 'tingkat') {
        cocok = Array.isArray(target_value)
          ? target_value.map(String).includes(String(tingkat))
          : false;
      } else if (target_type === 'jurusan') {
        cocok = Array.isArray(target_value)
          ? target_value.includes(jurusan)
          : false;
      } else if (target_type === 'kelas') {
        cocok = Array.isArray(target_value)
          ? target_value.includes(id_kelas)
          : false;
      }

      if (!cocok) continue;

      const jamMulai = row.jam_mulai;
      const jamSelesai = row.jam_selesai;
      const ket = row.keterangan ? ` (${row.keterangan})` : '';

      // Tidak ada jam = seharian tidak ada KBM
      if (!jamMulai || !jamSelesai) {
        let message;
        if (row.tipe === 'ujian') {
          message = `Sedang ujian hari ini`;
        } else if (row.tipe === 'libur') {
          message = `Hari ini tidak ada KBM`;
        } else {
          message = `Presensi tidak tersedia saat ini`;
        }

        return res.status(400).json({ message: `${message}${ket}` });
      }

      // Ada jam — cek apakah jam sekarang dalam range
      if (jamSekarang >= jamMulai && jamSekarang <= jamSelesai) {
        let message;
        if (row.tipe === 'ujian') {
          message = `Sedang ujian saat ini`;
        } else {
          message = `Presensi tidak tersedia saat ini`;
        }

        return res.status(400).json({ message: `${message}${ket}` });
      }
    }

    next();

  } catch (err) {
    console.error('CHECK LIBUR ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};