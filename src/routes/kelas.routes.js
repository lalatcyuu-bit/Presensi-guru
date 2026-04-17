const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const kelasController = require('../controllers/kelas.controller');

router.get('/jurusan', auth, role.onlyAdmin, kelasController.getJurusan);
router.post('/', auth, role.onlyAdmin, kelasController.createKelas);
router.get('/', auth, role.onlyPiketOrAdminOrKsOrPengawas, kelasController.getKelas);
router.post('/import', auth, role.onlyAdmin, upload.single('file'), kelasController.importKelas);
router.get('/:id', auth, role.onlyAdmin, kelasController.getKelasById);
router.put('/:id', auth, role.onlyAdmin, kelasController.updateKelas);
router.delete('/:id', auth, role.onlyAdmin, kelasController.deleteKelas);

module.exports = router;