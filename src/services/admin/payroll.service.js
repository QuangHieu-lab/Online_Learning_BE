/**
 * Payroll Service
 * Handles monthly instructor payroll operations
 * 
 * IMPORTANT: Uses prisma.$transaction for all write operations
 * All money values use Prisma.Decimal
 */

const prisma = require('../../utils/prisma');
const { Prisma } = require('@prisma/client');
const ExcelJS = require('exceljs');

/**
 * Get payroll summary for a specific month
 * Groups unsettled earnings by instructor
 * 
 * @param {string} month - Format: YYYY-MM
 * @returns {Promise<Array>} Summary per instructor
 */
async function getPayrollSummary(month) {
  // Validate month format
  if (!/^\d{4}-\d{2}$/.test(month)) {
    const err = new Error('Invalid month format. Use YYYY-MM');
    err.status = 400;
    throw err;
  }

  // Aggregate unsettled earnings grouped by instructor
  const earnings = await prisma.instructorEarning.groupBy({
    by: ['instructorId'],
    where: {
      month: month,
      status: 'unsettled',
    },
    _sum: {
      grossAmount: true,
      platformFeeAmount: true,
      netAmount: true,
    },
    _count: {
      earningId: true,
    },
  });

  if (earnings.length === 0) {
    return [];
  }

  // Fetch instructor names
  const instructorIds = earnings.map((e) => e.instructorId);
  const instructors = await prisma.user.findMany({
    where: { userId: { in: instructorIds } },
    select: { userId: true, fullName: true, email: true },
  });

  const instructorMap = new Map(instructors.map((i) => [i.userId, i]));

  return earnings.map((e) => {
    const instructor = instructorMap.get(e.instructorId);
    return {
      instructorId: e.instructorId,
      instructorName: instructor?.fullName || 'Unknown',
      instructorEmail: instructor?.email || '',
      totalGrossAmount: e._sum.grossAmount,
      totalPlatformFee: e._sum.platformFeeAmount,
      totalNetAmount: e._sum.netAmount,
      earningCount: e._count.earningId,
    };
  });
}

/**
 * Generate monthly payroll batches for all instructors
 * Creates InstructorSettlementBatch and updates earnings
 * 
 * @param {string} month - Format: YYYY-MM
 * @returns {Promise<{batchesCreated: number, earningsProcessed: number}>}
 */
async function generatePayroll(month) {
  // Validate month format
  if (!/^\d{4}-\d{2}$/.test(month)) {
    const err = new Error('Invalid month format. Use YYYY-MM');
    err.status = 400;
    throw err;
  }

  // Check if payroll already exists for this month
  const existingBatches = await prisma.instructorSettlementBatch.findFirst({
    where: { month: month },
  });

  if (existingBatches) {
    const err = new Error(`Payroll already generated for ${month}`);
    err.status = 409;
    throw err;
  }

  // Get all unsettled earnings for this month grouped by instructor
  const summary = await getPayrollSummary(month);

  if (summary.length === 0) {
    return { batchesCreated: 0, earningsProcessed: 0 };
  }

  let batchesCreated = 0;
  let earningsProcessed = 0;

  // Process all instructors in a single transaction
  await prisma.$transaction(async (tx) => {
    for (const instructorSummary of summary) {
      // Create settlement batch
      const batch = await tx.instructorSettlementBatch.create({
        data: {
          instructorId: instructorSummary.instructorId,
          month: month,
          totalGross: new Prisma.Decimal(instructorSummary.totalGrossAmount.toString()),
          totalPlatformFee: new Prisma.Decimal(instructorSummary.totalPlatformFee.toString()),
          totalNet: new Prisma.Decimal(instructorSummary.totalNetAmount.toString()),
          status: 'generated',
        },
      });

      // Update all earnings for this instructor+month
      const updateResult = await tx.instructorEarning.updateMany({
        where: {
          instructorId: instructorSummary.instructorId,
          month: month,
          status: 'unsettled',
        },
        data: {
          settlementBatchId: batch.batchId,
          status: 'batched',
        },
      });

      batchesCreated++;
      earningsProcessed += updateResult.count;
    }
  });

  return { batchesCreated, earningsProcessed };
}

/**
 * Mark a batch as paid and update all related earnings to settled
 * 
 * @param {number} batchId - Batch ID
 * @returns {Promise<{batch: Object, earningsUpdated: number}>}
 */
async function markBatchPaid(batchId) {
  const batch = await prisma.instructorSettlementBatch.findUnique({
    where: { batchId: parseInt(batchId, 10) },
  });

  if (!batch) {
    const err = new Error('Batch not found');
    err.status = 404;
    throw err;
  }

  if (batch.status === 'paid') {
    const err = new Error('Batch already marked as paid');
    err.status = 409;
    throw err;
  }

  let earningsUpdated = 0;

  await prisma.$transaction(async (tx) => {
    // Update batch status
    await tx.instructorSettlementBatch.update({
      where: { batchId: batch.batchId },
      data: {
        status: 'paid',
        paidAt: new Date(),
      },
    });

    // Update all related earnings
    const result = await tx.instructorEarning.updateMany({
      where: { settlementBatchId: batch.batchId },
      data: { status: 'settled' },
    });

    earningsUpdated = result.count;
  });

  const updatedBatch = await prisma.instructorSettlementBatch.findUnique({
    where: { batchId: batch.batchId },
  });

  return { batch: updatedBatch, earningsUpdated };
}

/**
 * Get all batches for a month
 * 
 * @param {string} month - Format: YYYY-MM (optional)
 * @returns {Promise<Array>}
 */
async function getBatches(month) {
  const where = {};
  if (month) {
    where.month = month;
  }

  const batches = await prisma.instructorSettlementBatch.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { earnings: true },
      },
    },
  });

  // Fetch instructor names
  const instructorIds = [...new Set(batches.map((b) => b.instructorId))];
  const instructors = await prisma.user.findMany({
    where: { userId: { in: instructorIds } },
    select: { userId: true, fullName: true },
  });
  const instructorMap = new Map(instructors.map((i) => [i.userId, i.fullName]));

  return batches.map((b) => ({
    batchId: b.batchId,
    instructorId: b.instructorId,
    instructorName: instructorMap.get(b.instructorId) || 'Unknown',
    month: b.month,
    totalGross: b.totalGross,
    totalPlatformFee: b.totalPlatformFee,
    totalNet: b.totalNet,
    status: b.status,
    paidAt: b.paidAt,
    createdAt: b.createdAt,
    earningCount: b._count.earnings,
  }));
}

/**
 * Export payroll summary as Excel
 * 
 * @param {string} month - Format: YYYY-MM
 * @returns {Promise<Buffer>} Excel file buffer
 */
async function exportSummary(month) {
  const batches = await getBatches(month);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Payroll Summary');

  sheet.columns = [
    { header: 'Instructor Name', key: 'instructorName', width: 30 },
    { header: 'Gross Revenue', key: 'totalGross', width: 18 },
    { header: 'Platform Fee', key: 'totalPlatformFee', width: 18 },
    { header: 'Net Amount', key: 'totalNet', width: 18 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Paid At', key: 'paidAt', width: 20 },
  ];

  for (const batch of batches) {
    sheet.addRow({
      instructorName: batch.instructorName,
      totalGross: parseFloat(batch.totalGross),
      totalPlatformFee: parseFloat(batch.totalPlatformFee),
      totalNet: parseFloat(batch.totalNet),
      status: batch.status,
      paidAt: batch.paidAt ? batch.paidAt.toISOString() : '',
    });
  }

  return await workbook.xlsx.writeBuffer();
}

/**
 * Export payroll detail for an instructor
 * 
 * @param {string} month - Format: YYYY-MM
 * @param {number} instructorId - Instructor user ID
 * @returns {Promise<Buffer>} Excel file buffer
 */
async function exportDetail(month, instructorId) {
  const earnings = await prisma.instructorEarning.findMany({
    where: {
      month: month,
      instructorId: parseInt(instructorId, 10),
    },
    include: {
      settlementBatch: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch order details with course and user info
  const orderDetailIds = earnings.map((e) => e.orderDetailId);
  const orderDetails = await prisma.orderDetail.findMany({
    where: { detailId: { in: orderDetailIds } },
    include: {
      course: { select: { title: true } },
      order: {
        include: {
          user: { select: { fullName: true } },
        },
      },
    },
  });

  const detailMap = new Map(orderDetails.map((d) => [d.detailId, d]));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Payroll Detail');

  sheet.columns = [
    { header: 'Course Name', key: 'courseName', width: 40 },
    { header: 'Order ID', key: 'orderId', width: 12 },
    { header: 'Student', key: 'studentName', width: 25 },
    { header: 'Gross', key: 'gross', width: 15 },
    { header: 'Platform Fee', key: 'fee', width: 15 },
    { header: 'Net', key: 'net', width: 15 },
    { header: 'Transaction Date', key: 'date', width: 20 },
  ];

  for (const earning of earnings) {
    const detail = detailMap.get(earning.orderDetailId);
    sheet.addRow({
      courseName: detail?.course?.title || 'Unknown',
      orderId: detail?.orderId || '',
      studentName: detail?.order?.user?.fullName || 'Unknown',
      gross: parseFloat(earning.grossAmount),
      fee: parseFloat(earning.platformFeeAmount),
      net: parseFloat(earning.netAmount),
      date: earning.createdAt.toISOString(),
    });
  }

  return await workbook.xlsx.writeBuffer();
}

module.exports = {
  getPayrollSummary,
  generatePayroll,
  markBatchPaid,
  getBatches,
  exportSummary,
  exportDetail,
};
