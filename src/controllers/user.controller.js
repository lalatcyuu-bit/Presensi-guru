const pool = require('../db');
const bcrypt = require('bcrypt');
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
      query += `, password = $6 WHERE id = $7`;
      values.push(hashed, id);
    } else {
      query += ` WHERE id = $6`;
      values.push(id);
    }

    await pool.query(query, values);
    res.json({ message: 'User berhasil diupdate' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   DELETE USER
======================= */
exports.deleteUser = async (req, res) => {
  try {
    await pool.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);
    res.json({ message: 'User berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// exports.updateProfile = async (req, res) => { ... };