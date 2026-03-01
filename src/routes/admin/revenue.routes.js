/**
 * Revenue Routes
 * Admin revenue management: orders, transactions
 */

const { Router } = require('express');
const {
  getAllOrders,
  getOrderDetail,
  getAllTransactions,
  getRevenueSummary,
  exportRevenue,
} = require('../../controllers/admin/revenue.controller');

const router = Router();

// GET /api/admin/revenue/summary - Revenue summary statistics
router.get('/summary', getRevenueSummary);

// GET /api/admin/revenue/export - Export revenue data as CSV
router.get('/export', exportRevenue);

// GET /api/admin/revenue/orders - List all orders
router.get('/orders', getAllOrders);

// GET /api/admin/revenue/orders/:orderId - Order detail
router.get('/orders/:orderId', getOrderDetail);

// GET /api/admin/revenue/transactions - List all transactions
router.get('/transactions', getAllTransactions);

module.exports = router;
