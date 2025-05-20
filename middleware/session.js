const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const UAParser = require('ua-parser-js');

const session = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.userId });

    if (!user) {
      throw new Error();
    }

    // Find active session
    const session = await Session.findOne({
      user: user._id,
      token,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      throw new Error('Session expired or invalid');
    }

    // Update last activity
    session.lastActivity = new Date();
    await session.save();

    // Check if token is about to expire (less than 1 hour remaining)
    const tokenExp = decoded.exp * 1000; // Convert to milliseconds
    const oneHour = 60 * 60 * 1000;
    
    if (tokenExp - Date.now() < oneHour) {
      // Generate new token
      const newToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Create new session
      const parser = new UAParser(req.headers['user-agent']);
      const deviceInfo = parser.getResult();
      
      const newSession = new Session({
        user: user._id,
        token: newToken,
        deviceInfo: {
          deviceType: deviceInfo.device.type || 'desktop',
          browser: deviceInfo.browser.name,
          os: deviceInfo.os.name,
          ipAddress: req.ip
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      await newSession.save();
      
      // Deactivate old session
      session.isActive = false;
      await session.save();
      
      // Set new token in response header
      res.setHeader('New-Token', newToken);
    }

    req.token = token;
    req.user = user;
    req.session = session;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// Get all active sessions for a user
const getUserSessions = async (userId) => {
  return Session.find({
    user: userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ lastActivity: -1 });
};

// Deactivate a specific session
const deactivateSession = async (userId, token) => {
  return Session.findOneAndUpdate(
    { user: userId, token },
    { isActive: false },
    { new: true }
  );
};

// Deactivate all sessions for a user
const deactivateAllSessions = async (userId) => {
  return Session.updateMany(
    { user: userId, isActive: true },
    { isActive: false }
  );
};

module.exports = {
  session,
  getUserSessions,
  deactivateSession,
  deactivateAllSessions
}; 