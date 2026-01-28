const pool = require('../db');
const bcrypt = require('bcrypt');

exports.createUser = async (req, res) => {
  try {
    const { name, username, password, id_role, id_kelas } = req.body;

    // 1. Validasi basic
    if (!name || !username || !password || !id_role) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    // 2. Validasi role ↔ kelas
    if (id_role === 2 && !id_kelas) {
      return res.status(400).json({
        message: 'KM wajib punya kelas',
      });
    }

    if (id_role !== 2 && id_kelas) {
      return res.status(400).json({
        message: 'Role ini tidak boleh punya kelas',
      });
    }

    // 3. Cek username
    const cekUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (cekUser.rows.length > 0) {
      return res.status(400).json({ message: 'Username sudah dipakai' });
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Simpan user
    await pool.query(
      `INSERT INTO users (name, username, password, id_role, id_kelas)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, username, hashedPassword, id_role, id_kelas || null]
    );

    res.status(201).json({
      message: 'Akun berhasil dibuat',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
