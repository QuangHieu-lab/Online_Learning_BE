/**
 * Dashboard Controller
 * Handles admin dashboard statistics and charts
 */

const analyticsService = require('../../services/admin/analytics.service');

/**
 * GET /api/admin/dashboard/stats
 * Get overview statistics for admin dashboard
 */
const getOverviewStats = async (req, res) => {
  try {
    const stats = await analyticsService.getStatsSummary();
    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

/**
 * GET /api/admin/dashboard/charts/revenue
 * Get revenue chart data
 * Query params: startDate, endDate, groupBy (day|week|month)
 */
const getRevenueChart = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    // Default to last 30 days if not provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate 
      ? new Date(startDate) 
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (!['day', 'week', 'month'].includes(groupBy)) {
      return res.status(400).json({ error: 'groupBy must be day, week, or month' });
    }

    const data = await analyticsService.getRevenueByPeriod({
      startDate: start,
      endDate: end,
      groupBy,
    });

    res.json({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      groupBy,
      data,
    });
  } catch (error) {
    console.error('Revenue chart error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue chart data' });
  }
};

/**
 * GET /api/admin/dashboard/charts/users
 * Get user growth chart data
 * Query params: startDate, endDate, groupBy (day|week|month)
 */
const getUserGrowthChart = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate 
      ? new Date(startDate) 
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (!['day', 'week', 'month'].includes(groupBy)) {
      return res.status(400).json({ error: 'groupBy must be day, week, or month' });
    }

    const data = await analyticsService.getUserGrowthByPeriod({
      startDate: start,
      endDate: end,
      groupBy,
    });

    res.json({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      groupBy,
      data,
    });
  } catch (error) {
    console.error('User growth chart error:', error);
    res.status(500).json({ error: 'Failed to fetch user growth data' });
  }
};

/**
 * GET /api/admin/dashboard/charts/enrollments
 * Get enrollment chart data
 * Query params: startDate, endDate, groupBy (day|week|month)
 */
const getEnrollmentChart = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate 
      ? new Date(startDate) 
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (!['day', 'week', 'month'].includes(groupBy)) {
      return res.status(400).json({ error: 'groupBy must be day, week, or month' });
    }

    const data = await analyticsService.getEnrollmentsByPeriod({
      startDate: start,
      endDate: end,
      groupBy,
    });

    res.json({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      groupBy,
      data,
    });
  } catch (error) {
    console.error('Enrollment chart error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollment data' });
  }
};

/**
 * GET /api/admin/dashboard/top-courses
 * Get top courses by revenue or enrollments
 * Query params: sortBy (revenue|enrollments), limit
 */
const getTopCourses = async (req, res) => {
  try {
    const { sortBy = 'enrollments', limit = '10' } = req.query;
    const limitInt = parseInt(limit);

    if (!['revenue', 'enrollments'].includes(sortBy)) {
      return res.status(400).json({ error: 'sortBy must be revenue or enrollments' });
    }

    if (isNaN(limitInt) || limitInt < 1 || limitInt > 100) {
      return res.status(400).json({ error: 'limit must be between 1 and 100' });
    }

    const data = await analyticsService.getTopCourses({
      sortBy,
      limit: limitInt,
    });

    res.json({ sortBy, limit: limitInt, data });
  } catch (error) {
    console.error('Top courses error:', error);
    res.status(500).json({ error: 'Failed to fetch top courses' });
  }
};

/**
 * GET /api/admin/dashboard/recent-activity
 * Get recent activity (orders, enrollments, users)
 * Query params: limit
 */
const getRecentActivity = async (req, res) => {
  try {
    const { limit = '5' } = req.query;
    const limitInt = parseInt(limit);

    if (isNaN(limitInt) || limitInt < 1 || limitInt > 50) {
      return res.status(400).json({ error: 'limit must be between 1 and 50' });
    }

    const data = await analyticsService.getRecentActivity(limitInt);
    res.json(data);
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};

module.exports = {
  getOverviewStats,
  getRevenueChart,
  getUserGrowthChart,
  getEnrollmentChart,
  getTopCourses,
  getRecentActivity,
};
