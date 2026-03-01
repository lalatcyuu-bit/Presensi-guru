const pool = require('../db');

const guruWithMapelQuery = `
SELECT 
  g.id_guru,
  g.nama_guru,
  g.nip,
  COALESCE(
    json_agg(
      json_build_object(
        'id_mapel', m.id_mapel,
        'nama_mapel', m.nama_mapel
      )
    ) FILTER (WHERE m.id_mapel IS NOT NULL),
    '[]'
  ) AS mapel
FROM guru g
LEFT JOIN mapel m 
  ON m.id_mapel = ANY (
    SELECT jsonb_array_elements_text(g.mapel)::int
  )
`;

/* =======================
   GET ALL GURU
   Query params:
   - ?search=   → cari nama_guru atau nip (case-insensitive)
   - ?id_mapel= → filter by mapel
   - ?page=     → halaman (default 1)
   - ?limit=    → item per halaman (default 10)
======================= */
exports.getGuru = async (req, res) => {
  try {
    const search = req.query.search || '';
    const id_mapel = req.query.id_mapel ? parseInt(req.query.id_mapel, 10) : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;

    const params = [];
    const where = [];

    // Filter search
    if (search) {
      params.push(`%${search}%`);
      where.push(`(g.nama_guru ILIKE $${params.length} OR g.nip ILIKE $${params.length})`);
    }

    // Filter mapel
    if (id_mapel) {
      params.push(id_mapel);
      where.push(`g.mapel @> to_jsonb(ARRAY[$${params.length}]::int[])`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const fetchAll = req.query.all === 'true'
    if (fetchAll) {
      const result = await pool.query(
        `${guruWithMapelQuery}
     ${whereClause}
     GROUP BY g.id_guru
     ORDER BY g.id_guru DESC`,
        params
      )
      return res.json({ data: result.rows })
    }

    // Hitung total untuk pagination
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT g.id_guru) AS total
       FROM guru g
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
      `${guruWithMapelQuery}
       ${whereClause}
       GROUP BY g.id_guru
       ORDER BY g.id_guru DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      params
    );

    res.json({
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

exports.createGuru = async (req, res) => {
  try {
    const { nama_guru, nip, mapel } = req.body;

    if (!nama_guru || !Array.isArray(mapel) || mapel.length === 0) {
      return res.status(400).json({ message: 'nama_guru & mapel wajib diisi' });
    }

    const cek = await pool.query(
      `SELECT id_mapel FROM mapel WHERE id_mapel = ANY($1::int[])`,
      [mapel]
    );

    if (cek.rowCount !== mapel.length) {
      return res.status(400).json({ message: 'Mapel tidak valid' });
    }

    const insert = await pool.query(
      `INSERT INTO guru (nama_guru, nip, mapel)
       VALUES ($1, $2, $3)
       RETURNING id_guru`,
      [nama_guru, nip || null, JSON.stringify(mapel)]
    );

    const result = await pool.query(
      guruWithMapelQuery + ` WHERE g.id_guru = $1 GROUP BY g.id_guru`,
      [insert.rows[0].id_guru]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   GET GURU BY ID
======================= */
exports.getGuruById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      guruWithMapelQuery + ` WHERE g.id_guru = $1 GROUP BY g.id_guru`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Guru tidak ditemukan' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getGuruByMapel = async (req, res) => {
  const id_mapel = parseInt(req.query.id_mapel, 10);

  if (isNaN(id_mapel)) {
    return res.status(400).json({ success: false, message: 'id_mapel wajib dan harus angka' });
  }

  try {
    const result = await pool.query(
      `${guruWithMapelQuery}
       WHERE g.mapel @> to_jsonb(ARRAY[$1]::int[])
       GROUP BY g.id_guru
       ORDER BY g.nama_guru ASC`,
      [id_mapel]
    );

    if (result.rows.length === 0) {
      return res.json({ message: 'Belum ada guru untuk mapel ini', data: [], total: 0 });
    }

    res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateGuru = async (req, res) => {
  const { id } = req.params;
  const { nama_guru, nip, mapel } = req.body;

  if (!nama_guru || !Array.isArray(mapel)) {
    return res.status(400).json({ message: 'data tidak valid' });
  }

  const cek = await pool.query(
    `SELECT id_mapel FROM mapel WHERE id_mapel = ANY($1::int[])`,
    [mapel]
  );

  if (cek.rowCount !== mapel.length) {
    return res.status(400).json({ message: 'Mapel tidak valid' });
  }

  await pool.query(
    `UPDATE guru SET nama_guru = $1, nip = $2, mapel = $3 WHERE id_guru = $4`,
    [nama_guru, nip || null, JSON.stringify(mapel), id]
  );

  const result = await pool.query(
    guruWithMapelQuery + ` WHERE g.id_guru = $1 GROUP BY g.id_guru`,
    [id]
  );

  res.json(result.rows[0]);
};

exports.deleteGuru = async (req, res) => {
  try {
    const cekJadwal = await pool.query(
      `SELECT 1 FROM jadwal WHERE (guru->>'id_guru')::int = $1 LIMIT 1`,
      [req.params.id]
    );
    if (cekJadwal.rowCount > 0) {
      return res.status(400).json({
        message: 'Guru tidak bisa dihapus, masih memiliki jadwal aktif'
      });
    }

    const result = await pool.query(
      `DELETE FROM guru WHERE id_guru = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Guru tidak ditemukan' });
    }

    res.json({ message: 'Guru berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};