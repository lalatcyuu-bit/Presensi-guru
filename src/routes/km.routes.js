const express = require('express');
const router = express.Router();
const multer = require('multer');

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/km.controller');

const upload = multer({ storage: multer.memoryStorage() });

// Get jadwal kelas hari ini (untuk list presensi)
router.get('/jadwal/today', auth, role.onlyKM, controller.getJadwalKelasHariIni);

// Get detail jadwal by ID (untuk data readonly di form)
router.get('/jadwal/:id_jadwal', auth, role.onlyKM, controller.getJadwalById);

// Create presensi oleh KM
router.post('/presensi', auth, role.onlyKM, upload.single('foto'), controller.createPresensiByKM);

module.exports = router;