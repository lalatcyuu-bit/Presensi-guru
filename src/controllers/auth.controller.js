const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      `SELECT u.id, u.name, u.password, u.id_role, u.id_kelas, r.name AS role
       FROM users u
       JOIN roles r ON u.id_role = r.id
       WHERE u.username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        id_kelas: user.id_kelas,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        id_kelas: user.id_kelas,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Tambah username di response
exports.getCurrentUser = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.username, r.name AS role,
              k.id AS kelas_id, k.name AS kelas_name,
              k.tingkat AS kelas_tingkat, k.jurusan AS kelas_jurusan
       FROM users u
       JOIN roles r ON u.id_role = r.id
       LEFT JOIN kelas k ON k.id = u.id_kelas
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        kelas: user.kelas_id ? {
          id: user.kelas_id,
          name: user.kelas_name,
          tingkat: user.kelas_tingkat,
          jurusan: user.kelas_jurusan,
        } : null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Edit nama dan password sendiri
exports.updateProfile = async (req, res) => {
  try {
    const { name, password } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ message: 'Nama tidak boleh kosong' });
    }

    let query;
    let values;

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      query = `
        UPDATE users
        SET name = $1,
            password = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, name, username
      `;
      values = [name, hashed, userId];
    } else {
      query = `
        UPDATE users
        SET name = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, name, username
      `;
      values = [name, userId];
    }

    const result = await pool.query(query, values);

    res.json({
      message: 'Profil berhasil diupdate',
      user: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};