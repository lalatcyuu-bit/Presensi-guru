const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/settings.controller');

router.get('/bulk-approval', auth, role.onlyAdmin, controller.getBulkApprovalStatus);
router.put('/bulk-approval', auth, role.onlyAdmin, controller.setBulkApprovalStatus);
router.get('/activity-logs', auth, role.onlyAdmin, controller.getActivityLogs);

module.exports = router;