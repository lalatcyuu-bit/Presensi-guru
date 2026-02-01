const pool = require('../db');

// create jadwal
exports.createJadwal = async (req, res) => {
  const { id_kelas, id_mapel, id_guru, day, start_time, end_time } = req.body;

  if (!id_kelas || !id_mapel || !id_guru || !day || !start_time || !end_time) {
    return res.status(400).json({ message: 'Semua field wajib diisi' });
  }

  try {
    const bentrok = await pool.query(
      `SELECT id FROM jadwal
      WHERE id_kelas = $1
      AND day = $2
      AND start_time < $4
      AND end_time > $3`,
      [id_kelas, day, start_time, end_time]
    );


    if (bentrok.rowCount > 0) {
      return res.status(409).json({ message: 'Jadwal bentrok dengan jam lain di kelas ini' });
    }

    const result = await pool.query(
      `INSERT INTO jadwal 
       (id_kelas, id_mapel, id_guru, day, start_time, end_time)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [id_kelas, id_mapel, id_guru, day, start_time, end_time]
    );

    res.status(201).json({
      message: 'Jadwal berhasil ditambahkan',
      data: result.rows[0]
    });

  } catch (err) {
    console.error("ERROR JADWAL =>", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// get all jadwal
exports.getJadwal = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT j.id, k.nama_kelas, m.nama_mapel, g.nama_guru,
              j.day, j.start_time, j.end_time
       FROM jadwal j
       JOIN kelas k ON j.id_kelas = k.id
       JOIN mapel m ON j.id_mapel = m.id_mapel
       JOIN guru g ON j.id_guru = g.id_guru
       ORDER BY k.nama_kelas, j.day, j.start_time`
    );

    res.json(result.rows);

  } catch (err) {
    console.error("ERROR GET JADWAL =>", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

//get jadwal by kelas
exports.getJadwalByKelas = async (req, res) => {
  const { id_kelas } = req.params;

  try {
    const result = await pool.query(
      `SELECT j.id, m.nama_mapel, g.nama_guru,
              j.day, j.start_time, j.end_time
       FROM jadwal j
       JOIN mapel m ON j.id_mapel = m.id_mapel
       JOIN guru g ON j.id_guru = g.id_guru
       WHERE j.id_kelas = $1
       ORDER BY j.day, j.start_time`,
      [id_kelas]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("ERROR GET JADWAL KELAS =>", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// delete jadwal
exports.deleteJadwal = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM jadwal WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
    }

    res.json({ message: 'Jadwal berhasil dihapus' });

  } catch (err) {
    console.error("ERROR DELETE JADWAL =>", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
