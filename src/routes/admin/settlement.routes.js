/**
 * Settlement Routes
 * Admin endpoints for instructor earnings and monthly settlements
 * 
 * All routes require admin authentication (handled by parent router)
 * IMPORTANT: This is an ADDITIVE module - does not modify existing code
 */

const express = require('express');
const router = express.Router();
const settlementController = require('../../controllers/admin/settlement.controller');

/**
 * @swagger
 * tags:
 *   name: Admin Settlement
 *   description: Admin instructor earnings and settlement management
 */

// ============================================================================
// EARNINGS ROUTES
// ============================================================================

/**
 * @swagger
 * /api/admin/settlement/earnings/sync:
 *   post:
 *     summary: Sync earnings from successful transactions
 *     tags: [Admin Settlement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               limit:
 *                 type: integer
 *                 default: 100
 *               fromDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Sync completed
 */
router.post('/earnings/sync', settlementController.syncEarnings);

/**
 * @swagger
 * /api/admin/settlement/earnings/create-from-transaction:
 *   post:
 *     summary: Create earnings from a specific transaction
 *     tags: [Admin Settlement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *             properties:
 *               transactionId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Earnings created
 */
router.post('/earnings/create-from-transaction', settlementController.createEarningsFromTransaction);

/**
 * @swagger
 * /api/admin/settlement/earnings/pending:
 *   get:
 *     summary: Get unsettled earnings grouped by instructor and month
 *     tags: [Admin Settlement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending earnings summary
 */
router.get('/earnings/pending', settlementController.getPendingEarnings);

/**
 * @swagger
 * /api/admin/settlement/earnings/{instructorId}:
 *   get:
 *     summary: Get earnings for a specific instructor
 *     tags: [Admin Settlement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: instructorId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *       - name: month
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by month (YYYY-MM)
 *       - name: settled
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Filter by settlement status
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Instructor earnings
 */
router.get('/earnings/:instructorId', settlementController.getInstructorEarnings);

// ============================================================================
// SETTLEMENT ROUTES
// ============================================================================

/**
 * @swagger
 * /api/admin/settlement/stats:
 *   get:
 *     summary: Get settlement statistics
 *     tags: [Admin Settlement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settlement stats
 */
router.get('/stats', settlementController.getSettlementStats);

/**
 * @swagger
 * /api/admin/settlement/generate:
 *   post:
 *     summary: Generate monthly settlement batches
 *     tags: [Admin Settlement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - month
 *             properties:
 *               month:
 *                 type: string
 *                 example: "2026-03"
 *                 description: Month in YYYY-MM format
 *     responses:
 *       201:
 *         description: Settlements generated
 *       400:
 *         description: Invalid request
 */
router.post('/generate', settlementController.generateSettlement);

/**
 * @swagger
 * /api/admin/settlement/batches:
 *   get:
 *     summary: List all settlement batches
 *     tags: [Admin Settlement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [generated, paid, canceled]
 *       - name: month
 *         in: query
 *         schema:
 *           type: string
 *       - name: instructorId
 *         in: query
 *         schema:
 *           type: integer
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of settlement batches
 */
router.get('/batches', settlementController.listSettlements);

/**
 * @swagger
 * /api/admin/settlement/batches/{batchId}:
 *   get:
 *     summary: Get settlement batch detail
 *     tags: [Admin Settlement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: batchId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Settlement batch detail
 *       404:
 *         description: Not found
 */
router.get('/batches/:batchId', settlementController.getSettlementDetail);

/**
 * @swagger
 * /api/admin/settlement/batches/{batchId}/paid:
 *   patch:
 *     summary: Mark settlement as paid
 *     tags: [Admin Settlement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: batchId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Settlement marked as paid
 */
router.patch('/batches/:batchId/paid', settlementController.markSettlementPaid);

/**
 * @swagger
 * /api/admin/settlement/batches/{batchId}/cancel:
 *   patch:
 *     summary: Cancel settlement batch
 *     tags: [Admin Settlement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: batchId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Settlement canceled
 */
router.patch('/batches/:batchId/cancel', settlementController.cancelSettlement);

/**
 * @swagger
 * /api/admin/settlement/export:
 *   get:
 *     summary: Export settlements to CSV
 *     tags: [Admin Settlement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *       - name: month
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CSV file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/export', settlementController.exportSettlements);

module.exports = router;
