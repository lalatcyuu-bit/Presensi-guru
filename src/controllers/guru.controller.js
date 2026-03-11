const pool = require('../db');
const XLSX = require('xlsx');
const {
  getWIBDate,
} = require('../utils/timezone');

const XLSX = require('xlsx');

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

exports.importGuru = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File tidak ditemukan' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ message: 'File kosong' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const row of data) {
        const nama_guru = row.nama_guru;
        const nip = row.nip || null;

        if (!nama_guru || !row.mapel) {
          throw new Error(`Data tidak lengkap pada guru: ${nama_guru}`);
        }

        const mapelArray = row.mapel
          .toString()
          .split(',')
          .map(x => parseInt(x.trim(), 10));

        // Validasi mapel
        const cek = await client.query(
          `SELECT id_mapel FROM mapel WHERE id_mapel = ANY($1::int[])`,
          [mapelArray]
        );

        if (cek.rowCount !== mapelArray.length) {
          throw new Error(`Mapel tidak valid pada guru: ${nama_guru}`);
        }

        await client.query(
          `INSERT INTO guru (nama_guru, nip, mapel)
           VALUES ($1, $2, $3)`,
          [nama_guru, nip, JSON.stringify(mapelArray)]
        );
      }

      await client.query('COMMIT');

      res.json({
        message: 'Import berhasil',
        total: data.length
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   STATISTIK PRESENSI PER GURU
======================= */
exports.getStatistikGuru = async (req, res) => {
  try {
    const { id_guru, range } = req.query;

    if (!id_guru) {
      return res.status(400).json({ message: 'id_guru wajib diisi' });
    }

    const today = getWIBDate();

    let dateFilter = '';

    switch (range) {
      case 'hari':
        dateFilter = `p.tanggal = CURRENT_DATE`;
        break;

      case 'minggu':
        dateFilter = `p.tanggal >= CURRENT_DATE - INTERVAL '7 days'`;
        break;

      case 'bulan':
        dateFilter = `DATE_TRUNC('month', p.tanggal) = DATE_TRUNC('month', CURRENT_DATE)`;
        break;

      case 'semester':
        dateFilter = `p.tanggal >= CURRENT_DATE - INTERVAL '6 months'`;
        break;

      default:
        dateFilter = `p.tanggal >= CURRENT_DATE - INTERVAL '30 days'`;
    }

    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE p.status = 'Hadir') AS hadir,
        COUNT(*) FILTER (WHERE p.status = 'Tidak Hadir') AS tidak_hadir,
        COUNT(*) AS total
      FROM presensi_guru p
      JOIN jadwal j ON j.id_jadwal = p.id_jadwal
      WHERE (j.guru->>'id_guru')::int = $1
        AND ${dateFilter}
    `, [id_guru]);

    res.json({
      id_guru: parseInt(id_guru),
      range: range || '30_hari',
      summary: {
        hadir: parseInt(result.rows[0].hadir),
        tidak_hadir: parseInt(result.rows[0].tidak_hadir),
        total: parseInt(result.rows[0].total)
      }
    });

  } catch (err) {
    console.error('STATISTIK GURU ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   BAR CHART
======================= */
exports.getBarHadirVsTidak = async (req, res) => {
  try {
    const { range, id_guru } = req.query;

    let dateFilter = '';
    let params = [];

    switch (range) {
      case 'hari':
        dateFilter = `p.tanggal = (NOW() AT TIME ZONE 'Asia/Jakarta')::date`;
        break;

      case 'minggu':
        dateFilter = `p.tanggal >= (NOW() AT TIME ZONE 'Asia/Jakarta')::date - INTERVAL '7 days'`;
        break;

      case 'bulan':
        dateFilter = `
          DATE_TRUNC('month', p.tanggal) =
          DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Jakarta')::date)
        `;
        break;

      default:
        dateFilter = `p.tanggal >= (NOW() AT TIME ZONE 'Asia/Jakarta')::date - INTERVAL '30 days'`;
    }

    let guruFilter = '';
    if (id_guru) {
      params.push(parseInt(id_guru));
      guruFilter = `AND (j.guru->>'id_guru')::int = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE p.status = 'Hadir') AS hadir,
        COUNT(*) FILTER (WHERE p.status = 'Tidak Hadir') AS tidak_hadir
      FROM presensi_guru p
      JOIN jadwal j ON j.id_jadwal = p.id_jadwal
      WHERE ${dateFilter}
      ${guruFilter}
    `, params);

    const hadir = parseInt(result.rows[0].hadir);
    const tidakHadir = parseInt(result.rows[0].tidak_hadir);

    res.json({
      range: range || '30_hari',
      labels: ['Hadir', 'Tidak Hadir'],
      data: [hadir, tidakHadir]
    });

  } catch (err) {
    console.error('BAR CHART ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   LINE CHART
======================= */
exports.getLineHadirPerGuru = async (req, res) => {
  try {
    const { range } = req.query;

    let labels = [];
    let dateFilter = '';
    let groupExpr = '';
    let periodKeys = [];

    switch (range) {
      case 'minggu':
        dateFilter = `
          p.tanggal >= DATE_TRUNC('week', (NOW() AT TIME ZONE 'Asia/Jakarta')::date)
          AND p.tanggal < DATE_TRUNC('week', (NOW() AT TIME ZONE 'Asia/Jakarta')::date) + INTERVAL '5 days'
        `;
        groupExpr = `EXTRACT(DOW FROM p.tanggal)::int`; // 1=Sen, 2=Sel, ..., 5=Jum
        labels = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
        periodKeys = [1, 2, 3, 4, 5];
        break;

      case 'bulan':
        dateFilter = `
          DATE_TRUNC('month', p.tanggal) =
          DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Jakarta')::date)
        `;
        groupExpr = `CEIL(EXTRACT(DAY FROM p.tanggal) / 7.0)::int`;
        labels = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'];
        periodKeys = [1, 2, 3, 4];
        break;

      case 'tahun':
        dateFilter = `
          DATE_TRUNC('year', p.tanggal) =
          DATE_TRUNC('year', (NOW() AT TIME ZONE 'Asia/Jakarta')::date)
        `;
        groupExpr = `EXTRACT(MONTH FROM p.tanggal)::int`;
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        periodKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        break;

      default:
        dateFilter = `
          DATE_TRUNC('month', p.tanggal) =
          DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Jakarta')::date)
        `;
        groupExpr = `CEIL(EXTRACT(DAY FROM p.tanggal) / 7.0)::int`;
        labels = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'];
        periodKeys = [1, 2, 3, 4];
    }

    const result = await pool.query(`
      SELECT
        (j.guru->>'nama_guru') AS nama_guru,
        ${groupExpr} AS period_key,
        COUNT(*) FILTER (WHERE p.status = 'Hadir') AS total_hadir
      FROM presensi_guru p
      JOIN jadwal j ON j.id_jadwal = p.id_jadwal
      WHERE ${dateFilter}
      GROUP BY nama_guru, period_key
      ORDER BY nama_guru ASC, period_key ASC
    `);

    // Pivot: kelompokkan per guru
    const guruMap = {};
    for (const row of result.rows) {
      if (!guruMap[row.nama_guru]) guruMap[row.nama_guru] = {};
      guruMap[row.nama_guru][row.period_key] = parseInt(row.total_hadir);
    }

    const datasets = Object.entries(guruMap).map(([nama_guru, data]) => ({
      nama_guru,
      data: periodKeys.map(k => data[k] || 0)
    }));

    res.json({ range: range || 'bulan', labels, datasets });

  } catch (err) {
    console.error('LINE CHART ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   TOP 10 GURU TIDAK HADIR
======================= */
exports.getTopGuruTidakHadir = async (req, res) => {
  try {
    const { range } = req.query;

    let dateFilter = '';

    switch (range) {
      case 'hari':
        dateFilter = `p.tanggal = (NOW() AT TIME ZONE 'Asia/Jakarta')::date`;
        break;

      case 'minggu':
        dateFilter = `p.tanggal >= (NOW() AT TIME ZONE 'Asia/Jakarta')::date - INTERVAL '7 days'`;
        break;

      case 'bulan':
        dateFilter = `
          DATE_TRUNC('month', p.tanggal) =
          DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Jakarta')::date)
        `;
        break;

      default:
        dateFilter = `p.tanggal >= (NOW() AT TIME ZONE 'Asia/Jakarta')::date - INTERVAL '30 days'`;
    }

    const result = await pool.query(`
      SELECT
        (j.guru->>'nama_guru') AS nama_guru,
        COUNT(*) FILTER (WHERE p.status = 'Tidak Hadir') AS total_tidak_hadir
      FROM presensi_guru p
      JOIN jadwal j ON j.id_jadwal = p.id_jadwal
      WHERE ${dateFilter}
      GROUP BY nama_guru
      ORDER BY total_tidak_hadir DESC
      LIMIT 10
    `);

    res.json({
      range: range || '30_hari',
      data: result.rows.map(r => ({
        nama_guru: r.nama_guru,
        total_tidak_hadir: parseInt(r.total_tidak_hadir)
      }))
    });

  } catch (err) {
    console.error('TOP TIDAK HADIR ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};