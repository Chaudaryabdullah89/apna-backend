const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  siteName: {
    type: String,
    required: true,
    default: 'My Blog'
  },
  siteDescription: {
    type: String,
    required: true,
    default: 'Welcome to my blog'
  },
  contactEmail: {
    type: String,
    default: ''
  },
  socialMedia: {
    facebook: {
      type: String,
      default: ''
    },
    twitter: {
      type: String,
      default: ''
    },
    instagram: {
      type: String,
      default: ''
    },
    linkedin: {
      type: String,
      default: ''
    }
  },
  blogSettings: {
    postsPerPage: {
      type: Number,
      default: 10,
      min: 1,
      max: 50
    },
    allowComments: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: true
    },
    allowGuestComments: {
      type: Boolean,
      default: false
    }
  },
  emailSettings: {
    sendNotifications: {
      type: Boolean,
      default: true
    },
    notifyOnNewComment: {
      type: Boolean,
      default: true
    },
    notifyOnNewBlog: {
      type: Boolean,
      default: true
    }
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema); 