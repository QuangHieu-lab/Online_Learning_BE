const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/constants');

/** Optional auth: set req.userId if token valid, otherwise undefined. Never blocks. */
const optionalAuthenticate = (req, res, next) => {
  try {
    const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, getJwtSecret());
      req.userId = decoded.userId;
      req.userRoles = decoded.roles || [];
    } else {
      req.userId = undefined;
      req.userRoles = [];
    }
    next();
  } catch {
    req.userId = undefined;
    req.userRoles = [];
    next();
  }
};

const authenticate = (req, res, next) => {
  try {
    const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, getJwtSecret());

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
  optionalAuthenticate,
  requireLecturer,
  requireAdmin,
};
