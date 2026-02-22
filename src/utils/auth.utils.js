const jwt = require('jsonwebtoken');
const { getCookieOptions } = require('./cookie.utils');
const { getJwtSecret, JWT_EXPIRES_IN } = require('../config/constants');

/**
 * Create a JWT for the given user and roles.
 */
function createAuthToken(userId, roles) {
  return jwt.sign(
    { userId, roles },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Set auth cookie on response. Strips domain in non-production.
 */
function setAuthCookie(res, token) {
  const cookieOptions = getCookieOptions();
  if (process.env.NODE_ENV !== 'production') {
    delete cookieOptions.domain;
  }
  res.cookie('authToken', token, cookieOptions);
}

/**
 * Clear auth cookie (logout / delete account).
 */
function clearAuthCookie(res) {
  const cookieOptions = getCookieOptions();
  if (process.env.NODE_ENV !== 'production') {
    delete cookieOptions.domain;
  }
  res.cookie('authToken', '', { ...cookieOptions, maxAge: 0 });
}

/**
 * Build the standard user payload for auth responses.
 */
function buildAuthUserPayload(user, roles) {
  return {
    userId: user.userId,
    email: user.email,
    fullName: user.fullName,
    roles,
  };
}

/**
 * Set cookie and return JSON-friendly user object. Use after login/register/refresh.
 */
function setAuthCookieAndBuildUserResponse(res, user, roles) {
  const token = createAuthToken(user.userId, roles);
  setAuthCookie(res, token);
  return {
    token,
    user: buildAuthUserPayload(user, roles),
  };
}

module.exports = {
  createAuthToken,
  setAuthCookie,
  clearAuthCookie,
  buildAuthUserPayload,
  setAuthCookieAndBuildUserResponse,
};
