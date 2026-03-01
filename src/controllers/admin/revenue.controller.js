/**
 * Revenue Controller
 * Handles admin revenue management: orders, transactions
 */

const prisma = require('../../utils/prisma');
const { sendPrismaOrServerError } = require('../../utils/error.utils');

/**
 * Build pagination object
 */
function buildPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * GET /api/admin/revenue/orders
 * Get all orders with filters and pagination
 * Query params: page, limit, status, startDate, endDate, search
 */
const getAllOrders = async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageInt = Math.max(1, parseInt(page));
    const limitInt = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageInt - 1) * limitInt;

    // Build where clause
    const where = {};

    if (status) {
      const validStatuses = ['pending', 'completed', 'canceled', 'refunded'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ error: 'Invalid startDate format' });
        }
        where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ error: 'Invalid endDate format' });
        }
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { user: { fullName: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }

    // Valid sort fields
    const validSortFields = ['createdAt', 'totalAmount', 'status'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderByDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limitInt,
        orderBy: { [orderByField]: orderByDirection },
        include: {
          user: {
            select: {
              userId: true,
              fullName: true,
              email: true,
            },
          },
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
          transaction: {
            select: {
              transactionId: true,
              status: true,
              transactionRef: true,
              paidAt: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    const formattedOrders = orders.map(order => ({
      orderId: order.orderId,
      user: order.user,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentMethod: order.paymentMethod,
      courses: order.orderDetails.map(d => ({
        courseId: d.course.courseId,
        title: d.course.title,
        price: d.price,
      })),
      transaction: order.transaction,
      createdAt: order.createdAt,
    }));

    res.json({
      data: formattedOrders,
      pagination: buildPagination(pageInt, limitInt, total),
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    sendPrismaOrServerError(res, error);
  }
};

/**
 * GET /api/admin/revenue/orders/:orderId
 * Get order detail by ID
 */
const getOrderDetail = async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderIdInt = parseInt(orderId);

    if (isNaN(orderIdInt)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await prisma.order.findUnique({
      where: { orderId: orderIdInt },
      include: {
        user: {
          select: {
            userId: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        coupon: true,
        orderDetails: {
          include: {
            course: {
              select: {
                courseId: true,
                title: true,
                price: true,
                instructor: {
                  select: {
                    userId: true,
                    fullName: true,
                  },
                },
              },
            },
          },
        },
        transaction: true,
        enrollments: {
          select: {
            enrollmentId: true,
            status: true,
            enrolledAt: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      orderId: order.orderId,
      user: order.user,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentMethod: order.paymentMethod,
      coupon: order.coupon,
      courses: order.orderDetails.map(d => ({
        courseId: d.course.courseId,
        title: d.course.title,
        price: d.price,
        instructor: d.course.instructor,
      })),
      transaction: order.transaction,
      enrollments: order.enrollments,
      createdAt: order.createdAt,
    });
  } catch (error) {
    console.error('Get order detail error:', error);
    sendPrismaOrServerError(res, error);
  }
};

/**
 * GET /api/admin/revenue/transactions
 * Get all transactions with filters and pagination
 * Query params: page, limit, status, startDate, endDate
 */
const getAllTransactions = async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageInt = Math.max(1, parseInt(page));
    const limitInt = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageInt - 1) * limitInt;

    // Build where clause
    const where = {};

    if (status) {
      const validStatuses = ['pending', 'success', 'failed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ error: 'Invalid startDate format' });
        }
        where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ error: 'Invalid endDate format' });
        }
        where.createdAt.lte = end;
      }
    }

    // Valid sort fields
    const validSortFields = ['createdAt', 'amount', 'status'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderByDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limitInt,
        orderBy: { [orderByField]: orderByDirection },
        include: {
          order: {
            select: {
              orderId: true,
              status: true,
              user: {
                select: {
                  userId: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    const formattedTransactions = transactions.map(t => ({
      transactionId: t.transactionId,
      orderId: t.orderId,
      user: t.order.user,
      amount: t.amount,
      platformFee: t.platformFee,
      status: t.status,
      transactionRef: t.transactionRef,
      vnpayTxnRef: t.vnpayTxnRef,
      vnpayResponseCode: t.vnpayResponseCode,
      paidAt: t.paidAt,
      createdAt: t.createdAt,
    }));

    res.json({
      data: formattedTransactions,
      pagination: buildPagination(pageInt, limitInt, total),
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    sendPrismaOrServerError(res, error);
  }
};

/**
 * GET /api/admin/revenue/summary
 * Get revenue summary statistics
 * Query params: startDate, endDate
 */
const getRevenueSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = { status: 'success' };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          where.createdAt.gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          where.createdAt.lte = end;
        }
      }
    }

    const [totalRevenue, totalTransactions, avgOrderValue, revenueByMethod] = await Promise.all([
      // Total revenue
      prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
      }),

      // Total successful transactions
      prisma.transaction.count({ where }),

      // Average order value
      prisma.transaction.aggregate({
        where,
        _avg: { amount: true },
      }),

      // Revenue by payment method
      prisma.order.groupBy({
        by: ['paymentMethod'],
        where: { status: 'completed' },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);

    res.json({
      totalRevenue: totalRevenue._sum.amount || 0,
      totalTransactions,
      averageOrderValue: avgOrderValue._avg.amount || 0,
      revenueByPaymentMethod: revenueByMethod.map(r => ({
        method: r.paymentMethod,
        revenue: r._sum.totalAmount || 0,
        count: r._count,
      })),
    });
  } catch (error) {
    console.error('Get revenue summary error:', error);
    sendPrismaOrServerError(res, error);
  }
};

/**
 * GET /api/admin/revenue/export
 * Export revenue data as CSV
 * Query params: startDate, endDate, type (orders|transactions)
 */
const exportRevenue = async (req, res) => {
  try {
    const { startDate, endDate, type = 'orders' } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    let csvContent = '';
    let filename = '';

    if (type === 'transactions') {
      const transactions = await prisma.transaction.findMany({
        where: { ...where, status: 'success' },
        include: {
          order: {
            include: {
              user: { select: { fullName: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10000, // Limit to prevent OOM
      });

      csvContent = 'Transaction ID,Order ID,User,Email,Amount,Platform Fee,Status,Paid At,Created At\n';
      transactions.forEach(t => {
        csvContent += `${t.transactionId},${t.orderId},"${t.order.user.fullName}","${t.order.user.email}",${t.amount},${t.platformFee || 0},${t.status},${t.paidAt || ''},${t.createdAt}\n`;
      });
      filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      const orders = await prisma.order.findMany({
        where: { ...where, status: 'completed' },
        include: {
          user: { select: { fullName: true, email: true } },
          orderDetails: {
            include: {
              course: { select: { title: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10000,
      });

      csvContent = 'Order ID,User,Email,Total Amount,Status,Payment Method,Courses,Created At\n';
      orders.forEach(o => {
        const courses = o.orderDetails.map(d => d.course.title).join('; ');
        csvContent += `${o.orderId},"${o.user.fullName}","${o.user.email}",${o.totalAmount},${o.status},${o.paymentMethod},"${courses}",${o.createdAt}\n`;
      });
      filename = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export revenue error:', error);
    sendPrismaOrServerError(res, error);
  }
};

module.exports = {
  getAllOrders,
  getOrderDetail,
  getAllTransactions,
  getRevenueSummary,
  exportRevenue,
};
