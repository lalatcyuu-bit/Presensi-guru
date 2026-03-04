const express = require('express');
const router = express.Router();
const multer = require('multer');

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/presensi.controller');

const upload = multer({ storage: multer.memoryStorage() });

// ============================================
// KM ROUTES
// ============================================

// Get jadwal kelas hari ini
router.get('/jadwal/today', auth, role.onlyKM, controller.getJadwalKelasHariIni);

// Get detail jadwal by ID
router.get('/jadwal/:id_jadwal', auth, role.onlyKM, controller.getJadwalByIdKM);

// Create presensi oleh KM
router.post('/presensi', auth, role.onlyKM, upload.single('foto'), controller.createPresensiByKM);

// Get presensi by ID untuk KM (dipakai saat resubmit untuk pre-fill data)
// PENTING: route ini harus SEBELUM /presensi/:id/resubmit agar tidak bentrok
router.get('/presensi/:id', auth, role.onlyKM, controller.getPresensiByIdKM);

// Resubmit presensi yang ditolak oleh KM
router.put('/presensi/:id/resubmit', auth, role.onlyKM, upload.single('foto'), controller.resubmitPresensiByKM);

// ============================================
// ADMIN/PIKET ROUTES (di-mount di /presensi)
// ============================================

// Create presensi (Admin)
router.post('/', auth, upload.single('foto_bukti'), controller.createPresensi);

// Get all presensi
router.get('/', auth, role.onlyPiketOrAdmin, controller.getPresensi);

// Get dashboard today
router.get('/dashboard/today', auth, role.onlyPiketOrAdmin, controller.getDashboardToday);

// Get riwayat presensi untuk KM
router.get('/riwayat', auth, role.onlyKM, controller.getRiwayatPresensiKM);

// Get presensi by ID
router.get('/:id', auth, role.onlyPiketOrAdmin, controller.getPresensiById);

// Update presensi (Admin)
router.put('/:id', auth, role.onlyPiketOrAdmin, upload.single('foto_bukti'), controller.updatePresensi);

// Approve / Reject presensi (Piket atau Admin)
router.put('/:id/approve', auth, role.onlyPiketOrAdmin, controller.approvePresensi);

// Delete presensi (Admin)
router.delete('/:id', auth, role.onlyPiketOrAdmin, controller.deletePresensi);

module.exports = router;