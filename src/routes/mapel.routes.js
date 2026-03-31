const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const mapelController = require('../controllers/mapel.controller');

router.post('/', auth, role.onlyAdmin, mapelController.createMapel);
router.get('/', auth, mapelController.getMapel);
router.post('/import', auth, role.onlyAdmin, upload.single('file'), mapelController.importMapel);
router.get('/:id', auth, mapelController.getMapelById);
router.put('/:id', auth, role.onlyAdmin, mapelController.updateMapel);
router.delete('/:id', auth, role.onlyAdmin, mapelController.deleteMapel);

module.exports = router;