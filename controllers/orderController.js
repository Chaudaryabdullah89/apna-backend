const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product'); // Assuming you have a Product model
const Stripe = require('stripe');
const { sendEmail } = require('../utils/sendEmail');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create a new order and process payment
const createOrder = async (req, res) => {
  try {
    const { 
      userId, 
      items, 
      shippingAddress, 
      totalAmount,
      customerName,
      customerEmail,
      paymentMethod,
      shippingPrice,
      taxPrice
    } = req.body;

    // Basic validation
    if (!items || items.length === 0 || !shippingAddress || !totalAmount || !customerName || !customerEmail) {
      return res.status(400).json({ message: 'Missing required order details.' });
    }

    // Get user details if userId is provided
    let user = null;
    if (userId) {
      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
    }

    // Create a new order
    const order = new Order({
      user: userId || null,
      customerName,
      customerEmail,
      items,
      shippingAddress,
      totalAmount,
      shippingPrice,
      taxPrice,
      paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'processing'
    });

    // Save the order to the database temporarily (status is pending)
    await order.save();

    // Create a Stripe Payment Intent if payment method is card
    if (paymentMethod === 'card') {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Amount in cents
        currency: 'usd',
        metadata: { orderId: order._id.toString() },
      });

      // Update order with payment intent ID
      order.paymentIntentId = paymentIntent.id;
      await order.save();

      // Send order confirmation email
      await sendEmail(
        customerEmail,
        'Order Confirmation',
        'orderConfirmation',
        {
          name: customerName,
          orderNumber: order._id.toString().slice(-6),
          orderDate: new Date().toLocaleDateString(),
          totalAmount: totalAmount.toFixed(2),
          paymentMethod: 'Credit Card',
          shippingMethod: 'Standard Shipping',
          estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          subtotal: totalAmount - shippingPrice - taxPrice,
          shippingCost: shippingPrice,
          tax: taxPrice,
          totalAmount: totalAmount,
          shippingAddress: shippingAddress,
          trackingUrl: `${process.env.FRONTEND_URL}/order/${order._id}`
        }
      );

      res.status(201).json({ 
        clientSecret: paymentIntent.client_secret, 
        orderId: order._id 
      });
    } else {
      // For cash on delivery, just send confirmation email
      await sendEmail(
        customerEmail,
        'Order Confirmation',
        'orderConfirmation',
        {
          name: customerName,
          orderNumber: order._id.toString().slice(-6),
          orderDate: new Date().toLocaleDateString(),
          totalAmount: totalAmount.toFixed(2),
          paymentMethod: 'Cash on Delivery',
          shippingMethod: 'Standard Shipping',
          estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          subtotal: totalAmount - shippingPrice - taxPrice,
          shippingCost: shippingPrice,
          tax: taxPrice,
          totalAmount: totalAmount,
          shippingAddress: shippingAddress,
          trackingUrl: `${process.env.FRONTEND_URL}/order/${order._id}`
        }
      );

      res.status(201).json({ 
        message: 'Order created successfully',
        orderId: order._id 
      });
    }

  } catch (error) {
    console.error('Error creating order or payment intent:', error);
    res.status(500).json({ message: error.message || 'Failed to create order or payment intent.' });
  }
};

// Update order payment status after successful payment (webhook or callback)
const updatePaymentStatus = async (req, res) => {
  try {
    const { orderId, paymentIntentId, status } = req.body;

    const order = await Order.findById(orderId).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      order.paymentStatus = 'paid';
      order.orderStatus = 'processing';
      await order.save();

      // Send order status update email
      await sendEmail(
        order.user.email,
        'Order Status Update',
        'orderStatusUpdate',
        {
          name: order.user.name,
          orderNumber: order._id.toString().slice(-6),
          status: 'Processing',
          updatedAt: new Date().toLocaleString(),
          trackingUrl: `${process.env.FRONTEND_URL}/order/${order._id}`
        }
      );

      res.json({ message: 'Payment status updated to paid.' });
    } else if (paymentIntent.status === 'payment_failed') {
      order.paymentStatus = 'failed';
      await order.save();
      res.status(400).json({ message: 'Payment failed.' });
    } else {
      res.status(400).json({ message: 'Payment intent status is not succeeded.' });
    }

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ message: error.message || 'Failed to update payment status.' });
  }
};

// Get orders for a specific user
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming user ID is available from authentication middleware
    const orders = await Order.find({ user: userId }).populate('items.product');
    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch user orders.' });
  }
};

// Get all orders (Admin only)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate('user', 'name email').populate('items.product');
    res.json(orders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch all orders.' });
  }
};

module.exports = {
  createOrder,
  updatePaymentStatus,
  getUserOrders,
  getAllOrders
}; 