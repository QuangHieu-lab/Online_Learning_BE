const prisma = require('../utils/prisma');
const { Prisma } = require('@prisma/client');
const { verifyVNPayCallback, getVNPayResponseMessage } = require('./vnpay.service');

const VNPAY_SUCCESS_CODE = '00';
const PLATFORM_FEE_RATE = new Prisma.Decimal('0.30'); // 30% platform fee

/**
 * Normalize query to plain object (single values for arrays).
 */
function normalizeQuery(query) {
  const params = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') {
      params[key] = value;
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      params[key] = value[0];
    }
  }
  return params;
}

/**
 * Verify VNPay callback and apply transaction + order updates.
 * On success: create enrollment AND instructor earnings (atomic).
 * Returns { transaction, isSuccess, data, responseCode, earningsCreated } or throws.
 * 
 * ATOMICITY: All success operations wrapped in prisma.$transaction
 * IDEMPOTENCY: Checks existing earnings before creating (unique constraint backup)
 */
async function verifyAndApplyVnpayCallback(query) {
  const queryParams = normalizeQuery(query);
  const verification = verifyVNPayCallback(queryParams);

  if (!verification.isValid) {
    const err = new Error('Invalid signature');
    err.status = 400;
    throw err;
  }

  const { data } = verification;
  if (!data) {
    const err = new Error('Invalid callback data');
    err.status = 400;
    throw err;
  }

  const transaction = await prisma.transaction.findUnique({
    where: { vnpayTxnRef: data.vnp_TxnRef },
    include: {
      order: {
        include: {
          user: {
            include: {
              userRoles: {
                include: { role: true },
              },
            },
          },
          orderDetails: { 
            include: { 
              course: {
                select: {
                  courseId: true,
                  instructorId: true,
                  title: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!transaction) {
    const err = new Error('Transaction not found');
    err.status = 404;
    throw err;
  }

  const responseCode = data.vnp_ResponseCode;
  const isSuccess = responseCode === VNPAY_SUCCESS_CODE;

  let earningsCreated = 0;

  if (isSuccess) {
    // =========================================================================
    // ATOMIC TRANSACTION: All success operations in one database transaction
    // =========================================================================
    await prisma.$transaction(async (tx) => {
      // 1. Update transaction status
      await tx.transaction.update({
        where: { transactionId: transaction.transactionId },
        data: {
          status: 'success',
          vnpayOrderId: data.vnp_TransactionNo,
          vnpayResponseCode: responseCode,
          vnpayMessage: getVNPayResponseMessage(responseCode),
          paidAt: new Date(),
        },
      });

      // 2. Update order status
      await tx.order.update({
        where: { orderId: transaction.order.orderId },
        data: {
          status: 'completed',
        },
      });

      // 3. Create enrollment for each course (handle multiple courses)
      for (const detail of transaction.order.orderDetails) {
        const existingEnrollment = await tx.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: transaction.order.userId,
              courseId: detail.courseId,
            },
          },
        });

        if (!existingEnrollment) {
          await tx.enrollment.create({
            data: {
              userId: transaction.order.userId,
              courseId: detail.courseId,
              orderId: transaction.order.orderId,
            },
          });
        } else {
          await tx.enrollment.update({
            where: { enrollmentId: existingEnrollment.enrollmentId },
            data: { orderId: transaction.order.orderId },
          });
        }
      }

      // 4. Create InstructorEarning for each OrderDetail (idempotent)
      for (const detail of transaction.order.orderDetails) {
        if (!detail.course?.instructorId) {
          continue; // Skip if no instructor
        }

        // IDEMPOTENCY CHECK: Skip if earning already exists
        const existingEarning = await tx.instructorEarning.findUnique({
          where: { orderDetailId: detail.detailId },
        });

        if (existingEarning) {
          continue; // Already processed, skip
        }

        // Calculate using Prisma.Decimal for precision
        const grossAmount = new Prisma.Decimal(detail.price.toString());
        const platformFeeAmount = grossAmount.mul(PLATFORM_FEE_RATE);
        const netAmount = grossAmount.sub(platformFeeAmount);

        // Derive month from transaction createdAt (YYYY-MM format)
        const txDate = transaction.createdAt;
        const month = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;

        await tx.instructorEarning.create({
          data: {
            instructorId: detail.course.instructorId,
            orderDetailId: detail.detailId,
            transactionId: transaction.transactionId,
            grossAmount: grossAmount,
            platformFeeAmount: platformFeeAmount,
            netAmount: netAmount,
            month: month,
            status: 'unsettled',
          },
        });

        earningsCreated++;
      }
    });
  } else {
    // FAILED transaction - no atomic wrapper needed
    await prisma.transaction.update({
      where: { transactionId: transaction.transactionId },
      data: {
        status: 'failed',
        vnpayOrderId: data.vnp_TransactionNo,
        vnpayResponseCode: responseCode,
        vnpayMessage: getVNPayResponseMessage(responseCode),
        paidAt: null,
      },
    });

    await prisma.order.update({
      where: { orderId: transaction.order.orderId },
      data: {
        status: 'canceled',
      },
    });
  }

  return { transaction, isSuccess, data, responseCode, earningsCreated };
}

/**
 * Create or update enrollment for order (first course in order details).
 * 
 * NOTE: This is now a LEGACY standalone function for backward compatibility.
 * The main verifyAndApplyVnpayCallback() now handles enrollment creation
 * inside prisma.$transaction for atomicity.
 * 
 * Use this only for manual/standalone enrollment operations.
 * 
 * @deprecated Use enrollment logic inside transaction for new code
 */
async function applyEnrollmentFromOrder(order) {
  const courseId = order.orderDetails[0]?.courseId;
  if (!courseId) return;

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: order.userId,
        courseId,
      },
    },
  });

  if (!existingEnrollment) {
    await prisma.enrollment.create({
      data: {
        userId: order.userId,
        courseId,
        orderId: order.orderId,
      },
    });
  } else {
    await prisma.enrollment.update({
      where: { enrollmentId: existingEnrollment.enrollmentId },
      data: { orderId: order.orderId },
    });
  }
}

module.exports = {
  verifyAndApplyVnpayCallback,
  applyEnrollmentFromOrder,
  getVNPayResponseMessage,
};
