const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../utils/prisma');
const { BCRYPT_ROUNDS } = require('../config/constants');
const { sendLoginNotification, sendWelcomeWithPassword } = require('./email.service');

function generateRandomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(12);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

/**
 * Find user by email or create from Google token (uid, email, name, picture). Returns { user, isNewUser }.
 */
async function findOrCreateUserFromGoogleToken(decodedToken) {
  const { uid, email, name } = decodedToken;
  if (!email) throw new Error('Email not found in token');

  let user = await prisma.user.findUnique({
    where: { email },
  });

  const studentRole = await prisma.role.findUnique({
    where: { roleName: 'student' },
  });
  if (!studentRole) throw new Error('Student role not found. Run: npx prisma db seed');

  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const plainPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
    const fullName = name || email.split('@')[0];

    user = await prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash: hashedPassword,
        firebaseUid: uid,
        userRoles: {
          create: { roleId: studentRole.roleId },
        },
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    sendWelcomeWithPassword(user.email, user.fullName, plainPassword).catch((err) => {
      console.error('Failed to send welcome email with password:', err);
    });
  } else {
    if (!user.firebaseUid) {
      await prisma.user.update({
        where: { userId: user.userId },
        data: { firebaseUid: uid },
      });
    }
    user = await prisma.user.findUnique({
      where: { userId: user.userId },
      include: {
        userRoles: { include: { role: true } },
      },
    });
  }

  return { user, isNewUser };
}

/**
 * Send post-auth emails (login notification for existing user; welcome already sent for new user).
 */
function sendPostAuthEmails(user, isNewUser) {
  if (!isNewUser) {
    sendLoginNotification(user.email, user.fullName, 'google').catch((err) => {
      console.error('Failed to send login notification email:', err);
    });
  }
}

module.exports = {
  findOrCreateUserFromGoogleToken,
  sendPostAuthEmails,
};
