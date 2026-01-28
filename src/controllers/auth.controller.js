const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Cari user
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

    // 2. Cek password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    // 3. Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        id_kelas: user.id_kelas,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 4. Response
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
