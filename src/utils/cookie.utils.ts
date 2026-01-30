// Shared cookie options utility for authentication
export const getCookieOptions = (req?: any) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    maxAge: number;
    path: string;
    domain?: string;
  } = {
    httpOnly: true,
    // In development, set secure to false to allow cookies over HTTP
    // In production, set secure to true to require HTTPS
    secure: isProduction,
    // Use 'none' for cross-site requests (like payment redirects)
    // But 'lax' should work for same-site requests
    // For development, use 'lax' which allows cookies on top-level navigations
    sameSite: isProduction ? 'none' : 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };

  // CRITICAL: Never set domain in development
  // Express will automatically set domain based on request host if we don't specify it
  // This allows cookies to work with both localhost and 127.0.0.1
  // Only set domain in production if explicitly configured
  if (isProduction && process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }
  // Explicitly don't set domain in development - let browser handle it
  // This ensures cookies work with proxy (127.0.0.1:5173 -> 127.0.0.1:3000)

  return options;
};
