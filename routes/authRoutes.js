const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');

console.log('=== Auth Routes Module Loaded ===');

// Test route
router.get('/test', (req, res) => {
  console.log('Test route hit');
  res.json({ message: 'Auth routes are working' });
});

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      console.log('Registration attempt with missing fields:', { name, email, hasPassword: !!password });
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format:', email);
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ 
        error: 'A user with this email already exists',
        code: 'EMAIL_EXISTS'
      });
    }

    // Create user with lowercase email and no googleId
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      googleId: undefined // Explicitly set to undefined to avoid null
    });

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    console.log('User registered successfully:', { userId: user._id, email: user.email });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      if (error.keyPattern.email) {
        return res.status(400).json({ 
          error: 'A user with this email already exists',
          code: 'EMAIL_EXISTS'
        });
      }
      if (error.keyPattern.googleId) {
        return res.status(400).json({ 
          error: 'An error occurred during registration. Please try again.',
          code: 'REGISTRATION_ERROR'
        });
      }
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    console.log('=== Login Request ===');
    console.log('Headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body:', req.body);
    
    // Check if request body exists
    if (!req.body) {
      console.log('No request body received');
      return res.status(400).json({ 
        message: 'Request body is required',
        error: 'NO_BODY'
      });
    }

    const { email, password } = req.body;
    
    // Detailed validation logging
    console.log('Validation:', {
      hasEmail: !!email,
      hasPassword: !!password,
      emailType: typeof email,
      passwordType: typeof password
    });

    // Validate required fields
    if (!email || !password) {
      console.log('Missing fields:', { 
        email: !!email, 
        password: !!password,
        emailValue: email,
        passwordLength: password ? password.length : 0
      });
      return res.status(400).json({ 
        message: 'Email and password are required',
        error: 'MISSING_FIELDS',
        details: {
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null
        }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format:', email);
      return res.status(400).json({ 
        message: 'Invalid email format',
        error: 'INVALID_EMAIL'
      });
    }

    // Check if user exists and explicitly select password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ 
        message: 'Invalid email or password',
        error: 'USER_NOT_FOUND'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Invalid password for user:', email);
      return res.status(400).json({ 
        message: 'Invalid email or password',
        error: 'INVALID_PASSWORD'
      });
    }

    console.log('User authenticated successfully:', { 
      email, 
      role: user.role,
      userId: user._id 
    });

    // Create token with role
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Remove password from user object before sending response
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.json({
      success: true,
      token,
      user: userResponse,
      redirectUrl: user.role === 'admin' ? '/admin/dashboard' : '/'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  try {
    console.log('Getting current user data for:', req.user._id);
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('User found:', { id: user._id, email: user.email, role: user.role });
    res.json(user);
  } catch (error) {
    console.error('Error getting user data:', error);
    res.status(500).json({ message: 'Error getting user data' });
  }
});

// Google authentication route
router.post('/google', async (req, res) => {
  try {
    const { access_token, user_info } = req.body;

    if (!access_token || !user_info) {
      return res.status(400).json({ message: 'Missing required information' });
    }

    const { sub: googleId, email, name, picture } = user_info;

    if (!email || !googleId) {
      return res.status(400).json({ message: 'Invalid user information from Google' });
    }

    // Check if user exists
    let user = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { googleId }
      ]
    });

    if (!user) {
      // Create new user if doesn't exist
      user = await User.create({
        email: email.toLowerCase(),
        name,
        googleId,
        profilePicture: picture,
        isActive: true,
        role: 'user', // Default role
        isEmailVerified: true // Google emails are verified
      });
    } else {
      // Update user info if needed
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (!user.profilePicture) {
        user.profilePicture = picture;
      }
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
      }
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // Send response
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ 
      message: 'Google authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Log all registered auth routes
console.log('=== Auth Routes ===');
router.stack.forEach(function(r){
    if (r.route && r.route.path){
        console.log('Auth route:', r.route.stack[0].method.toUpperCase(), r.route.path);
    }
});

module.exports = router; 