const pool = require('../db');

/* =======================
   CREATE JADWAL
======================= */
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
    const mapelIds = Array.isArray(guru.mapel)
      ? guru.mapel.map(Number)
      : [];

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

    // ===== CEK BENTROK =====
    const bentrokRes = await pool.query(
      `
      SELECT 1
      FROM jadwal
      WHERE
        hari = $1
        AND (guru->>'id_guru')::int = $2
        AND jam_mulai < $3
        AND jam_selesai > $4
      LIMIT 1
      `,
      [hari, id_guru, jam_selesai, jam_mulai]
    );

    if (bentrokRes.rowCount > 0) {
      return res.status(400).json({
        message: 'Guru sudah memiliki jadwal di waktu tersebut'
      });
    }

    // ===== payload =====
    const guruPayload = {
      id_guru: guru.id_guru,
      nama_guru: guru.nama_guru,
      mapel: mapelRes.rows[0]
    };

    // ===== INSERT =====
    const result = await pool.query(
      `INSERT INTO jadwal (id_kelas, hari, jam_mulai, jam_selesai, guru)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id_kelas, hari, jam_mulai, jam_selesai, JSON.stringify(guruPayload)]
    );

    res.status(201).json({
      message: 'Jadwal berhasil ditambahkan',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('CREATE JADWAL ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   GET ALL JADWAL
   Query params:
   - ?hari=      → filter by hari (Senin, Selasa, ...)
   - ?id_kelas=  → filter by kelas
   - ?page=      → halaman (default 1)
   - ?limit=     → item per halaman (default 10)
======================= */
exports.getJadwal = async (req, res) => {
  try {
    const hari = req.query.hari || null;
    const id_kelas = req.query.id_kelas ? parseInt(req.query.id_kelas, 10) : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;

    const params = [];
    const where = [];

    if (hari) {
      params.push(hari);
      where.push(`j.hari = $${params.length}`);
    }

    if (id_kelas) {
      params.push(id_kelas);
      where.push(`j.id_kelas = $${params.length}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    // Hitung total untuk pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM jadwal j
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    // Ambil data dengan pagination
    params.push(limit);
    const limitIndex = params.length;
    params.push(offset);
    const offsetIndex = params.length;

    const result = await pool.query(
      `
      SELECT
        j.id_jadwal,
        j.id_kelas,
        j.hari,
        j.jam_mulai,
        j.jam_selesai,
        j.guru,
        k.name AS nama_kelas
      FROM jadwal j
      JOIN kelas k ON k.id = j.id_kelas
      ${whereClause}
      ORDER BY j.id_jadwal DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      params
    );

    res.json({
      message: 'Data jadwal berhasil diambil',
      data: result.rows,
      pagination: {
        page,
        perPage: limit,
        totalItems: total,
        totalPages
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   GET JADWAL BY ID
======================= */
exports.getJadwalById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM jadwal WHERE id_jadwal = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
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

    if (jam_mulai >= jam_selesai) {
      return res.status(400).json({
        message: 'Jam mulai harus lebih kecil dari jam selesai'
      });
    }

    // ===== AMBIL DATA GURU =====
    const guruRes = await pool.query(
      `SELECT id_guru, nama_guru, mapel FROM guru WHERE id_guru = $1`,
      [id_guru]
    );

    if (guruRes.rowCount === 0) {
      return res.status(404).json({ message: 'Guru tidak ditemukan' });
    }

    const guru = guruRes.rows[0];

    // ===== VALIDASI MAPEL GURU =====
    const mapelIds = Array.isArray(guru.mapel)
      ? guru.mapel.map(m => Number(m))
      : [];

    if (!mapelIds.includes(Number(id_mapel))) {
      return res.status(400).json({ message: 'Guru tidak mengajar mapel ini' });
    }

    // ===== AMBIL DETAIL MAPEL =====
    const mapelRes = await pool.query(
      `SELECT id_mapel, nama_mapel FROM mapel WHERE id_mapel = $1`,
      [id_mapel]
    );

    if (mapelRes.rowCount === 0) {
      return res.status(404).json({ message: 'Mapel tidak ditemukan' });
    }

    // ===== CEK BENTROK =====
    const bentrokRes = await pool.query(
      `
      SELECT 1
      FROM jadwal
      WHERE
        hari = $1
        AND (guru->>'id_guru')::int = $2
        AND id_jadwal <> $3
        AND jam_mulai < $4
        AND jam_selesai > $5
      LIMIT 1
      `,
      [hari, id_guru, id, jam_selesai, jam_mulai]
    );

    if (bentrokRes.rowCount > 0) {
      return res.status(400).json({
        message: 'Guru sudah memiliki jadwal di waktu tersebut'
      });
    }

    // ===== PAYLOAD GURU (JSONB) =====
    const guruPayload = {
      id_guru: guru.id_guru,
      nama_guru: guru.nama_guru,
      mapel: {
        id_mapel: mapelRes.rows[0].id_mapel,
        nama_mapel: mapelRes.rows[0].nama_mapel
      }
    };

    // ===== UPDATE =====
    const result = await pool.query(
      `
      UPDATE jadwal
      SET id_kelas = $1, hari = $2, jam_mulai = $3, jam_selesai = $4, guru = $5
      WHERE id_jadwal = $6
      RETURNING *
      `,
      [id_kelas, hari, jam_mulai, jam_selesai, JSON.stringify(guruPayload), id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
    }

    res.json({
      message: 'Jadwal berhasil diperbarui',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('UPDATE JADWAL ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   DELETE JADWAL
======================= */
exports.deleteJadwal = async (req, res) => {
  try {
    await pool.query(`DELETE FROM jadwal WHERE id_jadwal = $1`, [req.params.id]);
    res.json({ message: 'Jadwal berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};