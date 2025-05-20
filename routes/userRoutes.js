const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { sendEmail } = require('../utils/sendEmail');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const passport = require('passport');
const Newsletter = require('../models/Newsletter');
const Contact = require('../models/Contact');

router.use(express.json());

// Google OAuth Routes
router.get('/google', (req, res, next) => {
  console.log('Google auth route hit');
  console.log('Request headers:', req.headers);
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account',
    accessType: 'offline'
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  console.log('Google callback route hit');
  console.log('Callback query params:', req.query);
  passport.authenticate('google', { 
    failureRedirect: process.env.FRONTEND_URL + '/login',
    session: false 
  })(req, res, next);
}, async (req, res) => {
  try {
    console.log('Google callback success, user:', req.user);
    // Generate JWT token
    const token = jwt.sign(
      { userId: req.user._id },
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

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${token}`);
  } catch (error) {
    console.error('Google auth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get user profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (address) user.address = address;

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout user
router.post('/logout', (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.json({ message: 'Logged out successfully' });
});

// Request password reset
router.post('/request-reset', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email
    try {
      await sendEmail(
        user.email,
        'Password Reset Request',
        'passwordReset',
        {
          name: user.name,
          resetUrl: `${process.env.FRONTEND_URL}/reset-password/${resetToken}`
        }
      );
      res.json({ message: 'Password reset email sent' });
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      res.status(500).json({ error: 'Failed to send password reset email' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ emailVerificationToken: token });

    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test email route
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('Testing email configuration...');
    console.log('Environment variables check:');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not Set');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Not Set');
    console.log('FRONTEND_URL:', process.env.FRONTEND_URL ? 'Set' : 'Not Set');

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Send test email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <h1 style="color: #333; text-align: center;">Test Email</h1>
            <p style="color: #666; line-height: 1.6;">This is a test email to verify your email configuration.</p>
            <p style="color: #666; line-height: 1.6;">If you're receiving this email, your email configuration is working correctly!</p>
          </div>
        </div>
      `
    });

    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: error.message
    });
  }
});

// Upload avatar
router.post('/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      // Clean up the uploaded file if user not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete old avatar if exists
    if (user.avatar) {
      const oldAvatarPath = path.join(__dirname, '..', user.avatar.replace(/^\/uploads\//, ''));
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Update user's avatar URL with the full URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    user.avatar = avatarUrl;
    await user.save();

    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl: user.avatar
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    // If there's an error, try to delete the uploaded file
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    res.status(500).json({ message: error.message || 'Failed to upload avatar' });
  }
});

// Get all users (admin only)
router.get('/', protect, admin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Check authentication status
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Newsletter subscription
router.post('/newsletter/subscribe', async (req, res) => {
    try {
        console.log('Newsletter subscription request body:', req.body);
        
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            console.log('Invalid request body:', req.body);
            return res.status(400).json({ message: 'Invalid request body' });
        }

        const { email } = req.body;

        // Validate email
        if (!email) {
            console.log('Email is missing in request');
            return res.status(400).json({ message: 'Email is required' });
        }

        if (typeof email !== 'string' || !email.includes('@')) {
            console.log('Invalid email format:', email);
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Check if email already exists
        const existingSubscriber = await Newsletter.findOne({ email });
        if (existingSubscriber) {
            console.log('Email already subscribed:', email);
            return res.status(400).json({ message: 'Email already subscribed' });
        }

        // Create new newsletter subscription
        const newsletter = new Newsletter({
            email: email.toLowerCase().trim(),
            subscribedAt: new Date()
        });

        console.log('Saving newsletter subscription:', newsletter);
        await newsletter.save();

        // Send confirmation email
        try {
            console.log('Sending confirmation email to:', email);
            await sendEmail(
                email,
                'Welcome to Our Newsletter',
                'newsletterConfirmation',
                { email }
            );
            console.log('Confirmation email sent successfully');
        } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
            // Don't fail the subscription if email fails
        }

        res.status(201).json({ message: 'Successfully subscribed to newsletter' });
    } catch (error) {
        console.error('Newsletter subscription error:', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });
        res.status(500).json({ 
            message: 'Error subscribing to newsletter', 
            error: error.message 
        });
    }
});

// Contact form submission
router.post('/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        const contact = new Contact({
            name,
            email,
            subject,
            message,
            submittedAt: new Date()
        });
        await contact.save();

        // Send email notification to admin
        const adminEmail = process.env.EMAIL_USER; // Your admin email
        await sendEmail(
            adminEmail,
            'New Contact Form Submission',
            'contactForm',
            {
                name,
                email,
                subject,
                message
            }
        );

        // Send confirmation email to user
        await sendEmail(
            email,
            'Thank you for contacting us',
            'contactConfirmation',
            {
                name
            }
        );

        res.status(201).json({ message: 'Contact form submitted successfully' });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ message: 'Error submitting contact form', error: error.message });
    }
});

// Delete user (admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await user.remove();
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 