/**
 * Dashboard Routes
 * Admin dashboard statistics and charts
 */

const { Router } = require('express');
const {
  getOverviewStats,
  getRevenueChart,
  getUserGrowthChart,
  getEnrollmentChart,
  getTopCourses,
  getRecentActivity,
} = require('../../controllers/admin/dashboard.controller');

const router = Router();

// GET /api/admin/dashboard/stats - Overview statistics
router.get('/stats', getOverviewStats);

// GET /api/admin/dashboard/charts/revenue - Revenue chart data
router.get('/charts/revenue', getRevenueChart);

// GET /api/admin/dashboard/charts/users - User growth chart
router.get('/charts/users', getUserGrowthChart);

// GET /api/admin/dashboard/charts/enrollments - Enrollment chart
router.get('/charts/enrollments', getEnrollmentChart);

// GET /api/admin/dashboard/top-courses - Top courses by revenue/enrollments
router.get('/top-courses', getTopCourses);

// GET /api/admin/dashboard/recent-activity - Recent activity feed
router.get('/recent-activity', getRecentActivity);

module.exports = router;
