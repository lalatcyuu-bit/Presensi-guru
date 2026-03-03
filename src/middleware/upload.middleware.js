const multer = require('multer');

const storage = multer.memoryStorage();

const uploadFotoBukti = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File harus gambar'));
    }
    cb(null, true);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname);
  if (ext !== '.xlsx' && ext !== '.xls') {
    return cb(new Error('File harus Excel (.xlsx / .xls)'));
  }
  cb(null, true);
};

module.exports = {
  uploadFotoBukti, fileFilter
};
