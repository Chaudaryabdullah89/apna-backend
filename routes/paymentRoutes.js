const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { protect } = require('../middleware/auth');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create a payment intent
router.post('/create-intent', protect, async (req, res) => {
  try {
    const { amount } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 