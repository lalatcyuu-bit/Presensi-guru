const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const userController = require('../controllers/user.controller');

router.post('/', auth, role.onlyAdmin, userController.createUser);
router.get('/', auth, role.onlyAdmin, userController.getUsers);
router.get('/:id', auth, role.onlyAdmin, userController.getUserById);
router.put('/:id', auth, role.onlyAdmin, userController.updateUser);
router.delete('/:id', auth, role.onlyAdmin, userController.deleteUser);

module.exports = router;
