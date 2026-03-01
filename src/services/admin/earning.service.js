/**
 * Earning Service
 * Handles instructor earning records from successful transactions
 * 
 * IMPORTANT: This is an ADDITIVE module - does not modify existing code
 * Platform fee: 30%
 */

const prisma = require('../../utils/prisma');

const PLATFORM_FEE_RATE = 0.30; // 30% platform fee

/**
 * Create earning records from a successful transaction
 * This is idempotent - safe to call multiple times (uses unique constraint on orderDetailId)
 * 
 * @param {number} transactionId - Transaction ID
 * @returns {Promise<{created: number, skipped: number, earnings: Array}>}
 */
async function createFromTransaction(transactionId) {
  // Fetch transaction with order details and course info
  const transaction = await prisma.transaction.findUnique({
    where: { transactionId },
    include: {
      order: {
        include: {
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
    throw new Error(`Transaction ${transactionId} not found`);
  }

  if (transaction.status !== 'success') {
    throw new Error(`Transaction ${transactionId} is not successful (status: ${transaction.status})`);
  }

  const results = {
    created: 0,
    skipped: 0,
    earnings: [],
  };

  for (const detail of transaction.order.orderDetails) {
    const { course, price, detailId } = detail;
    
    if (!course?.instructorId) {
      continue; // Skip if no instructor
    }

    // Check if earning already exists (idempotent)
    const existingEarning = await prisma.instructorEarning.findUnique({
      where: { orderDetailId: detailId },
    });

    if (existingEarning) {
      results.skipped++;
      results.earnings.push({ ...existingEarning, status: 'skipped' });
      continue;
    }

    // Calculate amounts
    const grossAmount = parseFloat(price);
    const platformFeeAmount = Math.round(grossAmount * PLATFORM_FEE_RATE * 100) / 100;
    const netAmount = Math.round((grossAmount - platformFeeAmount) * 100) / 100;

    // Derive month from transaction createdAt (YYYY-MM format)
    const txDate = transaction.createdAt;
    const month = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;

    // Create earning record
    const earning = await prisma.instructorEarning.create({
      data: {
        instructorId: course.instructorId,
        orderDetailId: detailId,
        transactionId: transactionId,
        grossAmount: grossAmount,
        platformFeeAmount: platformFeeAmount,
        netAmount: netAmount,
        month: month,
        status: 'unsettled',
      },
    });

    results.created++;
    results.earnings.push({ ...earning, status: 'created' });
  }

  return results;
}

/**
 * Sync earnings from all successful transactions that don't have earnings yet
 * Used for initial migration or catch-up sync
 * 
 * @param {Object} options - Sync options
 * @param {number} options.limit - Max transactions to process (default: 100)
 * @param {Date} options.fromDate - Only process transactions from this date
 * @returns {Promise<{processed: number, totalCreated: number, totalSkipped: number}>}
 */
async function syncFromSuccessfulTransactions({ limit = 100, fromDate = null } = {}) {
  // Find successful transactions
  const whereClause = {
    status: 'success',
  };

  if (fromDate) {
    whereClause.paidAt = { gte: fromDate };
  }

  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { transactionId: true },
  });

  const results = {
    processed: 0,
    totalCreated: 0,
    totalSkipped: 0,
    errors: [],
  };

  for (const tx of transactions) {
    try {
      const result = await createFromTransaction(tx.transactionId);
      results.processed++;
      results.totalCreated += result.created;
      results.totalSkipped += result.skipped;
    } catch (error) {
      results.errors.push({
        transactionId: tx.transactionId,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Get earnings summary for an instructor
 * 
 * @param {number} instructorId - Instructor user ID
 * @param {Object} options - Filter options
 * @returns {Promise<Object>}
 */
async function getInstructorEarnings(instructorId, { month = null, settled = null, page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const where = { instructorId };

  if (month) {
    // Filter by month (YYYY-MM)
    const startDate = new Date(`${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    where.createdAt = {
      gte: startDate,
      lt: endDate,
    };
  }

  if (settled === true) {
    where.settlementBatchId = { not: null };
  } else if (settled === false) {
    where.settlementBatchId = null;
  }

  const [earnings, total, aggregates] = await Promise.all([
    prisma.instructorEarning.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.instructorEarning.count({ where }),
    prisma.instructorEarning.aggregate({
      where,
      _sum: {
        grossAmount: true,
        platformFeeAmount: true,
        netAmount: true,
      },
      _count: true,
    }),
  ]);

  return {
    earnings,
    summary: {
      totalEarnings: aggregates._count,
      totalGross: aggregates._sum.grossAmount || 0,
      totalPlatformFee: aggregates._sum.platformFeeAmount || 0,
      totalNet: aggregates._sum.netAmount || 0,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get unsettled earnings grouped by instructor and month
 * Used to show pending settlements
 * 
 * @returns {Promise<Array>}
 */
async function getUnsettledEarningsSummary() {
  // Get all unsettled earnings with instructor info
  const earnings = await prisma.instructorEarning.findMany({
    where: { settlementBatchId: null },
    select: {
      instructorId: true,
      grossAmount: true,
      platformFeeAmount: true,
      netAmount: true,
      createdAt: true,
    },
  });

  // Group by instructor and month manually (Prisma doesn't support DATE_FORMAT in groupBy)
  const grouped = {};
  
  for (const earning of earnings) {
    const month = earning.createdAt.toISOString().slice(0, 7); // YYYY-MM
    const key = `${earning.instructorId}-${month}`;
    
    if (!grouped[key]) {
      grouped[key] = {
        instructorId: earning.instructorId,
        month,
        count: 0,
        totalGross: 0,
        totalPlatformFee: 0,
        totalNet: 0,
      };
    }
    
    grouped[key].count++;
    grouped[key].totalGross += parseFloat(earning.grossAmount);
    grouped[key].totalPlatformFee += parseFloat(earning.platformFeeAmount);
    grouped[key].totalNet += parseFloat(earning.netAmount);
  }

  // Get instructor details
  const instructorIds = [...new Set(Object.values(grouped).map(g => g.instructorId))];
  const instructors = await prisma.user.findMany({
    where: { userId: { in: instructorIds } },
    select: { userId: true, fullName: true, email: true },
  });
  
  const instructorMap = new Map(instructors.map(i => [i.userId, i]));

  return Object.values(grouped).map(g => ({
    ...g,
    instructor: instructorMap.get(g.instructorId) || null,
    totalGross: Math.round(g.totalGross * 100) / 100,
    totalPlatformFee: Math.round(g.totalPlatformFee * 100) / 100,
    totalNet: Math.round(g.totalNet * 100) / 100,
  }));
}

module.exports = {
  PLATFORM_FEE_RATE,
  createFromTransaction,
  syncFromSuccessfulTransactions,
  getInstructorEarnings,
  getUnsettledEarningsSummary,
};
