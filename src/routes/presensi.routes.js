const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/presensi.controller');
const { uploadFotoBukti } = require('../middleware/upload.middleware');

router.post(
  '/',
  auth,
  uploadFotoBukti.single('foto_bukti'),
  controller.createPresensi
);

router.get('/', auth, role.onlyAdmin, controller.getPresensi);
router.get('/:id', auth, role.onlyAdmin, controller.getPresensiById);
router.put('/:id', auth, role.onlyAdmin, controller.updatePresensi);
router.put('/:id/approve', auth, role.onlyPiket, controller.approvePresensi);
router.delete('/:id', auth, role.onlyAdmin, controller.deletePresensi);

// Approve routes (bisa admin atau piket, sesuaikan)
router.put('/:id/approve', auth, role.onlyAdmin, controller.approvePresensi);

module.exports = router;