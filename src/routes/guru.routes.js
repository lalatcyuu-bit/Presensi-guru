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
router.get('/statistik', auth, role.onlyAdmin, guruController.getStatistikGuru);
router.get('/bar', auth, role.onlyAdmin, guruController.getBarHadirVsTidak);
router.get('/line', auth, role.onlyAdmin, guruController.getLineHadirPerGuru);
router.get('/tren', auth, role.onlyAdmin, guruController.getTrenKehadiranKeseluruhan); // NEW
router.get('/top-hadir', auth, role.onlyAdmin, guruController.getTopGuruHadir);        // NEW
router.get('/top-tidak-hadir', auth, role.onlyAdmin, guruController.getTopGuruTidakHadir);
router.get('/unpresensi-stats', auth, role.onlyAdmin, guruController.getUnpresensiStats);
router.get('/summary-stats', auth, role.onlyAdmin, guruController.getSummaryStats);
router.get('/performa-guru', auth, role.onlyAdmin, guruController.getPerformaGuru);
router.get('/:id', auth, role.onlyAdmin, guruController.getGuruById);
router.put('/:id', auth, role.onlyAdmin, guruController.updateGuru);
router.delete('/:id', auth, role.onlyAdmin, guruController.deleteGuru);

module.exports = router;