const express = require('express');
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const jadwalController = require('../controllers/jadwal.controller');

router.post('/', auth, role.onlyAdmin, jadwalController.createJadwal);
router.get('/', auth, role.onlyPiketOrAdmin, jadwalController.getJadwal);
router.post("/import", upload.single("file"), jadwalController.importJadwal);
router.get('/:id', auth, role.onlyAdmin, jadwalController.getJadwalById);
router.put('/:id', auth, role.onlyAdmin, jadwalController.updateJadwal);
router.delete('/:id', auth, role.onlyAdmin, jadwalController.deleteJadwal);
module.exports = router;
