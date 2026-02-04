const pool = require('../db');

/* =======================
   HELPER QUERY (JOIN MAPEL)
======================= */
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
GROUP BY g.id_guru
`;

/* =======================
   CREATE GURU
======================= */
exports.createGuru = async (req, res) => {
  const { nama_guru, nip, mapel } = req.body;

  if (!nama_guru || !Array.isArray(mapel) || mapel.length === 0) {
    return res.status(400).json({ message: 'nama_guru & mapel wajib diisi' });
  }

  // validasi mapel
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
    guruWithMapelQuery + ` HAVING g.id_guru = $1`,
    [insert.rows[0].id_guru]
  );

  res.status(201).json(result.rows[0]);
};

/* =======================
   GET ALL GURU
======================= */
exports.getGuru = async (req, res) => {
  const result = await pool.query(
    guruWithMapelQuery + ` ORDER BY g.nama_guru ASC`
  );
  res.json(result.rows);
};

/* =======================
   SEARCH GURU BY MAPEL
======================= */
exports.getGuruByMapel = async (req, res) => {
  const id_mapel = parseInt(req.query.id_mapel, 10);

  if (isNaN(id_mapel)) {
    return res.status(400).json({
      success: false,
      message: 'id_mapel wajib dan harus angka'
    });
  }

  try {
    const result = await pool.query(
      `
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
      WHERE g.mapel @> to_jsonb(ARRAY[$1]::int[])
      GROUP BY g.id_guru
      ORDER BY g.nama_guru ASC
      `,
      [id_mapel]
    );

    if (result.rows.length === 0) {
      return res.json({
        message: 'Belum ada guru untuk mapel ini',
        data: [],
        total: 0
      });
    }

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/* =======================
   UPDATE GURU
======================= */
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
    `UPDATE guru
     SET nama_guru = $1,
         nip = $2,
         mapel = $3
     WHERE id_guru = $4`,
    [nama_guru, nip || null, JSON.stringify(mapel), id]
  );

  const result = await pool.query(
    guruWithMapelQuery + ` HAVING g.id_guru = $1`,
    [id]
  );

  res.json(result.rows[0]);
};

/* =======================
   DELETE GURU
======================= */
exports.deleteGuru = async (req, res) => {
  await pool.query(
    `DELETE FROM guru WHERE id_guru = $1`,
    [req.params.id]
  );

  res.json({ message: 'Guru berhasil dihapus' });
};
