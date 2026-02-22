const { COOKIE_MAX_AGE_DAYS } = require('../config/constants');

// Shared cookie options utility for authentication
function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  };

  if (isProduction && process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

  return options;
};

module.exports = { getCookieOptions };
