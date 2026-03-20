const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const kalender = require('../controllers/kalender.controller');

// PENTING: /check harus sebelum /:id agar tidak di-intercept sebagai id
router.get('/check', auth, kalender.checkLiburHariIni);

router.get('/', auth, role.onlyAdmin, kalender.getKalender);
router.post('/', auth, role.onlyAdmin, kalender.createKalender);
router.put('/:id', auth, role.onlyAdmin, kalender.updateKalender);
router.delete('/:id', auth, role.onlyAdmin, kalender.deleteKalender);

module.exports = router;