const express = require('express');
const router = express.Router();
const multer = require('multer');

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/presensi.controller');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', auth, role.onlyAdmin, upload.single('foto_bukti'), controller.createPresensi);
router.get('/', auth, role.onlyAdmin, controller.getPresensi);
router.get('/:id', auth, role.onlyAdmin, controller.getPresensiById);
router.put('/:id', auth, role.onlyAdmin, controller.updatePresensi);
router.put('/:id/approve', auth, role.onlyAdmin, controller.approvePresensi);
router.delete('/:id', auth, role.onlyAdmin, controller.deletePresensi);

router.post('/', auth, presensiController.createPresensi);
router.get('/', auth, presensiController.getPresensi);
router.get('/:id', auth, presensiController.getPresensiById);
// router.get('/approved', presensiController.getDataApproved);
router.put('/:id', auth, presensiController.updatePresensi);
router.delete('/:id', auth, presensiController.deletePresensi);
router.put('/:id/approve', auth, role.onlyPiket, presensiController.approvePresensiGuru);
module.exports = router;
