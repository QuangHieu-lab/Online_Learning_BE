/**
 * Admin Routes Aggregator
 * Mounts all admin sub-routes with common middleware
 * 
 * All routes under /api/admin require:
 * - Authentication (valid JWT token)
 * - Admin role
 */

const { Router } = require('express');
const { authenticate, requireAdmin } = require('../../middleware/auth.middleware');

// Import sub-routes
const dashboardRoutes = require('./dashboard.routes');
const revenueRoutes = require('./revenue.routes');
const settlementRoutes = require('./settlement.routes');
const payrollRoutes = require('./payroll.routes');

const router = Router();

// ============================================================================
// GLOBAL MIDDLEWARE - Applied to ALL admin routes
// ============================================================================
router.use(authenticate);
router.use(requireAdmin);

// ============================================================================
// MOUNT SUB-ROUTES
// ============================================================================

// Dashboard: /api/admin/dashboard/*
router.use('/dashboard', dashboardRoutes);

// Revenue: /api/admin/revenue/*
router.use('/revenue', revenueRoutes);

// Settlement (Phase 2): /api/admin/settlement/*
router.use('/settlement', settlementRoutes);

// Payroll (Phase 3): /api/admin/payroll/*
router.use('/payroll', payrollRoutes);

// ============================================================================
// PHASE 2 (Future) - Uncomment when implemented
// ============================================================================
// const couponRoutes = require('./coupon.routes');
// const payoutRoutes = require('./payout.routes');
// router.use('/coupons', couponRoutes);
// router.use('/payouts', payoutRoutes);

// ============================================================================
// PHASE 3 (Future) - Uncomment when implemented
// ============================================================================
// const moderationRoutes = require('./moderation.routes');
// const notificationRoutes = require('./notification.routes');
// router.use('/moderation', moderationRoutes);
// router.use('/notifications', notificationRoutes);

module.exports = router;
