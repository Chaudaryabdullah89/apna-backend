const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Store = require('../models/Store');
const Settings = require('../models/Settings');

// Get admin settings
router.get('/settings', protect, admin, async (req, res) => {
  try {
    console.log('Fetching admin settings for user:', req.user._id);
    
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      console.error('User not found:', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }

    // Create default store if it doesn't exist
    let store = await Store.findOne({ user: req.user._id });
    if (!store) {
      console.log('Creating default store for user:', req.user._id);
      store = new Store({
        user: req.user._id,
        storeName: `${user.name}'s Store`,
        currency: 'USD',
        taxRate: 0,
        shippingCost: 0,
        freeShippingThreshold: 0,
        socialMedia: {
          facebook: '',
          instagram: '',
          twitter: ''
        }
      });
      await store.save();
    }

    console.log('Successfully fetched settings for user:', req.user._id);
    res.json({
      profile: {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address?.street || '',
        city: user.city || '',
        state: user.state || '',
        zipCode: user.zipCode || '',
        country: user.country || ''
      },
      store: store
    });
  } catch (error) {
    console.error('Error in /settings route:', error);
    res.status(500).json({ 
      message: 'Error fetching settings',
      error: error.message 
    });
  }
});

// Update profile settings
router.put('/settings/profile', protect, admin, async (req, res) => {
  try {
    const { name, email, phone, address, city, state, zipCode, country } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    user.name = name;
    user.email = email;
    user.phone = phone;
    user.address = address;
    user.city = city;
    user.state = state;
    user.zipCode = zipCode;
    user.country = country;

    await user.save();

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update store settings
router.put('/settings/store', protect, admin, async (req, res) => {
  try {
    const {
      storeName,
      storeDescription,
      currency,
      taxRate,
      shippingCost,
      freeShippingThreshold,
      contactEmail,
      contactPhone,
      socialMedia
    } = req.body;

    let store = await Store.findOne({ user: req.user._id });

    if (store) {
      // Update existing store
      store.storeName = storeName;
      store.storeDescription = storeDescription;
      store.currency = currency;
      store.taxRate = taxRate;
      store.shippingCost = shippingCost;
      store.freeShippingThreshold = freeShippingThreshold;
      store.contactEmail = contactEmail;
      store.contactPhone = contactPhone;
      store.socialMedia = socialMedia;
    } else {
      // Create new store
      store = new Store({
        user: req.user._id,
        storeName,
        storeDescription,
        currency,
        taxRate,
        shippingCost,
        freeShippingThreshold,
        contactEmail,
        contactPhone,
        socialMedia
      });
    }

    await store.save();
    res.json({ message: 'Store settings updated successfully' });
  } catch (error) {
    console.error('Error updating store settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update security settings (password)
router.put('/settings/security', protect, admin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all settings
router.get('/settings', protect, admin, async (req, res) => {
  try {
    console.log('Fetching settings for admin user:', req.user._id);
    
    let settings = await Settings.findOne();
    
    if (!settings) {
      console.log('No settings found, creating default settings');
      // Create default settings if none exist
      settings = await Settings.create({
        siteName: 'My Blog',
        siteDescription: 'Welcome to my blog',
        contactEmail: '',
        socialMedia: {
          facebook: '',
          twitter: '',
          instagram: '',
          linkedin: ''
        },
        blogSettings: {
          postsPerPage: 10,
          allowComments: true,
          requireApproval: true,
          allowGuestComments: false
        },
        emailSettings: {
          sendNotifications: true,
          notifyOnNewComment: true,
          notifyOnNewBlog: true
        },
        maintenanceMode: false
      });
    }
    
    console.log('Successfully fetched settings');
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// Update settings
router.put('/settings', protect, admin, async (req, res) => {
  try {
    console.log('Updating settings for admin user:', req.user._id);
    
    let settings = await Settings.findOne();
    
    if (!settings) {
      console.log('No settings found, creating new settings');
      settings = new Settings(req.body);
    } else {
      console.log('Updating existing settings');
      Object.assign(settings, req.body);
    }

    await settings.save();
    console.log('Settings updated successfully');
    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
});

module.exports = router; 