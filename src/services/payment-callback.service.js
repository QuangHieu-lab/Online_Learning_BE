const prisma = require('../utils/prisma');
const { verifyVNPayCallback, getVNPayResponseMessage } = require('./vnpay.service');

const VNPAY_SUCCESS_CODE = '00';

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
 * Verify VNPay callback and apply transaction + order updates. On success, create/update enrollment.
 * Returns { transaction, isSuccess, data, responseCode } or throws.
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
          orderDetails: { include: { course: true } },
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

  await prisma.order.update({
    where: { orderId: transaction.order.orderId },
    data: {
      status: isSuccess ? 'completed' : 'canceled',
    },
  });

  if (isSuccess) {
    await applyEnrollmentFromOrder(transaction.order);
  }

  return { transaction, isSuccess, data, responseCode };
}

/**
 * Create or update enrollment for order (first course in order details).
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
