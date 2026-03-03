const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const guruController = require('../controllers/guru.controller');

router.post('/', auth, role.onlyAdmin, guruController.createGuru);
router.get('/', auth, role.onlyAdmin, guruController.getGuru);
router.get('/search', auth, role.onlyAdmin, guruController.getGuruByMapel);
router.post('/import', upload.single('file'), guruController.importGuru);
router.get('/:id', auth, role.onlyAdmin, guruController.getGuruById);
router.put('/:id', auth, role.onlyAdmin, guruController.updateGuru);
router.delete('/:id', auth, role.onlyAdmin, guruController.deleteGuru);
module.exports = router;
