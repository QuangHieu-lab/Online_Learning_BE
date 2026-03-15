const fs = require('node:fs');
const crypto = require('node:crypto');
const prisma = require('../utils/prisma');
const { PROGRESS_STATUS_COMPLETED, ENROLLMENT_STATUS_COMPLETED } = require('../config/constants');
const {
  generateCertificatePdf,
  getCertificatePdfAbsolutePath,
  getCertificateViewPath,
} = require('./certificate-pdf.service');

function computeGradeFromAttempts(attempts) {
  if (!attempts || attempts.length === 0) return 100;
  const total = attempts.reduce((sum, a) => sum + Number(a.totalScore || 0), 0);
  return total / attempts.length;
}

async function ensureCertificatePdfForRecord(certificate, details) {
  const expectedPdfUrl = getCertificateViewPath(certificate.certificateId);
  const pdfPath = getCertificatePdfAbsolutePath(certificate.serialNumber);

  if (!certificate.pdfUrl || certificate.pdfUrl !== expectedPdfUrl) {
    await generateCertificatePdf({
      serialNumber: certificate.serialNumber,
      studentName: details.studentName,
      courseTitle: details.courseTitle,
      instructorName: details.instructorName,
      issuedAt: certificate.issuedAt,
      grade: details.grade,
    });

    return prisma.certificate.update({
      where: { certificateId: certificate.certificateId },
      data: { pdfUrl: expectedPdfUrl },
    });
  }

  if (!fs.existsSync(pdfPath)) {
    await generateCertificatePdf({
      serialNumber: certificate.serialNumber,
      studentName: details.studentName,
      courseTitle: details.courseTitle,
      instructorName: details.instructorName,
      issuedAt: certificate.issuedAt,
      grade: details.grade,
    });
  }

  return certificate;
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
        user: {
          select: {
            fullName: true,
          },
        },
        course: {
          include: {
            modules: { include: { lessons: true } },
            instructor: {
              select: {
                fullName: true,
              },
            },
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

    const finalGrade = computeGradeFromAttempts(enrollment.quizAttempts);
    const certificateDetails = {
      studentName: enrollment.user.fullName,
      courseTitle: enrollment.course.title,
      instructorName: enrollment.course.instructor.fullName,
      grade: finalGrade,
    };

    if (existingCert) {
      const hydratedCert = await ensureCertificatePdfForRecord(existingCert, certificateDetails);
      return { ...hydratedCert, grade: finalGrade };
    }


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

    const certificateWithPdf = await ensureCertificatePdfForRecord(newCert, certificateDetails);

    await prisma.enrollment.update({
      where: { enrollmentId: enrollment.enrollmentId },
      data: { status: ENROLLMENT_STATUS_COMPLETED },
    });

    return { ...certificateWithPdf, grade: finalGrade };
  } catch (error) {
    console.error('Issue Certificate Error:', error);
    return null;
  }
}

module.exports = {
  ensureCertificateIssuedIfEligible,
  computeGradeFromAttempts,
  ensureCertificatePdfForRecord,
};
