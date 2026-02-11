const pool = require('../db');
const bcrypt = require('bcrypt');
const {
  uploadImage,
  getPublicIdFromUrl,
  deleteImage
} = require('../utils/cloudinary');


/* =======================
    CREATE USER (ADMIN)
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
    GET ALL USERS (ADMIN)
======================= */
exports.getUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.username, u.no_hp, u.foto_profil, u.status,
             u.id_role, r.name AS role_name, u.id_kelas
      FROM users u
      JOIN roles r ON r.id = u.id_role
      ORDER BY u.name ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
    GET USER PROFILE (SELF)
    Any authenticated user can get their own profile
======================= */
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT u.id, u.name, u.username, u.no_hp, u.foto_profil, 
              u.status, u.is_profile_complete, u.id_role, u.id_kelas,
              r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.id_role
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    res.json({
      message: 'Profile berhasil dimuat',
      data: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
    UPDATE USER (ADMIN)
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
    DELETE USER (ADMIN)
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

/* =======================
    UPDATE PROFILE (SELF - ALL ROLES)
======================= */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { no_hp } = req.body;

    // 1️⃣ ambil foto lama
    const oldData = await pool.query(
      `SELECT foto_profil FROM users WHERE id = $1`,
      [userId]
    );

    if (!oldData.rowCount) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    let fotoProfilBaru = null;

    // 2️⃣ kalau upload foto baru
    if (req.file) {
      const fotoLama = oldData.rows[0].foto_profil;

      if (fotoLama) {
        const publicId = getPublicIdFromUrl(fotoLama);
        await deleteImage(publicId);
      }

      fotoProfilBaru = await uploadImage(req.file, 'profile');
    }

    // 3️⃣ update DB
    const result = await pool.query(
      `UPDATE users
       SET no_hp = COALESCE($1, no_hp),
           foto_profil = COALESCE($2, foto_profil),
           is_profile_complete = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, name, username, no_hp, foto_profil, is_profile_complete`,
      [no_hp || null, fotoProfilBaru, userId]
    );

    res.json({
      message: 'Profil berhasil diperbarui',
      data: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};