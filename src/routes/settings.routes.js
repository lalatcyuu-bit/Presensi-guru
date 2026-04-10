const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/settings.controller');

// GET status bulk approval
router.get('/bulk-approval', auth, role.onlyAdmin, controller.getBulkApprovalStatus);

// PUT update bulk approval
router.put('/bulk-approval', auth, role.onlyAdmin, controller.setBulkApprovalStatus);

module.exports = router;