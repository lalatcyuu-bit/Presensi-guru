const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const presensiController = require('../controllers/presensi.controller');

router.post('/', auth, presensiController.createPresensi);
router.get('/', auth, presensiController.getPresensi);
router.get('/:id', auth, presensiController.getPresensiById);
// router.get('/approved', presensiController.getDataApproved);
router.put('/:id', auth, presensiController.updatePresensi);
router.delete('/:id', auth, presensiController.deletePresensi);
router.put('/:id/approve', auth, role.onlyPiket, presensiController.approvePresensiGuru);
module.exports = router;
