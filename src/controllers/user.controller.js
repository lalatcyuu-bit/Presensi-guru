const pool = require('../db');
const bcrypt = require('bcrypt');
const XLSX = require('xlsx');
// const {
//   uploadImage,
//   getPublicIdFromUrl,
//   deleteImage
// } = require('../utils/cloudinary');


/* =======================
   CREATE USER
======================= */
exports.createUser = async (req, res) => {
  try {
    const { name, username, password, id_role, id_kelas } = req.body;

    if (!name || !username || !password || !id_role) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    if (id_role === 2 && !id_kelas) {
      return res.status(400).json({ message: 'KM wajib punya kelas' });
    }

    if (id_role !== 2 && id_kelas) {
      return res.status(400).json({ message: 'Role ini tidak boleh punya kelas' });
    }

    const cek = await pool.query(
      `SELECT id FROM users WHERE username = $1`,
      [username]
    );
    if (cek.rowCount) {
      return res.status(400).json({ message: 'Username sudah dipakai' });
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users 
       (name, username, password, id_role, id_kelas, is_profile_complete)
       VALUES ($1, $2, $3, $4, $5, false)`,
      [name, username, hashed, id_role, id_kelas || null]
    );

    res.status(201).json({ message: 'User berhasil dibuat' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   GET ALL USERS
   Query params:
   - ?search=   → cari name atau username (case-insensitive)
   - ?id_role=  → filter by role
   - ?page=     → halaman (default 1)
   - ?limit=    → item per halaman (default 10)
======================= */
exports.getUsers = async (req, res) => {
  try {
    const search = req.query.search || null;
    const id_role = req.query.id_role ? parseInt(req.query.id_role, 10) : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;

    const params = [];
    const where = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(u.name ILIKE $${params.length} OR u.username ILIKE $${params.length})`);
    }

    if (id_role) {
      params.push(id_role);
      where.push(`u.id_role = $${params.length}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    // Hitung total untuk pagination
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT u.id) AS total
       FROM users u
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
      `SELECT
         u.id,
         u.name,
         u.username,
         u.id_role,
         u.id_kelas,
         r.name AS role_name,
         k.id   AS kelas_id,
         k.name         AS kelas_name,
         k.tingkat      AS kelas_tingkat,
         j.nama_jurusan AS kelas_jurusan
       FROM users u
       JOIN roles r ON r.id = u.id_role
       LEFT JOIN kelas k ON k.id = u.id_kelas
       LEFT JOIN jurusan j ON j.id = k.id_jurusan
       ${whereClause}
       ORDER BY u.id DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      params
    );

    const data = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      username: row.username,
      id_role: row.id_role,
      id_kelas: row.id_kelas,
      role: {
        name: row.role_name
      },
      kelas: row.kelas_id ? {
        id: row.kelas_id,
        name: row.kelas_name,
        tingkat: row.kelas_tingkat,
        jurusan: row.kelas_jurusan
      } : null
    }));

    res.json({
      data,
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
   GET USER BY ID
======================= */
exports.getUserById = async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, username, id_role, id_kelas
     FROM users
     WHERE id = $1`,
    [req.params.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'User tidak ditemukan' });
  }

  res.json(result.rows[0]);
};

// exports.getUserProfile = async (req, res) => { ... };

/* =======================
   UPDATE USER
======================= */
exports.updateUser = async (req, res) => {
  try {
    const { name, username, password, id_role, id_kelas, status } = req.body;
    const { id } = req.params;

    if (!name || !username || !id_role) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    // ===== VALIDASI ROLE VS KELAS (fix: sebelumnya tidak ada) =====
    if (id_role === 2 && !id_kelas) {
      return res.status(400).json({ message: 'KM wajib punya kelas' });
    }
    if (id_role !== 2 && id_kelas) {
      return res.status(400).json({ message: 'Role ini tidak boleh punya kelas' });
    }

    // ===== CEK USERNAME DUPLIKAT (fix: sebelumnya tidak ada) =====
    const cekUsername = await pool.query(
      `SELECT id FROM users WHERE username = $1 AND id != $2`,
      [username, id]
    );
    if (cekUsername.rowCount > 0) {
      return res.status(400).json({ message: 'Username sudah dipakai' });
    }

    let query = `
      UPDATE users
      SET name = $1,
          username = $2,
          id_role = $3,
          id_kelas = $4,
          status = $5,
          updated_at = CURRENT_TIMESTAMP
    `;
    const values = [name, username, id_role, id_kelas || null, status];

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      query += `, password = $6 WHERE id = $7 RETURNING id`;
      values.push(hashed, id);
    } else {
      query += ` WHERE id = $6 RETURNING id`;
      values.push(id);
    }

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    res.json({ message: 'User berhasil diupdate' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    // ===== CEK DEPENDENSI PRESENSI (fix: sebelumnya tidak ada) =====
    const cekPresensi = await pool.query(
      `SELECT 1 FROM presensi_guru WHERE diabsen_oleh = $1 LIMIT 1`,
      [req.params.id]
    );
    if (cekPresensi.rowCount > 0) {
      return res.status(400).json({
        message: 'User tidak bisa dihapus, masih memiliki data presensi'
      });
    }

    const result = await pool.query(
      `DELETE FROM users WHERE id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    res.json({ message: 'User berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.importUser = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ message: 'File wajib diupload' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data.length) {
      return res.status(400).json({ message: 'File kosong' });
    }

    const inserted = [];
    const skipped = [];

    for (const row of data) {

      const name = row.name?.trim();
      const username = row.username?.trim();
      const password = row.password?.trim();
      const role = row.role?.toLowerCase();
      const kelasName = row.kelas?.trim();

      if (!name || !username || !password || !role) {
        skipped.push({ row, reason: 'Data tidak lengkap' });
        continue;
      }

      // ======================
      // MAP ROLE
      // ======================
      let id_role = null;

      if (role === 'admin') id_role = 1;
      else if (role === 'km') id_role = 2;
      else if (role === 'piket') id_role = 3;
      else {
        skipped.push({ row, reason: 'Role tidak valid' });
        continue;
      }

      // ======================
      // VALIDASI KM
      // ======================
      let id_kelas = null;

      if (id_role === 2) {
        if (!kelasName) {
          skipped.push({ row, reason: 'KM wajib punya kelas' });
          continue;
        }

        const kelas = await pool.query(
          `SELECT id FROM kelas WHERE LOWER(name) = LOWER($1)`,
          [kelasName]
        );

        if (!kelas.rowCount) {
          skipped.push({ row, reason: 'Kelas tidak ditemukan' });
          continue;
        }

        id_kelas = kelas.rows[0].id;

      } else {
        if (kelasName) {
          skipped.push({ row, reason: 'Role ini tidak boleh punya kelas' });
          continue;
        }
      }

      // ======================
      // CEK USERNAME
      // ======================
      const cek = await pool.query(
        `SELECT id FROM users WHERE username = $1`,
        [username]
      );

      if (cek.rowCount > 0) {
        skipped.push({ row, reason: 'Username sudah dipakai' });
        continue;
      }

      // ======================
      // HASH PASSWORD
      // ======================
      const hashed = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `INSERT INTO users 
         (name, username, password, id_role, id_kelas, is_profile_complete)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING id, name, username`,
        [name, username, hashed, id_role, id_kelas]
      );

      inserted.push(result.rows[0]);
    }

    res.json({
      message: 'Import user selesai',
      total: data.length,
      berhasil: inserted.length,
      gagal: skipped.length,
      inserted,
      skipped
    });

  } catch (err) {
    console.error('IMPORT USER ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// exports.updateProfile = async (req, res) => { ... };