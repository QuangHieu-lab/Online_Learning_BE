import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { verifyFirebaseToken } from '../services/firebase.service.js';
import { sendLoginNotification, sendWelcomeWithPassword } from '../services/email.service.js';
import { getCookieOptions } from '../utils/cookie.utils.js';

/** Generate secure random password (12 chars: letters + numbers) */
function generateRandomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(12);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export const register = async (req, res) => {
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
    let roleName = 'student';
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
    if (process.env.NODE_ENV !== 'production') {
      delete cookieOptions.domain;
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

export const login = async (req, res) => {
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
    if (process.env.NODE_ENV !== 'production') {
      delete cookieOptions.domain;
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

export const googleSignIn = async (req, res) => {
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

    let isNewUser = false;

    // If user doesn't exist, create new user with generated password
    if (!user) {
      isNewUser = true;
      const plainPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      const fullName = name || email.split('@')[0];

      user = await prisma.user.create({
        data: {
          email,
          fullName,
          passwordHash: hashedPassword,
          firebaseUid: uid,
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

      // Send welcome email with generated password (async, don't block login)
      sendWelcomeWithPassword(user.email, user.fullName, plainPassword).catch((err) => {
        console.error('Failed to send welcome email with password:', err);
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
      });
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
    if (process.env.NODE_ENV !== 'production') {
      delete cookieOptions.domain;
    }
    res.cookie('authToken', token, cookieOptions);

    // Send login notification for existing users only (new users got welcome email)
    if (!isNewUser) {
      sendLoginNotification(user.email, user.fullName, 'google').catch((error) => {
        console.error('Failed to send login notification email:', error);
      });
    }

    res.json({
      message: 'Google sign-in successful',
      user: {
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
        roles,
      },
    });
  } catch (error) {
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

export const getMe = async (req, res) => {
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
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        currentLevel: user.currentLevel,
        roles,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** Update own profile (except email) */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { fullName, phoneNumber, avatarUrl, currentLevel, newPassword } = req.body;

    const validLevels = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    if (currentLevel !== undefined && !validLevels.includes(currentLevel)) {
      return res.status(400).json({ error: 'Invalid level. Must be one of: A0, A1, A2, B1, B2, C1, C2' });
    }

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber || null;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl || null;
    if (currentLevel !== undefined) updateData.currentLevel = currentLevel;
    if (newPassword && newPassword.length >= 6) {
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const user = await prisma.user.update({
      where: { userId: typeof userId === 'string' ? parseInt(userId) : userId },
      data: updateData,
      include: {
        userRoles: { include: { role: true } },
      },
    });

    const roles = user.userRoles.map(ur => ur.role.roleName);

    res.json({
      message: 'Profile updated successfully',
      user: {
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        currentLevel: user.currentLevel,
        roles,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** Delete own account */
export const deleteOwnAccount = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { password } = req.body;
    const userIdInt = typeof userId === 'string' ? parseInt(userId) : userId;

    const user = await prisma.user.findUnique({
      where: { userId: userIdInt },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Users with password must confirm
    if (user.passwordHash) {
      if (!password) {
        return res.status(400).json({ error: 'Password required to delete account' });
      }
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    await prisma.user.delete({
      where: { userId: userIdInt },
    });

    // Clear auth cookie
    const cookieOptions = getCookieOptions();
    if (process.env.NODE_ENV !== 'production') {
      delete cookieOptions.domain;
    }
    res.cookie('authToken', '', { ...cookieOptions, maxAge: 0 });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req, res) => {
  try {
    const cookieOptions = getCookieOptions();
    if (process.env.NODE_ENV !== 'production') {
      delete cookieOptions.domain;
    }
    res.cookie('authToken', '', {
      ...cookieOptions,
      maxAge: 0,
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Refresh auth cookie after payment callback
 */
export const refreshFromPayment = async (req, res) => {
  try {
    const { txnRef } = req.query;

    if (!txnRef || typeof txnRef !== 'string') {
      return res.status(400).json({ error: 'Transaction reference is required' });
    }

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

    if (transaction.status !== 'success') {
      return res.status(400).json({ error: 'Transaction not completed' });
    }

    const user = transaction.order.user;
    const roles = user.userRoles.map(ur => ur.role.roleName);

    const token = jwt.sign(
      { userId: user.userId, roles },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    const cookieOptions = getCookieOptions();
    if (process.env.NODE_ENV !== 'production') {
      delete cookieOptions.domain;
    }
    console.log('[refreshFromPayment] Setting cookie with options:', cookieOptions);
    console.log('[refreshFromPayment] Request origin:', req.headers.origin);
    console.log('[refreshFromPayment] Request host:', req.headers.host);

    res.cookie('authToken', token, cookieOptions);
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
