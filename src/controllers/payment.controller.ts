import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createVNPayPaymentUrl, verifyVNPayCallback, getVNPayResponseMessage } from '../services/vnpay.service';
import { getCookieOptions } from '../utils/cookie.utils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create payment for course enrollment
 */
export const createPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.body;
    const userId = req.userId!;
    const courseIdInt = typeof courseId === 'string' ? parseInt(courseId) : courseId;

    if (!courseId || isNaN(courseIdInt)) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { courseId: courseIdInt },
      include: { instructor: { select: { fullName: true } } },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if course is free
    if (Number(course.price) === 0) {
      return res.status(400).json({ error: 'This course is free. Please use direct enrollment.' });
    }

    // Check if user is trying to enroll in their own course
    if (course.instructorId === userId) {
      return res.status(400).json({ error: 'Cannot enroll in your own course' });
    }

    // Check if already enrolled
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
      // If there's a pending order, return it
      if (existingEnrollment.order && existingEnrollment.order.status === 'pending') {
        const transaction = existingEnrollment.order.transaction;
        return res.json({
          orderId: existingEnrollment.order.orderId,
          paymentUrl: transaction?.paymentUrl,
          message: 'Payment already created',
        });
      }
    }

    // Generate unique transaction reference
    const vnpayTxnRef = uuidv4().replace(/-/g, '').substring(0, 40);

    // Create Order
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

    // Create Transaction
    const transaction = await prisma.transaction.create({
      data: {
        orderId: order.orderId,
        amount: course.price,
        status: 'pending',
        transactionRef: vnpayTxnRef,
        vnpayTxnRef,
      },
    });

    // Create VNPay payment URL
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
    const paymentUrl = createVNPayPaymentUrl({
      amount: Number(course.price),
      orderId: vnpayTxnRef,
      orderDescription: `Thanh toán khóa học: ${course.title}`,
      orderType: 'other',
      locale: 'vn',
      ipAddr: Array.isArray(clientIp) ? clientIp[0] : clientIp,
    });

    // Update transaction with URL
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
  } catch (error: any) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * VNPay return URL handler (callback)
 */
export const vnpayReturn = async (req: Request, res: Response) => {
  try {
    // Convert query params to Record<string, string> for type safety
    const queryParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        queryParams[key] = value;
      } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        queryParams[key] = value[0];
      }
    }

    // Verify callback
    const verification = verifyVNPayCallback(queryParams);

    if (!verification.isValid) {
      return res.status(400).send('Invalid signature');
    }

    const { data } = verification;
    if (!data) {
      return res.status(400).send('Invalid callback data');
    }

    // Find transaction by VNPay transaction reference
    const transaction = await prisma.transaction.findUnique({
      where: { vnpayTxnRef: data.vnp_TxnRef },
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
            orderDetails: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).send('Transaction not found');
    }

    // Update transaction status
    const responseCode = data.vnp_ResponseCode;
    const isSuccess = responseCode === '00';

    await prisma.transaction.update({
      where: { transactionId: transaction.transactionId },
      data: {
        status: isSuccess ? 'success' : 'failed',
        vnpayOrderId: data.vnp_TransactionNo,
        vnpayResponseCode: responseCode,
        vnpayMessage: getVNPayResponseMessage(responseCode),
        paidAt: isSuccess ? new Date() : null,
      },
    });

    // Update order status
    await prisma.order.update({
      where: { orderId: transaction.order.orderId },
      data: {
        status: isSuccess ? 'completed' : 'canceled',
      },
    });

    // If payment successful, create enrollment
    if (isSuccess) {
      const order = transaction.order;
      const courseId = order.orderDetails[0]?.courseId;

      if (courseId) {
        // Check if enrollment already exists
        const existingEnrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: order.userId,
              courseId,
            },
          },
        });

        if (!existingEnrollment) {
          // Create enrollment with orderId
          await prisma.enrollment.create({
            data: {
              userId: order.userId,
              courseId,
              orderId: order.orderId,
            },
          });
        } else {
          // Update existing enrollment with orderId
          await prisma.enrollment.update({
            where: { enrollmentId: existingEnrollment.enrollmentId },
            data: { orderId: order.orderId },
          });
        }
      }

      // Refresh auth cookie for user after successful payment
      if (order.user) {
        const roles = order.user.userRoles.map(ur => ur.role.roleName);
        const token = jwt.sign(
          { userId: order.user.userId, roles },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '7d' }
        );
        const cookieOptions = getCookieOptions();
        // Explicitly ensure domain is not set in development
        if (process.env.NODE_ENV !== 'production') {
          delete (cookieOptions as any).domain;
        }
        res.cookie('authToken', token, cookieOptions);
      }
    }

    // Redirect to public callback page
    const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
    const courseId = transaction.order.orderDetails[0]?.courseId;
    const redirectUrl = isSuccess
      ? `${frontendUrl}/payments/callback?payment=success&courseId=${courseId}&txnRef=${data.vnp_TxnRef}`
      : `${frontendUrl}/payments/callback?payment=failed&courseId=${courseId}&txnRef=${data.vnp_TxnRef}&error=${encodeURIComponent(getVNPayResponseMessage(responseCode))}`;

    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error('VNPay return error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
    res.redirect(`${frontendUrl}/payments/callback?payment=error`);
  }
};

/**
 * Get payment status
 */
export const getPaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const orderIdInt = parseInt(orderId);
    const userId = req.userId!;

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

    // Check if user owns this order
    if (order.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({
      orderId: order.orderId,
      status: order.status,
      totalAmount: order.totalAmount,
      transaction: order.transaction,
      courses: order.orderDetails.map(od => od.course),
    });
  } catch (error: any) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
