const express = require('express');
const router = express.Router();
const multer = require('multer');

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/presensi.controller');

const upload = multer({ storage: multer.memoryStorage() });

// Admin routes
router.post('/', auth, role.onlyAdmin, upload.single('foto_bukti'), controller.createPresensi);
router.get('/', auth, role.onlyAdmin, controller.getPresensi);
router.get('/:id', auth, role.onlyAdmin, controller.getPresensiById);
router.put('/:id', auth, role.onlyAdmin, controller.updatePresensi);
router.delete('/:id', auth, role.onlyAdmin, controller.deletePresensi);

// Approve routes (bisa admin atau piket, sesuaikan)
router.put('/:id/approve', auth, role.onlyAdmin, controller.approvePresensi);

module.exports = router;