const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth.middleware');
const { onlyAdmin } = require('../middleware/role.middleware');

router.post('/', auth, onlyAdmin, userController.createUser);

module.exports = router;
