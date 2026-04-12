const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/presensiRequest.controller');

// ============================================
// KM ROUTES
// ============================================

// KM kirim request presensi yang sudah lewat
router.post('/', auth, role.onlyKM, controller.createRequest);

// KM lihat status semua request miliknya (map lookup)
router.get('/my', auth, role.onlyKM, controller.getMyRequests);

// ============================================
// ADMIN / PIKET ROUTES
// ============================================

// Lihat semua request (dengan filter)
router.get('/', auth, role.onlyPiketOrAdmin, controller.getRequests);

// Summary count untuk badge
router.get('/summary', auth, role.onlyPiketOrAdmin, controller.getRequestsSummary);

// Approve request
router.put('/:id/approve', auth, role.onlyPiketOrAdmin, controller.approveRequest);

// Reject request (dengan alasan)
router.put('/:id/reject', auth, role.onlyPiketOrAdmin, controller.rejectRequest);

module.exports = router;