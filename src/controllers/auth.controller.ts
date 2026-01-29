import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { verifyFirebaseToken } from '../services/firebase.service';
import { sendLoginNotification } from '../services/email.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { getCookieOptions } from '../utils/cookie.utils';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Map old role to new role name
    let roleName: 'student' | 'instructor' | 'admin' = 'student';
    if (role === 'ADMIN') roleName = 'admin';
    else if (role === 'LECTURER') roleName = 'instructor';
    else roleName = 'student';

    // Get role ID
    const roleRecord = await prisma.role.findUnique({
      where: { roleName },
    });

    if (!roleRecord) {
      return res.status(500).json({ error: 'Role not found' });
    }

    // Create user with user_roles
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName: name,
        userRoles: {
          create: {
            roleId: roleRecord.roleId,
          },
        },
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Get roles array for JWT
    const roles = user.userRoles.map(ur => ur.role.roleName);

    // Generate token with roles array
    const token = jwt.sign(
      { userId: user.userId, roles },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // Set cookie instead of returning token in response
    const cookieOptions = getCookieOptions();
    // Explicitly ensure domain is not set in development
    if (process.env.NODE_ENV !== 'production') {
      delete (cookieOptions as any).domain;
    }
    res.cookie('authToken', token, cookieOptions);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
        roles,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user with roles
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get roles array
    const roles = user.userRoles.map(ur => ur.role.roleName);

    // Generate token with roles array
    const token = jwt.sign(
      { userId: user.userId, roles },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // Set cookie instead of returning token in response
    const cookieOptions = getCookieOptions();
    // Explicitly ensure domain is not set in development
    if (process.env.NODE_ENV !== 'production') {
      delete (cookieOptions as any).domain;
    }
    res.cookie('authToken', token, cookieOptions);

    res.json({
      message: 'Login successful',
      user: {
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
        roles,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const googleSignIn = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      console.error('Google sign-in: Missing ID token');
      return res.status(400).json({ error: 'ID token is required' });
    }

    console.log('Google sign-in: Verifying token...');
    
    // Verify Firebase ID token
    const decodedToken = await verifyFirebaseToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    if (!email) {
      console.error('Google sign-in: Email not found in token');
      return res.status(400).json({ error: 'Email not found in token' });
    }

    console.log(`Google sign-in: Token verified for email: ${email}`);

    // Check if user exists in database
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // Get student role
    const studentRole = await prisma.role.findUnique({
      where: { roleName: 'student' },
    });

    if (!studentRole) {
      return res.status(500).json({ error: 'Student role not found' });
    }

    // If user doesn't exist, create new user
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          fullName: name || email.split('@')[0],
          passwordHash: '', // No password for Google users
          firebaseUid: uid, // Store Firebase UID for reference
          userRoles: {
            create: {
              roleId: studentRole.roleId,
            },
          },
        },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
    } else {
      // Update Firebase UID if not set
      if (!user.firebaseUid) {
        await prisma.user.update({
          where: { userId: user.userId },
          data: { firebaseUid: uid },
        });
      }
      // Get user with roles
      user = await prisma.user.findUnique({
        where: { userId: user.userId },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      })!;
    }

    // Get roles array
    const roles = user.userRoles.map(ur => ur.role.roleName);

    // Generate JWT token with roles array
    const token = jwt.sign(
      { userId: user.userId, roles },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // Set cookie instead of returning token in response
    const cookieOptions = getCookieOptions();
    // Explicitly ensure domain is not set in development
    if (process.env.NODE_ENV !== 'production') {
      delete (cookieOptions as any).domain;
    }
    res.cookie('authToken', token, cookieOptions);

    // Send login notification email (async, don't wait for it)
    sendLoginNotification(user.email, user.name, 'google').catch((error) => {
      console.error('Failed to send login notification email:', error);
      // Don't fail the login if email fails
    });

    res.json({
      message: 'Google sign-in successful',
      user: {
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
        roles,
      },
    });
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    const errorMessage = error.message || 'Invalid token or authentication failed';
    console.error('Error details:', {
      message: errorMessage,
      code: error.code,
      stack: error.stack,
    });
    res.status(401).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { userId: typeof userId === 'string' ? parseInt(userId) : userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const roles = user.userRoles.map(ur => ur.role.roleName);

    res.json({
      user: {
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
        roles,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // Clear the auth cookie using same options as getCookieOptions
    const cookieOptions = getCookieOptions();
    // Explicitly ensure domain is not set in development
    if (process.env.NODE_ENV !== 'production') {
      delete (cookieOptions as any).domain;
    }
    res.cookie('authToken', '', {
      ...cookieOptions,
      maxAge: 0, // Override maxAge to clear cookie
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Refresh auth cookie after payment callback
 * This endpoint is called by frontend after payment redirect to restore session
 */
export const refreshFromPayment = async (req: Request, res: Response) => {
  try {
    const { txnRef } = req.query;

    if (!txnRef || typeof txnRef !== 'string') {
      return res.status(400).json({ error: 'Transaction reference is required' });
    }

    // Find transaction by VNPay transaction reference
    const transaction = await prisma.transaction.findUnique({
      where: { vnpayTxnRef: txnRef },
      include: {
        order: {
          include: {
            user: {
              include: {
                userRoles: {
                  include: {
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Only refresh cookie if transaction was successful
    if (transaction.status !== 'success') {
      return res.status(400).json({ error: 'Transaction not completed' });
    }

    const user = transaction.order.user;
    const roles = user.userRoles.map(ur => ur.role.roleName);

    // Generate new token and set cookie
    const token = jwt.sign(
      { userId: user.userId, roles },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    const cookieOptions = getCookieOptions();
    // Explicitly ensure domain is not set in development
    if (process.env.NODE_ENV !== 'production') {
      delete (cookieOptions as any).domain;
    }
    console.log('[refreshFromPayment] Setting cookie with options:', cookieOptions);
    console.log('[refreshFromPayment] Request origin:', req.headers.origin);
    console.log('[refreshFromPayment] Request host:', req.headers.host);
    
    res.cookie('authToken', token, cookieOptions);

    // Also set Access-Control-Allow-Credentials header explicitly
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.headers.origin) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    }

    res.json({
      message: 'Cookie refreshed successfully',
      user: {
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
        roles,
      },
    });
  } catch (error) {
    console.error('Refresh from payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
