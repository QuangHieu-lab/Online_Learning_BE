const prisma = require('../utils/prisma');
const { createVNPayPaymentUrl } = require('../services/vnpay.service');
const {
  verifyAndApplyVnpayCallback,
  getVNPayResponseMessage,
} = require('../services/payment-callback.service');
const { setAuthCookie, createAuthToken } = require('../utils/auth.utils');
const crypto = require('crypto');

/** Ensure frontend URL has port for localhost/127.0.0.1 to avoid redirect to port 80 (ERR_CONNECTION_REFUSED) */
function getFrontendBaseUrl() {
  const raw = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
  try {
    const u = new URL(raw);
    const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (isLocal && !u.port) {
      u.port = '5173';
      return u.toString().replace(/\/$/, '');
    }
    return raw.replace(/\/$/, '');
  } catch {
    return raw.replace(/\/$/, '');
  }
}

const createPayment = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.userId;
    const courseIdInt = typeof courseId === 'string' ? parseInt(courseId) : courseId;

    if (!courseId || isNaN(courseIdInt) || courseIdInt < 1) {
      return res.status(400).json({ error: 'Valid course ID (positive integer) is required' });
    }

    const course = await prisma.course.findUnique({
      where: { courseId: courseIdInt },
      include: { instructor: { select: { fullName: true } } },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (Number(course.price) === 0) {
      return res.status(400).json({ error: 'This course is free. Please use direct enrollment.' });
    }

    if (course.instructorId === userId) {
      return res.status(400).json({ error: 'Cannot enroll in your own course' });
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: courseIdInt,
        },
      },
      include: {
        order: {
          include: {
            transaction: true,
          },
        },
      },
    });

    if (existingEnrollment) {
      if (existingEnrollment.order?.status === 'completed') {
        return res.status(400).json({ error: 'Already enrolled in this course' });
      }
      if (existingEnrollment.order && existingEnrollment.order.status === 'pending') {
        const transaction = existingEnrollment.order.transaction;
        return res.json({
          orderId: existingEnrollment.order.orderId,
          paymentUrl: transaction?.paymentUrl,
          message: 'Payment already created',
        });
      }
    }

    const vnpayTxnRef = crypto.randomUUID().replace(/-/g, '') + crypto.randomBytes(4).toString('hex');

    const order = await prisma.order.create({
      data: {
        userId,
        totalAmount: course.price,
        status: 'pending',
        paymentMethod: 'vnpay',
        orderDetails: {
          create: {
            courseId: courseIdInt,
            price: course.price,
          },
        },
      },
    });

    const transaction = await prisma.transaction.create({
      data: {
        orderId: order.orderId,
        amount: course.price,
        status: 'pending',
        transactionRef: vnpayTxnRef,
        vnpayTxnRef,
      },
    });

    const clientIp =
      req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '127.0.0.1';
    const paymentUrl = createVNPayPaymentUrl({
      amount: Number(course.price),
      orderId: vnpayTxnRef,
      orderDescription: `Thanh toán khóa học: ${course.title}`,
      orderType: 'other',
      locale: 'vn',
      ipAddr: Array.isArray(clientIp) ? clientIp[0] : clientIp,
    });

    await prisma.transaction.update({
      where: { transactionId: transaction.transactionId },
      data: { paymentUrl },
    });

    res.json({
      orderId: order.orderId,
      transactionId: transaction.transactionId,
      paymentUrl,
      amount: course.price,
      course: {
        courseId: course.courseId,
        title: course.title,
      },
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const vnpayReturn = async (req, res) => {
  try {
    const { transaction, isSuccess, data, responseCode } = await verifyAndApplyVnpayCallback(req.query);

    if (isSuccess && transaction.order.user) {
      const roles = transaction.order.user.userRoles.map((ur) => ur.role.roleName);
      const token = createAuthToken(transaction.order.user.userId, roles);
      setAuthCookie(res, token);
    }

    const frontendUrl = getFrontendBaseUrl();
    const courseId = transaction.order.orderDetails[0]?.courseId;
    const redirectUrl = isSuccess
      ? `${frontendUrl}/payments/callback?payment=success&courseId=${courseId}&txnRef=${data.vnp_TxnRef}`
      : `${frontendUrl}/payments/callback?payment=failed&courseId=${courseId}&txnRef=${data.vnp_TxnRef}&error=${encodeURIComponent(getVNPayResponseMessage(responseCode))}`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('VNPay return error:', error);
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    if (error.status === 404) {
      return res.status(404).json({ error: error.message });
    }
    const frontendUrl = getFrontendBaseUrl();
    res.redirect(`${frontendUrl}/payments/callback?payment=error`);
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.userId;

    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        transaction: true,
        orderDetails: {
          include: {
            course: {
              select: {
                courseId: true,
                title: true,
                price: true,
              },
            },
          },
        },
      },
    });

    const history = orders.map((order) => ({
      orderId: order.orderId,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      transactionId: order.transaction?.transactionId ?? null,
      paidAt: order.transaction?.paidAt ?? null,
      transactionStatus: order.transaction?.status ?? null,
      vnpayMessage: order.transaction?.vnpayMessage ?? null,
      courses: order.orderDetails.map((od) => ({
        courseId: od.course.courseId,
        title: od.course.title,
        price: od.course.price,
      })),
    }));

    res.json(history);
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderIdInt = parseInt(orderId);
    const userId = req.userId;

    if (isNaN(orderIdInt)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await prisma.order.findUnique({
      where: { orderId: orderIdInt },
      include: {
        transaction: true,
        orderDetails: {
          include: {
            course: {
              include: {
                instructor: {
                  select: {
                    userId: true,
                    fullName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({
      orderId: order.orderId,
      status: order.status,
      totalAmount: order.totalAmount,
      transaction: order.transaction,
      courses: order.orderDetails.map((od) => od.course),
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createPayment,
  vnpayReturn,
  getPaymentHistory,
  getPaymentStatus,
};
