const express = require('express');
const router = express.Router();
const kalender = require('../controllers/kalender.controller');

router.get('/', kalender.getKalender);
router.post('/', kalender.createKalender);
router.put('/:id', kalender.updateKalender);
router.delete('/:id', kalender.deleteKalender);

router.get('/check', kalender.checkLiburHariIni);

module.exports = router;