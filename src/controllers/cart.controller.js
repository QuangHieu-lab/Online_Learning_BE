const prisma = require('../utils/prisma');

// 1. Lấy danh sách giỏ hàng
const getCart = async (req, res) => {
  try {
    const userId = req.userId;

    const cartItems = await prisma.cart.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            courseId: true,
            title: true,
            price: true,
            thumbnailUrl: true, // Nếu database bạn có cột này (trong SQL bạn gửi có thumbnail_url)
            instructor: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Tính tổng tiền tạm tính (Frontend có thể tự tính, nhưng BE trả về cũng tốt)
    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + Number(item.course.price);
    }, 0);

    res.json({
      items: cartItems,
      totalAmount,
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 2. Thêm khóa học vào giỏ
const addToCart = async (req, res) => {
  try {
    const { courseId } = req.body; // Gửi courseId qua Body
    const userId = req.userId;
    const courseIdInt = parseInt(courseId);

    if (isNaN(courseIdInt)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    // A. Kiểm tra khóa học có tồn tại không
    const course = await prisma.course.findUnique({
      where: { courseId: courseIdInt },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // B. Không cho phép mua khóa học của chính mình
    if (course.instructorId === userId) {
      return res.status(400).json({ error: 'Cannot add your own course to cart' });
    }

    // C. Kiểm tra xem đã đăng ký (mua) chưa
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: courseIdInt,
        },
      },
    });

    if (existingEnrollment) {
      return res.status(400).json({ error: 'You are already enrolled in this course' });
    }

    // D. Kiểm tra xem đã có trong giỏ hàng chưa
    // Prisma tự tạo compound unique key tên là userId_courseId từ bảng SQL
    const existingCartItem = await prisma.cart.findUnique({
      where: {
        userId_courseId: { 
          userId,
          courseId: courseIdInt,
        },
      },
    });

    if (existingCartItem) {
      return res.status(400).json({ error: 'Course is already in your cart' });
    }

    // E. Thêm vào giỏ
    const newCartItem = await prisma.cart.create({
      data: {
        userId,
        courseId: courseIdInt,
      },
      include: {
        course: {
          select: {
            title: true,
            price: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Added to cart successfully',
      item: newCartItem,
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 3. Xóa khỏi giỏ hàng
const removeFromCart = async (req, res) => {
  try {
    const { courseId } = req.params; // Lấy courseId từ URL params
    const userId = req.userId;
    const courseIdInt = parseInt(courseId);

    if (isNaN(courseIdInt)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    // Dùng delete với where composite key
    await prisma.cart.delete({
      where: {
        userId_courseId: {
          userId,
          courseId: courseIdInt,
        },
      },
    });

    res.json({ message: 'Removed from cart successfully' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    // Mã lỗi P2025 là Record to delete does not exist (nếu user cố xóa cái không có)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Item not found in cart' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 4. Xóa sạch giỏ hàng (Dùng khi checkout thành công hoặc user muốn clear)
const clearCart = async (req, res) => {
    try {
        const userId = req.userId;
        
        await prisma.cart.deleteMany({
            where: { userId }
        });

        res.json({ message: 'Cart cleared' });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
  getCart,
  addToCart,
  removeFromCart,
  clearCart
};