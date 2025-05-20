const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  storeName: {
    type: String,
    required: true
  },
  storeDescription: {
    type: String,
    default: ''
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP'],
    default: 'USD'
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: 0
  },
  freeShippingThreshold: {
    type: Number,
    default: 0,
    min: 0
  },
  contactEmail: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String,
    required: true
  },
  socialMedia: {
    facebook: {
      type: String,
      default: ''
    },
    instagram: {
      type: String,
      default: ''
    },
    twitter: {
      type: String,
      default: ''
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Store', storeSchema); 