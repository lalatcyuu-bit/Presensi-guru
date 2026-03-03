exports.onlyKM = (req, res, next) => {
  if (req.user.role !== 'km') {
    return res.status(403).json({ message: 'Akses ditolak' });
  }
  next();
};

exports.onlyPiket = (req, res, next) => {
  if (req.user.role !== 'piket') {
    return res.status(403).json({ message: 'Akses ditolak' });
  }
  next();
};

exports.onlyAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Akses ditolak' });
  }
  next();
};

exports.onlyKs = (req, res, next) => {
  if (req.user.role !== 'ks') {
    return res.status(403).json({ message: 'Akses ditolak' });
  }
  next();
};

exports.onlyPiketOrAdmin = (req, res, next) => {
  if (req.user.role !== 'piket' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Akses ditolak' });
  }
  next();
};

exports.onlyPiketOrAdminOrKs = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();

  if (!['piket', 'admin', 'ks'].includes(role)) {
    return res.status(403).json({
      message: 'Akses ditolak'
    });
  }

  next();
};
