const bcrypt = require('bcrypt');
const prisma = require('../utils/prisma');
const { verifyFirebaseToken } = require('../services/firebase.service');
const { findOrCreateUserFromGoogleToken, sendPostAuthEmails } = require('../services/auth.service');
const { setAuthCookie, clearAuthCookie, setAuthCookieAndBuildUserResponse } = require('../utils/auth.utils');
const { BCRYPT_ROUNDS, REFRESH_FROM_PAYMENT_WINDOW_MS } = require('../config/constants');

const register = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let roleName = 'student';
    if (role === 'ADMIN') roleName = 'admin';
    else if (role === 'LECTURER') roleName = 'instructor';

    const roleRecord = await prisma.role.findUnique({
      where: { roleName },
    });

    if (!roleRecord) {
      return res.status(500).json({ error: 'Role not found' });
    }

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

    const roles = user.userRoles.map((ur) => ur.role.roleName);
    const { token, user: userPayload } = setAuthCookieAndBuildUserResponse(res, user, roles);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: userPayload,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

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

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const roles = user.userRoles.map((ur) => ur.role.roleName);
    const { token, user: userPayload } = setAuthCookieAndBuildUserResponse(res, user, roles);

    res.json({
      message: 'Login successful',
      token,
      user: userPayload,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    const decodedToken = await verifyFirebaseToken(idToken);
    const { user, isNewUser } = await findOrCreateUserFromGoogleToken(decodedToken);

    const roles = user.userRoles.map((ur) => ur.role.roleName);
    const { token, user: userPayload } = setAuthCookieAndBuildUserResponse(res, user, roles);

    sendPostAuthEmails(user, isNewUser);

    res.json({
      message: 'Google sign-in successful',
      token,
      user: userPayload,
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

const getMe = async (req, res) => {
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

    const roles = user.userRoles.map((ur) => ur.role.roleName);

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

const updateProfile = async (req, res) => {
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
      updateData.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
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

    const roles = user.userRoles.map((ur) => ur.role.roleName);

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

const deleteOwnAccount = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { password } = req.body;
    const userIdInt = typeof userId === 'string' ? parseInt(userId) : userId;

    const user = await prisma.user.findUnique({
      where: { userId: userIdInt },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

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

    clearAuthCookie(res);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const logout = async (req, res) => {
  try {
    clearAuthCookie(res);
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const refreshFromPayment = async (req, res) => {
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

    const createdAt = new Date(transaction.createdAt);
    if (Date.now() - createdAt.getTime() > REFRESH_FROM_PAYMENT_WINDOW_MS) {
      return res.status(400).json({ error: 'Refresh window expired. Please log in again.' });
    }

    const user = transaction.order.user;
    const roles = user.userRoles.map((ur) => ur.role.roleName);
    const { token, user: userPayload } = setAuthCookieAndBuildUserResponse(res, user, roles);

    res.json({
      message: 'Cookie refreshed successfully',
      token,
      user: userPayload,
    });
  } catch (error) {
    console.error('Refresh from payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  googleSignIn,
  getMe,
  updateProfile,
  deleteOwnAccount,
  logout,
  refreshFromPayment,
};
