const pool = require('../db');

/* =======================
   CREATE MAPEL
======================= */
exports.createMapel = async (req, res) => {
  const { nama_mapel, kode_mapel, status } = req.body;

  if (!nama_mapel || !kode_mapel) {
    return res.status(400).json({
      message: 'nama_mapel dan kode_mapel wajib diisi'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO mapel (nama_mapel, kode_mapel, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nama_mapel, kode_mapel.toUpperCase(), status ?? true]
    );

    res.status(201).json({
      message: 'Mapel berhasil ditambahkan',
      data: result.rows[0]
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        message: 'Kode mapel sudah digunakan'
      });
    }

    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   GET MAPEL
   Query params:
   - ?all=true     → ambil semua tanpa pagination
   - ?search=      → cari nama_mapel atau kode_mapel (case-insensitive)
   - ?status=      → filter 'aktif' | 'nonaktif'
   - ?page=        → halaman (default 1)
   - ?limit=       → item per halaman (default 10)
======================= */
exports.getMapel = async (req, res) => {
  try {
    const search = req.query.search || null;
    const status = req.query.status || null;  // 'aktif' | 'nonaktif'
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;

    const params = [];
    const where = [];

    // Filter search
    if (search) {
      params.push(`%${search}%`);
      where.push(`(nama_mapel ILIKE $${params.length} OR kode_mapel ILIKE $${params.length})`);
    }

    // Filter status
    if (status === 'aktif') {
      where.push(`status = true`);
    } else if (status === 'nonaktif') {
      where.push(`status = false`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    // Ambil semua tanpa pagination (untuk keperluan dropdown, dll)
    if (req.query.all === 'true') {
      const result = await pool.query(
        `SELECT id_mapel, nama_mapel, kode_mapel, status
         FROM mapel
         ${whereClause}
         ORDER BY nama_mapel ASC`,
        params
      );
      return res.json({ data: result.rows });
    }

    // Hitung total untuk pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM mapel ${whereClause}`,
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
      `SELECT id_mapel, nama_mapel, kode_mapel, status
       FROM mapel
       ${whereClause}
       ORDER BY id_mapel DESC
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

/* =======================
   GET MAPEL BY ID
======================= */
exports.getMapelById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_mapel, nama_mapel, kode_mapel, status
       FROM mapel
       WHERE id_mapel = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Mapel tidak ditemukan' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   UPDATE MAPEL
======================= */
exports.updateMapel = async (req, res) => {
  const { nama_mapel, kode_mapel, status } = req.body;

  if (!nama_mapel || !kode_mapel) {
    return res.status(400).json({
      message: 'nama_mapel dan kode_mapel wajib diisi'
    });
  }

  try {
    const result = await pool.query(
      `UPDATE mapel
       SET nama_mapel = $1,
           kode_mapel = $2,
           status = $3
       WHERE id_mapel = $4
       RETURNING *`,
      [nama_mapel, kode_mapel.toUpperCase(), status, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Mapel tidak ditemukan' });
    }

    res.json({
      message: 'Mapel berhasil diperbarui',
      data: result.rows[0]
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        message: 'Kode mapel sudah digunakan'
      });
    }

    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   NON-AKTIFKAN MAPEL
======================= */
exports.nonAktifkanMapel = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE mapel
       SET status = false
       WHERE id_mapel = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Mapel tidak ditemukan' });
    }

    res.json({
      message: 'Mapel berhasil dinonaktifkan',
      data: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   DELETE MAPEL
======================= */
exports.deleteMapel = async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM mapel WHERE id_mapel = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Mapel tidak ditemukan' });
    }

    res.json({
      message: 'Mapel berhasil dihapus',
      data: result.rows[0]
    });

  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        message: 'Mapel tidak dapat dihapus karena masih digunakan oleh guru'
      });
    }

    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const XLSX = require('xlsx');

/* =======================
   IMPORT MAPEL
======================= */
exports.importMapel = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        message: 'File wajib diupload'
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data.length) {
      return res.status(400).json({
        message: 'File kosong'
      });
    }

    const inserted = [];
    const skipped = [];

    for (const row of data) {

      const nama_mapel = row.nama_mapel?.trim();
      const kode_mapel = row.kode_mapel?.trim();
      let status = row.status?.toLowerCase();

      if (!nama_mapel || !kode_mapel) {
        skipped.push({ row, reason: 'Data tidak lengkap' });
        continue;
      }

      // normalize status
      if (status === 'aktif') {
        status = true;
      } else if (status === 'nonaktif') {
        status = false;
      } else {
        status = true; // default
      }

      // cek duplicate kode_mapel
      const cek = await pool.query(
        `SELECT id_mapel FROM mapel WHERE kode_mapel = $1`,
        [kode_mapel.toUpperCase()]
      );

      if (cek.rowCount > 0) {
        skipped.push({ row, reason: 'Kode mapel sudah ada' });
        continue;
      }

      // insert
      const result = await pool.query(
        `INSERT INTO mapel (nama_mapel, kode_mapel, status)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [nama_mapel, kode_mapel.toUpperCase(), status]
      );

      inserted.push(result.rows[0]);
    }

    res.json({
      message: 'Import mapel selesai',
      total: data.length,
      berhasil: inserted.length,
      gagal: skipped.length,
      inserted,
      skipped
    });

  } catch (err) {
    console.error('IMPORT MAPEL ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};