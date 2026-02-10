const prisma = require('../utils/prisma');

// =====================================================================
// 1. TẠO KHÓA HỌC (CREATE)
// =====================================================================
const createCourse = async (req, res) => {
  try {
    const { title, description, price, category, levelTarget, priceJustification } = req.body;
    const instructorId = req.userId;

    const course = await prisma.course.create({
      data: {
        title,
        description,
        price: price ? parseFloat(price) : 0,
        priceJustification: priceJustification || '',
        instructorId,
        category: category || 'Communication',
        levelTarget: levelTarget || 'A1',
        status: 'draft', // Mặc định là nháp
      },
      include: {
        instructor: {
          select: { userId: true, fullName: true, email: true },
        },
        modules: true,
      },
    });

    res.status(201).json(course);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// =====================================================================
// 2. LẤY DANH SÁCH KHÓA HỌC (PUBLIC & ADMIN)
// =====================================================================
const getCourses = async (req, res) => {
  try {
    const userId = req.userId;
    // status: Dùng để lọc (VD: Admin lọc 'pending_review')
    // instructorId: Dùng để lọc khóa của 1 GV cụ thể
    // enrolled: Nếu = 'true' thì lấy khóa đã mua
    const { enrolled, status, instructorId } = req.query;

    if (enrolled === 'true' && !userId) {
      return res.status(401).json({ error: 'Login required to view enrolled courses' });
    }

    let courses;

    if (enrolled === 'true') {
      // --- LẤY KHÓA ĐÃ MUA ---
      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              instructor: {
                select: { userId: true, fullName: true, email: true },
              },
              modules: {
                include: { _count: { select: { lessons: true } } },
              },
            },
          },
        },
      });
      courses = enrollments.map((e) => ({ ...e.course, isEnrolled: true }));
    } else {
      // --- LẤY DANH SÁCH KHÓA HỌC (PUBLIC / ADMIN) ---
      const whereClause = {};
      
      if (status) whereClause.status = status;
      if (instructorId) whereClause.instructorId = parseInt(instructorId);

      // Mặc định: Nếu không phải Admin (hoặc không truyền status cụ thể),
      // thì khách chỉ nên thấy khóa đã 'published'.
      // Tuy nhiên, để linh hoạt cho Admin xem tất cả, ta chỉ lọc khi cần thiết.
      // Nếu bạn muốn chặt chẽ hơn: Check role Admin ở đây.
      
      courses = await prisma.course.findMany({
        where: whereClause,
        include: {
          instructor: {
            select: { userId: true, fullName: true, email: true },
          },
          modules: {
            include: { _count: { select: { lessons: true } } },
          },
        },
        orderBy: { createdAt: 'desc' }
      });

      // Check enrollment status (nếu user đã login)
      if (userId) {
        const enrollments = await prisma.enrollment.findMany({
          where: { userId },
          select: { courseId: true },
        });
        const enrolledIds = new Set(enrollments.map((e) => e.courseId));
        courses = courses.map((c) => ({
          ...c,
          isEnrolled: enrolledIds.has(c.courseId),
        }));
      }
    }

    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// =====================================================================
// 3. LẤY KHÓA HỌC CỦA GIẢNG VIÊN (MY COURSES) - [MỚI]
// =====================================================================
const getInstructorCourses = async (req, res) => {
  try {
    const instructorId = req.userId; // Lấy ID từ token người đang login

    const courses = await prisma.course.findMany({
      where: {
        instructorId: instructorId
      },
      include: {
        modules: {
          select: { _count: { select: { lessons: true } } }
        },
        _count: {
          select: { enrollments: true } // Đếm số học viên
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(courses);
  } catch (error) {
    console.error('Get instructor courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// =====================================================================
// 4. LẤY CHI TIẾT KHÓA HỌC (BY ID)
// =====================================================================
const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const courseIdInt = parseInt(courseId);
    const userId = req.userId;

    if (isNaN(courseIdInt)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    const isGuest = !userId;

    const course = await prisma.course.findUnique({
      where: { courseId: courseIdInt },
      include: {
        instructor: {
          select: { userId: true, fullName: true, email: true },
        },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              include: {
                quizzes: {
                  select: {
                    quizId: true, title: true, timeLimitMinutes: true, passingScore: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!course) return res.status(404).json({ error: 'Course not found' });

    // Guest: Trả về preview (không nội dung bài học)
    if (isGuest) {
      const courseWithoutContent = {
        ...course,
        modules: course.modules.map((module) => ({ ...module, lessons: [] })),
        isEnrolled: false,
      };
      return res.json(courseWithoutContent);
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: courseIdInt } },
    });

    const isEnrolled = !!enrollment;
    const isInstructor = course.instructorId === userId;
    const isPaidCourse = Number(course.price) > 0;

    // Chưa mua + Không phải tác giả => Ẩn nội dung
    if (isPaidCourse && !isEnrolled && !isInstructor) {
      const courseWithoutContent = {
        ...course,
        modules: course.modules.map((module) => ({ ...module, lessons: [] })),
        isEnrolled: false,
      };
      return res.json(courseWithoutContent);
    }

    res.json({ ...course, isEnrolled: isEnrolled || isInstructor });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// =====================================================================
// 5. CẬP NHẬT KHÓA HỌC (UPDATE)
// =====================================================================
const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const courseIdInt = parseInt(courseId);
    const { title, description, price, levelTarget, category, thumbnailUrl, previewVideoUrl, priceJustification } = req.body;
    const userId = req.userId;

    if (isNaN(courseIdInt)) return res.status(400).json({ error: 'Invalid course ID' });

    const course = await prisma.course.findUnique({ where: { courseId: courseIdInt } });

    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructorId !== userId) return res.status(403).json({ error: 'Not authorized' });

    // Không cho sửa khi đang chờ duyệt
    if (course.status === 'pending_review') {
        return res.status(400).json({ error: 'Cannot update course while under review' });
    }

    const updatedCourse = await prisma.course.update({
      where: { courseId: courseIdInt },
      data: {
        title,
        description,
        category,
        levelTarget,
        thumbnailUrl,
        previewVideoUrl,
        price: price !== undefined ? parseFloat(price) : undefined,
        priceJustification,
        updatedAt: new Date(),
        // Nếu khóa học bị từ chối mà sửa lại -> Có thể tự động chuyển về draft hoặc giữ nguyên rejected tùy logic
        // Ở đây ta giữ nguyên, chờ GV bấm nút "Gửi duyệt lại"
      },
      include: {
        instructor: { select: { userId: true, fullName: true, email: true } },
        modules: true,
      },
    });

    res.json(updatedCourse);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// =====================================================================
// 6. XÓA KHÓA HỌC (DELETE)
// =====================================================================
const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const courseIdInt = parseInt(courseId);
    const userId = req.userId;

    if (isNaN(courseIdInt)) return res.status(400).json({ error: 'Invalid course ID' });

    const course = await prisma.course.findUnique({ where: { courseId: courseIdInt } });

    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructorId !== userId) return res.status(403).json({ error: 'Not authorized' });

    await prisma.course.delete({ where: { courseId: courseIdInt } });

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// =====================================================================
// 7. ĐĂNG KÝ HỌC (ENROLL)
// =====================================================================
const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const courseIdInt = parseInt(courseId);
    const userId = req.userId;

    if (isNaN(courseIdInt)) return res.status(400).json({ error: 'Invalid course ID' });

    const course = await prisma.course.findUnique({ where: { courseId: courseIdInt } });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (course.instructorId === userId) return res.status(400).json({ error: 'Cannot enroll in your own course' });

    if (Number(course.price) > 0) {
      return res.status(402).json({
        error: 'Payment required',
        message: 'This course requires payment. Please create a payment first.',
        courseId: course.courseId,
        price: course.price,
      });
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: courseIdInt } },
    });

    if (existingEnrollment) return res.status(400).json({ error: 'Already enrolled in this course' });

    const enrollment = await prisma.enrollment.create({
      data: { userId, courseId: courseIdInt },
      include: {
        course: { select: { courseId: true, title: true, description: true } },
      },
    });

    res.status(201).json(enrollment);
  } catch (error) {
    console.error('Enroll error:', error);
    if (error.code === 'P2002') return res.status(400).json({ error: 'Already enrolled in this course' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// =====================================================================
// 8. LẤY KHÓA HỌC CỦA HỌC VIÊN (MY LEARNING)
// =====================================================================
const getCoursesByStudentId = async (req, res) => {
  try {
    const { studentId } = req.params;
    const studentIdInt = parseInt(studentId);

    if (isNaN(studentIdInt)) return res.status(400).json({ error: 'Invalid student ID' });

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: studentIdInt, status: 'active' },
      orderBy: { enrolledAt: 'desc' },
      include: {
        course: {
          select: {
            courseId: true, title: true, thumbnailUrl: true, description: true, levelTarget: true,
            instructor: { select: { fullName: true, avatarUrl: true } },
            modules: { select: { _count: { select: { lessons: true } } } },
          },
        },
      },
    });

    const purchasedCourses = enrollments.map((item) => ({
      ...item.course,
      enrolledAt: item.enrolledAt,
      expiryDate: item.expiryDate,
    }));

    res.json(purchasedCourses);
  } catch (error) {
    console.error('Get student courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// =====================================================================
// 9. QUY TRÌNH DUYỆT BÀI (REVIEW WORKFLOW)
// =====================================================================

// Giảng viên gửi duyệt
const submitForReview = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;
    const courseIdInt = parseInt(courseId);

    const course = await prisma.course.findUnique({ where: { courseId: courseIdInt } });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructorId !== userId) return res.status(403).json({ error: 'Unauthorized' });

    // Validation
    if (Number(course.price) < 0) return res.status(400).json({ error: 'Giá không hợp lệ.' });
    if (!course.priceJustification || course.priceJustification.trim() === '') {
      return res.status(400).json({ error: 'Vui lòng nhập "Giải trình giá" trước khi gửi duyệt.' });
    }

    const updated = await prisma.course.update({
      where: { courseId: courseIdInt },
      data: { status: 'pending_review' },
    });
    res.json({ message: 'Gửi duyệt thành công', course: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin duyệt
const approveCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { adminNote } = req.body;

    const publishedCourse = await prisma.course.update({
      where: { courseId: parseInt(courseId) },
      data: {
        status: 'published',
        adminNote: adminNote || 'Approved by Admin',
        updatedAt: new Date(),
      },
    });
    res.json({ message: 'Đã duyệt khóa học.', course: publishedCourse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin từ chối
const rejectCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ error: 'Vui lòng nhập lý do từ chối.' });

    const rejectedCourse = await prisma.course.update({
      where: { courseId: parseInt(courseId) },
      data: {
        status: 'rejected',
        adminNote: reason,
        updatedAt: new Date(),
      },
    });
    res.json({ message: 'Đã từ chối khóa học.', course: rejectedCourse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =====================================================================
// EXPORT MODULE
// =====================================================================
module.exports = {
  createCourse,
  getCourses,
  getInstructorCourses, // <-- Đã thêm mới
  getCourseById,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  getCoursesByStudentId,
  submitForReview,
  approveCourse,
  rejectCourse,
};