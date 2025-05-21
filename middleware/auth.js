const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const admin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('Access denied: User role is', req.user.role);
      return res.status(403).json({ message: 'Admin access required' });
    }

    console.log('Admin access granted for user:', req.user._id);
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = { protect, admin }; 