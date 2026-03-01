/**
 * Payroll Controller
 * Handles HTTP layer for payroll operations
 */

const payrollService = require('../../services/admin/payroll.service');

/**
 * GET /api/admin/payroll/summary?month=YYYY-MM
 */
async function getSummary(req, res, next) {
  try {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ error: 'month query parameter is required' });
    }
    const summary = await payrollService.getPayrollSummary(month);
    res.json({ month, summary });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/payroll/generate?month=YYYY-MM
 */
async function generatePayroll(req, res, next) {
  try {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ error: 'month query parameter is required' });
    }
    const result = await payrollService.generatePayroll(month);
    res.json({
      message: `Payroll generated for ${month}`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/payroll/batch/:batchId/mark-paid
 */
async function markPaid(req, res, next) {
  try {
    const { batchId } = req.params;
    const result = await payrollService.markBatchPaid(batchId);
    res.json({
      message: 'Batch marked as paid',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/payroll/batches?month=YYYY-MM
 */
async function getBatches(req, res, next) {
  try {
    const { month } = req.query;
    const batches = await payrollService.getBatches(month);
    res.json({ batches });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/payroll/export-summary?month=YYYY-MM
 */
async function exportSummary(req, res, next) {
  try {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ error: 'month query parameter is required' });
    }
    const buffer = await payrollService.exportSummary(month);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=payroll-summary-${month}.xlsx`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/payroll/export-detail?month=YYYY-MM&instructorId=xxx
 */
async function exportDetail(req, res, next) {
  try {
    const { month, instructorId } = req.query;
    if (!month || !instructorId) {
      return res.status(400).json({ error: 'month and instructorId query parameters are required' });
    }
    const buffer = await payrollService.exportDetail(month, instructorId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=payroll-detail-${month}-${instructorId}.xlsx`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary,
  generatePayroll,
  markPaid,
  getBatches,
  exportSummary,
  exportDetail,
};
