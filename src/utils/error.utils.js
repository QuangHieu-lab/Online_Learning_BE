/**
 * Map Prisma errors to HTTP status and message.
 * Returns { status, message } for use in res.status(status).json({ error: message }).
 */
function mapPrismaError(error) {
  if (!error || !error.code) {
    return { status: 500, message: 'Internal server error' };
  }
  switch (error.code) {
    case 'P2002':
      return { status: 409, message: 'A record with this value already exists.' };
    case 'P2025':
      return { status: 404, message: 'Record not found.' };
    case 'P2003':
      return { status: 400, message: 'Invalid reference.' };
    default:
      return { status: 500, message: 'Internal server error' };
  }
}

/**
 * Send error response from Prisma or other errors. Logs and does not expose stack to client.
 */
function sendPrismaOrServerError(res, error) {
  console.error('Error:', error);
  const mapped = error && error.code ? mapPrismaError(error) : { status: 500, message: 'Internal server error' };
  return res.status(mapped.status).json({ error: mapped.message });
}

/**
 * Handle AI/service errors: rate limit → 429, bad gateway → 502, else 500.
 * Use in AI controller catch blocks.
 */
function handleAIOrServiceError(error, res, options = {}) {
  const { defaultMessage = 'Service temporarily unavailable' } = options;
  console.error('AI/Service error:', error);

  if (error && error.isRateLimit) {
    return res.status(429).json({
      error: error.message || defaultMessage,
      ...(error.retryAfter != null && { retryAfter: error.retryAfter }),
    });
  }

  const statusCode = (error && error.statusCode) || 500;
  const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
  const message = (error && error.message) || defaultMessage;
  return res.status(safeStatus).json({ error: message });
}

module.exports = {
  mapPrismaError,
  sendPrismaOrServerError,
  handleAIOrServiceError,
};
