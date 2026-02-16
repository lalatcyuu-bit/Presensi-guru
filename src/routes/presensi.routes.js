const express = require('express');
const router = express.Router();
const multer = require('multer');

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/presensi.controller');

// Setup multer untuk upload
const upload = multer({ storage: multer.memoryStorage() });

// ============================================
// KM ROUTES - HAPUS PREFIX /km ✅
// ============================================

// Get jadwal kelas hari ini (untuk list presensi)
router.get('/jadwal/today', auth, role.onlyKM, controller.getJadwalKelasHariIni);

// Get detail jadwal by ID (untuk data readonly di form)
router.get('/jadwal/:id_jadwal', auth, role.onlyKM, controller.getJadwalByIdKM);

// Create presensi oleh KM
router.post('/presensi', auth, role.onlyKM, upload.single('foto'), controller.createPresensiByKM);

// ============================================
// ADMIN/PIKET ROUTES (tetap pakai / karena di-mount di /presensi)
// ============================================

// Create presensi (Admin)
router.post(
  '/',
  auth,
  upload.single('foto_bukti'),
  controller.createPresensi
);

// Get all presensi
router.get('/', auth, role.onlyPiketOrAdmin, controller.getPresensi);

// Get presensi by ID
router.get('/:id', auth, role.onlyPiketOrAdmin, controller.getPresensiById);

// Update presensi (Admin)
router.put('/:id', auth, role.onlyPiketOrAdmin, upload.single('foto_bukti'), controller.updatePresensi);

// Approve presensi (Piket atau Admin)
router.put('/:id/approve', auth, role.onlyPiketOrAdmin, controller.approvePresensi);

// Delete presensi (Admin)
router.delete('/:id', auth, role.onlyPiketOrAdmin, controller.deletePresensi);

module.exports = router;