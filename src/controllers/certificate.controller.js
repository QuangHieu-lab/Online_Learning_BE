const fs = require('node:fs');
const path = require('node:path');
const prisma = require('../utils/prisma');
const { GRADE_A_MIN, GRADE_B_MIN } = require('../config/constants');
const {
  ensureCertificateIssuedIfEligible,
  computeGradeFromAttempts,
  ensureCertificatePdfForRecord,
} = require('../services/certificate.service');
const {
  getCertificatePdfAbsolutePath,
  getCertificateDownloadPath,
  getCertificateViewPath,
} = require('../services/certificate-pdf.service');

async function loadAccessibleCertificate(certificateId, requesterId, requesterRoles = []) {
  const certificate = await prisma.certificate.findUnique({
    where: { certificateId },
    include: {
      user: {
        select: {
          userId: true,
          fullName: true,
          email: true,
        },
      },
      course: {
        select: {
          courseId: true,
          title: true,
          thumbnailUrl: true,
          instructor: {
            select: { fullName: true },
          },
        },
      },
      enrollment: {
        include: {
          quizAttempts: true,
        },
      },
    },
  });

  if (!certificate) {
    return { error: { status: 404, message: 'Certificate not found' } };
  }

  const isAdmin = Array.isArray(requesterRoles) && requesterRoles.includes('admin');
  const requesterIdNum = typeof requesterId === 'string' ? Number.parseInt(requesterId, 10) : requesterId;

  if (!isAdmin && certificate.userId !== requesterIdNum) {
    return { error: { status: 403, message: 'Not authorized to access this certificate' } };
  }

  const grade = computeGradeFromAttempts(certificate.enrollment?.quizAttempts || []);
  const hydratedCertificate = await ensureCertificatePdfForRecord(certificate, {
    studentName: certificate.user.fullName,
    courseTitle: certificate.course.title,
    instructorName: certificate.course.instructor.fullName,
    grade,
  });

  return {
    certificate: {
      ...certificate,
      ...hydratedCertificate,
    },
    grade,
  };
}

function mapCertificateToResponse(certificate, grade) {
  const resolvedGrade = Number(grade);
  const gradeLetter = resolvedGrade >= GRADE_A_MIN ? 'A' : (resolvedGrade >= GRADE_B_MIN ? 'B' : 'Pass');
  return {
    id: certificate.certificateId,
    courseId: certificate.course.courseId,
    userId: certificate.userId,
    studentName: certificate.user?.fullName,
    title: certificate.course.title,
    instructor: certificate.course.instructor.fullName,
    thumbnailUrl: certificate.course.thumbnailUrl,
    issuedAt: certificate.issuedAt,
    serialNumber: certificate.serialNumber,
    grade: resolvedGrade.toFixed(1),
    gradeLetter,
    pdfUrl: certificate.pdfUrl || getCertificateViewPath(certificate.certificateId),
    viewUrl: getCertificateViewPath(certificate.certificateId),
    downloadUrl: getCertificateDownloadPath(certificate.certificateId),
  };
}

// 2. API Public: Lấy danh sách chứng chỉ của User (Cho trang My Accomplishments)
const getMyCertificates = async (req, res) => {
  try {
    const userId = req.userId;

    // Query bảng certificates
    const certificates = await prisma.certificate.findMany({
      where: { userId: userId },
      orderBy: { issuedAt: 'desc' },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
        course: {
          select: {
            courseId: true,
            title: true,
            thumbnailUrl: true,
            instructor: {
              select: { fullName: true }
            }
          }
        },
        // Include enrollment để lấy điểm thi nếu muốn tính lại
        enrollment: {
            include: { quizAttempts: true }
        }
      }
    });

    // Map dữ liệu trả về cho đúng format UI
    const result = await Promise.all(
      certificates.map(async (cert) => {
        const grade = computeGradeFromAttempts(cert.enrollment?.quizAttempts || []);
        const hydratedCert = await ensureCertificatePdfForRecord(cert, {
          studentName: cert.user?.fullName || 'Student',
          courseTitle: cert.course.title,
          instructorName: cert.course.instructor.fullName,
          grade,
        });

        return mapCertificateToResponse(
          {
            ...cert,
            ...hydratedCert,
            user: cert.user,
          },
          grade
        );
      })
    );

    res.json(result);

  } catch (error) {
    console.error("Get Certificates Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCertificateById = async (req, res) => {
  try {
    const certificateId = Number.parseInt(req.params.certificateId, 10);
    if (Number.isNaN(certificateId)) {
      return res.status(400).json({ error: 'Invalid certificate ID' });
    }

    const access = await loadAccessibleCertificate(certificateId, req.userId, req.userRoles || []);
    if (access.error) {
      return res.status(access.error.status).json({ error: access.error.message });
    }

    return res.json(mapCertificateToResponse(access.certificate, access.grade));
  } catch (error) {
    console.error('Get Certificate Detail Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const serveCertificatePdf = async (req, res, download = false) => {
  try {
    const certificateId = Number.parseInt(req.params.certificateId, 10);
    if (Number.isNaN(certificateId)) {
      return res.status(400).json({ error: 'Invalid certificate ID' });
    }

    const access = await loadAccessibleCertificate(certificateId, req.userId, req.userRoles || []);
    if (access.error) {
      return res.status(access.error.status).json({ error: access.error.message });
    }

    const filePath = getCertificatePdfAbsolutePath(access.certificate.serialNumber);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Certificate PDF not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${download ? 'attachment' : 'inline'}; filename="${path.basename(filePath)}"`
    );

    return res.sendFile(filePath);
  } catch (error) {
    console.error('Serve Certificate PDF Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const viewCertificatePdf = async (req, res) => serveCertificatePdf(req, res, false);
const downloadCertificatePdf = async (req, res) => serveCertificatePdf(req, res, true);

module.exports = {
  ensureCertificateIssuedIfEligible,
  getMyCertificates,
  getCertificateById,
  viewCertificatePdf,
  downloadCertificatePdf,
};