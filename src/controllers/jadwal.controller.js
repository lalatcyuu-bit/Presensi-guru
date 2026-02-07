const pool = require('../db');

exports.createJadwal = async (req, res) => {
  const { id_kelas, hari, jam_mulai, jam_selesai, id_guru, id_mapel } = req.body;

  try {
    if (!id_kelas || !hari || !jam_mulai || !jam_selesai || !id_guru || !id_mapel) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    // ===== ambil guru =====
    const guruRes = await pool.query(
      `SELECT id_guru, nama_guru, mapel FROM guru WHERE id_guru = $1`,
      [id_guru]
    );

    if (guruRes.rowCount === 0) {
      return res.status(404).json({ message: 'Guru tidak ditemukan' });
    }

    const guru = guruRes.rows[0];

    // ===== VALIDASI MAPEL =====
    const mapelIds = guru.mapel.map(Number);

    if (!mapelIds.includes(Number(id_mapel))) {
      return res.status(400).json({ message: 'Guru tidak mengajar mapel ini' });
    }

    // ===== ambil detail mapel =====
    const mapelRes = await pool.query(
      `SELECT id_mapel, nama_mapel FROM mapel WHERE id_mapel = $1`,
      [id_mapel]
    );

    if (mapelRes.rowCount === 0) {
      return res.status(404).json({ message: 'Mapel tidak ditemukan' });
    }

    // ===== payload =====
    const guruPayload = {
      id_guru: guru.id_guru,
      nama_guru: guru.nama_guru,
      mapel: mapelRes.rows[0]
    };

    const result = await pool.query(
      `INSERT INTO jadwal (id_kelas, hari, jam_mulai, jam_selesai, guru)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id_kelas, hari, jam_mulai, jam_selesai, JSON.stringify(guruPayload)]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('CREATE JADWAL ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


/* =======================
   GET ALL JADWAL
======================= */
exports.getJadwal = async (req, res) => {
  const result = await pool.query(
    `SELECT j.*, c.name AS nama_kelas
     FROM jadwal j
     JOIN kelas c ON c.id = j.id_kelas
     ORDER BY hari, jam_mulai`
  );

  res.json(result.rows);
};

/* =======================
   GET JADWAL BY ID
======================= */
exports.getJadwalById = async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM jadwal WHERE id_jadwal = $1`,
    [req.params.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
  }

  res.json(result.rows[0]);
};

/* =======================
   UPDATE JADWAL
======================= */
exports.updateJadwal = async (req, res) => {
  const { id } = req.params;
  const { id_kelas, hari, jam_mulai, jam_selesai, id_guru, id_mapel } = req.body;

  try {
    if (!id_kelas || !hari || !jam_mulai || !jam_selesai || !id_guru || !id_mapel) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    // ===== ambil guru =====
    const guruRes = await pool.query(
      `SELECT id_guru, nama_guru, mapel FROM guru WHERE id_guru = $1`,
      [id_guru]
    );

    if (guruRes.rowCount === 0) {
      return res.status(404).json({ message: 'Guru tidak ditemukan' });
    }

    const guru = guruRes.rows[0];

    // ===== NORMALISASI MAPEL =====
    const mapelIds = Array.isArray(guru.mapel)
      ? guru.mapel.map(m => Number(m))
      : [];

    // ===== VALIDASI MAPEL =====
    if (!mapelIds.includes(Number(id_mapel))) {
      return res.status(400).json({ message: 'Guru tidak mengajar mapel ini' });
    }

    // ===== ambil detail mapel =====
    const mapelRes = await pool.query(
      `SELECT id_mapel, nama_mapel FROM mapel WHERE id_mapel = $1`,
      [id_mapel]
    );

    if (mapelRes.rowCount === 0) {
      return res.status(404).json({ message: 'Mapel tidak ditemukan' });
    }

    // ===== payload =====
    const guruPayload = {
      id_guru: guru.id_guru,
      nama_guru: guru.nama_guru,
      mapel: mapelRes.rows[0]
    };

    // ===== update =====
    const result = await pool.query(
      `UPDATE jadwal
       SET id_kelas = $1,
           hari = $2,
           jam_mulai = $3,
           jam_selesai = $4,
           guru = $5
       WHERE id_jadwal = $6
       RETURNING *`,
      [id_kelas, hari, jam_mulai, jam_selesai, JSON.stringify(guruPayload), id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('UPDATE JADWAL ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   DELETE JADWAL
======================= */
exports.deleteJadwal = async (req, res) => {
  await pool.query(
    `DELETE FROM jadwal WHERE id_jadwal = $1`,
    [req.params.id]
  );

  res.json({ message: 'Jadwal berhasil dihapus' });
};

