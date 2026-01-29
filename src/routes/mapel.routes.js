const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const mapelController = require('../controllers/mapel.controller');

router.post('/', auth, role.onlyAdmin, mapelController.createMapel);
router.get('/', auth, mapelController.getMapel);

module.exports = router;
