const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const kelasController = require('../controllers/kelas.controller');

router.post('/', auth, role.onlyAdmin, kelasController.createKelas);
router.get('/', auth, role.onlyAdmin, kelasController.getKelas);
router.get('/:id', auth, role.onlyAdmin, kelasController.getKelasById);
router.put('/:id', auth, role.onlyAdmin, kelasController.updateKelas);
router.delete('/:id', auth, role.onlyAdmin, kelasController.deleteKelas);

module.exports = router;