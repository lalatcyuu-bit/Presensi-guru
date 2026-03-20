const pool = require('../db');
const XLSX = require('xlsx');
const {
  getWIBDate,
} = require('../utils/timezone');

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

function getDateConfig(range) {
  switch (range) {
    case 'minggu':
      return {
        dateFilter: `
          p.tanggal >= DATE_TRUNC('week', (NOW() AT TIME ZONE 'Asia/Jakarta')::date)::date
          AND p.tanggal <= (DATE_TRUNC('week', (NOW() AT TIME ZONE 'Asia/Jakarta')::date) + INTERVAL '4 days')::date
        `,
        dateStart: `DATE_TRUNC('week', (NOW() AT TIME ZONE 'Asia/Jakarta')::date)::date`,
        dateEnd: `(DATE_TRUNC('week', (NOW() AT TIME ZONE 'Asia/Jakarta')::date) + INTERVAL '4 days')::date`,
        prevDateFilter: `
          p.tanggal >= (DATE_TRUNC('week', (NOW() AT TIME ZONE 'Asia/Jakarta')::date) - INTERVAL '7 days')::date
          AND p.tanggal <= (DATE_TRUNC('week', (NOW() AT TIME ZONE 'Asia/Jakarta')::date) - INTERVAL '3 days')::date
        `,
        groupExpr: `EXTRACT(DOW FROM p.tanggal)::int`,
        labels: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
        periodKeys: [1, 2, 3, 4, 5]
      };
    case 'tahun':
      return {
        dateFilter: `DATE_TRUNC('year', p.tanggal) = DATE_TRUNC('year', (NOW() AT TIME ZONE 'Asia/Jakarta')::date)`,
        dateStart: `DATE_TRUNC('year', (NOW() AT TIME ZONE 'Asia/Jakarta')::date)::date`,
        dateEnd: `(NOW() AT TIME ZONE 'Asia/Jakarta')::date`,
        prevDateFilter: `DATE_TRUNC('year', p.tanggal) = (DATE_TRUNC('year', (NOW() AT TIME ZONE 'Asia/Jakarta')::date) - INTERVAL '1 year')`,
        groupExpr: `EXTRACT(MONTH FROM p.tanggal)::int`,
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
        periodKeys: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      };
    case 'bulan':
    default:
      return {
        dateFilter: `DATE_TRUNC('month', p.tanggal) = DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Jakarta')::date)`,
        dateStart: `DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Jakarta')::date)::date`,
        dateEnd: `(NOW() AT TIME ZONE 'Asia/Jakarta')::date`,
        prevDateFilter: `DATE_TRUNC('month', p.tanggal) = (DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Jakarta')::date) - INTERVAL '1 month')`,
        groupExpr: `CEIL(EXTRACT(DAY FROM p.tanggal) / 7.0)::int`,
        labels: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'],
        periodKeys: [1, 2, 3, 4]
      };
  }
}

/* =======================
   GET ALL GURU
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

    if (search) {
      params.push(`%${search}%`);
      where.push(`(g.nama_guru ILIKE $${params.length} OR g.nip ILIKE $${params.length})`);
    }
    if (id_mapel) {
      params.push(id_mapel);
      where.push(`g.mapel @> to_jsonb(ARRAY[$${params.length}]::int[])`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const fetchAll = req.query.all === 'true';
    if (fetchAll) {
      const result = await pool.query(
        `${guruWithMapelQuery} ${whereClause} GROUP BY g.id_guru ORDER BY g.id_guru DESC`,
        params
      );
      return res.json({ data: result.rows });
    }

    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT g.id_guru) AS total FROM guru g ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    params.push(limit);
    const limitIndex = params.length;
    params.push(offset);
    const offsetIndex = params.length;

    const result = await pool.query(
      `${guruWithMapelQuery} ${whereClause} GROUP BY g.id_guru ORDER BY g.id_guru DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      params
    );

    res.json({
      data: result.rows,
      pagination: { page, perPage: limit, totalItems: total, totalPages }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createGuru = async (req, res) => {
  try {
    const { nama_guru, nip, mapel } = req.body;
    if (!nama_guru || !Array.isArray(mapel) || mapel.length === 0)
      return res.status(400).json({ message: 'nama_guru & mapel wajib diisi' });
    const cek = await pool.query(`SELECT id_mapel FROM mapel WHERE id_mapel = ANY($1::int[])`, [mapel]);
    if (cek.rowCount !== mapel.length)
      return res.status(400).json({ message: 'Mapel tidak valid' });
    const insert = await pool.query(
      `INSERT INTO guru (nama_guru, nip, mapel) VALUES ($1, $2, $3) RETURNING id_guru`,
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

exports.getGuruById = async (req, res) => {
  try {
    const result = await pool.query(
      guruWithMapelQuery + ` WHERE g.id_guru = $1 GROUP BY g.id_guru`,
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Guru tidak ditemukan' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getGuruByMapel = async (req, res) => {
  const id_mapel = parseInt(req.query.id_mapel, 10);
  if (isNaN(id_mapel))
    return res.status(400).json({ success: false, message: 'id_mapel wajib dan harus angka' });
  try {
    const result = await pool.query(
      `${guruWithMapelQuery} WHERE g.mapel @> to_jsonb(ARRAY[$1]::int[]) GROUP BY g.id_guru ORDER BY g.nama_guru ASC`,
      [id_mapel]
    );
    if (result.rows.length === 0)
      return res.json({ message: 'Belum ada guru untuk mapel ini', data: [], total: 0 });
    res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateGuru = async (req, res) => {
  const { id } = req.params;
  const { nama_guru, nip, mapel } = req.body;
  if (!nama_guru || !Array.isArray(mapel))
    return res.status(400).json({ message: 'data tidak valid' });
  const cek = await pool.query(`SELECT id_mapel FROM mapel WHERE id_mapel = ANY($1::int[])`, [mapel]);
  if (cek.rowCount !== mapel.length)
    return res.status(400).json({ message: 'Mapel tidak valid' });
  await pool.query(
    `UPDATE guru SET nama_guru = $1, nip = $2, mapel = $3 WHERE id_guru = $4`,
    [nama_guru, nip || null, JSON.stringify(mapel), id]
  );
  const result = await pool.query(guruWithMapelQuery + ` WHERE g.id_guru = $1 GROUP BY g.id_guru`, [id]);
  res.json(result.rows[0]);
};

exports.deleteGuru = async (req, res) => {
  try {
    const cekJadwal = await pool.query(
      `SELECT 1 FROM jadwal WHERE (guru->>'id_guru')::int = $1 LIMIT 1`,
      [req.params.id]
    );
    if (cekJadwal.rowCount > 0)
      return res.status(400).json({ message: 'Guru tidak bisa dihapus, masih memiliki jadwal aktif' });
    const result = await pool.query(`DELETE FROM guru WHERE id_guru = $1`, [req.params.id]);
    if (result.rowCount === 0)
      return res.status(404).json({ message: 'Guru tidak ditemukan' });
    res.json({ message: 'Guru berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.importGuru = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File tidak ditemukan' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    if (data.length === 0) return res.status(400).json({ message: 'File kosong' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const row of data) {
        const { nama_guru, nip = null } = row;
        if (!nama_guru || !row.mapel) throw new Error(`Data tidak lengkap pada guru: ${nama_guru}`);
        const mapelArray = row.mapel.toString().split(',').map(x => parseInt(x.trim(), 10));
        const cek = await client.query(`SELECT id_mapel FROM mapel WHERE id_mapel = ANY($1::int[])`, [mapelArray]);
        if (cek.rowCount !== mapelArray.length) throw new Error(`Mapel tidak valid pada guru: ${nama_guru}`);
        await client.query(
          `INSERT INTO guru (nama_guru, nip, mapel) VALUES ($1, $2, $3)`,
          [nama_guru, nip, JSON.stringify(mapelArray)]
        );
      }
      await client.query('COMMIT');
      res.json({ message: 'Import berhasil', total: data.length });
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

exports.getStatistikGuru = async (req, res) => {
  try {
    const { id_guru, range } = req.query;
    if (!id_guru) return res.status(400).json({ message: 'id_guru wajib diisi' });
    let dateFilter = '';
    switch (range) {
      case 'hari': dateFilter = `p.tanggal = CURRENT_DATE`; break;
      case 'minggu': dateFilter = `p.tanggal >= CURRENT_DATE - INTERVAL '7 days'`; break;
      case 'bulan': dateFilter = `DATE_TRUNC('month', p.tanggal) = DATE_TRUNC('month', CURRENT_DATE)`; break;
      case 'semester': dateFilter = `p.tanggal >= CURRENT_DATE - INTERVAL '6 months'`; break;
      default: dateFilter = `p.tanggal >= CURRENT_DATE - INTERVAL '30 days'`;
    }
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE p.status = 'Hadir') AS hadir,
        COUNT(*) FILTER (WHERE p.status = 'Tidak Hadir' AND p.memberikan_tugas = true) AS tidak_hadir_tugas,
        COUNT(*) FILTER (WHERE p.status = 'Tidak Hadir' AND (p.memberikan_tugas = false OR p.memberikan_tugas IS NULL)) AS tidak_hadir,
        COUNT(*) AS total
      FROM presensi_guru p
      JOIN jadwal j ON j.id_jadwal = p.id_jadwal
      WHERE (j.guru->>'id_guru')::int = $1
        AND ${dateFilter}
        AND p.status_approve = 'Approved'
    `, [id_guru]);
    res.json({
      id_guru: parseInt(id_guru),
      range: range || '30_hari',
      summary: {
        hadir: parseInt(result.rows[0].hadir),
        tidak_hadir_tugas: parseInt(result.rows[0].tidak_hadir_tugas),
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
   SUMMARY STATS
======================= */
exports.getSummaryStats = async (req, res) => {
  try {
    const { range, id_kelas } = req.query;
    const { dateFilter, prevDateFilter } = getDateConfig(range);

    const params = [];
    let kelasFilter = '';
    if (id_kelas) {
      params.push(parseInt(id_kelas));
      kelasFilter = `AND j.id_kelas = $${params.length}`;
    }

    const curr = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE p.status = 'Hadir') AS hadir,
        COUNT(*) FILTER (WHERE p.status = 'Tidak Hadir' AND p.memberikan_tugas = true) AS tidak_hadir_tugas,
        COUNT(*) FILTER (WHERE p.status = 'Tidak Hadir' AND (p.memberikan_tugas = false OR p.memberikan_tugas IS NULL)) AS tidak_hadir
      FROM presensi_guru p
      JOIN jadwal j ON j.id_jadwal = p.id_jadwal
      WHERE ${dateFilter}
        AND p.status_approve = 'Approved'
        ${kelasFilter}
    `, params);

    const prev = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE p.status = 'Hadir') AS hadir
      FROM presensi_guru p
      JOIN jadwal j ON j.id_jadwal = p.id_jadwal
      WHERE ${prevDateFilter}
        AND p.status_approve = 'Approved'
        ${kelasFilter}
    `, params);

    const c = curr.rows[0];
    const p = prev.rows[0];
    const total = parseInt(c.total);
    const hadir = parseInt(c.hadir);
    const tidakHadirTugas = parseInt(c.tidak_hadir_tugas);
    const tidakHadir = parseInt(c.tidak_hadir);
    const prevTotal = parseInt(p.total);
    const prevHadir = parseInt(p.hadir);
    const pctHadir = total > 0 ? Math.round((hadir / total) * 100) : 0;
    const prevPctHadir = prevTotal > 0 ? Math.round((prevHadir / prevTotal) * 100) : 0;

    res.json({
      range: range || 'bulan',
      total, hadir, tidak_hadir_tugas: tidakHadirTugas, tidak_hadir: tidakHadir,
      pct_hadir: pctHadir,
      pct_tidak_hadir: total > 0 ? Math.round(((tidakHadirTugas + tidakHadir) / total) * 100) : 0,
      trend: pctHadir - prevPctHadir
    });
  } catch (err) {
    console.error('SUMMARY STATS ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   PERFORMA PER GURU
======================= */
exports.getPerformaGuru = async (req, res) => {
  try {
    const { range, id_kelas } = req.query;
    const { dateStart, dateEnd } = getDateConfig(range);

    const params = [];
    let kelasFilter = '';
    if (id_kelas) {
      params.push(parseInt(id_kelas));
      kelasFilter = `AND j.id_kelas = $${params.length}`;
    }

    const result = await pool.query(`
      WITH slots AS (
        SELECT
          gs::date AS tanggal,
          j.id_jadwal,
          j.jam_selesai,
          j.guru->>'nama_guru' AS nama_guru
        FROM generate_series(
          ${dateStart},
          ${dateEnd},
          '1 day'::interval
        ) gs
        JOIN jadwal j ON j.hari = CASE EXTRACT(DOW FROM gs::date)
          WHEN 0 THEN 'Minggu'
          WHEN 1 THEN 'Senin'
          WHEN 2 THEN 'Selasa'
          WHEN 3 THEN 'Rabu'
          WHEN 4 THEN 'Kamis'
          WHEN 5 THEN 'Jumat'
          WHEN 6 THEN 'Sabtu'
        END
        AND gs::date >= j.created_at::date
        -- Exclude slot yang terkena kalender akademik
        AND NOT EXISTS (
          SELECT 1 FROM kalender_akademik ka
          WHERE gs::date BETWEEN ka.tanggal_mulai AND ka.tanggal_selesai
            AND (
              -- Tidak ada jam = seharian
              ka.jam_mulai IS NULL OR ka.jam_selesai IS NULL
              -- Ada jam = cek overlap dengan slot jadwal
              OR (j.jam_mulai < ka.jam_selesai AND j.jam_selesai > ka.jam_mulai)
            )
        )
        ${kelasFilter}
      )
      SELECT
        s.nama_guru,
        COUNT(*) AS total_slot,
        COUNT(*) FILTER (WHERE p.status = 'Hadir' AND p.status_approve = 'Approved') AS hadir,
        COUNT(*) FILTER (WHERE p.status = 'Tidak Hadir' AND p.memberikan_tugas = true AND p.status_approve = 'Approved') AS tidak_hadir_tugas,
        COUNT(*) FILTER (WHERE p.status = 'Tidak Hadir' AND (p.memberikan_tugas = false OR p.memberikan_tugas IS NULL) AND p.status_approve = 'Approved') AS tidak_hadir,
        COUNT(*) FILTER (
          WHERE (p.id_presensi IS NULL OR p.status_approve = 'Rejected')
          AND NOT (
            s.tanggal = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
            AND s.jam_selesai > (NOW() AT TIME ZONE 'Asia/Jakarta')::time
          )
        ) AS tidak_dipresensi
      FROM slots s
      LEFT JOIN presensi_guru p ON p.id_jadwal = s.id_jadwal AND p.tanggal = s.tanggal
      GROUP BY s.nama_guru
      ORDER BY hadir DESC, s.nama_guru ASC
    `, params);

    const data = result.rows.map(r => {
      const totalSlot = parseInt(r.total_slot);
      const hadir = parseInt(r.hadir);
      return {
        nama_guru: r.nama_guru,
        total_slot: totalSlot,
        hadir,
        tidak_hadir_tugas: parseInt(r.tidak_hadir_tugas),
        tidak_hadir: parseInt(r.tidak_hadir),
        tidak_dipresensi: parseInt(r.tidak_dipresensi),
        pct_hadir: totalSlot > 0 ? Math.round((hadir / totalSlot) * 100) : 0
      };
    });

    res.json({ range: range || 'bulan', data });
  } catch (err) {
    console.error('PERFORMA GURU ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   BAR CHART — 3 KATEGORI
======================= */
exports.getBarHadirVsTidak = async (req, res) => {
  try {
    const { range, id_kelas } = req.query;
    const { dateFilter } = getDateConfig(range);

    const params = [];
    let extraFilter = '';
    if (id_kelas) {
      params.push(parseInt(id_kelas));
      extraFilter = `AND j.id_kelas = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE p.status = 'Hadir') AS hadir,
        COUNT(*) FILTER (WHERE p.status = 'Tidak Hadir' AND p.memberikan_tugas = true) AS tidak_hadir_tugas,
        COUNT(*) FILTER (WHERE p.status = 'Tidak Hadir' AND (p.memberikan_tugas = false OR p.memberikan_tugas IS NULL)) AS tidak_hadir,
        COUNT(*) AS total
      FROM presensi_guru p
      JOIN jadwal j ON j.id_jadwal = p.id_jadwal
      WHERE ${dateFilter}
        AND p.status_approve = 'Approved'
        ${extraFilter}
    `, params);

    const r = result.rows[0];
    const total = parseInt(r.total);
    const hadir = parseInt(r.hadir);
    const tidakHadirTugas = parseInt(r.tidak_hadir_tugas);
    const tidakHadir = parseInt(r.tidak_hadir);

    res.json({
      range: range || 'bulan',
      labels: ['Hadir', 'Tidak Hadir + Tugas', 'Tidak Hadir'],
      data: [hadir, tidakHadirTugas, tidakHadir],
      percentages: [
        total > 0 ? Math.round((hadir / total) * 100) : 0,
        total > 0 ? Math.round((tidakHadirTugas / total) * 100) : 0,
        total > 0 ? Math.round((tidakHadir / total) * 100) : 0,
      ],
      total
    });
  } catch (err) {
    console.error('BAR CHART ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   UNPRESENSI STATS
======================= */
exports.getUnpresensiStats = async (req, res) => {
  try {
    const { range, id_kelas } = req.query;
    const { dateStart } = getDateConfig(range);

    const params = [];
    let kelasFilter = '';
    if (id_kelas) {
      params.push(parseInt(id_kelas));
      kelasFilter = `AND j.id_kelas = $${params.length}`;
    }

    const result = await pool.query(`
      WITH slots AS (
        SELECT
          gs::date AS tanggal,
          j.id_jadwal,
          j.jam_selesai
        FROM generate_series(
          ${dateStart},
          (NOW() AT TIME ZONE 'Asia/Jakarta')::date,
          '1 day'::interval
        ) gs
        JOIN jadwal j ON j.hari = CASE EXTRACT(DOW FROM gs::date)
          WHEN 0 THEN 'Minggu'
          WHEN 1 THEN 'Senin'
          WHEN 2 THEN 'Selasa'
          WHEN 3 THEN 'Rabu'
          WHEN 4 THEN 'Kamis'
          WHEN 5 THEN 'Jumat'
          WHEN 6 THEN 'Sabtu'
        END
        AND gs::date >= j.created_at::date
        -- Exclude slot yang terkena kalender akademik
        AND NOT EXISTS (
          SELECT 1 FROM kalender_akademik ka
          WHERE gs::date BETWEEN ka.tanggal_mulai AND ka.tanggal_selesai
            AND (
              -- Tidak ada jam = seharian
              ka.jam_mulai IS NULL OR ka.jam_selesai IS NULL
              -- Ada jam = cek overlap dengan slot jadwal
              OR (j.jam_mulai < ka.jam_selesai AND j.jam_selesai > ka.jam_mulai)
            )
        )
        ${kelasFilter}
      )
      SELECT COUNT(*) AS total_belum
      FROM slots s
      LEFT JOIN presensi_guru p ON p.id_jadwal = s.id_jadwal AND p.tanggal = s.tanggal
      WHERE (p.id_presensi IS NULL OR p.status_approve = 'Rejected')
        AND NOT (
          s.tanggal = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
          AND s.jam_selesai > (NOW() AT TIME ZONE 'Asia/Jakarta')::time
        )
    `, params);

    res.json({ range: range || 'bulan', total_belum: parseInt(result.rows[0].total_belum) });
  } catch (err) {
    console.error('UNPRESENSI STATS ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   LINE CHART PER GURU
======================= */
exports.getLineHadirPerGuru = async (req, res) => {
  try {
    const { range, id_kelas, nama_guru: namaGuruFilter } = req.query;
    const { dateFilter, groupExpr, labels, periodKeys } = getDateConfig(range);

    let namaGuruList = [];

    if (namaGuruFilter) {
      namaGuruList = [namaGuruFilter];
    } else if (id_kelas) {
      const guruResult = await pool.query(`
        SELECT DISTINCT (j.guru->>'nama_guru') AS nama_guru
        FROM jadwal j WHERE j.id_kelas = $1 ORDER BY nama_guru ASC
      `, [parseInt(id_kelas)]);
      namaGuruList = guruResult.rows.map(r => r.nama_guru);
    } else {
      const topResult = await pool.query(`
        SELECT (j.guru->>'nama_guru') AS nama_guru
        FROM presensi_guru p
        JOIN jadwal j ON j.id_jadwal = p.id_jadwal
        WHERE ${dateFilter}
          AND p.status = 'Hadir'
          AND p.status_approve = 'Approved'
        GROUP BY nama_guru ORDER BY COUNT(*) DESC LIMIT 5
      `);
      namaGuruList = topResult.rows.map(r => r.nama_guru);
    }

    if (namaGuruList.length === 0)
      return res.json({ range: range || 'bulan', labels, datasets: [], guruList: [] });

    const params = [namaGuruList];
    let kelasFilter = '';
    if (id_kelas) {
      params.push(parseInt(id_kelas));
      kelasFilter = `AND j.id_kelas = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT
        (j.guru->>'nama_guru') AS nama_guru,
        ${groupExpr} AS period_key,
        COUNT(*) FILTER (WHERE p.status = 'Hadir') AS total_hadir
      FROM presensi_guru p
      JOIN jadwal j ON j.id_jadwal = p.id_jadwal
      WHERE ${dateFilter}
        AND p.status_approve = 'Approved'
        AND (j.guru->>'nama_guru') = ANY($1)
        ${kelasFilter}
      GROUP BY nama_guru, period_key
      ORDER BY nama_guru ASC, period_key ASC
    `, params);

    const guruMap = {};
    for (const row of result.rows) {
      if (!guruMap[row.nama_guru]) guruMap[row.nama_guru] = {};
      guruMap[row.nama_guru][row.period_key] = parseInt(row.total_hadir);
    }

    const datasets = namaGuruList.map(nama_guru => ({
      nama_guru,
      data: periodKeys.map(k => guruMap[nama_guru]?.[k] || 0)
    }));

    let allGuruList = [];
    if (id_kelas) {
      const all = await pool.query(
        `SELECT DISTINCT (j.guru->>'nama_guru') AS nama_guru FROM jadwal j WHERE j.id_kelas = $1 ORDER BY nama_guru ASC`,
        [parseInt(id_kelas)]
      );
      allGuruList = all.rows.map(r => r.nama_guru);
    } else {
      const all = await pool.query(`
        SELECT (j.guru->>'nama_guru') AS nama_guru
        FROM presensi_guru p
        JOIN jadwal j ON j.id_jadwal = p.id_jadwal
        WHERE ${dateFilter}
          AND p.status_approve = 'Approved'
        GROUP BY nama_guru ORDER BY COUNT(*) DESC LIMIT 20
      `);
      allGuruList = all.rows.map(r => r.nama_guru);
    }

    res.json({ range: range || 'bulan', labels, datasets, guruList: allGuruList });
  } catch (err) {
    console.error('LINE CHART ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   TREN KESELURUHAN
======================= */
exports.getTrenKehadiranKeseluruhan = async (req, res) => {
  try {
    const { range, id_kelas } = req.query;
    const { dateFilter, groupExpr, labels, periodKeys } = getDateConfig(range);

    const params = [];
    let kelasFilter = '';
    if (id_kelas) {
      params.push(parseInt(id_kelas));
      kelasFilter = `AND j.id_kelas = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT
        ${groupExpr} AS period_key,
        COUNT(*) FILTER (WHERE p.status = 'Hadir') AS total_hadir,
        COUNT(*) FILTER (WHERE p.status = 'Tidak Hadir' AND p.memberikan_tugas = true) AS total_tidak_hadir_tugas,
        COUNT(*) FILTER (WHERE p.status = 'Tidak Hadir' AND (p.memberikan_tugas = false OR p.memberikan_tugas IS NULL)) AS total_tidak_hadir
      FROM presensi_guru p
      JOIN jadwal j ON j.id_jadwal = p.id_jadwal
      WHERE ${dateFilter}
        AND p.status_approve = 'Approved'
        ${kelasFilter}
      GROUP BY period_key ORDER BY period_key ASC
    `, params);

    const dataMap = {};
    for (const row of result.rows) {
      dataMap[row.period_key] = {
        hadir: parseInt(row.total_hadir),
        tidakHadirTugas: parseInt(row.total_tidak_hadir_tugas),
        tidakHadir: parseInt(row.total_tidak_hadir)
      };
    }

    res.json({
      range: range || 'bulan',
      labels,
      hadir: periodKeys.map(k => dataMap[k]?.hadir || 0),
      tidakHadirTugas: periodKeys.map(k => dataMap[k]?.tidakHadirTugas || 0),
      tidakHadir: periodKeys.map(k => dataMap[k]?.tidakHadir || 0)
    });
  } catch (err) {
    console.error('TREN ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   TOP 10 HADIR
======================= */
exports.getTopGuruHadir = async (req, res) => {
  try {
    const { range, id_kelas } = req.query;
    const { dateFilter } = getDateConfig(range);

    const params = [];
    let kelasFilter = '';
    if (id_kelas) {
      params.push(parseInt(id_kelas));
      kelasFilter = `AND j.id_kelas = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT
        nama_guru, total_hadir, total_jadwal,
        RANK() OVER (ORDER BY total_hadir DESC) AS rank
      FROM (
        SELECT
          (j.guru->>'nama_guru') AS nama_guru,
          COUNT(*) FILTER (WHERE p.status = 'Hadir') AS total_hadir,
          COUNT(*) AS total_jadwal
        FROM presensi_guru p
        JOIN jadwal j ON j.id_jadwal = p.id_jadwal
        WHERE ${dateFilter}
          AND p.status_approve = 'Approved'
          ${kelasFilter}
        GROUP BY nama_guru
      ) data
      ORDER BY total_hadir DESC LIMIT 10
    `, params);

    res.json({
      range: range || 'bulan',
      data: result.rows.map(r => ({
        rank: parseInt(r.rank),
        nama_guru: r.nama_guru,
        total_hadir: parseInt(r.total_hadir),
        total_jadwal: parseInt(r.total_jadwal),
        persen: r.total_jadwal > 0
          ? Math.round((parseInt(r.total_hadir) / parseInt(r.total_jadwal)) * 100)
          : 0
      }))
    });
  } catch (err) {
    console.error('TOP HADIR ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   TOP 10 TIDAK HADIR
======================= */
exports.getTopGuruTidakHadir = async (req, res) => {
  try {
    const { range, id_kelas } = req.query;
    const { dateFilter } = getDateConfig(range);

    const params = [];
    let kelasFilter = '';
    if (id_kelas) {
      params.push(parseInt(id_kelas));
      kelasFilter = `AND j.id_kelas = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT
        nama_guru, total_tidak_hadir,
        RANK() OVER (ORDER BY total_tidak_hadir DESC) AS rank
      FROM (
        SELECT
          (j.guru->>'nama_guru') AS nama_guru,
          COUNT(*) FILTER (WHERE p.status = 'Tidak Hadir') AS total_tidak_hadir
        FROM presensi_guru p
        JOIN jadwal j ON j.id_jadwal = p.id_jadwal
        WHERE ${dateFilter}
          AND p.status_approve = 'Approved'
          ${kelasFilter}
        GROUP BY nama_guru
      ) data
      ORDER BY total_tidak_hadir DESC LIMIT 10
    `, params);

    res.json({
      range: range || 'bulan',
      data: result.rows.map(r => ({
        rank: parseInt(r.rank),
        nama_guru: r.nama_guru,
        total_tidak_hadir: parseInt(r.total_tidak_hadir)
      }))
    });
  } catch (err) {
    console.error('TOP TIDAK HADIR ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};