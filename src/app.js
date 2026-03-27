require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  'https://bv8mb4zp-3000.asse.devtunnels.ms',
  'http://localhost:3000',
  'http://localhost:8881',
  'http://103.10.60.91:8881',
  'https://bgdr3s45-3000.asse.devtunnels.ms',
  'http://192.168.100.22:3000'
]

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: allowedOrigins,
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

const { initSocket } = require('./utils/socket')
initSocket(io)

const PORT = process.env.PORT || 8000;
httpServer.listen(PORT, () => {
  console.log(`Server running di http://localhost:${PORT}`);
});