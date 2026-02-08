require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors({
  origin: [
    'https://bv8mb4zp-3000.asse.devtunnels.ms',
    'http://localhost:3000',
    'https://bgdr3s45-3000.asse.devtunnels.ms'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

app.use('/auth', require('./routes/auth.routes'));
app.use('/users', require('./routes/user.routes'));
app.use('/guru', require('./routes/guru.routes'));
app.use('/mapel', require('./routes/mapel.routes'));
app.use('/jadwal', require('./routes/jadwal.routes'));
app.use('/presensi', require('./routes/presensi.routes'));
app.use('/kelas', require('./routes/kelas.routes'));
app.use('/km', require('./routes/km.routes'));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running di http://localhost:${PORT}`);
});