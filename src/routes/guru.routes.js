const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const guruController = require('../controllers/guru.controller');

router.post('/', auth, role.onlyAdmin, guruController.createGuru);
router.get('/', auth, role.onlyAdmin, guruController.getGuru);
router.get('/search', auth, role.onlyAdmin, guruController.getGuruByMapel);
router.put('/:id', auth, role.onlyAdmin, guruController.updateGuru);
router.delete('/:id', auth, role.onlyAdmin, guruController.deleteGuru);
module.exports = router;
