require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors({
  origin: 'https://bgdr3s45-3000.asse.devtunnels.ms',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

app.use('/auth', require('./routes/auth.routes'));
app.use('/users', require('./routes/user.routes'));
app.use('/guru', require('./routes/guru.routes'));
app.use('/mapel', require('./routes/mapel.routes'));




const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running di http://localhost:${PORT}`);
});
