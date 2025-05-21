const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getAllOrders,
  getOrderStats,
  updateOrderStatus,
  getOrderDetails,
  deleteOrder
} = require('../controllers/adminOrderController');

// Apply authentication and admin middleware to all routes
router.use(protect);
router.use(admin);

// Get all orders with detailed information
router.get('/', getAllOrders);

// Get order statistics
router.get('/stats', getOrderStats);

// Get order details
router.get('/:orderId', getOrderDetails);

// Update order status
router.put('/:orderId/status', updateOrderStatus);

// Delete order
router.delete('/:orderId', deleteOrder);

module.exports = router; 