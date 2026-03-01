/**
 * Admin Controllers - Aggregator
 * Export all admin-specific controllers
 */

const dashboardController = require('./dashboard.controller');
const revenueController = require('./revenue.controller');

module.exports = {
  dashboardController,
  revenueController,
};
