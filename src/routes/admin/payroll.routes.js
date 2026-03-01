/**
 * Payroll Routes
 * Admin endpoints for monthly instructor payroll
 * 
 * All routes require admin authentication (handled by parent router)
 */

const express = require('express');
const router = express.Router();
const payrollController = require('../../controllers/admin/payroll.controller');

/**
 * @swagger
 * tags:
 *   name: Admin Payroll
 *   description: Monthly instructor payroll management
 */

/**
 * @swagger
 * /api/admin/payroll/summary:
 *   get:
 *     summary: Get payroll summary for a month
 *     tags: [Admin Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         required: true
 *         description: Month in YYYY-MM format
 *     responses:
 *       200:
 *         description: Payroll summary grouped by instructor
 */
router.get('/summary', payrollController.getSummary);

/**
 * @swagger
 * /api/admin/payroll/generate:
 *   post:
 *     summary: Generate monthly payroll batches
 *     tags: [Admin Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         required: true
 *         description: Month in YYYY-MM format
 *     responses:
 *       200:
 *         description: Payroll generated successfully
 *       409:
 *         description: Payroll already generated for this month
 */
router.post('/generate', payrollController.generatePayroll);

/**
 * @swagger
 * /api/admin/payroll/batches:
 *   get:
 *     summary: Get all payroll batches
 *     tags: [Admin Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Optional month filter in YYYY-MM format
 *     responses:
 *       200:
 *         description: List of payroll batches
 */
router.get('/batches', payrollController.getBatches);

/**
 * @swagger
 * /api/admin/payroll/batch/{batchId}/mark-paid:
 *   post:
 *     summary: Mark a payroll batch as paid
 *     tags: [Admin Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Batch ID
 *     responses:
 *       200:
 *         description: Batch marked as paid
 *       404:
 *         description: Batch not found
 *       409:
 *         description: Batch already paid
 */
router.post('/batch/:batchId/mark-paid', payrollController.markPaid);

/**
 * @swagger
 * /api/admin/payroll/export-summary:
 *   get:
 *     summary: Export payroll summary as Excel
 *     tags: [Admin Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         required: true
 *         description: Month in YYYY-MM format
 *     responses:
 *       200:
 *         description: Excel file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export-summary', payrollController.exportSummary);

/**
 * @swagger
 * /api/admin/payroll/export-detail:
 *   get:
 *     summary: Export payroll detail for an instructor
 *     tags: [Admin Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         required: true
 *         description: Month in YYYY-MM format
 *       - in: query
 *         name: instructorId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Instructor user ID
 *     responses:
 *       200:
 *         description: Excel file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export-detail', payrollController.exportDetail);

module.exports = router;
