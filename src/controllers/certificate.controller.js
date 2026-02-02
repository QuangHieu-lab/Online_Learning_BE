const prisma = require('../utils/prisma');
const { v4: uuidv4 } = require('uuid'); // Dùng để tạo serialNumber ngẫu nhiên

// 1. Hàm nội bộ: Kiểm tra và Cấp chứng chỉ (Gọi hàm này khi User học xong bài cuối)
const checkAndIssueCertificate = async (userId, courseId) => {
  try {
    // B1: Lấy thông tin Enrollment và tiến độ
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId }
      },
      include: {
        learningProgress: true,
        course: {
            include: {
                modules: { include: { lessons: true } }
            }
        },
        quizAttempts: true // Lấy điểm thi để tính Grade
      }
    });

    if (!enrollment) return null;

    // B2: Kiểm tra xem đã học hết 100% chưa
    // Đếm tổng số bài học trong khóa
    let totalLessons = 0;
    enrollment.course.modules.forEach(m => totalLessons += m.lessons.length);
    
    // Đếm số bài đã completed
    const completedLessons = enrollment.learningProgress.filter(p => p.status === 'completed').length;

    // Nếu chưa học xong -> Không cấp
    if (completedLessons < totalLessons) return null;

    // B3: Kiểm tra xem chứng chỉ đã tồn tại chưa (Tránh tạo trùng)
    const existingCert = await prisma.certificate.findUnique({
      where: { enrollmentId: enrollment.enrollmentId }
    });

    if (existingCert) return existingCert;

    // B4: Tính điểm trung bình (Grade) từ các bài Quiz (Nếu có)
    let finalGrade = 0;
    if (enrollment.quizAttempts.length > 0) {
        // Logic đơn giản: Lấy điểm cao nhất của mỗi quiz, rồi tính trung bình
        // (Bạn có thể tùy chỉnh logic này phức tạp hơn tùy nghiệp vụ)
        const totalScore = enrollment.quizAttempts.reduce((sum, attempt) => sum + Number(attempt.totalScore || 0), 0);
        finalGrade = totalScore / enrollment.quizAttempts.length;
    }

    // B5: Tạo chứng chỉ mới vào bảng 'certificates'
    const newCert = await prisma.certificate.create({
      data: {
        userId: userId,
        courseId: courseId,
        enrollmentId: enrollment.enrollmentId,
        serialNumber: `CERT-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`, // VD: CERT-A1B2-170123456
        issuedAt: new Date(),
        pdfUrl: null // Bạn có thể update link PDF sau khi generate file
      }
    });

    // B6: Cập nhật trạng thái Enrollment thành 'completed'
    await prisma.enrollment.update({
        where: { enrollmentId: enrollment.enrollmentId },
        data: { status: 'completed' }
    });

    return { ...newCert, grade: finalGrade }; // Trả về kèm điểm để FE hiện (dù DB không lưu điểm)

  } catch (error) {
    console.error("Issue Certificate Error:", error);
    return null;
  }
};

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
        // Tính lại điểm để hiển thị (vì DB không lưu cột grade)
        let grade = 100; // Mặc định 100 nếu không có quiz
        if (cert.enrollment && cert.enrollment.quizAttempts.length > 0) {
             const total = cert.enrollment.quizAttempts.reduce((sum, q) => sum + Number(q.totalScore || 0), 0);
             grade = total / cert.enrollment.quizAttempts.length;
        }

        return {
            id: cert.certificateId,
            title: cert.course.title,
            instructor: cert.course.instructor.fullName,
            thumbnailUrl: cert.course.thumbnailUrl,
            issuedAt: cert.issuedAt,
            serialNumber: cert.serialNumber,
            grade: grade.toFixed(1), // VD: 95.0
            gradeLetter: grade >= 90 ? 'A' : (grade >= 80 ? 'B' : 'Pass'), // Logic xếp loại giả lập
            pdfUrl: cert.pdfUrl
        };
    });

    res.json(result);

  } catch (error) {
    console.error("Get Certificates Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { checkAndIssueCertificate, getMyCertificates };