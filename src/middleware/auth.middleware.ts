import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: number;
  userRoles?: string[];
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Try to get token from cookie first (primary method)
    // Fallback to Authorization header for backward compatibility
    const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      userId: number;
      roles: string[];
    };

    req.userId = decoded.userId;
    req.userRoles = decoded.roles || [];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireLecturer = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const roles = req.userRoles || [];
  if (!roles.includes('instructor') && !roles.includes('admin')) {
    return res.status(403).json({ error: 'Lecturer or Admin access required' });
  }
  next();
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const roles = req.userRoles || [];
  if (!roles.includes('admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
