const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  try {
    const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    req.userId = decoded.userId;
    req.userRoles = decoded.roles || [];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireLecturer = (req, res, next) => {
  const roles = req.userRoles || [];
  if (!roles.includes('instructor') && !roles.includes('admin')) {
    return res.status(403).json({ error: 'Lecturer or Admin access required' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  const roles = req.userRoles || [];
  if (!roles.includes('admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = {
  authenticate,
  requireLecturer,
  requireAdmin,
};
