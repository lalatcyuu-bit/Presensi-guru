const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const jadwalController = require('../controllers/jadwal.controller');

// Sama persis seperti guru routes
router.post('/', auth, role.onlyAdmin, jadwalController.createJadwal);
router.get('/', auth, jadwalController.getJadwal);
router.get('/kelas/:id_kelas', auth, jadwalController.getJadwalByKelas);
router.delete('/:id', auth, role.onlyAdmin, jadwalController.deleteJadwal);

module.exports = router;
