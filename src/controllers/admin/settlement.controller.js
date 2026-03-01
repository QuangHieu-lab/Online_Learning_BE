/**
 * Settlement Controller
 * Handles admin settlement and earnings endpoints
 * 
 * IMPORTANT: This is an ADDITIVE module - does not modify existing code
 */

const earningService = require('../../services/admin/earning.service');
const settlementService = require('../../services/admin/settlement.service');

// ============================================================================
// EARNINGS ENDPOINTS
// ============================================================================

/**
 * POST /api/admin/settlement/earnings/sync
 * Sync earnings from successful transactions
 */
async function syncEarnings(req, res) {
  try {
    const { limit, fromDate } = req.body;
    
    const result = await earningService.syncFromSuccessfulTransactions({
      limit: limit ? parseInt(limit) : 100,
      fromDate: fromDate ? new Date(fromDate) : null,
    });

    res.json({
      success: true,
      message: `Synced ${result.processed} transactions, created ${result.totalCreated} earnings`,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/admin/settlement/earnings/create-from-transaction
 * Create earnings from a specific transaction (for testing/manual sync)
 */
async function createEarningsFromTransaction(req, res) {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'transactionId is required',
      });
    }

    const result = await earningService.createFromTransaction(parseInt(transactionId));

    res.status(201).json({
      success: true,
      message: `Created ${result.created} earnings, skipped ${result.skipped}`,
      data: result,
    });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/admin/settlement/earnings/pending
 * Get unsettled earnings summary grouped by instructor and month
 */
async function getPendingEarnings(req, res) {
  try {
    const data = await earningService.getUnsettledEarningsSummary();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/admin/settlement/earnings/:instructorId
 * Get earnings for a specific instructor
 */
async function getInstructorEarnings(req, res) {
  try {
    const { instructorId } = req.params;
    const { month, settled, page, limit } = req.query;

    const data = await earningService.getInstructorEarnings(parseInt(instructorId), {
      month,
      settled: settled === 'true' ? true : settled === 'false' ? false : null,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ============================================================================
// SETTLEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/settlement/stats
 * Get settlement statistics
 */
async function getSettlementStats(req, res) {
  try {
    const stats = await settlementService.getSettlementStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/admin/settlement/generate
 * Generate monthly settlement batches
 */
async function generateSettlement(req, res) {
  try {
    const { month } = req.body;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'month is required (format: YYYY-MM)',
      });
    }

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Use YYYY-MM',
      });
    }

    const result = await settlementService.generateMonthlySettlement(month);

    res.status(201).json({
      success: true,
      message: `Generated ${result.summary.totalBatches} settlement batches for ${month}`,
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/admin/settlement/batches
 * List all settlement batches with filters
 */
async function listSettlements(req, res) {
  try {
    const { status, month, instructorId, page, limit } = req.query;

    const data = await settlementService.getAllSettlements({
      status,
      month,
      instructorId: instructorId ? parseInt(instructorId) : null,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/admin/settlement/batches/:batchId
 * Get settlement batch detail with earnings
 */
async function getSettlementDetail(req, res) {
  try {
    const { batchId } = req.params;
    const data = await settlementService.getSettlementDetail(parseInt(batchId));
    res.json({ success: true, data });
  } catch (error) {
    const status = error.message === 'Settlement batch not found' ? 404 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
}

/**
 * PATCH /api/admin/settlement/batches/:batchId/paid
 * Mark settlement batch as paid
 */
async function markSettlementPaid(req, res) {
  try {
    const { batchId } = req.params;
    const data = await settlementService.markAsPaid(parseInt(batchId));

    res.json({
      success: true,
      message: 'Settlement marked as paid',
      data,
    });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
}

/**
 * PATCH /api/admin/settlement/batches/:batchId/cancel
 * Cancel settlement batch
 */
async function cancelSettlement(req, res) {
  try {
    const { batchId } = req.params;
    const data = await settlementService.cancelSettlement(parseInt(batchId));

    res.json({
      success: true,
      message: 'Settlement canceled and earnings unlinked',
      data,
    });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/admin/settlement/export
 * Export settlements to CSV
 */
async function exportSettlements(req, res) {
  try {
    const { status, month } = req.query;
    const csv = await settlementService.exportSettlementsCSV({ status, month });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=settlements-${month || 'all'}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  // Earnings
  syncEarnings,
  createEarningsFromTransaction,
  getPendingEarnings,
  getInstructorEarnings,
  // Settlements
  getSettlementStats,
  generateSettlement,
  listSettlements,
  getSettlementDetail,
  markSettlementPaid,
  cancelSettlement,
  exportSettlements,
};
