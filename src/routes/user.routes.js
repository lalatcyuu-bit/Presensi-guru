const express = require('express');
const router = express.Router();
const multer = require('multer');

const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/user.controller');

const upload = multer({ storage: multer.memoryStorage() });

// router.get('/profile', auth, controller.getUserProfile);
// router.put('/profile', auth, upload.single('foto_profil'), controller.updateProfile);

router.post('/', auth, role.onlyAdmin, controller.createUser);
router.get('/', auth, role.onlyAdmin, controller.getUsers);
router.post('/import', auth, role.onlyAdmin, upload.single('file'), controller.importUser);
router.get('/:id', auth, role.onlyAdmin, controller.getUserById); 
router.put('/:id', auth, role.onlyAdmin, controller.updateUser);
router.delete('/:id', auth, role.onlyAdmin, controller.deleteUser);

module.exports = router;