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

router.get('/statistik', auth, role.onlyPiketOrAdminOrKsOrPengawas, guruController.getStatistikGuru);
router.get('/bar', auth, role.onlyPiketOrAdminOrKsOrPengawas, guruController.getBarHadirVsTidak);
router.get('/line', auth, role.onlyPiketOrAdminOrKsOrPengawas, guruController.getLineHadirPerGuru);
router.get('/tren', auth, role.onlyPiketOrAdminOrKsOrPengawas, guruController.getTrenKehadiranKeseluruhan);
router.get('/top-hadir', auth, role.onlyPiketOrAdminOrKsOrPengawas, guruController.getTopGuruHadir);
router.get('/top-tidak-hadir', auth, role.onlyPiketOrAdminOrKsOrPengawas, guruController.getTopGuruTidakHadir);
router.get('/unpresensi-stats', auth, role.onlyPiketOrAdminOrKsOrPengawas, guruController.getUnpresensiStats);
router.get('/summary-stats', auth, role.onlyPiketOrAdminOrKsOrPengawas, guruController.getSummaryStats);
router.get('/performa-guru', auth, role.onlyPiketOrAdminOrKsOrPengawas, guruController.getPerformaGuru);
router.get('/dashboard-today', auth, role.onlyPiketOrAdminOrKsOrPengawas, guruController.getDashboardToday);

// ── Preview PDF: 1 endpoint, return semua data sekaligus ──────────────
router.get('/preview-data', auth, role.onlyPiketOrAdminOrKsOrPengawas, guruController.getPreviewData);
router.get('/generate-pdf', auth, role.onlyPiketOrAdminOrKsOrPengawas, guruController.generatePdf);

router.get('/:id', auth, role.onlyAdmin, guruController.getGuruById);
router.put('/:id', auth, role.onlyAdmin, guruController.updateGuru);
router.delete('/:id', auth, role.onlyAdmin, guruController.deleteGuru);

module.exports = router;