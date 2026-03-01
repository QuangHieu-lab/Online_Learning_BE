/**
 * Settlement Service
 * Handles monthly instructor settlement batch generation
 * 
 * IMPORTANT: This is an ADDITIVE module - does not modify existing code
 * Uses Prisma transactions for atomicity
 */

const prisma = require('../../utils/prisma');

/**
 * Generate monthly settlement batches for all instructors with unsettled earnings
 * 
 * @param {string} month - Month in YYYY-MM format
 * @returns {Promise<{success: Array, failed: Array, summary: Object}>}
 */
async function generateMonthlySettlement(month) {
  // Validate month format
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('Invalid month format. Use YYYY-MM');
  }

  // Parse month boundaries
  const startDate = new Date(`${month}-01T00:00:00.000Z`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  // Find all unsettled earnings for this month, grouped by instructor
  const earningsData = await prisma.instructorEarning.findMany({
    where: {
      settlementBatchId: null,
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
    },
    select: {
      earningId: true,
      instructorId: true,
      grossAmount: true,
      platformFeeAmount: true,
      netAmount: true,
    },
  });

  if (earningsData.length === 0) {
    return {
      success: [],
      failed: [],
      summary: {
        month,
        totalBatches: 0,
        totalNet: 0,
        message: 'No unsettled earnings found for this month',
      },
    };
  }

  // Group by instructor
  const byInstructor = {};
  for (const earning of earningsData) {
    const key = earning.instructorId;
    if (!byInstructor[key]) {
      byInstructor[key] = {
        instructorId: key,
        earningIds: [],
        totalGross: 0,
        totalPlatformFee: 0,
        totalNet: 0,
      };
    }
    byInstructor[key].earningIds.push(earning.earningId);
    byInstructor[key].totalGross += parseFloat(earning.grossAmount);
    byInstructor[key].totalPlatformFee += parseFloat(earning.platformFeeAmount);
    byInstructor[key].totalNet += parseFloat(earning.netAmount);
  }

  const results = {
    success: [],
    failed: [],
  };

  // Process each instructor
  for (const data of Object.values(byInstructor)) {
    try {
      const batch = await generateSettlementForInstructor(
        data.instructorId,
        month,
        data.earningIds,
        {
          totalGross: Math.round(data.totalGross * 100) / 100,
          totalPlatformFee: Math.round(data.totalPlatformFee * 100) / 100,
          totalNet: Math.round(data.totalNet * 100) / 100,
        }
      );
      results.success.push(batch);
    } catch (error) {
      results.failed.push({
        instructorId: data.instructorId,
        error: error.message,
      });
    }
  }

  return {
    success: results.success,
    failed: results.failed,
    summary: {
      month,
      totalBatches: results.success.length,
      totalFailed: results.failed.length,
      totalNet: results.success.reduce((sum, b) => sum + parseFloat(b.totalNet), 0),
    },
  };
}

/**
 * Generate settlement batch for a specific instructor
 * Uses Prisma transaction for atomicity
 * 
 * @param {number} instructorId - Instructor user ID
 * @param {string} month - Month in YYYY-MM format
 * @param {Array<number>} earningIds - Earning IDs to include
 * @param {Object} totals - Pre-calculated totals
 * @returns {Promise<Object>} Created batch
 */
async function generateSettlementForInstructor(instructorId, month, earningIds, totals) {
  // Check for existing settlement
  const existing = await prisma.instructorSettlementBatch.findUnique({
    where: {
      instructorId_month: {
        instructorId,
        month,
      },
    },
  });

  if (existing) {
    throw new Error(`Settlement batch already exists for instructor ${instructorId} in ${month}`);
  }

  // Create batch and update earnings in a transaction
  const batch = await prisma.$transaction(async (tx) => {
    // Create settlement batch
    const newBatch = await tx.instructorSettlementBatch.create({
      data: {
        instructorId,
        month,
        totalGross: totals.totalGross,
        totalPlatformFee: totals.totalPlatformFee,
        totalNet: totals.totalNet,
        status: 'generated',
      },
    });

    // Update all earnings to link to this batch
    await tx.instructorEarning.updateMany({
      where: {
        earningId: { in: earningIds },
      },
      data: {
        settlementBatchId: newBatch.batchId,
      },
    });

    return newBatch;
  });

  // Fetch instructor info
  const instructor = await prisma.user.findUnique({
    where: { userId: instructorId },
    select: { userId: true, fullName: true, email: true },
  });

  return {
    ...batch,
    instructor,
    earningsCount: earningIds.length,
  };
}

/**
 * Get all settlement batches with filters
 * 
 * @param {Object} options - Filter options
 * @returns {Promise<Object>}
 */
async function getAllSettlements({ status = null, month = null, instructorId = null, page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const where = {};

  if (status) where.status = status;
  if (month) where.month = month;
  if (instructorId) where.instructorId = instructorId;

  const [batches, total] = await Promise.all([
    prisma.instructorSettlementBatch.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { earnings: true },
        },
      },
    }),
    prisma.instructorSettlementBatch.count({ where }),
  ]);

  // Get instructor info separately to avoid N+1
  const instructorIds = [...new Set(batches.map(b => b.instructorId))];
  const instructors = await prisma.user.findMany({
    where: { userId: { in: instructorIds } },
    select: {
      userId: true,
      fullName: true,
      email: true,
      instructorProfile: {
        select: { bankName: true, bankAccountNumber: true, paypalEmail: true },
      },
    },
  });

  const instructorMap = new Map(instructors.map(i => [i.userId, i]));

  const batchesWithInstructor = batches.map(b => ({
    ...b,
    instructor: instructorMap.get(b.instructorId) || null,
    earningsCount: b._count.earnings,
  }));

  return {
    batches: batchesWithInstructor,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get settlement batch detail with earnings
 * 
 * @param {number} batchId - Settlement batch ID
 * @returns {Promise<Object>}
 */
async function getSettlementDetail(batchId) {
  const batch = await prisma.instructorSettlementBatch.findUnique({
    where: { batchId },
    include: {
      earnings: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!batch) {
    throw new Error('Settlement batch not found');
  }

  // Get instructor info
  const instructor = await prisma.user.findUnique({
    where: { userId: batch.instructorId },
    select: {
      userId: true,
      fullName: true,
      email: true,
      instructorProfile: true,
    },
  });

  return {
    ...batch,
    instructor,
    earningsCount: batch.earnings.length,
  };
}

/**
 * Mark settlement batch as paid
 * 
 * @param {number} batchId - Settlement batch ID
 * @returns {Promise<Object>}
 */
async function markAsPaid(batchId) {
  const batch = await prisma.instructorSettlementBatch.findUnique({
    where: { batchId },
  });

  if (!batch) {
    throw new Error('Settlement batch not found');
  }

  if (batch.status === 'paid') {
    throw new Error('Settlement batch is already marked as paid');
  }

  if (batch.status === 'canceled') {
    throw new Error('Cannot mark canceled settlement as paid');
  }

  const updated = await prisma.instructorSettlementBatch.update({
    where: { batchId },
    data: {
      status: 'paid',
      paidAt: new Date(),
    },
  });

  return updated;
}

/**
 * Cancel settlement batch (rollback)
 * This will unlink all earnings from the batch
 * 
 * @param {number} batchId - Settlement batch ID
 * @returns {Promise<Object>}
 */
async function cancelSettlement(batchId) {
  const batch = await prisma.instructorSettlementBatch.findUnique({
    where: { batchId },
  });

  if (!batch) {
    throw new Error('Settlement batch not found');
  }

  if (batch.status === 'paid') {
    throw new Error('Cannot cancel a paid settlement');
  }

  // Cancel batch and unlink earnings in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Unlink all earnings
    await tx.instructorEarning.updateMany({
      where: { settlementBatchId: batchId },
      data: { settlementBatchId: null },
    });

    // Update batch status
    const updated = await tx.instructorSettlementBatch.update({
      where: { batchId },
      data: { status: 'canceled' },
    });

    return updated;
  });

  return result;
}

/**
 * Get settlement statistics
 * 
 * @returns {Promise<Object>}
 */
async function getSettlementStats() {
  const [generated, paid, canceled, totalPaidAmount, pendingAmount] = await Promise.all([
    prisma.instructorSettlementBatch.count({ where: { status: 'generated' } }),
    prisma.instructorSettlementBatch.count({ where: { status: 'paid' } }),
    prisma.instructorSettlementBatch.count({ where: { status: 'canceled' } }),
    prisma.instructorSettlementBatch.aggregate({
      where: { status: 'paid' },
      _sum: { totalNet: true },
    }),
    prisma.instructorSettlementBatch.aggregate({
      where: { status: 'generated' },
      _sum: { totalNet: true },
    }),
  ]);

  return {
    counts: {
      generated,
      paid,
      canceled,
      total: generated + paid + canceled,
    },
    amounts: {
      totalPaid: totalPaidAmount._sum.totalNet || 0,
      pending: pendingAmount._sum.totalNet || 0,
    },
  };
}

/**
 * Export settlements to CSV format
 * 
 * @param {Object} filters - Filter options
 * @returns {Promise<string>} CSV content
 */
async function exportSettlementsCSV({ status = null, month = null } = {}) {
  const where = {};
  if (status) where.status = status;
  if (month) where.month = month;

  const batches = await prisma.instructorSettlementBatch.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  // Get instructor info
  const instructorIds = [...new Set(batches.map(b => b.instructorId))];
  const instructors = await prisma.user.findMany({
    where: { userId: { in: instructorIds } },
    select: {
      userId: true,
      fullName: true,
      email: true,
      instructorProfile: {
        select: { bankName: true, bankAccountNumber: true },
      },
    },
  });

  const instructorMap = new Map(instructors.map(i => [i.userId, i]));

  // Build CSV
  const headers = [
    'Batch ID',
    'Instructor ID',
    'Instructor Name',
    'Instructor Email',
    'Bank Name',
    'Bank Account',
    'Month',
    'Total Gross',
    'Platform Fee',
    'Total Net',
    'Status',
    'Paid At',
    'Created At',
  ];

  const rows = batches.map(b => {
    const instructor = instructorMap.get(b.instructorId);
    return [
      b.batchId,
      b.instructorId,
      instructor?.fullName || '',
      instructor?.email || '',
      instructor?.instructorProfile?.bankName || '',
      instructor?.instructorProfile?.bankAccountNumber || '',
      b.month,
      b.totalGross,
      b.totalPlatformFee,
      b.totalNet,
      b.status,
      b.paidAt ? b.paidAt.toISOString() : '',
      b.createdAt.toISOString(),
    ].map(v => `"${v}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

module.exports = {
  generateMonthlySettlement,
  generateSettlementForInstructor,
  getAllSettlements,
  getSettlementDetail,
  markAsPaid,
  cancelSettlement,
  getSettlementStats,
  exportSettlementsCSV,
};
