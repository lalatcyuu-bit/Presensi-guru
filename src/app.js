require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors({
  origin: [
    'https://presensi-guru-smkn-1-cisarua.vercel.app'
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
app.use('/km', require('./routes/presensi.routes'));
app.use('/kalender', require('./routes/kalender.routes'));
app.use('/settings', require('./routes/settings.routes'));
app.use('/presensi-requests', require('./routes/presensiRequest.routes'));

const PORT = process.env.PORT || 8000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
