const prisma = require('../utils/prisma');
const { GRADE_A_MIN, GRADE_B_MIN } = require('../config/constants');
const { ensureCertificateIssuedIfEligible, computeGradeFromAttempts } = require('../services/certificate.service');

// 2. API Public: Lấy danh sách chứng chỉ của User (Cho trang My Accomplishments)
const getMyCertificates = async (req, res) => {
  try {
    const userId = req.userId;

    // Query bảng certificates
    const certificates = await prisma.certificate.findMany({
      where: { userId: userId },
      orderBy: { issuedAt: 'desc' },
      include: {
        course: {
          select: {
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
    const result = certificates.map(cert => {
        const grade =
          cert.enrollment && cert.enrollment.quizAttempts.length > 0
            ? computeGradeFromAttempts(cert.enrollment.quizAttempts)
            : 100;

        return {
            id: cert.certificateId,
            title: cert.course.title,
            instructor: cert.course.instructor.fullName,
            thumbnailUrl: cert.course.thumbnailUrl,
            issuedAt: cert.issuedAt,
            serialNumber: cert.serialNumber,
            grade: grade.toFixed(1), // VD: 95.0
            gradeLetter: grade >= GRADE_A_MIN ? 'A' : (grade >= GRADE_B_MIN ? 'B' : 'Pass'),
            pdfUrl: cert.pdfUrl
        };
    });

    res.json(result);

  } catch (error) {
    console.error("Get Certificates Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { ensureCertificateIssuedIfEligible, getMyCertificates };