const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { isAdmin } = require('../middleware/auth');

// Get dashboard overview
router.get('/', isAdmin, async (req, res) => {
  try {
    const [totalOrders, totalProducts, totalCustomers] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments({ role: 'user' })
    ]);

    res.json({
      totalOrders,
      totalProducts,
      totalCustomers
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ message: 'Error fetching dashboard overview' });
  }
});

// Get dashboard statistics
router.get('/stats', isAdmin, async (req, res) => {
  try {
    const [totalOrders, totalProducts, totalCustomers] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments({ role: 'user' })
    ]);

    res.json({
      totalOrders,
      totalProducts,
      totalCustomers
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
});

// Get recent orders
router.get('/recent-orders', isAdmin, async (req, res) => {
  try {
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');

    res.json(recentOrders);
  } catch (error) {
    console.error('Recent orders error:', error);
    res.status(500).json({ message: 'Error fetching recent orders' });
  }
});

// Get low stock products
router.get('/low-stock-products', isAdmin, async (req, res) => {
  try {
    const lowStockProducts = await Product.find({ stock: { $lt: 10 } })
      .sort({ stock: 1 })
      .limit(5);

    res.json(lowStockProducts);
  } catch (error) {
    console.error('Low stock products error:', error);
    res.status(500).json({ message: 'Error fetching low stock products' });
  }
});

module.exports = router; 