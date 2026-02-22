const crypto = require('crypto');
const prisma = require('../utils/prisma');
const { PROGRESS_STATUS_COMPLETED, ENROLLMENT_STATUS_COMPLETED } = require('../config/constants');

function computeGradeFromAttempts(attempts) {
  if (!attempts || attempts.length === 0) return 0;
  const total = attempts.reduce((sum, a) => sum + Number(a.totalScore || 0), 0);
  return total / attempts.length;
}

/**
 * Ensure certificate is issued if user is eligible (completed all lessons, etc.). Called when user completes a lesson.
 * Returns certificate with grade or null.
 */
async function ensureCertificateIssuedIfEligible(userId, courseId) {
  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        learningProgress: true,
        course: {
          include: {
            modules: { include: { lessons: true } },
          },
        },
        quizAttempts: true,
      },
    });

    if (!enrollment) return null;

    let totalLessons = 0;
    enrollment.course.modules.forEach((m) => (totalLessons += m.lessons.length));
    const completedLessons = enrollment.learningProgress.filter(
      (p) => p.status === PROGRESS_STATUS_COMPLETED
    ).length;

    if (completedLessons < totalLessons) return null;

    const existingCert = await prisma.certificate.findUnique({
      where: { enrollmentId: enrollment.enrollmentId },
    });
    if (existingCert) return existingCert;

    const finalGrade = computeGradeFromAttempts(enrollment.quizAttempts);

    const newCert = await prisma.certificate.create({
      data: {
        userId,
        courseId,
        enrollmentId: enrollment.enrollmentId,
        serialNumber: `CERT-${crypto.randomUUID().split('-')[0].toUpperCase()}-${Date.now()}`,
        issuedAt: new Date(),
        pdfUrl: null,
      },
    });

    await prisma.enrollment.update({
      where: { enrollmentId: enrollment.enrollmentId },
      data: { status: ENROLLMENT_STATUS_COMPLETED },
    });

    return { ...newCert, grade: finalGrade };
  } catch (error) {
    console.error('Issue Certificate Error:', error);
    return null;
  }
}

module.exports = {
  ensureCertificateIssuedIfEligible,
  computeGradeFromAttempts,
};
