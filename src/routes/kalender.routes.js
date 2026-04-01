const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const kalender = require('../controllers/kalender.controller');

router.get('/', kalender.getKalender);
router.post('/', kalender.createKalender);
router.put('/:id', kalender.updateKalender);
router.delete('/:id', kalender.deleteKalender);

router.get('/check', kalender.checkLiburHariIni);
router.get('/export', auth, role.onlyKM, kalender.exportKalenderKM);


module.exports = router;