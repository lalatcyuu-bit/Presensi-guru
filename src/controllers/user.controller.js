const pool = require('../db');
const bcrypt = require('bcrypt');

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

    const cekUser = await pool.query(
      `SELECT id FROM users WHERE username = $1`,
      [username]
    );

    if (cekUser.rowCount > 0) {
      return res.status(400).json({ message: 'Username sudah dipakai' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (name, username, password, id_role, id_kelas)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, username, hashedPassword, id_role, id_kelas || null]
    );

    res.status(201).json({ message: 'Akun berhasil dibuat' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   GET ALL USER
======================= */
exports.getUsers = async (req, res) => {
  const result = await pool.query(
    `SELECT 
       u.id, 
       u.name, 
       u.username, 
       u.id_role, 
       u.id_kelas, 
       r.name AS role_name,
       k.id AS kelas_id,
       k.name AS kelas_name,
       k.tingkat AS kelas_tingkat,
       k.jurusan AS kelas_jurusan
     FROM users u
     JOIN roles r ON r.id = u.id_role
     LEFT JOIN kelas k ON k.id = u.id_kelas
     ORDER BY u.name ASC`
  );

  const formattedData = result.rows.map(row => ({
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

  res.json(formattedData);
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

/* =======================
   UPDATE USER
======================= */
exports.updateUser = async (req, res) => {
  try {
    const { name, username, password, id_role, id_kelas } = req.body;
    const { id } = req.params;

    if (!name || !username || !id_role) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    if (id_role === 2 && !id_kelas) {
      return res.status(400).json({ message: 'KM wajib punya kelas' });
    }

    if (id_role !== 2 && id_kelas) {
      return res.status(400).json({ message: 'Role ini tidak boleh punya kelas' });
    }

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
          id_kelas = $4
    `;
    const values = [name, username, id_role, id_kelas || null];

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      query += `, password = $5 WHERE id = $6`;
      values.push(hashed, id);
    } else {
      query += ` WHERE id = $5`;
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

/* =======================
   DELETE USER
======================= */
exports.deleteUser = async (req, res) => {
  const result = await pool.query(
    `DELETE FROM users WHERE id = $1`,
    [req.params.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'User tidak ditemukan' });
  }

  res.json({ message: 'User berhasil dihapus' });
};
