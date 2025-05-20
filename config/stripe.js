const dotenv = require('dotenv');
const stripe = require('stripe');

// Load environment variables
dotenv.config();

// Check if Stripe secret key is available
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Stripe secret key is not configured. Please add STRIPE_SECRET_KEY to your .env file');
  process.exit(1);
}

// Initialize Stripe with API key
const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' // Use the latest API version
});

module.exports = stripeInstance; 